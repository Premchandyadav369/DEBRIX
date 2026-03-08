import { useState, useEffect, useRef } from "react";
import { Menu, X, Sun, Moon, ChevronDown } from "lucide-react";
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
    ],
  },
  {
    label: "Media",
    items: [
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

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
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
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
