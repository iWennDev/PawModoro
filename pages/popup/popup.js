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

chrome.storage.local.get(["awakeDuration", "sleepDuration", "xp", "belt"], (data) => {
    if (data.xp) {
        document.getElementById("xpValue").textContent = data.xp;
    }
    else {
        document.getElementById("xpValue").textContent = "0";
    }
    if (data.belt) {
        document.getElementById("levelValue").textContent = data.belt;
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