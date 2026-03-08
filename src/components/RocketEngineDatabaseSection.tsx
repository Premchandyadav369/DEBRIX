import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Flame, Gauge, Fuel, Factory, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface RocketEngine {
  name: string;
  manufacturer: string;
  country: string;
  thrust_kn: number;
  thrust_vac_kn: number;
  isp_sl: number;
  isp_vac: number;
  fuel: string;
  oxidizer: string;
  cycle: string;
  chambers: number;
  status: "Active" | "Retired" | "Development";
  rocket: string;
  first_flight: string;
  description: string;
}

const ENGINES: RocketEngine[] = [
  { name: "Raptor 3", manufacturer: "SpaceX", country: "🇺🇸", thrust_kn: 2747, thrust_vac_kn: 2944, isp_sl: 350, isp_vac: 380, fuel: "Liquid Methane", oxidizer: "LOX", cycle: "Full-Flow Staged Combustion", chambers: 1, status: "Active", rocket: "Starship / Super Heavy", first_flight: "2024", description: "SpaceX's third-generation Raptor engine, simplified design with fewer parts, higher thrust, and improved reliability." },
  { name: "Merlin 1D+", manufacturer: "SpaceX", country: "🇺🇸", thrust_kn: 845, thrust_vac_kn: 981, isp_sl: 282, isp_vac: 311, fuel: "RP-1", oxidizer: "LOX", cycle: "Gas Generator", chambers: 1, status: "Active", rocket: "Falcon 9 / Falcon Heavy", first_flight: "2013", description: "Workhorse engine of the Falcon 9, known for reliability and reusability. Over 1000 successful flights." },
  { name: "RS-25", manufacturer: "Aerojet Rocketdyne", country: "🇺🇸", thrust_kn: 1860, thrust_vac_kn: 2279, isp_sl: 366, isp_vac: 452, fuel: "LH2", oxidizer: "LOX", cycle: "Staged Combustion", chambers: 1, status: "Active", rocket: "SLS", first_flight: "1981", description: "Originally the Space Shuttle Main Engine, now powering NASA's Space Launch System. One of the most efficient engines ever built." },
  { name: "BE-4", manufacturer: "Blue Origin", country: "🇺🇸", thrust_kn: 2400, thrust_vac_kn: 2600, isp_sl: 310, isp_vac: 340, fuel: "Liquid Methane", oxidizer: "LOX", cycle: "Ox-Rich Staged Combustion", chambers: 1, status: "Active", rocket: "Vulcan / New Glenn", first_flight: "2024", description: "Blue Origin's flagship engine powering both ULA's Vulcan Centaur and Blue Origin's New Glenn." },
  { name: "RD-180", manufacturer: "NPO Energomash", country: "🇷🇺", thrust_kn: 3827, thrust_vac_kn: 4152, isp_sl: 311, isp_vac: 338, fuel: "RP-1", oxidizer: "LOX", cycle: "Staged Combustion", chambers: 2, status: "Retired", rocket: "Atlas V", first_flight: "2000", description: "Russian-designed engine that powered the Atlas V first stage. Known for exceptional performance and twin-chamber design." },
  { name: "Vulcain 2.1", manufacturer: "ArianeGroup", country: "🇪🇺", thrust_kn: 1359, thrust_vac_kn: 1359, isp_sl: 318, isp_vac: 434, fuel: "LH2", oxidizer: "LOX", cycle: "Gas Generator", chambers: 1, status: "Active", rocket: "Ariane 6", first_flight: "2024", description: "Main engine for Europe's Ariane 6, an evolution of the Vulcain 2 with improved manufacturing." },
  { name: "CE-20", manufacturer: "ISRO", country: "🇮🇳", thrust_kn: 186, thrust_vac_kn: 200, isp_sl: 410, isp_vac: 443, fuel: "LH2", oxidizer: "LOX", cycle: "Gas Generator", chambers: 1, status: "Active", rocket: "GSLV Mk III (LVM3)", first_flight: "2014", description: "India's indigenous cryogenic upper stage engine, key to ISRO's heavy-lift capability for Chandrayaan and Gaganyaan missions." },
  { name: "YF-100K", manufacturer: "AALPT / CASC", country: "🇨🇳", thrust_kn: 1340, thrust_vac_kn: 1500, isp_sl: 300, isp_vac: 335, fuel: "RP-1", oxidizer: "LOX", cycle: "Staged Combustion", chambers: 1, status: "Active", rocket: "Long March 5 / 7", first_flight: "2015", description: "China's primary kerosene engine powering their heavy-lift rockets for space station and lunar missions." },
  { name: "Rutherford", manufacturer: "Rocket Lab", country: "🇳🇿", thrust_kn: 25, thrust_vac_kn: 26, isp_sl: 303, isp_vac: 343, fuel: "RP-1", oxidizer: "LOX", cycle: "Electric Pump Fed", chambers: 1, status: "Active", rocket: "Electron", first_flight: "2017", description: "World's first electric pump-fed engine. 3D-printed combustion chamber. Powers the small-sat launch vehicle Electron." },
  { name: "Prometheus", manufacturer: "ArianeGroup", country: "🇪🇺", thrust_kn: 1000, thrust_vac_kn: 1100, isp_sl: 320, isp_vac: 360, fuel: "Liquid Methane", oxidizer: "LOX", cycle: "Staged Combustion", chambers: 1, status: "Development", rocket: "Ariane Next", first_flight: "TBD", description: "Europe's next-gen reusable rocket engine. Target cost is 1/10th of Vulcain. Designed for 5+ reuses." },
  { name: "NK-33", manufacturer: "SNTK Kuznetsov", country: "🇷🇺", thrust_kn: 1510, thrust_vac_kn: 1680, isp_sl: 297, isp_vac: 331, fuel: "RP-1", oxidizer: "LOX", cycle: "Staged Combustion", chambers: 1, status: "Retired", rocket: "N1 / Antares (AJ26)", first_flight: "1974", description: "Originally built for the Soviet N1 Moon rocket. Decades later, refurbished engines flew on Orbital Sciences' Antares." },
  { name: "RL-10C", manufacturer: "Aerojet Rocketdyne", country: "🇺🇸", thrust_kn: 0, thrust_vac_kn: 110, isp_sl: 0, isp_vac: 453, fuel: "LH2", oxidizer: "LOX", cycle: "Expander", chambers: 1, status: "Active", rocket: "Centaur (Atlas V, Vulcan)", first_flight: "1963", description: "One of the longest-serving rocket engines in history. Uses expander cycle — one of the most efficient designs. Powers the Centaur upper stage." },
];

