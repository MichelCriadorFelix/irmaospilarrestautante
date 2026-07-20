/**
 * Audio notification utility using pure Web Audio API synthesizer.
 * This guarantees loud, clear, instant, and cross-platform notification chimes 
 * without relying on static file hosting or assets.
 */
export function playNotificationSound(type: 'new_order' | 'new_message' | 'status_change') {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    if (type === 'new_order') {
      // Ascending triple-note triumphant chime for a new order
      const now = ctx.currentTime;
      
      // Note 1: C5
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.6, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Note 2: E5
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.15);
      gain2.gain.setValueAtTime(0.6, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.15 + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.15 + 0.4);

      // Note 3: G5 (Loudest and holds longest)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(783.99, now + 0.3);
      gain3.gain.setValueAtTime(0.8, now + 0.3);
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.3 + 0.65);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.3);
      osc3.stop(now + 0.3 + 0.7);

    } else if (type === 'new_message') {
      // Friendly, snappy bubble pop or crisp double beep for a new message
      const now = ctx.currentTime;
      
      // Tap 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(600, now);
      osc1.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
      gain1.gain.setValueAtTime(0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Tap 2 (rapid offset)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(800, now + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.08 + 0.1);
      gain2.gain.setValueAtTime(0.5, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.08 + 0.15);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.08 + 0.2);

    } else if (type === 'status_change') {
      // Elegant success slide-up chime for a status progression
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.25); // slide to A5
      
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (err) {
    console.error('Failed to play synthesized notification sound', err);
  }
}
