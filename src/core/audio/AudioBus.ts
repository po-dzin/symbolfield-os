/**
 * AudioBus.js
 * Minimal audio layer for UI actions/events.
 */

import { eventBus, type BusEvent } from '../events/EventBus';

let audioContext: AudioContext | null = null;

const ensureContext = async () => {
    if (!audioContext) {
        const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        audioContext = new Ctx();
    }
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    return audioContext;
};

interface ChimeConfig {
    freq?: number;
    duration?: number;
    gain?: number;
    airy?: boolean;
}

const playChime = async ({ freq = 420, duration = 0.2, gain = 0.12, airy = false }: ChimeConfig = {}) => {
    const ctx = await ensureContext();
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscA.type = 'sine';
    oscB.type = 'triangle';
    oscA.frequency.value = freq;
    oscB.frequency.value = freq * 0.5;
    oscB.detune.value = -6;

    filter.type = 'lowpass';
    filter.frequency.value = airy ? 1200 : 2000;
    filter.Q.value = 0.8;

    const now = ctx.currentTime;
    const attack = airy ? 0.12 : 0.02;
    const release = airy ? duration : duration * 0.5;
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(amp).connect(ctx.destination);

    oscA.start(now);
    oscB.start(now);
    oscA.stop(now + attack + release + 0.1);
    oscB.stop(now + attack + release + 0.1);

    if (airy) {
        const bufferSize = ctx.sampleRate * 0.6;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i += 1) {
            data[i] = (Math.random() * 2 - 1) * 0.08;
        }
        const noise = ctx.createBufferSource();
        const noiseFilter = ctx.createBiquadFilter();
        noise.buffer = noiseBuffer;
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 900;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.0001, now);
        noiseGain.gain.exponentialRampToValueAtTime(gain * 0.4, now + attack);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);
        noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
        noise.start(now);
        noise.stop(now + attack + release + 0.1);
    }
};

export const initAudioBus = () => {
    if (typeof window === 'undefined') return () => {};
    const onSignal = (e: BusEvent<'UI_SIGNAL'>) => {
        if (e.payload?.type === 'OPEN_NODE' || e.payload?.type === 'ENTER_NOW') {
            playChime({ freq: 432, duration: 1.2, gain: 0.08, airy: true });
        }
    };

    const unsub = eventBus.on('UI_SIGNAL', onSignal);
    return () => {
        unsub();
    };
};
