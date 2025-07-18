import { execSync, spawn } from "child_process";

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
    execSync(`curl -X POST "${hookUrl}"`, { stdio: "inherit" });
    console.log("✔️ Vercel deploy hook triggered.");
  } catch (err) {
    console.error("❌ Vercel deploy hook failed.");
    throw err;
  }
}
