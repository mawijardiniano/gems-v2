prompt no.1

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
    ["PWDs", "Solo Parent", "Indigenous Group", "LGBTQIA+", "Low Income Student"].includes(e)
  )
    ? `- The event targets marginalized or vulnerable groups (${data.eligibility_criteria.join(", ")}): reflect sensitivity, empowerment, and inclusivity in the language`
    : ""
}

Return only the two paragraphs of the description. No preamble, no title, no sign-off.
`;




Prompt No.2


 const prompt = `
Generate a professional event description for a university event.

Title: ${data.title}
Type of Activity: ${data.type_of_activity}
GAD Activity: ${data.gad_activity}
Venue: ${data.venue}
Number of Days: ${data.number_of_days}
Target Participants: ${data.target_number_of_participants}
Eligibility: ${data.eligibility_criteria?.join(", ")}

Requirements:
- 1 to 2 paragraphs
- Professional and engaging
- Mention objectives and expected outcomes
- If GAD-related, emphasize inclusivity and gender responsiveness
`;