const {
  execFilePromise,
  logError,
  getLutrisWrapperPath,
  logInfo,
  getRunExclusive,
} = require("./utils.cjs");

const SUBCOMMAND_OUTPUT_HEADER = "lutris-subcommand-output:";

const settingsRunExclusive = getRunExclusive();

async function invokeLutrisSubcommand(subcommandName, arguments_ = []) {
  logInfo("invokeLutrisSubcommand", subcommandName, JSON.stringify(arguments_));

  try {
    const { stdout } = await invokeLutris([
      "--" + subcommandName,
      ...arguments_,
    ]);

    const outputLine = stdout
      .split("\r\n")
      .find((line) => line.startsWith(SUBCOMMAND_OUTPUT_HEADER));

    if (outputLine) {
      const jsonString = outputLine.slice(SUBCOMMAND_OUTPUT_HEADER.length);
      return JSON.parse(jsonString);
    } else {
      throw new Error(`Output header not found`);
    }
  } catch (error) {
    logError(
      "failed to execute lutris wrapper subcommand",
      subcommandName,
      arguments_,
      error,
    );
    throw error;
  }
}

async function invokeLutris(arguments_ = []) {
  return await execFilePromise("bash", [getLutrisWrapperPath(), ...arguments_]);
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
  const arguments_ = [];
  if (gameSlug) arguments_.push("--game", gameSlug);
  if (runnerSlug) arguments_.push("--runner", runnerSlug);
  return settingsRunExclusive(async () => {
    return await invokeLutrisSubcommand("get-settings", arguments_);
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
  const arguments_ = [section, key, String(value)];
  if (type) arguments_.push("--type", type);
  if (gameSlug) arguments_.push("--game", gameSlug);
  if (runnerSlug) arguments_.push("--runner", runnerSlug);
  return settingsRunExclusive(async () => {
    return await invokeLutrisSubcommand("update-setting", arguments_);
  });
}

async function getLutrisRunners() {
  return await invokeLutrisSubcommand("list-runners");
}

async function createLocalLutrisGame(payload) {
  return await invokeLutrisSubcommand("create-local-game", [
    JSON.stringify(payload),
  ]);
}

module.exports = {
  getCoverartPath,
  getRuntimeIconPath,
  getAllGamesCategories,
  getLutrisGames,
  getLutrisSettings,
  updateLutrisSetting,
  getLutrisRunners,
  createLocalLutrisGame,
  invokeLutris,
};
