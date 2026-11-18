import ai from "@/data/lib/gemini";
import { NextResponse } from "next/server";
import { requireRole } from "@/data/lib/auth";
import { cleanAiEventInput } from "@/data/lib/aiEventInput";
import { EVENT_ORGANIZER_ROLES } from "@/data/lib/eventAccess";
import { rateLimiters } from "@/data/lib/rateLimit";

/* Only people who create or manage events use the generators (create page,
   event edit form, post-activity report); anyone else was free to spend the
   model quota. */
const AI_ROLES = EVENT_ORGANIZER_ROLES;

/**
 * POST handler for an event text generator. The description and narrative
 * routes were near-copies of each other; they now differ only in their
 * prompt.
 *
 * @param {{ buildPrompt: (data: object) => string, failMessage: string }} opts
 *   `data` is the cleaned event input (data/lib/aiEventInput.js).
 */
export function createAiEventTextRoute({ buildPrompt, failMessage }) {
  return async function POST(req) {
    try {
      // Rate limit: 10 AI generations per minute per user
      const rateLimitResult = await rateLimiters.ai(req);
      if (rateLimitResult.error) {
        return NextResponse.json(
          { error: rateLimitResult.error },
          { status: rateLimitResult.status, headers: rateLimitResult.headers },
        );
      }

      const { error, status } = await requireRole(req, AI_ROLES);
      if (error) return NextResponse.json({ error, message: error }, { status });

      const data = cleanAiEventInput(await req.json().catch(() => null));
      if (!data.title) {
        return NextResponse.json(
          { error: "A title is required.", message: "A title is required." },
          { status: 400 },
        );
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildPrompt(data),
      });

      return NextResponse.json({ description: response.text });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: failMessage }, { status: 500 });
    }
  };
}

/** The GAD emphasis line both prompts add for GAD activities. */
export const gadEmphasis = (data, suffix = "") =>
  data.type_of_activity === "GAD" || data.gad_activity
    ? `- This is a GAD (Gender and Development) activity: emphasize gender responsiveness, inclusivity, and the promotion of equal opportunities${suffix}`
    : "";
