@echo off
cd /d "%~dp0"
chcp 65001 >nul
echo Loading db.sql into MySQL (UTF-8)...
echo Enter your MySQL root password when prompted.
mysql -u root -p --default-character-set=utf8mb4 < db.sql
if %ERRORLEVEL% equ 0 (
  echo Done. Database wasl_db is ready.
) else (
  echo Failed. Check password and that MySQL is running.
)
pause
