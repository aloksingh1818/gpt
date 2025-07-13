// Storage management for recent sessions
const STORAGE_KEYS = {
    RECENT_SESSIONS: 'recent_sessions',
    LAST_SESSION: 'last_session',
    THEME: 'session_vault_theme',
    SHOW_SECRET_ID: 'session_vault_show_secret',
    VERSION: '1.0.0'
};

// Theme Management
const ThemeManager = {
    async getTheme() {
        const stored = await chrome.storage.local.get(STORAGE_KEYS.THEME);
        return stored[STORAGE_KEYS.THEME] || 'dark';
    },

    async setTheme(theme) {
        if (!['light', 'dark'].includes(theme)) {
            throw new Error('Invalid theme');
        }
        await chrome.storage.local.set({ [STORAGE_KEYS.THEME]: theme });
        document.body.setAttribute('data-theme', theme);
    },

    async toggleTheme() {
        const currentTheme = await this.getTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        await this.setTheme(newTheme);
        return newTheme;
    }
};

// Recent Sessions Management
const SessionManager = {
    async addRecentSession(sessionId, sessionData) {
        const stored = await chrome.storage.local.get(STORAGE_KEYS.RECENT_SESSIONS);
        const recentSessions = stored[STORAGE_KEYS.RECENT_SESSIONS] || [];
        
        // Remove if already exists
        const filtered = recentSessions.filter(s => s.sessionId !== sessionId);
        
        // Add to beginning
        filtered.unshift({
            sessionId,
            timestamp: Date.now(),
            domain: new URL(sessionData.url).hostname,
            expiryDate: sessionData.cookies[0]?.expirationDate,
            status: 'active' // Track session status
        });
        
        // Keep only last 5 sessions
        const updated = filtered.slice(0, 5);
        
        await chrome.storage.local.set({ [STORAGE_KEYS.RECENT_SESSIONS]: updated });
    },

    async getRecentSessions() {
        const stored = await chrome.storage.local.get(STORAGE_KEYS.RECENT_SESSIONS);
        return stored[STORAGE_KEYS.RECENT_SESSIONS] || [];
    },

    async removeSession(sessionId) {
        const stored = await chrome.storage.local.get(STORAGE_KEYS.RECENT_SESSIONS);
        const recentSessions = stored[STORAGE_KEYS.RECENT_SESSIONS] || [];
        
        // Remove the session
        const updated = recentSessions.filter(s => s.sessionId !== sessionId);
        
        await chrome.storage.local.set({ [STORAGE_KEYS.RECENT_SESSIONS]: updated });
    },

    async setLastSession(sessionId, sessionData) {
        await chrome.storage.local.set({
            [STORAGE_KEYS.LAST_SESSION]: {
                sessionId,
                timestamp: Date.now(),
                data: sessionData,
                status: 'active'
            }
        });
    },

    async getLastSession() {
        const stored = await chrome.storage.local.get(STORAGE_KEYS.LAST_SESSION);
        return stored[STORAGE_KEYS.LAST_SESSION];
    },

    async updateSessionStatus(sessionId, status) {
        const stored = await chrome.storage.local.get(STORAGE_KEYS.RECENT_SESSIONS);
        const recentSessions = stored[STORAGE_KEYS.RECENT_SESSIONS] || [];
        
        const updated = recentSessions.map(session => {
            if (session.sessionId === sessionId) {
                return { ...session, status };
            }
            return session;
        });
        
        await chrome.storage.local.set({ [STORAGE_KEYS.RECENT_SESSIONS]: updated });
    }
};

// Preferences Management
const PreferencesManager = {
    async getShowSecretId() {
        const stored = await chrome.storage.local.get(STORAGE_KEYS.SHOW_SECRET_ID);
        return stored[STORAGE_KEYS.SHOW_SECRET_ID] || false;
    },

    async setShowSecretId(show) {
        await chrome.storage.local.set({ [STORAGE_KEYS.SHOW_SECRET_ID]: show });
    },

    async toggleShowSecretId() {
        const current = await this.getShowSecretId();
        await this.setShowSecretId(!current);
        return !current;
    }
};

// Export the managers
window.SessionManager = SessionManager;
window.ThemeManager = ThemeManager;
window.PreferencesManager = PreferencesManager;
window.STORAGE_KEYS = STORAGE_KEYS;

const helpModal = document.getElementById('helpModal');
const helpLink = document.getElementById('helpLink');
const closeHelp = document.querySelector('.close-help');

helpLink.addEventListener('click', () => {
    helpModal.style.display = 'block';
});
closeHelp.addEventListener('click', () => {
    helpModal.style.display = 'none';
});
helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
        helpModal.style.display = 'none';
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && helpModal.style.display === 'block') {
        helpModal.style.display = 'none';
    }
}); 