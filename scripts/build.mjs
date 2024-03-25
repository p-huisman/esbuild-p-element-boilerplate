import {projectConfig} from "./config.mjs";
import {actionParam} from "./action.mjs";
import {buildBundle} from "./build-bundle.mjs";
import {buildCss} from "./build-css.mjs";
import {clean} from "./clean.mjs";
import {startServer, broadcast} from "./dev-server.mjs";
import {log} from "./log.mjs";

log("Starting " + actionParam);

clean(projectConfig);

if (actionParam !== "build") {
  startServer(projectConfig).then(() => {;
    Promise.all([
        buildCss(projectConfig, actionParam, broadcast),
        buildBundle(projectConfig, actionParam, broadcast)
      ]).then(() => {
        if (actionParam !== "develop") {
          log("start test");
        }
      }); 
  });
} else {
  buildCss(projectConfig, actionParam),
  buildBundle(projectConfig, actionParam)
}
