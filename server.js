const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));
app.get("/", (req, res) => res.redirect("/api-tester.html"));
app.use(require("./routes/profileRoutes"));

// Errors come back as JSON instead of Express's HTML stack-trace page
app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON" });
    }
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
});

app.listen(port, () => console.log(`server is live on http://localhost:${port}`));
