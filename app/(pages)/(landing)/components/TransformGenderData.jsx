"use client";

import React from "react";
import { useRouter } from "next/navigation";

 export default function TransformGenderData() {

  const router = useRouter();

  return (
    <section className="min-h-[calc(100vh-4rem)] flex items-center bg-violet-500">
      <div className="max-w-6xl mx-auto w-full ">
        <div className="grid gap-8 md:grid-cols-2 items-center ">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-white">
              TRANSFORM GENDER DATA INTO ACTION
            </h1>
            <p className="mt-4 text-lg text-white">
              Analyze workforce diversity, monitor equality initiatives, and generate <br/>
              reports that support inclusive desicion-making
            </p>
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-xl p-8 flex items-center justify-center">
              <img
                src="/transform.png"
                alt="Transform"
                className="w-full h-auto object-contain"
                style={{ maxHeight: 340 }}
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
