import { lazy, Suspense } from "react";
import Starfield from "@/components/Starfield";
import AmbientMusicPlayer from "@/components/AmbientMusicPlayer";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MissionSection from "@/components/MissionSection";
import ScrollToTop from "@/components/ScrollToTop";
import SectionSkeleton from "@/components/SectionSkeleton";
import ParallaxSection from "@/components/ParallaxSection";
import RevealOnScroll from "@/components/RevealOnScroll";
import SectionExplainer from "@/components/SectionExplainer";

// Lazy-load heavy sections (3D, maps, charts)
const LaunchSimSection = lazy(() => import("@/components/LaunchSimSection"));
const WorkflowSection = lazy(() => import("@/components/WorkflowSection"));
const MissionTimeline = lazy(() => import("@/components/MissionTimeline"));
const TelemetrySection = lazy(() => import("@/components/TelemetrySection"));
const DockDumpSection = lazy(() => import("@/components/DockDumpSection"));
const SwarmSection = lazy(() => import("@/components/SwarmSection"));
const CollisionAvoidanceSection = lazy(() => import("@/components/CollisionAvoidanceSection"));
const DebrisTrackerSection = lazy(() => import("@/components/DebrisTrackerSection"));
const DebrisPrioritizationSection = lazy(() => import("@/components/DebrisPrioritizationSection"));
const DebrisGrowthSection = lazy(() => import("@/components/DebrisGrowthSection"));
const OrbitalDecaySection = lazy(() => import("@/components/OrbitalDecaySection"));
const KesslerSection = lazy(() => import("@/components/KesslerSection"));
const SatelliteDashboardSection = lazy(() => import("@/components/SatelliteDashboardSection"));
const SatelliteExplorerSection = lazy(() => import("@/components/SatelliteExplorerSection"));
const SpaceWeatherSection = lazy(() => import("@/components/SpaceWeatherSection"));
const ISSTrackerSection = lazy(() => import("@/components/ISSTrackerSection"));
const ApodSection = lazy(() => import("@/components/ApodSection"));
const SpaceEventsSection = lazy(() => import("@/components/SpaceEventsSection"));
const SkyMapSection = lazy(() => import("@/components/SkyMapSection"));
const PlanetVisibilitySection = lazy(() => import("@/components/PlanetVisibilitySection"));
const RocketEngineDatabaseSection = lazy(() => import("@/components/RocketEngineDatabaseSection"));
const DictionarySection = lazy(() => import("@/components/DictionarySection"));
const MissionAnalyzerSection = lazy(() => import("@/components/MissionAnalyzerSection"));
const GallerySection = lazy(() => import("@/components/GallerySection"));
const TeamSection = lazy(() => import("@/components/TeamSection"));
const ContactSection = lazy(() => import("@/components/ContactSection"));
const Footer = lazy(() => import("@/components/Footer"));
const SpaceChatSection = lazy(() => import("@/components/SpaceChatSection"));
const UpcomingLaunchesSection = lazy(() => import("@/components/UpcomingLaunchesSection"));
const NeoAsteroidsSection = lazy(() => import("@/components/NeoAsteroidsSection"));
const FireballTrackerSection = lazy(() => import("@/components/FireballTrackerSection"));


const SpaceNewsSection = lazy(() => import("@/components/SpaceNewsSection"));

const ArtemisTrackerSection = lazy(() => import("@/components/ArtemisTrackerSection"));
const SolarImagerySection = lazy(() => import("@/components/SolarImagerySection"));

