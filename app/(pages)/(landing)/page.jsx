"use client";
import Navbar from "./components/layout/navbar";
import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { FiPause, FiPlay } from "react-icons/fi";
import GenderEquality from "./components/GenderEquality";
import PromotingFairness from "./components/PromotingFairness";
import SimplifyGender from "./components/SimplifyGender";
import TransformGenderData from "./components/TransformGenderData";
import UpcomingEvents from "./components/UpcomingEvents";

/* The statistics section pulls in Recharts, the heaviest dependency on this
   page, and sits below the hero and events. Load it only when the visitor
   scrolls near it so first paint ships without the chart library. */
const ProfileStats = dynamic(() => import("./components/ProfileStats"), {
  ssr: false,
  loading: () => <StatsPlaceholder />,
});

function StatsPlaceholder() {
  return (
    <section className="my-8 px-4" aria-busy="true" aria-label="Loading statistics">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="skeleton mx-auto h-8 w-72 rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="skeleton h-36 rounded-2xl" />
          <div className="skeleton h-36 rounded-2xl" />
          <div className="skeleton h-36 rounded-2xl" />
        </div>
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    </section>
  );
}

function LoadWhenNear({ children }) {
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || near) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);
  return <div ref={ref}>{near ? children : <StatsPlaceholder />}</div>;
}

const heroSlides = [
  <GenderEquality key="gender" />,
  <TransformGenderData key="transform" />,
  <PromotingFairness key="fairness" />,
  <SimplifyGender key="simplify" />,
];

export default function LandingPage() {
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);
  /* WCAG 2.2.2: an auto-advancing slideshow needs a way to stop it. It
     pauses while hovered or focused, never starts for reduced-motion users,
     and the button stops or resumes it outright. */
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const playing = !userPaused && !hoverPaused && !reducedMotion;

  useEffect(() => {
    if (!playing) return undefined;
    let swap;
    const interval = setInterval(() => {
      setFade(false);
      swap = setTimeout(() => {
        setCurrent((prev) => (prev + 1) % heroSlides.length);
        setFade(true);
      }, 400);
    }, 4000);
    return () => {
      clearInterval(interval);
      clearTimeout(swap);
      setFade(true);
    };
  }, [playing]);

  return (
    <div className="min-h-screen bg-subtle">
      <Navbar />
      <main>
        <div
          className="relative"
          onMouseEnter={() => setHoverPaused(true)}
          onMouseLeave={() => setHoverPaused(false)}
          onFocus={() => setHoverPaused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setHoverPaused(false);
          }}
        >
          <div
            key={current}
            className={`transition-opacity duration-500 ${fade ? "opacity-100" : "opacity-80"}`}
          >
            {heroSlides[current]}
          </div>
          {!reducedMotion && (
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
              aria-pressed={userPaused}
              className="touch-target absolute bottom-5 right-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
            >
              {userPaused ? (
                <FiPlay className="h-4 w-4" aria-hidden="true" />
              ) : (
                <FiPause className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
        <UpcomingEvents />
        <LoadWhenNear>
          <ProfileStats />
        </LoadWhenNear>
      </main>
    </div>
  );
}
