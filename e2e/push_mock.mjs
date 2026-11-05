// Fake Web Push service for tests: accepts every push and logs it to push_calls.jsonl.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const DIR = path.dirname(new URL(import.meta.url).pathname);
http
  .createServer((req, res) => {
    let size = 0;
    req.on("data", (c) => (size += c.length));
    req.on("end", () => {
      fs.appendFileSync(
        path.join(DIR, "push_calls.jsonl"),
        JSON.stringify({ path: req.url, ttl: req.headers.ttl, vapid: /^vapid t=/.test(req.headers.authorization ?? ""), encoding: req.headers["content-encoding"], bytes: size }) + "\n",
      );
      res.writeHead(201).end();
    });
  })
  .listen(54500, "127.0.0.1", () => console.log("push mock on :54500"));
