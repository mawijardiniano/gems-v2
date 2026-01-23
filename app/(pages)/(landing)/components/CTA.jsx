"use client";
import { useRouter } from "next/navigation";

export default function CTA() {
  const router = useRouter();
  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h3 className="text-2xl font-semibold mb-4">Ready to participate?</h3>
        <p className="text-gray-600 mb-6">
          Take our quick survey to help inform gender equity programs in your
          community.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            type="button"
            onClick={() => router.push("/survey")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md"
          >
            Take Survey
          </button>
        </div>
      </div>
    </section>
  );
}
