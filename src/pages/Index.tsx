import Starfield from "@/components/Starfield";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MissionSection from "@/components/MissionSection";
import WorkflowSection from "@/components/WorkflowSection";
import DebrisTrackerSection from "@/components/DebrisTrackerSection";
import SpaceWeatherSection from "@/components/SpaceWeatherSection";
import ISSTrackerSection from "@/components/ISSTrackerSection";
import EpicSection from "@/components/EpicSection";
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
      <WorkflowSection />
      <DebrisTrackerSection />
      <SpaceWeatherSection />
      <ISSTrackerSection />
      <EpicSection />
      <ApodSection />
      <GallerySection />
      <TeamSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
