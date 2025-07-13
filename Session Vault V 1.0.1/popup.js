// UI Elements
const mainScreen = document.getElementById('mainScreen');
const loading = document.querySelector('.loading');
const statusBanner = document.getElementById('statusBanner');
const cookieValue = document.getElementById('cookieValue');
const toggleSecret = document.getElementById('toggleSecret');

// Show loading state
function showLoading(show) {
    loading.classList.toggle('active', show);
}

// Show status banner
function showStatus(message, type = 'success') {
    statusBanner.textContent = message;
    statusBanner.className = `status-banner ${type}`;
    statusBanner.style.display = 'block';

    setTimeout(() => {
        statusBanner.style.display = 'none';
    }, 5000);
}

// Initialize the extension
async function initialize() {
    try {
        const theme = await ThemeManager.getTheme();
        document.body.setAttribute('data-theme', theme);

        document.querySelector('.container').style.display = 'block';
        mainScreen.style.display = 'block';

        const recentSessions = await SessionManager.getRecentSessions();
        const recentSessionsList = document.getElementById('recentSessionsList');
        const lastFourSessions = recentSessions.slice(0, 4);

        recentSessionsList.innerHTML = lastFourSessions.map((session, index) => `
            <div class="session-item" data-session-id="${session.sessionId}">
                <div class="session-info">
                    <div class="session-domain">${index + 1}. ${session.domain}</div>
                    <div class="session-time">Last used: ${new Date(session.timestamp).toLocaleString()}</div>
                </div>
                <div class="session-actions">
                    <button class="use-session" title="Use this token">🔄</button>
                    <button class="delete-session" title="Remove from history">🗑️</button>
                </div>
            </div>
        `).join('');

        recentSessionsList.querySelectorAll('.session-item').forEach(item => {
            item.querySelector('.use-session').addEventListener('click', () => {
                cookieValue.value = item.dataset.sessionId;
                document.getElementById('getCookie').click();
            });

            item.querySelector('.delete-session').addEventListener('click', async () => {
                const sessionId = item.dataset.sessionId;
                await SessionManager.removeSession(sessionId);
                item.remove();
                showStatus('Session removed from history', 'success');
            });
        });

        const showSecret = await PreferencesManager.getShowSecretId();
        updateSecretVisibility(showSecret);
    } catch (error) {
        console.error('Error initializing extension:', error);
        showStatus('Error initializing extension', 'error');
    }
}

// Update secret ID visibility
function updateSecretVisibility(show) {
    cookieValue.type = show ? 'text' : 'password';
    toggleSecret.textContent = show ? '👁️' : '🔒';
}

// Theme Toggle
document.getElementById('themeToggle').addEventListener('click', async () => {
    const newTheme = await ThemeManager.toggleTheme();
    document.body.setAttribute('data-theme', newTheme);
});

// Toggle Secret ID visibility
toggleSecret.addEventListener('click', async () => {
    const newState = await PreferencesManager.toggleShowSecretId();
    updateSecretVisibility(newState);
});

// 🔄 Restore Cookies and Delete Previous Cookies
document.getElementById("getCookie").addEventListener("click", async () => {
    const sessionId = document.getElementById("cookieValue").value.trim();
    if (!/^[A-Z]{2}\d{3}_.+$/.test(sessionId)) {
        showStatus("❌ Invalid Secret ID format.", "error");
        return;
    }

    showLoading(true);
    console.log("🔥 Fetching data from secure Vercel API...");

    try {
        const response = await fetch(`https://secure-firebase-api.vercel.app/api/get-session?sessionId=${sessionId}`);
        const result = await response.json();

        if (!result.success) {
            showStatus("❌ Session ID not found!", "error");
            return;
        }

        const sessionData = result.data;
        const compressedCookies = sessionData.compressedCookies;
        const cookieData = JSON.parse(atob(compressedCookies));
        console.log("🍪 Decoded Cookies:", cookieData);

        await SessionManager.addRecentSession(sessionId, cookieData);
        await SessionManager.setLastSession(sessionId, cookieData);

        const domain = new URL(cookieData.url).hostname;

        const cookies = await chrome.cookies.getAll({ domain: domain });
        if (cookies.length > 0) {
            for (const cookie of cookies) {
                await chrome.cookies.remove({
                    url: `https://${cookie.domain}${cookie.path}`,
                    name: cookie.name
                });
                console.log(`🗑 Deleted cookie: ${cookie.name}`);
            }
        }

        chrome.runtime.sendMessage({
            action: "setCookies",
            url: cookieData.url,
            cookies: cookieData.cookies
        }, (response) => {
            if (response && response.success) {
                console.log("✅ Cookies applied, opening the stored website...");
                showStatus(`✅ Session restored for ${domain}`);
                chrome.tabs.create({ url: cookieData.url });
            } else {
                showStatus("❌ Failed to restore cookies!", "error");
            }
        });

    } catch (error) {
        console.error("🚨 Error fetching session:", error);
        showStatus("❌ Failed to fetch session!", "error");
    } finally {
        showLoading(false);
    }
});

// 🗑 Delete Cookies from Current Tab
document.getElementById("deleteCookie").addEventListener("click", async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabURL = new URL(tabs[0].url);
    const domain = tabURL.hostname;
    console.log("🗑 Deleting cookies for:", domain);

    showLoading(true);
    try {
        const cookies = await chrome.cookies.getAll({ domain: domain });
        for (const cookie of cookies) {
            await chrome.cookies.remove({
                url: `https://${cookie.domain}${cookie.path}`,
                name: cookie.name
            });
            console.log(`🗑 Deleted cookie: ${cookie.name}`);
        }
        showStatus(`✅ All cookies deleted for ${domain}`);
        chrome.tabs.reload(tabs[0].id);
    } catch (error) {
        console.error("Error deleting cookies:", error);
        showStatus("❌ Failed to delete cookies!", "error");
    } finally {
        showLoading(false);
    }
});

// Initialize the extension
initialize();

