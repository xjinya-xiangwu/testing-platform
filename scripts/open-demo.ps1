$url = 'http://127.0.0.1:8080/dashboard'
for ($attempt = 0; $attempt -lt 60; $attempt++) {
    try {
        Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 $url | Out-Null
        Start-Process $url
        exit 0
    }
    catch {
        Start-Sleep -Milliseconds 500
    }
}
exit 1
