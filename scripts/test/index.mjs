
import {readFile} from "fs/promises";
import path from "path";
import url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const test = (app, isTest, testFiles, testEntryPoints, dist) => {

    app.get("/_test", async (req, res) => {
        let content = await readFile(__dirname + "/test.html", "utf-8");
        const scripts = testFiles ? testFiles
          .map((src) => `<script defer src="${src}"></script>`)
          .join("\n") : "";
        const testEntries = testEntryPoints
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
}

export default test;
