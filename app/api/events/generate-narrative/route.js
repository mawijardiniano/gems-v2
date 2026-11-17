import ai from "@/data/lib/gemini";
import { NextResponse } from "next/server";
import { requireRole } from "@/data/lib/auth";
import { cleanAiEventInput } from "@/data/lib/aiEventInput";

/* Only people who create or manage events use the generators (create page,
   event edit form, post-activity report); anyone else was free to spend the
   model quota. */
const AI_ROLES = ["Admin", "GAD Focal Person", "GAD Coordinator", "Dean"];
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

    const prompt = `
You are an official report writer for a Philippine state university.

Write a professional post-activity narrative report for the following completed university event:

EVENT DETAILS
- Title: ${data.title}
- Type of Activity: ${data.type_of_activity || "Not specified"}
${data.gad_activity ? `- GAD Activity: ${data.gad_activity}` : ""}
- Venue: ${data.venue || "Not specified"}
- Date Held: ${data.date_long || "Not specified"}
- Total Registered Participants: ${data.registered_count ?? "Not specified"}
- Eligibility / Target Group: Open to all
- Organizing Office/Unit: ${data.offices.length ? data.offices.join(", ") : "Not specified"}

WRITING INSTRUCTIONS
- Write 3 concise paragraphs only — no headers, no bullet points, no markdown
- Paragraph 1: Describe what the activity was, when and where it was held, and who participated (use past tense)
- Paragraph 2: Describe what took place during the event — key activities, discussions, or highlights
- Paragraph 3: State the outcomes, learnings, or impact of the activity, and close with a forward-looking or affirmative statement
- Tone: formal, institutional, and factual — suitable for an official university accomplishment report
- Use past tense throughout (the event has already occurred)
- Do not use placeholder text — write as if the event was successfully completed
${
  data.type_of_activity === "GAD" || data.gad_activity
    ? "- This is a GAD (Gender and Development) activity: emphasize gender responsiveness, inclusivity, and the promotion of equal opportunities in the outcomes"
    : ""
}


Return only the three paragraphs. No preamble, no title, no sign-off.
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
      { error: "Failed to generate narrative" },
      { status: 500 },
    );
  }
}
