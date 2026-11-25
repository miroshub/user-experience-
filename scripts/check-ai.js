// Asks the model chosen by AI_MODEL in .env one question, to prove the key works. Run: npm run check-ai
// It never prints the key, only the model's name and its answer.
const { buildAIModel } = require("../container");
const AIChat = require("../domain/AIChat");

const QUESTION = "Remote junior React jobs. Cairo is fine too. At least 12k a month.";

async function main() {
    process.loadEnvFile();
    const model = buildAIModel();
    console.log(`Asking ${model.getName()}...`);

    // Straight to the model first: in the app AIChat hides provider errors, here the real reason helps
    const answer = await model.connect({ system: AIChat.SYSTEM_PROMPT, messages: [{ role: "user", text: QUESTION }] });
    const { reply, filters } = AIChat.readReply(answer);
    console.log("Reply:  ", reply);
    console.log("Filters:", JSON.stringify(AIChat.cleanFilters(filters)));

    if (model.getName() === "mock") console.log("This is the free mock. Set AI_MODEL and its key in .env to use a real model.");
    else console.log("It works. Restart the server and use Ask wuzzufny.");
}

main().catch(err => {
    console.error("Failed:", err.message);
    process.exit(1);
});
