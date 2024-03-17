const CSSPlugin = require("./css-plugin");
const isProduction = require("process").env.NODE_ENV === "production";
const isTest = require("process").env.NODE_ENV === "test";
const isTestDevelopment = require("process").env.NODE_ENV === "testdevelop";
const createServer = require("http").createServer;
const express = require("express");
const serveIndex = require("serve-index");
const socketServer = require("esbuild-plugin-dev-server").socketServer;
const client = require("esbuild-plugin-dev-server").client;
const esbuild = require("esbuild");
const {readFile, writeFile, mkdir} = require("fs/promises");
const path = require("path");

const entryPoints = isTest || isTestDevelopment
  ? ["src/p-component.spec.tsx"]
  : ["src/p-component.tsx"];

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
    if (isTest) {
      content = content.replace("// onEnd", `.on("end", function (d) {
        console.log("END ", this.stats);
      });`).replace("// reporter", "reporter: 'xunit',");
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
  let xunit = `<?xml version="1.0"?>` + "\n";
  const v8toIstanbul = require("v8-to-istanbul");
  const {chromium, firefox, webkit} = require("playwright-core");
  const browserName = "chromium";
  const browserType = {
    chromium,
    firefox,
    webkit,
  }[browserName];
  const browser = await browserType.launch({
    headless: false,
    devtools: true,
  });
  const page = await browser.newPage();
  if (isTest) {
    page.on("console", async (msg) => {
      const txt = msg.text();
      
      // mocha test end
      if (txt.startsWith("END ")) { 
        // get coverage
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
        await browser.close();
        server.close();
        esbuild.stop();
        
      } else if(txt.trim().startsWith("<")){
        xunit += txt;
      } else {
        console.log(txt);
      }
    });
    page.coverage.startJSCoverage();
  }
  page.goto(`http://${serverOptions.host}:${serverOptions.port}/_test`);
}
