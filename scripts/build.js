const CSSPlugin = require("./css-plugin");
const createServer = require("http").createServer;
const express = require("express");
const serveIndex = require("serve-index");
const socketServer = require("esbuild-plugin-dev-server").socketServer;
const client = require("esbuild-plugin-dev-server").client;
const esbuild = require("esbuild");
const {readFile, writeFile, mkdir} = require("fs/promises");
const fs = require("fs");
const path = require("path");

const isProduction = require("process").env.NODE_ENV === "production";
const isTest = require("process").env.NODE_ENV === "test";
const isTestDevelopment = require("process").env.NODE_ENV === "testdevelop";

const entryPoints = isTest || isTestDevelopment
  ? ["src/p-component.spec.tsx"]
  : ["src/p-component.tsx"];

const testScripts = [
  "/node_modules/p-elements-core/dist/p-elements-core-modern.js",
  "/dist/p-component.spec.js",
];

const edgeLocation = `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`;
const executablePath = fs.existsSync(edgeLocation) ? edgeLocation : undefined;

function log(message) {
  console.log(
    `[${new Date().toISOString().split("T")[1].split("Z")[0]}] ${message}`,
  );
}

const buildOptions = {
  entryPoints,
  bundle: true,
  target: "es6",
  outdir: "dist",
  sourcemap: isTest || isTestDevelopment ? "inline" : true,
  plugins: [CSSPlugin],
  loader: {
    ".html": "text",
    ".svg": "text",
  },
};

if (isProduction) {
  buildOptions.minify = true;
  delete buildOptions.sourcemap;
  (async () => {
    log(`Start build`);
    await esbuild.build(buildOptions);
    log(`End build`);
  })();
} else {
  const serverOptions = {host: "localhost", port: 9000};
  buildOptions.banner = {js: client()};
  const app = express({strict: false});
  require("./api/index")(app);

  app.get("/_test", async (req, res) => {
    let content = await readFile("./scripts/test.html", "utf-8");
    const scripts = testScripts.map((src) => `<script defer src="${src}"></script>`).join("\n");
    content = content .replace("<!-- scripts -->", scripts); 
    if (isTest) {
      content = content.replace("/*onEnd*/", `.on("end", function (d) {
        if(this.failures && this.failures > 0){
          console.log("FAIL");
        } else {
          console.log("END ", this.stats);
        }
      })`)
      .replace("// reporter", "reporter: 'xunit',"); 
    }
    res.send(content);
  });

  log(`Start dev server http://${serverOptions.host}:${serverOptions.port}`);
  app.use(express.static("./"), serveIndex("./", {icons: true}));
  const server = createServer(app);
  const write = socketServer(server);

  buildOptions.plugins.push({
    name: "build",
    setup: (build) => {
      build.onStart(() => {
        log("Build started");
      });
      build.onEnd((result) => {
        write(result);
        log("Build complete");
        [...result.errors, ...result.warnings].forEach((element) => {
          console.log(element);
        });
      });
    },
  });

  server.listen(serverOptions);

  (async () => {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
  })();
  if (isTest || isTestDevelopment) {
    openTestInBrowser(server, serverOptions);
  }
}

async function openTestInBrowser(server, serverOptions) {
  log("Test started");
  let xunit = `<?xml version="1.0"?>` + "\n";
  const v8toIstanbul = require("v8-to-istanbul");
  const {chromium} = require("playwright-core");
  const browserType =  chromium;
  const browser = await browserType.launch({
    executablePath,
    headless: isTest === true,
    devtools: isTest !== true,
  });
  const page = await browser.newPage();
  if (isTest) {
    page.on("console", async (msg) => {
      const txt = msg.text();
      // mocha test end
      if (txt.startsWith("END ")) { 
        log("Reporting started");
        const coverage = (await page.coverage.stopJSCoverage())
          .filter((entry) => {
            return entry.url.includes(".spec");
          })
          .map((entry) => {
            return entry;
          });
        const entries = {};
        for (const entry of coverage) {
          const converter = v8toIstanbul(entry.url, 0, {
            source: entry.source,
          });
          await converter.load();
          converter.applyCoverage(entry.functions);
          const istanbul = converter.toIstanbul();
          for (const key in istanbul) {
            const np = path.join(
              __dirname,
              "../",
              key.split(`:${serverOptions.port}`, 2)[1],
            );
            if (np.includes(".spec.") === false) {
              istanbul[key].path = np;
              entries[np] = istanbul[key];
            }
          }
        }
        await mkdir(`./.nyc_output`, {recursive: true});
        await writeFile(
          `./.nyc_output/coverage-pw.json`,
          JSON.stringify(entries),
        );
        await writeFile(
          `./TESTS-xunit.xml`,
          xunit,
        );
        log("Reporting complete");
        await server.close();
        await esbuild.stop();
        await browser.close();
        
        log("Test complete");
        process.exit(0);
      } else if(txt === "FAIL"){
        log("Test failed");
        process.exit(1);
      }
      else if(txt.trim().startsWith("<")){
        xunit += txt;
      } else {
        console.log(txt);
      }
    });
    await page.coverage.startJSCoverage();
  }
  await page.goto(`http://localhost:${serverOptions.port}/_test`).catch(e => {
    console.info(e);
  });
}
