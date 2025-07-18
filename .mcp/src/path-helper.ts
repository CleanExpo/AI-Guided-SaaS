import { normalize, resolve, join, dirname } from "path";
import { writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";

/**
 * Ensures all paths are inside the project root (prevents code writing outside the repo).
 * Use in all file write operations.
 */
export function resolveSafePath(dest: string, projectRoot = process.cwd()): string {
  const normalized = normalize(resolve(projectRoot, dest));
  if (!normalized.startsWith(projectRoot)) {
    throw new Error(`File destination is outside the project root: ${normalized}`);
  }
  return normalized;
}

// Example usage before writing a file:
export function writeSafeFile(relPath: string, content: string, root = process.cwd()): void {
  const safePath = resolveSafePath(relPath, root);
  
  // Ensure directory exists
  const dir = dirname(safePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  writeFileSync(safePath, content, "utf-8");
}

// Scan for orphaned files created outside the project
export async function scanForOrphanedFiles(projectRoot = process.cwd()): Promise<string[]> {
  const orphaned: string[] = [];
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  
  if (!homeDir) return orphaned;
  
  // Common locations where files might be accidentally created
  const checkLocations = [
    homeDir,
    join(homeDir, "Desktop"),
    join(homeDir, "Documents"),
    join(homeDir, "Downloads"),
    "/tmp",
    "/var/tmp"
  ];
  
  const now = Date.now();
  const recentThreshold = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const location of checkLocations) {
    if (!existsSync(location)) continue;
    if (location.startsWith(projectRoot)) continue;
    
    try {
      const files = readdirSync(location);
      
      for (const file of files) {
        const filePath = join(location, file);
        
        try {
          const stats = statSync(filePath);
          
          // Check if file was created recently and might be project-related
          if (stats.isFile() && (now - stats.mtimeMs) < recentThreshold) {
            // Check for common project file patterns
            if (file.match(/\.(js|ts|jsx|tsx|json|md|yml|yaml|env)$/i) ||
                file.match(/^(package|tsconfig|webpack|vite|next)/) ||
                file.match(/^\.?(eslint|prettier|git|vercel)/)) {
              orphaned.push(filePath);
            }
          }
        } catch {
          // Skip files we can't access
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }
  
  return orphaned;
}
