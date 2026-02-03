@echo off
cd /d "c:\Users\multi\OneDrive\Documentos\APP Nexxa Sound\Nexxa-Staff"
start cmd /k "npm run dev"
timeout /t 5
start http://localhost:5173
exit
