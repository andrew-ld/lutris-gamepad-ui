const fs = require("node:fs/promises");
const { homedir } = require("node:os");
const path = require("node:path");

const { logWarn } = require("./utils.cjs");

async function listDirectory(directoryPath) {
  if (directoryPath === null) {
    directoryPath = homedir() || "/";
  }

  const targetDirectory = path.resolve(directoryPath);

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

  return { currentPath: targetDirectory, entries: result };
}

module.exports = { listDirectory };
