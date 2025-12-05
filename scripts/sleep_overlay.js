const COUNTDOWN_UPDATE_INTERVAL = 250; // in milliseconds

let overlay;
let countdown;
let countdownInterval;
let sleepingCountdownInterval;

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

function createCountdownTimer(durationSeconds, startTime, sleepEnd) {

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
        padding: "16px 20px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#fff",
        fontSize: "18px",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        borderRadius: "16px",
        zIndex: "99999999",
        pointerEvents: "auto",
        boxShadow: "0 8px 32px rgba(102, 126, 234, 0.4)",
        display: "flex",
        alignItems: "center",
        gap: "12px"
    });

    const timerContainer = document.createElement("div");
    Object.assign(timerContainer.style, {
        display: "flex",
        alignItems: "center",
        gap: "8px"
    });

    const timerText = document.createElement("span");
    Object.assign(timerText.style, {
        fontSize: "28px",
        fontWeight: "700",
        minWidth: "40px",
        textAlign: "center"
    });

    let elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    let remainingSeconds = durationSeconds - elapsedSeconds;
    if (remainingSeconds < 0) {
        remainingSeconds = 0;
    }
    timerText.textContent = remainingSeconds;

    const label = document.createElement("span");
    label.textContent = "Rest in";
    Object.assign(label.style, {
        fontSize: "14px",
        opacity: "0.9",
        marginRight: "4px"
    });

    timerContainer.appendChild(label);
    timerContainer.appendChild(timerText);
    countdown.appendChild(timerContainer);

    const snoozeBtn = document.createElement("button");
    snoozeBtn.textContent = "Snooze (-2 XP)";
    Object.assign(snoozeBtn.style, {
        padding: "8px 16px",
        fontSize: "14px",
        fontWeight: "600",
        color: "#764ba2",
        backgroundColor: "#fff",
        border: "none",
        borderRadius: "10px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    });
    
    snoozeBtn.addEventListener("mouseenter", () => {
        snoozeBtn.style.transform = "scale(1.05)";
        snoozeBtn.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
    });
    snoozeBtn.addEventListener("mouseleave", () => {
        snoozeBtn.style.transform = "scale(1)";
        snoozeBtn.style.boxShadow = "none";
    });
    
    snoozeBtn.addEventListener("click", () => {
        chrome.runtime.sendMessage({action: "snoozePomodoroCycle"});

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
            createOverlay(sleepEnd);
        } else {
            timerText.textContent = remainingSeconds;
        }
    }, COUNTDOWN_UPDATE_INTERVAL);
}

function createOverlay(sleepEnd) {
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
        zIndex: "99999999", // High z-index to cover all content
        cursor: "auto",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        gap: "24px"
    });

    // Cat on pillow
    const sleepIcon = document.createElement("img");
    sleepIcon.src = chrome.runtime.getURL("media/cat_pillow.png");
    sleepIcon.alt = "Sleeping cat";
    Object.assign(sleepIcon.style, {
        width: "250px",
        height: "250px",
        objectFit: "contain",
        animation: "pulse 2s ease-in-out infinite"
    });
    overlay.appendChild(sleepIcon);

    // Pulsing anim
    const style = document.createElement("style");
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
        }
    `;
    overlay.appendChild(style);

    const title = document.createElement("div");
    title.textContent = "Time to Rest";
    Object.assign(title.style, {
        color: "#fff",
        fontSize: "32px",
        fontWeight: "700",
        textShadow: "0 2px 10px rgba(0, 0, 0, 0.2)"
    });
    overlay.appendChild(title);

    // Countdown
    const countdownContainer = document.createElement("div");
    Object.assign(countdownContainer.style, {
        background: "rgba(255, 255, 255, 0.15)",
        borderRadius: "20px",
        padding: "24px 48px",
        backdropFilter: "blur(10px)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)"
    });

    const overlayCountdown = document.createElement("div");
    overlayCountdown.id = "overlayCountdown";
    Object.assign(overlayCountdown.style, {
        color: "#fff",
        fontSize: "72px",
        fontWeight: "700",
        textAlign: "center",
        letterSpacing: "4px",
        textShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
    });
    countdownContainer.appendChild(overlayCountdown);
    overlay.appendChild(countdownContainer);

    const subtitle = document.createElement("div");
    subtitle.textContent = "Take a break from your screen";
    Object.assign(subtitle.style, {
        color: "rgba(255, 255, 255, 0.8)",
        fontSize: "16px",
        marginTop: "8px"
    });
    overlay.appendChild(subtitle);

    // Skip button
    const skipBtn = document.createElement("button");
    skipBtn.textContent = "⏭️ Skip Rest (-10 XP)";
    Object.assign(skipBtn.style, {
        marginTop: "16px",
        padding: "14px 28px",
        fontSize: "16px",
        fontWeight: "600",
        color: "#764ba2",
        backgroundColor: "#fff",
        border: "none",
        borderRadius: "12px",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    });

    skipBtn.addEventListener("mouseenter", () => {
        skipBtn.style.transform = "translateY(-2px) scale(1.02)";
        skipBtn.style.boxShadow = "0 6px 24px rgba(0, 0, 0, 0.3)";
    });
    skipBtn.addEventListener("mouseleave", () => {
        skipBtn.style.transform = "translateY(0) scale(1)";
        skipBtn.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.2)";
    });

    overlay.appendChild(skipBtn);

    skipBtn.addEventListener("click", () => {
        chrome.runtime.sendMessage({action: "skipSleepPomodoroCycle"});

        clearInterval(sleepingCountdownInterval);
        overlay.remove();
        overlay = null;
    });

    document.body.appendChild(overlay);

    document.body.style.overflow = "hidden"; // no scrolling

    sleepingCountdownInterval = setInterval(() => {
        let remainingMs = sleepEnd - Date.now();
        if (remainingMs <= 0) {
            remainingMs = 0;
            clearInterval(sleepingCountdownInterval);
        } else {
            let remainingSeconds = Math.ceil(remainingMs / 1000);
            let minutes = Math.floor(remainingSeconds / 60);
            let seconds = remainingSeconds % 60;
            overlayCountdown.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, COUNTDOWN_UPDATE_INTERVAL);
}

// Messsages from background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.action) {
        case "pomodoroTimer":
            createCountdownTimer(Number(msg.timerDuration), Number(msg.startTime), Number(msg.sleepEnd));
            break;
        case "pomodoroSleep":
            createOverlay(Number(msg.sleepEnd));
            break;
        case "pomodoroAwake":
            if (overlay) {
                clearInterval(sleepingCountdownInterval);
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