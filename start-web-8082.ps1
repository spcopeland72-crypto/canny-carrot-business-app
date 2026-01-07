# Start Business App on Port 8082 (HTTP for home network)

Write-Host "Starting Canny Carrot Business App on port 8082 (HTTP)..." -ForegroundColor Cyan
Write-Host ""

# Set port environment variable
$env:PORT = "8082"

# Start Expo with web (HTTP)
npx expo start --web --port 8082

Write-Host ""
Write-Host "App should be available at:" -ForegroundColor Green
Write-Host "  - Local: http://localhost:8082" -ForegroundColor Yellow
Write-Host "  - Network: http://192.168.0.36:8082" -ForegroundColor Yellow
Write-Host ""

