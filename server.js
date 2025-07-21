const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram Bot Setup
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// File upload configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Nur Bilder sind erlaubt!'), false);
        }
    }
});

// Serve static files
app.use(express.static('.'));

// API Routes
app.post('/api/webhook', async (req, res) => {
    try {
        const { action, userContext, data } = req.body;
        
        // Forward request to n8n
        const n8nResponse = await axios.post(process.env.N8N_WEBHOOK_URL, {
            action,
            userContext,
            data,
            timestamp: new Date().toISOString()
        });
        
        res.json(n8nResponse.data);
    } catch (error) {
        console.error('Webhook Error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Webhook processing failed',
            details: error.message 
        });
    }
});

// Telegram Bot Webhook
app.post('/webhook/telegram', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Image upload endpoint
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
        }

        // Optimize image
        const optimizedImage = await sharp(req.file.buffer)
            .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();

        // Convert to base64
        const base64Image = optimizedImage.toString('base64');
        
        // Send to n8n for processing
        const n8nResponse = await axios.post(process.env.N8N_WEBHOOK_URL, {
            action: 'upload_image',
            data: {
                image: base64Image,
                originalName: req.file.originalname,
                mimeType: 'image/jpeg',
                userId: req.body.userId,
                orderId: req.body.orderId
            }
        });

        res.json(n8nResponse.data);
    } catch (error) {
        console.error('Image Upload Error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Bild Upload fehlgeschlagen',
            details: error.message 
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// Telegram Bot Commands
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const webAppUrl = `${process.env.APP_URL}`;
    
    const keyboard = {
        inline_keyboard: [[
            {
                text: '🚀 AMP 2.0 öffnen',
                web_app: { url: webAppUrl }
            }
        ]]
    };
    
    await bot.sendMessage(chatId, 
        '🎯 *Willkommen bei AMP 2.0!*\n\n' +
        '📱 Ihre professionelle Auftragsmanagement-App\n' +
        '✅ Aufträge verwalten\n' +
        '💰 Einnahmen tracken\n' +
        '📊 Statistiken einsehen\n\n' +
        '_Klicken Sie auf den Button unten, um zu starten:_',
        { 
            parse_mode: 'Markdown',
            reply_markup: keyboard
        }
    );
});

bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    
    const helpText = `
🆘 *AMP 2.0 Hilfe*

*Verfügbare Befehle:*
/start - App starten
/help - Diese Hilfe anzeigen
/stats - Schnelle Statistiken
/support - Support kontaktieren

*Rollen:*
👨‍💼 **Admin** - Vollzugriff auf alle Funktionen
🏢 **Agent** - Aufträge erstellen und verwalten
🔧 **Monteur** - Aufträge bearbeiten und Einnahmen melden

*Funktionen:*
📋 Auftragsverwaltung
💰 Einnahmen-Tracking
📊 Detaillierte Statistiken
📷 Foto-Upload für Aufträge
🔄 Echtzeit-Synchronisation

Bei Problemen: /support
`;
    
    await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        // Get quick stats from n8n
        const response = await axios.post(process.env.N8N_WEBHOOK_URL, {
            action: 'get_quick_stats',
            data: { userId: msg.from.id }
        });
        
        if (response.data.success) {
            const stats = response.data.data;
            const statsText = `
📊 *Schnelle Statistiken*

📅 **Heute:**
• Neue Aufträge: ${stats.todayOrders || 0}
• Einnahmen: €${stats.todayRevenue || 0}

📈 **Diese Woche:**
• Aufträge: ${stats.weekOrders || 0}
• Einnahmen: €${stats.weekRevenue || 0}

🎯 **Gesamt:**
• Aufträge: ${stats.totalOrders || 0}
• Einnahmen: €${stats.totalRevenue || 0}

_Für detaillierte Statistiken öffnen Sie die App._
`;
            await bot.sendMessage(chatId, statsText, { parse_mode: 'Markdown' });
        } else {
            await bot.sendMessage(chatId, '❌ Statistiken konnten nicht geladen werden.');
        }
    } catch (error) {
        console.error('Stats Error:', error);
        await bot.sendMessage(chatId, '❌ Ein Fehler ist aufgetreten beim Laden der Statistiken.');
    }
});

bot.onText(/\/support/, async (msg) => {
    const chatId = msg.chat.id;
    
    const supportText = `
🆘 *Support & Kontakt*

**Technischer Support:**
📧 support@amp-app.com
📞 +49 123 456 7890

**Geschäftszeiten:**
🕘 Mo-Fr: 08:00 - 18:00 Uhr
🕘 Sa: 09:00 - 14:00 Uhr

**Häufige Probleme:**
• App lädt nicht → Browser-Cache leeren
• Login funktioniert nicht → Passwort überprüfen
• Bilder laden nicht → Internetverbindung prüfen

**Feedback:**
Wir freuen uns über Ihr Feedback! Schreiben Sie uns an feedback@amp-app.com

_Antwortzeit: Werktags innerhalb von 4 Stunden_
`;
    
    await bot.sendMessage(chatId, supportText, { parse_mode: 'Markdown' });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Server Error:', error);
    res.status(500).json({ 
        success: false, 
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Endpoint not found' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 AMP 2.0 Server läuft auf Port ${PORT}`);
    console.log(`📱 App URL: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
    console.log(`🤖 Telegram Bot: ${process.env.TELEGRAM_BOT_TOKEN ? 'Konfiguriert' : 'Nicht konfiguriert'}`);
    console.log(`⚡ n8n URL: ${process.env.N8N_WEBHOOK_URL || 'Nicht konfiguriert'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Server wird heruntergefahren...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Server wird heruntergefahren...');
    process.exit(0);
});

module.exports = app;