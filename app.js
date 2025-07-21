// app.js

document.addEventListener('DOMContentLoaded', () => {
    // Initialisiert die Telegram Web App
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();
        tg.BackButton.hide();
        // Theme-Anpassungen für ein natives Gefühl
        document.body.style.backgroundColor = tg.themeParams.bg_color || '#000000';
    }
    
    // Globale Zustandsvariablen
    let currentUser = null;
    let currentView = 'dashboard';

    // UI-Elemente
    const screens = {
        login: document.getElementById('login-screen'),
        main: document.getElementById('main-app'),
    };
    const appHeader = document.getElementById('app-header');
    const appContent = document.getElementById('app-content');
    const bottomNav = document.getElementById('bottom-nav');
    const fabContainer = document.getElementById('fab-container');
    const loader = document.getElementById('loader');
    const modalContainer = document.getElementById('modal-container');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    // Event Listeners
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);

    // --- KERNFUNKTIONEN ---

    /**
     * Wechselt den aktiven Bildschirm (z.B. von Login zu Haupt-App)
     * @param {string} screenName - Der Name des anzuzeigenden Bildschirms ('login' oder 'main')
     */
    function showScreen(screenName) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenName].classList.add('active');
    }
    
    /**
     * Zeigt oder verbirgt den Lade-Spinner
     * @param {boolean} isLoading - Ob der Spinner angezeigt werden soll
     */
    function setLoading(isLoading) {
        loader.classList.toggle('hidden', !isLoading);
    }

    /**
     * Führt eine API-Anfrage an den n8n-Server aus
     * @param {string} action - Die auszuführende Aktion (z.B. 'get_orders')
     * @param {object} data - Die zu sendenden Daten
     * @returns {Promise<object>} - Die Antwort vom Server
     */
    async function apiRequest(action, data = {}) {
        setLoading(true);
        try {
            const response = await fetch(AMP_CONFIG.n8nBaseUrl + AMP_CONFIG.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    userContext: currentUser,
                    data
                })
            });
            if (!response.ok) throw new Error(`API Fehler: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`API Request fehlgeschlagen für Aktion '${action}':`, error);
            tg?.showAlert(`Ein Fehler ist aufgetreten: ${error.message}`);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    }

    // --- AUTHENTIFIZIERUNG ---

    /**
     * Verarbeitet den Login-Versuch des Benutzers
     */
    function handleLogin(event) {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const user = AMP_CONFIG.userDatabase[username];

        if (user && user.password === password) {
            currentUser = {
                username,
                role: user.role,
                name: user.name,
                initials: user.initials
            };
            initializeAppForUser();
        } else {
            tg?.showAlert('Falscher Benutzername oder Passwort.');
        }
    }

    /**
     * Initialisiert die App nach erfolgreichem Login
     */
    function initializeAppForUser() {
        showScreen('main');
        document.getElementById('user-initials').textContent = currentUser.initials;
        setupUIForRole(currentUser.role);
    }

    // --- UI-AUFBAU ---

    /**
     * Baut die Benutzeroberfläche basierend auf der Rolle des Benutzers auf
     * @param {string} role - Die Rolle des Benutzers ('admin', 'agent', 'monteur')
     */
    function setupUIForRole(role) {
        renderBottomNav(role);
        renderFAB(role);
        navigateToView('dashboard'); // Startansicht nach Login
    }

    /**
     * Navigiert zu einer bestimmten Ansicht innerhalb der App (z.B. Dashboard, Aufträge)
     * @param {string} viewId - Die ID der anzuzeigenden Ansicht
     */
    function navigateToView(viewId) {
        currentView = viewId;
        document.getElementById('header-title').textContent = getTitleForView(viewId);
        
        // Aktiven Zustand in der Navigation aktualisieren
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewId);
        });

        // Inhalte für die Ansicht rendern
        const contentRenderers = {
            'dashboard': renderDashboard,
            'orders': renderOrdersList,
            'reports': renderReports,
            'profile': renderProfile
        };
        
        if (contentRenderers[viewId]) {
            contentRenderers[viewId](currentUser.role);
        } else {
            appContent.innerHTML = `<h2>Ansicht "${viewId}" nicht gefunden.</h2>`;
        }
    }

    /**
     * Gibt den Titel für eine bestimmte Ansicht zurück
     */
    function getTitleForView(viewId) {
        const titles = {
            'dashboard': 'Dashboard',
            'orders': 'Aufträge',
            'reports': 'Berichte',
            'profile': 'Profil'
        };
        return titles[viewId] || 'AMP 2.0';
    }

    // --- DYNAMISCHES RENDERING ---
    
    /**
     * Rendert die untere Navigationsleiste für die gegebene Rolle
     */
    function renderBottomNav(role) {
        const navItems = {
            admin: [
                { id: 'dashboard', icon: '📊', label: 'Dashboard' },
                { id: 'orders', icon: '📋', label: 'Aufträge' },
                { id: 'reports', icon: '📈', label: 'Berichte' },
                { id: 'profile', icon: '👤', label: 'Profil' }
            ],
            agent: [
                { id: 'dashboard', icon: '📊', label: 'Dashboard' },
                { id: 'orders', icon: '📋', label: 'Suche' },
                { id: 'profile', icon: '👤', label: 'Profil' }
            ],
            monteur: [
                { id: 'dashboard', icon: '📊', label: 'Dashboard' },
                { id: 'orders', icon: '📋', label: 'Meine Aufträge' },
                { id: 'profile', icon: '👤', label: 'Profil' }
            ]
        };
        
        bottomNav.innerHTML = navItems[role].map(item => `
            <div class="nav-item" data-view="${item.id}">
                <div class="icon">${item.icon}</div>
                <div class="label">${item.label}</div>
            </div>
        `).join('');

        // Event Listeners für die neuen Nav-Items hinzufügen
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => navigateToView(item.dataset.view));
        });
    }

    /**
     * Rendert den Floating Action Button für die gegebene Rolle
     */
    function renderFAB(role) {
        const fabConfig = {
            agent: { icon: '➕', action: openNewOrderModal },
            monteur: { icon: '💰', action: openReportRevenueModal }
        };

        if (fabConfig[role]) {
            fabContainer.innerHTML = `<button class="fab">${fabConfig[role].icon}</button>`;
            fabContainer.querySelector('.fab').addEventListener('click', fabConfig[role].action);
        } else {
            fabContainer.innerHTML = '';
        }
    }

    /**
     * Rendert das Dashboard für die gegebene Rolle
     */
    async function renderDashboard(role) {
        appContent.innerHTML = '<div class="bento-grid" id="dashboard-grid"></div>';
        const grid = document.getElementById('dashboard-grid');

        const { success, data } = await apiRequest('get_dashboard_data');
        if (!success) {
            grid.innerHTML = '<p>Dashboard-Daten konnten nicht geladen werden.</p>';
            return;
        }

        let bentoItems = [];
        if (role === 'admin') {
            bentoItems = [
                { icon: '📈', label: 'Tagesumsatz', value: `€${data.dailyRevenue}` },
                { icon: '📋', label: 'Neue Aufträge', value: data.newOrders },
                { icon: '🔧', label: 'Aktive Monteure', value: data.activeMonteurs },
                { icon: '✅', label: 'Abschlussrate', value: `${data.completionRate}%` }
            ];
        } else if (role === 'monteur') {
            bentoItems = [
                { icon: '📋', label: 'Offene Aufträge', value: data.openOrders },
                { icon: '💰', label: 'Heutiger Umsatz', value: `€${data.dailyRevenue}` },
                { icon: '✅', label: 'Heute erledigt', value: data.completedToday }
            ];
        } else if (role === 'agent') {
            bentoItems = [
                { icon: '📝', label: 'Heute erfasst', value: data.createdToday },
                { icon: '⚠️', label: 'Offene Beschwerden', value: data.openComplaints }
            ];
        }
        
        grid.innerHTML = bentoItems.map(item => `
            <div class="bento-item">
                <div class="icon">${item.icon}</div>
                <div class="label">${item.label}</div>
                <h3>${item.value}</h3>
            </div>
        `).join('');
        
        // Optional: Zusätzliche Listen oder Graphen laden
        if (role === 'monteur') {
             renderOrdersList(role, true); // Dringende Aufträge auf Dashboard anzeigen
        }
    }
    
    /**
     * Rendert eine Liste von Aufträgen
     */
    async function renderOrdersList(role, urgentOnly = false) {
        const { success, data: orders } = await apiRequest('get_orders', { role });
        
        if (!success) {
            appContent.innerHTML = '<p>Aufträge konnten nicht geladen werden.</p>';
            return;
        }

        const targetElement = urgentOnly ? document.createElement('div') : appContent;
        if (!urgentOnly) targetElement.innerHTML = '';
        
        let filteredOrders = urgentOnly ? orders.filter(o => o.priority === 'urgent') : orders;

        if (filteredOrders.length === 0) {
            targetElement.innerHTML += '<p>Keine Aufträge gefunden.</p>';
        } else {
            targetElement.innerHTML += filteredOrders.map(order => `
                <div class="order-card status-${order.priority}" data-order-id="${order.id}">
                    <div class="order-card-header">
                        <span class="order-card-title">${order.customerName}</span>
                        <span class="order-card-id">#${order.id}</span>
                    </div>
                    <div class="order-card-body">
                        <p class="order-card-address">${order.address}</p>
                        <span>Status: ${order.status}</span>
                    </div>
                </div>
            `).join('');
        }

        if (urgentOnly) appContent.appendChild(targetElement);

        // Event listeners für die neuen Karten
        document.querySelectorAll('.order-card').forEach(card => {
            card.addEventListener('click', () => openOrderDetails(card.dataset.orderId));
        });
    }

    // --- MODAL-HANDLING ---
    function openNewOrderModal() {
        modalTitle.textContent = 'Neuen Auftrag erstellen';
        modalBody.innerHTML = `
            <form id="new-order-form">
                <div class="form-group"><input name="customerName" placeholder="Kundenname" required></div>
                <div class="form-group"><input name="address" placeholder="Adresse" required></div>
                <div class="form-group"><input name="phone" placeholder="Telefon" required></div>
                <div class="form-group"><textarea name="description" placeholder="Beschreibung"></textarea></div>
                <button type="submit" class="btn btn-primary">Auftrag speichern</button>
            </form>
        `;
        modalContainer.classList.add('active');

        document.getElementById('new-order-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            const result = await apiRequest('create_order', data);
            if (result.success) {
                closeModal();
                navigateToView(currentView); // Ansicht aktualisieren
                tg?.showAlert('Auftrag erfolgreich erstellt!');
            }
        });
    }
    
    function openReportRevenueModal() {
        // Implementierung für Umsatzmeldung
    }

    async function openOrderDetails(orderId) {
        const { success, data: order } = await apiRequest('get_order_details', { orderId });
        if(success) {
            modalTitle.textContent = `Auftrag #${order.id}`;
            modalBody.innerHTML = `
                <h4>${order.customerName}</h4>
                <p>${order.address}</p>
                <p><strong>Status:</strong> ${order.status}</p>
                <p><strong>Beschreibung:</strong> ${order.description || 'Keine'}</p>
            `;
            modalContainer.classList.add('active');
        }
    }
    
    function closeModal() {
        modalContainer.classList.remove('active');
        modalBody.innerHTML = '';
    }

    // Dummy-Renderer für noch nicht implementierte Ansichten
    function renderReports() { appContent.innerHTML = '<h2>Berichte (in Kürze verfügbar)</h2>'; }
    function renderProfile() { appContent.innerHTML = `<h2>Profil von ${currentUser.name}</h2><button class="btn" id="logout-btn">Abmelden</button>`; 
        document.getElementById('logout-btn').addEventListener('click', () => {
            currentUser = null;
            showScreen('login');
        });
    }
});```
