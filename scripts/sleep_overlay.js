const COUNTDOWN_UPDATE_INTERVAL = 250; // in milliseconds

let overlay;
let countdown;
let countdownInterval;

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

function createCountdownTimer(durationSeconds, startTime) {

    if (countdown) {
        return;
    }

    countdown = document.createElement("div");
    countdown.id = "countdownTimer";
    
    startTime = Number(startTime)

    Object.assign(countdown.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        padding: "10px 15px",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        color: "#fff",
        fontSize: "24px",
        borderRadius: "8px",
        zIndex: "99999999",
        pointerEvents: "auto"
    });

    const timerText = document.createElement("span");

    let elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    let remainingSeconds = durationSeconds - elapsedSeconds;
    if (remainingSeconds < 0) {
        remainingSeconds = 0;
    }
    timerText.textContent = remainingSeconds;

    countdown.appendChild(timerText);

    const snoozeBtn = document.createElement("button");
    snoozeBtn.textContent = "Snooze";
    Object.assign(snoozeBtn.style, {
        marginLeft: "10px",
        padding: "5px 10px",
        fontSize: "20px",
        color: "#fff",
        cursor: "pointer"
    });
    snoozeBtn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "snoozePomodoroCycle" });

        clearInterval(countdownInterval);
        countdown.remove();
        countdown = null;
    });

    countdown.appendChild(snoozeBtn);

    document.body.appendChild(countdown);

    countdownInterval = setInterval(() => {
        remainingSeconds = durationSeconds - Math.floor((Date.now() - startTime) / 1000);
        if (remainingSeconds <= 0) {
            clearInterval(countdownInterval);
            countdown.remove();
            countdown = null;
            createOverlay();
        } else {
            timerText.textContent = remainingSeconds;
        }
    }, COUNTDOWN_UPDATE_INTERVAL);
}

function createOverlay() {
    if (overlay) {
        return;
    }

    if (countdown) {
        countdown.remove();
        clearInterval(countdownInterval);
        countdown = null;
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
    switch (msg.action) {
        case "pomodoroTimer":
            let timerDuration = msg.timerDuration;
            createCountdownTimer(timerDuration, msg.startTime);
            break;
        case "pomodoroSleep":
            createOverlay();
            break;
        case "pomodoroAwake":
            if (overlay) {
                overlay.remove();
                overlay = null;
            }
            if (countdown) {
                countdown.remove();
                clearInterval(countdownInterval);
                countdown = null;
            }
            document.body.style.overflow = ""; // restore scrolling
            break;
    
        default:
            break;
    }

    sendResponse({success: true});
});