// system-check.ts
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir, platform } from "os";
import chalk from "chalk";
import inquirer from "inquirer";

interface SystemCheckResult {
  passed: boolean;
  warnings: string[];
  errors: string[];
  info: Record<string, string>;
}

interface Prerequisite {
  name: string;
  command: string;
  minVersion?: string;
  required: boolean;
}

export async function runSystemCheck(): Promise<SystemCheckResult> {
  const result: SystemCheckResult = {
    passed: true,
    warnings: [],
    errors: [],
    info: {}
  };

  console.log(chalk.cyan("🔍 Running System Diagnostics...\n"));

  // Check OS and environment
  checkOperatingSystem(result);
  
  // Check prerequisites
  await checkPrerequisites(result);
  
  // Check environment variables
  checkEnvironmentVariables(result);
  
  // Check network connectivity
  await checkNetworkConnectivity(result);
  
  // Check disk space
  checkDiskSpace(result);
  
  // Display results
  displayResults(result);
  
  return result;
}

function checkOperatingSystem(result: SystemCheckResult): void {
  console.log(chalk.blue("📋 Operating System:"));
  
  result.info["Platform"] = platform();
  result.info["Architecture"] = process.arch;
  result.info["Node Version"] = process.version;
  
  // Check if running in WSL
  if (platform() === "linux") {
    try {
      const osRelease = readFileSync("/etc/os-release", "utf-8");
      if (osRelease.includes("Microsoft") || osRelease.includes("WSL")) {
        result.info["Environment"] = "WSL";
        console.log(chalk.green("  ✅ Running in WSL"));
        
        // Check WSL version
        try {
          const wslVersion = execSync("wsl.exe -l -v", { encoding: "utf-8" });
          if (wslVersion.includes("WSL2")) {
            result.info["WSL Version"] = "2";
          } else {
            result.info["WSL Version"] = "1";
            result.warnings.push("WSL 1 detected. WSL 2 is recommended for better performance.");
          }
        } catch {
          // Can't determine WSL version
        }
      } else {
        result.info["Environment"] = "Native Linux";
        console.log(chalk.green("  ✅ Running on Native Linux"));
      }
    } catch {
      result.info["Environment"] = "Unknown Linux";
    }
  } else if (platform() === "darwin") {
    result.info["Environment"] = "macOS";
    console.log(chalk.green("  ✅ Running on macOS"));
  } else if (platform() === "win32") {
    result.info["Environment"] = "Windows";
    result.warnings.push("Running on Windows. Consider using WSL for better compatibility.");
  }
  
  console.log("");
}

async function checkPrerequisites(result: SystemCheckResult): Promise<void> {
  console.log(chalk.blue("📦 Checking Prerequisites:"));
  
  const prerequisites: Prerequisite[] = [
    { name: "Git", command: "git --version", minVersion: "2.25.0", required: true },
    { name: "Node.js", command: "node --version", minVersion: "16.0.0", required: true },
    { name: "npm", command: "npm --version", minVersion: "7.0.0", required: true },
    { name: "Vercel CLI", command: "vercel --version", required: false },
    { name: "SSH", command: "ssh -V", required: true }
  ];
  
  for (const prereq of prerequisites) {
    try {
      const output = execSync(prereq.command, { encoding: "utf-8" }).trim();
      const version = extractVersion(output);
      
      if (prereq.minVersion && version) {
        if (compareVersions(version, prereq.minVersion) < 0) {
          result.warnings.push(
            `${prereq.name} version ${version} is below recommended ${prereq.minVersion}`
          );
          console.log(chalk.yellow(`  ⚠️  ${prereq.name}: ${version} (min: ${prereq.minVersion})`));
        } else {
          console.log(chalk.green(`  ✅ ${prereq.name}: ${version}`));
        }
      } else {
        console.log(chalk.green(`  ✅ ${prereq.name}: Installed`));
      }
      
      result.info[prereq.name] = version || "Installed";
    } catch (error) {
      if (prereq.required) {
        result.errors.push(`${prereq.name} is not installed`);
        result.passed = false;
        console.log(chalk.red(`  ❌ ${prereq.name}: Not found`));
      } else {
        result.warnings.push(`${prereq.name} is not installed (optional)`);
        console.log(chalk.yellow(`  ⚠️  ${prereq.name}: Not found (optional)`));
      }
    }
  }
  
  console.log("");
}

