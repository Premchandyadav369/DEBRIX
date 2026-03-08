import { Satellite } from "lucide-react";

const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-border/30">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-display font-bold text-sm tracking-widest">
          <Satellite className="w-5 h-5 text-primary" />
          <span className="gradient-text">DEBRIX</span>
        </div>
        <p className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} Debrix Project. Cleaning orbits, one debris at a time.
        </p>
        <div className="flex gap-4">
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-xs font-display">GitHub</a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-xs font-display">LinkedIn</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
