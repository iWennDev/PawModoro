const COUNTDOWN_DURATION = 10; // in seconds

const SNOOZE_DURATION = 1; // in minutes TODO put 5 minutes, for testing purposes set to 1

// negative actions
const SNOOZE_PENALTY = 2;
const SKIP_PENALTY = 10;

//positive actions
const COMPLETE_BONUS = 10;

const levels = [
    0, // White Belt
    30, // Yellow Belt
    100, // Orange Belt
    250, // Green Belt
    500, // Blue Belt
    1000, // Brown Belt
    2000 // Black Belt
];

let isAwake = true;
let sleepEnd = null;

let isRunning = false;

let awakeDuration;
let sleepDuration;

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

function calculateBelt(xp) {
    for (let i = levels.length - 1; i >= 0; i--) {
        if (xp >= levels[i]) {
            return i;
        }
    }
    return 0;
}

function updateXp(amount) {
    chrome.storage.local.get(["xp", "belt"], (data) => {
        let currentXp = data.xp || 0;
        let newXp = Math.max(0, currentXp + amount);

        chrome.storage.local.set({ xp: newXp }, () => {
            console.log(`XP updated: ${currentXp} -> ${newXp}`);
        });

        let newBelt = calculateBelt(newXp);
        if (newBelt !== data.belt) {
            chrome.storage.local.set({ belt: newBelt }, () => {
                console.log(`Belt updated: ${data.belt} -> ${newBelt}`);
            });
        }
    });
}

function startCycle(awakeTime, sleepTime) {
    awakeDuration = awakeTime;
    sleepDuration = sleepTime;
    
    chrome.storage.local.set({
        awakeDuration,
        sleepDuration
    });

    console.log(`Starting cycle with AWAKE...`);
    chrome.alarms.create("pomodoroCycle", {delayInMinutes: awakeDuration-(COUNTDOWN_DURATION/60)});

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
    // Apply penalty for snoozing
    updateXp(-SNOOZE_PENALTY);
}

function skipSleep() {
    isAwake = true;
    chrome.alarms.clear("pomodoroCycle");
    console.log(`Skipping sleep phase, starting AWAKE for ${awakeDuration} minute(s)`);
    chrome.alarms.create("pomodoroCycle", {delayInMinutes: awakeDuration-(COUNTDOWN_DURATION/60)});
    broadcastToTabs({action: "pomodoroAwake"});
    // Apply penalty for skipping sleep
    updateXp(-SKIP_PENALTY);
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
                // TODO restore real values, 1, 1 are for testing
                //startCycle(Number(msg.awakeTime), Number(msg.sleepTime));
                startCycle(1, 1);
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

        case "skipSleepPomodoroCycle":
            if (isRunning && !isAwake) {
                console.log("Skipping sleep");
                skipSleep();
            }
            break;

        default:
            console.warn("Unknown action:", msg.action);
    }

    sendResponse({ success: true });
});

chrome.alarms.onAlarm.addListener(
    (alarm) => {
        if (alarm.name === "pomodoroCycle") {
            console.log(`Switching to ${isAwake ? 'SLEEP' : 'AWAKE'} phase`);
            isAwake = !isAwake;
            chrome.alarms.create("pomodoroCycle", {delayInMinutes: isAwake ? awakeDuration-(COUNTDOWN_DURATION/60) : sleepDuration+(COUNTDOWN_DURATION/60)});

            if (!isAwake) {
                sleepEnd = Date.now() + (sleepDuration+COUNTDOWN_DURATION/60) * 60 * 1000;
                broadcastToTabs({action: "pomodoroTimer", startTime: Date.now(), timerDuration: COUNTDOWN_DURATION, sleepEnd: sleepEnd});
            }
            else {
                broadcastToTabs({action: "pomodoroAwake"});
                // Award XP for completing a sleep cycle
                updateXp(COMPLETE_BONUS);
            }
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

// Initialize XP on startup if missing
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(["xp", "belt"], (data) => {
        if (data.xp === undefined) {
            chrome.storage.local.set({ xp: 0 }, () => {
                console.log("XP initialized to 0");
            });
        }
        if (data.belt === undefined) {
            chrome.storage.local.set({ belt: "White Belt" }, () => {
                console.log("Belt initialized to White Belt");
            });
        }
    });
});

//TODO remove duplication with onStartup listener
// Initialize XP on fresh install if missing
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(["xp"], (data) => {
        if (data.xp === undefined) {
            chrome.storage.local.set({ xp: 0 }, () => {
                console.log("XP initialized to 0");
            });
        }

        let currentXp = data.xp || 0;
        let belt = calculateBelt(currentXp);
        chrome.storage.local.set({ belt: belt }, () => {
            console.log(`Belt initialized to ${belt}`);
        });
    });
});
