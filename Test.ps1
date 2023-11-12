$text = @"

   ______________________________
 / \                             \.
|   |                            |.
 \_ |   ◈ 1 ) ➞ SFC /SCANNOW    |.
    |                            |.
    |   ◈ 2 ) ➞ CHKDSK          |.
    |                            |.
    |   ◈ 3 ) ➞ DISM Analyse    |.
    |                            |.
    |   ◈ 4 ) ➞ DISM Réparation |.
    |                            |.
    |   ◈ 5 ) ➞                 |.
    |                            |.
    |                            |.
    |                            |.
    |   _________________________|___
    |  /                            /.
    \_/____________________________/.

"@

Write-Host $text

$text1 = @"
#    _______                  _____                      _   _     _              
#   |__   __|                / ____|                    | | | |   (_)             
#      | |_   _ _ __   ___  | (___   ___  _ __ ___   ___| |_| |__  _ _ __   __ _  
#      | | | | | '_ \ / _ \  \___ \ / _ \| '_ ` _ \ / _ \ __| '_ \| | '_ \ / _` | 
#      | | |_| | |_) |  __/  ____) | (_) | | | | | |  __/ |_| | | | | | | | (_| | 
#      |_|\__, | .__/ \___| |_____/ \___/|_| |_| |_|\___|\__|_| |_|_|_| |_|\__, | 
#          __/ | |                                                          __/ | 
#         |___/|_|                                                         |___/ 
"@

Write-Host $text1

$Password = Read-Host -AsSecureString
$params = @{
    Name        = 'User03'
    Password    = $Password
    FullName    = 'Third User'
    Description = 'Description of this account.'
}
New-LocalUser @params


[Console]::OutputEncoding.EncodingName
[Console]::OutputEncoding = [System.Text.Encoding]::GetEncoding(1252)



# ║ 	═ 	╔ 	╗ 	╚ 	╝

$text3 = @"
╔════════════════════════════════════╗ 
║                                    ║
╚════════════════════════════════════╝
"@

Write-Host $text3