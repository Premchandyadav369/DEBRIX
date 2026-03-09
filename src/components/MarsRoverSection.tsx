import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, Calendar, Cpu, ExternalLink } from "lucide-react";

const NASA_API_KEY = "WBkaFckn04xcJlW4NoleN07iZajebOJGZpT4LrZz";

interface RoverPhoto {
  id: number;
  img_src: string;
  earth_date: string;
  sol: number;
  camera: { full_name: string; name: string };
  rover: { name: string; status: string };
}

const MarsRoverSection = () => {
  const [photos, setPhotos] = useState<RoverPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<RoverPhoto | null>(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        // Try latest photos from Perseverance first, then Curiosity
        const rovers = ["perseverance", "curiosity"];
        let allPhotos: RoverPhoto[] = [];
        for (const rover of rovers) {
          const res = await fetch(
            `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${NASA_API_KEY}`
          );
          const data = await res.json();
          if (data.latest_photos?.length) {
            allPhotos = [...allPhotos, ...data.latest_photos.slice(0, 6)];
          }
          if (allPhotos.length >= 12) break;
        }
        setPhotos(allPhotos.slice(0, 12));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchPhotos();
  }, []);

  return (
    <section id="mars-rover" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">NASA Mars Rovers</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Latest Mars Rover Photos</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Fresh imagery from Perseverance and Curiosity rovers exploring the Martian surface.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass-card aspect-square animate-pulse" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <p className="text-center text-muted-foreground">No Mars photos available right now.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo, i) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <div className="aspect-square relative">
                    <img
                      src={photo.img_src}
                      alt={`Mars ${photo.rover.name} - ${photo.camera.full_name}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <div className="text-xs">
                        <p className="font-display font-bold">{photo.rover.name}</p>
                        <p className="text-muted-foreground">{photo.camera.name}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Lightbox */}
            {selectedPhoto && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setSelectedPhoto(null)}
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="max-w-3xl w-full glass-card overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={selectedPhoto.img_src}
                    alt={`Mars ${selectedPhoto.rover.name}`}
                    className="w-full max-h-[60vh] object-contain bg-black"
                  />
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-primary" />
                      <span className="font-display font-bold">{selectedPhoto.rover.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">{selectedPhoto.rover.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> {selectedPhoto.camera.full_name}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {selectedPhoto.earth_date}</span>
                      <span>Sol {selectedPhoto.sol}</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default MarsRoverSection;
