const { invoke } = window.__TAURI__.core;

const MOD_SYMBOL = {
  control: "⌃",
  ctrl: "⌃",
  alt: "⌥",
  option: "⌥",
  shift: "⇧",
  super: "⌘",
  meta: "⌘",
  command: "⌘",
  cmd: "⌘",
};

const PURE_MODS = [
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "ShiftLeft",
  "ShiftRight",
  "MetaLeft",
  "MetaRight",
];

function human(shortcut) {
  return shortcut
    .split("+")
    .map((tok) => MOD_SYMBOL[tok.toLowerCase()] || tok.replace(/^Key/, "").replace(/^Digit/, ""))
    .join("");
}

let hotkeyStr = "control+alt+KeyG";
let capturing = false;

window.addEventListener("DOMContentLoaded", () => {
  const hkBtn = document.getElementById("hotkey");
  const graceEl = document.getElementById("grace");
  const biteEl = document.getElementById("bite");
  const autostartEl = document.getElementById("autostart");
  const statusEl = document.getElementById("status");

  function clearStatus() {
    statusEl.textContent = "";
  }

  async function loadSettings() {
    capturing = false;
    hkBtn.classList.remove("capturing");
    clearStatus();
    try {
      const s = await invoke("get_settings");
      hotkeyStr = s.hotkey;
      graceEl.value = s.graceSecs;
      biteEl.value = s.biteMs;
      autostartEl.checked = !!s.startAtLogin;
      hkBtn.textContent = human(hotkeyStr);
    } catch (_) {}
  }

  loadSettings();
  window.addEventListener("focus", loadSettings);

  hkBtn.addEventListener("click", () => {
    capturing = true;
    hkBtn.classList.add("capturing");
    hkBtn.textContent = "키 입력…";
  });

  window.addEventListener("keydown", (e) => {
    if (!capturing) return;
    e.preventDefault();
    if (PURE_MODS.includes(e.code)) return;

    const mods = [];
    if (e.ctrlKey) mods.push("control");
    if (e.altKey) mods.push("alt");
    if (e.shiftKey) mods.push("shift");
    if (e.metaKey) mods.push("super");

    hotkeyStr = [...mods, e.code].join("+");
    hkBtn.textContent = human(hotkeyStr);
    hkBtn.classList.remove("capturing");
    capturing = false;
  });

  document.getElementById("save").addEventListener("click", async () => {
    const settings = {
      hotkey: hotkeyStr,
      graceSecs: parseInt(graceEl.value, 10) || 3,
      biteMs: parseInt(biteEl.value, 10) || 2600,
      startAtLogin: autostartEl.checked,
    };
    try {
      await invoke("save_settings", { settings });
      statusEl.style.color = "#30d158";
      statusEl.textContent = "저장됨 ✅";
      setTimeout(clearStatus, 2500);
    } catch (err) {
      statusEl.style.color = "#ff453a";
      statusEl.textContent = "오류: " + err;
    }
  });
});
