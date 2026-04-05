import { motion } from "framer-motion";
import {
  Rocket, Satellite, Shield, Cpu, Gauge, Layers, Timer, Orbit,
  Waypoints, Crosshair, BarChart3, TrendingDown, ArrowDownCircle,
  AlertTriangle, Radar, Zap, Globe, Star, Calendar, Flame, Activity,
  CloudLightning, Newspaper, Map, Eye, Sparkles, Sun, Database,
  Binary, Bot, Image, Users, Mail, Target, type LucideIcon
} from "lucide-react";

interface ExplainerData {
  icon: LucideIcon;
  title: string;
  explain: string;
}

const explainers: Record<string, ExplainerData> = {
  mission: {
    icon: Target,
    title: "Mission Overview",
    explain: "Space junk is stuff left behind by old rockets and broken satellites — and it's dangerous! This section shows how Debrix cleans it up using smart robots that fly together like a team."
  },
  "launch-sim": {
    icon: Rocket,
    title: "Launch Simulator",
    explain: "Ever wondered what happens during a rocket launch? This simulator lets you experience each stage — from the engines firing to reaching orbit — just like a real mission control screen!"
  },
  workflow: {
    icon: Layers,
    title: "Workflow Pipeline",
    explain: "Think of this like a recipe for cleaning up space. Step by step, it shows how we find debris, grab it, and safely burn it up in the atmosphere so it can't hurt anyone."
  },
  timeline: {
    icon: Timer,
    title: "Mission Timeline",
    explain: "A timeline of important moments in the Debrix mission — like a history book, but for space cleanup! Each dot on the line is a big achievement."
  },
  telemetry: {
    icon: Gauge,
    title: "Telemetry Dashboard",
    explain: "Telemetry means measuring things from far away. This dashboard shows speed, height, fuel, and temperature — the same kind of screens real astronauts watch!"
  },
  "dock-dump": {
    icon: Orbit,
    title: "Dock & Dump Sim",
    explain: "Imagine two spaceships gently connecting in space — that's docking! Then the junk gets pushed down toward Earth where it safely burns up. This sim lets you try it."
  },
  swarm: {
    icon: Waypoints,
    title: "Swarm Coordination",
    explain: "Just like a flock of birds flying together, our tiny satellites work as a team. They talk to each other and spread out to cover more of space — this shows how they coordinate."
  },
  "collision-avoidance": {
    icon: Shield,
    title: "AI Collision Avoidance",
    explain: "Space is crowded! This AI watches for objects that might crash into each other and warns us early — like a crossing guard, but for satellites flying at 28,000 km/h."
  },
  "debris-tracker": {
    icon: Satellite,
    title: "Debris Tracker",
    explain: "There are over 36,000 pieces of junk orbiting Earth right now. This 3D globe shows where each piece is — updated in real time using actual tracking data."
  },
  "debris-priority": {
    icon: Crosshair,
    title: "Debris Prioritization",
    explain: "Not all space junk is equally dangerous. This tool ranks each piece by how likely it is to crash into something important — the most dangerous ones get cleaned up first."
  },
  "debris-growth": {
    icon: BarChart3,
    title: "Debris Growth Chart",
    explain: "This chart shows how space junk has been growing over the years — and what might happen in the future if we don't clean it up. Spoiler: it's a LOT more junk!"
  },
  "orbital-decay": {
    icon: TrendingDown,
    title: "Orbital Decay Predictor",
    explain: "Everything in low orbit slowly falls back to Earth because of tiny bits of air way up high. This tool predicts when an object will come back down — like a countdown!"
  },
  "reentry-prediction": {
    icon: ArrowDownCircle,
    title: "Re-Entry Prediction",
    explain: "When something falls from space, we need to know WHERE and WHEN it'll come down. This predictor figures that out so people on the ground stay safe."
  },
  kessler: {
    icon: AlertTriangle,
    title: "Kessler Syndrome Simulator",
    explain: "Imagine one crash in space creates hundreds of pieces, and each piece crashes into more things — a chain reaction! This scary scenario is called Kessler Syndrome, and you can watch it happen here."
  },
  "sat-dashboard": {
    icon: Radar,
    title: "Satellite Dashboard",
    explain: "How many satellites are up there? How many are working vs. broken? This dashboard gives you the big picture — like a scoreboard for everything orbiting Earth."
  },
  "space-weather": {
    icon: Zap,
    title: "Space Weather",
    explain: "The Sun sometimes shoots out giant bursts of energy called solar flares and CMEs. These can mess up satellites and even power grids on Earth. This section tracks them!"
  },
  "iss-tracker": {
    icon: Globe,
    title: "ISS Tracker",
    explain: "The International Space Station flies around Earth every 90 minutes with astronauts inside! This live map shows you exactly where it is RIGHT NOW."
  },
  apod: {
    icon: Star,
    title: "Astronomy Picture of the Day",
    explain: "Every single day, NASA picks one amazing space photo and shares it with the world. It could be a galaxy, a nebula, or even Earth from space — always something beautiful!"
  },
  "space-events": {
    icon: Calendar,
    title: "Space Events",
    explain: "Spacewalks, dockings, satellite launches — there's always something happening in space! This calendar shows you what's coming up next."
  },
  "upcoming-launches": {
    icon: Rocket,
    title: "Upcoming Launches",
    explain: "Rockets launch from all over the world every week! This section shows the next launches with countdown timers — so you know exactly when to watch."
  },
  "neo-asteroids": {
    icon: Flame,
    title: "Near-Earth Asteroids",
    explain: "Asteroids are space rocks, and some fly close to Earth. NASA tracks every single one. This shows the closest ones — don't worry, most are millions of km away!"
  },
  "fireball-tracker": {
    icon: Activity,
    title: "Fireball Tracker",
    explain: "Sometimes space rocks hit Earth's atmosphere and create a BRIGHT flash called a fireball or bolide. This map shows where these cosmic explosions have been spotted."
  },
  "earth-events": {
    icon: CloudLightning,
    title: "Earth Events (EONET)",
    explain: "Wildfires, volcanic eruptions, hurricanes — NASA watches these natural events from space using satellites. This section shows what's happening on our planet right now."
  },
  "space-news": {
    icon: Newspaper,
    title: "Space News",
    explain: "The latest news from the space industry — new launches, discoveries, and missions. Stay updated on everything happening beyond our atmosphere!"
  },
  "sky-map": {
    icon: Map,
    title: "Sky Map",
    explain: "Look up! This interactive star chart shows you what stars, planets, and constellations are visible in the sky RIGHT NOW from your location. It's like a GPS for the night sky."
  },
  "planet-visibility": {
    icon: Eye,
    title: "Planet Visibility & Orrery",
    explain: "An orrery is a mini model of our solar system. This one shows where all 8 planets are right now, how far they are from each other, and which ones you can see tonight!"
  },
  "aurora-forecast": {
    icon: Sparkles,
    title: "Aurora Forecast",
    explain: "The Northern and Southern Lights (auroras) happen when particles from the Sun hit Earth's magnetic field. This forecast tells you when and where you might see them glow!"
  },
  "solar-imagery": {
    icon: Sun,
    title: "Live Solar Imagery",
    explain: "NASA has a special telescope called SDO that takes pictures of the Sun 24/7 in different colors of light. Each color reveals something different — sunspots, flares, and more!"
  },
  "artemis-tracker": {
    icon: Rocket,
    title: "Artemis II Tracker",
    explain: "Artemis II is NASA's mission to send astronauts around the Moon for the first time in over 50 years! This tracker shows a live countdown, the crew, and the spaceship's path."
  },
  "rocket-engines": {
    icon: Database,
    title: "Rocket Engine Database",
    explain: "Rocket engines are incredible machines that push spacecraft into orbit. This database has details on real engines — how powerful they are, what fuel they use, and more."
  },
  "mars-rover": {
    icon: Binary,
    title: "Mars Rover Gallery",
    explain: "NASA has robots driving around on Mars right now! Curiosity and Perseverance send back photos of the Martian surface. Browse the latest pictures from another planet!"
  },
  "mission-analyzer": {
    icon: Cpu,
    title: "Mission Analyzer",
    explain: "Planning a trip to space? This calculator figures out how much fuel (delta-v) you need to get from one orbit to another — the same math real rocket scientists use."
  },
  "space-chat": {
    icon: Bot,
    title: "K2 Space Chat",
    explain: "Got a question about space? Ask our AI assistant! It knows about orbits, planets, missions, rockets, and space debris. Think of it as your personal space tutor."
  },
  gallery: {
    icon: Image,
    title: "Gallery",
    explain: "Beautiful pictures of space missions, concept art of future spacecraft, and stunning views of Earth from orbit. Just scroll and enjoy the views!"
  },
  team: {
    icon: Users,
    title: "Team",
    explain: "Meet the people behind Debrix! Engineers, scientists, and designers all working together to make space safer for everyone."
  },
  contact: {
    icon: Mail,
    title: "Contact",
    explain: "Want to say hi, ask a question, or join the mission? Send us a message right here — we'd love to hear from you!"
  },
};

interface SectionExplainerProps {
  sectionId: string;
}

const SectionExplainer = ({ sectionId }: SectionExplainerProps) => {
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
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm shadow-sm">
        <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[11px] font-semibold text-primary/90 mb-1 uppercase tracking-widest">
            What is this?
          </p>
          <p className="text-[13px] text-foreground/75 leading-[1.6] font-body">
            {data.explain}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default SectionExplainer;
