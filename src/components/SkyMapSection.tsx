import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Star, ZoomIn, ZoomOut, RotateCcw, Eye } from "lucide-react";

interface StarData {
  name: string;
  ra: number; // hours
  dec: number; // degrees
  mag: number;
  constellation?: string;
}

interface ConstellationLine {
  name: string;
  stars: [number, number][]; // pairs of star indices
  color: string;
}

// Bright stars catalog (top ~80 visible stars)
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
  // Scorpius
  { name: "Shaula", ra: 17.56, dec: -37.10, mag: 1.63, constellation: "Scorpius" },
  { name: "Sargas", ra: 17.62, dec: -43.00, mag: 1.87, constellation: "Scorpius" },
  // Cygnus (Summer Triangle)
  { name: "Sadr", ra: 20.37, dec: 40.26, mag: 2.20, constellation: "Cygnus" },
  { name: "Albireo", ra: 19.51, dec: 27.96, mag: 3.08, constellation: "Cygnus" },
  // Leo
  { name: "Denebola", ra: 11.82, dec: 14.57, mag: 2.14, constellation: "Leo" },
  { name: "Algieba", ra: 10.33, dec: 19.84, mag: 2.28, constellation: "Leo" },
  // Southern Cross
  { name: "Acrux", ra: 12.44, dec: -63.10, mag: 0.76, constellation: "Crux" },
  { name: "Mimosa", ra: 12.80, dec: -59.69, mag: 1.25, constellation: "Crux" },
  { name: "Gacrux", ra: 12.52, dec: -57.11, mag: 1.64, constellation: "Crux" },
  // Extra filler stars for density
  ...Array.from({ length: 200 }, (_, i) => ({
    name: "",
    ra: Math.random() * 24,
    dec: (Math.random() - 0.5) * 180,
    mag: 2.5 + Math.random() * 3.5,
  })),
];

// Constellation line patterns (index into STARS array)
const CONSTELLATIONS: { name: string; pairs: [number, number][]; color: string }[] = [
  { name: "Orion", pairs: [[5, 7], [7, 17], [17, 20], [20, 18], [18, 19], [5, 21], [17, 18]], color: "hsl(190, 85%, 52%)" },
  { name: "Big Dipper", pairs: [[22, 23], [23, 24], [24, 25], [25, 26], [26, 27], [27, 28]], color: "hsl(160, 70%, 48%)" },
  { name: "Cassiopeia", pairs: [[30, 31], [31, 32], [32, 33], [33, 34]], color: "hsl(45, 90%, 55%)" },
  { name: "Summer Triangle", pairs: [[3, 8], [8, 14], [14, 3]], color: "hsl(280, 70%, 60%)" },
  { name: "Southern Cross", pairs: [[41, 43], [42, 43]], color: "hsl(0, 72%, 55%)" },
];

function raDecToXY(ra: number, dec: number, centerRA: number, centerDec: number, scale: number, cx: number, cy: number): [number, number] {
  const raRad = ((ra - centerRA) * 15 * Math.PI) / 180;
  const decRad = (dec * Math.PI) / 180;
  const centerDecRad = (centerDec * Math.PI) / 180;

  // Stereographic projection
  const x = Math.cos(decRad) * Math.sin(raRad);
  const y = Math.sin(decRad) * Math.cos(centerDecRad) - Math.cos(decRad) * Math.cos(raRad) * Math.sin(centerDecRad);

  return [cx + x * scale, cy - y * scale];
}

