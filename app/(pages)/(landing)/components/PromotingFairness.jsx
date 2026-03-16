"use client";

import React from "react";
import { useRouter } from "next/navigation";

 export default function PromotingFairness() {

  const router = useRouter();

  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center bg-orange-500">
      <div className="max-w-6xl mx-auto w-full ">
        <div className="items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-white">
             PROMOTING FAIRNESS AND <br/> INCLUSION
            </h1>
            <p className="mt-4 text-lg text-white">
              Ensure equal access to opportunities, strengthen workplace policies, <br/>
              and support gender-responsive programs. 
            </p>
          </div>
          <div />
        </div>
      </div>
      <div className="absolute bottom-0 right-0 flex justify-end w-full pointer-events-none">
        <img
          src="/promoting.png"
          alt="Promoting"
          className="object-contain h-60"
          loading="eager"
        />
      </div>
    </section>
  );
}
