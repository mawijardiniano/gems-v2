import ai from "@/data/lib/gemini";
import { NextResponse } from "next/server";
import { requireRole } from "@/data/lib/auth";
import { cleanAiEventInput } from "@/data/lib/aiEventInput";
import { EVENT_ORGANIZER_ROLES } from "@/data/lib/eventAccess";

/* Only people who create or manage events use the generators (create page,
   event edit form, post-activity report); anyone else was free to spend the
   model quota. */
const AI_ROLES = EVENT_ORGANIZER_ROLES;
import { rateLimiters } from "@/data/lib/rateLimit";

export async function POST(req) {
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

    /* Events are scheduled by date only, so the prompt states the (Manila)
       day rather than a time. */
    const eventDate = data.date_medium || "To be announced";

    const prompt = `
You are an official event communications writer for a Philippine state university.

Write a professional event description for the following university event:

EVENT DETAILS
- Title: ${data.title}
- Type of Activity: ${data.type_of_activity || "Not specified"}
${data.gad_activity ? `- GAD Activity: ${data.gad_activity}` : ""}
- Venue: ${data.venue || "To be announced"}
- Date: ${eventDate}
- Target Participants: Open to all

WRITING INSTRUCTIONS
- Write 2 concise paragraphs only — no headers, no bullet points, no markdown
- Paragraph 1: Introduce the event — what it is, its purpose, and who it is for
- Paragraph 2: State the expected outcomes and a call to action encouraging participation
- Tone: formal, institutional, and motivating — suitable for an official university announcement
- Use active voice throughout
- Do not repeat the event title verbatim more than once
${
  data.type_of_activity === "GAD" || data.gad_activity
    ? "- This is a GAD (Gender and Development) activity: emphasize gender responsiveness, inclusivity, and the promotion of equal opportunities"
    : ""
}


Return only the two paragraphs of the description. No preamble, no title, no sign-off.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return NextResponse.json({
      description: response.text,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to generate description" },
      { status: 500 },
    );
  }
}
