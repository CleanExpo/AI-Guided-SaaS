import { promisify } from "node:util";
import { exec as execCallback } from "node:child_process";
import { checkSSHAgent, checkGitHubSSHConnection } from "./ssh-setup.js";

const exec = promisify(execCallback);

export async function gitStageCommitPush(commitMessage: string): Promise<void> {
  try {
    // Check SSH setup first
    const sshAgentRunning = await checkSSHAgent();
    const githubConnected = await checkGitHubSSHConnection();
    
    if (!sshAgentRunning || !githubConnected) {
      console.log("\n❌ SSH is not properly configured for GitHub.");
      console.log("Please run the SSH setup wizard first: npm run setup-ssh\n");
      return;
    }

    // Stage all changes
    console.log("📦 Staging all changes...");
    await exec("git add -A");
    
    // Show status
    const { stdout: statusOutput } = await exec("git status --short");
    if (!statusOutput.trim()) {
      console.log("✅ No changes to commit");
      return;
    }
    
    console.log("Changes to be committed:");
    console.log(statusOutput);
    
    // Commit
    console.log(`\n💾 Committing with message: "${commitMessage}"`);
    await exec(`git commit -m "${commitMessage}"`);
    
    // Push
    console.log("\n🚀 Pushing to remote...");
    const { stdout: pushOutput } = await exec("git push");
    console.log(pushOutput);
    
    console.log("\n✅ Successfully staged, committed, and pushed!");
  } catch (error) {
    console.error("❌ Git operation failed:", error);
    throw error;
  }
}
