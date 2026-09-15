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
You are an official event communications writer for a Philippine state university.

Write a professional event description for the following university event:

EVENT DETAILS
- Title: ${data.title}
- Type of Activity: ${data.type_of_activity}
${data.gad_activity ? `- GAD Activity: ${data.gad_activity}` : ""}
- Venue: ${data.venue || "To be announced"}
- Date and Time: ${data.start_date ? new Date(data.start_date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "To be announced"}${data.end_date ? ` - ${new Date(data.end_date).toLocaleString("en-US", { timeStyle: "short" })}` : ""}
- Target Participants: ${data.target_number_of_participants || "Open to all"}
- Eligibility: ${data.eligibility_criteria?.length ? data.eligibility_criteria.join(", ") : "Open to all"}

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
${
  data.eligibility_criteria?.some((e) =>
    [
      "PWDs",
      "Solo Parent",
      "Indigenous Group",
      "LGBTQIA+",
      "Low Income Student",
    ].includes(e),
  )
    ? `- The event targets marginalized or vulnerable groups (${data.eligibility_criteria.join(", ")}): reflect sensitivity, empowerment, and inclusivity in the language`
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
