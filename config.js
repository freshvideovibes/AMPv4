// config.js

const AMP_CONFIG = {
    // URL zu Ihrer n8n-Instanz. Passen Sie diese an!
    // Beispiel: 'https://mein-n8n.server.com'
    n8nBaseUrl: 'https://amp-backend.app.n8n.cloud', // <-- HIER IHRE N8N URL EINTRAGEN

    // API-Endpunkt für alle Aktionen in n8n
    apiEndpoint: '/webhook/amp-api-v2',

    // Google Sheets Konfiguration
    googleSheetsConfig: {
        ordersSheetId: '1234567890abcdef', // <-- HIER IHRE GOOGLE SHEETS ID EINTRAGEN
        revenuesSheetId: '1234567890abcdef', // <-- HIER IHRE GOOGLE SHEETS ID EINTRAGEN
        statisticsSheetId: '1234567890abcdef', // <-- HIER IHRE GOOGLE SHEETS ID EINTRAGEN
        serviceAccountEmail: 'amp-service@your-project.iam.gserviceaccount.com'
    },

    // Telegram Bot Konfiguration
    telegramConfig: {
        botToken: 'your_bot_token_here',
        webhookUrl: 'https://your-domain.com/webhook/telegram'
    },

    // Vordefinierte Benutzerdatenbank.
    // In einer produktiven Umgebung sollten Passwörter **niemals** im Klartext gespeichert werden.
    // Dies ist nur für Demozwecke.
    userDatabase: {
        // Admin-Benutzer
        'admin': {
            password: 'admin123',
            role: 'admin',
            name: 'Administrator',
            initials: 'AD',
            permissions: ['all']
        },
        
        // Vergabe-Benutzer (wichtig für Umsatz-Bestätigungen!)
        'vergabe': {
            password: 'vergabe123',
            role: 'vergabe',
            name: 'Vergabe Team',
            initials: 'VG',
            permissions: ['approve_revenues', 'assign_orders', 'view_reports']
        },
        
        'vergabe2': {
            password: 'vergabe456',
            role: 'vergabe',
            name: 'Sarah Müller',
            initials: 'SM',
            permissions: ['approve_revenues', 'assign_orders', 'view_reports']
        },
        
        // Agenten-Benutzer
        'agent': {
            password: 'agent123',
            role: 'agent',
            name: 'Agent 007',
            initials: 'A7',
            permissions: ['create_orders', 'view_orders']
        },
        
        'agent2': {
            password: 'agent456',
            role: 'agent',
            name: 'Lisa Weber',
            initials: 'LW',
            permissions: ['create_orders', 'view_orders']
        },

        // Monteur-Benutzer (Telefonnummer als Benutzername)
        '+491234567890': {
            password: 'monteur123',
            role: 'monteur',
            name: 'Max Mustermann',
            initials: 'MM',
            phone: '+491234567890',
            permissions: ['report_revenues', 'view_assigned_orders', 'upload_images']
        },
        '+4369912345678': {
            password: 'monteur456',
            role: 'monteur',
            name: 'Anna Schmidt',
            initials: 'AS',
            phone: '+4369912345678',
            permissions: ['report_revenues', 'view_assigned_orders', 'upload_images']
        },
        '+4917712345678': {
            password: 'monteur789',
            role: 'monteur',
            name: 'Thomas Becker',
            initials: 'TB',
            phone: '+4917712345678',
            permissions: ['report_revenues', 'view_assigned_orders', 'upload_images']
        },
        '+4916012345678': {
            password: 'monteur321',
            role: 'monteur',
            name: 'Maria González',
            initials: 'MG',
            phone: '+4916012345678',
            permissions: ['report_revenues', 'view_assigned_orders', 'upload_images']
        }
    },

    // Workflow-Konfiguration
    workflowConfig: {
        // Automatische Zuweisung basierend auf Postleitzahl
        autoAssignment: {
            enabled: true,
            rules: [
                { postcodes: ['10***', '11***', '12***'], monteurId: '+491234567890' },
                { postcodes: ['20***', '21***', '22***'], monteurId: '+4369912345678' },
                { postcodes: ['30***', '31***', '32***'], monteurId: '+4917712345678' },
                { postcodes: ['40***', '41***', '42***'], monteurId: '+4916012345678' }
            ]
        },
        
        // Benachrichtigungseinstellungen
        notifications: {
            newOrderCreated: ['vergabe', 'admin'],
            revenueReported: ['vergabe', 'admin'],
            orderAssigned: ['monteur'],
            revenueApproved: ['monteur'],
            revenueRejected: ['monteur']
        },
        
        // Automatische Eskalation
        escalation: {
            pendingApprovalHours: 24,
            unassignedOrderHours: 4,
            overdueOrderDays: 3
        }
    },

    // App-Einstellungen
    appSettings: {
        maxImageSize: 10, // MB
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxImagesPerReport: 5,
        currency: 'EUR',
        dateFormat: 'de-DE',
        timeZone: 'Europe/Berlin'
    }
};

// Hilfsfunktionen
AMP_CONFIG.hasPermission = function(user, permission) {
    if (!user || !user.permissions) return false;
    return user.permissions.includes('all') || user.permissions.includes(permission);
};

AMP_CONFIG.getUsersByRole = function(role) {
    return Object.entries(this.userDatabase)
        .filter(([username, user]) => user.role === role)
        .map(([username, user]) => ({ username, ...user }));
};

AMP_CONFIG.getMonteurByPostcode = function(postcode) {
    if (!this.workflowConfig.autoAssignment.enabled) return null;
    
    const rules = this.workflowConfig.autoAssignment.rules;
    for (const rule of rules) {
        for (const pattern of rule.postcodes) {
            const regex = new RegExp(pattern.replace('*', '\\d'));
            if (regex.test(postcode)) {
                return rule.monteurId;
            }
        }
    }
    return null;
};