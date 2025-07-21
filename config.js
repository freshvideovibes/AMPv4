// config.js

const AMP_CONFIG = {
    // URL zu Ihrer n8n-Instanz. Passen Sie diese an!
    // Beispiel: 'https://mein-n8n.server.com'
    n8nBaseUrl: 'https://amp-backend.app.n8n.cloud/webhook-test/amp-api-v2', // <-- HIER IHRE N8N URL EINTRAGEN

    // API-Endpunkt für alle Aktionen in n8n
    apiEndpoint: '/webhook-test/amp-api-v2',

    // Vordefinierte Benutzerdatenbank.
    // In einer produktiven Umgebung sollten Passwörter **niemals** im Klartext gespeichert werden.
    // Dies ist nur für Demozwecke.
    userDatabase: {
        // Admin-Benutzer
        'admin': {
            password: 'admin123',
            role: 'admin',
            name: 'Administrator',
            initials: 'AD'
        },
        'vergabe': {
            password: 'vergabe123',
            role: 'admin',
            name: 'Vergabe',
            initials: 'VG'
        },
        
        // Agenten-Benutzer
        'agent': {
            password: 'agent123',
            role: 'agent',
            name: 'Agent 007',
            initials: 'A7'
        },

        // Monteur-Benutzer (Telefonnummer als Benutzername)
        '+491234567890': {
            password: 'monteur123',
            role: 'monteur',
            name: 'Max Mustermann',
            initials: 'MM'
        },
        '+4369912345678': {
            password: 'monteur456',
            role: 'monteur',
            name: 'Anna Schmidt',
            initials: 'AS'
        }
    }
};