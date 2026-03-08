import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Music, ChevronUp, ChevronDown } from "lucide-react";

type Track = { name: string; create: (ctx: AudioContext, master: GainNode) => (() => void) };

/* ── Procedural ambient generators ────────────────────────── */

function createDrone(ctx: AudioContext, master: GainNode, freq: number, detune: number, vol: number) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc1.type = "sine";
  osc1.frequency.value = freq;
  osc2.type = "sine";
  osc2.frequency.value = freq + detune;

  filter.type = "lowpass";
  filter.frequency.value = 800;
  filter.Q.value = 1;

  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 4);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  osc1.start();
  osc2.start();

  // Slow filter sweep
  const sweep = () => {
    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(1200, now + 15);
    filter.frequency.linearRampToValueAtTime(400, now + 30);
  };
  sweep();
  const sweepInterval = setInterval(sweep, 30000);

  return () => {
    clearInterval(sweepInterval);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
    setTimeout(() => { osc1.stop(); osc2.stop(); }, 2500);
  };
}

function createPad(ctx: AudioContext, master: GainNode, notes: number[], vol: number) {
  const stops: (() => void)[] = [];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.value = freq;

    filter.type = "lowpass";
    filter.frequency.value = 600 + i * 100;

    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(vol / notes.length, ctx.currentTime + 3 + i * 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();

    stops.push(() => {
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
      setTimeout(() => osc.stop(), 2500);
    });
  });

  return () => stops.forEach((s) => s());
}

function createNoise(ctx: AudioContext, master: GainNode, vol: number) {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 200;
  filter.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 5);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start();

  // Wander the filter
  const wander = setInterval(() => {
    filter.frequency.linearRampToValueAtTime(100 + Math.random() * 400, ctx.currentTime + 8);
  }, 8000);

  return () => {
    clearInterval(wander);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
    setTimeout(() => source.stop(), 2500);
  };
}

function createPulse(ctx: AudioContext, master: GainNode, freq: number, interval: number, vol: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "sine";
  osc.frequency.value = freq;
  filter.type = "lowpass";
  filter.frequency.value = 1000;
  gain.gain.value = 0;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc.start();

  const pulse = setInterval(() => {
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.3);
    gain.gain.linearRampToValueAtTime(0, now + interval * 0.8);
  }, interval * 1000);

  return () => {
    clearInterval(pulse);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
    setTimeout(() => osc.stop(), 1500);
  };
}

/* ── Track definitions ────────────────────────────────────── */

const TRACKS: Track[] = [
  {
    name: "Deep Space Drift",
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
    create: (ctx, master) => {
      const s1 = createNoise(ctx, master, 0.06);
      const s2 = createDrone(ctx, master, 98, 1.2, 0.1);
      const s3 = createPulse(ctx, master, 196, 4, 0.05);
      const s4 = createPad(ctx, master, [196, 246.94, 293.66, 392], 0.07);
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
    // Stop previous
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

  // Update volume live
  useEffect(() => {
    if (masterRef.current) masterRef.current.gain.value = volume;
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => () => { stopRef.current?.(); }, []);

  return (
    <div className="fixed bottom-20 left-4 z-50">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="mb-2 glass-card p-4 w-56 space-y-3"
          >
            <p className="font-display text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Ambient Music</p>

            {/* Track name + nav */}
            <div className="flex items-center justify-between">
              <button onClick={() => switchTrack(-1)} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-display text-foreground text-center flex-1 truncate">{TRACKS[trackIndex].name}</span>
              <button onClick={() => switchTrack(1)} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-2">
              <VolumeX className="w-3 h-3 text-muted-foreground shrink-0" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 appearance-none bg-secondary/60 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
              <Volume2 className="w-3 h-3 text-muted-foreground shrink-0" />
            </div>

            {/* Visualizer bars */}
            {playing && (
              <div className="flex items-end justify-center gap-0.5 h-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full bg-primary/60"
                    animate={{ height: [4, 8 + Math.random() * 8, 4] }}
                    transition={{ duration: 0.8 + Math.random() * 0.6, repeat: Infinity, delay: i * 0.07 }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setExpanded(!expanded)}
          className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-muted-foreground hover:text-primary transition-colors border border-border"
        >
          <Music className="w-4 h-4" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggle}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border ${
            playing
              ? "bg-primary/20 text-primary border-primary/40"
              : "glass-card text-muted-foreground hover:text-primary border-border"
          }`}
        >
          {playing ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </motion.button>
      </div>
    </div>
  );
}
