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
- Duration: ${data.number_of_days} day${data.number_of_days > 1 ? "s" : ""}
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


// import { NextResponse } from "next/server";

// export async function POST(req) {
//   try {
//     const data = await req.json();

//     const prompt = `
// You are an official event communications writer for a Philippine state university.

// Write a professional event description for the following university event:

// EVENT DETAILS
// - Title: ${data.title}
// - Type of Activity: ${data.type_of_activity}
// ${data.gad_activity ? `- GAD Activity: ${data.gad_activity}` : ""}
// - Venue: ${data.venue || "To be announced"}
// - Duration: ${data.number_of_days} day${data.number_of_days > 1 ? "s" : ""}
// - Target Participants: ${data.target_number_of_participants || "Open to all"}
// - Eligibility: ${
//       data.eligibility_criteria?.length
//         ? data.eligibility_criteria.join(", ")
//         : "Open to all"
//     }

// WRITING INSTRUCTIONS
// - Write 2 concise paragraphs only
// - Paragraph 1: Introduce the event, its purpose, and participants
// - Paragraph 2: Expected outcomes and call to action
// - Tone: formal, institutional, motivating
// - Use active voice
// - No headers, bullets, markdown, title, or sign-off
// ${
//   data.type_of_activity === "GAD" || data.gad_activity
//     ? "- Emphasize gender responsiveness, inclusivity, and equal opportunities"
//     : ""
// }
// `;

//     const response = await fetch(
//       "https://cheapest-gpt-4-turbo-gpt-4-vision-chatgpt-openai-ai-api.p.rapidapi.com/v1/chat/completions",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "x-rapidapi-key": process.env.RAPIDAPI_KEY,
//           "x-rapidapi-host":
//             "cheapest-gpt-4-turbo-gpt-4-vision-chatgpt-openai-ai-api.p.rapidapi.com",
//         },
//         body: JSON.stringify({
//           model: "gpt-4o",
//           messages: [
//             {
//               role: "user",
//               content: prompt,
//             },
//           ],
//           max_tokens: 500,
//           temperature: 0.7,
//         }),
//       }
//     );

//     const result = await response.json();

//     if (!response.ok) {
//   console.error("RapidAPI Error:", result);
//   throw new Error(result.message || "Failed to fetch from RapidAPI");
// }

// const description = result?.choices?.[0]?.message?.content || "No description generated.";

//     return NextResponse.json({
//       description,
//     });
//   } catch (error) {
//     console.error(error);

//     return NextResponse.json(
//       { error: "Failed to generate description" },
//       { status: 500 }
//     );
//   }
// }