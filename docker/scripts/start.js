import { spawnSync } from "node:child_process";

const bold = "\x1b[1m";
const underline = "\x1b[4m";
const green = "\x1b[32m";
const cyan = "\x1b[36m";
const yellow = "\x1b[33m";
const reset = "\x1b[0m";
const blue = "\x1b[34m";

process.stdout.write("\x1Bc"); // Clear console
console.log(`${bold}${blue}🐋 Starting Monster Counterr Docker...${reset}\n`);

const pull = process.argv.includes("pull");

const commandArgs = [
  "compose",
  "up",
  "-d",
  "--force-recreate",
  "--remove-orphans",
];

if (pull) {
  commandArgs.push("--pull", "always");
}

const result = spawnSync("docker", commandArgs, {
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status);
}

console.log(`
${bold}${green}💀 Monster Counterr is ready!${reset}

${cyan}👉 Your application is running in Docker and is reachable at ${bold}${underline}https://localhost${reset}

${yellow}🛑 To stop the containers, execute: ${bold}npm run stop${reset}
${yellow}✏️  To rerun with logs, execute: ${bold}npm run logs${reset}
`);
