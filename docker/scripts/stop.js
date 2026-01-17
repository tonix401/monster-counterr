import { spawnSync } from "node:child_process";

const bold = "\x1b[1m";
const green = "\x1b[32m";
const blue = "\x1b[34m";
const reset = "\x1b[0m";

process.stdout.write("\x1Bc"); // Clear console
console.log(`${bold}${blue}🐋 Stopping Monster Counterr Docker...${reset}\n`);

const result = spawnSync("docker", ["compose", "down"], {
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status);
}

console.log(`\n${bold}${green}✅ Monster Counterr has been stopped!${reset}`);
