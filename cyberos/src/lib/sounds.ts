/** Минимальный звук уведомления (без внешних файлов). */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return ctx;
}

export function playNotificationBeep() {
  const c = getCtx();
  if (!c) return;
  void c.resume().catch(() => {});
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.value = 880;
  g.gain.value = 0.08;
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + 0.12);
}
