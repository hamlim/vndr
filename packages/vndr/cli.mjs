#!/usr/bin/env node

import { exec } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { promisify } from "node:util";

let execAsync = promisify(exec);
let DEFAULT_DIR = "./vndr";

function parseGitHubUrl(url) {
  // Handle both blob and tree URLs
  let match = url.match(
    /github\.com\/([^/]+\/[^/]+)\/(blob|tree)\/([^/]+)\/?(.*)/,
  );
  if (match) {
    let [, repo, type, branch, path] = match;
    return { repo, type, branch, path };
  }
  return null;
}

async function downloadGitHubPath(url, targetDir) {
  let parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new Error("Not a valid GitHub URL");
  }

  let { repo, type, branch, path } = parsed;

  if (type === "blob") {
    // Single file download
    let rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
    let fileName = basename(path || url);
    let targetPath = join(targetDir, fileName);
    await downloadFile(rawUrl, targetPath);
    console.log(`✓ Downloaded ${fileName} to ${targetDir}`);
  } else if (type === "tree") {
    // Directory download
    console.log(`📦 Downloading directory from ${repo}...`);

    // Create a temporary directory for the clone
    let tempDir = join(tmpdir(), `vndr-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Shallow clone the repository
      await execAsync(
        `git clone --depth 1 --branch ${branch} https://github.com/${repo}.git ${tempDir}`,
      );

      // If path is specified, copy just that directory/file
      let sourcePath = path ? join(tempDir, path) : tempDir;
      let targetPath = join(targetDir, basename(path || repo));

      // Check if the path exists
      try {
        await fs.access(sourcePath);
      } catch {
        throw new Error(`Path '${path}' not found in repository`);
      }

      // Copy the files
      await fs.cp(sourcePath, targetPath, { recursive: true });
      console.log(`✓ Downloaded ${path || repo} to ${targetPath}`);
    } finally {
      // Cleanup
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}

async function downloadFile(url, targetPath) {
  try {
    let response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${response.status} - ${await response.text()}`);
    }
    await fs.mkdir(dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    throw new Error(`Failed to download ${url}: ${error.message}`);
  }
}

async function isGitHubRepo(input) {
  return input.includes("/") && /^[^/]+\/[^/]+$/.test(input);
}

async function downloadGitHubRepo(repo, targetDir) {
  let packageDir = join(targetDir, repo);

  console.log(`📦 Cloning ${repo} from GitHub...`);
  try {
    // Clone the repository
    await execAsync(
      `git clone --depth 1 https://github.com/${repo}.git ${packageDir}`,
    );

    // Remove .git directory to keep just the files
    await fs.rm(join(packageDir, ".git"), { recursive: true, force: true });

    console.log(`✓ Downloaded ${repo} to ${packageDir}`);
  } catch (error) {
    console.error(`Failed to clone repo: ${error.message}`);
    throw error;
  }
}

async function downloadNpmPackage(packageName, targetDir) {
  // Create a temporary directory
  let tempDir = join(tmpdir(), `vndr-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // Initialize a new package.json
    await execAsync("npm init -y", { cwd: tempDir });

    // Install the package
    console.log(`📦 Installing ${packageName} from npm...`);
    await execAsync(`npm install ${packageName}`, { cwd: tempDir });

    // Move the installed package to the target directory
    let packageDir = join(targetDir, packageName);
    await fs.mkdir(packageDir, { recursive: true });

    // Copy node_modules/package contents to target directory
    let sourceDir = join(tempDir, "node_modules", packageName.split("/").pop());
    let files = await fs.readdir(sourceDir);

    for (let file of files) {
      await fs.cp(join(sourceDir, file), join(packageDir, file), {
        recursive: true,
      });
    }

    console.log(`✓ Downloaded ${packageName} to ${packageDir}`);
  } finally {
    // Cleanup: Remove temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function downloadPackage(input, targetDir) {
  // Create target directory if it doesn't exist
  await fs.mkdir(targetDir, { recursive: true });

  if (input.startsWith("http://") || input.startsWith("https://")) {
    if (input.includes("github.com")) {
      await downloadGitHubPath(input, targetDir);
    } else {
      // Handle direct file URLs
      let fileName = basename(input);
      let targetPath = join(targetDir, fileName);
      await downloadFile(input, targetPath);
      console.log(`✓ Downloaded ${fileName} to ${targetDir}`);
    }
  } else {
    // Check if it's a GitHub repo
    let isGitHub = await isGitHubRepo(input);

    if (isGitHub) {
      await downloadGitHubRepo(input, targetDir);
    } else {
      // Handle as npm package
      await downloadNpmPackage(input, targetDir);
    }
  }
}

async function main() {
  let { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      dir: {
        type: "string",
        short: "d",
      },
    },
    allowPositionals: true,
  });

  if (positionals.length === 0) {
    console.error("Usage: vndr <package...> [--dir <path>]");
    process.exit(1);
  }

  let targetDir = values.dir || DEFAULT_DIR;

  try {
    for (let input of positionals) {
      await downloadPackage(input, targetDir);
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);
