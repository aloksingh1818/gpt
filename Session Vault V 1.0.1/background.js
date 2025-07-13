chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // 🟢 Set Cookies from Stored Session
    if (request.action === "setCookies") {
        const cookiesArray = request.cookies;
        let count = cookiesArray.length;

        if (!cookiesArray.length) {
            console.error("❌ No cookies found to restore!");
            sendResponse({ success: false });
            return;
        }

        console.log("🍪 Setting Cookies:", cookiesArray);

        cookiesArray.forEach((cookie) => {
            let cookieDetails = {
                url: "https://" + cookie.domain.replace(/^\.?/, ''),
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain.startsWith(".") ? cookie.domain : "." + cookie.domain,
                path: cookie.path || "/",
                secure: cookie.secure || false,
                httpOnly: cookie.httpOnly || false,
                expirationDate: cookie.session ? null : cookie.expirationDate,
                sameSite: cookie.sameSite || "None"
            };

            chrome.cookies.set(cookieDetails, () => {
                console.log("✅ Cookie Set:", cookieDetails);
                count--;
                if (count === 0) {
                    console.log("🎉 All Cookies Restored Successfully!");
                    sendResponse({ success: true });
                }
            });
        });

        return true;
    }

    // 🔴 Delete All Cookies for the Current Tab
    if (request.action === "deleteAllCookies") {
        console.log("🗑 Deleting all cookies for:", request.url);

        chrome.cookies.getAll({ url: request.url }, (cookies) => {
            if (cookies.length === 0) {
                console.warn("⚠ No cookies found to delete!");
                sendResponse({ success: false });
                return;
            }

            let count = cookies.length;
            cookies.forEach((cookie) => {
                chrome.cookies.remove({
                    url: "https://" + cookie.domain.replace(/^\.?/, ''),
                    name: cookie.name
                }, () => {
                    console.log("🗑 Deleted Cookie:", cookie.name);
                    count--;
                    if (count === 0) {
                        console.log("✅ All Cookies Deleted Successfully!");
                        sendResponse({ success: true });
                    }
                });
            });
        });

        return true;
    }
});
