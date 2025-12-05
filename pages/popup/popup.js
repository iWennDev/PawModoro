const beltNames = [
    "White Belt",
    "Yellow Belt",
    "Orange Belt",
    "Green Belt",
    "Blue Belt",
    "Brown Belt",
    "Black Belt"
];

const beltFiles = [
    "white_belt.png",
    "yellow_belt.png",
    "orange_belt.png",
    "green_belt.png",
    "blue_belt.png",
    "brown_belt.png",
    "black_belt.png"
];

document.getElementById("start").addEventListener("click", () => {

    const awakeTime = Number(document.getElementById('awakeSlider').value);
    const sleepTime = Number(document.getElementById('sleepSlider').value);

    chrome.runtime.sendMessage({
        action: "startPomodoroCycle",
        awakeTime: awakeTime,
        sleepTime: sleepTime
    });

    updateButtonState(true);
});

document.getElementById("stop").addEventListener("click", () => {
    chrome.runtime.sendMessage({
        action: "stopPomodoroCycle"
    });

    updateButtonState(false);
});

function updateButtonState(isRunning) {
    const startBtn = document.getElementById("start");
    const stopBtn = document.getElementById("stop");
    const progressSection = document.getElementById("progressSection");
    
    if (isRunning) {
        startBtn.style.display = "none";
        stopBtn.style.display = "block";
        progressSection.style.display = "block";
        updateProgress();
    } else {
        startBtn.style.display = "block";
        stopBtn.style.display = "none";
        progressSection.style.display = "none";
    }
}

function updateProgress() {
    chrome.storage.local.get(["phaseStart", "phaseDuration", "isAwake", "isRunning"], (data) => {
        if (!data.isRunning || !data.phaseStart || !data.phaseDuration) return;

        const now = Date.now();
        const elapsed = now - data.phaseStart;
        const total = data.phaseDuration * 60 * 1000;
        const remaining = Math.max(0, total - elapsed);
        const percent = Math.min(100, (elapsed / total) * 100);

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        document.getElementById("progressFill").style.width = percent + "%";
        document.getElementById("progressTime").textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById("progressPhase").textContent = 
            data.isAwake === false ? "😴 Resting" : "☀️ Surfing";
    });
}

awakeSlider.addEventListener('input', () => {
    awakeValue.textContent = awakeSlider.value;
});

sleepSlider.addEventListener('input', () => {
    sleepValue.textContent = sleepSlider.value;
});

function getBeltImagePath(belt) {
    return "../../media/cats/" + (beltFiles[belt] || "white_belt.png");
}

chrome.storage.local.get(["awakeDuration", "sleepDuration", "xp", "belt", "isRunning"], (data) => {
    document.getElementById("xpValue").textContent = data.xp || "0";
    
    const beltIndex = data.belt || 0;
    document.getElementById("levelValue").textContent = beltNames[beltIndex] || "White Belt";
    document.getElementById("catImage").src = getBeltImagePath(beltIndex);
    
    if (data.awakeDuration) {
        document.getElementById("awakeSlider").value = data.awakeDuration;
        document.getElementById("awakeValue").textContent = data.awakeDuration;
    }
    if (data.sleepDuration) {
        document.getElementById("sleepSlider").value = data.sleepDuration;
        document.getElementById("sleepValue").textContent = data.sleepDuration;
    }

    updateButtonState(data.isRunning || false);
});

// Update progress every second
setInterval(() => {
    chrome.storage.local.get(["isRunning"], (data) => {
        if (data.isRunning) {
            updateProgress();
        }
    });
}, 1000);