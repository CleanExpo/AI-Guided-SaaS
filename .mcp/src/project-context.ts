// project-context.ts
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parse as parseDotenv } from "dotenv";

interface ProjectContext {
  projectType?: string;
  technologies: string[];
  fileCount: number;
  directoryCount: number;
  hasGit: boolean;
  hasPackageJson: boolean;
  hasEnvFile: boolean;
  framework?: string;
  dependencies?: Record<string, string>;
  structure: FileStructure[];
}

interface FileStructure {
  path: string;
  type: "file" | "directory";
  size?: number;
}

interface ScanOptions {
  includeNodeModules?: boolean;
  maxDepth?: number;
  includeContent?: boolean;
}

export async function projectContextScan(
  rootPath: string,
  options: ScanOptions = {}
): Promise<ProjectContext> {
  const {
    includeNodeModules = false,
    maxDepth = 5,
    includeContent = false
  } = options;

  const context: ProjectContext = {
    technologies: [],
    fileCount: 0,
    directoryCount: 0,
    hasGit: false,
    hasPackageJson: false,
    hasEnvFile: false,
    structure: []
  };

  // Check for common project files
  context.hasGit = existsSync(join(rootPath, ".git"));
  context.hasPackageJson = existsSync(join(rootPath, "package.json"));
  context.hasEnvFile = existsSync(join(rootPath, ".env"));

  // Parse package.json if exists
  if (context.hasPackageJson) {
    try {
      const packageJson = JSON.parse(
        readFileSync(join(rootPath, "package.json"), "utf-8")
      );
      context.dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      // Detect technologies from dependencies
      context.technologies = detectTechnologies(context.dependencies || {});
      context.framework = detectFramework(context.dependencies || {});
      
      if (context.framework) {
        context.projectType = detectProjectType(context.framework);
      }
    } catch (error) {
      console.warn("Failed to parse package.json:", error);
    }
  }

  // Scan directory structure
  scanDirectory(rootPath, context, rootPath, 0, maxDepth, includeNodeModules);

  return context;
}

function scanDirectory(
  dirPath: string,
  context: ProjectContext,
  rootPath: string,
  currentDepth: number,
  maxDepth: number,
  includeNodeModules: boolean
): void {
  if (currentDepth > maxDepth) return;

  try {
    const entries = readdirSync(dirPath);
    
    for (const entry of entries) {
      // Skip node_modules unless explicitly included
      if (!includeNodeModules && entry === "node_modules") continue;
      
      // Skip hidden files/directories
      if (entry.startsWith(".") && entry !== ".env") continue;
      
      const fullPath = join(dirPath, entry);
      const stats = statSync(fullPath);
      const relativePath = relative(rootPath, fullPath);
      
      if (stats.isDirectory()) {
        context.directoryCount++;
        context.structure.push({
          path: relativePath,
          type: "directory"
        });
        
        // Recursively scan subdirectories
        scanDirectory(fullPath, context, rootPath, currentDepth + 1, maxDepth, includeNodeModules);
      } else {
        context.fileCount++;
        context.structure.push({
          path: relativePath,
          type: "file",
          size: stats.size
        });
      }
    }
  } catch (error) {
    console.warn(`Failed to scan directory ${dirPath}:`, error);
  }
}

function detectTechnologies(dependencies: Record<string, string>): string[] {
  const technologies: string[] = [];
  const depKeys = Object.keys(dependencies || {});
  
  const techMap: Record<string, string[]> = {
    "React": ["react", "react-dom"],
    "Vue": ["vue"],
    "Angular": ["@angular/core"],
    "Next.js": ["next"],
    "Express": ["express"],
    "Fastify": ["fastify"],
    "NestJS": ["@nestjs/core"],
    "TypeScript": ["typescript"],
    "Tailwind CSS": ["tailwindcss"],
    "Prisma": ["prisma", "@prisma/client"],
    "MongoDB": ["mongodb", "mongoose"],
    "PostgreSQL": ["pg", "postgres"],
    "Redis": ["redis", "ioredis"],
    "GraphQL": ["graphql", "apollo-server"],
    "Jest": ["jest"],
    "Vitest": ["vitest"],
    "ESLint": ["eslint"],
    "Prettier": ["prettier"]
  };
  
  for (const [tech, packages] of Object.entries(techMap)) {
    if (packages.some(pkg => depKeys.includes(pkg))) {
      technologies.push(tech);
    }
  }
  
  return technologies;
}

function detectFramework(dependencies: Record<string, string>): string | undefined {
  const depKeys = Object.keys(dependencies || {});
  
  if (depKeys.includes("next")) return "Next.js";
  if (depKeys.includes("gatsby")) return "Gatsby";
  if (depKeys.includes("@angular/core")) return "Angular";
  if (depKeys.includes("vue")) return "Vue";
  if (depKeys.includes("react")) return "React";
  if (depKeys.includes("express")) return "Express";
  if (depKeys.includes("fastify")) return "Fastify";
  if (depKeys.includes("@nestjs/core")) return "NestJS";
  
  return undefined;
}

function detectProjectType(framework: string): string {
  const frontendFrameworks = ["React", "Vue", "Angular", "Next.js", "Gatsby"];
  const backendFrameworks = ["Express", "Fastify", "NestJS"];
  
  if (frontendFrameworks.includes(framework)) return "frontend";
  if (backendFrameworks.includes(framework)) return "backend";
  
  return "unknown";
}

// Additional helper functions for deployment preparation

