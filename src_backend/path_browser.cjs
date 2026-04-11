const { readdir, stat } = require("node:fs/promises");
const { homedir } = require("node:os");
const path = require("node:path");

const RECOVERABLE_ENTRY_STAT_ERRORS = new Set([
  "EACCES",
  "ELOOP",
  "ENOENT",
  "EPERM",
]);

const resolveBrowsePath = (inputPath) => {
  const requestedPath =
    typeof inputPath === "string" ? inputPath.trim() : "";

  if (!requestedPath || requestedPath === ".") {
    return homedir();
  }

  if (requestedPath === "~") {
    return homedir();
  }

  if (requestedPath.startsWith("~/")) {
    return path.join(homedir(), requestedPath.slice(2));
  }

  if (path.isAbsolute(requestedPath)) {
    return requestedPath;
  }

  return path.resolve(homedir(), requestedPath);
};

const sortCaseInsensitive = (left, right) => {
  const leftLower = left.toLowerCase();
  const rightLower = right.toLowerCase();

  if (leftLower < rightLower) {
    return -1;
  }

  if (leftLower > rightLower) {
    return 1;
  }

  return left.localeCompare(right);
};

async function getEntryType(absolutePath) {
  try {
    const entryStats = await stat(absolutePath);
    return entryStats.isDirectory() ? "directory" : "file";
  } catch (error) {
    if (RECOVERABLE_ENTRY_STAT_ERRORS.has(error?.code)) {
      return "file";
    }

    throw error;
  }
}

async function browsePath(inputPath) {
  const absolutePath = resolveBrowsePath(inputPath);

  let pathStats;
  try {
    pathStats = await stat(absolutePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("path does not exist");
    }

    throw error;
  }

  if (pathStats.isFile()) {
    return {
      path: absolutePath,
      parent: path.dirname(absolutePath),
      entries: [],
    };
  }

  const names = (await readdir(absolutePath)).sort(sortCaseInsensitive);
  const entries = await Promise.all(
    names.map(async (name) => {
      const fullPath = path.join(absolutePath, name);
      return {
        name,
        path: fullPath,
        type: await getEntryType(fullPath),
      };
    }),
  );

  return {
    path: absolutePath,
    parent: path.dirname(absolutePath),
    entries,
  };
}

module.exports = { browsePath };