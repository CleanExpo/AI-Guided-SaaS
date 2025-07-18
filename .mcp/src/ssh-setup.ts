// ssh-setup.ts
import { execSync, spawnSync } from "child_process";
import inquirer from "inquirer";
import { existsSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import chalk from "chalk";

export async function checkSSHAgent(): Promise<boolean> {
  try {
    execSync("ssh-add -l", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function checkGitHubSSHConnection(): Promise<boolean> {
  try {
    execSync("ssh -T git@github.com 2>&1", { stdio: "ignore" });
    return true;
  } catch (error: any) {
    // GitHub returns exit code 1 even on successful connection
    // Check the error message to determine if connection was successful
    const output = error.stdout?.toString() || error.stderr?.toString() || "";
    return output.includes("successfully authenticated");
  }
}

export async function sshSetupWizard(): Promise<void> {
  console.log(chalk.cyan(`
🔐 SSH Key Setup Wizard for GitHub

This wizard will help you set up SSH authentication with GitHub.
`));

  // Check if SSH key exists
  const sshDir = join(homedir(), ".ssh");
  const keyTypes = ["id_rsa", "id_ed25519", "id_ecdsa"];
  let existingKey: string | null = null;

  for (const keyType of keyTypes) {
    const keyPath = join(sshDir, keyType);
    if (existsSync(keyPath)) {
      existingKey = keyPath;
      break;
    }
  }

  if (!existingKey) {
    console.log(chalk.yellow("⚠️  No SSH key found. Let's create one.\n"));
    
    const { email } = await inquirer.prompt([
      {
        type: "input",
        name: "email",
        message: "Enter your GitHub email address:",
        validate: (input) => input.includes("@") || "Please enter a valid email"
      }
    ]);

    const { keyType } = await inquirer.prompt([
      {
        type: "list",
        name: "keyType",
        message: "Select SSH key type:",
        choices: [
          { name: "Ed25519 (Recommended - Modern & Secure)", value: "ed25519" },
          { name: "RSA (Traditional - Wide Compatibility)", value: "rsa" }
        ]
      }
    ]);

    // Create SSH directory if it doesn't exist
    if (!existsSync(sshDir)) {
      mkdirSync(sshDir, { mode: 0o700 });
    }

    // Generate SSH key
    console.log(chalk.cyan("\n🔑 Generating SSH key..."));
    
    const keyPath = join(sshDir, keyType === "ed25519" ? "id_ed25519" : "id_rsa");
    const keyGenCommand = keyType === "ed25519"
      ? `ssh-keygen -t ed25519 -C "${email}" -f ${keyPath} -N ""`
      : `ssh-keygen -t rsa -b 4096 -C "${email}" -f ${keyPath} -N ""`;

    try {
      execSync(keyGenCommand);
      console.log(chalk.green("✅ SSH key generated successfully!"));
      existingKey = keyPath;
    } catch (error) {
      console.error(chalk.red("❌ Failed to generate SSH key:"), error);
      return;
    }
  } else {
    console.log(chalk.green(`✅ Found existing SSH key: ${existingKey}`));
  }

  // Check SSH agent
  const agentRunning = await checkSSHAgent();
  if (!agentRunning) {
    console.log(chalk.yellow("\n⚠️  SSH agent is not running. Starting it..."));
    
    try {
      // Start SSH agent
      const agentOutput = execSync('eval "$(ssh-agent -s)"', { shell: "/bin/bash" });
      console.log(chalk.green("✅ SSH agent started"));
      
      // Add the key to agent
      execSync(`ssh-add ${existingKey}`);
      console.log(chalk.green("✅ SSH key added to agent"));
    } catch (error) {
      console.log(chalk.yellow("\n⚠️  Could not start SSH agent automatically."));
      console.log("Please run these commands manually:");
      console.log(chalk.cyan('eval "$(ssh-agent -s)"'));
      console.log(chalk.cyan(`ssh-add ${existingKey}`));
    }
  }

  // Display public key for GitHub
  const pubKeyPath = `${existingKey}.pub`;
  if (existsSync(pubKeyPath)) {
    const pubKey = readFileSync(pubKeyPath, "utf-8").trim();
    
    console.log(chalk.cyan("\n📋 Your SSH public key:"));
    console.log(chalk.white("─".repeat(70)));
    console.log(pubKey);
    console.log(chalk.white("─".repeat(70)));
    
    console.log(chalk.cyan("\n📝 To add this key to GitHub:"));
    console.log("1. Go to https://github.com/settings/keys");
    console.log("2. Click 'New SSH key'");
    console.log("3. Give it a title (e.g., 'WSL Development')");
    console.log("4. Paste the key above");
    console.log("5. Click 'Add SSH key'");
    
    const { added } = await inquirer.prompt([
      {
        type: "confirm",
        name: "added",
        message: "Have you added the key to GitHub?",
        default: false
      }
    ]);

    if (added) {
      // Test connection
      console.log(chalk.cyan("\n🔍 Testing GitHub SSH connection..."));
      const connected = await checkGitHubSSHConnection();
      
      if (connected) {
        console.log(chalk.green("✅ Successfully connected to GitHub via SSH!"));
      } else {
        console.log(chalk.red("❌ Could not connect to GitHub via SSH."));
        console.log(chalk.yellow("Please verify that you've added the key correctly."));
      }
    }
  }

  // Configure Git to use SSH
  const { configureGit } = await inquirer.prompt([
    {
      type: "confirm",
      name: "configureGit",
      message: "Would you like to configure Git to use SSH for GitHub?",
      default: true
    }
  ]);

  if (configureGit) {
    try {
      // Set Git to use SSH for GitHub
      execSync('git config --global url."git@github.com:".insteadOf "https://github.com/"');
      console.log(chalk.green("✅ Git configured to use SSH for GitHub"));
      
      // Also configure user name and email if not set
      try {
        execSync("git config --global user.name", { stdio: "ignore" });
      } catch {
        const { name } = await inquirer.prompt([
          {
            type: "input",
            name: "name",
            message: "Enter your Git user name:"
          }
        ]);
        execSync(`git config --global user.name "${name}"`);
      }
      
      try {
        execSync("git config --global user.email", { stdio: "ignore" });
      } catch {
        const { email } = await inquirer.prompt([
          {
            type: "input",
            name: "email",
            message: "Enter your Git email:"
          }
        ]);
        execSync(`git config --global user.email "${email}"`);
      }
    } catch (error) {
      console.error(chalk.red("❌ Failed to configure Git:"), error);
    }
  }

  console.log(chalk.green("\n✨ SSH setup complete!"));
  console.log(chalk.cyan("\nTip: If you restart your terminal, remember to run:"));
  console.log(chalk.white('eval "$(ssh-agent -s)" && ssh-add'));
}

// Helper function to diagnose SSH issues
export async function diagnoseSSHIssues(): Promise<void> {
  console.log(chalk.cyan("\n🔍 Diagnosing SSH Issues...\n"));

  // Check for SSH keys
  const sshDir = join(homedir(), ".ssh");
  const keyTypes = ["id_rsa", "id_ed25519", "id_ecdsa"];
  let foundKeys = false;

  console.log("1. Checking for SSH keys:");
  for (const keyType of keyTypes) {
    const keyPath = join(sshDir, keyType);
    if (existsSync(keyPath)) {
      console.log(chalk.green(`   ✅ Found ${keyType}`));
      foundKeys = true;
    }
  }
  
  if (!foundKeys) {
    console.log(chalk.red("   ❌ No SSH keys found"));
  }

  // Check SSH agent
  console.log("\n2. Checking SSH agent:");
  const agentRunning = await checkSSHAgent();
  if (agentRunning) {
    console.log(chalk.green("   ✅ SSH agent is running"));
  } else {
    console.log(chalk.red("   ❌ SSH agent is not running"));
  }

  // Check GitHub connection
  console.log("\n3. Testing GitHub SSH connection:");
  const githubConnected = await checkGitHubSSHConnection();
  if (githubConnected) {
    console.log(chalk.green("   ✅ Can connect to GitHub via SSH"));
  } else {
    console.log(chalk.red("   ❌ Cannot connect to GitHub via SSH"));
  }

  // Check Git remote
  console.log("\n4. Checking Git remote:");
  try {
    const remoteUrl = execSync("git remote get-url origin", { encoding: "utf-8" }).trim();
    console.log(`   Remote URL: ${remoteUrl}`);
    
    if (remoteUrl.startsWith("https://")) {
      console.log(chalk.yellow("   ⚠️  Using HTTPS instead of SSH"));
      console.log(chalk.cyan("   Tip: Convert to SSH with:"));
      console.log(chalk.white(`   git remote set-url origin git@github.com:${remoteUrl.replace("https://github.com/", "")}`));
    } else if (remoteUrl.startsWith("git@github.com:")) {
      console.log(chalk.green("   ✅ Using SSH for remote"));
    }
  } catch {
    console.log(chalk.yellow("   ⚠️  No Git remote found"));
  }

  // Provide recommendations
  console.log(chalk.cyan("\n📋 Recommendations:"));
  if (!foundKeys) {
    console.log("- Run the SSH setup wizard to create SSH keys");
  }
  if (!agentRunning) {
    console.log("- Start SSH agent: eval \"$(ssh-agent -s)\"");
    if (foundKeys) {
      console.log("- Add your key: ssh-add ~/.ssh/id_rsa (or id_ed25519)");
    }
  }
  if (!githubConnected && foundKeys && agentRunning) {
    console.log("- Add your SSH public key to GitHub: https://github.com/settings/keys");
  }
}