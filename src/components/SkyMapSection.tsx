import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Star, ZoomIn, ZoomOut, RotateCcw, Eye, Orbit, Sparkles, Moon } from "lucide-react";

interface StarData {
  name: string;
  ra: number;
  dec: number;
  mag: number;
  constellation?: string;
}

const STARS: StarData[] = [
  { name: "Sirius", ra: 6.75, dec: -16.72, mag: -1.46, constellation: "Canis Major" },
  { name: "Canopus", ra: 6.40, dec: -52.70, mag: -0.74, constellation: "Carina" },
  { name: "Arcturus", ra: 14.26, dec: 19.18, mag: -0.05, constellation: "Boötes" },
  { name: "Vega", ra: 18.62, dec: 38.78, mag: 0.03, constellation: "Lyra" },
  { name: "Capella", ra: 5.28, dec: 46.00, mag: 0.08, constellation: "Auriga" },
  { name: "Rigel", ra: 5.24, dec: -8.20, mag: 0.13, constellation: "Orion" },
  { name: "Procyon", ra: 7.65, dec: 5.22, mag: 0.34, constellation: "Canis Minor" },
  { name: "Betelgeuse", ra: 5.92, dec: 7.41, mag: 0.42, constellation: "Orion" },
  { name: "Altair", ra: 19.85, dec: 8.87, mag: 0.76, constellation: "Aquila" },
  { name: "Aldebaran", ra: 4.60, dec: 16.51, mag: 0.85, constellation: "Taurus" },
  { name: "Spica", ra: 13.42, dec: -11.16, mag: 0.97, constellation: "Virgo" },
  { name: "Antares", ra: 16.49, dec: -26.43, mag: 1.04, constellation: "Scorpius" },
  { name: "Pollux", ra: 7.76, dec: 28.03, mag: 1.14, constellation: "Gemini" },
  { name: "Fomalhaut", ra: 22.96, dec: -29.62, mag: 1.16, constellation: "Piscis Austrinus" },
  { name: "Deneb", ra: 20.69, dec: 45.28, mag: 1.25, constellation: "Cygnus" },
  { name: "Regulus", ra: 10.14, dec: 11.97, mag: 1.35, constellation: "Leo" },
  { name: "Castor", ra: 7.58, dec: 31.89, mag: 1.58, constellation: "Gemini" },
  { name: "Bellatrix", ra: 5.42, dec: 6.35, mag: 1.64, constellation: "Orion" },
  { name: "Alnilam", ra: 5.60, dec: -1.20, mag: 1.69, constellation: "Orion" },
  { name: "Alnitak", ra: 5.68, dec: -1.94, mag: 1.77, constellation: "Orion" },
  { name: "Mintaka", ra: 5.53, dec: -0.30, mag: 2.23, constellation: "Orion" },
  { name: "Saiph", ra: 5.80, dec: -9.67, mag: 2.06, constellation: "Orion" },
  { name: "Dubhe", ra: 11.06, dec: 61.75, mag: 1.79, constellation: "Ursa Major" },
  { name: "Merak", ra: 11.03, dec: 56.38, mag: 2.37, constellation: "Ursa Major" },
  { name: "Phecda", ra: 11.90, dec: 53.69, mag: 2.44, constellation: "Ursa Major" },
  { name: "Megrez", ra: 12.26, dec: 57.03, mag: 3.31, constellation: "Ursa Major" },
  { name: "Alioth", ra: 12.90, dec: 55.96, mag: 1.77, constellation: "Ursa Major" },
  { name: "Mizar", ra: 13.40, dec: 54.93, mag: 2.27, constellation: "Ursa Major" },
  { name: "Alkaid", ra: 13.79, dec: 49.31, mag: 1.86, constellation: "Ursa Major" },
  { name: "Polaris", ra: 2.53, dec: 89.26, mag: 2.02, constellation: "Ursa Minor" },
  { name: "Schedar", ra: 0.68, dec: 56.54, mag: 2.23, constellation: "Cassiopeia" },
  { name: "Caph", ra: 0.15, dec: 59.15, mag: 2.27, constellation: "Cassiopeia" },
  { name: "Navi", ra: 0.95, dec: 60.72, mag: 2.47, constellation: "Cassiopeia" },
  { name: "Ruchbah", ra: 1.43, dec: 60.24, mag: 2.68, constellation: "Cassiopeia" },
  { name: "Segin", ra: 1.91, dec: 63.67, mag: 3.37, constellation: "Cassiopeia" },
  { name: "Shaula", ra: 17.56, dec: -37.10, mag: 1.63, constellation: "Scorpius" },
  { name: "Sargas", ra: 17.62, dec: -43.00, mag: 1.87, constellation: "Scorpius" },
  { name: "Sadr", ra: 20.37, dec: 40.26, mag: 2.20, constellation: "Cygnus" },
  { name: "Albireo", ra: 19.51, dec: 27.96, mag: 3.08, constellation: "Cygnus" },
  { name: "Denebola", ra: 11.82, dec: 14.57, mag: 2.14, constellation: "Leo" },
  { name: "Algieba", ra: 10.33, dec: 19.84, mag: 2.28, constellation: "Leo" },
  { name: "Acrux", ra: 12.44, dec: -63.10, mag: 0.76, constellation: "Crux" },
  { name: "Mimosa", ra: 12.80, dec: -59.69, mag: 1.25, constellation: "Crux" },
  { name: "Gacrux", ra: 12.52, dec: -57.11, mag: 1.64, constellation: "Crux" },
  ...Array.from({ length: 240 }, () => ({
    name: "",
    ra: Math.random() * 24,
    dec: (Math.random() - 0.5) * 180,
    mag: 2.5 + Math.random() * 3.5,
  })),
];

