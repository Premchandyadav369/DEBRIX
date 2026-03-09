import { Satellite } from "lucide-react";
import redDragonLogo from "@/assets/red-dragon.png";

const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-border/30">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col items-center gap-6">
        {/* Top row */}
        <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
          <div className="flex items-center gap-2 font-display font-bold text-sm tracking-widest">
            <Satellite className="w-5 h-5 text-primary" />
            <span className="gradient-text">DEBRIX</span>
          </div>
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} Debrix Project. Cleaning orbits, one debris at a time.
          </p>
          <div className="flex gap-4">
            <a href="https://github.com/Premchandyadav369" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-xs font-display">GitHub</a>
            <a href="https://www.linkedin.com/in/v-c-premchand-yadav-a785691a2/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-xs font-display">LinkedIn</a>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full border-t border-border/20" />

        {/* Made by section */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <img src={redDragonLogo} alt="Red Dragon Logo" className="w-8 h-8 rounded-full object-cover" />
            <p className="font-display text-sm font-semibold tracking-wide text-foreground">
              Made by <span className="text-red-500">TEAM RED-DRAGON</span> 🐉🔥
            </p>
          </div>
          <p className="text-muted-foreground text-xs text-center">
            🌍 Made by humans on Earth • 🚀 For the future of space • ✨ With passion & code • 💙 From India 🇮🇳
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