function checkEnvironmentVariables(result: SystemCheckResult): void {
  console.log(chalk.blue("🔐 Environment Variables:"));
  
  const envVars = [
    { name: "VERCEL_TOKEN", required: false, sensitive: true },
    { name: "NODE_ENV", required: false, sensitive: false },
    { name: "HOME", required: true, sensitive: false },
    { name: "PATH", required: true, sensitive: false }
  ];
  
  for (const envVar of envVars) {
    const value = process.env[envVar.name];
    
    if (value) {
      if (envVar.sensitive) {
        console.log(chalk.green(`  ✅ ${envVar.name}: Set (hidden)`));
        result.info[envVar.name] = "Set";
      } else {
        console.log(chalk.green(`  ✅ ${envVar.name}: ${value.substring(0, 50)}...`));
        result.info[envVar.name] = value.length > 50 ? value.substring(0, 50) + "..." : value;
      }
    } else {
      if (envVar.required) {
        result.errors.push(`Required environment variable ${envVar.name} is not set`);
        result.passed = false;
        console.log(chalk.red(`  ❌ ${envVar.name}: Not set`));
      } else {
        console.log(chalk.yellow(`  ⚠️  ${envVar.name}: Not set (optional)`));
      }
    }
  }
  
  console.log("");
}

async function checkNetworkConnectivity(result: SystemCheckResult): Promise<void> {
  console.log(chalk.blue("🌐 Network Connectivity:"));
  
  const endpoints = [
    { name: "GitHub", host: "github.com", required: true },
    { name: "npm Registry", host: "registry.npmjs.org", required: true },
    { name: "Vercel", host: "vercel.com", required: false }
  ];
  
  for (const endpoint of endpoints) {
    try {
      execSync(`ping -c 1 -W 2 ${endpoint.host}`, { stdio: "ignore" });
      console.log(chalk.green(`  ✅ ${endpoint.name}: Reachable`));
      result.info[`${endpoint.name} Connection`] = "OK";
    } catch {
      if (endpoint.required) {
        result.errors.push(`Cannot reach ${endpoint.name} (${endpoint.host})`);
        result.passed = false;
        console.log(chalk.red(`  ❌ ${endpoint.name}: Unreachable`));
      } else {
        result.warnings.push(`Cannot reach ${endpoint.name} (${endpoint.host})`);
        console.log(chalk.yellow(`  ⚠️  ${endpoint.name}: Unreachable`));
      }
    }
  }
  
  console.log("");
}

function checkDiskSpace(result: SystemCheckResult): void {
  console.log(chalk.blue("💾 Disk Space:"));
  
  try {
    const dfOutput = execSync("df -h .", { encoding: "utf-8" });
    const lines = dfOutput.trim().split("\n");
    
    if (lines.length >= 2) {
      const dataLine = lines[1];
      const parts = dataLine.split(/\s+/);
      
      if (parts.length >= 6) {
        const used = parts[2];
        const available = parts[3];
        const usePercent = parts[4];
        
        console.log(chalk.green(`  ✅ Available: ${available}, Used: ${used} (${usePercent})`));
        result.info["Disk Space"] = `${available} available`;
        
        // Warn if disk usage is high
        const percentNum = parseInt(usePercent.replace("%", ""));
        if (percentNum > 90) {
          result.warnings.push("Disk usage is above 90%");
        }
      }
    }
  } catch {
    result.warnings.push("Could not check disk space");
    console.log(chalk.yellow("  ⚠️  Could not check disk space"));
  }
  
  console.log("");
}

