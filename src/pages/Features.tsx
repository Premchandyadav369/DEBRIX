import { useCallback } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Rocket, Orbit, Satellite, Radio, Globe, Sun, Moon, Star,
  Activity, Shield, BarChart3, Telescope, Flame, Wind, Sparkles,
  Users, Mail, Image, Newspaper, Bot, Calendar, Crosshair,
  Gauge, Radar, Zap, TrendingDown, AlertTriangle, Database,
  Eye, Map, ArrowLeft, ChevronRight, Layers, Target, Cpu,
  Timer, CloudLightning, Waypoints, ArrowDownCircle, Binary
} from "lucide-react";
import Starfield from "@/components/Starfield";

const features = [
  // Mission & Core
  { icon: Rocket, title: "Hero & Landing", desc: "Cinematic 3D satellite scene with animated counters and mission status overview.", section: "home", category: "Mission" },
  { icon: Target, title: "Mission Overview", desc: "Core mission objectives for orbital debris removal with interactive cards.", section: "mission", category: "Mission" },
  { icon: Rocket, title: "Artemis II Tracker", desc: "Live countdown, crew profiles, trajectory visualization, and mission milestones for NASA's lunar flyby.", section: "artemis-tracker", category: "Mission" },
  { icon: Layers, title: "Workflow Pipeline", desc: "Step-by-step debris removal workflow from detection to deorbit.", section: "workflow", category: "Mission" },
  { icon: Timer, title: "Mission Timeline", desc: "Interactive chronological timeline of key mission milestones.", section: "timeline", category: "Mission" },

  // Simulations
  { icon: Rocket, title: "Launch Simulator", desc: "3D rocket launch simulation with real-time physics and staging events.", section: "launch-sim", category: "Simulation" },
  { icon: Gauge, title: "Telemetry Dashboard", desc: "Real-time telemetry readouts — velocity, altitude, fuel, and system status.", section: "telemetry", category: "Simulation" },
  { icon: Orbit, title: "Dock & Dump Sim", desc: "Simulate orbital docking maneuvers and controlled debris deorbit burns.", section: "dock-dump", category: "Simulation" },
  { icon: Waypoints, title: "Swarm Coordination", desc: "Multi-agent swarm satellite coordination and formation flying simulator.", section: "swarm", category: "Simulation" },
  { icon: Shield, title: "AI Collision Avoidance", desc: "AI-powered conjunction assessment scanning the orbital environment.", section: "collision-avoidance", category: "Simulation" },

  // Debris Analysis
  { icon: Satellite, title: "Debris Tracker", desc: "Live orbital debris tracking powered by CelesTrak TLE data.", section: "debris-tracker", category: "Debris" },
  { icon: Crosshair, title: "Debris Prioritization", desc: "Risk-ranked debris objects scored by collision probability and impact.", section: "debris-priority", category: "Debris" },
  { icon: BarChart3, title: "Debris Growth Chart", desc: "Historical and projected growth of tracked orbital debris objects.", section: "debris-growth", category: "Debris" },
  { icon: TrendingDown, title: "Orbital Decay Predictor", desc: "Physics-based decay simulation with atmospheric drag and solar activity models.", section: "orbital-decay", category: "Debris" },
  { icon: ArrowDownCircle, title: "Re-Entry Prediction", desc: "Predict uncontrolled re-entry windows for decaying space objects.", section: "reentry-prediction", category: "Debris" },
  { icon: AlertTriangle, title: "Kessler Syndrome Sim", desc: "3D interactive cascade collision simulator with real-time particle physics.", section: "kessler", category: "Debris" },

  // Live Data & Tracking
  { icon: Radar, title: "Satellite Dashboard", desc: "Global satellite statistics from CelesTrak — active, debris, and rocket bodies.", section: "sat-dashboard", category: "Live Data" },
  { icon: Zap, title: "Space Weather (DONKI)", desc: "NASA DONKI solar flares, CMEs, and geomagnetic storm monitoring.", section: "space-weather", category: "Live Data" },
  { icon: Globe, title: "ISS Tracker", desc: "Live ISS position on a Leaflet map with crew roster and mission timers.", section: "iss-tracker", category: "Live Data" },
  { icon: Star, title: "Astronomy Picture of the Day", desc: "NASA's daily APOD image with HD link and explanation.", section: "apod", category: "Live Data" },
  { icon: Calendar, title: "Space Events", desc: "Upcoming space events from The Space Devs — EVAs, dockings, launches.", section: "space-events", category: "Live Data" },
  { icon: Rocket, title: "Upcoming Launches", desc: "Next scheduled rocket launches worldwide with countdown timers.", section: "upcoming-launches", category: "Live Data" },
  { icon: Flame, title: "NEO Asteroids", desc: "Near-Earth Objects from NASA's NeoWs API with hazard assessment.", section: "neo-asteroids", category: "Live Data" },
  { icon: Activity, title: "Fireball Tracker", desc: "JPL fireball and bolide events plotted with energy and location data.", section: "fireball-tracker", category: "Live Data" },
  { icon: CloudLightning, title: "Earth Events (EONET)", desc: "NASA EONET natural events — wildfires, storms, volcanic activity.", section: "earth-events", category: "Live Data" },
  { icon: Newspaper, title: "Space News", desc: "Latest spaceflight news articles from the Spaceflight News API.", section: "space-news", category: "Live Data" },

  // Astronomy & Sky
  { icon: Map, title: "Sky Map", desc: "Real-time star chart using Astronomy Engine with constellation overlays.", section: "sky-map", category: "Astronomy" },
  { icon: Eye, title: "Planet Visibility & Orrery", desc: "Interactive solar system orrery with real-time planet positions, distances, and visibility.", section: "planet-visibility", category: "Astronomy" },
  { icon: Sparkles, title: "Aurora Forecast", desc: "NOAA Kp index forecast and OVATION aurora probability maps.", section: "aurora-forecast", category: "Astronomy" },
  { icon: Sun, title: "Live Solar Imagery", desc: "NASA SDO real-time Sun images across 10 EUV and visible wavelengths.", section: "solar-imagery", category: "Astronomy" },

  // Reference & Tools
  { icon: Database, title: "Rocket Engine Database", desc: "Comprehensive database of rocket engines with thrust, Isp, and propellant data.", section: "rocket-engines", category: "Tools" },
  { icon: Binary, title: "Mars Rover Gallery", desc: "Latest photos from Curiosity and Perseverance rovers on Mars.", section: "mars-rover", category: "Tools" },
  { icon: Cpu, title: "Mission Analyzer", desc: "Delta-v calculator and mission planning tool for orbital transfers.", section: "mission-analyzer", category: "Tools" },
  { icon: Bot, title: "K2 Space Chat", desc: "AI-powered space assistant for questions about orbits, missions, and debris.", section: "space-chat", category: "Tools" },

  // Community
  { icon: Image, title: "Gallery", desc: "Curated gallery of mission renders, concept art, and space imagery.", section: "gallery", category: "Community" },
  { icon: Users, title: "Team", desc: "Meet the Debrix mission team and their roles.", section: "team", category: "Community" },
  { icon: Mail, title: "Contact", desc: "Get in touch — send messages directly from the website.", section: "contact", category: "Community" },
];

