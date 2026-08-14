import {
    MODELS
} from "./ai.js";


export function routeModel({
    intent = "CHAT",
    message = "",
    needsWebSearch = false
} = {}) {

    const text =
        String(message).toLowerCase();


    /*
     * Very simple conversations.
     * Use the fast model.
     */
    if (
        intent === "CHAT" &&
        text.length < 250 &&
        !needsWebSearch
    ) {
        return MODELS.FAST;
    }


    /*
     * Current information and normal questions.
     * Use the stronger 70B model.
     */
    if (
        intent === "SEARCH" ||
        needsWebSearch
    ) {
        return MODELS.MAIN;
    }


    /*
     * Programming and technical tasks.
     */
    if (
        intent === "CODE" ||
        intent === "TERMUX" ||
        intent === "LINUX"
    ) {

        if (text.length > 1200) {
            return MODELS.ADVANCED;
        }

        return MODELS.MAIN;
    }


    /*
     * Complex questions.
     */
    if (
        intent === "QUESTION" &&
        (
            text.length > 1500 ||
            /analy[sz]e|compare|design|architecture|research|deep|complex/i
                .test(text)
        )
    ) {
        return MODELS.ADVANCED;
    }


    /*
     * Writing and translation normally
     * don't require the largest model.
     */
    if (
        intent === "WRITING" ||
        intent === "TRANSLATE"
    ) {
        return MODELS.MAIN;
    }


    /*
     * Math.
     */
    if (intent === "MATH") {
        return MODELS.MAIN;
    }


    /*
     * Default.
     */
    return MODELS.MAIN;
      }
