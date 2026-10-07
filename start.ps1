Write-Host "Avvio dei server di Vifree in corso..." -ForegroundColor Cyan
Write-Host "--------------------------------------------------------"
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend (Ping): http://localhost:8000/ping" -ForegroundColor Green
Write-Host "Documentazione API: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------"

# Avvia backend in una nuova finestra
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\uvicorn main:app --reload --port 8000"

# Avvia frontend in una nuova finestra
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
