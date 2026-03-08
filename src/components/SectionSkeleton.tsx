const SectionSkeleton = () => (
  <div className="section-container flex flex-col items-center justify-center min-h-[400px] gap-4">
    <div className="w-24 h-24 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    <p className="text-xs text-muted-foreground font-display tracking-widest uppercase animate-pulse">
      Loading module…
    </p>
  </div>
);

export default SectionSkeleton;
