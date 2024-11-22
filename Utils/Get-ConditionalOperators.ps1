Function Get-ConditionalOperators
{
    <#
    .Synopsis
    Affiche tout les comparateurs d'une instruction "IF".

    .Description
    Affichage de tous les comparateurs d'un instruction "IF" avec explication et examples

    .Parameter All
    .Parameter Equal
    .Parameter Superior
    .Parameter Inferior
    .Parameter Like
    .Parameter Regex
    .Parameter Type
    .Parameter Contains
    .Parameter In
    .Parameter Logical
    .Parameter Bits             

    .Example
    Get-ConditionalOperators -All
    .Example
    Get-ConditionalOperators -Superior
    #>

    [CmdletBinding()]
    Param(
        [switch]$All,
        [switch]$Equal,
        [switch]$Superior,
        [switch]$Inferior,
        [switch]$Like,
        [switch]$Regex,
        [switch]$Type,
        [switch]$Contains,
        [switch]$In,
        [switch]$Logical,
        [switch]$Bits
    )

    if ($All) {
        $tout = @"
▌ㅤ=======================
▌ㅤOperateurs Equal
▌ㅤ=======================
▌ㅤ
▌ㅤ ◈ -eq égalité, sans respect de la casse
▌ㅤ ◈ -ieq égalité, sans respect de la casse
▌ㅤ ◈ -ceq égalité, avec respect de la casse
▌ㅤ
▌ㅤ ◈ -ne non égal à, sans respect de la casse
▌ㅤ ◈ -ine non égal à, sans respect de la casse
▌ㅤ ◈ -cne non égal à, avec respect de la casse
▌ㅤ
▌ㅤ=======================
▌ㅤOperateurs Superior
▌ㅤ=======================
▌ㅤ ◈ -gt supérieur à
▌ㅤ ◈ -igt supérieur à, sans respect de la casse
▌ㅤ ◈ -cgt supérieur à, avec respect de la casse
▌ㅤ ◈ -ge supérieur ou égal à
▌ㅤ ◈ -ige supérieur ou égal à, sans respect de la casse
▌ㅤ ◈ -cge supérieur ou égal à, avec respect de la casse
▌ㅤ
▌ㅤ=======================
▌ㅤOperateurs Inferior
▌ㅤ=======================
▌ㅤ ◈ -lt inférieur à
▌ㅤ ◈ -ilt inférieur à, sans respect de la casse
▌ㅤ ◈ -clt inférieur à, avec respect de la casse
▌ㅤ ◈ -le inférieur ou égal à
▌ㅤ ◈ -ile inférieur ou égal à, sans respect de la casse
▌ㅤ ◈ -cle inférieur ou égal à, avec respect de la casse
▌ㅤ
▌ㅤ=======================
▌ㅤOperateurs Like
▌ㅤ=======================
▌ㅤ ◈ -like caractère générique, sans respect de la casse
▌ㅤ ◈ -ilike caractère générique, sans respect de la casse
▌ㅤ ◈ -clike caractère générique, avec respect de la casse
▌ㅤ ◈ -notlike caractère générique sans correspondance, sans respect de la casse
▌ㅤ ◈ -inotlike caractère générique sans correspondance, sans respect de la casse
▌ㅤ ◈ -cnotlike caractère générique sans correspondance, avec respect de la casse
▌ㅤ
▌ㅤ=======================
▌ㅤOperateurs Regex
▌ㅤ=======================
▌ㅤ ◈ -match regex, sans respect de la casse
▌ㅤ ◈ -imatch regex, sans respect de la casse
▌ㅤ ◈ -cmatch regex, avec respect de la casse
▌ㅤ ◈ -notmatch regex sans correspondance, sans respect de la casse
▌ㅤ ◈ -inotmatch regex sans correspondance, sans respect de la casse
▌ㅤ ◈ -cnotmatch regex sans correspondance, avec respect de la casse
▌ㅤ
▌ㅤ=======================
▌ㅤOperateurs Is
▌ㅤ=======================
▌ㅤ ◈ -is de type
▌ㅤ ◈ -isnot non de type
▌ㅤ
▌ㅤ=======================
▌ㅤOperateurs Contains
▌ㅤ=======================
▌ㅤ ◈ -contains correspondance, sans respect de la casse
▌ㅤ ◈ -icontains correspondance, sans respect de la casse
▌ㅤ ◈ -ccontains correspondance, avec respect de la casse
▌ㅤ ◈ -notcontains sans correspondance, sans respect de la casse
▌ㅤ ◈ -inotcontains sans correspondance, sans respect de la casse
▌ㅤ ◈ -cnotcontains sans correspondance, avec respect de la casse
▌ㅤ
▌ㅤ=======================
▌ㅤOperateurs In
▌ㅤ=======================
▌ㅤ ◈ -in correspondance, sans respect de la casse
▌ㅤ ◈ -iin correspondance, sans respect de la casse
▌ㅤ ◈ -cin correspondance, avec respect de la casse
▌ㅤ ◈ -notin sans correspondance, sans respect de la casse
▌ㅤ ◈ -inotin sans correspondance, sans respect de la casse
▌ㅤ ◈ -cnotin sans correspondance, avec respect de la casse
▌ㅤ
▌ㅤ=======================
▌ㅤOperateurs Logical
▌ㅤ=======================
▌ㅤ ◈ -not  retourne une expression de $false à $true ou de $true à $false
▌ㅤ ◈ ! alias de -not
▌ㅤ ◈ -and permet de combiner des expressions
▌ㅤ ◈ -or permet de spécifier deux expressions, et retourne $true si l’une d’elles est $true
▌ㅤ ◈ -xor permet à une seule expression de renvoyer la valeur $true. Par conséquent, si les deux éléments sont $false ou $true, 
▌ㅤ        l’expression entière est $false. Cela revient à affirmer que cette expression est uniquement $true lorsque les résultats de l’expression sont différents
▌ㅤ
▌ㅤ=======================
▌ㅤOperateurs Bits
▌ㅤ=======================
▌ㅤ ◈ -band binaire AND
▌ㅤ ◈ -bor binaire OR
▌ㅤ ◈ -bxor binaire OR exclusif
▌ㅤ ◈ -bnot binaire NOT
▌ㅤ ◈ -shl décalage vers la gauche
▌ㅤ ◈ -shr décalage vers la droite
▌ㅤ
▌ㅤ=======================
▌ㅤAutres
▌ㅤ=======================
▌ㅤ ◈ ? représente n'importe quel caractère unique
▌ㅤ ◈ * représente n’importe quel nombre de caractères
"@
        Write-Output $tout
        # Implement logic to explain all operators
    }

    if ($Equal) {
        $operators1 = @"
▌ㅤ==============================================================
▌ㅤ░█▀█░█▀█░█▀▀░█▀▄░█▀█░▀█▀░█▀▀░█░█░█▀▄░█▀▀░░░█▀▀░▄▀▄░█░█░█▀█░█░░
▌ㅤ░█░█░█▀▀░█▀▀░█▀▄░█▀█░░█░░█▀▀░█░█░█▀▄░▀▀█░░░█▀▀░█\█░█░█░█▀█░█░░
▌ㅤ░▀▀▀░▀░░░▀▀▀░▀░▀░▀░▀░░▀░░▀▀▀░▀▀▀░▀░▀░▀▀▀░░░▀▀▀░░▀\░▀▀▀░▀░▀░▀▀▀
▌ㅤ==============================================================
▌ㅤ
▌ㅤ ◈ -eq égalité, sans respect de la casse
▌ㅤ ◈ -ieq égalité, sans respect de la casse
▌ㅤ ◈ -ceq égalité, avec respect de la casse
▌ㅤ    
▌ㅤ ◈ -ne non égal à, sans respect de la casse
▌ㅤ ◈ -ine non égal à, sans respect de la casse
▌ㅤ ◈ -cne non égal à, avec respect de la casse

"@

        Write-Output $operators1
        # Implement logic to explain equal operator
    }

    if ($Superior) {
        $operators2 = @"
▌ㅤ==========================================================================
▌ㅤ░█▀█░█▀█░█▀▀░█▀▄░█▀█░▀█▀░█▀▀░█░█░█▀▄░█▀▀░░░█▀▀░█░█░█▀█░█▀▀░█▀▄░▀█▀░█▀█░█▀▄
▌ㅤ░█░█░█▀▀░█▀▀░█▀▄░█▀█░░█░░█▀▀░█░█░█▀▄░▀▀█░░░▀▀█░█░█░█▀▀░█▀▀░█▀▄░░█░░█░█░█▀▄
▌ㅤ░▀▀▀░▀░░░▀▀▀░▀░▀░▀░▀░░▀░░▀▀▀░▀▀▀░▀░▀░▀▀▀░░░▀▀▀░▀▀▀░▀░░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀░▀
▌ㅤ==========================================================================
▌ㅤ
▌ㅤ ◈ -gt supérieur à
▌ㅤ ◈ -igt supérieur à, sans respect de la casse
▌ㅤ ◈ -cgt supérieur à, avec respect de la casse
▌ㅤ ◈ -ge supérieur ou égal à
▌ㅤ ◈ -ige supérieur ou égal à, sans respect de la casse
▌ㅤ ◈ -cge supérieur ou égal à, avec respect de la casse

"@
        Write-Output $operators2
        # Implement logic to explain superior operator
    }

    if ($Inferior) {
        $operators3 = @"
▌ㅤ==========================================================================
▌ㅤ░█▀█░█▀█░█▀▀░█▀▄░█▀█░▀█▀░█▀▀░█░█░█▀▄░█▀▀░░░▀█▀░█▀█░█▀▀░█▀▀░█▀▄░▀█▀░█▀█░█▀▄
▌ㅤ░█░█░█▀▀░█▀▀░█▀▄░█▀█░░█░░█▀▀░█░█░█▀▄░▀▀█░░░░█░░█░█░█▀▀░█▀▀░█▀▄░░█░░█░█░█▀▄
▌ㅤ░▀▀▀░▀░░░▀▀▀░▀░▀░▀░▀░░▀░░▀▀▀░▀▀▀░▀░▀░▀▀▀░░░▀▀▀░▀░▀░▀░░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀░▀
▌ㅤ==========================================================================
▌ㅤ
▌ㅤ ◈ -lt inférieur à
▌ㅤ ◈ -ilt inférieur à, sans respect de la casse
▌ㅤ ◈ -clt inférieur à, avec respect de la casse
▌ㅤ ◈ -le inférieur ou égal à
▌ㅤ ◈ -ile inférieur ou égal à, sans respect de la casse
▌ㅤ ◈ -cle inférieur ou égal à, avec respect de la casse

"@
        Write-Output $operators3
        # Implement logic to explain inferior operator
    }

    if ($Like) {
        $operators4 = @"
▌ㅤ==========================================================
▌ㅤ░█▀█░█▀█░█▀▀░█▀▄░█▀█░▀█▀░█▀▀░█░█░█▀▄░█▀▀░░░█░░░▀█▀░█░█░█▀▀
▌ㅤ░█░█░█▀▀░█▀▀░█▀▄░█▀█░░█░░█▀▀░█░█░█▀▄░▀▀█░░░█░░░░█░░█▀▄░█▀▀
▌ㅤ░▀▀▀░▀░░░▀▀▀░▀░▀░▀░▀░░▀░░▀▀▀░▀▀▀░▀░▀░▀▀▀░░░▀▀▀░▀▀▀░▀░▀░▀▀▀
▌ㅤ==========================================================
▌ㅤ
▌ㅤ ◈ -like caractère générique, sans respect de la casse
▌ㅤ ◈ -ilike caractère générique, sans respect de la casse
▌ㅤ ◈ -clike caractère générique, avec respect de la casse
▌ㅤ ◈ -notlike caractère générique sans correspondance, sans respect de la casse
▌ㅤ ◈ -inotlike caractère générique sans correspondance, sans respect de la casse
▌ㅤ ◈ -cnotlike caractère générique sans correspondance, avec respect de la casse

"@
        Write-Output $operators4
        # Implement logic to explain like operator
    }

    if ($Regex) {
        $operators5 = @"
▌ㅤ==============================================================
▌ㅤ░█▀█░█▀█░█▀▀░█▀▄░█▀█░▀█▀░█▀▀░█░█░█▀▄░█▀▀░░░█▀▄░█▀▀░█▀▀░█▀▀░█░█
▌ㅤ░█░█░█▀▀░█▀▀░█▀▄░█▀█░░█░░█▀▀░█░█░█▀▄░▀▀█░░░█▀▄░█▀▀░█░█░█▀▀░▄▀▄
▌ㅤ░▀▀▀░▀░░░▀▀▀░▀░▀░▀░▀░░▀░░▀▀▀░▀▀▀░▀░▀░▀▀▀░░░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀░▀
▌ㅤ==============================================================
▌ㅤ
▌ㅤ ◈ -match regex, sans respect de la casse
▌ㅤ ◈ -imatch regex, sans respect de la casse
▌ㅤ ◈ -cmatch regex, avec respect de la casse
▌ㅤ ◈ -notmatch regex sans correspondance, sans respect de la casse
▌ㅤ ◈ -inotmatch regex sans correspondance, sans respect de la casse
▌ㅤ ◈ -cnotmatch regex sans correspondance, avec respect de la casse

"@
        Write-Output $operators5
        # Implement logic to explain regex operator
    }

    if ($Type) {
        $operators6 = @"
▌ㅤ==========================================================
▌ㅤ░█▀█░█▀█░█▀▀░█▀▄░█▀█░▀█▀░█▀▀░█░█░█▀▄░█▀▀░░░▀█▀░█░█░█▀█░█▀▀
▌ㅤ░█░█░█▀▀░█▀▀░█▀▄░█▀█░░█░░█▀▀░█░█░█▀▄░▀▀█░░░░█░░░█░░█▀▀░█▀▀
▌ㅤ░▀▀▀░▀░░░▀▀▀░▀░▀░▀░▀░░▀░░▀▀▀░▀▀▀░▀░▀░▀▀▀░░░░▀░░░▀░░▀░░░▀▀▀
▌ㅤ==========================================================
▌ㅤ
▌ㅤ ◈ -is de type
▌ㅤ ◈ -isnot non de type

"@
        Write-Output $operators6
        # Implement logic to explain type operator
    }

    if ($Contains) {
        $operators7 = @"
▌ㅤ==========================================================================
▌ㅤ░█▀█░█▀█░█▀▀░█▀▄░█▀█░▀█▀░█▀▀░█░█░█▀▄░█▀▀░░░█▀▀░█▀█░█▀█░▀█▀░█▀█░▀█▀░█▀█░█▀▀
▌ㅤ░█░█░█▀▀░█▀▀░█▀▄░█▀█░░█░░█▀▀░█░█░█▀▄░▀▀█░░░█░░░█░█░█░█░░█░░█▀█░░█░░█░█░▀▀█
▌ㅤ░▀▀▀░▀░░░▀▀▀░▀░▀░▀░▀░░▀░░▀▀▀░▀▀▀░▀░▀░▀▀▀░░░▀▀▀░▀▀▀░▀░▀░░▀░░▀░▀░▀▀▀░▀░▀░▀▀▀
▌ㅤ==========================================================================
▌ㅤ
▌ㅤ ◈ -contains correspondance, sans respect de la casse
▌ㅤ ◈ -icontains correspondance, sans respect de la casse
▌ㅤ ◈ -ccontains correspondance, avec respect de la casse
▌ㅤ ◈ -notcontains sans correspondance, sans respect de la casse
▌ㅤ ◈ -inotcontains sans correspondance, sans respect de la casse
▌ㅤ ◈ -cnotcontains sans correspondance, avec respect de la casse

"@
        Write-Output $operators7
        # Implement logic to explain contains operator
    }

    if ($In) {
        $operators8 = @"
▌ㅤ==================================================
▌ㅤ░█▀█░█▀█░█▀▀░█▀▄░█▀█░▀█▀░█▀▀░█░█░█▀▄░█▀▀░░░▀█▀░█▀█
▌ㅤ░█░█░█▀▀░█▀▀░█▀▄░█▀█░░█░░█▀▀░█░█░█▀▄░▀▀█░░░░█░░█░█
▌ㅤ░▀▀▀░▀░░░▀▀▀░▀░▀░▀░▀░░▀░░▀▀▀░▀▀▀░▀░▀░▀▀▀░░░▀▀▀░▀░▀
▌ㅤ==================================================
▌ㅤ
▌ㅤ ◈ -in correspondance, sans respect de la casse
▌ㅤ ◈ -iin correspondance, sans respect de la casse
▌ㅤ ◈ -cin correspondance, avec respect de la casse
▌ㅤ ◈ -notin sans correspondance, sans respect de la casse
▌ㅤ ◈ -inotin sans correspondance, sans respect de la casse
▌ㅤ ◈ -cnotin sans correspondance, avec respect de la casse

"@
        Write-Output $operators8
        # Implement logic to explain in operator
    }

    if ($Logical) {
        $operators9 = @"
▌ㅤ======================================================================
▌ㅤ░█▀█░█▀█░█▀▀░█▀▄░█▀█░▀█▀░█▀▀░█░█░█▀▄░█▀▀░░░█░░░█▀█░█▀▀░▀█▀░█▀▀░█▀█░█░░
▌ㅤ░█░█░█▀▀░█▀▀░█▀▄░█▀█░░█░░█▀▀░█░█░█▀▄░▀▀█░░░█░░░█░█░█░█░░█░░█░░░█▀█░█░░
▌ㅤ░▀▀▀░▀░░░▀▀▀░▀░▀░▀░▀░░▀░░▀▀▀░▀▀▀░▀░▀░▀▀▀░░░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀
▌ㅤ======================================================================
▌ㅤ
▌ㅤ ◈ -not  retourne une expression de $false à $true ou de $true à $false
▌ㅤ ◈ ! alias de -not
▌ㅤ ◈ -and permet de combiner des expressions
▌ㅤ ◈ -or permet de spécifier deux expressions, et retourne $true si l’une d’elles est $true
▌ㅤ ◈ -xor permet à une seule expression de renvoyer la valeur $true. Par conséquent, si les deux éléments sont $false ou $true, 
▌ㅤ        l’expression entière est $false. Cela revient à affirmer que cette expression est uniquement $true lorsque les résultats de l’expression sont différents

"@
        Write-Output $operators9
        # Implement logic to explain logical operator
    }

    if ($Bits) {
        $operators10 = @"
▌ㅤ==========================================================
▌ㅤ░█▀█░█▀█░█▀▀░█▀▄░█▀█░▀█▀░█▀▀░█░█░█▀▄░█▀▀░░░█▀▄░▀█▀░▀█▀░█▀▀
▌ㅤ░█░█░█▀▀░█▀▀░█▀▄░█▀█░░█░░█▀▀░█░█░█▀▄░▀▀█░░░█▀▄░░█░░░█░░▀▀█
▌ㅤ░▀▀▀░▀░░░▀▀▀░▀░▀░▀░▀░░▀░░▀▀▀░▀▀▀░▀░▀░▀▀▀░░░▀▀░░▀▀▀░░▀░░▀▀▀
▌ㅤ==========================================================
▌ㅤ
▌ㅤ ◈ -band binaire AND
▌ㅤ ◈ -bor binaire OR
▌ㅤ ◈ -bxor binaire OR exclusif
▌ㅤ ◈ -bnot binaire NOT
▌ㅤ ◈ -shl décalage vers la gauche
▌ㅤ ◈ -shr décalage vers la droite

"@
        Write-Output $operators10
        # Implement logic to explain bits operator
    }
}
