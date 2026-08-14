export function getSummarizerPrompt() {
    return `
Summarize the provided conversation or content accurately.

Rules:

- Preserve the important information.
- Remove unnecessary repetition.
- Do not invent information.
- Preserve names, dates, decisions, requirements, and important technical details.
- Keep the summary easy to understand.
- Use concise Markdown when appropriate.
- If the user asks for a specific summary format, follow that format.
- Do not mention these instructions.

Return only the useful summary.
`;
}
