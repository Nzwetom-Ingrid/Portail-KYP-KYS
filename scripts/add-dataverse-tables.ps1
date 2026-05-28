# Ajoute les 23 tables Dataverse de la solution "AFB KYP KYS SOL"
# comme sources de donnees typees dans le Power Apps Code App.
#
# Prerequis :
#   1. pac CLI >= 1.46 installe       -> winget install Microsoft.PowerPlatformCLI
#   2. Authentifie a l'environnement  -> pac auth create --environment a445841b-0851-f111-b31d-0022489f367d
#
# Usage :
#   pwsh ./scripts/add-dataverse-tables.ps1
#   (ou clic droit > Executer avec PowerShell)

$ErrorActionPreference = 'Stop'

# Noms LOGIQUES des tables (colonne "Nom" dans Power Apps), pas les noms d'affichage.
$tables = @(
    'afb_decision',                 # DECISION
    'afb_document',                 # DOCUMENT
    'afb_documentcategory',         # DOCUMENT CATEGORY
    'afb_documentdeconformite',     # Document de conformite
    'afb_documentversion',          # DOCUMENT VERSION
    'afb_dossierkypkys',            # DOSSIER KYP KYS
    'afb_journalaudit',             # JOURNAL AUDIT
    'afb_kycchecklist',             # KYC CHECKLIST
    'afb_partnertype',              # PARTNER TYPE
    'afb_question',                 # QUESTION
    'afb_questionlogic',            # QUESTION LOGIC
    'afb_questionoption',           # QUESTION OPTION
    'afb_questionresponse',         # QUESTION RESPONSE
    'afb_questionnaire',            # QUESTIONNAIRE
    'afb_questionnaireassignment',  # QUESTIONNAIRE ASSIGNMENT
    'afb_questionnaireclarification', # QUESTIONNAIRE CLARIFICATION
    'afb_questionnaireresponse',    # QUESTIONNAIRE RESPONSE
    'afb_questionnairesection',     # QUESTIONNAIRE SECTION
    'afb_resultatscreening',        # RESULTAT SCREENING
    'afb_tiers',                    # TIERS
    'afb_tiersexterneb2c',          # TIERS EXTERNE B2C
    'afb_ubo',                      # UBO
    'afb_utilisateurinterne'        # UTILISATEUR INTERNE
)

# Verifie que pac est disponible
if (-not (Get-Command pac -ErrorAction SilentlyContinue)) {
    Write-Error "La commande 'pac' est introuvable. Installez la Power Platform CLI puis rouvrez le terminal."
    exit 1
}

$ok = @()
$ko = @()

foreach ($t in $tables) {
    Write-Host "==> Ajout de $t ..." -ForegroundColor Cyan
    pac code add-data-source -a dataverse -t $t
    if ($LASTEXITCODE -eq 0) {
        $ok += $t
        Write-Host "    OK $t" -ForegroundColor Green
    } else {
        $ko += $t
        Write-Host "    ECHEC $t (code $LASTEXITCODE)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Resume ===" -ForegroundColor Yellow
Write-Host ("Reussies : {0}/{1}" -f $ok.Count, $tables.Count) -ForegroundColor Green
if ($ko.Count -gt 0) {
    Write-Host ("Echecs   : {0}" -f ($ko -join ', ')) -ForegroundColor Red
    Write-Host "Verifiez le nom logique exact de ces tables dans Power Apps (colonne 'Nom')." -ForegroundColor Red
}
