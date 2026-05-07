const { mkdirSync, renameSync, writeFileSync } = require("node:fs");
const path = require("node:path");

let writeCounter = 0;

function writeJsonFileAtomic(filename, value, options = {}) {
  const temporaryFilename = `${filename}.tmp-${process.pid}-${writeCounter++}`;

  const serializedJson =
    JSON.stringify(value, null, 2) + (options.trailingNewline ? "\n" : "");

  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(temporaryFilename, serializedJson);
  renameSync(temporaryFilename, filename);
}

module.exports = {
  writeJsonFileAtomic,
};
