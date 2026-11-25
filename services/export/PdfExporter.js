const PDFDocument = require("pdfkit");
const CvExporter = require("../../interfaces/CvExporter");

const GREEN = "#0B5D45";
const DARK = "#14201B";
const GREY = "#4A5A53";
const LINE = "#E2DDD2";

// FR-10, from the class diagram: export(cv) makes the PDF with pdfkit.
// Same layout as the "what recruiters see" preview on H6, 1 to 2 A4 pages.
class PdfExporter extends CvExporter {
    export(cv) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: `${cv.getOwner().getFullName()} CV` } });
            const chunks = [];
            doc.on("data", chunk => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);

            this.#header(doc, cv);
            this.#about(doc, cv);
            this.#experience(doc, cv);
            this.#education(doc, cv);
            this.#skills(doc, cv);
            doc.end();
        });
    }

    #header(doc, cv) {
        const owner = cv.getOwner();
        doc.font("Helvetica-Bold").fontSize(22).fillColor(DARK).text(owner.getFullName());
        const contact = [owner.getHeadline(), owner.getCity(), owner.getEmail(), owner.getPhone()].filter(Boolean);
        doc.moveDown(0.3).font("Helvetica").fontSize(10).fillColor(GREY).text(contact.join(" · "));
    }

    #sectionTitle(doc, title) {
        doc.moveDown(1.2).font("Helvetica-Bold").fontSize(9).fillColor(GREEN).text(title.toUpperCase(), { characterSpacing: 0.6 });
        const y = doc.y + 3;
        doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).strokeColor(LINE).lineWidth(1).stroke();
        doc.moveDown(0.6);
    }

    // a bold line on the left, dates on the right
    #row(doc, left, right) {
        const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const y = doc.y;
        doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK).text(left, doc.page.margins.left, y, { width: width - 110 });
        const after = doc.y;
        if (right) doc.font("Helvetica").fontSize(10).fillColor(GREY).text(right, doc.page.margins.left, y, { width, align: "right" });
        doc.x = doc.page.margins.left;
        doc.y = Math.max(after, doc.y);
    }

    #about(doc, cv) {
        if (cv.getSummary() === "") return;
        this.#sectionTitle(doc, "About me");
        doc.font("Helvetica").fontSize(10).fillColor(DARK).text(cv.getSummary(), { lineGap: 2 });
    }

    #experience(doc, cv) {
        const roles = cv.getExperience();
        if (roles.length === 0) return;
        this.#sectionTitle(doc, "Experience");
        for (const role of roles) {
            const title = role.company ? `${role.title} · ${role.company}` : role.title;
            const dates = [role.startDate, role.endDate].filter(Boolean).join(" – ");
            this.#row(doc, title, dates);
            for (const bullet of role.bullets) {
                doc.moveDown(0.2).font("Helvetica").fontSize(10).fillColor(DARK).text(`•  ${bullet}`, { indent: 4, lineGap: 1 });
            }
            doc.moveDown(0.6);
        }
    }

    #education(doc, cv) {
        const schools = cv.getEducation();
        if (schools.length === 0) return;
        this.#sectionTitle(doc, "Education");
        for (const school of schools) {
            const title = [school.degree, school.school].filter(Boolean).join(" · ");
            const years = [school.startYear, school.endYear].filter(Boolean).join(" – ");
            this.#row(doc, title, years);
            doc.moveDown(0.4);
        }
    }

    #skills(doc, cv) {
        const skills = cv.getSkills();
        if (skills.length === 0) return;
        this.#sectionTitle(doc, "Skills");
        doc.font("Helvetica").fontSize(10).fillColor(DARK).text(skills.join("  ·  "));
    }
}

module.exports = PdfExporter;
