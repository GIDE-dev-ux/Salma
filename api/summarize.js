import {
    chatWithAI,
    MODELS
} from "../lib/ai.js";

import {
    getSystemPrompt
} from "../lib/prompts/systemPrompt.js";

import {
    getSummarizerPrompt
} from "../lib/prompts/summarizerPrompt.js";


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
            model = MODELS.MAIN,
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


        if (
            !Object.values(MODELS)
                .includes(model)
        ) {
            return res.status(400).json({
                error: "Invalid model"
            });
        }


        const systemPrompt =
            getSystemPrompt({
                personalMemory,
                memorySummary,
                webContext: ""
            });


        const summarizerPrompt =
            getSummarizerPrompt();


        const reply =
            await chatWithAI(
                [
                    {
                        role: "system",
                        content:
                            `${systemPrompt}

========================
SUMMARIZATION MODE
========================

${summarizerPrompt}`
                    },

                    ...messages
                ],
                {
                    model,
                    temperature: 0.2,
                    maxTokens: 4000,
                    timeout: 25000
                }
            );


        return res.status(200).json({
            reply,
            model
        });


    } catch (err) {

        console.error(
            "Summarize API error:",
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
