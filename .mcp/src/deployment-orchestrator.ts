// deployment-orchestrator.ts
import { promisify } from "node:util";
import { exec as execCallback } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import inquirer from "inquirer";
import { checkSSHAgent, checkGitHubSSHConnection, sshSetupWizard } from "./ssh-setup.js";
import { projectContextScan } from "./project-context.js";
import { gitStageCommitPush } from "./git-helper.js";

const exec = promisify(execCallback);

interface DeploymentConfig {
  projectType: "frontend" | "backend" | "fullstack" | "auto";
  commitMessage?: string;
  skipChecks?: boolean;
  autoFix?: boolean;
}

interface PreflightResult {
  passed: boolean;
  issues: string[];
  warnings: string[];
}

export class DeploymentOrchestrator {
  private projectRoot: string;
  private config: DeploymentConfig;

  constructor(projectRoot: string, config: DeploymentConfig) {
    this.projectRoot = projectRoot;
    this.config = config;
  }

  async runSeamlessDeployment(): Promise<void> {
    console.log(chalk.blue("\n🚀 Starting Seamless Deployment Process...\n"));

    try {
      // Step 1: Project validation
      if (!this.config.skipChecks) {
        const preflightResult = await this.runPreflightChecks();
        
        if (!preflightResult.passed) {
          console.log(chalk.red("\n❌ Pre-flight checks failed:"));
          preflightResult.issues.forEach(issue => console.log(`  - ${issue}`));
          
          if (this.config.autoFix) {
            console.log(chalk.yellow("\n🔧 Attempting automatic fixes..."));
            await this.attemptAutoFixes(preflightResult);
          } else {
            const { proceed } = await inquirer.prompt([{
              type: "confirm",
              name: "proceed",
              message: "Would you like to try automatic fixes?",
              default: true
            }]);
            
            if (proceed) {
              await this.attemptAutoFixes(preflightResult);
            } else {
              throw new Error("Deployment cancelled due to pre-flight issues");
            }
          }
        }
      }

      // Step 2: Detect project type if auto
      if (this.config.projectType === "auto") {
        this.config.projectType = await this.detectProjectType();
        console.log(chalk.green(`✅ Detected project type: ${this.config.projectType}`));
      }

      // Step 3: Prepare for deployment
      await this.prepareDeployment();

      // Step 4: Git operations
      if (this.config.commitMessage) {
        console.log(chalk.cyan("\n📤 Committing and pushing changes..."));
        await gitStageCommitPush(this.config.commitMessage);
      }

      // Step 5: Deploy to Vercel
      console.log(chalk.cyan("\n🌐 Deploying to Vercel..."));
      await this.deployToVercel();

      console.log(chalk.green("\n✨ Deployment completed successfully!"));
      
    } catch (error: any) {
      console.error(chalk.red("\n❌ Deployment failed:"), error.message);
      throw error;
    }
  }

  private async runPreflightChecks(): Promise<PreflightResult> {
    const issues: string[] = [];
    const warnings: string[] = [];

    console.log(chalk.cyan("🔍 Running pre-flight checks...\n"));

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    if (majorVersion < 16) {
      issues.push(`Node.js version ${nodeVersion} is too old. Version 16+ required.`);
    }

    // Check Git repository
    try {
      await exec("git status", { cwd: this.projectRoot });
    } catch {
      issues.push("Not a Git repository. Run 'git init' first.");
    }

    // Check SSH setup
    const sshAgentRunning = await checkSSHAgent();
    const githubConnected = await checkGitHubSSHConnection();
    
    if (!sshAgentRunning) {
      issues.push("SSH agent is not running");
    }
    
    if (!githubConnected) {
      issues.push("Cannot connect to GitHub via SSH");
    }

    // Check package.json
    const packageJsonPath = join(this.projectRoot, "package.json");
    if (!existsSync(packageJsonPath)) {
      issues.push("No package.json found");
    } else {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
        
        if (!packageJson.name) {
          warnings.push("package.json missing 'name' field");
        }
        
        if (!packageJson.scripts?.build && this.config.projectType !== "backend") {
          warnings.push("No build script defined in package.json");
        }
      } catch {
        issues.push("Invalid package.json");
      }
    }

    // Check Vercel configuration
    try {
      await exec("vercel --version");
    } catch {
      issues.push("Vercel CLI not installed. Run 'npm install -g vercel'");
    }

    // Check for Vercel token
    if (!process.env.VERCEL_TOKEN) {
      warnings.push("No VERCEL_TOKEN environment variable found. You may need to login.");
    }

