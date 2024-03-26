
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function (config, action) {
  return (req, res, next) => {
    if (req.url === "/dev-server-client.js") {
      const script = fs.readFileSync(path.join(__dirname, "../.dev-server-client.js"), "utf-8");
      res.send(script);
    } else if (req.url.startsWith("/test.html")) {
      let content = fs.readFileSync(__dirname + "/.test.html", "utf-8");
      const scripts = config.testFiles ? config.testFiles
        .map((src) => `<script defer src="${src}"></script>`)
        .join("\n") : "";
      const testEntries = config.testEntryPoints
        .map(
          (entry) =>
            `<script defer src="/${path.join(config.dist, path.parse(entry).name).replaceAll("\\", "/")}.js"></script>`,
        )
        .join("\n");
      content = content.replace(
        "<!-- scripts -->",
        "<!-- scripts -->\r\n" +
        scripts +
        testEntries +
        "\r\n<!-- end scripts -->\r\n",
      );
      if (action === "test") {
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
    } else {
      next();
    }
  }
};
