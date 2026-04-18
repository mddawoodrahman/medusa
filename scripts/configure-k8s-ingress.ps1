param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("base", "eks", "gke", "aks")]
  [string]$Cloud,

  [Parameter(Mandatory = $true)]
  [string]$Domain,

  [string]$TlsRef
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Replace-InFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$OldValue,
    [Parameter(Mandatory = $true)]
    [string]$NewValue
  )

  if (-not (Test-Path -Path $Path)) {
    throw "File not found: $Path"
  }

  $content = Get-Content -Path $Path -Raw
  $escapedOldValue = [regex]::Escape($OldValue)
  $updated = [regex]::Replace($content, $escapedOldValue, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $NewValue })

  Set-Content -Path $Path -Value $updated -NoNewline
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$k8sRoot = Join-Path $repoRoot "k8s"

if ([string]::IsNullOrWhiteSpace($Domain)) {
  throw "Domain must not be empty."
}

$baseIngress = Join-Path $k8sRoot "ingress.yaml"
Replace-InFile -Path $baseIngress -OldValue "medusa.example.com" -NewValue $Domain

switch ($Cloud) {
  "base" {
    Write-Host "Updated base ingress domain in $baseIngress"
  }

  "eks" {
    $eksPatch = Join-Path $k8sRoot "overlays\eks\patch-ingress.yaml"
    Replace-InFile -Path $eksPatch -OldValue "medusa.example.com" -NewValue $Domain

    if (-not [string]::IsNullOrWhiteSpace($TlsRef)) {
      Replace-InFile -Path $eksPatch -OldValue "arn:aws:acm:REGION:ACCOUNT_ID:certificate/CERTIFICATE_ID" -NewValue $TlsRef
      Write-Host "Updated EKS ACM certificate ARN in $eksPatch"
    }

    Write-Host "Updated EKS overlay domain in $eksPatch"
  }

  "gke" {
    $gkePatch = Join-Path $k8sRoot "overlays\gke\patch-ingress.yaml"
    $managedCert = Join-Path $k8sRoot "overlays\gke\managed-certificate.yaml"

    Replace-InFile -Path $gkePatch -OldValue "medusa.example.com" -NewValue $Domain
    Replace-InFile -Path $managedCert -OldValue "medusa.example.com" -NewValue $Domain

    if (-not [string]::IsNullOrWhiteSpace($TlsRef)) {
      Replace-InFile -Path $gkePatch -OldValue "medusa-static-ip" -NewValue $TlsRef
      Write-Host "Updated GKE static IP name in $gkePatch"
    }

    Write-Host "Updated GKE overlay domains in $gkePatch and $managedCert"
  }

  "aks" {
    $aksPatch = Join-Path $k8sRoot "overlays\aks\patch-ingress.yaml"
    Replace-InFile -Path $aksPatch -OldValue "medusa.example.com" -NewValue $Domain

    if (-not [string]::IsNullOrWhiteSpace($TlsRef)) {
      Replace-InFile -Path $aksPatch -OldValue "medusa-ssl-cert" -NewValue $TlsRef
      Write-Host "Updated AKS App Gateway certificate name in $aksPatch"
    }

    Write-Host "Updated AKS overlay domain in $aksPatch"
  }
}

Write-Host "Done. Validate with: kubectl kustomize k8s and kubectl kustomize k8s/overlays/$Cloud"
