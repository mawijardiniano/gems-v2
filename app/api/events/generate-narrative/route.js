import {
  createAiEventTextRoute,
  gadEmphasis,
} from "@/data/lib/aiEventTextRoute";

/* The post-activity narrative for the accomplishment report. Rate limiting,
   the organizer-role check and input cleanup live in
   data/lib/aiEventTextRoute.js. */
const generate = createAiEventTextRoute({
  failMessage: "Failed to generate narrative",
  buildPrompt: (data) => `
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
${gadEmphasis(data, " in the outcomes")}


Return only the three paragraphs. No preamble, no title, no sign-off.
`,
});

export async function POST(req) {
  return generate(req);
}
