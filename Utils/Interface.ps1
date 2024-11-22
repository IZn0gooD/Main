Add-Type -AssemblyName PresentationFramework

[xml]$MainFormDesign = @"
<?xml version="1.0" encoding= "utf-16"?>
<Window
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
        xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
        xmlns:local="clr-namespace:WpfApp1"
        Title="MainWindow" Height="450" Width="800">
    <Grid>
        <Button x:Name="button" Content="Button" HorizontalAlignment="Left" Margin="354,227,0,0" VerticalAlignment="Top" Width="75"/>
        <TextBox x:Name="textBox" HorizontalAlignment="Left" Height="23" Margin="108,102,0,0" TextWrapping="Wrap" Text="TextBox" VerticalAlignment="Top" Width="120"/>
        <TextBox x:Name="textBox1" HorizontalAlignment="Left" Height="23" Margin="108,145,0,0" TextWrapping="Wrap" Text="TextBox" VerticalAlignment="Top" Width="120"/>
        <Label Content="Label" HorizontalAlignment="Left" Margin="40,98,0,0" VerticalAlignment="Top" RenderTransformOrigin="-11.316,-0.577"/>
        <Rectangle Fill="#FFF4F4F5" HorizontalAlignment="Left" Height="147" Margin="454,98,0,0" Stroke="Black" VerticalAlignment="Top" Width="145"/>
        <CheckBox Content="TOTO" HorizontalAlignment="Left" Margin="228,297,0,0" VerticalAlignment="Top"/>

    </Grid>
</Window>
"@

$Reader = New-Object system.xml.xmlnodereader $MainFormDesign
$MainForm = [windows.markup.xamlreader]::Load($Reader)

$MainForm.showDialog() | Out-Null
