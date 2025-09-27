import { BACKEND_URL } from "../config.js";

const form = document.getElementById("user-form");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const managerEmailInput = document.getElementById("managerEmail");
const consentCheckbox = document.getElementById("consent");
const statusEl = document.getElementById("status");
const requestPermBtn = document.getElementById("requestPermission");
const summary = document.getElementById("summary");
const sName = document.getElementById("sName");
const sEmail = document.getElementById("sEmail");
const sManagerEmail = document.getElementById("sManagerEmail");
const permStatus = document.getElementById("permStatus");

function setStatus(text) {
  statusEl.textContent = text;
}

async function restore() {
  const { name, email, managerEmail, consent, capturing } =
    await chrome.storage.local.get({
      name: "",
      email: "",
      managerEmail: "",
      consent: false,
      capturing: false,
    });
  nameInput.value = name || "";
  emailInput.value = email || "";
  managerEmailInput.value = managerEmail || "";
  consentCheckbox.checked = !!consent;
  setStatus(capturing ? "Capturing is active" : "Capturing is stopped");

  if (name && email && managerEmail) {
    // Hide form, show summary
    document.getElementById("user-form").hidden = true;
    summary.hidden = false;
    sName.textContent = name;
    sEmail.textContent = email;
    sManagerEmail.textContent = managerEmail;
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const managerEmail = managerEmailInput.value.trim();
  const consent = consentCheckbox.checked;
  if (!name || !email || !managerEmail) {
    setStatus("Please fill all fields.");
    return;
  }
  await chrome.storage.local.set({ name, email, managerEmail, consent });
  setStatus("Saved.");
  // Save the user data to the backend
  try {
    const resp = await fetch(BACKEND_URL + "/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, managerEmail }),
    });
    if (!resp.ok) {
      throw new Error(`Backend responded ${resp.status}`);
    }
    setStatus("Saved and synced with backend.");
  } catch (e) {
    console.warn("Failed to save user to backend", e);
    setStatus("Saved locally. Backend sync failed.");
  }

  // Hide form, show summary
  document.getElementById("user-form").hidden = true;
  summary.hidden = false;
  sName.textContent = name;
  sEmail.textContent = email;
  sManagerEmail.textContent = managerEmail;

  // If consent and permission are granted, auto-start capture
  const hasPerm = await chrome.permissions.contains({ permissions: ["tabs"] });
  if (consent && hasPerm) {
    await chrome.runtime.sendMessage({ type: "START_CAPTURE" });
  }
});

requestPermBtn.addEventListener("click", async () => {
  const granted = await chrome.permissions.request({ permissions: ["tabs"] });
  if (granted) {
    setStatus("Permission granted.");
    permStatus.textContent = "Tabs permission granted.";
  } else {
    setStatus("Permission denied.");
    permStatus.textContent = "Tabs permission denied.";
  }
});

// Auto-start capture after save+consent

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "CAPTURE_STATUS") {
    setStatus(msg.message);
  }
});

restore();
