import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Telescope, MapPin, Star, Camera, Globe, Clock, Calendar, ExternalLink, Users } from "lucide-react";

interface TelescopeStation {
  id: string;
  name: string;
  location: string;
  country: string;
  lat: number;
  lon: number;
  aperture: string;
  type: string;
  specialties: string[];
  available: boolean;
  pricePerHour: number;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  timezone: string;
  elevation: string;
  seeing: string;
}

const TELESCOPES: TelescopeStation[] = [
  {
    id: "1", name: "Atacama Deep Sky Observatory", location: "Atacama Desert", country: "🇨🇱 Chile",
    lat: -24.63, lon: -70.40, aperture: "16\" CDK", type: "Corrected Dall-Kirkham",
    specialties: ["Deep Sky", "Astrophotography", "Galaxy Imaging"],
    available: true, pricePerHour: 25, rating: 4.9, reviews: 142,
    image: "🔭", description: "Located in one of the darkest skies on Earth. Bortle class 1. Specializes in deep-sky imaging with exceptional seeing conditions.",
    timezone: "UTC-3", elevation: "2,400m", seeing: "0.6\" avg",
  },
  {
    id: "2", name: "Mauna Kea Amateur Scope", location: "Hawaii, Big Island", country: "🇺🇸 USA",
    lat: 19.82, lon: -155.47, aperture: "12\" SCT", type: "Schmidt-Cassegrain",
    specialties: ["Planetary", "Lunar", "Solar System Objects"],
    available: true, pricePerHour: 35, rating: 4.7, reviews: 89,
    image: "🌋", description: "At 2,800m on the slopes of Mauna Kea. Outstanding planetary viewing above the inversion layer. Night sky tours available.",
    timezone: "UTC-10", elevation: "2,800m", seeing: "0.8\" avg",
  },
  {
    id: "3", name: "Namibia Star Safari", location: "Khomas Highland", country: "🇳🇦 Namibia",
    lat: -23.27, lon: 16.47, aperture: "20\" Newtonian", type: "Newtonian Reflector",
    specialties: ["Southern Sky", "Milky Way", "Magellanic Clouds"],
    available: false, pricePerHour: 20, rating: 4.8, reviews: 67,
    image: "🌌", description: "Remote farm stay with exceptional southern sky access. The Milky Way core is directly overhead. Best for large-scale photography.",
    timezone: "UTC+2", elevation: "1,800m", seeing: "0.7\" avg",
  },
  {
    id: "4", name: "La Palma Remote Observatory", location: "Canary Islands", country: "🇪🇸 Spain",
    lat: 28.76, lon: -17.88, aperture: "14\" RC", type: "Ritchey-Chrétien",
    specialties: ["Variable Stars", "Exoplanet Transits", "Photometry"],
    available: true, pricePerHour: 30, rating: 4.6, reviews: 203,
    image: "🏔️", description: "Part of the Roque de los Muchachos observatory complex. Professional-grade photometry equipment. Ideal for citizen science.",
    timezone: "UTC+0", elevation: "2,326m", seeing: "0.65\" avg",
  },
  {
    id: "5", name: "Australian Outback Scope", location: "Coonabarabran, NSW", country: "🇦🇺 Australia",
    lat: -31.27, lon: 149.13, aperture: "18\" Dobsonian", type: "Dobsonian",
    specialties: ["Visual Observing", "Star Parties", "Education"],
    available: true, pricePerHour: 15, rating: 4.5, reviews: 56,
    image: "🦘", description: "Near Siding Spring Observatory. Outstanding visual observing with massive light bucket. Perfect for beginners and groups.",
    timezone: "UTC+10", elevation: "1,100m", seeing: "1.2\" avg",
  },
  {
    id: "6", name: "Tenerife Solar Scope", location: "Izaña, Tenerife", country: "🇪🇸 Spain",
    lat: 28.30, lon: -16.51, aperture: "6\" Solar Refractor", type: "H-Alpha Solar",
    specialties: ["Solar Observation", "Prominences", "Sunspots"],
    available: true, pricePerHour: 20, rating: 4.4, reviews: 38,
    image: "☀️", description: "Dedicated solar telescope with H-alpha filter. Watch solar prominences, sunspots, and chromospheric features in real time.",
    timezone: "UTC+0", elevation: "2,390m", seeing: "0.9\" avg",
  },
];

