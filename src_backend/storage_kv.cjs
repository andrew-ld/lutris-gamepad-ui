const fs = require("fs");
const { getKvStorageFilePath } = require("./storage.cjs");
const { logError } = require("./utils.cjs");

function _readStore() {
  try {
    const storePath = getKvStorageFilePath();
    if (!fs.existsSync(storePath)) {
      return {};
    }
    const fileContent = fs.readFileSync(storePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    logError(`Error reading JSON store at ${storePath}:`, error);
    return {};
  }
}

function _writeStore(data) {
  try {
    const storePath = getKvStorageFilePath();
    const tempPath = `${storePath}.tmp`;
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, content, "utf-8");
    fs.renameSync(tempPath, storePath);
  } catch (error) {
    logError(`Error writing to JSON store at ${storePath}:`, error);
  }
}

function getKvStore(key) {
  const data = _readStore();
  return data[key];
}

function setKvStore(key, value) {
  const data = _readStore();
  data[key] = value;
  _writeStore(data);
}

module.exports = { getKvStore, setKvStore };
