@echo off
REM Create a zip ready for Netlify Drop / Cloudflare / any static host
set ROOT=%~dp0
set OUT=%ROOT%gdl-site-visibility-deploy.zip
if exist "%OUT%" del "%OUT%"
powershell -NoProfile -Command ^
  "Compress-Archive -Path '%ROOT%index.html','%ROOT%css','%ROOT%js','%ROOT%assets','%ROOT%netlify.toml','%ROOT%vercel.json','%ROOT%README.md' -DestinationPath '%OUT%' -Force"
echo Created: %OUT%
echo.
echo Next: open https://app.netlify.com/drop and drop this zip (or the folder).
echo You will get a public https://....netlify.app URL anyone can use.
pause
