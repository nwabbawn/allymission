import express from "express";
import cors from "cors";
import morgan from "morgan";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

const dataDir = join(__dirname, "..", "data");
const usersFile = join(dataDir, "users.json");
const shotsDir = join(dataDir, "screenshots");

function ensureDirs() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(shotsDir)) mkdirSync(shotsDir, { recursive: true });
  if (!existsSync(usersFile))
    writeFileSync(usersFile, JSON.stringify({}), "utf-8");
}

ensureDirs();

function loadUsers() {
  try {
    return JSON.parse(readFileSync(usersFile, "utf-8"));
  } catch {
    return {};
  }
}

function saveUsers(users) {
  writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Save or update user profile
app.post("/api/user", (req, res) => {
  console.log("user", req.body);
  const { name, email, managerEmail } = req.body || {};
  if (!name || !email || !managerEmail) {
    return res
      .status(400)
      .json({ error: "name, email, managerEmail are required" });
  }
  const users = loadUsers();
  users[email] = {
    name,
    email,
    managerEmail,
    updatedAt: new Date().toISOString(),
  };
  saveUsers(users);
  res.json({ ok: true, user: users[email] });
});

// Receive screenshot data URL and metadata
app.post("/api/capture", (req, res) => {
  const {
    name,
    email,
    managerEmail,
    tabTitle,
    tabUrl,
    capturedAt,
    imageBase64,
  } = req.body || {};
  if (!email || !imageBase64) {
    return res
      .status(400)
      .json({ error: "email and imageBase64 are required" });
  }
  const id = uuidv4();
  const ts = capturedAt || new Date().toISOString();
  // data:image/png;base64,XXXX
  const base64 = imageBase64.split(",")[1] || imageBase64;
  const filePath = join(shotsDir, `${id}.png`);
  try {
    writeFileSync(filePath, Buffer.from(base64, "base64"));
  } catch (e) {
    return res.status(500).json({ error: "Failed to save image" });
  }
  res.json({
    ok: true,
    id,
    savedAt: ts,
    file: filePath,
    tabTitle,
    tabUrl,
    name,
    email,
    managerEmail,
  });
});

app.listen(PORT, () => {
  console.log(`Alloy Mission backend listening on http://localhost:${PORT}`);
});
