const fs = require("node:fs/promises");
const { homedir } = require("node:os");
const path = require("node:path");

const { logWarn } = require("./utils.cjs");

const getFallbackDirectories = (directoryPath) => {
  const candidates = [];
  const homeDirectory = homedir();
  const defaultRootDirectory = path.parse(process.cwd()).root;

  let currentCandidate =
    directoryPath === null
      ? homeDirectory || defaultRootDirectory
      : path.resolve(directoryPath);

  while (
    typeof currentCandidate === "string" &&
    currentCandidate.length > 0 &&
    !candidates.includes(currentCandidate)
  ) {
    candidates.push(currentCandidate);

    const parentDirectory = path.dirname(currentCandidate);
    if (parentDirectory === currentCandidate) {
      break;
    }

    currentCandidate = parentDirectory;
  }

  if (homeDirectory && !candidates.includes(homeDirectory)) {
    candidates.push(homeDirectory);
  }

  const rootDirectory = path.parse(
    currentCandidate || defaultRootDirectory,
  ).root;

  if (rootDirectory && !candidates.includes(rootDirectory)) {
    candidates.push(rootDirectory);
  }

  return candidates;
};

async function resolveReadableDirectory(directoryPath) {
  let lastError = null;
  const visitedRealPaths = new Set();

  for (const candidate of getFallbackDirectories(directoryPath)) {
    try {
      const realCandidate = await fs.realpath(candidate).catch(() => candidate);
      if (visitedRealPaths.has(realCandidate)) {
        continue;
      }
      visitedRealPaths.add(realCandidate);

      const stats = await fs.stat(candidate);
      if (!stats.isDirectory()) {
        continue;
      }

      await fs.access(candidate, fs.constants.R_OK);

      if (candidate !== directoryPath && directoryPath !== null) {
        logWarn(
          "falling back directory listing from",
          directoryPath,
          "to",
          candidate,
        );
      }

      return candidate;
    } catch (error) {
      lastError = error;
    }
  }

  throw (
    lastError || new Error(`No readable directory found for ${directoryPath}`)
  );
}

async function listDirectory(directoryPath, { allowFallback = false } = {}) {
  let targetDirectory;
  let fallbackFrom = null;

  if (allowFallback && typeof directoryPath === "string") {
    targetDirectory = await resolveReadableDirectory(directoryPath);
    if (targetDirectory !== directoryPath) {
      fallbackFrom = directoryPath;
    }
  } else if (directoryPath === null) {
    targetDirectory = homedir() || path.parse(process.cwd()).root;
  } else {
    targetDirectory = path.resolve(directoryPath);
  }

  const entries = await fs.readdir(targetDirectory, { withFileTypes: true });

  const result = entries
    .filter((entry) => {
      if (entry.isFile() || entry.isDirectory()) {
        return true;
      }
      logWarn("skipping", entry.name, "not a file or directory");
      return false;
    })
    .map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(targetDirectory, entry.name),
    }))
    .toSorted((a, b) => {
      if (a.isDirectory === b.isDirectory) {
        return a.name.localeCompare(b.name);
      }
      return a.isDirectory ? -1 : 1;
    });

  const isRoot = targetDirectory === path.parse(targetDirectory).root;

  if (!isRoot) {
    result.unshift({
      name: "..",
      isDirectory: true,
      path: path.dirname(targetDirectory),
    });
  }

  return {
    currentPath: targetDirectory,
    entries: result,
    fallbackFrom,
  };
}

module.exports = { listDirectory };
