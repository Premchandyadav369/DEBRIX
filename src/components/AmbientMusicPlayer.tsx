import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Music, ChevronUp, ChevronDown, Pause, Play } from "lucide-react";

type Track = { name: string; category: string; create: (ctx: AudioContext, master: GainNode) => (() => void) };

/* ── Audio building blocks ────────────────────────────────── */

function createDrone(ctx: AudioContext, master: GainNode, freq: number, detune: number, vol: number) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc1.type = "sine"; osc1.frequency.value = freq;
  osc2.type = "sine"; osc2.frequency.value = freq + detune;
  filter.type = "lowpass"; filter.frequency.value = 800; filter.Q.value = 1;
  gain.gain.value = 0; gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 4);
  osc1.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(master);
  osc1.start(); osc2.start();
  const sweep = () => {
    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(1200, now + 15);
    filter.frequency.linearRampToValueAtTime(400, now + 30);
  };
  sweep();
  const sweepInterval = setInterval(sweep, 30000);
  return () => { clearInterval(sweepInterval); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2); setTimeout(() => { osc1.stop(); osc2.stop(); }, 2500); };
}

function createPad(ctx: AudioContext, master: GainNode, notes: number[], vol: number) {
  const stops: (() => void)[] = [];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain(); const filter = ctx.createBiquadFilter();
    osc.type = "triangle"; osc.frequency.value = freq;
    filter.type = "lowpass"; filter.frequency.value = 600 + i * 100;
    gain.gain.value = 0; gain.gain.linearRampToValueAtTime(vol / notes.length, ctx.currentTime + 3 + i * 0.5);
    osc.connect(filter); filter.connect(gain); gain.connect(master); osc.start();
    stops.push(() => { gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2); setTimeout(() => osc.stop(), 2500); });
  });
  return () => stops.forEach((s) => s());
}

function createNoise(ctx: AudioContext, master: GainNode, vol: number) {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  const source = ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
  const filter = ctx.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.value = 200; filter.Q.value = 0.5;
  const gain = ctx.createGain(); gain.gain.value = 0; gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 5);
  source.connect(filter); filter.connect(gain); gain.connect(master); source.start();
  const wander = setInterval(() => { filter.frequency.linearRampToValueAtTime(100 + Math.random() * 400, ctx.currentTime + 8); }, 8000);
  return () => { clearInterval(wander); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2); setTimeout(() => source.stop(), 2500); };
}

function createPulse(ctx: AudioContext, master: GainNode, freq: number, interval: number, vol: number) {
  const osc = ctx.createOscillator(); const gain = ctx.createGain(); const filter = ctx.createBiquadFilter();
  osc.type = "sine"; osc.frequency.value = freq; filter.type = "lowpass"; filter.frequency.value = 1000; gain.gain.value = 0;
  osc.connect(filter); filter.connect(gain); gain.connect(master); osc.start();
  const pulse = setInterval(() => {
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(vol, now + 0.3); gain.gain.linearRampToValueAtTime(0, now + interval * 0.8);
  }, interval * 1000);
  return () => { clearInterval(pulse); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1); setTimeout(() => osc.stop(), 1500); };
}

/* ── Reverb utility ───────────────────────────────────────── */
function createReverb(ctx: AudioContext, duration: number, decay: number) {
  const len = ctx.sampleRate * duration;
  const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  const conv = ctx.createConvolver(); conv.buffer = impulse;
  return conv;
}

/* ── Cinematic track builders ──────────────────────────────── */

function createCinematicPad(ctx: AudioContext, master: GainNode, freqs: number[], vol: number, filterFreq: number) {
  const reverb = createReverb(ctx, 4, 2.5);
  const reverbGain = ctx.createGain(); reverbGain.gain.value = 0.3;
  reverb.connect(reverbGain); reverbGain.connect(master);
  const stops: (() => void)[] = [];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain(); const filter = ctx.createBiquadFilter();
    osc.type = i % 2 === 0 ? "sine" : "triangle"; osc.frequency.value = freq;
    filter.type = "lowpass"; filter.frequency.value = filterFreq;
    gain.gain.value = 0; gain.gain.linearRampToValueAtTime(vol / freqs.length, ctx.currentTime + 5 + i * 0.8);
    osc.connect(filter); filter.connect(gain);
    gain.connect(master); gain.connect(reverb);
    osc.start();
    // Slow detune drift for richness
    const drift = setInterval(() => {
      osc.detune.linearRampToValueAtTime((Math.random() - 0.5) * 15, ctx.currentTime + 6);
    }, 6000);
    stops.push(() => { clearInterval(drift); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3); setTimeout(() => osc.stop(), 3500); });
  });
  return () => stops.forEach(s => s());
}

