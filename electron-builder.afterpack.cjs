const fs = require("node:fs");
const { readdir, rm } = require("node:fs/promises");
const path = require("node:path");

const { flipFuses, FuseV1Options, FuseVersion } = require("@electron/fuses");

async function disableSandboxWrapper(context) {
  const executableName = context.packager.executableName;
  const executablePath = path.join(context.appOutDir, executableName);
  const renamedPath = path.join(context.appOutDir, `${executableName}.bin`);
  const wrapperPath = path.join(
    context.packager.projectDir,
    "linux-sandbox-wrapper.sh",
  );

  fs.renameSync(executablePath, renamedPath);
  fs.copyFileSync(wrapperPath, executablePath);
  fs.chmodSync(executablePath, 0o755);
}

async function patchElectronFuses(context) {
  const executableName = context.packager.executableName;
  const executablePath = path.join(context.appOutDir, executableName);

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
}

const KOFFIE_ALLOWED_OS = new Set(["linux", "musl"]);

async function removeKoffiUnusedBinaries(context) {
  const koffiExecutablesPath = path.join(
    context.appOutDir,
    "resources/app.asar.unpacked/node_modules/koffi/build/koffi/",
  );

  const koffieExecutables = await readdir(koffiExecutablesPath);

  for (const executable of koffieExecutables) {
    const [os, arch] = executable.split("_");
    const valid = KOFFIE_ALLOWED_OS.has(os) && arch == process.arch;

    if (!valid) {
      const executablePath = path.join(koffiExecutablesPath, executable);
      await rm(executablePath, { recursive: true });
    }
  }
}

module.exports = async function afterPack(context) {
  await patchElectronFuses(context);
  await disableSandboxWrapper(context);
  await removeKoffiUnusedBinaries(context);
};
