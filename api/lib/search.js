import { getSearchPrompt } from "./prompts/searchPrompt.js";

export async function searchWeb(query) {
  try {
    const response = await fetch(
      "https://api.tavily.com/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          search_depth: "advanced",
          max_results: 8
        })
      }
    );

    const data = await response.json();

    console.log(`Tavily results: ${data.results?.length || 0}`);

    return data.results || [];
  } catch (err) {
    console.error("Tavily error:", err);
    return [];
  }
}

export async function shouldSearchWeb(message) {
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
          max_tokens: 5,
          messages: [
            {
              role: "system",
              content: getSearchPrompt()
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

    const answer =
      data?.choices?.[0]?.message?.content
        ?.trim()
        ?.toUpperCase();

    return answer === "YES";

  } catch (err) {
    console.error("Search decision failed:", err);
    return false;
  }
      }
