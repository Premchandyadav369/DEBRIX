import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, type LucideIcon } from "lucide-react";
import {
  Rocket, Satellite, Shield, Cpu, Gauge, Layers, Timer, Orbit,
  Waypoints, Crosshair, BarChart3, TrendingDown, ArrowDownCircle,
  AlertTriangle, Radar, Zap, Globe, Star, Calendar, Flame, Activity,
  CloudLightning, Newspaper, Map, Eye, Sparkles, Sun, Database,
  Binary, Bot, Image, Users, Mail, Target, Search
} from "lucide-react";

interface ExplainerData {
  icon: LucideIcon;
  emoji: string;
  explain: string;
}

const explainers: Record<string, ExplainerData> = {
  mission: { icon: Target, emoji: "🛰️", explain: "Space junk is stuff left behind by old rockets and broken satellites — and it's dangerous! This section shows how Debrix cleans it up using smart robots that fly together like a team." },
  "launch-sim": { icon: Rocket, emoji: "🚀", explain: "Ever wondered what happens during a rocket launch? This simulator lets you experience each stage — from the engines firing to reaching orbit — just like a real mission control screen!" },
  workflow: { icon: Layers, emoji: "🧹", explain: "Think of this like a recipe for cleaning up space. Step by step — find debris, grab it, and safely burn it up in the atmosphere so it can't hurt anyone." },
  timeline: { icon: Timer, emoji: "📅", explain: "A timeline of important moments in the Debrix mission — like a history book, but for space cleanup! Each dot is a big achievement." },
  telemetry: { icon: Gauge, emoji: "📊", explain: "Telemetry means measuring things from far away. This dashboard shows speed, height, fuel, and temperature — the same screens real astronauts watch!" },
  "dock-dump": { icon: Orbit, emoji: "🤝", explain: "Imagine two spaceships gently connecting in space — that's docking! Then the junk gets pushed down toward Earth where it safely burns up." },
  swarm: { icon: Waypoints, emoji: "🐝", explain: "Like a flock of birds flying together, our tiny satellites work as a team. They talk to each other and spread out to cover more of space." },
  "collision-avoidance": { icon: Shield, emoji: "🛡️", explain: "Space is crowded! This AI watches for objects that might crash into each other and warns us early — like a crossing guard for satellites at 28,000 km/h." },
  "debris-tracker": { icon: Satellite, emoji: "🌍", explain: "36,000+ pieces of junk orbiting Earth right now. This 3D globe shows where each piece is — updated in real time using actual tracking data." },
  "debris-priority": { icon: Crosshair, emoji: "🎯", explain: "Not all space junk is equally dangerous. This ranks each piece by how likely it is to crash into something — the most dangerous gets cleaned up first." },
  "debris-growth": { icon: BarChart3, emoji: "📈", explain: "This chart shows how space junk has been growing over the years — and what happens if we don't clean it up. Spoiler: it's a LOT more junk!" },
  "orbital-decay": { icon: TrendingDown, emoji: "⬇️", explain: "Everything in low orbit slowly falls back to Earth because of tiny bits of air way up high. This predicts when an object will come back down." },
  
  kessler: { icon: AlertTriangle, emoji: "💥", explain: "One crash creates hundreds of pieces, each piece crashes into more — a chain reaction! This scary scenario is called Kessler Syndrome. Watch it happen here." },
  "sat-dashboard": { icon: Radar, emoji: "📡", explain: "How many satellites are up there? Working vs. broken? This dashboard is like a scoreboard for everything orbiting Earth." },
  "satellite-explorer": { icon: Search, emoji: "🔍", explain: "Type any satellite name (like 'Hubble' or 'ISS') and instantly get its mission story, who built it, and when it launched. Plus see what's trending and which satellites are about to come dangerously close to each other!" },
  "space-weather": { icon: Zap, emoji: "☀️", explain: "The Sun sometimes shoots giant bursts of energy called solar flares. These can mess up satellites and power grids. This section tracks them!" },
  "iss-tracker": { icon: Globe, emoji: "🏠", explain: "The International Space Station flies around Earth every 90 minutes with astronauts inside! This live map shows exactly where it is RIGHT NOW." },
  apod: { icon: Star, emoji: "✨", explain: "Every day, NASA picks one amazing space photo. It could be a galaxy, a nebula, or Earth from space — always something beautiful!" },
  "space-events": { icon: Calendar, emoji: "🗓️", explain: "Spacewalks, dockings, launches — there's always something happening! This calendar shows what's coming up next in space." },
  "upcoming-launches": { icon: Rocket, emoji: "⏱️", explain: "Rockets launch from all over the world every week! See the next launches with countdown timers so you know when to watch." },
  "neo-asteroids": { icon: Flame, emoji: "☄️", explain: "Asteroids are space rocks, and some fly close to Earth. NASA tracks every one. Don't worry — most are millions of km away!" },
  "fireball-tracker": { icon: Activity, emoji: "🌠", explain: "Sometimes space rocks hit Earth's atmosphere and create a BRIGHT flash called a fireball. This map shows where these cosmic explosions happened." },
  dictionary: { icon: Search, emoji: "📖", explain: "Space talk is full of weird letters and big words — TLE, LEO, delta-v, RAAN. This is your plain-English cheat sheet so nothing on the site feels like alien language." },
  "space-news": { icon: Newspaper, emoji: "📰", explain: "The latest news from the space industry — new launches, discoveries, and missions. Stay updated on everything beyond our atmosphere!" },
  "sky-map": { icon: Map, emoji: "🌌", explain: "This star chart shows what stars, planets, and constellations are visible RIGHT NOW from your location. Like a GPS for the night sky." },
  "planet-visibility": { icon: Eye, emoji: "🪐", explain: "An orrery is a mini model of our solar system. See where all 8 planets are now, how far apart they are, and which ones you can spot tonight!" },
  
  "solar-imagery": { icon: Sun, emoji: "🔭", explain: "NASA's SDO telescope photographs the Sun 24/7 in different light wavelengths. Each color reveals something different — sunspots, flares, and more!" },
  "artemis-tracker": { icon: Rocket, emoji: "🌙", explain: "Artemis II sends astronauts around the Moon for the first time in 50+ years! Live countdown, crew info, and the spaceship's path." },
  "rocket-engines": { icon: Database, emoji: "⚙️", explain: "Rocket engines push spacecraft into orbit. This database has real engine specs — how powerful they are, what fuel they use, and more." },
  
  "mission-analyzer": { icon: Cpu, emoji: "🧮", explain: "How much fuel to get from one orbit to another? This calculator does the same math real rocket scientists use — called delta-v." },
  "space-chat": { icon: Bot, emoji: "💬", explain: "Got a space question? Ask our AI! It knows about orbits, planets, missions, and debris. Your personal space tutor." },
  gallery: { icon: Image, emoji: "🖼️", explain: "Beautiful pictures of space missions, concept art, and stunning views of Earth from orbit. Scroll and enjoy!" },
  team: { icon: Users, emoji: "👩‍🚀", explain: "Meet the people behind Debrix — engineers, scientists, and designers working to make space safer for everyone." },
  contact: { icon: Mail, emoji: "✉️", explain: "Want to say hi, ask a question, or join the mission? Send us a message — we'd love to hear from you!" },
};

const SectionExplainer = ({ sectionId }: { sectionId: string }) => {
  const [open, setOpen] = useState(false);
  const data = explainers[sectionId];
  if (!data) return null;

  const Icon = data.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative z-20 max-w-2xl mx-auto mt-8 mb-2 px-4 sm:px-6"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm shadow-sm hover:border-primary/30 transition-colors text-left group"
      >
        <span className="text-base leading-none">{data.emoji}</span>
        <div className="flex-1 min-w-0">
          <span className="font-display text-[11px] font-medium text-primary/80 uppercase tracking-widest">
            What is this?
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 mt-1 rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm">
              <p className="text-[13px] text-foreground/75 leading-[1.7]">
                {data.explain}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SectionExplainer;
