const fs = require("fs");
const path = require("path");

const host = (process.env.API_HOST || "").replace(/\/$/, "");
const apiBase = host ? `${host}/api` : "http://127.0.0.1:8000/api";

const target = path.join(__dirname, "..", "frontend", "js", "config.js");
const contents = `/** Render build vaqtida yaratiladi */\nconst API_BASE = "${apiBase}";\n`;

fs.writeFileSync(target, contents, "utf8");
console.log("config.js yozildi:", apiBase);
