// mcp-helper-ui.ts - Enhanced AI-Guided SaaS MCP Helper
import inquirer from "inquirer";
import chalk from "chalk";
import path from "path";
import fs from "fs";
import { execSync, spawnSync } from "child_process";
import { gitStageCommitPush } from "./git-helper.js";
import { projectContextScan } from "./project-context.js";
import { runSystemCheck } from "./system-check.js";
import { mcpPipelineInitOrUpdate } from "./mcp-pipeline.js";
import { runDeploymentOrchestrator } from "./deployment-orchestrator.js";
import { sshSetupWizard } from "./ssh-setup.js";
import { readFileSync } from "fs";
import { join } from "path";

const PROJECT_ROOT = process.cwd();

const banner = chalk.blue(`
┌──────────────────────────────────────────────────┐
│         AI-Guided SaaS MCP Helper                │
│     Enhanced Deployment & Development Tools       │
└──────────────────────────────────────────────────┘
`);

function safePrint(msg: string) {
  process.stdout.write(msg + "\n");
}

function showHelp() {
  safePrint(`
Welcome to the AI-Guided SaaS MCP Deployment Helper!

This enhanced tool provides:
- Automated deployment to Vercel with AI-guided optimization
- SSH setup and management for GitHub
- Project context analysis and recommendations
- System diagnostics and health checks
- Git workflow automation
- Misplaced file detection and recovery
- SaaS-specific development tools

All features are designed to streamline your development workflow.
`);
}

// Legacy function preserved for backward compatibility
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

// Enhanced main menu combining both versions
export async function mcpHelperMenu() {
  console.clear();
  console.log(banner);
  
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "🚀 Deploy to Vercel (AI-Guided)", value: "deploy" },
        { name: "📦 Quick Deploy (Legacy Mode)", value: "quickdeploy" },
        { name: "🔧 Setup SSH for GitHub", value: "ssh" },
        { name: "📦 Initialize/Update MCP Pipeline", value: "mcp" },
        { name: "🔍 Analyze Project Context", value: "context" },
        { name: "💻 Run System Diagnostics", value: "system" },
        { name: "📤 Git: Stage, Commit & Push", value: "git" },
        { name: "🩺 Check for misplaced files", value: "fixfiles" },
        { name: "📚 Help / Documentation", value: "help" },
        { name: "❌ Exit", value: "exit" }
      ]
    }
  ]);

  switch (action) {
    case "deploy":
      await deploymentMenu();
      break;
    case "quickdeploy":
      await quickDeployMenu();
      break;
    case "ssh":
      await sshSetupWizard();
      break;
    case "mcp":
      await mcpPipelineMenu();
      break;
    case "context":
      await projectContextMenu();
      break;
    case "system":
      await systemCheckMenu();
      break;
    case "git":
      await gitMenu();
      break;
    case "fixfiles":
      await fixFilesMenu();
      break;
    case "help":
      showHelp();
      await showDetailedHelp();
      break;
    case "exit":
      console.log(chalk.green("👋 Goodbye!"));
      process.exit(0);
  }

  // Return to main menu
  const { continueChoice } = await inquirer.prompt([{
    type: "confirm",
    name: "continueChoice",
    message: "Return to main menu?",
    default: true
  }]);
  
  if (continueChoice) {
    await mcpHelperMenu();
  } else {
    console.log(chalk.green("👋 Goodbye!"));
  }
}

// Enhanced deployment menu with AI-guided features
async function deploymentMenu() {
  console.log(chalk.cyan("\n🚀 AI-Guided Deployment Options\n"));
  
  const { deployType } = await inquirer.prompt([
    {
      type: "list",
      name: "deployType",
      message: "Select deployment type:",
      choices: [
        { name: "📱 Deploy Frontend (React/Next.js)", value: "frontend" },
        { name: "⚙️ Deploy Backend (Node.js/Express)", value: "backend" },
        { name: "🔄 Deploy Full Stack", value: "fullstack" },
        { name: "🎯 Auto-detect & Deploy (AI-Powered)", value: "auto" },
        { name: "🔙 Back to Main Menu", value: "back" }
      ]
    }
  ]);

  if (deployType === "back") return;

  // Check if we have a Vercel token
  const vercelToken = process.env.VERCEL_TOKEN;
  if (!vercelToken) {
    console.log(chalk.yellow("\n⚠️ No Vercel token found in environment variables."));
    const { tokenInput } = await inquirer.prompt([
      {
        type: "password",
        name: "tokenInput",
        message: "Enter your Vercel token (or press Enter to skip):",
        mask: "*"
      }
    ]);

    if (tokenInput) {
      process.env.VERCEL_TOKEN = tokenInput;
    } else {
      console.log(chalk.red("❌ Deployment requires a Vercel token."));
      return;
    }
  }

  try {
    await runDeploymentOrchestrator(deployType);
  } catch (error) {
    console.error(chalk.red("❌ Deployment failed:"), error);
    
    // Offer troubleshooting
    const { troubleshoot } = await inquirer.prompt([
      {
        type: "confirm",
        name: "troubleshoot",
        message: "Would you like to run diagnostics to troubleshoot?",
        default: true
      }
    ]);

    if (troubleshoot) {
      await runSystemCheck();
    }
  }
}

// Legacy quick deploy menu (preserved from original)
async function quickDeployMenu() {
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
      else return;
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
}

