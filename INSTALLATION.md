# AMP 2.0 - Installationsanleitung

## 🚀 Überblick
AMP 2.0 ist eine professionelle Telegram Mini App für Auftragsmanagement mit n8n Backend und Google Sheets Integration. Diese Anleitung führt Sie durch die komplette Einrichtung.

## 📋 Voraussetzungen

### 1. Telegram Bot erstellen
1. Öffnen Sie [@BotFather](https://t.me/BotFather) in Telegram
2. Senden Sie `/newbot` und folgen Sie den Anweisungen
3. Notieren Sie sich den **Bot Token**
4. Konfigurieren Sie die Mini App:
   ```
   /setmenubutton
   [Bot auswählen]
   AMP 2.0 öffnen
   https://ihre-domain.com
   ```

### 2. Google Sheets vorbereiten
1. Erstellen Sie 3 neue Google Sheets:
   - **Aufträge** (kopieren Sie `google-sheets-templates/amp-orders-template.csv`)
   - **Umsätze** (kopieren Sie `google-sheets-templates/amp-revenues-template.csv`) 
   - **Statistiken** (kopieren Sie `google-sheets-templates/amp-statistics-template.csv`)

2. Google Service Account erstellen:
   - Gehen Sie zur [Google Cloud Console](https://console.cloud.google.com/)
   - Erstellen Sie ein neues Projekt oder wählen Sie ein bestehendes
   - Aktivieren Sie die Google Sheets API
   - Erstellen Sie einen Service Account
   - Laden Sie die JSON-Datei herunter
   - Teilen Sie Ihre Google Sheets mit der Service Account E-Mail

### 3. n8n Instanz
- n8n Cloud Account oder eigene n8n Installation
- Importieren Sie `n8n-workflows/amp-main-workflow.json`

### 4. Server/Hosting
- Node.js 16+ 
- Öffentlich erreichbare Domain für Webhooks

## 🛠 Installation

### 1. Repository klonen und Dependencies installieren
```bash
git clone <repository-url>
cd amp-telegram-app
npm install
```

### 2. Umgebungsvariablen konfigurieren
```bash
cp .env.example .env
```

Bearbeiten Sie die `.env` Datei:
```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxyz
TELEGRAM_WEBHOOK_URL=https://ihre-domain.com/webhook/telegram

# n8n Configuration  
N8N_BASE_URL=https://ihre-n8n-instanz.com
N8N_WEBHOOK_URL=https://ihre-n8n-instanz.com/webhook/amp-api-v2

# Google Sheets Configuration
GOOGLE_SHEETS_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
GOOGLE_SERVICE_ACCOUNT_EMAIL=amp-service@ihr-projekt.iam.gserviceaccount.com

# App Configuration
PORT=3000
NODE_ENV=production
APP_URL=https://ihre-domain.com
```

### 3. Google Service Account konfigurieren
1. Legen Sie die Service Account JSON-Datei als `service-account.json` ab
2. Oder setzen Sie die Umgebungsvariable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"
```

### 4. Konfiguration anpassen
Bearbeiten Sie `config.js`:
```javascript
const AMP_CONFIG = {
    n8nBaseUrl: 'https://ihre-n8n-instanz.com',
    apiEndpoint: '/webhook/amp-api-v2',
    
    googleSheetsConfig: {
        ordersSheetId: 'IHRE_AUFTRÄGE_SHEET_ID',
        revenuesSheetId: 'IHRE_UMSÄTZE_SHEET_ID', 
        statisticsSheetId: 'IHRE_STATISTIKEN_SHEET_ID',
        serviceAccountEmail: 'amp-service@ihr-projekt.iam.gserviceaccount.com'
    },
    
    // Weitere Konfiguration...
};
```

### 5. n8n Workflow konfigurieren
1. Importieren Sie `n8n-workflows/amp-main-workflow.json` in n8n
2. Konfigurieren Sie die Google Sheets Nodes:
   - Service Account Email eintragen
   - Sheet IDs eintragen
3. Konfigurieren Sie die Telegram Nodes:
   - Bot Token eintragen
   - Chat IDs für Benachrichtigungen eintragen
4. Aktivieren Sie den Workflow

### 6. Server starten
```bash
# Entwicklung
npm run dev

# Produktion  
npm start
```

### 7. Telegram Webhook einrichten
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://ihre-domain.com/webhook/telegram"}'
```

## 🔧 Erweiterte Konfiguration

### Automatische Zuweisung nach PLZ
In `config.js` können Sie automatische Zuweisungsregeln definieren:
```javascript
workflowConfig: {
    autoAssignment: {
        enabled: true,
        rules: [
            { postcodes: ['10***', '11***', '12***'], monteurId: '+491234567890' },
            { postcodes: ['20***', '21***', '22***'], monteurId: '+4369912345678' }
        ]
    }
}
```

### Benutzer hinzufügen/bearbeiten
Bearbeiten Sie `config.js`:
```javascript
userDatabase: {
    'neuer-benutzer': {
        password: 'sicheres-passwort',
        role: 'monteur', // admin, vergabe, agent, monteur
        name: 'Neuer Benutzer',
        initials: 'NB',
        phone: '+49123456789', // nur für Monteure
        permissions: ['report_revenues', 'view_assigned_orders']
    }
}
```

### Benachrichtigungen konfigurieren
```javascript
workflowConfig: {
    notifications: {
        newOrderCreated: ['vergabe', 'admin'],
        revenueReported: ['vergabe', 'admin'],
        orderAssigned: ['monteur'],
        revenueApproved: ['monteur'],
        revenueRejected: ['monteur']
    }
}
```

## 📱 Telegram Mini App einrichten

### 1. Domain verifizieren
1. Gehen Sie zu [@BotFather](https://t.me/BotFather)
2. Senden Sie `/setdomain`
3. Wählen Sie Ihren Bot
4. Geben Sie Ihre Domain ein: `ihre-domain.com`

### 2. Menu Button konfigurieren
```
/setmenubutton
[Bot auswählen]
🚀 AMP 2.0 öffnen
https://ihre-domain.com
```

### 3. Beschreibung setzen
```
/setdescription
[Bot auswählen]
🎯 AMP 2.0 - Professionelle Auftragsmanagement App

✅ Aufträge verwalten
💰 Umsätze tracken  
📊 Statistiken einsehen
🔄 Echtzeit-Synchronisation

Für Monteure, Agenten und Vergabe-Teams.
```

## 🔒 Sicherheit

### 1. HTTPS verwenden
- Stellen Sie sicher, dass Ihre App über HTTPS erreichbar ist
- Telegram Mini Apps erfordern HTTPS

### 2. Passwörter ändern
- Ändern Sie alle Standard-Passwörter in `config.js`
- Verwenden Sie in der Produktion eine echte Datenbank

### 3. Umgebungsvariablen schützen
- Speichern Sie niemals Geheimnisse im Code
- Verwenden Sie `.env` Dateien oder Umgebungsvariablen

### 4. Google Service Account sichern
- Beschränken Sie die Berechtigungen auf die benötigten Sheets
- Rotieren Sie regelmäßig die Service Account Keys

## 📊 Monitoring & Logs

### Health Check
```bash
curl https://ihre-domain.com/health
```

### Logs überwachen
```bash
# PM2 (empfohlen für Produktion)
npm install -g pm2
pm2 start server.js --name "amp-app"
pm2 logs amp-app

# Oder direkt
npm start 2>&1 | tee app.log
```

## 🚨 Troubleshooting

### Häufige Probleme

**1. Telegram Mini App lädt nicht**
- Überprüfen Sie HTTPS-Zertifikat
- Prüfen Sie Domain-Verifikation bei @BotFather
- Kontrollieren Sie CORS-Einstellungen

**2. n8n Webhook funktioniert nicht**
- Überprüfen Sie die Webhook-URL
- Testen Sie die Erreichbarkeit: `curl https://ihre-n8n-instanz.com/webhook/amp-api-v2`
- Prüfen Sie n8n Logs

**3. Google Sheets Fehler**
- Überprüfen Sie Service Account Berechtigungen
- Prüfen Sie Sheet IDs
- Testen Sie API-Zugriff

**4. Bilder werden nicht hochgeladen**
- Überprüfen Sie Dateigröße (max. 10MB)
- Prüfen Sie Dateityp (nur Bilder erlaubt)
- Kontrollieren Sie Server-Speicherplatz

### Debug-Modus aktivieren
```bash
NODE_ENV=development npm start
```

### Support
Bei Problemen:
1. Überprüfen Sie die Logs
2. Testen Sie einzelne Komponenten
3. Kontaktieren Sie den Support: support@amp-app.com

## 🔄 Updates

### App aktualisieren
```bash
git pull origin main
npm install
npm restart
```

### n8n Workflow aktualisieren
1. Exportieren Sie den aktuellen Workflow (Backup)
2. Importieren Sie die neue Version
3. Konfigurieren Sie die Einstellungen neu
4. Testen Sie alle Funktionen

## 📈 Skalierung

### Mehrere Instanzen
- Verwenden Sie einen Load Balancer
- Teilen Sie Session-Daten (Redis)
- Konfigurieren Sie Datenbank-Clustering

### Performance Optimierung
- Aktivieren Sie Gzip-Kompression
- Verwenden Sie CDN für statische Dateien
- Implementieren Sie Caching

---

## 🎉 Fertig!

Ihre AMP 2.0 App ist jetzt einsatzbereit! 

### Nächste Schritte:
1. ✅ Testen Sie alle Funktionen
2. 📱 Laden Sie Benutzer ein
3. 📊 Überwachen Sie die Performance
4. 🔧 Passen Sie die Konfiguration an Ihre Bedürfnisse an

**Viel Erfolg mit AMP 2.0! 🚀**