import {
  createAiEventTextRoute,
  gadEmphasis,
} from "@/data/lib/aiEventTextRoute";

/* The event description shown on the create page and the edit form. Rate
   limiting, the organizer-role check and input cleanup live in
   data/lib/aiEventTextRoute.js. */
const generate = createAiEventTextRoute({
  failMessage: "Failed to generate description",
  buildPrompt: (data) => {
    /* Events are scheduled by date only, so the prompt states the (Manila)
       day rather than a time. */
    const eventDate = data.date_medium || "To be announced";

    return `
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
${gadEmphasis(data)}


Return only the two paragraphs of the description. No preamble, no title, no sign-off.
`;
  },
});

export async function POST(req) {
  return generate(req);
}
