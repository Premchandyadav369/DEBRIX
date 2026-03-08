import { lazy, Suspense } from "react";
import Starfield from "@/components/Starfield";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MissionSection from "@/components/MissionSection";
import ScrollToTop from "@/components/ScrollToTop";
import SectionSkeleton from "@/components/SectionSkeleton";
import ParallaxSection from "@/components/ParallaxSection";
import RevealOnScroll from "@/components/RevealOnScroll";

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
const SpaceWeatherSection = lazy(() => import("@/components/SpaceWeatherSection"));
const ISSTrackerSection = lazy(() => import("@/components/ISSTrackerSection"));
const ApodSection = lazy(() => import("@/components/ApodSection"));
const SpaceEventsSection = lazy(() => import("@/components/SpaceEventsSection"));
const GallerySection = lazy(() => import("@/components/GallerySection"));
const TeamSection = lazy(() => import("@/components/TeamSection"));
const ContactSection = lazy(() => import("@/components/ContactSection"));
const Footer = lazy(() => import("@/components/Footer"));
const SpaceChatSection = lazy(() => import("@/components/SpaceChatSection"));

const Lazy = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<SectionSkeleton />}>{children}</Suspense>
);

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Starfield />
      <Navbar />
      <HeroSection />

      <RevealOnScroll>
        <MissionSection />
      </RevealOnScroll>

      <ParallaxSection offset={30}>
        <Lazy><LaunchSimSection /></Lazy>
      </ParallaxSection>

      <RevealOnScroll direction="left">
        <Lazy><WorkflowSection /></Lazy>
      </RevealOnScroll>

      <Lazy><MissionTimeline /></Lazy>

      <ParallaxSection offset={25}>
        <RevealOnScroll>
          <Lazy><TelemetrySection /></Lazy>
        </RevealOnScroll>
      </ParallaxSection>

      <RevealOnScroll direction="right">
        <Lazy><DockDumpSection /></Lazy>
      </RevealOnScroll>

      <ParallaxSection offset={35}>
        <Lazy><SwarmSection /></Lazy>
      </ParallaxSection>

      <RevealOnScroll>
        <Lazy><CollisionAvoidanceSection /></Lazy>
      </RevealOnScroll>

      <ParallaxSection offset={20}>
        <Lazy><DebrisTrackerSection /></Lazy>
      </ParallaxSection>

      <RevealOnScroll direction="left">
        <Lazy><DebrisPrioritizationSection /></Lazy>
      </RevealOnScroll>

      <Lazy><DebrisGrowthSection /></Lazy>

      <ParallaxSection offset={30}>
        <RevealOnScroll>
          <Lazy><OrbitalDecaySection /></Lazy>
        </RevealOnScroll>
      </ParallaxSection>

      <Lazy><KesslerSection /></Lazy>

      <RevealOnScroll direction="right">
        <Lazy><SatelliteDashboardSection /></Lazy>
      </RevealOnScroll>

      <ParallaxSection offset={25}>
        <Lazy><SpaceWeatherSection /></Lazy>
      </ParallaxSection>

      <RevealOnScroll>
        <Lazy><ISSTrackerSection /></Lazy>
      </RevealOnScroll>

      <Lazy><ApodSection /></Lazy>

      <RevealOnScroll direction="right">
        <Lazy><SpaceEventsSection /></Lazy>
      </RevealOnScroll>

      <ParallaxSection offset={20}>
        <RevealOnScroll direction="left">
          <Lazy><GallerySection /></Lazy>
        </RevealOnScroll>
      </ParallaxSection>

      <RevealOnScroll>
        <Lazy><TeamSection /></Lazy>
      </RevealOnScroll>

      <Lazy><ContactSection /></Lazy>
      <Lazy><Footer /></Lazy>
      <Lazy><SpaceChatSection /></Lazy>

      <ScrollToTop />
    </div>
  );
};

export default Index;