type SortKey = "name" | "thrust_kn" | "isp_vac" | "manufacturer";
type FuelFilter = "All" | "RP-1" | "LH2" | "Liquid Methane";
type StatusFilter = "All" | "Active" | "Retired" | "Development";

const RocketEngineDatabaseSection = () => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("thrust_kn");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [fuelFilter, setFuelFilter] = useState<FuelFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let engines = ENGINES.filter((e) => {
      if (search && !`${e.name} ${e.manufacturer} ${e.rocket} ${e.fuel}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (fuelFilter !== "All" && e.fuel !== fuelFilter) return false;
      if (statusFilter !== "All" && e.status !== statusFilter) return false;
      return true;
    });

    engines.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });

    return engines;
  }, [search, sortKey, sortDir, fuelFilter, statusFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <section id="rocket-engines" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Reference</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Rocket Engine Database</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Comprehensive specs for {ENGINES.length} rocket engines worldwide. Search, filter, and compare thrust, ISP, fuel types, and more.
          </p>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Flame, label: "Engines", value: ENGINES.length.toString(), color: "text-primary" },
            { icon: Gauge, label: "Max Thrust", value: `${Math.max(...ENGINES.map((e) => e.thrust_vac_kn)).toLocaleString()} kN`, color: "text-destructive" },
            { icon: Fuel, label: "Fuel Types", value: [...new Set(ENGINES.map((e) => e.fuel))].length.toString(), color: "text-accent" },
            { icon: Factory, label: "Manufacturers", value: [...new Set(ENGINES.map((e) => e.manufacturer))].length.toString(), color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="glass-card p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search engines, rockets, manufacturers..."
                className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-border/60 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              {(["All", "RP-1", "LH2", "Liquid Methane"] as FuelFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFuelFilter(f)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-display tracking-wider border transition-colors ${
                    fuelFilter === f ? "bg-primary/20 text-primary border-primary/40" : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {(["All", "Active", "Retired", "Development"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-display tracking-wider border transition-colors ${
                    statusFilter === s ? "bg-accent/20 text-accent border-accent/40" : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-3 font-display tracking-wider cursor-pointer hover:text-primary" onClick={() => toggleSort("name")}>
                    <span className="flex items-center gap-1">Engine <SortIcon col="name" /></span>
                  </th>
                  <th className="text-left p-3 font-display tracking-wider cursor-pointer hover:text-primary" onClick={() => toggleSort("manufacturer")}>
                    <span className="flex items-center gap-1">Manufacturer <SortIcon col="manufacturer" /></span>
                  </th>
                  <th className="text-right p-3 font-display tracking-wider cursor-pointer hover:text-primary" onClick={() => toggleSort("thrust_kn")}>
                    <span className="flex items-center justify-end gap-1">Thrust (kN) <SortIcon col="thrust_kn" /></span>
                  </th>
                  <th className="text-right p-3 font-display tracking-wider cursor-pointer hover:text-primary" onClick={() => toggleSort("isp_vac")}>
                    <span className="flex items-center justify-end gap-1">ISP Vac (s) <SortIcon col="isp_vac" /></span>
                  </th>
                  <th className="text-left p-3 font-display tracking-wider hidden md:table-cell">Fuel</th>
                  <th className="text-left p-3 font-display tracking-wider hidden lg:table-cell">Cycle</th>
                  <th className="text-center p-3 font-display tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((engine) => (
                  <>
                    <tr
                      key={engine.name}
                      onClick={() => setExpanded(expanded === engine.name ? null : engine.name)}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-foreground font-medium">{engine.country} {engine.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{engine.manufacturer}</td>
                      <td className="p-3 text-right font-mono text-primary">{engine.thrust_vac_kn > 0 ? engine.thrust_vac_kn.toLocaleString() : "—"}</td>
                      <td className="p-3 text-right font-mono text-accent">{engine.isp_vac}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{engine.fuel}</td>
                      <td className="p-3 text-muted-foreground hidden lg:table-cell text-[10px]">{engine.cycle}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          engine.status === "Active" ? "bg-accent/15 text-accent" :
                          engine.status === "Development" ? "bg-primary/15 text-primary" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {engine.status}
                        </span>
                      </td>
                    </tr>
                    {expanded === engine.name && (
                      <tr key={`${engine.name}-detail`} className="border-b border-border/50 bg-secondary/20">
                        <td colSpan={7} className="p-4">
                          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Sea Level Thrust</p>
                              <p className="font-mono text-sm text-foreground">{engine.thrust_kn > 0 ? `${engine.thrust_kn.toLocaleString()} kN` : "N/A (upper stage)"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Sea Level ISP</p>
                              <p className="font-mono text-sm text-foreground">{engine.isp_sl > 0 ? `${engine.isp_sl} s` : "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Oxidizer</p>
                              <p className="font-mono text-sm text-foreground">{engine.oxidizer}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Chambers</p>
                              <p className="font-mono text-sm text-foreground">{engine.chambers}</p>
                            </div>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Used On</p>
                              <p className="text-sm text-foreground">{engine.rocket}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">First Flight</p>
                              <p className="text-sm text-foreground">{engine.first_flight}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{engine.description}</p>
                          {/* Thrust comparison bar */}
                          <div className="mt-3">
                            <p className="text-[10px] text-muted-foreground mb-1">Vacuum Thrust (relative)</p>
                            <div className="w-full h-3 bg-secondary/50 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                                style={{ width: `${(engine.thrust_vac_kn / Math.max(...ENGINES.map((e) => e.thrust_vac_kn))) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">No engines match your filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default RocketEngineDatabaseSection;