function createSubBass(ctx: AudioContext, master: GainNode, freq: number, vol: number) {
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.type = "sine"; osc.frequency.value = freq;
  gain.gain.value = 0; gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 6);
  osc.connect(gain); gain.connect(master); osc.start();
  const swell = setInterval(() => {
    const now = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(vol * 0.5, now + 10);
    gain.gain.linearRampToValueAtTime(vol, now + 20);
  }, 20000);
  return () => { clearInterval(swell); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3); setTimeout(() => osc.stop(), 3500); };
}

function createShimmer(ctx: AudioContext, master: GainNode, baseFreq: number, vol: number) {
  const reverb = createReverb(ctx, 5, 3);
  const reverbGain = ctx.createGain(); reverbGain.gain.value = 0.5;
  reverb.connect(reverbGain); reverbGain.connect(master);
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.type = "sine"; osc.frequency.value = baseFreq;
  gain.gain.value = 0;
  osc.connect(gain); gain.connect(reverb);
  osc.start();
  const shimmer = setInterval(() => {
    const now = ctx.currentTime;
    const note = baseFreq * (1 + Math.floor(Math.random() * 5) * 0.5);
    osc.frequency.linearRampToValueAtTime(note, now + 0.5);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.8);
    gain.gain.linearRampToValueAtTime(0, now + 4);
  }, 5000);
  return () => { clearInterval(shimmer); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2); setTimeout(() => osc.stop(), 2500); };
}

function createWindNoise(ctx: AudioContext, master: GainNode, vol: number) {
  const bufferSize = ctx.sampleRate * 6;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  const source = ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
  const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 300; filter.Q.value = 0.3;
  const gain = ctx.createGain(); gain.gain.value = 0; gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 8);
  source.connect(filter); filter.connect(gain); gain.connect(master); source.start();
  const wander = setInterval(() => {
    filter.frequency.linearRampToValueAtTime(150 + Math.random() * 350, ctx.currentTime + 10);
  }, 10000);
  return () => { clearInterval(wander); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3); setTimeout(() => source.stop(), 3500); };
}

/* ── Track definitions ────────────────────────────────────── */

