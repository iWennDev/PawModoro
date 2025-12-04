document.getElementById("start").addEventListener("click", () => {
    chrome.runtime.sendMessage({
        action: "startPomodoroCycle"
    });
});

document.getElementById("stop").addEventListener("click", () => {
    chrome.runtime.sendMessage({
        action: "stopPomodoroCycle"
    });
});