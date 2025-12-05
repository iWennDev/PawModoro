const COUNTDOWN_DURATION = 10; // in seconds

const SNOOZE_DURATION = 5; // in minutes

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

// Common addresses where the script can't be injected
const blockedURLs = [
    /^chrome:\/\//,
    /^chrome-extension:\/\//,
    /^https:\/\/chrome\.google\.com\/webstore/,
    /^chrome:\/\/pdf-viewer/,
    /^edge:\/\//,
    /^vivaldi:\/\//
];

// Checks if a tab's URL allows script injection
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

// Calculates belt index based on XP
function calculateBelt(xp) {
    for (let i = levels.length - 1; i >= 0; i--) {
        if (xp >= levels[i]) {
            return i;
        }
    }
    return 0;
}

// Updates XP and belt based on action
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

// Starts the Pomodoro cycle with specified awake and sleep durations
function startCycle(awakeTime, sleepTime) {
    awakeDuration = awakeTime;
    sleepDuration = sleepTime;
    
    chrome.storage.local.set({
        awakeDuration,
        sleepDuration,
        isRunning: true,
        isAwake: true,
        phaseStart: Date.now(),
        phaseDuration: awakeDuration - (COUNTDOWN_DURATION / 60)
    });

    console.log(`Starting cycle with AWAKE...`);
    chrome.alarms.create("pomodoroCycle", {delayInMinutes: awakeDuration-(COUNTDOWN_DURATION/60)});

    injectScriptEverywhere("scripts/sleep_overlay.js");

    broadcastToTabs({action: "pomodoroAwake"});
}

// Stops the Pomodoro cycle (destroys alarms and resets state)
function stopCycle() {
    isAwake = true;
    chrome.alarms.clear("pomodoroCycle");
    console.log("Cycle stopped");
    chrome.storage.local.set({
        isRunning: false
    });
    broadcastToTabs({action: "pomodoroAwake"});
}

function snoozeCycle() {
    isAwake = true;
    chrome.alarms.clear("pomodoroCycle");
    console.log(`Snoozing for ${SNOOZE_DURATION} minute(s)`);
    chrome.alarms.create("pomodoroCycle", {delayInMinutes: SNOOZE_DURATION});
    chrome.storage.local.set({
        isAwake: true,
        phaseStart: Date.now(),
        phaseDuration: SNOOZE_DURATION
    });
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

// Sends a message to a specific tab
function messageTab(tabId, message) {
    chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
            console.warn(`Could not message tab ${tabId}: ${chrome.runtime.lastError.message}`);
        }
    });
}
// Broadcasts a message to all injectable tabs
function broadcastToTabs(message) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (isInjectable(tab)) {
                messageTab(tab.id, message);
            }
        });
    });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Read state from storage in case service worker restarted
    chrome.storage.local.get(["isRunning", "isAwake", "awakeDuration", "sleepDuration"], (data) => {
        isRunning = data.isRunning ?? false;
        isAwake = data.isAwake !== false;
        awakeDuration = data.awakeDuration ?? awakeDuration;
        sleepDuration = data.sleepDuration ?? sleepDuration;

        switch (msg.action) {
            case "startPomodoroCycle":
                if (!isRunning) {
                    isRunning = true;
                    console.log("Cycle starting");
                    startCycle(Number(msg.awakeTime), Number(msg.sleepTime));
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
    });

    sendResponse({ success: true });
    return true;
});

// Alarm handler to switch between AWAKE and SLEEP phases
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "pomodoroCycle") {
        chrome.storage.local.get(["awakeDuration", "sleepDuration", "isAwake"], (data) => {
            const wasAwake = data.isAwake !== false;
            isAwake = !wasAwake;
            
            awakeDuration = data.awakeDuration ?? awakeDuration;
            sleepDuration = data.sleepDuration ?? sleepDuration;

            console.log(`Switching to ${isAwake ? "AWAKE" : "SLEEP"} phase`);

            chrome.alarms.create("pomodoroCycle", {
                delayInMinutes: isAwake
                    ? awakeDuration-(COUNTDOWN_DURATION/60)
                    : sleepDuration+(COUNTDOWN_DURATION/60)
            });

            if (!isAwake) {
                sleepEnd = Date.now() + (
                    (sleepDuration+(COUNTDOWN_DURATION/60)) * 60 * 1000
                );
                chrome.storage.local.set({
                    isAwake: false,
                    phaseStart: Date.now(),
                    phaseDuration: sleepDuration+(COUNTDOWN_DURATION/60)
                })
                broadcastToTabs({ action: "pomodoroTimer", startTime: Date.now(),
                    timerDuration: COUNTDOWN_DURATION, sleepEnd});
            } else {
                chrome.storage.local.set({
                    isAwake: true,
                    phaseStart: Date.now(),
                    phaseDuration: awakeDuration-(COUNTDOWN_DURATION/60)
                })
                broadcastToTabs({ action: "pomodoroAwake" });
                updateXp(COMPLETE_BONUS);
            }
        });
    }
});

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

// Initialize XP and belt on startup or install
function initializeStorage() {
    chrome.storage.local.set({ isRunning: false });
    chrome.storage.local.get(["xp", "belt"], (data) => {
        if (data.xp === undefined) {
            chrome.storage.local.set({ xp: 0 }, () => {
                console.log("XP initialized to 0");
            });
        }

        let currentXp = data.xp || 0;
        let belt = calculateBelt(currentXp);
        if (data.belt === undefined || data.belt !== belt) {
            chrome.storage.local.set({ belt: belt }, () => {
                console.log(`Belt initialized to ${belt}`);
            });
        }
    });
}

chrome.runtime.onStartup.addListener(initializeStorage);
chrome.runtime.onInstalled.addListener(initializeStorage);
