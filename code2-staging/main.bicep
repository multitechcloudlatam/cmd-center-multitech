// ============================================================================
// main.bicep — Infra-as-Code de RentingOS (reconstrucción / DR)
// Modela la arquitectura de ARQUITECTURA-Y-DISASTER-RECOVERY-2026-06-26.md §1.
// Objetivo: poder levantar TODO el stack con un comando ante una pérdida.
//
// NO contiene secretos. Los valores sensibles van en Key Vault y se referencian.
// Validar/desplegar (en el repo de producto, con `az login` como cloud@):
//   az bicep build --file main.bicep
//   az deployment group what-if -g rentingos-rg -f main.bicep -p @main.params.json
//   az deployment group create  -g rentingos-rg -f main.bicep -p @main.params.json
// ============================================================================

@description('Región principal de cómputo/datos')
param location string = 'eastus2'
@description('Región del App Service (la arquitectura actual lo tiene en centralus)')
param apiLocation string = 'centralus'
@description('Prefijo de nombres')
param prefix string = 'rentingos'
@description('Correo para alertas de monitoreo')
param alertEmail string = 'cloud@dinamicatecnologica.com'

@description('Admin de PostgreSQL')
param pgAdminUser string = 'rentingadmin'
@secure()
@description('Password admin de PostgreSQL (pasar por params seguros / Key Vault, NO hardcodear)')
param pgAdminPassword string

// --------------------------------------------------------------------------
// Observabilidad: Log Analytics + Application Insights (monitoreo 24/7 en la nube)
// --------------------------------------------------------------------------
resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-law'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-ai'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: law.id
  }
}

// --------------------------------------------------------------------------
// Key Vault (fuente de verdad de secretos; soft-delete + purge protection)
// --------------------------------------------------------------------------
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${prefix}-kv'
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
  }
}

// --------------------------------------------------------------------------
// PostgreSQL Flexible Server — PITR 35 días + geo-redundante (Principio #1: datos)
// --------------------------------------------------------------------------
resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: '${prefix}db-prod'
  location: location
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    version: '16'
    administratorLogin: pgAdminUser
    administratorLoginPassword: pgAdminPassword
    storage: { storageSizeGB: 32 }
    backup: {
      backupRetentionDays: 35           // PITR 35 días
      geoRedundantBackup: 'Enabled'     // geo-redundante
    }
    highAvailability: { mode: 'Disabled' } // subir a ZoneRedundant cuando el presupuesto lo permita
  }
}

// Permitir servicios de Azure (App Service) — la IP de oficina se agrega aparte, temporal.
resource pgFwAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: pg
  name: 'AllowAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}

// --------------------------------------------------------------------------
// App Service (backend Node 22) — api.rentingos.com
// --------------------------------------------------------------------------
resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${prefix}-plan'
  location: apiLocation
  sku: { name: 'B1', tier: 'Basic' }
  kind: 'linux'
  properties: { reserved: true }
}

resource api 'Microsoft.Web/sites@2023-12-01' = {
  name: '${prefix}-api-prod'
  location: apiLocation
  identity: { type: 'SystemAssigned' }   // para leer Key Vault por RBAC
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appi.properties.ConnectionString }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '0' }
        // Los siguientes son PLACEHOLDERS → referenciar Key Vault:
        //   value: '@Microsoft.KeyVault(SecretUri=https://<kv>.vault.azure.net/secrets/<name>/)'
        // DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY, ANTHROPIC_MODEL, STRIPE_*, QBO_*, PLAID_*,
        // AVALARA_*, BREVO_API_KEY, SIIGO_ACCESS_KEY, SIIGO_PARTNER_ID, CLOUDFLARE_API_TOKEN, CONNECT_FEE_PCT.
        { name: 'RELOAD_BUMP', value: '1' }
      ]
    }
  }
}

// --------------------------------------------------------------------------
// Static Web App (frontend) — app.rentingos.com
// --------------------------------------------------------------------------
resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: '${prefix}-frontend'
  location: location
  sku: { name: 'Free', tier: 'Free' }
  properties: {}
}

// --------------------------------------------------------------------------
// Alertas: action group (correo) + disponibilidad/errores del API
// --------------------------------------------------------------------------
resource ag 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: '${prefix}-alerts'
  location: 'global'
  properties: {
    groupShortName: 'rentos'
    enabled: true
    emailReceivers: [ { name: 'ops', emailAddress: alertEmail, useCommonAlertSchema: true } ]
  }
}

resource alert5xx 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${prefix}-api-5xx'
  location: 'global'
  properties: {
    severity: 1
    enabled: true
    scopes: [ api.id ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [ {
        name: 'http5xx'
        metricName: 'Http5xx'
        metricNamespace: 'Microsoft.Web/sites'
        operator: 'GreaterThan'
        threshold: 5
        timeAggregation: 'Total'
        criterionType: 'StaticThresholdCriterion'
      } ]
    }
    actions: [ { actionGroupId: ag.id } ]
  }
}

// NOTA: el availability test (ping a https://api.rentingos.com/health cada 5 min) se agrega como
// Microsoft.Insights/webtests apuntando a `appi`; se deja fuera del template base por requerir la
// URL/host final y el XML del webtest — ver runbooks/BACKUP-Y-DR-INTEGRAL.md §5.

output apiName string = api.name
output apiPrincipalId string = api.identity.principalId   // darle rol 'Key Vault Secrets User' sobre kv
output keyVaultName string = kv.name
output pgFqdn string = pg.properties.fullyQualifiedDomainName
