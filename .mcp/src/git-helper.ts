import { execSync } from "child_process";

export function gitStageCommitPush(message: string) {
  try {
    execSync("git add -A", { stdio: "inherit" });
    execSync("git status --short", { stdio: "inherit" });
    execSync(`git commit -m "${message}"`, { stdio: "inherit" });
    execSync("git push", { stdio: "inherit" });
    console.log("✔️ All changes pushed successfully.");
  } catch (err) {
    console.error("❌ Git operation failed. Diagnose SSH/agent issues or check remote URL (should be SSH).");
    throw err;
  }
}
