const { listen } = window.__TAURI__.event;

const ROAR = { ko: "와아악!", en: "CHOMP!", ja: "ガブッ!", zh: "啊呜!" };

function roarText() {
  const lang = (navigator.language || "en").toLowerCase().split("-")[0];
  return ROAR[lang] || ROAR.en;
}

let overlay;
let audioCtx;

function roar() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.55);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.6, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.72);
  } catch (_) {}
}

function bite(pos) {
  const hasTarget = pos && typeof pos.x === "number" && pos.x >= 0;
  if (hasTarget) {
    overlay.style.setProperty("--cx", pos.x + "px");
    overlay.style.setProperty("--cy", pos.y + "px");
    overlay.classList.add("targeted");
  } else {
    overlay.style.setProperty("--cx", "50%");
    overlay.style.setProperty("--cy", "50%");
    overlay.classList.remove("targeted");
  }

  overlay.classList.remove("active");
  void overlay.offsetWidth;
  overlay.classList.add("active");
  roar();
}

window.addEventListener("DOMContentLoaded", () => {
  overlay = document.getElementById("overlay");
  document.getElementById("waak").textContent = roarText();
  listen("intruder", (event) => bite(event.payload));
});
