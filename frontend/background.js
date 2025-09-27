const CAPTURE_INTERVAL_MIN = 1 / 6; // 10 seconds

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

import { BACKEND_URL } from "./config.js";

async function captureAndUpload() {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab || activeTab.id == null) {
      return;
    }
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
      format: "png",
    });

    const { name, email, managerEmail } = await chrome.storage.local.get({
      name: "",
      email: "",
      managerEmail: "",
    });

    const backendUrl = BACKEND_URL;

    // Upsert user to backend before sending capture
    try {
      await fetch(backendUrl + "/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, managerEmail }),
      });
    } catch (e) {
      console.warn("Failed to upsert user", e);
    }

    const payload = {
      name,
      email,
      managerEmail,
      tabTitle: activeTab.title ?? "",
      tabUrl: activeTab.url ?? "",
      capturedAt: new Date().toISOString(),
      imageBase64: dataUrl,
    };

    await fetch(backendUrl + "/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("capture/upload failed", err);
  }
}

async function startCapture() {
  const hasPerm = await chrome.permissions.contains({ permissions: ["tabs"] });
  if (!hasPerm) {
    chrome.runtime.sendMessage({
      type: "CAPTURE_STATUS",
      message: "Missing tabs permission.",
    });
    return;
  }
  await chrome.storage.local.set({ capturing: true });
  chrome.runtime.sendMessage({
    type: "CAPTURE_STATUS",
    message: "Capturing started.",
  });
  // Use alarms API for reliable periodic wakeups in MV3 service worker
  await chrome.alarms.clear("alloy_mission_capture");
  await chrome.alarms.create("alloy_mission_capture", {
    periodInMinutes: CAPTURE_INTERVAL_MIN,
    delayInMinutes: 0,
  });
  // Fire immediately on start as well
  captureAndUpload();
}

async function stopCapture() {
  await chrome.alarms.clear("alloy_mission_capture");
  await chrome.storage.local.set({ capturing: false });
  chrome.runtime.sendMessage({
    type: "CAPTURE_STATUS",
    message: "Capturing stopped.",
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg?.type === "START_CAPTURE") {
    startCapture();
  }
  if (msg?.type === "STOP_CAPTURE") {
    stopCapture();
  }
});

// Resume capture on service worker wake if state was true
chrome.runtime.onStartup.addListener(async () => {
  const { capturing } = await chrome.storage.local.get({ capturing: false });
  if (capturing) {
    startCapture();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "alloy_mission_capture") {
    captureAndUpload();
  }
});
