import {
    chatWithAI,
    MODELS
} from "./ai.js";

import {
    getMemoryPrompt
} from "./prompts/memoryPrompt.js";

import {
    getMemoryUpdatePrompt
} from "./prompts/memoryUpdatePrompt.js";


export async function extractPersonalMemory(
    message
) {

    if (
        !message ||
        typeof message !== "string"
    ) {
        return null;
    }


    try {

        const result =
            await chatWithAI(
                [
                    {
                        role: "system",
                        content:
                            getMemoryPrompt()
                    },

                    {
                        role: "user",
                        content:
                            message.trim()
                    }
                ],
                {
                    model: MODELS.FAST,
                    temperature: 0,
                    maxTokens: 50,
                    timeout: 10000
                }
            );


        if (
            !result ||
            result
                .trim()
                .toUpperCase() === "NONE"
        ) {
            return null;
        }


        return result.trim();

    } catch (err) {

        console.error(
            "Memory extraction failed:",
            err
        );

        return null;
    }
}


export async function updatePersonalMemory(
    existingMemory,
    newMemory
) {

    if (!newMemory) {
        return existingMemory || "";
    }


    try {

        const result =
            await chatWithAI(
                [
                    {
                        role: "system",
                        content:
                            getMemoryUpdatePrompt(
                                existingMemory,
                                newMemory
                            )
                    }
                ],
                {
                    model: MODELS.FAST,
                    temperature: 0,
                    maxTokens: 200,
                    timeout: 10000
                }
            );


        return (
            result?.trim() ||
            existingMemory ||
            ""
        );

    } catch (err) {

        console.error(
            "Memory update failed:",
            err
        );

        return existingMemory || "";
    }
                      }
