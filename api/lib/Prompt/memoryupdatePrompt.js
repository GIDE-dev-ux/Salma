export function getMemoryUpdatePrompt(
    existingMemory,
    newMemory
) {

    return `
You maintain BABI's long-term user memory.

Existing memory:
${existingMemory || "No existing memory."}

New information:
${newMemory || "No new information."}

Rules:

- Keep useful long-term information.
- Replace outdated information with newer information.
- Remove contradictions.
- Remove duplicates.
- Keep facts concise.
- Keep one fact per line.
- Do not invent information.
- Do not add information that was not provided.
- Ignore temporary information.
- Return ONLY the updated memory.
- Do not explain your answer.
`;
}
