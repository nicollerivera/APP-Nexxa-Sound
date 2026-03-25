$path = 'c:\Users\multi\OneDrive\Documentos\APP Nexxa Sound\Nexxa-Staff\src-staff\App.jsx'
$lines = Get-Content $path
# Line 4013 - Closing the grid (div 3990)
$lines[4012] = '                                                      </div>'
# Line 4014 - Closing the role container (div 3973)
$lines[4013] = '                                                    </div>'
# Line 4015 - CLEANING STRAY /> and closing the map return
$lines[4014] = '                                                  );'
# Line 4016 - Closing map function
$lines[4015] = '                                                });'
# Line 4017 - Closing the IIFE invocation
$lines[4016] = '                                              })()}'
# Ensure we don't leave artifacts if I had extra lines
Set-Content $path -Value $lines
