// TODO : Make durations configurable
const SLEEP_DURATION = 1; // in minutes, minimum 1 (0.5 for newer Chrome versions)
const AWAKE_DURATION = 1; // in minutes, minimum 1 (0.5 for newer Chrome versions)

const COUNTDOWN_DURATION = 10; // in seconds

const SNOOZE_DURATION = 1; // in minutes

let isAwake = true;
let sleepEnd = null;

let isRunning = false;

const blockedURLs = [
    /^chrome:\/\//,
    /^chrome-extension:\/\//,
    /^https:\/\/chrome\.google\.com\/webstore/,
    /^chrome:\/\/pdf-viewer/,
    /^edge:\/\//,
    /^vivaldi:\/\//
];

function isInjectable(tab) {
    return !blockedURLs.some((pattern) => pattern.test(tab.url));
}

function injectScriptEverywhere(scriptPath) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (isInjectable(tab)) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: [scriptPath]
                }).catch((err) => {
                    console.warn(`Could not inject script into tab ${tab.id}: ${err.message}`);
                });
            }
        });
    });
}

function startCycle() {
    console.log(`Starting cycle with AWAKE...`);
    chrome.alarms.create("pomodoroCycle", {delayInMinutes: AWAKE_DURATION-(COUNTDOWN_DURATION/60)});

    injectScriptEverywhere("scripts/sleep_overlay.js");

    broadcastToTabs({action: "pomodoroAwake"});
}

function stopCycle() {
    isAwake = true;
    chrome.alarms.clear("pomodoroCycle");
    console.log("Cycle stopped");
    broadcastToTabs({action: "pomodoroAwake"});
}

function snoozeCycle() {
    isAwake = true;
    chrome.alarms.clear("pomodoroCycle");
    console.log(`Snoozing for ${SNOOZE_DURATION} minute(s)`);
    chrome.alarms.create("pomodoroCycle", {delayInMinutes: SNOOZE_DURATION});
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
            if (isInjectable(tab)) {
                messageTab(tab.id, message);
            }
        });
    });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.action) {
        case "startPomodoroCycle":
            if (!isRunning) {
                isRunning = true;
                console.log("Cycle starting");
                startCycle();
            }
            break;

        case "stopPomodoroCycle":
            if (isRunning) {
                isRunning = false;
                console.log("Stopping cycle");
                stopCycle();
            }
            break;

        case "snoozePomodoroCycle":
            if (isRunning) {
                console.log("Snooze pressed");
                snoozeCycle();
            }
            break;

        default:
            console.warn("Unknown action:", msg.action);
    }

    sendResponse({ success: true });
});

chrome.alarms.onAlarm.addListener(
    (alarm) => {
        if (alarm.name !== "pomodoroCycle") {
            return;
        }

        console.log(`Switching to ${isAwake ? 'SLEEP' : 'AWAKE'} phase`);
        isAwake = !isAwake;
        chrome.alarms.create("pomodoroCycle", {delayInMinutes: isAwake ? AWAKE_DURATION-(COUNTDOWN_DURATION/60) : SLEEP_DURATION+(COUNTDOWN_DURATION/60)});

        if (!isAwake) {
            sleepEnd = Date.now() + (SLEEP_DURATION+COUNTDOWN_DURATION/60) * 60 * 1000;
            broadcastToTabs({action: "pomodoroTimer", startTime: Date.now(), timerDuration: COUNTDOWN_DURATION, sleepEnd: sleepEnd});
        }
        else {
            broadcastToTabs({action: "pomodoroAwake"});
        }
    }
);

// Hides new tabs if in sleep mode
chrome.tabs.onCreated.addListener((tab) => {
    if (!isAwake && isInjectable(tab)) {
        messageTab(tab.id, { action: "pomodoroSleep", sleepEnd: sleepEnd });
    }
});

// Hides reloaded or long to load tabs if in sleep mode
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!isAwake && changeInfo.status === "complete" && isInjectable(tab)) {
        messageTab(tabId, { action: "pomodoroSleep", sleepEnd: sleepEnd });
    }
});