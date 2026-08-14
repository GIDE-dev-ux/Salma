const GROQ_URL =
    "https://api.groq.com/openai/v1/chat/completions";


export const MODELS = {
    FAST: "llama-3.1-8b-instant",
    MAIN: "llama-3.3-70b-versatile",
    ADVANCED: "openai/gpt-oss-120b"
};


export async function chatWithAI(
    messages,
    {
        model = MODELS.MAIN,
        temperature = 0.3,
        maxTokens = 2000,
        timeout = 25000
    } = {}
) {

    if (!process.env.GROQ_API_KEY) {
        throw new Error("Missing GROQ_API_KEY");
    }


    if (!Object.values(MODELS).includes(model)) {
        throw new Error(`Unsupported model: ${model}`);
    }


    const controller = new AbortController();

    const timer = setTimeout(() => {
        controller.abort();
    }, timeout);


    try {

        const response = await fetch(
            GROQ_URL,
            {
                method: "POST",

                signal: controller.signal,

                headers: {
                    "Authorization":
                        `Bearer ${process.env.GROQ_API_KEY}`,

                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    model,
                    messages,
                    temperature,
                    max_tokens: maxTokens
                })
            }
        );


        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                "Invalid JSON response from Groq"
            );
        }


        if (!response.ok) {

            const errorMessage =
                data?.error?.message ||
                "Groq API request failed";

            throw new Error(errorMessage);
        }


        const content =
            data?.choices?.[0]?.message?.content;


        if (!content) {
            throw new Error(
                "Groq returned an empty response"
            );
        }


        return content.trim();

    } finally {

        clearTimeout(timer);
    }
  }
