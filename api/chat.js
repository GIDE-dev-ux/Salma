import {
    chatWithAI
} from "../lib/ai.js";

import {
    detectIntent
} from "../lib/commands.js";

import {
    routeModel
} from "../lib/router.js";

import {
    shouldSearchWeb,
    searchWeb
} from "../lib/search.js";

import {
    extractPersonalMemory,
    updatePersonalMemory
} from "../lib/memory.js";

import {
    getSystemPrompt
} from "../lib/prompts/systemPrompt.js";


export const config = {
    maxDuration: 30
};


export default async function handler(
    req,
    res
) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }


    if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({
            error: "Missing GROQ_API_KEY"
        });
    }


    try {

        const {
            messages,
            memorySummary = "",
            personalMemory = ""
        } = req.body || {};


        if (
            !Array.isArray(messages) ||
            messages.length === 0
        ) {
            return res.status(400).json({
                error: "Invalid messages format"
            });
        }


        if (messages.length > 100) {
            return res.status(400).json({
                error: "Too many messages"
            });
        }


        const latestMessage =
            messages[messages.length - 1]
                ?.content || "";


        if (!latestMessage.trim()) {
            return res.status(400).json({
                error: "Empty user message"
            });
        }


        /*
         * 1. Detect intent
         */
        const intent =
            await detectIntent(
                latestMessage
            );


        /*
         * 2. Decide whether web search
         *    is useful.
         */
        const needsWebSearch =
            await shouldSearchWeb(
                latestMessage
            );


        /*
         * 3. Search when necessary.
         */
        let webContext = "";


        if (needsWebSearch) {

            const results =
                await searchWeb(
                    latestMessage
                );


            webContext =
                results
                    .map(
                        result =>
                            `Title: ${result.title || ""}
Content: ${result.content || ""}
URL: ${result.url || ""}`
                    )
                    .join("\n\n");
        }


        /*
         * 4. Extract long-term memory.
         */
        const newMemory =
            await extractPersonalMemory(
                latestMessage
            );


        let updatedMemory =
            personalMemory || "";


        if (newMemory) {

            updatedMemory =
                await updatePersonalMemory(
                    personalMemory,
                    newMemory
                );
        }


        /*
         * 5. Choose the model.
         */
        const model =
            routeModel({
                intent,
                message: latestMessage,
                needsWebSearch
            });


        console.log(
            `BABI intent=${intent} model=${model} search=${needsWebSearch}`
        );


        /*
         * 6. Build system prompt.
         */
        const systemPrompt =
            getSystemPrompt({
                personalMemory:
                    updatedMemory,

                memorySummary,

                webContext
            });


        /*
         * 7. Ask the selected model.
         */
        const reply =
            await chatWithAI(
                [
                    {
                        role: "system",
                        content: systemPrompt
                    },

                    ...messages
                ],
                {
                    model,
                    temperature: 0.3,
                    maxTokens: 4000,
                    timeout: 25000
                }
            );


        return res.status(200).json({

            reply,

            intent,

            model,

            webSearch:
                needsWebSearch,

            memory:
                updatedMemory
        });


    } catch (err) {

        console.error(
            "Chat API error:",
            err
        );


        if (
            err.name === "AbortError"
        ) {
            return res.status(504).json({
                error: "Request timeout"
            });
        }


        return res.status(500).json({
            error:
                err.message ||
                "Internal server error"
        });
    }
}
