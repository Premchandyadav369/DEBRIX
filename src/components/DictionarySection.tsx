import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, BookOpen, X } from "lucide-react";

type Entry = {
  term: string;
  full?: string;
  short: string;
  long: string;
  category: "Orbits" | "Debris" | "Spacecraft" | "Physics" | "Data" | "Missions";
};

const ENTRIES: Entry[] = [
  // Orbits
  { term: "LEO", full: "Low Earth Orbit", short: "The lowest 'lane' around Earth, roughly 160–2,000 km up.", long: "Where the ISS, most satellites, and almost all space junk live. Cheap to reach, but crowded — that's why debris is such a big deal here.", category: "Orbits" },
  { term: "MEO", full: "Medium Earth Orbit", short: "The middle lane, around 2,000 km up to ~35,000 km.", long: "Home to GPS and other navigation satellites. Less crowded than LEO, takes longer to orbit Earth.", category: "Orbits" },
  { term: "GEO", full: "Geostationary Orbit", short: "35,786 km up — a satellite up here looks frozen in the sky.", long: "Because the satellite orbits at the same speed Earth spins, it sits over one spot. Used for TV, weather, and communications satellites.", category: "Orbits" },
  { term: "SSO", full: "Sun-Synchronous Orbit", short: "A clever LEO that always passes a place at the same local time.", long: "Perfect for Earth-observation satellites — every photo of a city is taken at roughly the same time of day, so shadows and lighting match up.", category: "Orbits" },
  { term: "Apogee", short: "The highest point of an orbit.", long: "When something is going around Earth in an oval (not a circle), the apogee is the far end — farthest from Earth, moving slowest.", category: "Orbits" },
  { term: "Perigee", short: "The lowest point of an orbit.", long: "The opposite of apogee — closest to Earth, moving fastest. Think of a roller coaster zooming through the bottom of a loop.", category: "Orbits" },
  { term: "Inclination", short: "How tilted an orbit is compared to the equator.", long: "0° means circling around the equator. 90° means going over the poles. The ISS sits around 51.6° so it can see most of Earth's population.", category: "Orbits" },
  { term: "RAAN", full: "Right Ascension of Ascending Node", short: "Which direction the orbit's tilt points to.", long: "Imagine spinning a tilted ring around Earth — RAAN tells you which way the ring is rotated. Needed to know exactly where a satellite will be.", category: "Orbits" },

  // Debris
  { term: "TLE", full: "Two-Line Element set", short: "Two lines of numbers that describe where a satellite is and how it moves.", long: "A standard format invented by NORAD. We feed TLEs into math (called SGP4) to predict where every satellite and debris piece will be.", category: "Debris" },
  { term: "Conjunction", short: "A close encounter — two objects getting uncomfortably close in space.", long: "Operators get alerts when objects come within a few kilometers. If the risk is high, satellites fire thrusters to dodge.", category: "Debris" },
  { term: "Kessler Syndrome", short: "A nightmare chain reaction where space crashes create more crashes.", long: "Proposed by Donald Kessler in 1978. One collision creates thousands of fragments, each capable of starting more collisions — potentially making whole orbits unusable.", category: "Debris" },
  { term: "Orbital Decay", short: "Slow fall back to Earth caused by tiny bits of upper atmosphere.", long: "Even at 400 km up, there's a wisp of air. It drags on satellites, sapping speed until they spiral down and burn up. Solar storms speed this up.", category: "Debris" },
  { term: "Re-entry", short: "When something falls back into the atmosphere from orbit.", long: "Friction heats the object to thousands of degrees. Small things burn up completely; bigger ones can survive and reach the ground.", category: "Debris" },
  { term: "SPOUA", full: "South Pacific Ocean Uninhabited Area", short: "A patch of empty ocean where old spacecraft are dropped on purpose.", long: "Also called the 'spacecraft cemetery.' It's huge, empty, and far from anyone — the safest place on Earth to land deorbited junk.", category: "Debris" },

  // Spacecraft
  { term: "Attitude", short: "Which way a spacecraft is pointed.", long: "Not the same as height. 'Attitude control' means rotating the spacecraft so its solar panels face the Sun and its antenna faces Earth.", category: "Spacecraft" },
  { term: "ADCS", full: "Attitude Determination and Control System", short: "The system that figures out which way the satellite is facing and rotates it.", long: "Uses sensors (stars, sun, gyros) to know its orientation, and reaction wheels or thrusters to spin to the right direction.", category: "Spacecraft" },
  { term: "Reaction Wheel", short: "A spinning wheel inside the satellite used to rotate it without using fuel.", long: "Newton's 3rd law: spin the wheel one way, the satellite spins the opposite way. Quiet, precise, and reusable.", category: "Spacecraft" },
  { term: "Thruster", short: "A small rocket on the satellite for nudges and turns.", long: "Used for changing orbit, dodging debris, or precise pointing. Different fuels — chemical for big pushes, ion for slow but efficient ones.", category: "Spacecraft" },
  { term: "Bus", short: "The 'chassis' of a satellite — everything except the mission payload.", long: "Like the frame of a car. The bus provides power, communication, computing, and pointing for whatever instrument is on top.", category: "Spacecraft" },
  { term: "Payload", short: "The actual mission tool a satellite carries.", long: "A camera, telescope, radar, or — in Debrix's case — a robotic arm for grabbing debris. The bus exists to keep the payload alive.", category: "Spacecraft" },

  // Physics
  { term: "Delta-v", short: "How much 'oomph' (speed change) a maneuver needs.", long: "Pronounced 'delta-vee.' Measured in m/s. Bigger delta-v means more fuel. Going from Earth to Mars takes ~6 km/s of delta-v.", category: "Physics" },
  { term: "Hohmann Transfer", short: "The most fuel-efficient way to move between two circular orbits.", long: "Fire engines once to enter an oval transfer orbit, then again at the other end to circularize. Slow, but cheap.", category: "Physics" },
  { term: "Escape Velocity", short: "The speed needed to break free of Earth's gravity forever.", long: "About 11.2 km/s from Earth's surface. Less if you're already in orbit. The Moon's escape velocity is much lower — only 2.4 km/s.", category: "Physics" },
  { term: "Microgravity", short: "The 'weightless' feeling on the ISS — gravity is still there, just falling with you.", long: "Astronauts aren't outside of gravity. They're in continuous free-fall around Earth. Their station falls with them, so everything floats.", category: "Physics" },
  { term: "Solar Pressure", short: "Sunlight itself pushes on satellites — a tiny but real force.", long: "Photons carry momentum. Over months, this can shift a satellite's orbit. Some 'solar sail' spacecraft use it as their main engine.", category: "Physics" },

  // Data
  { term: "TLE Epoch", short: "The exact moment a TLE was accurate.", long: "TLEs decay in accuracy over days. The epoch tells you 'this was the snapshot' — older snapshots can be off by kilometers.", category: "Data" },
  { term: "SGP4", short: "The math model that turns TLEs into satellite positions.", long: "Simplified General Perturbations 4. The standard tool everyone uses to predict orbits. Fast and good enough for most cases.", category: "Data" },
  { term: "Ephemeris", short: "A list of where a celestial object will be at given times.", long: "Plural is 'ephemerides.' Used for planets, satellites, asteroids — anything you need to point a telescope or antenna at.", category: "Data" },
  { term: "Ground Station", short: "The antenna on Earth that talks to a satellite.", long: "Satellites are only in view for a few minutes per pass. Ground stations download data, send commands, and check the satellite's health.", category: "Data" },
  { term: "Pass", short: "A window of time when a satellite flies over a spot on Earth.", long: "Most satellites only see your location 4–6 times a day, for ~5–10 minutes each. The Ground Station Pass Predictor on this site shows you when.", category: "Data" },

  // Missions
  { term: "EVA", full: "Extravehicular Activity", short: "A spacewalk — astronauts working outside the spacecraft.", long: "Risky and exhausting. Suits are basically tiny spaceships keeping the astronaut alive in vacuum. Each EVA is planned for months.", category: "Missions" },
  { term: "Docking", short: "Two spacecraft connecting in space.", long: "Modern docking is automatic — the two ships line up to within millimeters and lock. It's the basis of resupplying the ISS and Debrix's debris cleanup.", category: "Missions" },
  { term: "Deorbit Burn", short: "A rocket firing that drops a spacecraft out of orbit on purpose.", long: "Used to retire satellites safely. Done at the right moment to make sure the spacecraft lands in an empty ocean and not on a city.", category: "Missions" },
  { term: "Artemis", short: "NASA's program to return humans to the Moon — and beyond.", long: "Named after Apollo's twin sister. Artemis II takes a crew around the Moon; Artemis III aims to land near the lunar south pole.", category: "Missions" },
  { term: "CME", full: "Coronal Mass Ejection", short: "A huge blob of plasma and magnetic field hurled out by the Sun.", long: "If it hits Earth, it can knock out satellites, mess with GPS, and trigger auroras. The Space Weather section here tracks these.", category: "Missions" },
];

