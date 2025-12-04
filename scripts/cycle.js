// TODO : Make durations configurable
const SLEEP_DURATION = 1; // in minutes, minimum 1 (0.5 for newer Chrome versions)
const AWAKE_DURATION = 1; // in minutes, minimum 1 (0.5 for newer Chrome versions)

let isAwake = true;

let isRunning = false;

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

function startCycle() {
    console.log(`Starting cycle with AWAKE...`);
    chrome.alarms.create("pomodoroCycle", {delayInMinutes: AWAKE_DURATION});
}

function stopCycle() {
    chrome.alarms.clear("pomodoroCycle");
    console.log("Cycle stopped");
}

chrome.alarms.onAlarm.addListener(
    (alarm) => {
        if (alarm.name !== "pomodoroCycle") {
            return;
        }

        console.log(`Switching to ${isAwake ? 'SLEEP' : 'AWAKE'} phase`);
        isAwake = !isAwake;
        chrome.alarms.create("pomodoroCycle", {delayInMinutes: isAwake ? AWAKE_DURATION : SLEEP_DURATION});
    }
);