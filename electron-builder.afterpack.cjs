const fs = require("fs");
const path = require("path");

module.exports = async function (context) {
  const executableName = context.packager.executableName
  const executablePath = path.join(context.appOutDir, executableName)
  const renamedPath = path.join(context.appOutDir, `${executableName}.bin`);
  const wrapperPath = path.join(context.packager.projectDir, "linux-sandbox-wrapper.sh")

  fs.renameSync(executablePath, renamedPath);
  fs.copyFileSync(wrapperPath, executablePath)
  fs.chmodSync(executablePath, 0o755);
};