const Lazy = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<SectionSkeleton />}>{children}</Suspense>
);

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Starfield />
      <Navbar />
      <HeroSection />

      <SectionExplainer sectionId="mission" />
      <RevealOnScroll>
        <MissionSection />
      </RevealOnScroll>

      <SectionExplainer sectionId="launch-sim" />
      <ParallaxSection offset={30}>
        <Lazy><LaunchSimSection /></Lazy>
      </ParallaxSection>

      <SectionExplainer sectionId="workflow" />
      <RevealOnScroll direction="left">
        <Lazy><WorkflowSection /></Lazy>
      </RevealOnScroll>

      <SectionExplainer sectionId="timeline" />
      <Lazy><MissionTimeline /></Lazy>

      <SectionExplainer sectionId="telemetry" />
      <ParallaxSection offset={25}>
        <RevealOnScroll>
          <Lazy><TelemetrySection /></Lazy>
        </RevealOnScroll>
      </ParallaxSection>

      <SectionExplainer sectionId="dock-dump" />
      <RevealOnScroll direction="right">
        <Lazy><DockDumpSection /></Lazy>
      </RevealOnScroll>

      <SectionExplainer sectionId="swarm" />
      <ParallaxSection offset={35}>
        <Lazy><SwarmSection /></Lazy>
      </ParallaxSection>

      <SectionExplainer sectionId="collision-avoidance" />
      <RevealOnScroll>
        <Lazy><CollisionAvoidanceSection /></Lazy>
      </RevealOnScroll>

      <SectionExplainer sectionId="debris-tracker" />
      <ParallaxSection offset={20}>
        <Lazy><DebrisTrackerSection /></Lazy>
      </ParallaxSection>

      <SectionExplainer sectionId="debris-priority" />
      <RevealOnScroll direction="left">
        <Lazy><DebrisPrioritizationSection /></Lazy>
      </RevealOnScroll>

      <SectionExplainer sectionId="debris-growth" />
      <Lazy><DebrisGrowthSection /></Lazy>

      <SectionExplainer sectionId="orbital-decay" />
      <ParallaxSection offset={30}>
        <RevealOnScroll>
          <Lazy><OrbitalDecaySection /></Lazy>
        </RevealOnScroll>
      </ParallaxSection>


      <SectionExplainer sectionId="kessler" />
      <Lazy><KesslerSection /></Lazy>

      <SectionExplainer sectionId="sat-dashboard" />
      <RevealOnScroll direction="right">
        <Lazy><SatelliteDashboardSection /></Lazy>
      </RevealOnScroll>

      <SectionExplainer sectionId="satellite-explorer" />
      <ParallaxSection offset={20}>
        <Lazy><SatelliteExplorerSection /></Lazy>
      </ParallaxSection>

      <SectionExplainer sectionId="space-weather" />
      <ParallaxSection offset={25}>
        <Lazy><SpaceWeatherSection /></Lazy>
      </ParallaxSection>

      <SectionExplainer sectionId="iss-tracker" />
      <RevealOnScroll>
        <Lazy><ISSTrackerSection /></Lazy>
      </RevealOnScroll>

      <SectionExplainer sectionId="apod" />
      <Lazy><ApodSection /></Lazy>

      <SectionExplainer sectionId="space-events" />
      <RevealOnScroll direction="right">
        <Lazy><SpaceEventsSection /></Lazy>
      </RevealOnScroll>

      <SectionExplainer sectionId="upcoming-launches" />
      <ParallaxSection offset={20}>
        <Lazy><UpcomingLaunchesSection /></Lazy>
      </ParallaxSection>

      <SectionExplainer sectionId="neo-asteroids" />
      <RevealOnScroll>
        <Lazy><NeoAsteroidsSection /></Lazy>
      </RevealOnScroll>

      <SectionExplainer sectionId="fireball-tracker" />
      <ParallaxSection offset={20}>
        <Lazy><FireballTrackerSection /></Lazy>
      </ParallaxSection>

      <SectionExplainer sectionId="dictionary" />
      <RevealOnScroll direction="right">
        <Lazy><DictionarySection /></Lazy>
      </RevealOnScroll>

      <SectionExplainer sectionId="sky-map" />
      <ParallaxSection offset={25}>
        <Lazy><SkyMapSection /></Lazy>
      </ParallaxSection>

      <SectionExplainer sectionId="planet-visibility" />
      <RevealOnScroll direction="left">
        <Lazy><PlanetVisibilitySection /></Lazy>
      </RevealOnScroll>


      <SectionExplainer sectionId="solar-imagery" />
      <Lazy><SolarImagerySection /></Lazy>

      <SectionExplainer sectionId="artemis-tracker" />
      <ParallaxSection offset={25}>
        <RevealOnScroll>
          <Lazy><ArtemisTrackerSection /></Lazy>
        </RevealOnScroll>
      </ParallaxSection>

      <SectionExplainer sectionId="rocket-engines" />
      <ParallaxSection offset={30}>
        <RevealOnScroll>
          <Lazy><RocketEngineDatabaseSection /></Lazy>
        </RevealOnScroll>
      </ParallaxSection>

      <SectionExplainer sectionId="space-news" />
      <ParallaxSection offset={20}>
        <Lazy><SpaceNewsSection /></Lazy>
      </ParallaxSection>

      <SectionExplainer sectionId="mission-analyzer" />
      <ParallaxSection offset={25}>
        <Lazy><MissionAnalyzerSection /></Lazy>
      </ParallaxSection>

      <SectionExplainer sectionId="gallery" />
      <ParallaxSection offset={20}>
        <RevealOnScroll direction="left">
          <Lazy><GallerySection /></Lazy>
        </RevealOnScroll>
      </ParallaxSection>

      <SectionExplainer sectionId="team" />
      <RevealOnScroll>
        <Lazy><TeamSection /></Lazy>
      </RevealOnScroll>

      <SectionExplainer sectionId="contact" />
      <Lazy><ContactSection /></Lazy>
      <Lazy><Footer /></Lazy>
      <Lazy><SpaceChatSection /></Lazy>

      <AmbientMusicPlayer />
      <ScrollToTop />
    </div>
  );
};

export default Index;
