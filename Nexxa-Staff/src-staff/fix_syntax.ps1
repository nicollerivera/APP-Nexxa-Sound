$p = 'c:\Users\multi\OneDrive\Documentos\APP Nexxa Sound\Nexxa-Staff\src-staff\App.jsx'
$c = Get-Content -Raw $p
$search = '                                                     />\r?\n                                               \);'
$correct = '                                                );\r\n'

# Find and replace the specific bad line at 4015. 
# Better yet, search for the whole block of 4013 to 4018
$searchBlock = '                                                     </div>\r?\n                                                   </div>\r?\n                                                     />\r?\n                                               \);\r?\n                                               \});\r?\n                                             \}\)\(\)\}'

$correctBlock = '                                                    </div>
                                                  </div>
                                                );
                                              });
                                            })()}'

$newContent = $c -replace $searchBlock, $correctBlock
Set-Content -Path $p -Value $newContent -NoNewline