export async function loadProjectEnvironment(rootPath: string): Promise<Record<string, string>> {
  const envPath = join(rootPath, ".env");
  const env: Record<string, string> = {};
  
  if (existsSync(envPath)) {
    try {
      const envContent = readFileSync(envPath, "utf-8");
      Object.assign(env, parseDotenv(envContent));
    } catch (error) {
      console.warn("Failed to load .env file:", error);
    }
  }
  
  // Also check for .env.local, .env.production, etc.
  const envFiles = [".env.local", ".env.production", ".env.development"];
  for (const envFile of envFiles) {
    const path = join(rootPath, envFile);
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, "utf-8");
        Object.assign(env, parseDotenv(content));
      } catch (error) {
        console.warn(`Failed to load ${envFile}:`, error);
      }
    }
  }
  
  return env;
}

export async function analyzeDeploymentReadiness(rootPath: string): Promise<{
  ready: boolean;
  issues: string[];
  warnings: string[];
}> {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Check for package.json
  if (!existsSync(join(rootPath, "package.json"))) {
    issues.push("Missing package.json file");
  } else {
    try {
      const packageJson = JSON.parse(
        readFileSync(join(rootPath, "package.json"), "utf-8")
      );
      
      // Check for required scripts
      if (!packageJson.scripts?.build) {
        warnings.push("No build script defined");
      }
      
      if (!packageJson.scripts?.start) {
        warnings.push("No start script defined");
      }
      
      // Check for name and version
      if (!packageJson.name) {
        issues.push("Missing project name in package.json");
      }
      
      if (!packageJson.version) {
        warnings.push("Missing version in package.json");
      }
    } catch (error) {
      issues.push("Invalid package.json file");
    }
  }
  
  // Check for common configuration files
  const configFiles = {
    "Next.js": "next.config.js",
    "Vite": "vite.config.js",
    "Webpack": "webpack.config.js",
    "TypeScript": "tsconfig.json"
  };
  
  for (const [tech, file] of Object.entries(configFiles)) {
    if (existsSync(join(rootPath, file))) {
      console.log(`Found ${tech} configuration`);
    }
  }
  
  // Check for .gitignore
  if (!existsSync(join(rootPath, ".gitignore"))) {
    warnings.push("No .gitignore file found");
  }
  
  // Check for README
  if (!existsSync(join(rootPath, "README.md"))) {
    warnings.push("No README.md file found");
  }
  
  return {
    ready: issues.length === 0,
    issues,
    warnings
  };
}

export function generateDeploymentGuide(context: ProjectContext): string {
  let guide = "# Deployment Guide\n\n";
  
  if (context.framework) {
    guide += `## Project Type: ${context.framework} ${context.projectType}\n\n`;
  }
  
  guide += "## Pre-deployment Checklist:\n\n";
  guide += "- [ ] All dependencies are listed in package.json\n";
  guide += "- [ ] Environment variables are configured\n";
  guide += "- [ ] Build script is defined and working\n";
  guide += "- [ ] Git repository is initialized and clean\n";
  guide += "- [ ] SSH keys are configured for GitHub\n";
  
  if (context.framework === "Next.js") {
    guide += "\n## Next.js Specific:\n";
    guide += "- [ ] next.config.js is properly configured\n";
    guide += "- [ ] API routes are tested\n";
    guide += "- [ ] Static assets are optimized\n";
  }
  
  if (context.technologies.includes("TypeScript")) {
    guide += "\n## TypeScript:\n";
    guide += "- [ ] No TypeScript errors (run `tsc --noEmit`)\n";
    guide += "- [ ] tsconfig.json is configured correctly\n";
  }
  
  guide += "\n## Deployment Commands:\n";
  guide += "```bash\n";
  guide += "# Install dependencies\n";
  guide += "npm install\n\n";
  guide += "# Build the project\n";
  guide += "npm run build\n\n";
  guide += "# Deploy to Vercel\n";
  guide += "vercel --prod\n";
  guide += "```\n";
  
  return guide;
}

// Export main function for CLI usage
export async function discoverProjectContext(): Promise<void> {
  const context = await projectContextScan(process.cwd());
  
  console.log("\n📊 Project Context Summary:");
  console.log(`Framework: ${context.framework || "Not detected"}`);
  console.log(`Project Type: ${context.projectType || "Unknown"}`);
  console.log(`Technologies: ${context.technologies.join(", ") || "None detected"}`);
  console.log(`Files: ${context.fileCount}`);
  console.log(`Directories: ${context.directoryCount}`);
  console.log(`Has Git: ${context.hasGit ? "Yes" : "No"}`);
  console.log(`Has .env: ${context.hasEnvFile ? "Yes" : "No"}`);
  
  const readiness = await analyzeDeploymentReadiness(process.cwd());
  
  if (!readiness.ready) {
    console.log("\n❌ Deployment Issues:");
    readiness.issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  if (readiness.warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    readiness.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  if (readiness.ready) {
    console.log("\n✅ Project is ready for deployment!");
  }
}

// Function for deployment validation
export async function validateProjectForDeployment(rootPath: string): Promise<boolean> {
  const readiness = await analyzeDeploymentReadiness(rootPath);
  
  if (!readiness.ready) {
    console.error("Project validation failed:");
    readiness.issues.forEach(issue => console.error(`  - ${issue}`));
    return false;
  }
  
  if (readiness.warnings.length > 0) {
    console.warn("Deployment warnings:");
    readiness.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  return true;
}