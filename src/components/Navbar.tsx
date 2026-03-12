import { useState, useEffect, useRef } from "react";
import { Menu, X, Sun, Moon, Sunrise, Sunset, Clock, ChevronDown, LayoutGrid } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import debrixLogo from "@/assets/debrix.png";
import { useTheme } from "@/hooks/use-theme";

const navGroups = [
  {
    label: "Mission",
    items: [
      { label: "Home", href: "#home" },
      { label: "Mission", href: "#mission" },
      { label: "Timeline", href: "#timeline" },
    ],
  },
  {
    label: "Simulation",
    items: [
      { label: "Launch Sim", href: "#launch-sim" },
      { label: "Dock & Dump", href: "#dock-dump" },
      { label: "Swarm", href: "#swarm" },
      { label: "AI Avoidance", href: "#collision-avoidance" },
    ],
  },
  {
    label: "Debris",
    items: [
      { label: "Tracker", href: "#debris-tracker" },
      { label: "Priority", href: "#debris-priority" },
      { label: "Growth", href: "#debris-growth" },
      { label: "Decay", href: "#orbital-decay" },
      { label: "Re-Entry", href: "#reentry-prediction" },
      { label: "Kessler", href: "#kessler" },
    ],
  },
  {
    label: "Data",
    items: [
      { label: "Telemetry", href: "#telemetry" },
      { label: "Dashboard", href: "#sat-dashboard" },
      { label: "Weather", href: "#space-weather" },
      { label: "ISS", href: "#iss-tracker" },
      { label: "Space Events", href: "#space-events" },
      { label: "Sky Map", href: "#sky-map" },
      { label: "Planets", href: "#planet-visibility" },
    ],
  },
  {
    label: "Reference",
    items: [
      { label: "Rocket Engines", href: "#rocket-engines" },
      { label: "Mission Analyzer", href: "#mission-analyzer" },
      { label: "Gallery", href: "#gallery" },
      { label: "Contact", href: "#contact" },
    ],
  },
];

function NavDropdown({ group }: { group: typeof navGroups[0] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors text-[11px] font-display tracking-wider uppercase px-3 py-2 rounded-md hover:bg-secondary/50"
      >
        {group.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 min-w-[160px] bg-card/95 backdrop-blur-lg border border-border/60 rounded-lg shadow-lg overflow-hidden z-50"
          >
            {group.items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-[11px] font-display tracking-wider text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const date = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
      <Clock className="w-3 h-3 text-primary" />
      <span className="text-foreground font-semibold">{time}</span>
      <span className="text-muted-foreground">·</span>
      <span>{date}</span>
    </div>
  );
}

const THEME_ICONS = {
  auto: Clock,
  dark: Moon,
  light: Sun,
} as const;

const THEME_LABELS: Record<string, string> = {
  auto: "Auto",
  dark: "Night",
  light: "Day",
};

const RESOLVED_LABELS: Record<string, string> = {
  dawn: "🌅 Dawn",
  day: "☀️ Day",
  dusk: "🌆 Dusk",
  night: "🌙 Night",
};

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { mode, resolved, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ThemeIcon = THEME_ICONS[mode];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-lg border-b border-border/30" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <a href="#home" className="flex items-center gap-2 font-display font-bold text-lg tracking-widest">
          <img src={debrixLogo} alt="DEBRIX" className="h-10 w-auto" />
        </a>

        <div className="hidden lg:flex items-center gap-0.5">
          {navGroups.map((group) => (
            <NavDropdown key={group.label} group={group} />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <LiveClock />

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary text-foreground transition-colors flex items-center gap-1.5"
            aria-label="Toggle theme"
            title={`Mode: ${THEME_LABELS[mode]} · Currently: ${RESOLVED_LABELS[resolved]}`}
          >
            <ThemeIcon size={16} />
            <span className="hidden md:inline text-[10px] font-display tracking-wider text-muted-foreground">
              {mode === "auto" ? RESOLVED_LABELS[resolved] : THEME_LABELS[mode]}
            </span>
          </button>

          <Link
            to="/features"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-display tracking-wider uppercase text-muted-foreground hover:text-primary transition-colors"
          >
            <LayoutGrid className="w-3 h-3" />
            Features
          </Link>
          <a
            href="#contact"
            className="hidden lg:inline-flex px-4 py-1.5 text-[11px] font-display tracking-wider uppercase border border-primary/40 text-primary rounded-md hover:bg-primary/10 transition-colors"
          >
            Get In Touch
          </a>
          <button onClick={() => setOpen(!open)} className="lg:hidden text-foreground">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-background/95 backdrop-blur-lg border-b border-border/30 max-h-[70vh] overflow-y-auto"
          >
            {/* Mobile clock */}
            <div className="flex items-center justify-center gap-2 py-3 border-b border-border/20">
              <LiveClock />
            </div>
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="px-6 pt-4 pb-1 text-[10px] font-display tracking-[0.2em] text-primary uppercase">
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block px-8 py-2.5 text-muted-foreground hover:text-primary text-sm font-display tracking-wider"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            ))}
            {/* Features link in mobile */}
            <div className="border-t border-border/20 pt-3 pb-2 px-6">
              <Link
                to="/features"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 py-2.5 text-primary text-sm font-display tracking-wider"
              >
                <LayoutGrid className="w-4 h-4" />
                All Features
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
