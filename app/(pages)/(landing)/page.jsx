"use client";
import Navbar from "./components/layout/navbar";
import React, { useEffect, useState } from "react";
import GenderEquality from "./components/GenderEquality";
import PromotingFairness from "./components/PromotingFairness";
import SimplifyGender from "./components/SimplifyGender";
import TransformGenderData from "./components/TransformGenderData";
import ProfileStats from "./components/ProfileStats";
import UpcomingEvents from "./components/UpcomingEvents";

const heroSlides = [
  <GenderEquality key="gender" />,
  <TransformGenderData key="transform" />,
  <PromotingFairness key="fairness" />,
  <SimplifyGender key="simplify" />,
];

export default function LandingPage() {
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % heroSlides.length);
        setFade(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>
        <div
          key={current}
          className={`transition-opacity duration-500 ${fade ? "opacity-100" : "opacity-80"}`}
        >
          {heroSlides[current]}
        </div>
        <UpcomingEvents />
        <ProfileStats />
      </main>
    </div>
  );
}