const CONSTELLATIONS: { name: string; pairs: [number, number][]; color: string }[] = [
  { name: "Orion", pairs: [[5, 7], [7, 17], [17, 20], [20, 18], [18, 19], [5, 21], [17, 18]], color: "hsl(190, 85%, 55%)" },
  { name: "Big Dipper", pairs: [[22, 23], [23, 24], [24, 25], [25, 26], [26, 27], [27, 28]], color: "hsl(160, 70%, 50%)" },
  { name: "Cassiopeia", pairs: [[30, 31], [31, 32], [32, 33], [33, 34]], color: "hsl(45, 90%, 58%)" },
  { name: "Summer Triangle", pairs: [[3, 8], [8, 14], [14, 3]], color: "hsl(280, 70%, 65%)" },
  { name: "Southern Cross", pairs: [[41, 43], [42, 43]], color: "hsl(0, 70%, 60%)" },
];

// Approximate planet positions (RA hours / Dec deg) — mid-2026, ecliptic-locked
const PLANETS = [
  { name: "Mercury", ra: 8.4, dec: 18.2, color: "#c9c2b5", size: 3, mag: -0.5 },
  { name: "Venus", ra: 9.8, dec: 12.4, color: "#f5e6c8", size: 6, mag: -4.1 },
  { name: "Mars", ra: 13.2, dec: -8.5, color: "#e07a4a", size: 4, mag: 0.8 },
  { name: "Jupiter", ra: 6.9, dec: 22.8, color: "#e8c9a0", size: 7, mag: -2.2 },
  { name: "Saturn", ra: 23.6, dec: -4.2, color: "#d4c294", size: 5, mag: 0.6 },
];

// Meteor shower radiants (annual, fixed sky positions)
const METEOR_SHOWERS = [
  { name: "Perseids", ra: 3.2, dec: 58, peak: "Aug 12", zhr: 100 },
  { name: "Geminids", ra: 7.5, dec: 32, peak: "Dec 14", zhr: 150 },
  { name: "Quadrantids", ra: 15.3, dec: 49, peak: "Jan 3", zhr: 110 },
  { name: "Leonids", ra: 10.2, dec: 22, peak: "Nov 17", zhr: 15 },
  { name: "Orionids", ra: 6.3, dec: 16, peak: "Oct 21", zhr: 20 },
  { name: "Lyrids", ra: 18.1, dec: 34, peak: "Apr 22", zhr: 18 },
];

