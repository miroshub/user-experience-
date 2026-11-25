// Interface: turns a CV into a file (FR-10). CV.exportPdf(exporter) only knows this,
// so the CV class never depends on pdfkit (Dependency Inversion).
class CvExporter {
    constructor() {
        if (new.target === CvExporter) throw new Error("CvExporter is an interface");
    }

    // Resolves to a Buffer with the file
    async export(cv) {
        throw new Error("export not implemented");
    }
}

module.exports = CvExporter;
