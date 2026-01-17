import { spawn } from "node:child_process";

const bold = "\x1b[1m";
const blue = "\x1b[34m";
const reset = "\x1b[0m";

process.stdout.write("\x1Bc"); // Clear console
console.log(
  `${bold}${blue}🐋 Showing Monster Counterr Docker logs...${reset}\n`,
);

const child = spawn("docker", ["compose", "logs", "-f"], {
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code);
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
  process.exit(0);
});