// Deep-sky objects
const DSO = [
  { name: "M31 Andromeda", ra: 0.71, dec: 41.27, mag: 3.4 },
  { name: "M42 Orion Neb.", ra: 5.59, dec: -5.39, mag: 4.0 },
  { name: "M45 Pleiades", ra: 3.79, dec: 24.11, mag: 1.6 },
  { name: "M13 Hercules GC", ra: 16.69, dec: 36.46, mag: 5.8 },
  { name: "M8 Lagoon Neb.", ra: 18.06, dec: -24.38, mag: 6.0 },
  { name: "M51 Whirlpool", ra: 13.5, dec: 47.2, mag: 8.4 },
];

// Presets to jump to
const PRESETS = [
  { name: "Orion", ra: 5.6, dec: -2 },
  { name: "Big Dipper", ra: 12.4, dec: 55 },
  { name: "Summer Tri.", ra: 19.5, dec: 32 },
  { name: "Scorpius", ra: 17, dec: -30 },
  { name: "Milky Way Core", ra: 17.75, dec: -28.9 },
  { name: "Polaris", ra: 2.5, dec: 85 },
];

function raDecToXY(ra: number, dec: number, centerRA: number, centerDec: number, scale: number, cx: number, cy: number): [number, number] {
  const raRad = ((ra - centerRA) * 15 * Math.PI) / 180;
  const decRad = (dec * Math.PI) / 180;
  const centerDecRad = (centerDec * Math.PI) / 180;
  const x = Math.cos(decRad) * Math.sin(raRad);
  const y = Math.sin(decRad) * Math.cos(centerDecRad) - Math.cos(decRad) * Math.cos(raRad) * Math.sin(centerDecRad);
  return [cx + x * scale, cy - y * scale];
}

// Moon phase (0=new, 0.5=full)
function moonPhase(date = new Date()) {
  const synodic = 29.530588853;
  const ref = Date.UTC(2000, 0, 6, 18, 14, 0);
  const days = (date.getTime() - ref) / 86400000;
  const phase = ((days % synodic) + synodic) % synodic / synodic;
  return phase;
}

