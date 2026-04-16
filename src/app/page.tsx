import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { About } from "@/components/landing/about";
import { Camp } from "@/components/landing/camp";
import { Trips } from "@/components/landing/trips";
import { Testimonials } from "@/components/landing/testimonials";
import { Contact } from "@/components/landing/contact";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <About />
        <Camp />
        <Trips />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