const categories = ["Mission", "Simulation", "Debris", "Live Data", "Astronomy", "Tools", "Community"];

const categoryColors: Record<string, string> = {
  Mission: "from-primary/20 to-accent/10 border-primary/30",
  Simulation: "from-accent/20 to-primary/10 border-accent/30",
  Debris: "from-destructive/15 to-primary/10 border-destructive/30",
  "Live Data": "from-primary/15 to-accent/15 border-primary/25",
  Astronomy: "from-accent/15 to-primary/15 border-accent/25",
  Tools: "from-secondary/40 to-primary/10 border-secondary",
  Community: "from-primary/10 to-secondary/30 border-primary/20",
};

const categoryIcons: Record<string, typeof Rocket> = {
  Mission: Rocket,
  Simulation: Gauge,
  Debris: Satellite,
  "Live Data": Radio,
  Astronomy: Telescope,
  Tools: Cpu,
  Community: Users,
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const Features = () => {
  const navigate = useNavigate();

  const goToSection = useCallback((section: string) => {
    navigate("/");
    setTimeout(() => {
      const el = document.getElementById(section);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 300);
  }, [navigate]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Starfield />

      {/* Header */}
      <div className="relative z-10 pt-20 pb-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-display mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">
              Platform Overview
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-3">
              All {features.length} Features
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm leading-relaxed">
              From real-time debris tracking to AI-powered collision avoidance — explore every tool and data feed built into the Debrix platform.
            </p>
          </motion.div>

          {/* Quick category nav */}
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-8 sm:mb-12">
            {categories.map((cat) => {
              const Icon = categoryIcons[cat];
              const count = features.filter((f) => f.category === cat).length;
              return (
                <a
                  key={cat}
                  href={`#cat-${cat.toLowerCase().replace(/\s/g, "-")}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[10px] sm:text-xs font-display tracking-wider border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat}
                  <span className="text-[10px] bg-secondary/60 px-1.5 py-0.5 rounded-full">{count}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="relative z-10 px-4 sm:px-6 pb-20">
        <div className="max-w-7xl mx-auto space-y-10 sm:space-y-16">
          {categories.map((cat) => {
            const catFeatures = features.filter((f) => f.category === cat);
            const CatIcon = categoryIcons[cat];
            return (
              <section key={cat} id={`cat-${cat.toLowerCase().replace(/\s/g, "-")}`}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-3 mb-6"
                >
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <CatIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold">{cat}</h2>
                    <p className="text-xs text-muted-foreground">{catFeatures.length} features</p>
                  </div>
                </motion.div>

                <motion.div
                  variants={container}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.1 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
                >
                  {catFeatures.map((feat) => {
                    const Icon = feat.icon;
                    return (
                      <motion.div
                        key={feat.section}
                        variants={item}
                        onClick={() => goToSection(feat.section)}
                        className={`group relative rounded-xl border bg-gradient-to-br ${categoryColors[cat]} p-4 sm:p-5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 cursor-pointer`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 rounded-lg bg-background/50 border border-border/30 group-hover:border-primary/30 transition-colors">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h3 className="font-display font-semibold text-sm mb-1.5 group-hover:text-primary transition-colors">
                          {feat.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {feat.desc}
                        </p>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="relative z-10 pb-16 px-6">
        <div className="max-w-xl mx-auto text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary/10 border border-primary/30 text-primary font-display text-sm tracking-wider hover:bg-primary/20 transition-colors"
          >
            <Rocket className="w-4 h-4" />
            Explore the Platform
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Features;