const SkyMapSection = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [centerRA, setCenterRA] = useState(6);
  const [centerDec, setCenterDec] = useState(10);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState<{ name: string; info: string } | null>(null);
  const [showConstellations, setShowConstellations] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showPlanets, setShowPlanets] = useState(true);
  const [showMilkyWay, setShowMilkyWay] = useState(true);
  const [showMeteors, setShowMeteors] = useState(true);
  const [showDSO, setShowDSO] = useState(true);

  const phase = moonPhase();
  const phaseName =
    phase < 0.03 || phase > 0.97 ? "New Moon" :
    phase < 0.22 ? "Waxing Crescent" :
    phase < 0.28 ? "First Quarter" :
    phase < 0.47 ? "Waxing Gibbous" :
    phase < 0.53 ? "Full Moon" :
    phase < 0.72 ? "Waning Gibbous" :
    phase < 0.78 ? "Last Quarter" : "Waning Crescent";

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) * 0.42 * zoom;

    // Deep-space gradient background
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h));
    bg.addColorStop(0, "hsl(225, 45%, 8%)");
    bg.addColorStop(1, "hsl(225, 55%, 4%)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Milky Way band (approx galactic equator, ~62.9° tilt to celestial equator, node ~12.9h)
    if (showMilkyWay) {
      ctx.save();
      const galInc = 62.87 * Math.PI / 180;
      const nodeRA = 12.85;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const width = 0.35 - i * 0.1;
        let started = false;
        for (let l = 0; l <= 360; l += 2) {
          const lr = l * Math.PI / 180;
          const bOffset = (i - 1) * width * 0.5;
          // galactic (l,b) -> equatorial approximation
          const b = bOffset;
          const sinDec = Math.cos(b) * Math.cos(galInc) * Math.sin(lr) + Math.sin(b) * Math.sin(galInc);
          const dec = Math.asin(sinDec) * 180 / Math.PI;
          const y1 = Math.cos(b) * Math.cos(lr);
          const y2 = Math.cos(b) * Math.sin(galInc) * Math.sin(lr) * -1 + Math.sin(b) * Math.cos(galInc);
          const ra = ((Math.atan2(y2, y1) * 180 / Math.PI) / 15 + nodeRA + 24) % 24;
          const [x, y] = raDecToXY(ra, dec, centerRA, centerDec, scale, cx, cy);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(230, 60%, 65%, ${0.06 - i * 0.015})`;
        ctx.lineWidth = 60 - i * 15;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Grid
    ctx.strokeStyle = "hsla(220, 18%, 30%, 0.14)";
    ctx.lineWidth = 0.5;
    for (let ra = 0; ra < 24; ra += 2) {
      ctx.beginPath();
      for (let dec = -80; dec <= 80; dec += 2) {
        const [x, y] = raDecToXY(ra, dec, centerRA, centerDec, scale, cx, cy);
        if (dec === -80) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let dec = -60; dec <= 60; dec += 30) {
      ctx.beginPath();
      for (let ra = 0; ra <= 24; ra += 0.2) {
        const [x, y] = raDecToXY(ra, dec, centerRA, centerDec, scale, cx, cy);
        if (ra === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Celestial equator emphasized
    ctx.strokeStyle = "hsla(190, 60%, 50%, 0.2)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let ra = 0; ra <= 24; ra += 0.2) {
      const [x, y] = raDecToXY(ra, 0, centerRA, centerDec, scale, cx, cy);
      if (ra === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Ecliptic (approx sine wave, 23.44° tilt, node at RA=0)
    ctx.strokeStyle = "hsla(45, 80%, 55%, 0.35)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let ra = 0; ra <= 24; ra += 0.2) {
      const dec = 23.44 * Math.sin((ra / 24) * 2 * Math.PI);
      const [x, y] = raDecToXY(ra, dec, centerRA, centerDec, scale, cx, cy);
      if (ra === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Constellations
    if (showConstellations) {
      CONSTELLATIONS.forEach((c) => {
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = 0.55;
        c.pairs.forEach(([a, b]) => {
          if (a >= STARS.length || b >= STARS.length) return;
          const [x1, y1] = raDecToXY(STARS[a].ra, STARS[a].dec, centerRA, centerDec, scale, cx, cy);
          const [x2, y2] = raDecToXY(STARS[b].ra, STARS[b].dec, centerRA, centerDec, scale, cx, cy);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
        if (showLabels && c.pairs.length > 0) {
          const s = STARS[c.pairs[0][0]];
          const [lx, ly] = raDecToXY(s.ra, s.dec, centerRA, centerDec, scale, cx, cy);
          if (lx > 0 && lx < w && ly > 0 && ly < h) {
            ctx.fillStyle = c.color;
            ctx.font = "10px 'Space Grotesk', sans-serif";
            ctx.globalAlpha = 0.75;
            ctx.fillText(c.name.toUpperCase(), lx + 10, ly - 10);
            ctx.globalAlpha = 1;
          }
        }
      });
    }

    // Stars with color temperature
    STARS.forEach((star) => {
      const [x, y] = raDecToXY(star.ra, star.dec, centerRA, centerDec, scale, cx, cy);
      if (x < -50 || x > w + 50 || y < -50 || y > h + 50) return;
      const size = Math.max(0.5, (4 - star.mag) * 0.85 * Math.sqrt(zoom));
      const brightness = Math.min(1, Math.max(0.25, (4.2 - star.mag) / 5));
      // color by magnitude (brightest = blue-white, dim = warm)
      const hue = star.mag < 0 ? 210 : star.mag < 1 ? 200 : star.mag < 2 ? 40 : 30;
      if (star.mag < 1.8) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, size * 5);
        g.addColorStop(0, `hsla(${hue}, 85%, 82%, ${brightness * 0.35})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, size * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `hsla(${hue}, 60%, ${85 - star.mag * 5}%, ${brightness})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      if (showLabels && star.name && star.mag < 1.8) {
        ctx.fillStyle = `hsla(210, 25%, 78%, ${brightness * 0.85})`;
        ctx.font = `${Math.max(9, 10.5 * Math.sqrt(zoom))}px 'Space Grotesk', sans-serif`;
        ctx.fillText(star.name, x + size + 4, y + 3);
      }
    });

    // Deep-sky objects
    if (showDSO) {
      DSO.forEach((d) => {
        const [x, y] = raDecToXY(d.ra, d.dec, centerRA, centerDec, scale, cx, cy);
        if (x < 0 || x > w || y < 0 || y > h) return;
        ctx.strokeStyle = "hsl(280, 70%, 70%)";
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.stroke();
        // small cross
        ctx.beginPath();
        ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y);
        ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3);
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (showLabels) {
          ctx.fillStyle = "hsla(280, 60%, 78%, 0.85)";
          ctx.font = "9px 'JetBrains Mono', monospace";
          ctx.fillText(d.name, x + 12, y - 8);
        }
      });
    }

    // Planets
    if (showPlanets) {
      PLANETS.forEach((p) => {
        const [x, y] = raDecToXY(p.ra, p.dec, centerRA, centerDec, scale, cx, cy);
        if (x < 0 || x > w || y < 0 || y > h) return;
        const r = p.size * Math.sqrt(zoom);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        g.addColorStop(0, p.color);
        g.addColorStop(0.4, p.color + "cc");
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        // Ring for Saturn
        if (p.name === "Saturn") {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.ellipse(x, y, r * 2, r * 0.6, -0.3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (showLabels) {
          ctx.fillStyle = p.color;
          ctx.font = "bold 10px 'Space Grotesk', sans-serif";
          ctx.fillText(p.name.toUpperCase(), x + r + 6, y - 4);
          ctx.fillStyle = "hsla(215, 20%, 60%, 0.8)";
          ctx.font = "8px 'JetBrains Mono', monospace";
          ctx.fillText(`mag ${p.mag.toFixed(1)}`, x + r + 6, y + 7);
        }
      });
    }

    // Meteor shower radiants
    if (showMeteors) {
      METEOR_SHOWERS.forEach((m) => {
        const [x, y] = raDecToXY(m.ra, m.dec, centerRA, centerDec, scale, cx, cy);
        if (x < 0 || x > w || y < 0 || y > h) return;
        ctx.strokeStyle = "hsl(15, 90%, 60%)";
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.8;
        // Radiating lines
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2;
          const inner = 6;
          const outer = 16;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(ang) * inner, y + Math.sin(ang) * inner);
          ctx.lineTo(x + Math.cos(ang) * outer, y + Math.sin(ang) * outer);
          ctx.stroke();
        }
        ctx.fillStyle = "hsla(15, 90%, 60%, 0.9)";
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (showLabels) {
          ctx.fillStyle = "hsl(15, 85%, 72%)";
          ctx.font = "9px 'Space Grotesk', sans-serif";
          ctx.fillText(m.name, x + 18, y - 6);
          ctx.fillStyle = "hsla(15, 40%, 60%, 0.7)";
          ctx.font = "8px 'JetBrains Mono', monospace";
          ctx.fillText(`ZHR ${m.zhr} · ${m.peak}`, x + 18, y + 6);
        }
      });
    }

    // Hovered tooltip
    if (hovered) {
      const [mx, my] = [w - 220, 20];
      ctx.fillStyle = "hsla(225, 30%, 10%, 0.92)";
      ctx.strokeStyle = "hsl(190, 85%, 55%)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(mx, my, 200, 46, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "hsl(190, 85%, 72%)";
      ctx.font = "bold 12px 'Space Grotesk', sans-serif";
      ctx.fillText(hovered.name, mx + 10, my + 18);
      ctx.fillStyle = "hsl(215, 15%, 62%)";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText(hovered.info, mx + 10, my + 34);
    }
  }, [centerRA, centerDec, zoom, showConstellations, showLabels, showPlanets, showMilkyWay, showMeteors, showDSO, hovered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      draw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (dragging && lastPos) {
      const dx = e.clientX - lastPos.x;
      const dy = e.clientY - lastPos.y;
      setCenterRA((prev) => prev - dx * 0.02 / zoom);
      setCenterDec((prev) => Math.max(-85, Math.min(85, prev + dy * 0.15 / zoom)));
      setLastPos({ x: e.clientX, y: e.clientY });
    } else {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const scale = Math.min(rect.width, rect.height) * 0.42 * zoom;

      let found: { name: string; info: string } | null = null;
      for (const p of PLANETS) {
        const [sx, sy] = raDecToXY(p.ra, p.dec, centerRA, centerDec, scale, cx, cy);
        if (Math.abs(mx - sx) < 14 && Math.abs(my - sy) < 14) {
          found = { name: p.name, info: `Planet · mag ${p.mag.toFixed(1)} · RA ${p.ra.toFixed(1)}h` };
          break;
        }
      }
      if (!found) for (const m of METEOR_SHOWERS) {
        const [sx, sy] = raDecToXY(m.ra, m.dec, centerRA, centerDec, scale, cx, cy);
        if (Math.abs(mx - sx) < 14 && Math.abs(my - sy) < 14) {
          found = { name: m.name, info: `Meteor shower · ZHR ${m.zhr} · peak ${m.peak}` };
          break;
        }
      }
      if (!found) for (const d of DSO) {
        const [sx, sy] = raDecToXY(d.ra, d.dec, centerRA, centerDec, scale, cx, cy);
        if (Math.abs(mx - sx) < 12 && Math.abs(my - sy) < 12) {
          found = { name: d.name, info: `Deep-sky · mag ${d.mag.toFixed(1)}` };
          break;
        }
      }
      if (!found) for (const s of STARS) {
        if (!s.name || s.mag > 3) continue;
        const [sx, sy] = raDecToXY(s.ra, s.dec, centerRA, centerDec, scale, cx, cy);
        if (Math.abs(mx - sx) < 10 && Math.abs(my - sy) < 10) {
          found = { name: s.name, info: `Star · mag ${s.mag.toFixed(2)}${s.constellation ? ` · ${s.constellation}` : ""}` };
          break;
        }
      }
      setHovered(found);
    }
  };

  const handleMouseUp = () => { setDragging(false); setLastPos(null); };
  const handleWheel = (e: React.WheelEvent) => {
    setZoom((z) => Math.max(0.3, Math.min(5, z - e.deltaY * 0.001)));
  };

  const toggleBtn = (active: boolean, onClick: () => void, icon: React.ReactNode, label: string) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display tracking-wider border transition-colors ${
        active ? "bg-primary/20 text-primary border-primary/40" : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground"
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <section id="sky-map" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Interactive · Planetarium</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Night Sky Atlas</h2>
          <p className="text-muted-foreground max-w-2xl text-sm">
            An interactive celestial chart with stars, constellations, planets, the Milky Way band, deep-sky objects, meteor shower radiants,
            the ecliptic and celestial equator. Drag to pan · scroll to zoom · hover for details · jump to landmarks.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_260px] gap-4">
          <div className="glass-card overflow-hidden">
            <div className="flex items-center flex-wrap gap-2 p-3 border-b border-border/60">
              <button onClick={() => setZoom((z) => Math.min(5, z * 1.3))} className="p-1.5 rounded-md bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-primary transition-colors" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
              <button onClick={() => setZoom((z) => Math.max(0.3, z / 1.3))} className="p-1.5 rounded-md bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-primary transition-colors" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
              <button onClick={() => { setCenterRA(6); setCenterDec(10); setZoom(1); }} className="p-1.5 rounded-md bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-primary transition-colors" title="Reset"><RotateCcw className="w-4 h-4" /></button>
              <div className="h-4 w-px bg-border/60 mx-1" />
              {toggleBtn(showConstellations, () => setShowConstellations(!showConstellations), <Star className="w-3 h-3" />, "Constellations")}
              {toggleBtn(showPlanets, () => setShowPlanets(!showPlanets), <Orbit className="w-3 h-3" />, "Planets")}
              {toggleBtn(showMeteors, () => setShowMeteors(!showMeteors), <Sparkles className="w-3 h-3" />, "Meteors")}
              {toggleBtn(showMilkyWay, () => setShowMilkyWay(!showMilkyWay), <span className="text-[10px]">✧</span>, "Milky Way")}
              {toggleBtn(showDSO, () => setShowDSO(!showDSO), <span className="text-[10px]">◎</span>, "Deep Sky")}
              {toggleBtn(showLabels, () => setShowLabels(!showLabels), <Eye className="w-3 h-3" />, "Labels")}
              <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                RA {centerRA.toFixed(1)}h · Dec {centerDec.toFixed(0)}° · {zoom.toFixed(1)}×
              </span>
            </div>
            <div className="relative w-full h-[420px] md:h-[580px] cursor-grab active:cursor-grabbing">
              <canvas
                ref={canvasRef}
                className="w-full h-full block"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 p-3 text-[10px] text-muted-foreground border-t border-border/60 font-mono">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[hsl(190,60%,50%)]" /> Celestial Equator</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 border-t border-dashed border-[hsl(45,80%,55%)]" /> Ecliptic</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[hsl(15,90%,60%)]" /> Meteor Radiant</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border border-[hsl(280,70%,70%)]" /> Deep-Sky</span>
              {CONSTELLATIONS.map((c) => (
                <span key={c.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-3">
            <div className="glass-card p-3">
              <p className="text-[10px] font-display tracking-wider text-primary mb-2">JUMP TO</p>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => { setCenterRA(p.ra); setCenterDec(p.dec); setZoom(1.2); }}
                    className="px-2 py-1.5 rounded bg-secondary/40 hover:bg-primary/15 hover:text-primary border border-border text-[10px] font-mono text-left transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <Moon className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] font-display tracking-wider text-primary">MOON PHASE</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-full bg-[hsl(215,20%,20%)] overflow-hidden border border-border">
                  <div
                    className="absolute inset-0 bg-[hsl(45,25%,88%)]"
                    style={{
                      clipPath: phase < 0.5
                        ? `polygon(50% 0, 100% 0, 100% 100%, 50% 100%, ${50 - (0.5 - phase) * 100}% 50%)`
                        : `polygon(0 0, 50% 0, ${(phase - 0.5) * 100 + 50}% 50%, 50% 100%, 0 100%)`,
                    }}
                  />
                </div>
                <div>
                  <div className="text-xs font-display text-foreground">{phaseName}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">Illum. {(Math.sin(phase * Math.PI) * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>

            <div className="glass-card p-3">
              <p className="text-[10px] font-display tracking-wider text-primary mb-2">PLANETS TONIGHT</p>
              <div className="space-y-1.5">
                {PLANETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => { setCenterRA(p.ra); setCenterDec(p.dec); setZoom(1.5); }}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded bg-secondary/30 hover:bg-primary/10 border border-border text-[10px] font-mono transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                    <span className="text-muted-foreground">mag {p.mag.toFixed(1)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-3">
              <p className="text-[10px] font-display tracking-wider text-primary mb-2">NEXT SHOWERS</p>
              <div className="space-y-1.5">
                {METEOR_SHOWERS.slice(0, 4).map((m) => (
                  <div key={m.name} className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-foreground">{m.name}</span>
                    <span className="text-muted-foreground">{m.peak} · {m.zhr}/h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SkyMapSection;
