export default async function handler(req, res) {

if (req.method !== "POST") {
  return res.status(405).json({ reply: "Method not allowed" });
}

const { message, history = [], image } = req.body;
const apiKey = process.env.GROQ_API_KEY;

let content = [];

if (message) {
  content.push({
    type: "text",
    text: message
  });
}

if (image) {
  content.push({
    type: "image_url",
    image_url: {
      url: image
    }
  });
}

try {

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: "llama-3.2-11b-vision-preview",
    messages: [
      ...history,
      { role: "user", content: content }
    ]
  })
});

  const data = await response.json();

  if (data.error) {
    return res.status(500).json({
      reply: "AI Error: " + data.error.message
    });
  }

  res.status(200).json({
    reply: data?.choices?.[0]?.message?.content || "No response from AI"
  });

} catch (error) {

  res.status(500).json({
    reply: "Server error while contacting AI."
  });

}

    }
