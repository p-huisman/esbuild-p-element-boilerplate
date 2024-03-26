import express from "express";
import { WebSocketServer } from "ws";
import serveIndex from "serve-index";
import http from 'http';
import path from "path";
import fs from "fs";
import { networkInterfaces } from 'os';
import { console, log } from "./log.mjs";
import testMiddleware from "./test/test-middleware.mjs";
import { actionParam } from "./action.mjs";
import api from "./api/index.mjs";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let connections;

function getIpAddresses() {
  const allifs = networkInterfaces();
  let ifs = [];
  for (const key in allifs) {
    allifs[key].forEach((i) => {
      if (i.family === "IPv4") {
        ifs.push(i.address);
      }
    });
  }
  return ifs ? ifs : [];
}

const app = express({ strict: false });

api(app);

const server = http.createServer(app);
const wss = new WebSocketServer({ clientTracking: false, noServer: true });

server.on('upgrade', function (request, socket, head) {
  if (!connections) {
    connections = new Set();
  }
  wss.handleUpgrade(request, socket, head, function (ws) {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', function (ws) {
  connections.add(ws);
  log("Connected to client");
  ws.on('close', function () {
    connections.delete(ws);
    log("Disconnected from client");
  });
});


export function startServer(config) {
  app.use(testMiddleware(config, actionParam));
  
  app.use((req, res, next) => {
    
    if (req.url === "/dev-server-client.js") {
      const script = fs.readFileSync(path.join(__dirname, ".dev-server-client.js"), "utf-8");
      res.send(script);
    } else {
      let file = path.join(config.projectRootDir, req.url.split("?")[0]).replace(/\\/g, "/");
      if (file.endsWith("/")) {
        file = file + "index.html";
      }
      if (file.endsWith(".html") && fs.existsSync(file)) {
        let html = fs.readFileSync(file, "utf-8");
        res.send(html.replace(`</head>`, `<script src="/dev-server-client.js"></script>${"\r\n"}</head>`));
      } else { 
        next();
      }
    }
  });

  app.use(express.static("./"), serveIndex("./", { icons: true }));



  return new Promise((resolve) => {
    const { port } = config.devServer;
    let { host } = config.devServer;
    if (actionParam === "test" || actionParam === "testdevelop") {
      host = "localhost";
    }
    server.listen(port ? port : 9000, host ? host : "0.0.0.0", function () {
      if (!host || host === "0.0.0.0") {
        log(`Listening on http://localhost:${port ? port : 9000}`);
        getIpAddresses().forEach((ip) => {
          log(`Listening on http://${ip}:${port ? port : 9000}`);
        });
      } else {
        log(`Listening on http://${host}:${port ? port : 9000}`);
      }
      resolve();
    });
  });
};

export function broadcast(data) {
  if (!connections) {
    return;
  }
  const messageData = JSON.stringify({
    errors: data.errors ? data.errors : [],
    warnings: data.warnings ? data.warnings : [],
    type: "build"
  });
  connections.forEach((ws) => {
    try {
      ws.send(messageData);
    } catch (e) {
      console.error(e);
    }
  });
}
