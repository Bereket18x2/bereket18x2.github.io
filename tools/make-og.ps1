# Regenerates assets/og.png (1200x630), the social-share card.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/make-og.ps1
#
# Uses .NET System.Drawing and the Nyala font (ships with Windows, covers
# Ethiopic). The Amharic title is read from og-title.txt as UTF-8 rather
# than written inline: Windows PowerShell 5.1 parses a BOM-less .ps1 using
# the system codepage, which mangles non-ASCII literals into mojibake.

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$W = 1200; $H = 630

$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

# tokens mirrored from assets/css/style.css :root (night theme)
$ink      = [System.Drawing.Color]::FromArgb(255, 0x11, 0x17, 0x26)
$ink2     = [System.Drawing.Color]::FromArgb(255, 0x19, 0x20, 0x2F)
$saffron  = [System.Drawing.Color]::FromArgb(255, 0xE8, 0xA7, 0x3C)
$crimson  = [System.Drawing.Color]::FromArgb(255, 0xB2, 0x2F, 0x30)
$parch    = [System.Drawing.Color]::FromArgb(255, 0xEF, 0xE3, 0xC8)
$parchDim = [System.Drawing.Color]::FromArgb(255, 0xA9, 0x9E, 0x88)

$bgRect = New-Object System.Drawing.Rectangle 0, 0, $W, $H
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bgRect, $ink, $ink2, 90)
$g.FillRectangle($bgBrush, $bgRect)

$glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$glowPath.AddEllipse(-200, -260, 900, 900)
$glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath)
$glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(70, 0xE8, 0xA7, 0x3C)
$glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 0xE8, 0xA7, 0x3C))
$g.FillPath($glowBrush, $glowPath)

# harag band — woven gold/crimson triangles, top and bottom
function Draw-Harag($y) {
  $bandH = 22; $step = 24
  for ($x = -$step; $x -lt $W + $step; $x += $step) {
    $gold = @(
      (New-Object System.Drawing.Point $x, ($y + $bandH)),
      (New-Object System.Drawing.Point ($x + $step/2), $y),
      (New-Object System.Drawing.Point ($x + $step), ($y + $bandH))
    )
    $g.FillPolygon((New-Object System.Drawing.SolidBrush $saffron), $gold)
    $crim = @(
      (New-Object System.Drawing.Point ($x + $step/2), $y),
      (New-Object System.Drawing.Point ($x + $step), ($y + $bandH)),
      (New-Object System.Drawing.Point ($x + $step*1.5), $y)
    )
    $g.FillPolygon((New-Object System.Drawing.SolidBrush $crimson), $crim)
  }
}
Draw-Harag(0)
Draw-Harag($H - 22)

# the cross from the nav brand
$cx = $W / 2; $cy = 175; $arm = 46
$pen = New-Object System.Drawing.Pen $saffron, 7
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawLine($pen, $cx, $cy - $arm, $cx, $cy + $arm)
$g.DrawLine($pen, $cx - $arm, $cy, $cx + $arm, $cy)
$diag = New-Object System.Drawing.Pen $saffron, 5
$diag.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$diag.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$d = 26
$g.DrawLine($diag, $cx - $d, $cy - $d, $cx + $d, $cy + $d)
$g.DrawLine($diag, $cx + $d, $cy - $d, $cx - $d, $cy + $d)
$g.FillEllipse((New-Object System.Drawing.SolidBrush $ink2), ($cx - 12), ($cy - 12), 24, 24)
$g.DrawEllipse((New-Object System.Drawing.Pen $saffron, 3), ($cx - 12), ($cy - 12), 24, 24)

$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center

# school name, Amharic
$title = [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot 'og-title.txt'), [System.Text.Encoding]::UTF8).Trim()
$titleFont = New-Object System.Drawing.Font("Nyala", 60, [System.Drawing.FontStyle]::Bold)
$g.DrawString($title, $titleFont, (New-Object System.Drawing.SolidBrush $saffron),
  (New-Object System.Drawing.RectangleF 60, 255, ($W - 120), 110), $sf)

# transliteration, then what the school actually is
$subFont = New-Object System.Drawing.Font("Georgia", 26, [System.Drawing.FontStyle]::Regular)
$g.DrawString("Finote Yared", $subFont, (New-Object System.Drawing.SolidBrush $parch),
  (New-Object System.Drawing.RectangleF 60, 380, ($W - 120), 46), $sf)

$lineFont = New-Object System.Drawing.Font("Georgia", 20, [System.Drawing.FontStyle]::Regular)
$g.DrawString("EOTC school for children in the diaspora", $lineFont,
  (New-Object System.Drawing.SolidBrush $parchDim),
  (New-Object System.Drawing.RectangleF 60, 432, ($W - 120), 40), $sf)

$footFont = New-Object System.Drawing.Font("Georgia", 16, [System.Drawing.FontStyle]::Italic)
$g.DrawString("bereket18x2.github.io", $footFont,
  (New-Object System.Drawing.SolidBrush $parchDim),
  (New-Object System.Drawing.RectangleF 60, 505, ($W - 120), 40), $sf)

$out = Join-Path $root 'assets\og.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "saved: $out"
