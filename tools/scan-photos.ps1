# Quét thư mục ảnh và tạo:
#   js/photo-manifest.js           – danh sách ảnh để game dùng (không phải dò file, không lỗi 404)
#   img/players/DANH-SACH-ANH.txt  – thẻ nào đã có ảnh, thẻ nào còn thiếu
#
# Cách đặt ảnh:
#   img/players/<Tên>/<Năm>.jpg   ảnh theo mùa, ví dụ img/players/Faker/2015.jpg
#   img/players/<Tên>.jpg         ảnh chung cho mọi mùa chưa có ảnh riêng (hoặc img/players/<Tên>/chung.jpg)
#   img/teams/<Mã đội>.png        logo đội, ví dụ img/teams/T1.png
# Nhận đuôi .jpg .jpeg .png .webp
#
# Chạy: bấm đúp tools/scan-photos.bat (hoặc: powershell -ExecutionPolicy Bypass -File tools/scan-photos.ps1)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$exts = @('.jpg', '.jpeg', '.png', '.webp')
$rel = { param($p) ($p.Substring($root.Length + 1)) -replace '\\', '/' }

$players = [ordered]@{}
$pdir = Join-Path $root 'img/players'
if (Test-Path $pdir) {
  # ảnh chung: img/players/<Tên>.jpg
  Get-ChildItem $pdir -File | Where-Object { $exts -contains $_.Extension.ToLower() } | Sort-Object Name | ForEach-Object {
    $n = $_.BaseName
    if (-not $players.Contains($n)) { $players[$n] = [ordered]@{} }
    $players[$n]['all'] = & $rel $_.FullName
  }
  # ảnh theo năm: img/players/<Tên>/<Năm>.jpg
  Get-ChildItem $pdir -Directory | Sort-Object Name | ForEach-Object {
    $n = $_.Name
    Get-ChildItem $_.FullName -File | Where-Object { $exts -contains $_.Extension.ToLower() } | Sort-Object Name | ForEach-Object {
      $b = $_.BaseName.ToLower()
      $key = if ($b -match '^(19|20)\d\d$') { $b } elseif ($b -in @('chung', 'all', 'default')) { 'all' } else { $null }
      if ($key) {
        if (-not $players.Contains($n)) { $players[$n] = [ordered]@{} }
        $players[$n][$key] = & $rel $_.FullName
      } else { Write-Host "Bo qua (ten file phai la nam, vd 2015.jpg): $(& $rel $_.FullName)" -ForegroundColor Yellow }
    }
  }
}
$teams = [ordered]@{}
$tdir = Join-Path $root 'img/teams'
if (Test-Path $tdir) {
  Get-ChildItem $tdir -File | Where-Object { $exts -contains $_.Extension.ToLower() } | Sort-Object Name | ForEach-Object { $teams[$_.BaseName] = & $rel $_.FullName }
}

$json = [ordered]@{ players = $players; teams = $teams } | ConvertTo-Json -Depth 5 -Compress
$js = "// Tự tạo bởi tools/scan-photos.ps1 – đừng sửa tay, chạy lại công cụ sau khi thêm/xóa ảnh.`n// Cập nhật: $(Get-Date -Format 'yyyy-MM-dd HH:mm')`nconst PHOTO_MANIFEST = $json;`n"
$utf8 = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $root 'js/photo-manifest.js'), $js, $utf8)

# ----- danh sách ảnh còn thiếu -----
$cards = Get-Content (Join-Path $PSScriptRoot 'cards.txt') -Encoding UTF8 | Where-Object { $_ -and -not $_.StartsWith('#') } | ForEach-Object {
  $p = $_.Split('|'); [pscustomobject]@{ Name = $p[0]; Year = $p[1]; Team = $p[2]; Role = $p[3] }
}
$yes = 0; $gen = 0; $no = 0; $lines = @()
foreach ($c in $cards) {
  $pl = if ($players.Contains($c.Name)) { $players[$c.Name] } else { $null }
  $years = if ($pl) { @($pl.Keys | Where-Object { $_ -match '^\d{4}$' } | ForEach-Object { [int]$_ }) } else { @() }
  $near = if ($years.Count) { $years | Sort-Object { [math]::Abs($_ - [int]$c.Year) }, { - $_ } | Select-Object -First 1 } else { $null }
  if ($pl -and $pl.Contains($c.Year)) { $st = '[OK ] co anh mua nay'; $yes++ }
  elseif ($near -and [math]::Abs($near - [int]$c.Year) -le 2) { $st = "[ ~ ] dang dung anh $near"; $gen++ }
  elseif ($pl -and $pl.Contains('all')) { $st = '[ ~ ] dang dung anh chung'; $gen++ }
  elseif ($near) { $st = "[ ~ ] dang dung anh $near"; $gen++ }
  else { $st = '[   ] chua co anh'; $no++ }
  $lines += ('{0,-28} {1} {2} {3,-4} -> img/players/{1}/{2}.jpg' -f $st, $c.Name, $c.Year, $c.Team)
}
$head = @(
  'DANH SACH ANH THE TUYEN THU (tu tao boi tools/scan-photos.ps1)',
  "Cap nhat: $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
  "Tong $($cards.Count) the: $yes co anh dung mua, $gen muon anh mua khac / anh chung, $no chua co anh.",
  'Dat anh vao dung duong dan ben phai (duoi .jpg/.png/.webp deu duoc), roi chay lai tools/scan-photos.bat.',
  ''
)
[IO.File]::WriteAllText((Join-Path $root 'img/players/DANH-SACH-ANH.txt'), (($head + $lines) -join "`r`n") + "`r`n", $utf8)

Write-Host "Xong: $($players.Count) tuyen thu co anh, $($teams.Count) logo doi." -ForegroundColor Green
Write-Host "The: $yes dung mua, $gen muon anh khac, $no chua co anh. Xem img/players/DANH-SACH-ANH.txt"
