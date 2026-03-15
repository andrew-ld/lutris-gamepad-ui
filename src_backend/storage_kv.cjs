const fs = require("node:fs");

const { getKvStorageFilePath } = require("./storage.cjs");
const { logError } = require("./utils.cjs");

function _readStore() {
  let storePath;
  try {
    storePath = getKvStorageFilePath();
    if (!fs.existsSync(storePath)) {
      return {};
    }
    const fileContent = fs.readFileSync(storePath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    logError(`Error reading JSON store at ${storePath}:`, error);
    return {};
  }
}

function _writeStore(data) {
  let storePath;
  try {
    storePath = getKvStorageFilePath();
    const temporaryPath = `${storePath}.tmp`;
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(temporaryPath, content, "utf8");
    fs.renameSync(temporaryPath, storePath);
  } catch (error) {
    logError(`Error writing to JSON store at ${storePath}:`, error);
  }
}

function getKvStoreValue(key) {
  const data = _readStore();
  return data[key];
}

function setKvStoreValue(key, value) {
  const data = _readStore();
  data[key] = value;
  _writeStore(data);
}

module.exports = { getKvStoreValue, setKvStoreValue };
