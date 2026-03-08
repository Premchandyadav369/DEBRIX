import Starfield from "@/components/Starfield";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MissionSection from "@/components/MissionSection";
import LaunchSimSection from "@/components/LaunchSimSection";
import WorkflowSection from "@/components/WorkflowSection";
import MissionTimeline from "@/components/MissionTimeline";
import TelemetrySection from "@/components/TelemetrySection";
import DockDumpSection from "@/components/DockDumpSection";
import SwarmSection from "@/components/SwarmSection";
import CollisionAvoidanceSection from "@/components/CollisionAvoidanceSection";
import DebrisTrackerSection from "@/components/DebrisTrackerSection";
import DebrisPrioritizationSection from "@/components/DebrisPrioritizationSection";
import DebrisGrowthSection from "@/components/DebrisGrowthSection";
import OrbitalDecaySection from "@/components/OrbitalDecaySection";
import KesslerSection from "@/components/KesslerSection";
import SatelliteDashboardSection from "@/components/SatelliteDashboardSection";
import SpaceWeatherSection from "@/components/SpaceWeatherSection";
import ISSTrackerSection from "@/components/ISSTrackerSection";
import ApodSection from "@/components/ApodSection";
import GallerySection from "@/components/GallerySection";
import TeamSection from "@/components/TeamSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Starfield />
      <Navbar />
      <HeroSection />
      <MissionSection />
      <LaunchSimSection />
      <WorkflowSection />
      <MissionTimeline />
      <TelemetrySection />
      <DockDumpSection />
      <SwarmSection />
      <CollisionAvoidanceSection />
      <DebrisTrackerSection />
      <DebrisPrioritizationSection />
      <DebrisGrowthSection />
      <OrbitalDecaySection />
      <KesslerSection />
      <SatelliteDashboardSection />
      <SpaceWeatherSection />
      <ISSTrackerSection />
      <ApodSection />
      <GallerySection />
      <TeamSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
