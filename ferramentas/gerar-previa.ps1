param([string]$Projeto = 'C:\Users\user\Desktop\Projeto', [string]$Saida)
$utf8 = New-Object System.Text.UTF8Encoding $false
$html = [IO.File]::ReadAllText("$Projeto\index.html", $utf8)
$css  = [IO.File]::ReadAllText("$Projeto\css\estilo.css", $utf8)
$logoUri = 'data:image/png;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes("$Projeto\icones\logo.png"))

$body = [regex]::Match($html, '(?s)<body([^>]*)>(.*)</body>')
$bodyClass = [regex]::Match($body.Groups[1].Value, 'class="([^"]*)"').Groups[1].Value
$conteudo = $body.Groups[2].Value
# Junta todos os scripts locais (na mesma ordem do index.html)
$scripts = [regex]::Matches($conteudo, '<script src="(js/[^"]+)"></script>')
$js = ($scripts | ForEach-Object { [IO.File]::ReadAllText("$Projeto\" + $_.Groups[1].Value.Replace('/', '\'), $utf8) }) -join "`n"
$conteudo = [regex]::Replace($conteudo, '<script src="js/[^"]+"></script>', '')
$conteudo = $conteudo.Replace('src="icones/logo.png"', "src=""$logoUri""")

$fontes = ([regex]::Matches($html, '<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>') | ForEach-Object { $_.Value }) -join "`n"

$saidaHtml = @"
<title>Organizando Seus Conhecimentos</title>
$fontes
<style>
$css
</style>
$conteudo
<script>
if ('$bodyClass') document.body.classList.add('$bodyClass');
$js
</script>
"@
[IO.File]::WriteAllText($Saida, $saidaHtml, $utf8)
"ok: $Saida"
