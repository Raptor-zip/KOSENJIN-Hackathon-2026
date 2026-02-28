import { useRef, useCallback } from 'react';

export function useAlarm() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const unlockAudio = useCallback(() => {
    const ctx = new AudioContext();
    // Play a silent buffer to unlock AudioContext on iOS/Android
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    audioCtxRef.current = ctx;
  }, []);

  const startAlarm = useCallback(() => {
    let ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'closed') {
      ctx = new AudioContext();
      audioCtxRef.current = ctx;
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Stop any existing oscillator
    try { oscillatorRef.current?.stop(); } catch { /* ignore */ }

    const gain = ctx.createGain();
    gain.gain.value = 0.6;
    gain.connect(ctx.destination);
    gainRef.current = gain;

    // Create an aggressive buzzer pattern
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 880;
    osc.connect(gain);
    osc.start();
    oscillatorRef.current = osc;

    // Modulate frequency for urgency
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 8; // 8Hz modulation
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();
  }, []);

  const stopAlarm = useCallback(() => {
    try { oscillatorRef.current?.stop(); } catch { /* ignore */ }
    oscillatorRef.current = null;
    gainRef.current = null;
  }, []);

  return { unlockAudio, startAlarm, stopAlarm };
}
