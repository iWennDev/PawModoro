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
    
    if (isRunning) {
        startBtn.style.display = "none";
        stopBtn.style.display = "block";
    } else {
        startBtn.style.display = "block";
        stopBtn.style.display = "none";
    }
}

awakeSlider.addEventListener('input', () => {
    awakeValue.textContent = awakeSlider.value;
});

sleepSlider.addEventListener('input', () => {
    sleepValue.textContent = sleepSlider.value;
});

function getBeltImagePath(belt) {
    return "../../cats/" + (beltFiles[belt] || "white_belt.png");
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