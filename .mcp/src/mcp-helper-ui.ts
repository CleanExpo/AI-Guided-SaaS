import inquirer from "inquirer";
import path from "path";
import fs from "fs";
import { execSync, spawnSync } from "child_process";

const PROJECT_ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();

function safePrint(msg: string) {
  process.stdout.write(msg + "\n");
}

function showHelp() {
  safePrint(`
Welcome to the MCP Deployment Helper!

This tool automates common steps:
- Adds/saves code changes
- Commits to git
- Pushes to GitHub (checks for SSH)
- Launches your Vercel deploy with visible logs
- Detects misplaced files

Anything goes wrong, you'll get plain-English help.
`);
}

function checkMisplacedFiles() {
  let issues: string[] = [];
  function walk(dir: string) {
    try {
      fs.readdirSync(dir).forEach((file) => {
        const resolved = path.join(dir, file);
        if (fs.lstatSync(resolved).isDirectory() && !resolved.includes("node_modules") && !file.startsWith('.')) {
          walk(resolved);
        } else if (!resolved.startsWith(PROJECT_ROOT)) {
          issues.push(resolved);
        }
      });
    } catch (err) {
      // Skip directories we can't read
    }
  }
  walk(PROJECT_ROOT);
  return issues;
}

function moveMisplacedFiles(issues: string[]) {
  for (const file of issues) {
    try {
      const basename = path.basename(file);
      const dest = path.join(PROJECT_ROOT, basename);
      fs.renameSync(file, dest);
      safePrint(`Moved ${file} → ${dest}`);
    } catch (err) {
      safePrint(`⚠️  Could not move ${file}: ${err}`);
    }
  }
}

function ensureSSHAgent() {
  try {
    execSync("ssh-add -l", { stdio: "ignore" });
  } catch {
    safePrint("🔑 SSH agent not found. Please run 'eval \"$(ssh-agent -s)\" && ssh-add ~/.ssh/id_rsa'");
    throw new Error("SSH agent missing");
  }
}

function runGitAll(commitMsg: string) {
  ensureSSHAgent();
  try {
    execSync("git add -A", { cwd: PROJECT_ROOT, stdio: "inherit" });
    execSync("git status --short", { cwd: PROJECT_ROOT, stdio: "inherit" });
    execSync(`git commit -m "${commitMsg}"`, { cwd: PROJECT_ROOT, stdio: "inherit" });
    execSync("git push", { cwd: PROJECT_ROOT, stdio: "inherit" });
    safePrint("✔️ All changes pushed successfully.");
  } catch (err) {
    safePrint("❌ Git operation failed. Please check the SSH agent or verify remote settings.");
    throw err;
  }
}

function vercelDeploy() {
  const deploy = spawnSync("vercel", ["--prod"], { stdio: "inherit" });
  if (deploy.status !== 0) {
    safePrint("❌ Vercel deploy failed. Double-check login or token.");
    throw new Error("Vercel deploy error");
  }
  safePrint("🌍 Site deploy triggered on Vercel!");
}

export async function mcpHelperMenu() {
  showHelp();
mainloop:
  while (true) {
    const resp = await inquirer.prompt([
      {
        name: "action",
        type: "list",
        message: "What would you like to do?",
        choices: [
          { name: "📦 Publish My Changes Online (Commit, Push, and Deploy)", value: "deploy" },
          { name: "👀 Check for misplaced files and fix", value: "fixfiles" },
          { name: "🔧 Help / Troubleshooting Guide", value: "help" },
          { name: "🚪 Exit", value: "exit" }
        ]
      }
    ]);
    switch (resp.action) {
      case "deploy":
        try {
          const misplaced = checkMisplacedFiles();
          if (misplaced.length) {
            safePrint("⚠️  Files found outside your project root: " + misplaced.join(", "));
            const fix = await inquirer.prompt({
              name: "move",
              type: "confirm",
              message: "Move them into your project root?"
            });
            if (fix.move) moveMisplacedFiles(misplaced);
            else continue mainloop;
          }
          const { msg } = await inquirer.prompt({
            name: "msg",
            type: "input",
            message: "Enter a commit message:",
            default: "Update via MCP Helper"
          });
          runGitAll(msg);
          vercelDeploy();
          safePrint("🎉 Done! Your changes are live.");
        } catch (e) {
          safePrint("🛑 An error occurred: " + (e instanceof Error ? e.message : String(e)));
        }
        break;
      case "fixfiles":
        const issues = checkMisplacedFiles();
        if (!issues.length) safePrint("✅ No misplaced files found!");
        else {
          safePrint("Found misplaced files:\n" + issues.join("\n"));
          const r = await inquirer.prompt({
            name: "move",
            type: "confirm",
            message: "Move these files to your project root?"
          });
          if (r.move) moveMisplacedFiles(issues);
        }
        break;
      case "help":
        showHelp();
        safePrint(`
Common Problems:
- "git" errors: Are you connected to WiFi? Is your SSH key/agent ready?
- "Vercel" errors: Run 'vercel login' or check that your Vercel token is valid.
- Misplaced files: Use option [Check for misplaced files and fix] to recover orphaned code.

For more FAQ, see CONTRIBUTING.md and README.md.
`);
        break;
      case "exit":
        break mainloop;
    }
  }
}
