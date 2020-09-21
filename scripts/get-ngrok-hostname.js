#! /usr/bin/env node

const http = require("http");

if (process.argv[0] === "node") {
  process.argv.shift();
}

const localPort = process.argv[2] || "13000";
const url = "http://127.0.0.1:4040/api/tunnels";

http.get(url, res => {
  res.setEncoding("utf8");

  let body = "";

  res.on("data", data => body += data);
  res.on("end", () => {
    const json = JSON.parse(body);
    const tunnels = json.tunnels;

    const tunnel = tunnels.find(t => t.proto === 'https' && t.config.addr.endsWith(`${localPort}`));

    if (!tunnel) {
      console.error(`No ngrok tunnel to port '${localPort}' found.`);
      process.exit(2);
    }

    console.log(tunnel.public_url);
    process.exit(0);
  });

  res.on("error", (err) => {
    console.error("!!!!!! ", err);
    process.exit(1);
  });
});
