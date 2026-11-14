// Fills the database with demo accounts. Run: npm run seed  (add -- --bulk for 1,000 extra seekers)
const { buildContainer } = require("../container");
const UserFactory = require("../domain/UserFactory");
const { UserModel } = require("../models/UserModel");

const DEMO_PASSWORD = "Password123!";

const people = [
    { role: "admin", fullName: "Mona Moderator", email: "moderator@wuzzufny.test", adminRole: "moderator", isVerified: true },
    { role: "admin", fullName: "Sami Support", email: "support@wuzzufny.test", adminRole: "support", isVerified: true },
    { role: "company", fullName: "Nile HR", email: "hr@niletech.test", companyName: "Nile Tech", industry: "Software", location: "Cairo", size: "11-50", about: "Small product team, remote-friendly.", isVerified: true },
    { role: "company", fullName: "Delta HR", email: "jobs@deltabank.test", companyName: "Delta Bank", industry: "Finance", location: "Alexandria", size: "1000+", about: "Digital banking team.", isVerified: true },
    { role: "seeker", fullName: "Salma Ali", email: "salma@wuzzufny.test", headline: "Junior React developer", city: "Cairo", skills: ["React", "JavaScript", "CSS"], isVerified: true },
    { role: "seeker", fullName: "Omar Hassan", email: "omar@wuzzufny.test", headline: "Node.js intern", city: "Giza", skills: ["Node", "Express", "MongoDB"] },
    { role: "seeker", fullName: "Nour Adel", phone: "+201001112223", headline: "UI designer", city: "Alexandria", skills: ["Figma", "UX", "CSS"] }
];

async function seedPeople(container) {
    const hash = await container.passwordHasher.hash(DEMO_PASSWORD);
    for (const person of people) {
        const login = person.email || person.phone;
        const exists = await UserModel.exists({ $or: [{ email: login }, { phone: login }] });
        if (exists) {
            console.log(`  skip  ${login} (already there)`);
            continue;
        }
        const user = UserFactory.createUser(person.role, person);
        await container.userRepository.create(user, hash);
        console.log(`  added ${person.role.padEnd(7)} ${login}`);
    }
}

// NFR-09: 1,000 fake seekers, inserted in one go so it takes seconds, not minutes
async function seedBulk(container) {
    const hash = await container.passwordHasher.hash(DEMO_PASSWORD);
    const cities = ["Cairo", "Giza", "Alexandria", "Mansoura", "Tanta"];
    const skillSets = [["React", "CSS"], ["Node", "MongoDB"], ["Python", "SQL"], ["Figma", "UX"], ["Java", "Spring"]];
    const docs = [];
    for (let i = 1; i <= 1000; i++) {
        docs.push({
            role: "seeker",
            fullName: `Test Seeker ${i}`,
            email: `seeker${i}@bulk.wuzzufny.test`,
            passwordHash: hash,
            city: cities[i % cities.length],
            skills: skillSets[i % skillSets.length]
        });
    }
    await UserModel.deleteMany({ email: /@bulk\.wuzzufny\.test$/ });
    await UserModel.insertMany(docs);
    console.log("  added 1000 bulk seekers");
}

async function main() {
    process.loadEnvFile();
    const container = buildContainer();
    await container.database.connect();

    console.log("Seeding demo accounts (password for all: " + DEMO_PASSWORD + ")");
    await seedPeople(container);
    if (process.argv.includes("--bulk")) await seedBulk(container);

    await container.database.disconnect();
    console.log("Done.");
}

main().catch(err => {
    console.error("Seed failed:", err.message);
    process.exit(1);
});
