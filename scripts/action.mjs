import process from "process";
import {log} from "./log.mjs";

const actions = ["build", "develop", "test", "testdevelop"]

let actionArgument;
const actionIndex = process.argv.indexOf("--action");
if (actionIndex > -1) {
  const argvValue = process.argv[actionIndex + 1];
  if (!actions.includes(argvValue)) {
    log(`Invalid action ${argvValue}`, "error");
    process.exit(1);
  }
  actionArgument = argvValue;
}

export const actionParam = actionArgument;