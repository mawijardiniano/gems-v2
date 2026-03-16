"use client";

import React from "react";
import { useRouter } from "next/navigation";

 export default function SimplifyGender() {

  const router = useRouter();

  return (
    <section className="min-h-[calc(100vh-4rem)] flex items-center bg-purple-700">
      <div className="max-w-6xl mx-auto w-full ">
        <div className="grid gap-8 md:grid-cols-2 items-center ">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-white">
              SIMPLIFY GENDER EQUALITY MONITORING
            </h1>
            <p className="mt-4 text-lg text-white">
             Track employee information, manage documents, and monitor <br/>
             compliance with gender equality policies.
            </p>
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-xl p-8 flex items-center justify-center">
              <img
                src="/simplify.png"
                alt="Simplify"
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
