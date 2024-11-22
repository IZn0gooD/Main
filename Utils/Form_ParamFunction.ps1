[void][System.Reflection.Assembly]::LoadWithPartialName( “System.Windows.Forms”) 
#[void][System.Reflection.Assembly]::LoadWithPartialName( “Microsoft.VisualBasic”) 

Add-Type -AssemblyName System.Windows.Forms
$Form = New-Object system.Windows.Forms.Form
$Form.Text= "Fenêtre"
$Action = [System.EventHandler]{
Write-Host test ; fclose -Form $Form
}
$Button = New-Object System.Windows.Forms.Button
$Button.Width = 100
$Button.Height = 100
$Button.Text = "Button"
$Button.Top
$Button.Left = 100
$Button.Name = "TMP"
$Button.add_Click($Action)

$Icon = [System.Drawing.Icon]::ExtractAssociatedIcon($PSHOME + "\powershell.exe")

$Label = New-Object System.Windows.Forms.Label
$Label.Text= "Ceci est une fenêtre"
$Label.Top = 100
$Label.AutoSize = $true
$Label.Left = 100

$TextBox = New-Object System.Windows.Forms.TextBox
$TextBox.BackColor = "Black"
$TextBox.Top = 125
$TextBox.Left = 100

$CheckBox = New-Object System.Windows.Forms.CheckBox
$CheckBox.Text = "toto"
$CheckBox.Left = 250
$CheckBox.Top = 250

$Form.Icon = $Icon
$Form.Opacity = 0.7
$Form.ShowInTaskbar = $true
$Form.StartPosition = "CenterScreen"
$Form.BackColor = "Gray"
$Form.Controls.Add($TextBox)
$Form.Controls.Add($Label)
$Form.Controls.Add($Button)
$Form.ShowDialog()

Function fclose {

[CmdletBinding()]
    param (
    [system.Windows.Forms.Form]$Form
    )
    $Form.Close()
}