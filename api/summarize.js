export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      text,
      existingMemory = ""
    } = req.body || {};

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: `
You maintain long-term memory for an AI assistant.

Your task:
- Merge existing memory with new conversation data.
- Remove duplicate information.
- Keep important user facts, goals, projects and preferences.
- Keep important ongoing tasks.
- Remove small talk and temporary details.
- Keep memory concise.
- Maximum 300 words.
`
            },
            {
              role: "user",
              content: `
Existing Memory:

${existingMemory}

New Conversation:

${text}
`
            }
          ],
          temperature: 0.2,
          max_tokens: 400
        })
      }
    );

    const data = await response.json();

    return res.status(200).json({
      summary:
        data?.choices?.[0]?.message?.content ||
        existingMemory
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Summary failed"
    });
  }
    }
