import type { CueKind, SoundCue } from './soundscape';

/**
 * Speelt soundscapes af met de Web Audio API. Alle geluiden worden live gesynthetiseerd:
 * geen audiobestanden, geen netwerk. Zonder Web Audio (of vóór een klik van de gebruiker) is het stil.
 */
export interface SoundPlayer {
  /** Aanroepen vanuit een klik of tik: browsers staan geluid pas toe na een gebruikersactie. */
  unlock(): void;
  play(cues: readonly SoundCue[]): void;
}

type Synth = (ctx: AudioContext, out: AudioNode, t: number, intensity: number) => void;

function envelope(ctx: AudioContext, out: AudioNode, t: number, peak: number, attack: number, decay: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  gain.connect(out);
  return gain;
}

function tone(ctx: AudioContext, out: AudioNode, t: number, opts: {
  type: OscillatorType; from: number; to?: number; peak: number; attack?: number; decay: number;
}): void {
  const osc = ctx.createOscillator();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.from, t);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + (opts.attack ?? 0.01) + opts.decay);
  osc.connect(envelope(ctx, out, t, opts.peak, opts.attack ?? 0.01, opts.decay));
  osc.start(t);
  osc.stop(t + (opts.attack ?? 0.01) + opts.decay + 0.05);
}

let noiseBuffer: AudioBuffer | undefined;

/** Ruis met een vaste startwaarde: elke keer exact dezelfde klank. */
function noise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer?.sampleRate === ctx.sampleRate) return noiseBuffer;
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 2412; // xorshift32
  for (let i = 0; i < data.length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    data[i] = ((seed >>> 0) / 4_294_967_296) * 2 - 1;
  }
  return (noiseBuffer = buffer);
}

function noiseBurst(ctx: AudioContext, out: AudioNode, t: number, opts: {
  filter: BiquadFilterType; from: number; to?: number; q?: number; peak: number; decay: number;
}): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = opts.filter;
  filter.Q.value = opts.q ?? 1;
  filter.frequency.setValueAtTime(opts.from, t);
  if (opts.to) filter.frequency.exponentialRampToValueAtTime(opts.to, t + opts.decay);
  src.connect(filter);
  filter.connect(envelope(ctx, out, t, opts.peak, 0.005, opts.decay));
  src.start(t);
  src.stop(t + opts.decay + 0.05);
}

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

const SYNTHS: Record<CueKind, Synth> = {
  // Arresleebelletjes plus een opgaand klokkenakkoord.
  jingle(ctx, out, t, i) {
    for (let k = 0; k < 6; k++) noiseBurst(ctx, out, t + k * 0.07, { filter: 'highpass', from: 7000, peak: 0.08, decay: 0.08 });
    [84, 88, 91, 96].forEach((n, k) =>
      tone(ctx, out, t + 0.05 + k * 0.08, { type: 'sine', from: midi(n), peak: 0.12 + 0.1 * i, decay: 0.7 }),
    );
  },
  // Lichtjes gaan uit: een klik en een wegzakkende zoem.
  'lights-off'(ctx, out, t, i) {
    noiseBurst(ctx, out, t, { filter: 'bandpass', from: 2500, q: 4, peak: 0.15, decay: 0.03 });
    tone(ctx, out, t + 0.03, { type: 'sawtooth', from: 420, to: 50, peak: 0.06 + 0.12 * i, decay: 0.35 + 0.5 * i });
  },
  // Plaat die stopt bij de ijsdisco.
  'rink-closed'(ctx, out, t, i) {
    noiseBurst(ctx, out, t, { filter: 'bandpass', from: 3000, to: 300, q: 6, peak: 0.2 + 0.2 * i, decay: 0.35 });
    tone(ctx, out, t + 0.1, { type: 'triangle', from: 180, to: 70, peak: 0.15 + 0.15 * i, decay: 0.4 + 0.4 * i });
  },
  // Laadpaal zegt "nee": twee dalende piepjes.
  'chargers-paused'(ctx, out, t, i) {
    tone(ctx, out, t, { type: 'square', from: 660, peak: 0.05 + 0.06 * i, decay: 0.12 });
    tone(ctx, out, t + 0.16, { type: 'square', from: 440, to: 330, peak: 0.05 + 0.06 * i, decay: 0.25 + 0.3 * i });
  },
  // Batterij levert: aanzwellende zoem.
  battery(ctx, out, t, i) {
    tone(ctx, out, t, { type: 'sine', from: 160, to: 520, peak: 0.12 * i + 0.05, attack: 0.25, decay: 0.3 });
    noiseBurst(ctx, out, t, { filter: 'lowpass', from: 400, to: 2000, peak: 0.05, decay: 0.5 });
  },
  // Extra laden: drie stijgende blipjes.
  'extra-charging'(ctx, out, t, i) {
    [72, 76, 79].forEach((n, k) => tone(ctx, out, t + k * 0.09, { type: 'square', from: midi(n), peak: 0.04 + 0.04 * i, decay: 0.08 }));
  },
  // Het dorp is tevreden: twinkelende pentatoniek.
  sparkle(ctx, out, t, i) {
    [91, 96, 93, 98, 100].forEach((n, k) => tone(ctx, out, t + k * 0.06, { type: 'sine', from: midi(n), peak: 0.05 + 0.07 * i, decay: 0.3 }));
  },
  // Het dorp moppert: een laag, dalend koor.
  groan(ctx, out, t, i) {
    [140, 151, 167].forEach((f) => tone(ctx, out, t, { type: 'sawtooth', from: f, to: f * 0.7, peak: 0.03 + 0.05 * i, attack: 0.15, decay: 0.8 }));
  },
  // Eerste regel van Jingle Bells (traditional).
  finale(ctx, out, t, i) {
    const notes: [number, number][] = [[76, 1], [76, 1], [76, 2], [76, 1], [76, 1], [76, 2], [76, 1], [79, 1], [72, 1.5], [74, 0.5], [76, 4]];
    let at = t;
    for (const [n, beats] of notes) {
      tone(ctx, out, at, { type: 'triangle', from: midi(n), peak: 0.1 + 0.08 * i, decay: Math.min(0.6, beats * 0.2) + 0.1 });
      at += beats * 0.2;
    }
    SYNTHS.jingle(ctx, out, at, i);
  },
};

export function createSoundPlayer(volume = 0.6): SoundPlayer {
  let ctx: AudioContext | undefined;
  let master: GainNode | undefined;

  return {
    unlock() {
      if (typeof AudioContext === 'undefined') return;
      if (!ctx) {
        ctx = new AudioContext();
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') void ctx.resume();
    },
    play(cues) {
      if (!ctx || !master || ctx.state !== 'running') return;
      const start = ctx.currentTime + 0.05;
      for (const cue of cues) SYNTHS[cue.kind](ctx, master, start + cue.atMs / 1000, cue.intensity);
    },
  };
}
