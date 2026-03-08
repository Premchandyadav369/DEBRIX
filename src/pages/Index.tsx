import Starfield from "@/components/Starfield";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MissionSection from "@/components/MissionSection";
import WorkflowSection from "@/components/WorkflowSection";
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
      <ApodSection />
      <GallerySection />
      <TeamSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
