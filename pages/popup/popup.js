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