const CATEGORIES = ["All", "Orbits", "Debris", "Spacecraft", "Physics", "Data", "Missions"] as const;

const catTone: Record<string, string> = {
  Orbits: "bg-primary/15 text-primary border-primary/30",
  Debris: "bg-accent/15 text-accent border-accent/30",
  Spacecraft: "bg-primary/15 text-primary border-primary/30",
  Physics: "bg-accent/15 text-accent border-accent/30",
  Data: "bg-primary/15 text-primary border-primary/30",
  Missions: "bg-accent/15 text-accent border-accent/30",
};

export default function DictionarySection() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [open, setOpen] = useState<Entry | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ENTRIES.filter((e) => {
      const matchCat = cat === "All" || e.category === cat;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        e.term.toLowerCase().includes(q) ||
        e.full?.toLowerCase().includes(q) ||
        e.short.toLowerCase().includes(q) ||
        e.long.toLowerCase().includes(q)
      );
    });
  }, [query, cat]);

  return (
    <section id="dictionary" className="relative z-10">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" /> Glossary
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Space Dictionary</h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Every weird acronym and chunky term used on this site — explained the way you'd explain it to a friend over coffee. Tap any card for the long version.
          </p>
        </motion.div>

        {/* Search + filters */}
        <div className="glass-card p-4 mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 'LEO', 'delta-v', 'Kessler'…"
              className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-background/60 border border-border/50 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-3 py-1 rounded-full text-[11px] font-display tracking-wider border transition-all ${
                  cat === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card/40 text-muted-foreground border-border/40 hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Showing <span className="text-foreground font-medium">{filtered.length}</span> of {ENTRIES.length} terms
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((e) => (
            <motion.button
              key={e.term}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setOpen(e)}
              className="text-left p-4 rounded-xl glass-card hover:border-primary/40 transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    {e.term}
                  </h3>
                  {e.full && (
                    <p className="text-[10px] text-muted-foreground tracking-wider uppercase mt-0.5">
                      {e.full}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-display tracking-wider border ${catTone[e.category]}`}>
                  {e.category}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {e.short}
              </p>
            </motion.button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No matches. Try a shorter word, or pick a category above.
          </div>
        )}

        {/* Detail modal */}
        {open && (
          <div
            className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setOpen(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-lg w-full p-6 relative"
            >
              <button
                onClick={() => setOpen(null)}
                aria-label="Close"
                className="absolute top-3 right-3 p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-display tracking-wider border mb-3 ${catTone[open.category]}`}>
                {open.category}
              </span>
              <h3 className="font-display text-2xl font-bold mb-1">{open.term}</h3>
              {open.full && (
                <p className="text-xs text-primary/80 tracking-wider uppercase mb-4">{open.full}</p>
              )}
              <p className="text-sm text-foreground/90 mb-3 leading-relaxed">{open.short}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{open.long}</p>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
}
