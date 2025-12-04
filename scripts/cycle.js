// TODO : Make durations configurable
const SLEEP_DURATION = 1; // in minutes, minimum 1 (0.5 for newer Chrome versions)
const AWAKE_DURATION = 1; // in minutes, minimum 1 (0.5 for newer Chrome versions)

let isAwake = true;

let isRunning = false;

//TODO : don't try to send messages to tabs that can't receive them (chrome://, etc)

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "startPomodoroCycle") {
        if (isRunning) {
            console.log("Cycle already running");
            return;
        }
        isRunning = true;
        console.log("Cycle starting");
        startCycle();
    }
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "stopPomodoroCycle") {
        if (!isRunning) {
            console.log("Cycle is not running");
            return;
        }
        isRunning = false;
        console.log("Stopping cycle");
        stopCycle();
    }
});

function injectScriptEverywhere(scriptPath) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: [scriptPath]
            });
        });
    });
}

function startCycle() {
    console.log(`Starting cycle with AWAKE...`);
    chrome.alarms.create("pomodoroCycle", {delayInMinutes: AWAKE_DURATION});

    injectScriptEverywhere("scripts/sleep_overlay.js");

    broadcastToTabs({action: "pomodoroAwake"});
}

function stopCycle() {
    chrome.alarms.clear("pomodoroCycle");
    console.log("Cycle stopped");
    broadcastToTabs({action: "pomodoroAwake"});
}

function messageTab(tabId, message) {
    chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
            console.warn(`Could not message tab ${tabId}: ${chrome.runtime.lastError.message}`);
        }
    });
}

function broadcastToTabs(message) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {

            messageTab(tab.id, message);
        });
    });
}

chrome.alarms.onAlarm.addListener(
    (alarm) => {
        if (alarm.name !== "pomodoroCycle") {
            return;
        }

        console.log(`Switching to ${isAwake ? 'SLEEP' : 'AWAKE'} phase`);
        isAwake = !isAwake;
        chrome.alarms.create("pomodoroCycle", {delayInMinutes: isAwake ? AWAKE_DURATION : SLEEP_DURATION});
        broadcastToTabs({action: isAwake ? "pomodoroAwake" : "pomodoroSleep"});
    }
);

// Hides new tabs if in sleep mode
chrome.tabs.onCreated.addListener((tab) => {
    if (!isAwake) {
        messageTab(tab.id, { action: "pomodoroSleep" });
    }
});

// Hides reloaded or long to load tabs if in sleep mode
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!isAwake && changeInfo.status === "complete") {
        messageTab(tabId, { action: "pomodoroSleep" });
    }
});