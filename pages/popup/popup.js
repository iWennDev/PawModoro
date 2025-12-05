document.getElementById("start").addEventListener("click", () => {

    const awakeTime = Number(document.getElementById('awakeSlider').value);
    const sleepTime = Number(document.getElementById('sleepSlider').value);

    chrome.runtime.sendMessage({
        action: "startPomodoroCycle",
        awakeTime: awakeTime,
        sleepTime: sleepTime
    });
});

document.getElementById("stop").addEventListener("click", () => {
    chrome.runtime.sendMessage({
        action: "stopPomodoroCycle"
    });
});

awakeSlider.addEventListener('input', () => {
    awakeValue.textContent = awakeSlider.value;
});

sleepSlider.addEventListener('input', () => {
    sleepValue.textContent = sleepSlider.value;
});

function getBeltImagePath(belt) {
    const beltToFile = {
        "White Belt": "white_belt.png",
        "Yellow Belt": "yellow_belt.png",
        "Orange Belt": "orange_belt.png",
        "Green Belt": "green_belt.png",
        "Blue Belt": "blue_belt.png",
        "Brown Belt": "brown_belt.png",
        "Black Belt": "black_belt.png"
    };
    return "../../cats/" + (beltToFile[belt] || "white_belt.png");
}

chrome.storage.local.get(["awakeDuration", "sleepDuration", "xp", "belt"], (data) => {
    if (data.xp) {
        document.getElementById("xpValue").textContent = data.xp;
    }
    else {
        document.getElementById("xpValue").textContent = "0";
    }
    if (data.belt) {
        document.getElementById("levelValue").textContent = data.belt;
        document.getElementById("catImage").src = getBeltImagePath(data.belt);
    } else {
        document.getElementById("levelValue").textContent = "White Belt";
        document.getElementById("catImage").src = getBeltImagePath("White Belt");
    }
    if (data.awakeDuration) {
        document.getElementById("awakeSlider").value = data.awakeDuration;
        document.getElementById("awakeValue").textContent = data.awakeDuration;
    }
    if (data.sleepDuration) {
        document.getElementById("sleepSlider").value = data.sleepDuration;
        document.getElementById("sleepValue").textContent = data.sleepDuration;
    }
});