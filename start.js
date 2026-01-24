import { spawnSync } from "node:child_process";

const bold = "\x1b[1m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const reset = "\x1b[0m";
const dim = "\x1b[2m";

function runDimmed(cmd, args = []) {
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    shell: true,
  });

  if (result.stdout) {
    process.stdout.write(
      dim + result.stdout.replace(/\x1b\[0m/g, reset + dim) + reset
    );
  }

  if (result.stderr) {
    process.stderr.write(
      dim + result.stderr.replace(/\x1b\[0m/g, reset + dim) + reset
    );
  }

  if (result.status !== 0) {
    process.exit(result.status);
  }
}

console.clear();
console.log(`${dim}-------------------------------------------${reset}`);
console.log(`${bold}${green}🚀 Starting Monster Counter...${reset}`);

runDimmed("tsc -b");
runDimmed('vite build')

console.log(`
${bold}${green}💀 Monster Counter is ready!${reset}
${yellow}⏹  To stop the server, press Ctrl + C${reset}
`);

spawnSync(`vite preview`, {
  stdio: "inherit",
  shell: true,
});