import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Newspaper, ExternalLink, Clock, Loader2 } from "lucide-react";

interface Article {
  id: number;
  title: string;
  url: string;
  image_url: string;
  news_site: string;
  summary: string;
  published_at: string;
}

const SpaceNewsSection = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.spaceflightnewsapi.net/v4/articles/?limit=9")
      .then((r) => r.json())
      .then((data) => setArticles(data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <section id="space-news" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Live Feed</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Space News</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Latest headlines from the space industry, updated in real time.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, i) => (
              <motion.a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-card overflow-hidden group hover:border-primary/40 transition-all"
              >
                {article.image_url && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={article.image_url}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-display tracking-wider">
                      {article.news_site}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(article.published_at)}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-sm text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{article.summary}</p>
                  <div className="flex items-center gap-1 text-[10px] text-primary pt-1">
                    <ExternalLink className="w-3 h-3" /> Read more
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SpaceNewsSection;
