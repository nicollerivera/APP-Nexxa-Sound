$path = 'c:\Users\multi\OneDrive\Documentos\APP Nexxa Sound\Nexxa-Staff\src-staff\App.jsx'
$lines = Get-Content -LiteralPath $path
if ($lines -ne $null) {
    # 4013 (Index 4012)
    $lines[4012] = '                                                      </div>'
    $lines[4013] = '                                                    </div>'
    $lines[4014] = '                                                  );'
    $lines[4015] = '                                                });'
    $lines[4016] = '                                              })()}'
    Set-Content -LiteralPath $path -Value $lines
    Write-Host "Syntaxis fixed surgically."
} else {
    Write-Error "Failed to read file."
}
