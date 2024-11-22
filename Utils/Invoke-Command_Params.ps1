Invoke-Command –ComputerName $OldIPAddress `
               –Credential $LocalCredential `
               –ScriptBlock { param($x,$y) Add-Computer –DomainName MYDOM `
                                                        –NewName $x `
                                                        –Credential $y `
                                                        –Restart } `
               –ArgumentList 'DC02',$DomainCredential 

# les params $x et $y viennent de –ArgumentList. Derrière le processus sur la machine distante peut les récupérer et les utiliser. 

 Set-Item -Path WSMan:\localhost\Client\TrustedHosts -Value 192.168.10.10

 Enter-PSSession -ComputerName nomdupc