const SkyMapSection = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [centerRA, setCenterRA] = useState(6); // hours (Orion area)
  const [centerDec, setCenterDec] = useState(10); // degrees
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredStar, setHoveredStar] = useState<StarData | null>(null);
  const [showConstellations, setShowConstellations] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) * 0.4 * zoom;

    // Background
    ctx.fillStyle = "hsl(220, 25%, 6%)";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "hsla(220, 18%, 30%, 0.15)";
    ctx.lineWidth = 0.5;
    for (let ra = 0; ra < 24; ra += 2) {
      ctx.beginPath();
      for (let dec = -80; dec <= 80; dec += 2) {
        const [x, y] = raDecToXY(ra, dec, centerRA, centerDec, scale, cx, cy);
        if (dec === -80) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let dec = -60; dec <= 60; dec += 30) {
      ctx.beginPath();
      for (let ra = 0; ra <= 24; ra += 0.2) {
        const [x, y] = raDecToXY(ra, dec, centerRA, centerDec, scale, cx, cy);
        if (ra === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Constellation lines
    if (showConstellations) {
      CONSTELLATIONS.forEach((c) => {
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.5;
        c.pairs.forEach(([a, b]) => {
          if (a >= STARS.length || b >= STARS.length) return;
          const [x1, y1] = raDecToXY(STARS[a].ra, STARS[a].dec, centerRA, centerDec, scale, cx, cy);
          const [x2, y2] = raDecToXY(STARS[b].ra, STARS[b].dec, centerRA, centerDec, scale, cx, cy);
          if (x1 > -100 && x1 < w + 100 && y1 > -100 && y1 < h + 100) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;

        // Constellation labels
        if (showLabels && c.pairs.length > 0) {
          const firstStar = STARS[c.pairs[0][0]];
          if (firstStar) {
            const [lx, ly] = raDecToXY(firstStar.ra, firstStar.dec, centerRA, centerDec, scale, cx, cy);
            if (lx > 0 && lx < w && ly > 0 && ly < h) {
              ctx.fillStyle = c.color;
              ctx.font = "10px 'Space Grotesk', sans-serif";
              ctx.globalAlpha = 0.7;
              ctx.fillText(c.name, lx + 8, ly - 8);
              ctx.globalAlpha = 1;
            }
          }
        }
      });
    }

    // Stars
    STARS.forEach((star) => {
      const [x, y] = raDecToXY(star.ra, star.dec, centerRA, centerDec, scale, cx, cy);
      if (x < -50 || x > w + 50 || y < -50 || y > h + 50) return;

      const size = Math.max(0.5, (4 - star.mag) * 0.8 * zoom);
      const brightness = Math.min(1, Math.max(0.2, (4 - star.mag) / 5));

      // Glow for bright stars
      if (star.mag < 1.5) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
        gradient.addColorStop(0, `hsla(190, 85%, 80%, ${brightness * 0.3})`);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = star.mag < 0 ? "hsl(200, 90%, 90%)" : star.mag < 1 ? "hsl(210, 60%, 85%)" : `hsla(220, 30%, 80%, ${brightness})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      // Name labels for bright named stars
      if (showLabels && star.name && star.mag < 2) {
        ctx.fillStyle = `hsla(210, 30%, 70%, ${brightness * 0.8})`;
        ctx.font = `${Math.max(9, 11 * zoom)}px 'Space Grotesk', sans-serif`;
        ctx.fillText(star.name, x + size + 4, y + 3);
      }
    });

    // Hovered star tooltip
    if (hoveredStar) {
      const [hx, hy] = raDecToXY(hoveredStar.ra, hoveredStar.dec, centerRA, centerDec, scale, cx, cy);
      ctx.fillStyle = "hsla(220, 22%, 14%, 0.9)";
      ctx.strokeStyle = "hsl(190, 85%, 52%)";
      ctx.lineWidth = 1;
      const tw = 180;
      const th = 60;
      const tx = Math.min(hx + 15, w - tw - 10);
      const ty = Math.max(hy - th / 2, 10);
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "hsl(190, 85%, 70%)";
      ctx.font = "bold 12px 'Space Grotesk', sans-serif";
      ctx.fillText(hoveredStar.name, tx + 10, ty + 18);
      ctx.fillStyle = "hsl(215, 15%, 55%)";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText(`Mag: ${hoveredStar.mag.toFixed(2)} | RA: ${hoveredStar.ra.toFixed(1)}h`, tx + 10, ty + 34);
      if (hoveredStar.constellation) {
        ctx.fillText(`Constellation: ${hoveredStar.constellation}`, tx + 10, ty + 48);
      }
    }
  }, [centerRA, centerDec, zoom, showConstellations, showLabels, hoveredStar]);

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
      // Check hover
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const scale = Math.min(rect.width, rect.height) * 0.4 * zoom;

      let found: StarData | null = null;
      for (const star of STARS) {
        if (!star.name || star.mag > 3) continue;
        const [sx, sy] = raDecToXY(star.ra, star.dec, centerRA, centerDec, scale, cx, cy);
        if (Math.abs(mx - sx) < 12 && Math.abs(my - sy) < 12) {
          found = star;
          break;
        }
      }
      setHoveredStar(found);
    }
  };

  const handleMouseUp = () => { setDragging(false); setLastPos(null); };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(5, z - e.deltaY * 0.001)));
  };

  return (
    <section id="sky-map" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Interactive</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Night Sky Map</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Explore stars and constellations with an interactive sky chart. Drag to pan, scroll to zoom, hover stars for details.
          </p>
        </motion.div>

        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b border-border/60">
            <button onClick={() => setZoom((z) => Math.min(5, z * 1.3))} className="p-1.5 rounded-md bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-primary transition-colors" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => setZoom((z) => Math.max(0.3, z / 1.3))} className="p-1.5 rounded-md bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-primary transition-colors" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={() => { setCenterRA(6); setCenterDec(10); setZoom(1); }} className="p-1.5 rounded-md bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-primary transition-colors" title="Reset">
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-border/60 mx-1" />
            <button
              onClick={() => setShowConstellations(!showConstellations)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display tracking-wider border transition-colors ${
                showConstellations ? "bg-primary/20 text-primary border-primary/40" : "bg-secondary/50 text-muted-foreground border-border"
              }`}
            >
              <Star className="w-3 h-3" /> Constellations
            </button>
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display tracking-wider border transition-colors ${
                showLabels ? "bg-primary/20 text-primary border-primary/40" : "bg-secondary/50 text-muted-foreground border-border"
              }`}
            >
              <Eye className="w-3 h-3" /> Labels
            </button>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">
              RA: {centerRA.toFixed(1)}h Dec: {centerDec.toFixed(0)}° Zoom: {zoom.toFixed(1)}x
            </span>
          </div>
          <div className="relative w-full h-[400px] md:h-[550px] cursor-grab active:cursor-grabbing">
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            />
          </div>
          <div className="flex items-center justify-center gap-4 p-3 text-xs text-muted-foreground border-t border-border/60">
            {CONSTELLATIONS.map((c) => (
              <span key={c.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SkyMapSection;
