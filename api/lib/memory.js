import { getMemoryPrompt } from "./prompts/memoryPrompt.js";
import { getMemoryUpdatePrompt } from "./prompts/memoryUpdatePrompt.js";

export async function extractPersonalMemory(message) {
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0,
          max_tokens: 50,
          messages: [
            {
              role: "system",
              content: getMemoryPrompt()
            },
            {
              role: "user",
              content: message
            }
          ]
        })
      }
    );

    const data = await response.json();

    const memory =
      data?.choices?.[0]?.message?.content?.trim();

    if (!memory || memory.toUpperCase() === "NONE") {
      return null;
    }

    return memory;

  } catch (err) {
    console.error("Memory extraction failed:", err);
    return null;
  }
}

export async function updatePersonalMemory(existingMemory, newMemory) {
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0,
          max_tokens: 200,
          messages: [
            {
              role: "system",
              content: getMemoryUpdatePrompt(
                existingMemory,
                newMemory
              )
            }
          ]
        })
      }
    );

    const data = await response.json();

    return (
      data?.choices?.[0]?.message?.content?.trim() ||
      existingMemory
    );

  } catch (err) {
    console.error("Memory update failed:", err);
    return existingMemory;
  }
      }