    return {
      passed: issues.length === 0,
      issues,
      warnings
    };
  }

  private async attemptAutoFixes(preflightResult: PreflightResult): Promise<void> {
    for (const issue of preflightResult.issues) {
      if (issue.includes("Git repository")) {
        console.log(chalk.yellow("🔧 Initializing Git repository..."));
        await exec("git init", { cwd: this.projectRoot });
        await exec("git add .", { cwd: this.projectRoot });
        await exec('git commit -m "Initial commit"', { cwd: this.projectRoot });
      }
      
      if (issue.includes("SSH")) {
        console.log(chalk.yellow("🔧 Setting up SSH..."));
        await sshSetupWizard();
      }
      
      if (issue.includes("package.json")) {
        console.log(chalk.yellow("🔧 Creating package.json..."));
        const packageJson = {
          name: this.projectRoot.split('/').pop(),
          version: "1.0.0",
          scripts: {
            build: "echo 'No build step configured'",
            start: "node index.js"
          }
        };
        writeFileSync(
          join(this.projectRoot, "package.json"),
          JSON.stringify(packageJson, null, 2)
        );
      }
      
      if (issue.includes("Vercel CLI")) {
        console.log(chalk.yellow("🔧 Installing Vercel CLI..."));
        await exec("npm install -g vercel");
      }
    }
  }

  private async detectProjectType(): Promise<"frontend" | "backend" | "fullstack"> {
    const context = await projectContextScan(this.projectRoot);
    
    const hasFrontend = context.technologies?.some(tech => 
      ["react", "vue", "angular", "next.js", "gatsby"].includes(tech.toLowerCase())
    );
    
    const hasBackend = context.technologies?.some(tech => 
      ["express", "fastify", "koa", "nest.js"].includes(tech.toLowerCase())
    );
    
    if (hasFrontend && hasBackend) return "fullstack";
    if (hasFrontend) return "frontend";
    if (hasBackend) return "backend";
    
    // Default to frontend if uncertain
    return "frontend";
  }

  private async prepareDeployment(): Promise<void> {
    console.log(chalk.cyan("\n📦 Preparing deployment..."));
    
    // Install dependencies if needed
    const nodeModulesExists = existsSync(join(this.projectRoot, "node_modules"));
    if (!nodeModulesExists) {
      console.log(chalk.yellow("📥 Installing dependencies..."));
      await exec("npm install", { cwd: this.projectRoot });
    }
    
    // Run build if available
    try {
      const packageJson = JSON.parse(
        readFileSync(join(this.projectRoot, "package.json"), "utf-8")
      );
      
      if (packageJson.scripts?.build) {
        console.log(chalk.yellow("🔨 Running build script..."));
        await exec("npm run build", { cwd: this.projectRoot });
      }
    } catch (error) {
      console.log(chalk.yellow("⚠️  Could not run build script"));
    }
  }

  private async deployToVercel(): Promise<void> {
    try {
      // Check if we're logged in to Vercel
      try {
        await exec("vercel whoami");
      } catch {
        console.log(chalk.yellow("🔐 Not logged in to Vercel. Initiating login..."));
        await exec("vercel login");
      }
      
      // Deploy based on project type
      let deployCommand = "vercel --prod";
      
      if (this.config.projectType === "backend") {
        // For backend projects, we might need different settings
        deployCommand += " --no-clipboard";
      }
      
      console.log(chalk.cyan("🚀 Deploying to Vercel..."));
      const { stdout } = await exec(deployCommand, { 
        cwd: this.projectRoot,
        env: { ...process.env, FORCE_COLOR: "1" }
      });
      
      console.log(stdout);
      
      // Extract deployment URL
      const urlMatch = stdout.match(/https:\/\/[^\s]+\.vercel\.app/);
      if (urlMatch) {
        console.log(chalk.green(`\n🌐 Deployment URL: ${urlMatch[0]}`));
      }
      
    } catch (error) {
      if ((error as any).message.includes("No project found")) {
        console.log(chalk.yellow("📝 Creating new Vercel project..."));
        await exec("vercel --prod", { cwd: this.projectRoot });
      } else {
        throw error;
      }
    }
  }
}

// Export convenient wrapper function
export async function runDeploymentOrchestrator(
  projectType: "frontend" | "backend" | "fullstack" | "auto" = "auto",
  commitMessage?: string
): Promise<void> {
  const orchestrator = new DeploymentOrchestrator(process.cwd(), {
    projectType,
    commitMessage,
    autoFix: true
  });
  
  await orchestrator.runSeamlessDeployment();
}

// Direct Vercel deployment helper
export async function seamlessVercelDeploy(): Promise<void> {
  const { commitMessage } = await inquirer.prompt([{
    type: "input",
    name: "commitMessage",
    message: "Enter commit message (or press Enter to skip Git):",
    default: ""
  }]);
  
  await runDeploymentOrchestrator("auto", commitMessage || undefined);
}