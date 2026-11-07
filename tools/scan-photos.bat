@echo off
rem Quet thu muc anh, cap nhat js/photo-manifest.js va img/players/DANH-SACH-ANH.txt
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scan-photos.ps1"
pause
