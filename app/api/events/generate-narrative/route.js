import ai from "@/lib/gemini";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { rateLimiters } from "@/lib/rateLimit";

export async function POST(req) {
  try {
    // Rate limit: 10 AI generations per minute per user
    const rateLimitResult = await rateLimiters.ai(req);
    if (rateLimitResult.error) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { status: rateLimitResult.status, headers: rateLimitResult.headers }
      );
    }

    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const data = await req.json();

    const prompt = `
You are an official report writer for a Philippine state university.

Write a professional post-activity narrative report for the following completed university event:

EVENT DETAILS
- Title: ${data.title}
- Type of Activity: ${data.type_of_activity}
${data.gad_activity ? `- GAD Activity: ${data.gad_activity}` : ""}
- Venue: ${data.venue || "Not specified"}
- Duration: ${data.number_of_days} day${data.number_of_days > 1 ? "s" : ""}
- Total Registered Participants: ${data.registered_count ?? data.target_number_of_participants ?? "Not specified"}
- Eligibility / Target Group: ${data.eligibility_criteria?.length ? data.eligibility_criteria.join(", ") : "Open to all"}
- Organizing Office/Unit: ${data.organizing_office_unit?.length ? data.organizing_office_unit.join(", ") : "Not specified"}
${data.start_dates?.length ? `- Date(s) Held: ${data.start_dates.join(", ")}` : ""}

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
${
  data.eligibility_criteria?.some((e) =>
    ["PWDs", "Solo Parent", "Indigenous Group", "LGBTQIA+", "Low Income Student"].includes(e)
  )
    ? `- The event targeted marginalized or vulnerable groups (${data.eligibility_criteria.join(", ")}): reflect empowerment, sensitivity, and inclusive outcomes in the narrative`
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
      { status: 500 }
    );
  }
}