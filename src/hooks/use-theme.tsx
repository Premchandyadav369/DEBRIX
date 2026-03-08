import { useState, useEffect, createContext, useContext, useCallback } from "react";

type ThemeMode = "auto" | "dark" | "light";
type ResolvedTheme = "dawn" | "day" | "dusk" | "night";

function getTimeTheme(): ResolvedTheme {
  const h = new Date().getHours();
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 17) return "day";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

function resolvedClass(theme: ResolvedTheme): string {
  return theme; // CSS class name matches
}

const ThemeContext = createContext<{
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
  theme: "dark" | "light"; // backwards compat
}>({
  mode: "auto",
  resolved: "night",
  setMode: () => {},
  toggleTheme: () => {},
  theme: "dark",
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("debrix-theme-mode") as ThemeMode) || "auto";
    }
    return "auto";
  });

  const [resolved, setResolved] = useState<ResolvedTheme>(() => {
    if (mode === "auto") return getTimeTheme();
    if (mode === "light") return "day";
    return "night";
  });

  const applyTheme = useCallback((r: ResolvedTheme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark", "dawn", "day", "dusk", "night");
    root.classList.add(resolvedClass(r));
    // Also set dark/light for shadcn compat
    if (r === "day" || r === "dawn") root.classList.add("light");
    else root.classList.add("dark");
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem("debrix-theme-mode", m);
  }, []);

  // Resolve theme when mode changes
  useEffect(() => {
    let r: ResolvedTheme;
    if (mode === "auto") r = getTimeTheme();
    else if (mode === "light") r = "day";
    else r = "night";
    setResolved(r);
    applyTheme(r);
  }, [mode, applyTheme]);

  // Auto-update every minute if in auto mode
  useEffect(() => {
    if (mode !== "auto") return;
    const interval = setInterval(() => {
      const r = getTimeTheme();
      setResolved(r);
      applyTheme(r);
    }, 60000);
    return () => clearInterval(interval);
  }, [mode, applyTheme]);

  const toggleTheme = useCallback(() => {
    setMode(mode === "auto" ? "dark" : mode === "dark" ? "light" : "auto");
  }, [mode, setMode]);

  const theme = (resolved === "day" || resolved === "dawn") ? "light" as const : "dark" as const;

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
