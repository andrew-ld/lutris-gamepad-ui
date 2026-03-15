const fs = require("node:fs");
const path = require("node:path");

const { flipFuses, FuseV1Options, FuseVersion } = require("@electron/fuses");

module.exports = async function afterPack(context) {
  const executableName = context.packager.executableName;
  const executablePath = path.join(context.appOutDir, executableName);
  const renamedPath = path.join(context.appOutDir, `${executableName}.bin`);
  const wrapperPath = path.join(
    context.packager.projectDir,
    "linux-sandbox-wrapper.sh",
  );

  await flipFuses(executablePath, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  });

  fs.renameSync(executablePath, renamedPath);
  fs.copyFileSync(wrapperPath, executablePath);
  fs.chmodSync(executablePath, 0o755);
};
