# AMVerge After Effects CEP Extension (Quick Guide)

## 1) Where to place the extension

Put the full `AMVerge` folder in one of these CEP extension directories.

Windows (current user):
- `%APPDATA%\\Adobe\\CEP\\extensions\\AMVerge`

Windows (all users):
- `C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions\\AMVerge`

macOS (current user):
- `~/Library/Application Support/Adobe/CEP/extensions/AMVerge`

macOS (all users):
- `/Library/Application Support/Adobe/CEP/extensions/AMVerge`

This repo is already in the correct Windows user path when located at:
- `C:\\Users\\<you>\\AppData\\Roaming\\Adobe\\CEP\\extensions\\AMVerge`

## 2) Build required files

From `frontend/`:

```bash
npm install
npm run build:cep
```

This builds:
- Rust CEP server binary in `bin/`
- Panel UI in `client/app/`

## 3) Files AE needs at runtime

Required:
- `CSXS/manifest.xml`
- `host/index.jsx`
- `client/app/index.html`
- `client/app/assets/*`
- `bin/amverge_cep_server.exe` (Windows)

## 4) How it works (fast)

- After Effects reads `CSXS/manifest.xml`.
- Panel UI entry point is `./client/app/index.html`.
- Host JSX entry point is `./host/index.jsx`.
- Frontend bridge (compiled from `frontend/src/platform/api.ts`) runs CEP commands.
- Local Rust server `bin/amverge_cep_server.exe` handles backend work on `127.0.0.1:38947`.
- Import to AE uses host call `$.amverge.importMediaIntoAfterEffects(...)`.

## 5) Open in After Effects

1. Open After Effects.
2. Go to `Window > Extensions > AMVerge`.
3. Use panel normally (import, preview, export).

## 6) If panel does not appear

Enable CEP debug mode for your CSXS major version by setting:
- Registry path: `HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.<version>`
- String value: `PlayerDebugMode = 1`

Common versions to set on Windows:
- `CSXS.9`
- `CSXS.10`
- `CSXS.11`
- `CSXS.12`

Then fully restart After Effects.
