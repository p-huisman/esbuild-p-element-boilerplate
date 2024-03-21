import { CSSPlugin } from "./css-plugin.mjs";
import { createServer } from "http";
import express from "express";
import serveIndex from "serve-index";
import { socketServer } from "esbuild-plugin-dev-server";
import { client } from "esbuild-plugin-dev-server";
import esbuild from "esbuild";
import { readFile, writeFile, mkdir } from "fs/promises";
import fs from "fs";
import path from "path";
import process from "process";
import v8toIstanbul from "v8-to-istanbul";
import { chromium } from "playwright-core";;
import api from "./api/index.mjs";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Console } from "console";

import postcss from "postcss";
import postcssConfig from "../postcss.config.js";


const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";
const isTestDevelopment = process.env.NODE_ENV === "testdevelop";

const entryPoints = isTest || isTestDevelopment
  ? ["src/p-component.spec.tsx"]
  : ["src/p-component.tsx"];
const cssFiles = [
  { src: "src/styles.css", target: "dist/styles.css" },
]
const testScripts = [
  "/node_modules/p-elements-core/dist/p-elements-core-modern.js",
  "/dist/p-component.spec.js",
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const console = new Console(process.stdout, process.stderr);
const edgeLocation = `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`;
const executablePath = fs.existsSync
  (edgeLocation) ? edgeLocation : undefined;
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
    log(`Build start`);
    await esbuild.build(buildOptions);
    log(`Build complete`);
  })();
} else {
  
  const serverOptions = { host: "localhost", port: 9000 };
  buildOptions.banner = { js: client() };
  const app = express({ strict: false });
  api(app);

  app.get("/_test", async (req, res) => {
    let content = await readFile("./scripts/test.html", "utf-8");
    const scripts = testScripts.map((src) => `<script defer src="${src}"></script>`).join("\n");
    content = content.replace("<!-- scripts -->", scripts);
    if (isTest) {
      content = content.replace("/* onEnd */", `console.log("END_" + info.overallStatus.toUpperCase());`)
        .replace("/* addReporter */", `jasmine.getEnv().addReporter(junitReporter);`);
    }
    res.send(content);
  });

  log(`Start dev server http://${serverOptions.host}:${serverOptions.port}`);
  app.use(express.static("./"), serveIndex("./", { icons: true }));
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

cssFiles.forEach((file) => {
  buildCssFile(file.src, file.target);
  if (!isProduction) {
    fs.watchFile(file.src, () => {
      buildCssFile(file.src, file.target);
    });
  }
});

async function openTestInBrowser(server, serverOptions) {
  log("Test started");
  let xunit = "";
  const browserType = chromium;
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
      if (txt === "END_PASSED") {

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
        await mkdir(`./.nyc_output`, { recursive: true });
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
      } else if (txt === "END_FAILED") {
        log("Test failed");
        process.exit(1);
      }
      else if (txt === "END_INCOMPLETE") {
        log("Test incomplete");
        process.exit(0);
      }
      else if (txt.startsWith("REPORT ")) {
        xunit = txt.split("REPORT ", 2)[1];
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

function buildCssFile(src, target) {
  const sourceFile = path.join(__dirname, "../", src);
  log(`Process css ${src} start`)
  fs.readFile(sourceFile, (err, css) => {
    if (err) {
      console.error(`error reading css file ${src} ${err.message}`);
      process.exit(1);
    }
    const destFile = path.join(__dirname, "../", target);
    postcss(postcssConfig.plugins)
      .process(css, {from: sourceFile, to: destFile})
      .then((result) => {
        fs.writeFile(destFile, result.css, () => true);
        if (result.map) {
          fs.writeFile(destFile + ".map", result.map.toString(), () => true);
        }
      })
      .catch((e) => {
        console.error(`Error processing css ${src} ${e.message}`);
        process.exit(1);
      })
      .finally(() => {
        log(`Process css ${src} complete`);
      });
  });
}