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
    let pendingRevenues = [];
    let pendingAssignments = [];

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
            const response = await fetch('/api/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    userContext: currentUser,
                    data,
                    timestamp: new Date().toISOString()
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
                initials: user.initials,
                telegramId: tg?.initDataUnsafe?.user?.id
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
        
        // Lade ausstehende Bestätigungen für Vergabe-Rolle
        if (currentUser.role === 'admin' || currentUser.role === 'vergabe') {
            loadPendingApprovals();
        }
    }

    // --- UI-AUFBAU ---

    /**
     * Baut die Benutzeroberfläche basierend auf der Rolle des Benutzers auf
     * @param {string} role - Die Rolle des Benutzers ('admin', 'agent', 'monteur', 'vergabe')
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
            'profile': renderProfile,
            'approvals': renderApprovals,
            'assignments': renderAssignments,
            'revenues': renderRevenues
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
            'profile': 'Profil',
            'approvals': 'Bestätigungen',
            'assignments': 'Zuweisungen',
            'revenues': 'Umsätze'
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
                { id: 'approvals', icon: '✅', label: 'Bestätigen' },
                { id: 'reports', icon: '📈', label: 'Berichte' },
                { id: 'profile', icon: '👤', label: 'Profil' }
            ],
            vergabe: [
                { id: 'dashboard', icon: '📊', label: 'Dashboard' },
                { id: 'approvals', icon: '✅', label: 'Bestätigen' },
                { id: 'assignments', icon: '🎯', label: 'Zuweisungen' },
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
                { id: 'revenues', icon: '💰', label: 'Umsätze' },
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
            monteur: { icon: '💰', action: openReportRevenueModal },
            vergabe: { icon: '🎯', action: openAssignOrderModal }
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
                { icon: '📈', label: 'Tagesumsatz', value: `€${data.dailyRevenue || 0}` },
                { icon: '📋', label: 'Neue Aufträge', value: data.newOrders || 0 },
                { icon: '🔧', label: 'Aktive Monteure', value: data.activeMonteurs || 0 },
                { icon: '✅', label: 'Abschlussrate', value: `${data.completionRate || 0}%` },
                { icon: '⏳', label: 'Ausstehende Bestätigungen', value: data.pendingApprovals || 0 },
                { icon: '🎯', label: 'Offene Zuweisungen', value: data.pendingAssignments || 0 }
            ];
        } else if (role === 'vergabe') {
            bentoItems = [
                { icon: '⏳', label: 'Zu bestätigen', value: data.pendingRevenues || 0 },
                { icon: '🎯', label: 'Zuzuweisen', value: data.unassignedOrders || 0 },
                { icon: '✅', label: 'Heute bestätigt', value: data.approvedToday || 0 },
                { icon: '📊', label: 'Wochenumsatz', value: `€${data.weekRevenue || 0}` }
            ];
        } else if (role === 'monteur') {
            bentoItems = [
                { icon: '📋', label: 'Offene Aufträge', value: data.openOrders || 0 },
                { icon: '💰', label: 'Heutiger Umsatz', value: `€${data.dailyRevenue || 0}` },
                { icon: '✅', label: 'Heute erledigt', value: data.completedToday || 0 },
                { icon: '⏳', label: 'Umsätze ausstehend', value: data.pendingRevenues || 0 }
            ];
        } else if (role === 'agent') {
            bentoItems = [
                { icon: '📝', label: 'Heute erfasst', value: data.createdToday || 0 },
                { icon: '⚠️', label: 'Offene Beschwerden', value: data.openComplaints || 0 }
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
                <div class="order-card status-${order.status}" data-order-id="${order.id}">
                    <div class="order-card-header">
                        <span class="order-card-title">${order.customerName}</span>
                        <span class="order-card-id">#${order.id}</span>
                        ${order.assignedTo ? `<span class="assigned-badge">👤 ${order.assignedTo}</span>` : '<span class="unassigned-badge">Nicht zugewiesen</span>'}
                    </div>
                    <div class="order-card-body">
                        <p class="order-card-address">${order.address}</p>
                        <div class="order-meta">
                            <span>Status: ${getStatusText(order.status)}</span>
                            ${order.estimatedRevenue ? `<span class="revenue">€${order.estimatedRevenue}</span>` : ''}
                        </div>
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

    /**
     * Rendert die Bestätigungsansicht für Vergabe/Admin
     */
    async function renderApprovals(role) {
        const { success, data } = await apiRequest('get_pending_approvals');
        
        if (!success) {
            appContent.innerHTML = '<p>Bestätigungen konnten nicht geladen werden.</p>';
            return;
        }

        appContent.innerHTML = `
            <div class="approvals-container">
                <div class="section-header">
                    <h3>💰 Umsätze bestätigen</h3>
                    <span class="badge">${data.revenues?.length || 0}</span>
                </div>
                <div id="revenue-approvals"></div>
                
                <div class="section-header">
                    <h3>📋 Aufträge bestätigen</h3>
                    <span class="badge">${data.orders?.length || 0}</span>
                </div>
                <div id="order-approvals"></div>
            </div>
        `;

        // Umsatz-Bestätigungen rendern
        const revenueContainer = document.getElementById('revenue-approvals');
        if (data.revenues && data.revenues.length > 0) {
            revenueContainer.innerHTML = data.revenues.map(revenue => `
                <div class="approval-card revenue-card" data-id="${revenue.id}">
                    <div class="approval-header">
                        <div class="monteur-info">
                            <strong>${revenue.monteurName}</strong>
                            <span class="phone">${revenue.monteurPhone}</span>
                        </div>
                        <div class="amount">€${revenue.amount}</div>
                    </div>
                    <div class="approval-body">
                        <p><strong>Auftrag:</strong> #${revenue.orderId} - ${revenue.customerName}</p>
                        <p><strong>Adresse:</strong> ${revenue.address}</p>
                        <p><strong>Beschreibung:</strong> ${revenue.description || 'Keine Beschreibung'}</p>
                        <p><strong>Gemeldet am:</strong> ${formatDate(revenue.reportedAt)}</p>
                        ${revenue.images && revenue.images.length > 0 ? `
                            <div class="image-gallery">
                                ${revenue.images.map(img => `<img src="${img}" class="thumbnail" onclick="openImageModal('${img}')">`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="approval-actions">
                        <button class="btn btn-success" onclick="approveRevenue('${revenue.id}')">✅ Bestätigen</button>
                        <button class="btn btn-danger" onclick="rejectRevenue('${revenue.id}')">❌ Ablehnen</button>
                    </div>
                </div>
            `).join('');
        } else {
            revenueContainer.innerHTML = '<p class="no-items">Keine Umsätze zu bestätigen.</p>';
        }

        // Auftrags-Bestätigungen rendern
        const orderContainer = document.getElementById('order-approvals');
        if (data.orders && data.orders.length > 0) {
            orderContainer.innerHTML = data.orders.map(order => `
                <div class="approval-card order-card" data-id="${order.id}">
                    <div class="approval-header">
                        <div class="customer-info">
                            <strong>${order.customerName}</strong>
                            <span class="order-id">#${order.id}</span>
                        </div>
                        <div class="priority priority-${order.priority}">${order.priority}</div>
                    </div>
                    <div class="approval-body">
                        <p><strong>Adresse:</strong> ${order.address}</p>
                        <p><strong>Telefon:</strong> ${order.phone}</p>
                        <p><strong>Beschreibung:</strong> ${order.description}</p>
                        <p><strong>Erstellt von:</strong> ${order.createdBy} am ${formatDate(order.createdAt)}</p>
                    </div>
                    <div class="approval-actions">
                        <button class="btn btn-success" onclick="approveOrder('${order.id}')">✅ Bestätigen</button>
                        <button class="btn btn-warning" onclick="assignOrder('${order.id}')">🎯 Zuweisen</button>
                        <button class="btn btn-danger" onclick="rejectOrder('${order.id}')">❌ Ablehnen</button>
                    </div>
                </div>
            `).join('');
        } else {
            orderContainer.innerHTML = '<p class="no-items">Keine Aufträge zu bestätigen.</p>';
        }
    }

    /**
     * Rendert die Umsätze-Ansicht für Monteure
     */
    async function renderRevenues(role) {
        const { success, data } = await apiRequest('get_monteur_revenues');
        
        if (!success) {
            appContent.innerHTML = '<p>Umsätze konnten nicht geladen werden.</p>';
            return;
        }

        appContent.innerHTML = `
            <div class="revenues-container">
                <div class="revenue-summary">
                    <div class="summary-card">
                        <div class="icon">💰</div>
                        <div class="info">
                            <h3>€${data.totalRevenue || 0}</h3>
                            <p>Gesamt bestätigt</p>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="icon">⏳</div>
                        <div class="info">
                            <h3>€${data.pendingRevenue || 0}</h3>
                            <p>Ausstehend</p>
                        </div>
                    </div>
                </div>
                
                <div class="section-header">
                    <h3>📊 Meine Umsätze</h3>
                </div>
                <div id="revenue-list"></div>
            </div>
        `;

        const revenueList = document.getElementById('revenue-list');
        if (data.revenues && data.revenues.length > 0) {
            revenueList.innerHTML = data.revenues.map(revenue => `
                <div class="revenue-item status-${revenue.status}">
                    <div class="revenue-header">
                        <div class="order-info">
                            <strong>#${revenue.orderId}</strong>
                            <span>${revenue.customerName}</span>
                        </div>
                        <div class="amount">€${revenue.amount}</div>
                    </div>
                    <div class="revenue-body">
                        <p>${revenue.address}</p>
                        <div class="revenue-meta">
                            <span class="status-badge status-${revenue.status}">${getStatusText(revenue.status)}</span>
                            <span class="date">${formatDate(revenue.reportedAt)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            revenueList.innerHTML = '<p class="no-items">Noch keine Umsätze gemeldet.</p>';
        }
    }

    // --- MODAL-HANDLING ---
    function openNewOrderModal() {
        modalTitle.textContent = 'Neuen Auftrag erstellen';
        modalBody.innerHTML = `
            <form id="new-order-form">
                <div class="form-group">
                    <label>Kundenname *</label>
                    <input name="customerName" placeholder="Max Mustermann" required>
                </div>
                <div class="form-group">
                    <label>Adresse *</label>
                    <input name="address" placeholder="Musterstraße 123, 12345 Musterstadt" required>
                </div>
                <div class="form-group">
                    <label>Telefon *</label>
                    <input name="phone" type="tel" placeholder="+49 123 456789" required>
                </div>
                <div class="form-group">
                    <label>E-Mail</label>
                    <input name="email" type="email" placeholder="kunde@beispiel.de">
                </div>
                <div class="form-group">
                    <label>Priorität</label>
                    <select name="priority" required>
                        <option value="normal">Normal</option>
                        <option value="urgent">Dringend</option>
                        <option value="low">Niedrig</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Geschätzter Umsatz</label>
                    <input name="estimatedRevenue" type="number" step="0.01" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Beschreibung</label>
                    <textarea name="description" placeholder="Detaillierte Beschreibung des Auftrags..."></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Auftrag erstellen</button>
            </form>
        `;
        modalContainer.classList.add('active');

        document.getElementById('new-order-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.createdBy = currentUser.name;
            data.createdAt = new Date().toISOString();
            
            const result = await apiRequest('create_order', data);
            if (result.success) {
                closeModal();
                navigateToView(currentView); // Ansicht aktualisieren
                tg?.showAlert('Auftrag erfolgreich erstellt und zur Bestätigung gesendet!');
            }
        });
    }
    
    function openReportRevenueModal() {
        modalTitle.textContent = 'Umsatz melden';
        modalBody.innerHTML = `
            <form id="revenue-form" enctype="multipart/form-data">
                <div class="form-group">
                    <label>Auftrag auswählen *</label>
                    <select name="orderId" id="order-select" required>
                        <option value="">Auftrag auswählen...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Umsatz (€) *</label>
                    <input name="amount" type="number" step="0.01" placeholder="0.00" required>
                </div>
                <div class="form-group">
                    <label>Beschreibung der Arbeit</label>
                    <textarea name="description" placeholder="Was wurde gemacht?..."></textarea>
                </div>
                <div class="form-group">
                    <label>Fotos (optional)</label>
                    <input name="images" type="file" accept="image/*" multiple>
                    <small>Mehrere Bilder möglich (max. 10MB pro Bild)</small>
                </div>
                <button type="submit" class="btn btn-primary">Umsatz melden</button>
            </form>
        `;
        modalContainer.classList.add('active');

        // Lade verfügbare Aufträge für den Monteur
        loadMonteurOrders();

        document.getElementById('revenue-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            // Handle file uploads
            const files = formData.getAll('images');
            const imagePromises = Array.from(files).map(file => {
                if (file.size > 0) {
                    return uploadImage(file);
                }
                return null;
            }).filter(p => p !== null);
            
            const uploadedImages = await Promise.all(imagePromises);
            
            const data = {
                orderId: formData.get('orderId'),
                amount: parseFloat(formData.get('amount')),
                description: formData.get('description'),
                images: uploadedImages.filter(img => img !== null),
                monteurId: currentUser.username,
                monteurName: currentUser.name,
                reportedAt: new Date().toISOString()
            };
            
            const result = await apiRequest('report_revenue', data);
            if (result.success) {
                closeModal();
                navigateToView('revenues');
                tg?.showAlert('Umsatz erfolgreich gemeldet! Warten auf Bestätigung durch Vergabe.');
            }
        });
    }

    function openAssignOrderModal() {
        modalTitle.textContent = 'Auftrag zuweisen';
        modalBody.innerHTML = `
            <form id="assign-form">
                <div class="form-group">
                    <label>Auftrag auswählen *</label>
                    <select name="orderId" id="unassigned-orders" required>
                        <option value="">Auftrag auswählen...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Monteur auswählen *</label>
                    <select name="monteurId" id="available-monteurs" required>
                        <option value="">Monteur auswählen...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Priorität</label>
                    <select name="priority">
                        <option value="normal">Normal</option>
                        <option value="urgent">Dringend</option>
                        <option value="low">Niedrig</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Notizen für Monteur</label>
                    <textarea name="notes" placeholder="Besondere Hinweise..."></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Auftrag zuweisen</button>
            </form>
        `;
        modalContainer.classList.add('active');

        // Lade unzugewiesene Aufträge und verfügbare Monteure
        loadUnassignedOrders();
        loadAvailableMonteurs();

        document.getElementById('assign-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.assignedBy = currentUser.name;
            data.assignedAt = new Date().toISOString();
            
            const result = await apiRequest('assign_order', data);
            if (result.success) {
                closeModal();
                navigateToView(currentView);
                tg?.showAlert('Auftrag erfolgreich zugewiesen!');
            }
        });
    }

    async function openOrderDetails(orderId) {
        const { success, data: order } = await apiRequest('get_order_details', { orderId });
        if(success) {
            modalTitle.textContent = `Auftrag #${order.id}`;
            modalBody.innerHTML = `
                <div class="order-details">
                    <div class="detail-section">
                        <h4>👤 Kunde</h4>
                        <p><strong>${order.customerName}</strong></p>
                        <p>📍 ${order.address}</p>
                        <p>📞 ${order.phone}</p>
                        ${order.email ? `<p>📧 ${order.email}</p>` : ''}
                    </div>
                    
                    <div class="detail-section">
                        <h4>📋 Auftragsinformationen</h4>
                        <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></p>
                        <p><strong>Priorität:</strong> <span class="priority-badge priority-${order.priority}">${order.priority}</span></p>
                        ${order.assignedTo ? `<p><strong>Zugewiesen an:</strong> ${order.assignedTo}</p>` : '<p><em>Noch nicht zugewiesen</em></p>'}
                        ${order.estimatedRevenue ? `<p><strong>Geschätzter Umsatz:</strong> €${order.estimatedRevenue}</p>` : ''}
                        <p><strong>Erstellt:</strong> ${formatDate(order.createdAt)} von ${order.createdBy}</p>
                    </div>
                    
                    ${order.description ? `
                        <div class="detail-section">
                            <h4>📝 Beschreibung</h4>
                            <p>${order.description}</p>
                        </div>
                    ` : ''}
                    
                    ${order.revenues && order.revenues.length > 0 ? `
                        <div class="detail-section">
                            <h4>💰 Gemeldete Umsätze</h4>
                            ${order.revenues.map(rev => `
                                <div class="revenue-entry status-${rev.status}">
                                    <div class="revenue-header">
                                        <span>€${rev.amount}</span>
                                        <span class="status-badge status-${rev.status}">${getStatusText(rev.status)}</span>
                                    </div>
                                    <p>${rev.description || 'Keine Beschreibung'}</p>
                                    <small>Gemeldet am ${formatDate(rev.reportedAt)}</small>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                ${(currentUser.role === 'admin' || currentUser.role === 'vergabe') ? `
                    <div class="action-buttons">
                        ${!order.assignedTo ? `<button class="btn btn-warning" onclick="assignOrderFromDetails('${order.id}')">🎯 Zuweisen</button>` : ''}
                        <button class="btn btn-primary" onclick="editOrder('${order.id}')">✏️ Bearbeiten</button>
                    </div>
                ` : ''}
            `;
            modalContainer.classList.add('active');
        }
    }
    
    function closeModal() {
        modalContainer.classList.remove('active');
        modalBody.innerHTML = '';
    }

    // --- HILFSFUNKTIONEN ---
    
    async function loadMonteurOrders() {
        const { success, data } = await apiRequest('get_monteur_orders');
        const select = document.getElementById('order-select');
        
        if (success && data.length > 0) {
            select.innerHTML = '<option value="">Auftrag auswählen...</option>' +
                data.map(order => `
                    <option value="${order.id}">#${order.id} - ${order.customerName} (${order.address})</option>
                `).join('');
        }
    }

    async function loadUnassignedOrders() {
        const { success, data } = await apiRequest('get_unassigned_orders');
        const select = document.getElementById('unassigned-orders');
        
        if (success && data.length > 0) {
            select.innerHTML = '<option value="">Auftrag auswählen...</option>' +
                data.map(order => `
                    <option value="${order.id}">#${order.id} - ${order.customerName} (${order.address})</option>
                `).join('');
        }
    }

    async function loadAvailableMonteurs() {
        const { success, data } = await apiRequest('get_available_monteurs');
        const select = document.getElementById('available-monteurs');
        
        if (success && data.length > 0) {
            select.innerHTML = '<option value="">Monteur auswählen...</option>' +
                data.map(monteur => `
                    <option value="${monteur.id}">${monteur.name} (${monteur.phone}) - ${monteur.activeOrders || 0} aktive Aufträge</option>
                `).join('');
        }
    }

    async function loadPendingApprovals() {
        const { success, data } = await apiRequest('get_pending_approvals');
        if (success) {
            pendingRevenues = data.revenues || [];
            pendingAssignments = data.orders || [];
            
            // Update notification badges
            updateNotificationBadges();
        }
    }

    function updateNotificationBadges() {
        const totalPending = pendingRevenues.length + pendingAssignments.length;
        
        // Update nav badge for approvals
        const approvalsNav = document.querySelector('.nav-item[data-view="approvals"]');
        if (approvalsNav && totalPending > 0) {
            if (!approvalsNav.querySelector('.notification-badge')) {
                const badge = document.createElement('span');
                badge.className = 'notification-badge';
                badge.textContent = totalPending;
                approvalsNav.appendChild(badge);
            } else {
                approvalsNav.querySelector('.notification-badge').textContent = totalPending;
            }
        }
    }

    async function uploadImage(file) {
        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('userId', currentUser.username);
            
            const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            return result.success ? result.imageUrl : null;
        } catch (error) {
            console.error('Image upload failed:', error);
            return null;
        }
    }

    // Global functions for onclick handlers
    window.approveRevenue = async (revenueId) => {
        const result = await apiRequest('approve_revenue', { revenueId });
        if (result.success) {
            navigateToView('approvals');
            tg?.showAlert('Umsatz bestätigt!');
        }
    };

    window.rejectRevenue = async (revenueId) => {
        const reason = prompt('Grund für Ablehnung:');
        if (reason) {
            const result = await apiRequest('reject_revenue', { revenueId, reason });
            if (result.success) {
                navigateToView('approvals');
                tg?.showAlert('Umsatz abgelehnt!');
            }
        }
    };

    window.approveOrder = async (orderId) => {
        const result = await apiRequest('approve_order', { orderId });
        if (result.success) {
            navigateToView('approvals');
            tg?.showAlert('Auftrag bestätigt!');
        }
    };

    window.assignOrder = async (orderId) => {
        // Open assignment modal with pre-selected order
        openAssignOrderModal();
        setTimeout(() => {
            document.getElementById('unassigned-orders').value = orderId;
        }, 100);
    };

    function getStatusText(status) {
        const statusTexts = {
            'pending': 'Ausstehend',
            'approved': 'Bestätigt',
            'rejected': 'Abgelehnt',
            'assigned': 'Zugewiesen',
            'in_progress': 'In Bearbeitung',
            'completed': 'Abgeschlossen',
            'urgent': 'Dringend',
            'normal': 'Normal',
            'low': 'Niedrig'
        };
        return statusTexts[status] || status;
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Dummy-Renderer für noch nicht implementierte Ansichten
    function renderReports() { 
        appContent.innerHTML = `
            <div class="reports-container">
                <h2>📊 Berichte & Statistiken</h2>
                <p>Detaillierte Berichte werden in Kürze verfügbar sein.</p>
                
                <div class="coming-soon">
                    <div class="feature-list">
                        <h3>Geplante Features:</h3>
                        <ul>
                            <li>📈 Umsatzentwicklung</li>
                            <li>👥 Monteur-Performance</li>
                            <li>📊 Auftragsstatus-Übersicht</li>
                            <li>💰 Gewinn-/Verlustrechnung</li>
                            <li>📅 Monats-/Jahresberichte</li>
                        </ul>
                    </div>
                </div>
            </div>
        `; 
    }
    
    function renderProfile() { 
        appContent.innerHTML = `
            <div class="profile-container">
                <div class="profile-header">
                    <div class="profile-avatar">${currentUser.initials}</div>
                    <h2>${currentUser.name}</h2>
                    <p class="role-badge role-${currentUser.role}">${getRoleText(currentUser.role)}</p>
                </div>
                
                <div class="profile-section">
                    <h3>Benutzerinformationen</h3>
                    <div class="info-item">
                        <span class="label">Benutzername:</span>
                        <span class="value">${currentUser.username}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Rolle:</span>
                        <span class="value">${getRoleText(currentUser.role)}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Angemeldet seit:</span>
                        <span class="value">${formatDate(new Date().toISOString())}</span>
                    </div>
                </div>
                
                <div class="profile-actions">
                    <button class="btn btn-secondary" onclick="changePassword()">🔒 Passwort ändern</button>
                    <button class="btn btn-danger" id="logout-btn">🚪 Abmelden</button>
                </div>
            </div>
        `; 
        
        document.getElementById('logout-btn').addEventListener('click', () => {
            currentUser = null;
            showScreen('login');
            tg?.showAlert('Erfolgreich abgemeldet!');
        });
    }

    function renderAssignments() {
        appContent.innerHTML = `
            <div class="assignments-container">
                <h2>🎯 Auftragszuweisungen</h2>
                <p>Diese Funktion wird in der nächsten Version verfügbar sein.</p>
            </div>
        `;
    }

    function getRoleText(role) {
        const roleTexts = {
            'admin': 'Administrator',
            'vergabe': 'Vergabe',
            'agent': 'Agent',
            'monteur': 'Monteur'
        };
        return roleTexts[role] || role;
    }

    window.changePassword = () => {
        tg?.showAlert('Passwort-Änderung wird in der nächsten Version verfügbar sein.');
    };
});
