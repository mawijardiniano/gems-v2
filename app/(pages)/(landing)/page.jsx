import Navbar from "./components/layout/navbar";
import Hero from "./components/hero";
import Features from "./components/Features";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="pt-16">
        <div className="px-4 sm:px-6">
          <Hero />
        </div>

        {/* <Features />

        <CTA /> */}

        <Footer />
      </main>
    </div>
  );
}