const TRACKS: Track[] = [
  // Original procedural
  {
    name: "Deep Space Drift",
    category: "Procedural",
    create: (ctx, master) => {
      const s1 = createDrone(ctx, master, 55, 0.5, 0.15);
      const s2 = createDrone(ctx, master, 82.5, 0.3, 0.1);
      const s3 = createPad(ctx, master, [110, 164.81, 220, 329.63], 0.12);
      const s4 = createNoise(ctx, master, 0.03);
      const s5 = createPulse(ctx, master, 440, 8, 0.04);
      return () => { s1(); s2(); s3(); s4(); s5(); };
    },
  },
  {
    name: "Orbital Station",
    category: "Procedural",
    create: (ctx, master) => {
      const s1 = createDrone(ctx, master, 73.42, 0.7, 0.12);
      const s2 = createPad(ctx, master, [146.83, 185, 220, 277.18], 0.1);
      const s3 = createNoise(ctx, master, 0.04);
      const s4 = createPulse(ctx, master, 587.33, 6, 0.03);
      const s5 = createPulse(ctx, master, 293.66, 12, 0.025);
      return () => { s1(); s2(); s3(); s4(); s5(); };
    },
  },
  {
    name: "Nebula Whisper",
    category: "Procedural",
    create: (ctx, master) => {
      const s1 = createDrone(ctx, master, 41.2, 0.2, 0.18);
      const s2 = createDrone(ctx, master, 61.74, 0.4, 0.12);
      const s3 = createPad(ctx, master, [123.47, 155.56, 185, 246.94], 0.08);
      const s4 = createNoise(ctx, master, 0.025);
      return () => { s1(); s2(); s3(); s4(); };
    },
  },
  {
    name: "Solar Wind",
    category: "Procedural",
    create: (ctx, master) => {
      const s1 = createNoise(ctx, master, 0.06);
      const s2 = createDrone(ctx, master, 98, 1.2, 0.1);
      const s3 = createPulse(ctx, master, 196, 4, 0.05);
      const s4 = createPad(ctx, master, [196, 246.94, 293.66, 392], 0.07);
      return () => { s1(); s2(); s3(); s4(); };
    },
  },
  // Cinematic
  {
    name: "Interstellar Reverie",
    category: "Cinematic",
    create: (ctx, master) => {
      const s1 = createSubBass(ctx, master, 36, 0.12);
      const s2 = createCinematicPad(ctx, master, [73.42, 110, 146.83, 220, 329.63], 0.1, 500);
      const s3 = createShimmer(ctx, master, 880, 0.04);
      const s4 = createWindNoise(ctx, master, 0.03);
      return () => { s1(); s2(); s3(); s4(); };
    },
  },
  {
    name: "Event Horizon",
    category: "Cinematic",
    create: (ctx, master) => {
      const s1 = createSubBass(ctx, master, 27.5, 0.15);
      const s2 = createCinematicPad(ctx, master, [55, 82.41, 110, 164.81, 246.94], 0.08, 400);
      const s3 = createDrone(ctx, master, 55, 0.8, 0.06);
      const s4 = createNoise(ctx, master, 0.02);
      const s5 = createShimmer(ctx, master, 1318.5, 0.03);
      return () => { s1(); s2(); s3(); s4(); s5(); };
    },
  },
  {
    name: "Voyager's Dream",
    category: "Cinematic",
    create: (ctx, master) => {
      const s1 = createSubBass(ctx, master, 41.2, 0.1);
      const s2 = createCinematicPad(ctx, master, [82.41, 123.47, 164.81, 246.94, 329.63, 493.88], 0.07, 700);
      const s3 = createWindNoise(ctx, master, 0.035);
      const s4 = createShimmer(ctx, master, 659.25, 0.035);
      const s5 = createPulse(ctx, master, 329.63, 10, 0.02);
      return () => { s1(); s2(); s3(); s4(); s5(); };
    },
  },
  {
    name: "Lunar Silence",
    category: "Cinematic",
    create: (ctx, master) => {
      const s1 = createCinematicPad(ctx, master, [65.41, 98, 130.81, 196], 0.09, 350);
      const s2 = createSubBass(ctx, master, 32.7, 0.1);
      const s3 = createWindNoise(ctx, master, 0.02);
      const s4 = createShimmer(ctx, master, 523.25, 0.03);
      return () => { s1(); s2(); s3(); s4(); };
    },
  },
  // Additional procedural
  {
    name: "Magnetosphere",
    category: "Procedural",
    create: (ctx, master) => {
      const s1 = createDrone(ctx, master, 65.41, 0.6, 0.13);
      const s2 = createPad(ctx, master, [130.81, 196, 261.63, 392], 0.09);
      const s3 = createPulse(ctx, master, 523.25, 5, 0.035);
      const s4 = createNoise(ctx, master, 0.035);
      return () => { s1(); s2(); s3(); s4(); };
    },
  },
  {
    name: "Pulsar Beacon",
    category: "Procedural",
    create: (ctx, master) => {
      const s1 = createDrone(ctx, master, 49, 0.3, 0.14);
      const s2 = createPulse(ctx, master, 880, 2, 0.04);
      const s3 = createPulse(ctx, master, 1320, 3.5, 0.025);
      const s4 = createPad(ctx, master, [98, 146.83, 196, 246.94], 0.07);
      return () => { s1(); s2(); s3(); s4(); };
    },
  },
  // Additional cinematic
  {
    name: "Black Hole Resonance",
    category: "Cinematic",
    create: (ctx, master) => {
      const s1 = createSubBass(ctx, master, 24.5, 0.16);
      const s2 = createCinematicPad(ctx, master, [49, 73.42, 98, 146.83, 220], 0.09, 380);
      const s3 = createWindNoise(ctx, master, 0.04);
      const s4 = createShimmer(ctx, master, 440, 0.025);
      return () => { s1(); s2(); s3(); s4(); };
    },
  },
  {
    name: "Aurora Drift",
    category: "Cinematic",
    create: (ctx, master) => {
      const s1 = createSubBass(ctx, master, 38, 0.1);
      const s2 = createCinematicPad(ctx, master, [110, 164.81, 220, 277.18, 415.3, 554.37], 0.08, 800);
      const s3 = createShimmer(ctx, master, 1108.73, 0.045);
      const s4 = createWindNoise(ctx, master, 0.025);
      return () => { s1(); s2(); s3(); s4(); };
    },
  },
  {
    name: "Cosmic Cathedral",
    category: "Cinematic",
    create: (ctx, master) => {
      const s1 = createSubBass(ctx, master, 32.7, 0.14);
      const s2 = createCinematicPad(ctx, master, [98, 130.81, 196, 261.63, 392, 523.25], 0.085, 600);
      const s3 = createShimmer(ctx, master, 783.99, 0.04);
      const s4 = createDrone(ctx, master, 65.41, 0.5, 0.05);
      const s5 = createWindNoise(ctx, master, 0.022);
      return () => { s1(); s2(); s3(); s4(); s5(); };
    },
  },
  {
    name: "Mars Twilight",
    category: "Cinematic",
    create: (ctx, master) => {
      const s1 = createSubBass(ctx, master, 30, 0.12);
      const s2 = createCinematicPad(ctx, master, [60, 90, 120, 180, 240], 0.09, 450);
      const s3 = createWindNoise(ctx, master, 0.055);
      const s4 = createShimmer(ctx, master, 720, 0.03);
      return () => { s1(); s2(); s3(); s4(); };
    },
  },
];