const TelescopeNetworkSection = () => {
  const [selectedScope, setSelectedScope] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");

  const filtered = useMemo(() => {
    if (filter === "All") return TELESCOPES;
    if (filter === "Available") return TELESCOPES.filter((t) => t.available);
    return TELESCOPES.filter((t) => t.specialties.some((s) => s.toLowerCase().includes(filter.toLowerCase())));
  }, [filter]);

  const selected = TELESCOPES.find((t) => t.id === selectedScope);

  return (
    <section id="telescope-network" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Global Network</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Telescope Network</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Connect with telescope owners worldwide. Book remote observing time, access live feeds, and share the cosmos.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Telescope, label: "Telescopes", value: TELESCOPES.length.toString(), color: "text-primary" },
            { icon: Globe, label: "Countries", value: [...new Set(TELESCOPES.map((t) => t.country))].length.toString(), color: "text-accent" },
            { icon: Star, label: "Avg Rating", value: (TELESCOPES.reduce((s, t) => s + t.rating, 0) / TELESCOPES.length).toFixed(1), color: "text-primary" },
            { icon: Users, label: "Total Reviews", value: TELESCOPES.reduce((s, t) => s + t.reviews, 0).toString(), color: "text-accent" },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* World map visualization */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-6 mb-8">
          <p className="font-display text-xs tracking-wider text-muted-foreground mb-4">TELESCOPE LOCATIONS</p>
          <div className="relative w-full h-[200px] bg-[hsl(220,25%,8%)] rounded-lg overflow-hidden border border-border/30">
            <svg viewBox="0 0 360 180" className="w-full h-full" preserveAspectRatio="none">
              {Array.from({ length: 7 }, (_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 30} x2="360" y2={i * 30} stroke="hsl(220, 18%, 18%)" strokeWidth="0.5" />
              ))}
              {Array.from({ length: 13 }, (_, i) => (
                <line key={`v${i}`} x1={i * 30} y1="0" x2={i * 30} y2="180" stroke="hsl(220, 18%, 18%)" strokeWidth="0.5" />
              ))}
              <line x1="0" y1="90" x2="360" y2="90" stroke="hsl(190, 85%, 52%)" strokeWidth="0.3" opacity="0.3" />
              {/* Simplified continents */}
              <path d="M80,35 L95,32 L100,40 L110,42 L115,50 L105,55 L95,52 L85,45 Z" fill="hsl(160, 70%, 30%)" opacity="0.25" />
              <path d="M160,30 L200,25 L220,35 L230,50 L225,65 L210,75 L195,70 L180,55 L165,40 Z" fill="hsl(160, 70%, 30%)" opacity="0.25" />
              <path d="M270,55 L310,50 L320,70 L315,90 L290,85 L275,70 Z" fill="hsl(160, 70%, 30%)" opacity="0.25" />
              <path d="M60,75 L90,68 L100,80 L95,95 L80,105 L70,120 L55,115 L50,100 L55,85 Z" fill="hsl(160, 70%, 30%)" opacity="0.25" />
              {TELESCOPES.map((t) => {
                const x = t.lon + 180;
                const y = 90 - t.lat;
                return (
                  <g key={t.id}>
                    <circle cx={x} cy={y} r={4} fill={t.available ? "hsl(190, 85%, 52%)" : "hsl(215, 15%, 55%)"} opacity={0.9} />
                    <circle cx={x} cy={y} r={8} fill={t.available ? "hsl(190, 85%, 52%)" : "hsl(215, 15%, 55%)"} opacity={0.15} />
                    <text x={x} y={y - 7} textAnchor="middle" fill="hsl(210, 30%, 80%)" fontSize="4.5" fontFamily="Space Grotesk">{t.name.split(" ")[0]}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["All", "Available", "Deep Sky", "Planetary", "Solar", "Astrophotography"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded-full border transition-colors ${
                filter === f ? "bg-primary/20 text-primary border-primary/40" : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Telescope cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((scope) => (
            <motion.div
              key={scope.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              onClick={() => setSelectedScope(selectedScope === scope.id ? null : scope.id)}
              className={`glass-card overflow-hidden cursor-pointer transition-all ${
                selectedScope === scope.id ? "border-primary/60 ring-1 ring-primary/20" : "hover:border-primary/40"
              }`}
            >
              {/* Header with emoji "image" */}
              <div className="h-24 bg-gradient-to-br from-secondary/80 to-background flex items-center justify-center text-4xl">
                {scope.image}
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-display font-semibold text-sm text-foreground leading-tight">{scope.name}</h4>
                    <p className="text-[10px] text-muted-foreground">{scope.country} · {scope.location}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${scope.available ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>
                    {scope.available ? "Available" : "Booked"}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">{scope.description}</p>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center gap-1"><Telescope className="w-3 h-3 text-primary" /> {scope.aperture}</div>
                  <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-accent" /> {scope.elevation}</div>
                  <div className="flex items-center gap-1"><Star className="w-3 h-3 text-primary" /> {scope.rating} ({scope.reviews})</div>
                  <div className="flex items-center gap-1"><Clock className="w-3 h-3 text-muted-foreground" /> {scope.timezone}</div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {scope.specialties.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-[10px] bg-secondary/50 text-muted-foreground">{s}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-sm font-display font-bold text-primary">${scope.pricePerHour}/hr</span>
                  <button
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-display tracking-wider transition-colors ${
                      scope.available ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {scope.available ? "Book Session" : "Join Waitlist"}
                  </button>
                </div>

                {/* Expanded details */}
                {selectedScope === scope.id && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-3 border-t border-border/40 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground">{scope.type}</span></div>
                      <div><span className="text-muted-foreground">Seeing:</span> <span className="text-foreground">{scope.seeing}</span></div>
                      <div><span className="text-muted-foreground">Lat:</span> <span className="font-mono text-foreground">{scope.lat}°</span></div>
                      <div><span className="text-muted-foreground">Lon:</span> <span className="font-mono text-foreground">{scope.lon}°</span></div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TelescopeNetworkSection;
