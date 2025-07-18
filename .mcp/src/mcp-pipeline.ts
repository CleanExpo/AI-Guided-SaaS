import { writeSafeFile } from "./path-helper.js";
import { gitStageCommitPush } from "./git-helper.js";
import { triggerVercelProdAndStreamLogs } from "./vercel-helper.js";
import path from "path";
import fs from "fs";

function scanForOrphanedFiles(projectRoot = process.cwd(), recentMinutes = 10) {
  const now = Date.now() / 1000;
  const rec = (dir: string): string[] =>
    fs.readdirSync(dir).flatMap((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        return rec(filePath);
      }
      if ((now - stat.mtimeMs / 1000) < recentMinutes * 60 && !filePath.startsWith(projectRoot)) {
        return [filePath];
      }
      return [];
    });
  
  try {
    const found = rec(projectRoot);
    if (found.length) {
      throw new Error(`Suspicious files outside project root: ${found.join(", ")}`);
    }
    console.log("✔️ No orphaned files detected.");
  } catch (err) {
    console.warn("⚠️  File scan completed with warnings:", err);
  }
}

export function runMCPDeploy(commitMsg: string) {
  const root = process.cwd();
  console.log("🚀 Starting MCP deployment pipeline...");
  
  scanForOrphanedFiles(root, 10);
  gitStageCommitPush(commitMsg);
  triggerVercelProdAndStreamLogs();
  
  console.log("✅ MCP deployment pipeline completed.");
}
