# 와악어 (Lockdile) 🐊

> Step away without locking your Mac, and a crocodile lunges at the intruder's cursor — then locks the screen for you.

A tiny menu‑bar app that turns "I forgot to lock my screen" into a habit. Arm it when you leave your desk; if anyone touches the keyboard, a crocodile chomps the cursor and locks the Mac. Move the mouse all you want — only **typing** triggers it.

Built with [Tauri](https://tauri.app) (Rust core + web UI).

## Features

- 🐊 Menu‑bar app (no Dock icon), stays running in the background
- ⌨️ Global keyboard detection via macOS `CGEventTap`
- 🛡️ Guard mode toggle with a global shortcut (default `⌃⌥G`) and a grace period
- 🎯 Crocodile lunges to the **intruder's cursor position**, then locks the screen
- 🔒 Auto‑disarms after locking (no re‑lock loop)
- 🖱️ Mouse is ignored — only plain key presses trigger; `⌃`/`⌥`/`⌘` combos are reserved for the owner to disarm safely
- ⚙️ Settings: rebind the shortcut, grace time, bite duration, launch‑at‑login

## Install

Download the latest `.dmg` from the [Releases page](https://github.com/Jihye2ee/lockdile/releases/latest).

> **First launch:** the app is signed for development, not notarized yet, so macOS Gatekeeper will warn you.
> Right‑click the app → **Open** → **Open**, or run:
> ```sh
> xattr -dr com.apple.quarantine /Applications/lockdile.app
> ```

### Required permissions

System Settings → Privacy & Security →
- **Accessibility**
- **Input Monitoring**

Enable `lockdile` in both, then relaunch the app.

## Usage

1. Click the menu‑bar 🐊 (or press `⌃⌥G`) to **arm**.
2. After the grace period it shows 🐊🛡️ (armed).
3. If anyone types, the crocodile strikes and the screen locks.
4. Coming back? Press `⌃⌥G` or use the menu — modifier combos and the mouse never trigger the bite.

## Build from source

Requires Rust + [Bun](https://bun.sh).

```sh
bun install
bun run tauri dev      # run in development
PATH=/usr/bin:$PATH bun run tauri build --bundles dmg   # build a .dmg
```

> The `PATH=/usr/bin` prefix avoids a `pyenv` `xattr` shim shadowing macOS's `/usr/bin/xattr` during bundling.

## License

MIT
