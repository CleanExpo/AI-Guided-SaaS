// vercel-helper.ts
import { promisify } from "node:util";
import { exec as execCallback, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";

const exec = promisify(execCallback);

export async function vercelDeploy(): Promise<void> {
  try {
    // First check if we're logged in
    try {
      await exec("vercel whoami");
    } catch {
      console.log(chalk.yellow("🔐 Not logged in to Vercel. Please run 'vercel login' first."));
      throw new Error("Not authenticated with Vercel");
    }

    console.log(chalk.cyan("🚀 Deploying to Vercel..."));
    
    // Use spawn for better output handling
    const deploy = spawn("vercel", ["--prod"], {
      stdio: "inherit",
      shell: true
    });

    return new Promise((resolve, reject) => {
      deploy.on("close", (code) => {
        if (code === 0) {
          console.log(chalk.green("✅ Deployment successful!"));
          resolve();
        } else {
          reject(new Error(`Deployment failed with code ${code}`));
        }
      });

      deploy.on("error", (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error(chalk.red("❌ Vercel deployment failed:"), error);
    throw error;
  }
}

// Legacy functions for backward compatibility
export function triggerVercelProdAndStreamLogs() {
  // Run prod deploy
  const log = spawn("vercel", ["--prod"], { stdio: "inherit" });
  log.on("close", (code) => {
    if (code === 0) console.log("✔️ Vercel deployment triggered.");
    else console.error("❌ Vercel deploy failed. See above logs for details.");
  });
}

export function triggerVercelDeployHook(hookUrl: string) {
  try {
    const { execSync } = require("child_process");
    execSync(`curl -X POST "${hookUrl}"`, { stdio: "inherit" });
    console.log("✔️ Vercel deploy hook triggered.");
  } catch (err) {
    console.error("❌ Vercel deploy hook failed.");
    throw err;
  }
}

// Enhanced deployment with automatic fixes
export async function deployToVercelWithFixes(): Promise<void> {
  try {
    await vercelDeploy();
  } catch (error) {
    console.log(chalk.yellow("\n🔧 Attempting to fix common deployment issues..."));
    
    // Check for common issues and fix them
    const fixed = await attemptCommonFixes();
    
    if (fixed) {
      console.log(chalk.cyan("\n🔄 Retrying deployment..."));
      await vercelDeploy();
    } else {
      throw error;
    }
  }
}

async function attemptCommonFixes(): Promise<boolean> {
  let fixApplied = false;
  
  // Fix 1: Check for vercel.json issues
  const vercelJsonPath = join(process.cwd(), "vercel.json");
  if (!existsSync(vercelJsonPath)) {
    console.log(chalk.yellow("📝 Creating vercel.json with default configuration..."));
    const defaultConfig = {
      version: 2,
      builds: [
        {
          src: "package.json",
          use: "@vercel/node"
        }
      ]
    };
    writeFileSync(vercelJsonPath, JSON.stringify(defaultConfig, null, 2));
    fixApplied = true;
  }
  
  // Fix 2: Clean .vercel directory if exists
  const vercelDir = join(process.cwd(), ".vercel");
  if (existsSync(vercelDir)) {
    console.log(chalk.yellow("🧹 Cleaning .vercel directory..."));
    rmSync(vercelDir, { recursive: true, force: true });
    fixApplied = true;
  }
  
  // Fix 3: Ensure package.json has necessary fields
  const packageJsonPath = join(process.cwd(), "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      let modified = false;
      
      if (!packageJson.engines) {
        packageJson.engines = { node: ">=16.x" };
        modified = true;
      }
      
      if (!packageJson.scripts?.build) {
        if (!packageJson.scripts) packageJson.scripts = {};
        packageJson.scripts.build = "echo 'No build step'";
        modified = true;
      }
      
      if (modified) {
        console.log(chalk.yellow("📦 Updating package.json..."));
        writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        fixApplied = true;
      }
    } catch {
      // Ignore parse errors
    }
  }
  
  return fixApplied;
}
