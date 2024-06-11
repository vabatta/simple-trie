import { configure, processCLIArgs, run } from "@japa/runner";
import { expect } from "@japa/expect";
import process from "node:process";

processCLIArgs(process.argv.splice(2));
configure({
  files: ["src/**/*.spec.ts"],
  plugins: [expect()],
});

run();
