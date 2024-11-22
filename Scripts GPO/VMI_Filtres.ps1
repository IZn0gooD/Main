
$filterName = "Windows Serveur 2016/2019"
$wmiQuery = 'SELECT * FROM Win32_OperatingSystem WHERE Version LIKE "10.%" AND (ProductType = "2" OR ProductType = "3" )'

New-WmiFilter -Name $filterName -Query $wmiQuery

$filterName = "Machine Windows 10"
$wmiQuery = 'SELECT * FROM Win32_OperatingSystem WHERE Version LIKE "10.0%" AND ProductType="1"'

New-WmiFilter -Name $filterName -Query $wmiQuery

$filterName = "Machine Windows 10"
$wmiQuery = 'SELECT Name FROM Win32_ComputerSystem WHERE Name LIKE "PC-PORTABLE-%"'

New-WmiFilter -Name $filterName -Query $wmiQuery
