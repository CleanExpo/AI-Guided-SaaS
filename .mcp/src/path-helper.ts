import path from "path";
import fs from "fs";

/**
 * Ensures all paths are inside the project root (prevents code writing outside the repo).
 * Use in all file write operations.
 */
export function resolveSafePath(dest: string, projectRoot = process.cwd()) {
  const normalized = path.normalize(path.resolve(projectRoot, dest));
  if (!normalized.startsWith(projectRoot)) {
    throw new Error(`File destination is outside the project root: ${normalized}`);
  }
  return normalized;
}

// Example usage before writing a file:
export function writeSafeFile(relPath: string, content: string, root = process.cwd()) {
  const safePath = resolveSafePath(relPath, root);
  fs.writeFileSync(safePath, content, "utf-8");
}
