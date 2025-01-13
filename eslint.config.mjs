import config from "@pggm/p-build/eslint.config.mjs";

// // reverse the config to find the rules object
// config.reverse();
// const rules = config.find((c) => c.rules).rules;
// config.reverse();

// // turn off some rules 
// rules["@typescript-eslint/no-explicit-any"] =  "off";
// rules["sonarjs/new-cap"] = "off";

// // add **/*.spec.* to ingnores
// config.find((c) => c.ignores).ignores.push("**/*.spec.*");

export default config;
