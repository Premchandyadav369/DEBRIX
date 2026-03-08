import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import debrixLogo from "@/assets/debrix.png";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Mission", href: "#mission" },
  { label: "Launch", href: "#launch-sim" },
  { label: "Timeline", href: "#timeline" },
  { label: "Telemetry", href: "#telemetry" },
  { label: "Dock & Dump", href: "#dock-dump" },
  { label: "Swarm", href: "#swarm" },
  { label: "AI Avoidance", href: "#collision-avoidance" },
  { label: "Debris", href: "#debris-tracker" },
  { label: "Priority", href: "#debris-priority" },
  { label: "Growth", href: "#debris-growth" },
  { label: "Decay", href: "#orbital-decay" },
  { label: "Kessler", href: "#kessler" },
  { label: "Dashboard", href: "#sat-dashboard" },
  { label: "Weather", href: "#space-weather" },
  { label: "ISS", href: "#iss-tracker" },
  { label: "Gallery", href: "#gallery" },
  { label: "Contact", href: "#contact" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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

        <div className="hidden lg:flex items-center gap-1">
          <div className="flex items-center gap-1 overflow-x-auto max-w-[900px] scrollbar-none">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="text-muted-foreground hover:text-primary transition-colors text-[10px] font-display tracking-wider uppercase whitespace-nowrap px-2 py-1">
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <button onClick={() => setOpen(!open)} className="lg:hidden text-foreground">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="lg:hidden bg-background/95 backdrop-blur-lg border-b border-border/30 max-h-[70vh] overflow-y-auto">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="block px-6 py-3 text-muted-foreground hover:text-primary text-sm font-display tracking-wider">
                {item.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
