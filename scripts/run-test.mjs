import { log } from "./log.mjs";
import { chromium, webkit, firefox } from "playwright-core";
import { writeFile, mkdir } from "fs/promises";
import process from "process";
import v8toIstanbul from "v8-to-istanbul";
import path from "path";

export const runTest = (config, action, broadcast) => {
  const { port } = config.devServer;
  const host = "localhost";
  if (action === "test") {
    openBrowser(config, "chromium", action, `http://${host}:${port}/test.html`);
  } else {
    const browsers = config.browsers ? config.browsers : ["chromium"];
    browsers.forEach(browser => {
      openBrowser(config, browser, action, `http://${host}:${port}/test.html`);
    });
  }
};


async function openBrowser(config, browserName, action, url) {
  const isTest = action === "test";
  log("Test started");
  let executablePath = undefined;
  if (config[browserName + "Path"]) {
    executablePath = config[browserName + "Path"];
  }
  let xunit = "";
  let browserType = { chromium, webkit, firefox }[browserName];
  if (browserType === undefined) {
    browserType = chromium;
  }
  const browser = await browserType.launch({
    executablePath,
    headless: isTest === true,
    devtools: isTest !== true,
  });
  const page = await browser.newPage();
  if (isTest) {
    page.on("console", async (msg) => {
      const txt = msg.text();
      // jasmine test end
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
              config.projectRootDir,
              key.split(`:${config.devServer.port}`, 2)[1],
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
        await writeFile(`./TESTS-xunit.xml`, xunit);
        log("Reporting complete");
        // await server.close();
        // await esbuild.stop();
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
        log(txt);
      }
    });
    await page.coverage.startJSCoverage();
  }
  await page.goto(url).catch((e) => {
    log(e, "error");
  });
}
