const {
  execFilePromise,
  logError,
  getLutrisWrapperPath,
  logInfo,
  getRunExclusive,
} = require("./utils.cjs");

const SUBCOMMAND_OUTPUT_HEADER = "lutris-subcommand-output:";

const settingsRunExclusive = getRunExclusive();

async function invokeLutrisSubcommand(subcommandName, args = []) {
  logInfo("invokeLutrisSubcommand", subcommandName, JSON.stringify(args));

  try {
    const { stdout } = await invokeLutris(["--" + subcommandName, ...args]);

    const outputLine = stdout
      .split("\r\n")
      .find((line) => line.startsWith(SUBCOMMAND_OUTPUT_HEADER));

    if (outputLine) {
      const jsonString = outputLine.substring(SUBCOMMAND_OUTPUT_HEADER.length);
      return JSON.parse(jsonString);
    } else {
      throw new Error(`Output header not found`);
    }
  } catch (error) {
    logError(
      "failed to execute lutris wrapper subcommand",
      subcommandName,
      args,
      error,
    );
    throw error;
  }
}

async function invokeLutris(args = []) {
  return await execFilePromise("bash", [getLutrisWrapperPath(), ...args]);
}

async function getCoverartPath() {
  return await invokeLutrisSubcommand("get-coverart-path");
}

async function getRuntimeIconPath(iconName) {
  return await invokeLutrisSubcommand("get-runtime-icon-path", [iconName]);
}

async function getAllGamesCategories() {
  return await invokeLutrisSubcommand("get-all-games-categories");
}

async function getLutrisGames() {
  return await invokeLutrisSubcommand("list-games");
}

async function getLutrisSettings(gameSlug = null, runnerSlug = null) {
  const args = [];
  if (gameSlug) args.push("--game", gameSlug);
  if (runnerSlug) args.push("--runner", runnerSlug);
  return settingsRunExclusive(async () => {
    return await invokeLutrisSubcommand("get-settings", args);
  });
}

async function updateLutrisSetting(
  section,
  key,
  value,
  type = null,
  gameSlug = null,
  runnerSlug = null,
) {
  const args = [section, key, String(value)];
  if (type) args.push("--type", type);
  if (gameSlug) args.push("--game", gameSlug);
  if (runnerSlug) args.push("--runner", runnerSlug);
  return settingsRunExclusive(async () => {
    return await invokeLutrisSubcommand("update-setting", args);
  });
}

module.exports = {
  getCoverartPath,
  getRuntimeIconPath,
  getAllGamesCategories,
  getLutrisGames,
  getLutrisSettings,
  updateLutrisSetting,
  invokeLutris,
};
