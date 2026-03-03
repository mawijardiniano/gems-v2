import Navbar from "./components/layout/navbar";
import Hero from "./components/hero";


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="pt-16">
        <div className="px-4 sm:px-6">
          <Hero />
        </div>
      </main>
    </div>
  );
}
