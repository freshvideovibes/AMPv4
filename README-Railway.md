# AMP 2.0 - Railway Deployment Guide

## 🚀 Schnelle Railway Deployment

### 1. Repository auf Railway deployen

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

**Oder manuell:**

1. Gehe zu [Railway.app](https://railway.app)
2. Klicke auf "New Project"
3. Wähle "Deploy from GitHub repo"
4. Verbinde dieses Repository
5. Railway erkennt automatisch die Node.js App

### 2. Umgebungsvariablen konfigurieren

In Railway Dashboard → Settings → Environment Variables:

```bash
# Pflicht-Variablen
TELEGRAM_BOT_TOKEN=your_bot_token_here
N8N_WEBHOOK_URL=https://amp-backend.app.n8n.cloud/webhook/amp-api-v2

# Optional (Railway setzt PORT automatisch)
NODE_ENV=production
APP_URL=https://your-app.railway.app

# Weitere optionale Variablen
TELEGRAM_WEBHOOK_URL=https://your-app.railway.app/webhook/telegram
GOOGLE_SHEETS_ID=your_google_sheets_id_here
JWT_SECRET=your_jwt_secret_here
```

### 3. Telegram Bot konfigurieren

Nach dem Deployment:

1. Kopiere deine Railway App URL (z.B. `https://your-app.railway.app`)
2. Setze den Telegram Webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://your-app.railway.app/webhook/telegram"}'
```

### 4. n8n Integration

Die App ist bereits für die n8n Integration konfiguriert:
- **Standard n8n URL**: `https://amp-backend.app.n8n.cloud/webhook/amp-api-v2`
- **Custom URL**: Setze `N8N_WEBHOOK_URL` in Railway Environment Variables

### 5. Deployment überprüfen

1. Öffne deine Railway App URL
2. Du solltest die Status-Seite sehen: "✅ AMP 2.0 ist live auf Railway!"
3. Teste `/health` endpoint für Health Check

## 🔧 Features

### ✅ Railway-optimiert
- Automatische PORT-Konfiguration
- Health Check Endpoint (`/health`)
- Graceful Shutdown
- Error Handling
- Procfile für Railway

### ✅ Socket.IO Integration
- Real-time Updates
- User-spezifische Räume
- Webhook-Updates via WebSocket

### ✅ n8n Integration
- Vorkonfigurierte Webhook URL
- Timeout-Handling (30s)
- Error Recovery
- User-Agent Headers

### ✅ Telegram Bot
- Web App Integration
- Command Handling (`/start`, `/help`, `/stats`, `/support`)
- Image Upload Support
- Webhook Processing

## 📋 Verfügbare Endpoints

- `GET /` - Status-Seite
- `GET /health` - Health Check
- `POST /api/webhook` - n8n Integration
- `POST /api/upload-image` - Bild Upload
- `POST /webhook/telegram` - Telegram Bot Webhook

## 🐛 Troubleshooting

### App startet nicht
1. Überprüfe Railway Logs
2. Stelle sicher, dass alle Pflicht-Umgebungsvariablen gesetzt sind
3. Überprüfe Node.js Version (>=16.0.0)

### Telegram Bot funktioniert nicht
1. Überprüfe `TELEGRAM_BOT_TOKEN`
2. Setze Webhook URL korrekt
3. Teste Bot mit `/start` Befehl

### n8n Integration funktioniert nicht
1. Überprüfe `N8N_WEBHOOK_URL`
2. Teste Webhook manuell
3. Überprüfe n8n Workflow Status

## 📞 Support

Bei Problemen:
1. Überprüfe Railway Deployment Logs
2. Teste Health Check Endpoint
3. Überprüfe Environment Variables
4. Kontaktiere Support: support@amp-app.com

## 🔄 Updates

Für Updates:
1. Push zu GitHub Repository
2. Railway deployed automatisch
3. Überprüfe Deployment Status in Railway Dashboard

---

**Railway Deployment Status**: ✅ Optimiert für Railway
**Socket.IO**: ✅ Aktiviert
**n8n Integration**: ✅ Konfiguriert
**Telegram Bot**: ✅ Bereit