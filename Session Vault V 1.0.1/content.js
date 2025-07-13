chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "modifyPage") {
        document.body.style.backgroundColor = "lightyellow"; // Change background
    }
});
