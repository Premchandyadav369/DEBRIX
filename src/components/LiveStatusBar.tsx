import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FEEDS = [
  { id: "satellite-stats-proxy", label: "CATALOG" },
  { id: "launches-proxy", label: "LAUNCHES" },
  { id: "celestrak-proxy", label: "CELESTRAK" },
  { id: "artemis-proxy", label: "ARTEMIS" },
];

type S = "checking" | "ok" | "down";

const LiveStatusBar = () => {
  const [status, setStatus] = useState<Record<string, S>>({});
  const [utc, setUtc] = useState(new Date());

  useEffect(() => {
    const check = () =>
      FEEDS.forEach(async (f) => {
        try {
          const { error } = await supabase.functions.invoke(f.id);
          setStatus((s) => ({ ...s, [f.id]: error ? "down" : "ok" }));
        } catch {
          setStatus((s) => ({ ...s, [f.id]: "down" }));
        }
      });
    check();
    const t = setInterval(check, 120000);
    const c = setInterval(() => setUtc(new Date()), 1000);
    return () => { clearInterval(t); clearInterval(c); };
  }, []);

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 hidden md:flex items-center gap-4 px-4 py-1 bg-background/85 backdrop-blur border-t border-border text-[10px] font-mono">
      <span className="text-primary">UTC {utc.toISOString().slice(11, 19)}</span>
      {FEEDS.map((f) => {
        const s = status[f.id] ?? "checking";
        return (
          <span key={f.id} className="flex items-center gap-1 text-muted-foreground">
            <span className={`w-1.5 h-1.5 rounded-full ${s === "ok" ? "bg-accent" : s === "down" ? "bg-muted-foreground" : "bg-primary animate-pulse"}`} />
            {f.label}
          </span>
        );
      })}
      <span className="ml-auto text-muted-foreground">DEBRIX LIVE FEEDS</span>
    </div>
  );
};

export default LiveStatusBar;
