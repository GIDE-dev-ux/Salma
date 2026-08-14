import {
    chatWithAI,
    MODELS
} from "./ai.js";

import {
    getSearchPrompt
} from "./prompts/searchPrompt.js";


export async function shouldSearchWeb(message) {

    if (
        !message ||
        typeof message !== "string"
    ) {
        return false;
    }


    const lower =
        message.toLowerCase();


    /*
     * Explicit search requests should
     * immediately trigger a search.
     */
    const explicitSearch =
        [
            "search the web",
            "search online",
            "look it up",
            "look this up",
            "find online",
            "search for",
            "check online",
            "verify online"
        ];


    if (
        explicitSearch.some(
            phrase =>
                lower.includes(phrase)
        )
    ) {
        return true;
    }


    try {

        const result =
            await chatWithAI(
                [
                    {
                        role: "system",
                        content:
                            getSearchPrompt()
                    },

                    {
                        role: "user",
                        content:
                            message.trim()
                    }
                ],
                {
                    model: MODELS.FAST,
                    temperature: 0.1,
                    maxTokens: 5,
                    timeout: 10000
                }
            );


        return (
            result
                .trim()
                .toUpperCase()
                .startsWith("YES")
        );

    } catch (err) {

        console.error(
            "Search decision failed:",
            err
        );

        return false;
    }
}


export async function searchWeb(query) {

    if (!process.env.TAVILY_API_KEY) {

        console.warn(
            "Missing TAVILY_API_KEY"
        );

        return [];
    }


    try {

        const response =
            await fetch(
                "https://api.tavily.com/search",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        api_key:
                            process.env.TAVILY_API_KEY,

                        query,

                        search_depth:
                            "advanced",

                        max_results: 8
                    })
                }
            );


        if (!response.ok) {

            console.error(
                "Tavily request failed:",
                response.status
            );

            return [];
        }


        const data =
            await response.json();


        return data.results || [];

    } catch (err) {

        console.error(
            "Tavily error:",
            err
        );

        return [];
    }
      }
