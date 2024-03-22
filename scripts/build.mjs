import {CSSPlugin} from "./css-plugin.mjs";
import {createServer} from "http";
import express from "express";
import serveIndex from "serve-index";
import {socketServer} from "esbuild-plugin-dev-server";
import {client} from "esbuild-plugin-dev-server";
import esbuild from "esbuild";
import {readFile, writeFile, mkdir} from "fs/promises";
import fs from "fs";
import path from "path";
import process from "process";
import v8toIstanbul from "v8-to-istanbul";
import {chromium} from "playwright-core";
import api from "./api/index.mjs";
import {Console} from "console";
import {rimrafSync} from "rimraf";
import postcss from "postcss";
import postcssConfig from "./postcss-config.mjs";

const projectRootDir = process.cwd();

const config = JSON.parse(
  fs.readFileSync(path.join(projectRootDir, "config.json")),
);
const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";
const isTestDevelopment = process.env.NODE_ENV === "testdevelop";
const cssWatchList = isTest || isProduction ? null : [];
const entryPoints =
  isTest || isTestDevelopment
    ? config.testEntryPoints.map((entry) => path.join(projectRootDir, entry))
    : config.entryPoints.map((entry) => path.join(projectRootDir, entry));
const {cssFiles, testFiles, dist, target} = config;
const console = new Console(process.stdout, process.stderr);
const edgeLocation = `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`;
const executablePath = fs.existsSync(edgeLocation) ? edgeLocation : undefined;
const buildOptions = {
  entryPoints,
  bundle: true,
  target,
  outdir: path.join(projectRootDir, dist),
  sourcemap: isTest || isTestDevelopment ? "inline" : true,
  plugins: [CSSPlugin],
  loader: {
    ".html": "text",
    ".svg": "text",
  },
};
let writeToSocket;

(async () => {
  rimrafSync(path.join(projectRootDir, "dist"));
  fs.mkdirSync(path.join(projectRootDir, "dist"), {recursive: true});
  await buildCss(cssFiles);
  await build();
})();

function build() {
  return new Promise((resolve) => {
    let firstBuildDone = false;
    if (isProduction) {
      buildOptions.minify = true;
      delete buildOptions.sourcemap;
      log(`Build start`);
      esbuild.build(buildOptions).then(() => {
        log(`Build complete`);
        resolve();
      });
    } else {
      const serverOptions = {host: "localhost", port: 9000};
      buildOptions.banner = {js: client()};
      const app = express({strict: false});
      api(app);

      // serve the browser testrunner
      app.get("/_test", async (req, res) => {
        let content = await readFile("./scripts/test.html", "utf-8");
        const scripts = testFiles ? testFiles
          .map((src) => `<script defer src="${src}"></script>`)
          .join("\n") : "";
        const testEntries = config.testEntryPoints
          .map(
            (entry) =>
              `<script defer src="/${path.join(dist, path.parse(entry).name).replaceAll("\\", "/")}.js"></script>`,
          )
          .join("\n");
        content = content.replace(
          "<!-- scripts -->",
          "<!-- scripts -->\r\n" +
            scripts +
            testEntries +
            "\r\n<!-- end scripts -->\r\n",
        );
        if (isTest) {
          content = content
            .replace(
              "/* onEnd */",
              `console.log("END_" + info.overallStatus.toUpperCase());`,
            )
            .replace(
              "/* addReporter */",
              `jasmine.getEnv().addReporter(junitReporter);`,
            );
        }
        res.send(content);
      });

      log(
        `Start dev server http://${serverOptions.host}:${serverOptions.port}`,
      );
      app.use(express.static("./"), serveIndex("./", {icons: true}));
      
      const server = createServer(app);
      writeToSocket = socketServer(server);

      buildOptions.plugins.push({
        name: "build",
        setup: (build) => {
          build.onStart(() => {
            log("Build started");
          });
          build.onEnd((result) => {
            writeToSocket(result);
            log("Build complete");
            [...result.errors, ...result.warnings].forEach((element) => {
              console.log(element);
            });
            if (
              (isTest && !firstBuildDone) ||
              (isTestDevelopment && !firstBuildDone)
            ) {
              firstBuildDone = true;
              openTestInBrowser(server, serverOptions);
            }
            resolve();
          });
        },
      });

      server.listen(serverOptions);
      (async () => {
        const ctx = await esbuild.context(buildOptions);
        await ctx.watch();
      })();
    }
  });
}

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
              projectRootDir,
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
        await writeFile(`./TESTS-xunit.xml`, xunit);
        log("Reporting complete");
        await server.close();
        await esbuild.stop();
        await browser.close();

        log("Test complete");
        process.exit(0);
      } else if (txt === "END_FAILED") {
        log("Test failed");
        process.exit(1);
      } else if (txt === "END_INCOMPLETE") {
        log("Test incomplete");
        process.exit(0);
      } else if (txt.startsWith("REPORT ")) {
        xunit = txt.split("REPORT ", 2)[1];
      } else {
        console.log(txt);
      }
    });
    await page.coverage.startJSCoverage();
  }
  await page.goto(`http://localhost:${serverOptions.port}/_test`).catch((e) => {
    console.info(e);
  });
}

function buildCss(cssFiles) {
  if (!cssFiles) {
    return Promise.resolve();
  }
  const promises = [];
  cssFiles
    .map((file) => {
      return {
        src: path.join(projectRootDir, file.src),
        target: path.join(projectRootDir, dist, file.target),
      };
    })
    .forEach(async (file) => {
      if (cssWatchList && cssWatchList.indexOf(file.src) === -1) {
        cssWatchList.push(file.src);
        fs.watchFile(file.src, async () => {
          await buildCssFile(file.src, file.target);
          if (writeToSocket) {
            writeToSocket({errors: [], warnings: []});
          }
        });
      }
      promises.push(buildCssFile(file.src, file.target));
    });

  return Promise.all(promises);
}

async function buildCssFile(src, target) {
  return new Promise((resolve) => {
    log(`Process css ${src.replace(projectRootDir, "")} start`);
    fs.readFile(src, (err, css) => {
      if (err) {
        console.error(`error reading css file ${src} ${err.message}`);
        process.exit(1);
      }
      postcss(postcssConfig.plugins)
        .process(css, {from: src, to: target})
        .then((result) => {
          fs.writeFileSync(target, result.css, () => true);
        })
        .catch((e) => {
          console.error(`Error processing css ${src.replace(projectRootDir, "")} ${e.message}`);
          process.exit(1);
        })
        .finally(() => {
          log(`Process css ${src.replace(projectRootDir, "")} complete`);
          resolve();
        });
    });
  });
}

function log(message) {
  console.log(
    `[${new Date().toISOString().split("T")[1].split("Z")[0]}] ${message}`,
  );
}
