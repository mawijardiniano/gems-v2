# Event description prompt (single source: route.js)

The prompt below is the live one implemented in
`app/api/events/generate-description/route.js`. Earlier revisions took
`target_number_of_participants` and `eligibility_criteria` from the request
body, but those fields were removed from the event model (see migration
38310d8) and from the create/edit forms, so the prompt now treats the event
as open to all. Date and time come from the saved `start_date`/`end_date`
datetimes, not separate time inputs.

```js
const prompt = `
You are an official event communications writer for a Philippine state university.

Write a professional event description for the following university event:

EVENT DETAILS
- Title: ${data.title}
- Type of Activity: ${data.type_of_activity}
${data.gad_activity ? `- GAD Activity: ${data.gad_activity}` : ""}
- Venue: ${data.venue || "To be announced"}
- Date and Time: ${data.start_date ? new Date(data.start_date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "To be announced"}${data.end_date ? ` - ${new Date(data.end_date).toLocaleString("en-US", { timeStyle: "short" })}` : ""}
- Target Participants: Open to all

WRITING INSTRUCTIONS
- Write 2 concise paragraphs only - no headers, no bullet points, no markdown
- Paragraph 1: Introduce the event - what it is, its purpose, and who it is for
- Paragraph 2: State the expected outcomes and a call to action encouraging participation
- Tone: formal, institutional, and motivating - suitable for an official university announcement
- Use active voice throughout
- Do not repeat the event title verbatim more than once
${
  data.type_of_activity === "GAD" || data.gad_activity
    ? "- This is a GAD (Gender and Development) activity: emphasize gender responsiveness, inclusivity, and the promotion of equal opportunities"
    : ""
}


Return only the two paragraphs of the description. No preamble, no title, no sign-off.
`;
```

Callers: `app/(pages)/(event)/create/content.jsx` (new event form) and
`app/(pages)/(event)/events-list/[id]/components/OverviewTab.jsx` (edit form,
which falls back to `event.start_date`/`event.end_date` when the edit form
carries only a date-only value).
