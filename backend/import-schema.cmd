@echo off
REM Запуск из папки backend: двойной щелчок или:  backend\import-schema.cmd
cd /d "%~dp0"
echo Импорт schema.sql (пароль root)
mysql -u root -p < "%~dp0schema.sql"
if errorlevel 1 pause
exit /b %ERRORLEVEL%
