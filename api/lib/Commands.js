import {
    chatWithAI,
    MODELS
} from "./ai.js";

import {
    getCommandPrompt
} from "./prompts/commandPrompt.js";


const VALID_INTENTS = new Set([
    "CHAT",
    "QUESTION",
    "SEARCH",
    "CODE",
    "TERMUX",
    "LINUX",
    "WRITING",
    "TRANSLATE",
    "MATH",
    "MEMORY",
    "HELP",
    "UNKNOWN"
]);


export async function detectIntent(message) {

    if (
        !message ||
        typeof message !== "string"
    ) {
        return "UNKNOWN";
    }


    try {

        const result =
            await chatWithAI(
                [
                    {
                        role: "system",
                        content:
                            getCommandPrompt()
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
                    maxTokens: 10,
                    timeout: 10000
                }
            );


        const intent =
            result
                .trim()
                .toUpperCase()
                .replace(/[^A-Z_]/g, "");


        if (
            VALID_INTENTS.has(intent)
        ) {
            return intent;
        }


        return "UNKNOWN";

    } catch (err) {

        console.error(
            "Intent detection failed:",
            err
        );

        return "UNKNOWN";
    }
          }
