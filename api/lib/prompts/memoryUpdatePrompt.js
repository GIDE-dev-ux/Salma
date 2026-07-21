export function getMemoryUpdatePrompt(existingMemory, newMemory) {
  return `
You maintain a user's long-term memory.

Existing memory:
${existingMemory}

New memory:
${newMemory}

Rules:

- Replace outdated facts with newer ones.
- Do not keep contradictory facts.
- Remove duplicate facts.
- Keep one fact per line.
- Preserve useful long-term information.
- Ignore temporary information.
- Return ONLY the updated memory.
- Do not explain your answer.
`;
}