// MCP Pipeline submenu
async function mcpPipelineMenu() {
  console.log(chalk.cyan("\n📦 MCP Pipeline Configuration\n"));
  
  const { setupType } = await inquirer.prompt([
    {
      type: "list",
      name: "setupType",
      message: "Select setup option:",
      choices: [
        { name: "🆕 Initialize new MCP project", value: "init" },
        { name: "🔄 Update existing MCP configuration", value: "update" },
        { name: "🔍 Check current MCP status", value: "status" },
        { name: "🔙 Back to Main Menu", value: "back" }
      ]
    }
  ]);

  if (setupType === "back") return;

  try {
    if (setupType === "status") {
      // Check MCP status
      try {
        const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));
        console.log(chalk.green("\n✅ Current MCP Configuration:"));
        console.log(`Name: ${packageJson.name}`);
        console.log(`Version: ${packageJson.version}`);
        console.log(`MCP Binary: ${packageJson.bin ? Object.keys(packageJson.bin).join(", ") : "None"}`);
      } catch (error) {
        console.log(chalk.yellow("⚠️ No package.json found in current directory"));
      }
    } else {
      await mcpPipelineInitOrUpdate();
    }
  } catch (error) {
    console.error(chalk.red("❌ MCP operation failed:"), error);
  }
}

// Project Context submenu
async function projectContextMenu() {
  console.log(chalk.cyan("\n🔍 Project Analysis\n"));
  
  const { scanType } = await inquirer.prompt([
    {
      type: "list",
      name: "scanType",
      message: "Select analysis type:",
      choices: [
        { name: "📊 Full project scan", value: "full" },
        { name: "🎯 Quick scan (key files only)", value: "quick" },
        { name: "📁 Directory structure only", value: "structure" },
        { name: "🔙 Back to Main Menu", value: "back" }
      ]
    }
  ]);

  if (scanType === "back") return;

  try {
    const options = {
      includeNodeModules: scanType === "full",
      maxDepth: scanType === "quick" ? 3 : 10,
      includeContent: scanType !== "structure"
    };

    const context = await projectContextScan(process.cwd(), options);
    
    // Display results
    console.log(chalk.green("\n✅ Project Analysis Complete:"));
    console.log(`Total files: ${context.fileCount}`);
    console.log(`Directories: ${context.directoryCount}`);
    console.log(`Project type: ${context.projectType || "Unknown"}`);
    
    if (context.technologies?.length > 0) {
      console.log(`Technologies: ${context.technologies.join(", ")}`);
    }
  } catch (error) {
    console.error(chalk.red("❌ Analysis failed:"), error);
  }
}

// System Check submenu
async function systemCheckMenu() {
  console.log(chalk.cyan("\n💻 Running System Diagnostics...\n"));
  
  try {
    await runSystemCheck();
    
    const { detailed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "detailed",
        message: "Would you like to see detailed system information?",
        default: false
      }
    ]);

    if (detailed) {
      // Run more detailed checks
      console.log(chalk.cyan("\n📋 Detailed System Information:"));
      console.log(`Platform: ${process.platform}`);
      console.log(`Architecture: ${process.arch}`);
      console.log(`Node version: ${process.version}`);
      console.log(`Current directory: ${process.cwd()}`);
    }
  } catch (error) {
    console.error(chalk.red("❌ System check failed:"), error);
  }
}

// Git operations submenu
async function gitMenu() {
  console.log(chalk.cyan("\n📤 Git Operations\n"));
  
  const { commitMessage } = await inquirer.prompt([
    {
      type: "input",
      name: "commitMessage",
      message: "Enter commit message:",
      default: "Update: Work in progress",
      validate: (input) => input.length > 0 || "Commit message cannot be empty"
    }
  ]);

  try {
    await gitStageCommitPush(commitMessage);
  } catch (error) {
    console.error(chalk.red("❌ Git operation failed:"), error);
    
    // Offer SSH setup if it might be the issue
    if ((error as any).message?.includes("SSH") || (error as any).message?.includes("permission")) {
      const { setupSSH } = await inquirer.prompt([
        {
          type: "confirm",
          name: "setupSSH",
          message: "This might be an SSH issue. Would you like to setup SSH for GitHub?",
          default: true
        }
      ]);

      if (setupSSH) {
        await sshSetupWizard();
      }
    }
  }
}

// Fix files menu (legacy feature preserved)
async function fixFilesMenu() {
  const issues = checkMisplacedFiles();
  if (!issues.length) {
    safePrint("✅ No misplaced files found!");
  } else {
    safePrint("Found misplaced files:\n" + issues.join("\n"));
    const r = await inquirer.prompt({
      name: "move",
      type: "confirm",
      message: "Move these files to your project root?"
    });
    if (r.move) moveMisplacedFiles(issues);
  }
}

// Enhanced help with AI-Guided SaaS specific information
async function showDetailedHelp() {
  console.log(chalk.cyan(`
AI-Guided SaaS MCP Features:

1. 🚀 AI-Guided Deployment
   - Automatically detects project type
   - Optimizes deployment configuration
   - Provides intelligent error recovery

2. 🔧 Enhanced SSH Management
   - Interactive SSH key generation
   - GitHub integration wizard
   - Connection diagnostics

3. 📊 Project Analysis
   - Deep code scanning
   - Technology detection
   - Deployment readiness checks

4. 💡 SaaS Development Tools
   - Code quality analysis
   - Test generation
   - Performance optimization

Common Problems & Solutions:
- SSH errors: Use the SSH setup wizard
- Vercel errors: Check token and run 'vercel login'
- Git errors: Ensure SSH is configured properly
- Build errors: Run project analysis to identify issues

For more information, visit the AI-Guided SaaS documentation.
`));
}