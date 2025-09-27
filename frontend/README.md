# Alloy Mission Chrome Extension (MV3)

Collects user info, requests screenshot permission, captures visible tab screenshots periodically, and uploads to your backend.

## Install in Chrome

1. Open chrome://extensions
2. Enable Developer mode (top-right)
3. Click "Load unpacked" and select this folder: `/home/ali/projects/alloyMission`

## Configure Backend

- Backend URL is hardcoded in `frontend/config.js` as `http://localhost:4000` by default.
- Backend should expose `POST /api/capture` accepting JSON:

```
{
  "name": "...",
  "email": "...",
  "managerEmail": "...",
  "tabTitle": "...",
  "tabUrl": "...",
  "capturedAt": "2025-01-01T00:00:00.000Z",
  "imageBase64": "data:image/png;base64,iVBORw0..."
}
```

## Usage

1. Start the backend (see below). Make sure it matches the URL in `frontend/config.js`.
2. Click the extension icon → fill Name, Email, Manager Email, and check consent.
3. Click "Request Screenshot Permission" and grant it.
4. After saving with consent, capture starts automatically every 10 seconds in background.

## Notes

- Uses optional `tabs` permission requested at runtime.
- Captures only the currently visible tab of the current window.
- Images are sent as data URLs in JSON; convert and store on the server.

## Backend (Express)

- Location: `backend/`
- Install deps:

```bash
cd /home/ali/projects/alloyMission/backend && npm install
```

- Run:

```bash
npm run start
```

- Health check: `GET http://localhost:4000/health`
- Endpoints:
  - `POST /api/user` → { name, email, managerEmail }
  - `POST /api/capture` → screenshot payload (data URL)

Data saved under `backend/data/` (users.json and screenshots/).

## Backend (Express)

- Location: `server/`
- Install deps:

```bash
cd /home/ali/projects/alloyMission/server && npm install
```

- Run:

```bash
npm run start
```

- Health check: `GET http://localhost:4000/health`
- Endpoints:
  - `POST /api/user` → { name, email, managerEmail }
  - `POST /api/capture` → screenshot payload (data URL)

Data saved under `server/data/` (users.json and screenshots/).

## Development

- Background: `background.js`
- Popup: `popup/popup.html`, `popup/popup.js`
- Manifest: `manifest.json`
