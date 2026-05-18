/**
 * Tiny hook for chat sound effects.
 * Sounds are generated via Web Audio API (no external files needed).
 * Respects the stinkrz_sound localStorage setting.
 */
export function useChatSounds() {
  const isEnabled = () => localStorage.getItem("stinkrz_sound") !== "false";

  function playTone(freq, type, duration, gain = 0.18) {
    if (!isEnabled()) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, ctx.currentTime + duration);
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
      osc.onended = () => ctx.close();
    } catch (_) {}
  }

  // Short upward whoosh when you send
  const playSend = () => playTone(440, "sine", 0.12, 0.12);

  // Soft pop when you receive
  const playReceive = () => playTone(660, "sine", 0.09, 0.1);

  // Tiny tick for reaction
  const playReaction = () => playTone(880, "triangle", 0.07, 0.08);

  return { playSend, playReceive, playReaction };
}