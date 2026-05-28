# =========================================================
# Generate-WebApi-SiteSettings.ps1
# Generates the Power Pages "Webapi/<table>/enabled" and
# "Webapi/<table>/fields" Site Settings YAML files required
# to expose the KYP/KYS Dataverse tables to the React portal.
#
# Output: .powerpages-site\site-settings\Webapi-*.sitesetting.yml
# Run once, then: pac pages upload-code-site ...
# =========================================================

[CmdletBinding()]
param(
    [string]$RootPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

$Tables = @(
    'afb_tiers',
    'afb_dossierkypkys',
    'afb_document',
    'afb_documentcategory',
    'afb_documentversion',
    'afb_questionnaire',
    'afb_questionnairesection',
    'afb_question',
    'afb_questionoption',
    'afb_questionlogic',
    'afb_questionnaireassignment',
    'afb_questionnaireresponse',
    'afb_questionresponse',
    'afb_questionnaireclarification',
    'afb_partnertype',
    'afb_kycchecklist',
    'afb_kycchecklistitem',
    'annotation',
    'contact'
)

$SiteSettingsPath = Join-Path $RootPath '.powerpages-site\site-settings'
if (-not (Test-Path $SiteSettingsPath)) {
    New-Item -ItemType Directory -Path $SiteSettingsPath -Force | Out-Null
}

function New-StableGuid {
    param([string]$Seed)
    $sha1 = [System.Security.Cryptography.SHA1]::Create()
    $bytes = $sha1.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Seed))
    $hex = -join ($bytes[0..15] | ForEach-Object { $_.ToString('x2') })
    '{0}-{1}-{2}-{3}-{4}' -f $hex.Substring(0,8), $hex.Substring(8,4), $hex.Substring(12,4), $hex.Substring(16,4), $hex.Substring(20,12)
}

function Write-SiteSetting {
    param(
        [string]$Name,
        [string]$Value,
        [string]$Description
    )
    $safeFile = ($Name -replace '/', '-') + '.sitesetting.yml'
    $path = Join-Path $SiteSettingsPath $safeFile
    $id   = New-StableGuid -Seed "kypkys::$Name"

    # Quote toujours la valeur : `*` est un alias reserve en YAML, les listes
    # contiennent des virgules, et `true` non quote est lu comme booleen.
    $escaped = $Value -replace "'", "''"
    $body = @"
description: $Description
id: $id
name: $Name
value: '$escaped'
"@
    [System.IO.File]::WriteAllText($path, $body, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host ("  OK " + $safeFile)
}

Write-Host ("Generating Web API Site Settings in " + $SiteSettingsPath) -ForegroundColor Cyan

foreach ($t in $Tables) {
    $fieldsValue = '*'
    if ($t -eq 'annotation') {
        $fieldsValue = 'subject,filename,mimetype,documentbody,notetext,objectid,objecttypecode'
    }
    if ($t -eq 'contact') {
        $fieldsValue = 'firstname,lastname,emailaddress1,telephone1,afb_tiers'
    }
    Write-SiteSetting -Name ("Webapi/" + $t + "/enabled") -Value 'true' -Description ("Enables the Power Pages Web API for table " + $t + ".")
    Write-SiteSetting -Name ("Webapi/" + $t + "/fields")  -Value $fieldsValue -Description ("Fields exposed via the Web API for table " + $t + " (comma-separated, * for all).")
}

Write-SiteSetting -Name 'Webapi/error/innererror/enabled' -Value 'true' -Description 'Returns detailed innererror in Web API error responses (DEV only).'

$count = (Get-ChildItem $SiteSettingsPath -Filter 'Webapi-*.sitesetting.yml').Count
Write-Host ""
Write-Host ("Done. " + $count + " Webapi/* site setting file(s) present.") -ForegroundColor Green
Write-Host "Next: pac pages upload-code-site --rootPath . --compiledPath .\dist --siteName kypkyspage" -ForegroundColor Yellow
