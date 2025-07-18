#!/usr/bin/env node

// Seamless Vercel deployment with automatic project context discovery
import { runDeploymentOrchestrator } from "./deployment-orchestrator.js";
import chalk from "chalk";
import inquirer from "inquirer";

async function main() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════╗
║     🚀 WSL Deployment Tool                ║
║     Seamless Vercel Deployment            ║
╚═══════════════════════════════════════════╝
  `));

  try {
    // Check if we have a commit message from command line
    const commitMessage = process.argv[2] || await promptForCommitMessage();
    
    console.log(chalk.yellow("\n🔍 Analyzing project structure..."));
    
    // Run the deployment orchestrator with auto-detection
    await runDeploymentOrchestrator("auto", commitMessage);
    
    console.log(chalk.green("\n✨ Deployment completed successfully!"));
    
  } catch (error: any) {
    console.error(chalk.red("\n❌ Deployment failed:"), error.message);
    
    // Provide helpful error messages
    if (error.message.includes("SSH")) {
      console.log(chalk.yellow("\n💡 Tip: Run 'npm run setup-ssh' to configure SSH for GitHub"));
    } else if (error.message.includes("Vercel")) {
      console.log(chalk.yellow("\n💡 Tip: Make sure you're logged into Vercel with 'vercel login'"));
    } else if (error.message.includes("git")) {
      console.log(chalk.yellow("\n💡 Tip: Initialize a git repository with 'git init' first"));
    }
    
    process.exit(1);
  }
}

async function promptForCommitMessage(): Promise<string> {
  const { message } = await inquirer.prompt([
    {
      type: "input",
      name: "message",
      message: "Enter commit message:",
      default: "Update: Deploy latest changes",
      validate: (input) => input.length > 0 || "Commit message cannot be empty"
    }
  ]);
  
  return message;
}

// Run the CLI
main().catch((error) => {
  console.error(chalk.red("Fatal error:"), error);
  process.exit(1);
});