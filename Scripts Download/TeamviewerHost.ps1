$url = "https://download.teamviewer.com/download/TeamViewer_Host_Setup_x64.exe"
$output = "C:\TeamViewer_Host_Setup_x64.exe"

Invoke-WebRequest -Uri $url -OutFile $output
