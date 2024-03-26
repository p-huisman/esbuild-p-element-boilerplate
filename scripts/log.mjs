import {Console} from "console";
import process from "process";

let logConsole;
if (!logConsole) {
  logConsole = new Console(process.stdout, process.stderr);
}

export const console = logConsole;

export function log(message, level = "log") {
  const logColor = {
    log: "\x1b[00m",
    info: "\x1b[36m",
    warn: "\x1b[33m",
    error: "\x1b[31m",
  };

  if (typeof message !== "object") {
    logConsole[level](`${logColor[level]}[${new Date().toISOString().split("T")[1].split("Z")[0]}] ${message}`);
  }
}
