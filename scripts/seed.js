// Fills the database with demo accounts. Run: npm run seed  (add -- --bulk for 1,000 extra seekers)
const { buildContainer } = require("../container");
const UserFactory = require("../domain/UserFactory");
const { UserModel } = require("../models/UserModel");
const JobModel = require("../models/JobModel");
const SwipeModel = require("../models/SwipeModel");

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

const jobs = [
    { company: "hr@niletech.test", title: "Junior Frontend Developer", salaryMin: 14000, salaryMax: 18000, workMode: "hybrid", city: "Maadi", skills: ["React", "JavaScript", "CSS"], description: "Build the screens of our booking app with a small, friendly team." },
    { company: "hr@niletech.test", title: "Node.js Backend Intern", salaryMin: 8000, salaryMax: 10000, workMode: "remote", city: "", skills: ["Node", "Express", "MongoDB"], description: "Six-month paid internship on our REST API." },
    { company: "hr@niletech.test", title: "UI Designer", salaryMin: 12000, salaryMax: 16000, workMode: "onsite", city: "Cairo", skills: ["Figma", "UX"], description: "Own the design system and the mobile screens." },
    { company: "jobs@deltabank.test", title: "React Developer", salaryMin: 20000, salaryMax: 26000, workMode: "hybrid", city: "Alexandria", skills: ["React", "TypeScript"], description: "Work on the online banking front end." },
    { company: "jobs@deltabank.test", title: "Data Analyst", salaryMin: 15000, salaryMax: 19000, workMode: "onsite", city: "Alexandria", skills: ["SQL", "Python", "Excel"], description: "Turn transaction data into weekly reports." },
    { company: "jobs@deltabank.test", title: "QA Tester", salaryMin: 10000, salaryMax: 13000, workMode: "remote", city: "", skills: ["Testing", "JavaScript"], description: "Write and run test plans for every release." }
];

async function seedJobs() {
    for (const job of jobs) {
        const company = await UserModel.findOne({ email: job.company });
        const exists = await JobModel.exists({ company: company._id, title: job.title });
        if (exists) {
            console.log(`  skip  job "${job.title}" (already there)`);
            continue;
        }
        await JobModel.create({ ...job, company: company._id, status: "live" });
        console.log(`  added job "${job.title}"`);
    }

    // Demo shortcut: Nile Tech already said Interested to Salma, so her first yes on this job is a match
    const nile = await UserModel.findOne({ email: "hr@niletech.test" });
    const salma = await UserModel.findOne({ email: "salma@wuzzufny.test" });
    const frontend = await JobModel.findOne({ company: nile._id, title: "Junior Frontend Developer" });
    await SwipeModel.updateOne(
        { swipedBy: "company", seeker: salma._id, job: frontend._id },
        { $setOnInsert: { isInterested: true, swipedAt: new Date() } },
        { upsert: true }
    );
    console.log("  Nile Tech is already interested in Salma for Junior Frontend Developer");
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
    await seedJobs();
    if (process.argv.includes("--bulk")) await seedBulk(container);

    await container.database.disconnect();
    console.log("Done.");
}

main().catch(err => {
    console.error("Seed failed:", err.message);
    process.exit(1);
});
