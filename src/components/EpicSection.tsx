import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Globe, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const NASA_API_KEY = "WBkaFckn04xcJlW4NoleN07iZajebOJGZpT4LrZz";

interface EpicImage {
  identifier: string;
  caption: string;
  image: string;
  date: string;
  centroid_coordinates: { lat: number; lon: number };
}

function buildImageUrl(image: string, date: string): string {
  // date format from API: "2024-05-30 01:13:59"
  const d = date.split(" ")[0].split("-");
  return `https://epic.gsfc.nasa.gov/archive/natural/${d[0]}/${d[1]}/${d[2]}/png/${image}.png`;
}

const EpicSection = () => {
  const [images, setImages] = useState<EpicImage[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchEpic = useCallback(async () => {
    try {
      // Try fetching latest images
      let res = await fetch(`https://api.nasa.gov/EPIC/api/natural/images?api_key=${NASA_API_KEY}`);
      let data: EpicImage[] = [];
      
      if (res.ok) {
        data = await res.json();
      }
      
      // If empty or failed, try fetching available dates and get the most recent one
      if (!Array.isArray(data) || data.length === 0) {
        const datesRes = await fetch(`https://api.nasa.gov/EPIC/api/natural/available?api_key=${NASA_API_KEY}`);
        if (datesRes.ok) {
          const dates: string[] = await datesRes.json();
          if (dates.length > 0) {
            const latestDate = dates[dates.length - 1];
            const dateRes = await fetch(`https://api.nasa.gov/EPIC/api/natural/date/${latestDate}?api_key=${NASA_API_KEY}`);
            if (dateRes.ok) {
              data = await dateRes.json();
            }
          }
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        setImages(data);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEpic();
  }, [fetchEpic]);

  const current = images[index];

  return (
    <section id="epic" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">NASA EPIC</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Earth From Deep Space</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Full-disc imagery of Earth captured by DSCOVR's EPIC camera at the Lagrange Point 1, approximately 1.5 million km from Earth.
          </p>
        </motion.div>

        {loading ? (
          <div className="glass-card p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : current ? (
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="glass-card overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative aspect-square bg-background flex items-center justify-center">
                <img
                  src={buildImageUrl(current.image, current.date)}
                  alt={current.caption}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
                <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
                  <button
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                    disabled={index === 0}
                    className="w-8 h-8 rounded-full bg-background/80 flex items-center justify-center text-foreground disabled:opacity-30 hover:bg-primary/20 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-muted-foreground">{index + 1} / {images.length}</span>
                  <button
                    onClick={() => setIndex((i) => Math.min(images.length - 1, i + 1))}
                    disabled={index === images.length - 1}
                    className="w-8 h-8 rounded-full bg-background/80 flex items-center justify-center text-foreground disabled:opacity-30 hover:bg-primary/20 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 md:p-8 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-primary text-xs mb-3">
                  <Calendar className="w-3 h-3" />
                  <span className="font-display">{current.date}</span>
                </div>
                <h3 className="font-display font-bold text-lg mb-3">EPIC Earth Image</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mb-4">{current.caption}</p>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-primary" />
                    <span className="text-muted-foreground">Lat: <span className="text-foreground font-mono">{current.centroid_coordinates.lat.toFixed(2)}°</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-primary" />
                    <span className="text-muted-foreground">Lon: <span className="text-foreground font-mono">{current.centroid_coordinates.lon.toFixed(2)}°</span></span>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs mt-4">ID: <span className="font-mono text-foreground">{current.identifier}</span></p>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="glass-card p-12 text-center text-muted-foreground text-sm">Unable to load EPIC imagery.</div>
        )}
      </div>
    </section>
  );
};

export default EpicSection;
