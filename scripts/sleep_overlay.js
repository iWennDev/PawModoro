let overlay;

function pauseAllMedia() {
    const mediaElements = document.querySelectorAll("video, audio");
    mediaElements.forEach((element) => {
        try {
            element.pause();
        } catch (e) {
            console.warn("Failed to pause media element:", e);
        }
    });
}

function createOverlay() {
    if (overlay) {
        return;
    }

    pauseAllMedia();

    overlay = document.createElement("div");
    overlay.id = "sleepOverlay";

    Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        pointerEvents: "auto",
        zIndex: "99999999", // High z-index to cover all content TODO: find highest possible in doc
        cursor: "auto",
        backdropFilter: "blur(4px)"
    });
    
    document.body.appendChild(overlay);

    document.body.style.overflow = "hidden"; // no scrolling
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "pomodoroSleep") {
        createOverlay();
    }
    else if (msg.action === "pomodoroAwake") {
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
    }

    sendResponse({success: true});
});