function displayResults(result: SystemCheckResult): void {
  console.log(chalk.blue("📊 System Check Summary:"));
  console.log("");
  
  if (result.passed && result.errors.length === 0) {
    console.log(chalk.green("✅ All system checks passed!"));
  } else {
    console.log(chalk.red("❌ Some system checks failed."));
  }
  
  if (result.errors.length > 0) {
    console.log(chalk.red("\nErrors:"));
    result.errors.forEach(error => console.log(chalk.red(`  • ${error}`)));
  }
  
  if (result.warnings.length > 0) {
    console.log(chalk.yellow("\nWarnings:"));
    result.warnings.forEach(warning => console.log(chalk.yellow(`  • ${warning}`)));
  }
  
  console.log("");
}

// Helper functions
function extractVersion(versionString: string): string | null {
  const match = versionString.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split(".").map(Number);
  const v2Parts = version2.split(".").map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

// Export additional diagnostic functions
export async function checkProjectHealth(projectPath: string): Promise<void> {
  console.log(chalk.cyan("\n🏥 Checking Project Health...\n"));
  
  // Check package.json
  const packageJsonPath = join(projectPath, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      console.log(chalk.green("✅ Valid package.json found"));
      
      // Check for important fields
      if (!packageJson.name) {
        console.log(chalk.yellow("  ⚠️  Missing 'name' field"));
      }
      if (!packageJson.version) {
        console.log(chalk.yellow("  ⚠️  Missing 'version' field"));
      }
      if (!packageJson.scripts) {
        console.log(chalk.yellow("  ⚠️  No scripts defined"));
      } else {
        if (!packageJson.scripts.build) {
          console.log(chalk.yellow("  ⚠️  No 'build' script"));
        }
        if (!packageJson.scripts.start) {
          console.log(chalk.yellow("  ⚠️  No 'start' script"));
        }
      }
    } catch (error) {
      console.log(chalk.red("❌ Invalid package.json"));
    }
  } else {
    console.log(chalk.red("❌ No package.json found"));
  }
  
  // Check node_modules
  const nodeModulesPath = join(projectPath, "node_modules");
  if (existsSync(nodeModulesPath)) {
    console.log(chalk.green("✅ Dependencies installed"));
  } else {
    console.log(chalk.yellow("⚠️  No node_modules found - run 'npm install'"));
  }
  
  // Check for lock files
  const lockFiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
  let foundLock = false;
  for (const lockFile of lockFiles) {
    if (existsSync(join(projectPath, lockFile))) {
      console.log(chalk.green(`✅ Found ${lockFile}`));
      foundLock = true;
      break;
    }
  }
  
  if (!foundLock) {
    console.log(chalk.yellow("⚠️  No lock file found"));
  }
  
  console.log("");
}

// Interactive setup for missing prerequisites
export async function setupMissingPrerequisites(): Promise<void> {
  const result = await runSystemCheck();
  
  if (result.errors.length === 0) {
    console.log(chalk.green("\n✨ No missing prerequisites!"));
    return;
  }
  
  console.log(chalk.cyan("\n🔧 Setting up missing prerequisites...\n"));
  
  for (const error of result.errors) {
    if (error.includes("Git")) {
      console.log(chalk.yellow("📦 Git is required. Please install it:"));
      console.log(chalk.white("  Ubuntu/Debian: sudo apt-get install git"));
      console.log(chalk.white("  macOS: brew install git"));
    }
    
    if (error.includes("Vercel CLI")) {
      const { installVercel } = await inquirer.prompt([
        {
          type: "confirm",
          name: "installVercel",
          message: "Would you like to install Vercel CLI?",
          default: true
        }
      ]);
      
      if (installVercel) {
        try {
          console.log(chalk.cyan("📦 Installing Vercel CLI..."));
          execSync("npm install -g vercel", { stdio: "inherit" });
          console.log(chalk.green("✅ Vercel CLI installed successfully"));
        } catch (error) {
          console.log(chalk.red("❌ Failed to install Vercel CLI"));
        }
      }
    }
  }
}