const request = require("supertest");
const { io: connect } = require("socket.io-client");
const { startTestApp } = require("../helpers/testApp");

const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
);

// FR-22 live chat. NFR-03: the socket needs the JWT, and only match members can join its room.
describe("Socket.io live updates", () => {
    let app;
    let container;
    let stop;
    let httpServer;
    let url;
    const tokens = {};
    const ids = {};
    const sockets = [];
    let matchId;

    const as = name => ({ Authorization: `Bearer ${tokens[name]}` });

    function open(token) {
        const socket = connect(url, { auth: { token }, transports: ["websocket"], reconnection: false });
        sockets.push(socket);
        return socket;
    }

    function connected(socket) {
        return new Promise((resolve, reject) => {
            socket.on("connect", resolve);
            socket.on("connect_error", reject);
        });
    }

    function nextEvent(socket, event) {
        return new Promise(resolve => socket.once(event, resolve));
    }

    beforeAll(async () => {
        ({ app, container, stop } = await startTestApp());
        httpServer = app.listen(0);
        container.socketServer.start(httpServer);
        url = `http://localhost:${httpServer.address().port}`;

        for (const [name, body] of [
            ["nile", { role: "company", fullName: "Nile HR", email: "hr@nile.co", companyName: "Nile Tech" }],
            ["salma", { role: "seeker", fullName: "Salma Ali", email: "salma@x.co" }],
            ["omar", { role: "seeker", fullName: "Omar", email: "omar@x.co" }]
        ]) {
            const res = await request(app).post("/api/auth/signup").send({ password: "longenough", ...body });
            tokens[name] = res.body.data.token;
            ids[name] = res.body.data.user.id;
        }
        for (const name of ["salma", "nile"]) {
            await request(app).post("/api/users/me/verify").set(as(name)).attach("idDocument", PNG, { filename: "id.png", contentType: "image/png" });
        }
        const job = await request(app).post("/api/jobs").set(as("nile")).send({
            title: "Dev", salaryMin: 1000, salaryMax: 2000, workMode: "remote", skills: ["React"]
        });
        await request(app).post("/api/swipes").set(as("nile")).send({ jobId: job.body.data.id, seekerId: ids.salma, interested: true });
        const swipe = await request(app).post("/api/swipes").set(as("salma")).send({ jobId: job.body.data.id, interested: true });
        matchId = swipe.body.data.match.id;
    });

    afterAll(async () => {
        for (const socket of sockets) socket.close();
        await new Promise(resolve => httpServer.close(resolve));
        await stop();
    });

    it("refuses a socket without a valid token", async () => {
        await expect(connected(open("fake-token"))).rejects.toThrow("Please log in");
    });

    it("lets only the two members join the match room", async () => {
        const salma = open(tokens.salma);
        const omar = open(tokens.omar);
        await Promise.all([connected(salma), connected(omar)]);

        expect(await salma.emitWithAck("match:join", matchId)).toEqual({ ok: true });
        expect(await omar.emitWithAck("match:join", matchId)).toEqual({ ok: false });
        expect(await omar.emitWithAck("match:join", "not-an-id")).toEqual({ ok: false });
    });

    it("pushes a new message to the other side straight away", async () => {
        const salma = open(tokens.salma);
        await connected(salma);
        const arrived = nextEvent(salma, "message:new");

        await request(app).post(`/api/matches/${matchId}/messages`).set(as("nile")).send({ text: "Hi Salma!" });

        expect(await arrived).toEqual({ matchId, messageId: expect.any(String) });
    });
});
