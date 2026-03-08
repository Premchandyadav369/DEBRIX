import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, ExternalLink } from "lucide-react";

const API_KEY = "WBkaFckn04xcJlW4NoleN07iZajebOJGZpT4LrZz";

interface ApodData {
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  date: string;
  media_type: string;
  copyright?: string;
}

const ApodSection = () => {
  const [apod, setApod] = useState<ApodData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://api.nasa.gov/planetary/apod?api_key=${API_KEY}`)
      .then((res) => res.json())
      .then((data) => {
        setApod(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section id="apod" className="relative z-10">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">NASA Feed</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Astronomy Picture of the Day</h2>
        </motion.div>

        {loading ? (
          <div className="glass-card p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : apod ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card overflow-hidden"
          >
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative aspect-video md:aspect-auto">
                {apod.media_type === "video" ? (
                  <iframe
                    src={apod.url}
                    title={apod.title}
                    className="w-full h-full min-h-[300px]"
                    allowFullScreen
                  />
                ) : (
                  <img
                    src={apod.url}
                    alt={apod.title}
                    className="w-full h-full object-cover min-h-[300px]"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="p-6 md:p-8 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-primary text-xs mb-3">
                  <Calendar className="w-3 h-3" />
                  <span className="font-display">{apod.date}</span>
                </div>
                <h3 className="font-display font-bold text-xl mb-3">{apod.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed line-clamp-6 mb-4">
                  {apod.explanation}
                </p>
                {apod.copyright && (
                  <p className="text-muted-foreground text-xs mb-4">© {apod.copyright}</p>
                )}
                {apod.hdurl && (
                  <a
                    href={apod.hdurl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary text-xs font-display hover:underline"
                  >
                    View HD <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="glass-card p-12 text-center text-muted-foreground text-sm">
            Unable to load APOD data.
          </div>
        )}
      </div>
    </section>
  );
};

export default ApodSection;
