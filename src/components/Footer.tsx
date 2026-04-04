import { Satellite } from "lucide-react";
import redDragonLogo from "@/assets/red-dragon.png";

const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-border/20">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Satellite className="w-4 h-4 text-primary" />
              <span className="font-display font-bold text-sm tracking-widest gradient-text">DEBRIX</span>
            </div>
            <p className="text-muted-foreground text-xs max-w-xs leading-relaxed">
              Autonomous orbital debris removal. Tracking, analyzing, and cleaning Earth's orbital highways.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3">
            <div className="flex gap-4">
              <a href="https://github.com/Premchandyadav369" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-xs font-mono">
                GitHub
              </a>
              <a href="https://www.linkedin.com/in/v-c-premchand-yadav-a785691a2/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-xs font-mono">
                LinkedIn
              </a>
            </div>
            <div className="flex items-center gap-2">
              <img src={redDragonLogo} alt="Red Dragon" className="w-5 h-5 rounded-full object-cover" />
              <span className="text-[10px] font-mono text-muted-foreground">
                Built by <span className="text-destructive font-semibold">Team Red-Dragon</span> · India 🇮🇳
              </span>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground/60">
              © {new Date().getFullYear()} Debrix Project
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
