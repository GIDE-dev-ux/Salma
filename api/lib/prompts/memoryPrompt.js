export function getMemoryPrompt() {
  return `
You extract long-term personal facts from a user's message.

Return ONLY the important long-term fact.

Examples:

User: My name is John.
Output: User's name is John.

User: I use Kali Linux.
Output: User uses Kali Linux.

User: My favorite programming language is Python.
Output: User's favorite programming language is Python.

User: I'm building a chatbot.
Output: User is building a chatbot.

User: I live in Nigeria.
Output: User lives in Nigeria.

User: I prefer Termux.
Output: User prefers Termux.

If the message contains no useful long-term information, reply with:

NONE

Do not explain your answer.
`;
}
