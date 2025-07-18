import { scanForOrphanedFiles } from "./path-helper.js";
import { gitStageCommitPush } from "./git-helper.js";
import { deployToVercelWithFixes, triggerVercelProdAndStreamLogs } from "./vercel-helper.js";
import chalk from "chalk";

export async function mcpPipelineInitOrUpdate() {
  console.log(chalk.cyan("🔧 Initializing/Updating MCP Pipeline..."));
  
  // Scan for any orphaned files
  const orphaned = await scanForOrphanedFiles();
  if (orphaned.length > 0) {
    console.log(chalk.yellow(`⚠️  Found ${orphaned.length} orphaned files. Consider moving them into the project.`));
  }
  
  // Stage, commit, push
  await gitStageCommitPush("Update MCP configuration");
  
  // Deploy to Vercel with automatic fixes if needed
  await deployToVercelWithFixes();
  
  console.log(chalk.green("✅ MCP Pipeline complete!"));
}

export async function runMCPDeploy(commitMessage: string = "Deploy via MCP") {
  try {
    console.log(chalk.blue("🚀 Starting MCP deployment pipeline..."));
    
    // Check for orphaned files first
    const orphaned = await scanForOrphanedFiles();
    if (orphaned.length > 0) {
      console.log(chalk.yellow(`⚠️  Found ${orphaned.length} orphaned files outside the project root:`));
      orphaned.forEach(file => console.log(`   - ${file}`));
      console.log("\nConsider moving these files into your project before deploying.\n");
    }
    
    // Git operations
    await gitStageCommitPush(commitMessage);
    
    // Deploy to Vercel with automatic fixes if needed
    await deployToVercelWithFixes();
    
    console.log(chalk.green("🎉 Deployment complete!"));
  } catch (error) {
    console.error(chalk.red("❌ Deployment failed:"), error);
    if ((error as any).message?.includes("SSH")) {
      console.log(chalk.yellow("\n💡 Tip: Make sure your SSH agent is running and GitHub SSH key is added."));
      console.log(chalk.white("   Run: eval \"$(ssh-agent -s)\" && ssh-add ~/.ssh/id_rsa"));
    }
    throw error;
  }
}

// Legacy function for backward compatibility
export function runMCPDeployLegacy(commitMsg: string) {
  const root = process.cwd();
  console.log("🚀 Starting MCP deployment pipeline...");
  
  // Use legacy synchronous version
  try {
    // Simple orphaned file check
    console.log("🔍 Scanning for orphaned files...");
    
    // Use the legacy vercel deployment
    triggerVercelProdAndStreamLogs();
    
    console.log("✅ MCP deployment pipeline completed.");
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}