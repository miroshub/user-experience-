const AIModel = require("../../interfaces/AIModel");

// The default model (AI_MODEL=mock). It needs no key and no internet, so the app, the demo
// and the tests always work. It reads the last message with simple word rules and answers
// in the same JSON shape a real model is asked for.

const ROLES = [
    [/front[\s-]?end/i, "Frontend"],
    [/back[\s-]?end/i, "Backend"],
    [/full[\s-]?stack/i, "Full stack"],
    [/design/i, "Designer"],
    [/\bdata\b|analyst/i, "Data"],
    [/\bqa\b|tester|testing/i, "QA"],
    [/mobile|android|\bios\b/i, "Mobile"]
];

// A skill with no role word ("React jobs") still says which role is meant
const SKILLS = {
    React: "Frontend", Angular: "Frontend", Vue: "Frontend", JavaScript: "Frontend", TypeScript: "Frontend",
    HTML: "Frontend", CSS: "Frontend", Node: "Backend", Express: "Backend", MongoDB: "Backend",
    Java: "Backend", PHP: "Backend", Python: "Data", SQL: "Data", Excel: "Data",
    Figma: "Designer", UX: "Designer", Flutter: "Mobile"
};

const LEVELS = [
    [/intern|trainee/i, "Intern"],
    [/junior|entry|fresh|graduate/i, "Junior"],
    [/senior|\blead\b/i, "Senior"],
    [/\bmid\b/i, "Mid"]
];

const PLACES = ["Remote", "Hybrid", "Cairo", "Giza", "Alexandria", "Maadi", "Nasr City", "New Cairo",
    "Sheikh Zayed", "6th of October", "Mansoura", "Tanta"];

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findPay(text) {
    const short = text.match(/(\d+(?:\.\d+)?)\s*k\b/i);
    if (short) return Math.round(Number(short[1]) * 1000);
    const full = text.match(/\b(\d{4,6})\b/);
    return full ? Number(full[1]) : null;
}

class MockModel extends AIModel {
    getName() {
        return "mock";
    }

    async connect(prompt) {
        const text = prompt.messages[prompt.messages.length - 1].text;
        const filters = {};

        const skills = Object.keys(SKILLS).filter(skill => new RegExp(`\\b${escapeRegex(skill)}\\b`, "i").test(text));
        if (skills.length > 0) filters.skills = skills;

        const role = ROLES.find(([pattern]) => pattern.test(text));
        if (role) filters.role = role[1];
        else if (skills.length > 0) filters.role = SKILLS[skills[0]];

        const level = LEVELS.find(([pattern]) => pattern.test(text));
        if (level) filters.level = level[1];

        const places = PLACES.filter(place => new RegExp(`\\b${escapeRegex(place)}\\b`, "i").test(text));
        if (places.length > 0) filters.places = places;

        const pay = findPay(text);
        if (pay) filters.minPay = pay;

        let reply = "Got it. Here are your filters. Click × to remove one, or just type to change them.";
        if (/fit my cv|best fit|fit me/i.test(text)) {
            reply = "Here are the jobs that fit your CV best, best first.";
        } else if (Object.keys(filters).length === 0) {
            reply = "I could not find any filters in that. Try something like \"remote React jobs, at least 12k\".";
        }
        return JSON.stringify({ reply, filters });
    }
}

module.exports = MockModel;