/* ── Component ────────────────────────────────────────────── */

export default function AmbientMusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [trackIndex, setTrackIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const startTrack = useCallback((idx: number) => {
    stopRef.current?.();
    stopRef.current = null;
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    if (!masterRef.current || masterRef.current.context !== ctx) {
      masterRef.current = ctx.createGain();
      masterRef.current.connect(ctx.destination);
    }
    masterRef.current.gain.value = volume;
    stopRef.current = TRACKS[idx].create(ctx, masterRef.current);
  }, [volume]);

  const toggle = useCallback(() => {
    if (playing) {
      stopRef.current?.();
      stopRef.current = null;
      setPlaying(false);
    } else {
      startTrack(trackIndex);
      setPlaying(true);
    }
  }, [playing, trackIndex, startTrack]);

  const switchTrack = useCallback((dir: 1 | -1) => {
    const next = (trackIndex + dir + TRACKS.length) % TRACKS.length;
    setTrackIndex(next);
    if (playing) startTrack(next);
  }, [trackIndex, playing, startTrack]);

  useEffect(() => {
    if (masterRef.current) masterRef.current.gain.value = volume;
  }, [volume]);

  useEffect(() => () => { stopRef.current?.(); }, []);

  const track = TRACKS[trackIndex];

  return (
    <div className="fixed bottom-20 left-4 z-50">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="mb-2 glass-card p-4 w-60 space-y-3"
          >
            <p className="font-display text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Space Audio</p>

            {/* Category badge */}
            <div className="flex items-center justify-center">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-display tracking-wider ${
                track.category === "Cinematic" ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary"
              }`}>
                {track.category}
              </span>
            </div>

            {/* Track name + nav */}
            <div className="flex items-center justify-between">
              <button aria-label="Previous track" onClick={() => switchTrack(-1)} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-display text-foreground text-center flex-1 truncate">{track.name}</span>
              <button aria-label="Next track" onClick={() => switchTrack(1)} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Track counter */}
            <div className="flex justify-center gap-1">
              {TRACKS.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Select track ${i + 1}`}
                  onClick={() => { setTrackIndex(i); if (playing) startTrack(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === trackIndex ? "bg-primary scale-125" : "bg-border hover:bg-muted-foreground"
                  }`}
                />
              ))}
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-2">
              <VolumeX className="w-3 h-3 text-muted-foreground shrink-0" />
              <input
                type="range"
                min={0} max={1} step={0.01} value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 appearance-none bg-secondary/60 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
              <Volume2 className="w-3 h-3 text-muted-foreground shrink-0" />
            </div>

            {/* Visualizer bars */}
            {playing && (
              <div className="flex items-end justify-center gap-0.5 h-4">
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-0.5 rounded-full ${track.category === "Cinematic" ? "bg-accent/60" : "bg-primary/60"}`}
                    animate={{ height: [3, 6 + Math.random() * 10, 3] }}
                    transition={{ duration: 1 + Math.random() * 0.8, repeat: Infinity, delay: i * 0.06 }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle buttons */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setExpanded(!expanded)}
          className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-muted-foreground hover:text-primary transition-colors border border-border"
        >
          <Music className="w-4 h-4" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={toggle}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border ${
            playing ? "bg-primary/20 text-primary border-primary/40" : "glass-card text-muted-foreground hover:text-primary border-border"
          }`}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </motion.button>
      </div>
    </div>
  );
}
