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
    throw error.stderr ?? error;
  }
}

async function invokeLutris(arguments_ = []) {
  return await execFilePromise(
    "bash",
    [getLutrisWrapperPath(), ...arguments_],
    { encoding: "utf8" },
  );
}

async function getLutrisGames() {
  return await invokeLutrisSubcommand("list-games");
}

async function getLutrisSettings(gameIdentifier = null, runnerSlug = null) {
  const arguments_ = [];
  if (gameIdentifier) arguments_.push("--game", gameIdentifier);
  if (runnerSlug) arguments_.push("--runner", runnerSlug);
  return settingsRunExclusive(async () => {
    return await invokeLutrisSubcommand("get-settings", arguments_);
  });
}

async function getNewGameLutrisSettings(runnerSlug) {
  return settingsRunExclusive(async () => {
    return await invokeLutrisSubcommand("get-new-game-settings", [
      "--runner",
      runnerSlug,
    ]);
  });
}

async function updateLutrisSetting(
  section,
  key,
  value,
  type = null,
  gameIdentifier = null,
  runnerSlug = null,
) {
  const arguments_ = [section, key, String(value)];
  if (type) arguments_.push("--type", type);
  if (gameIdentifier) arguments_.push("--game", gameIdentifier);
  if (runnerSlug) arguments_.push("--runner", runnerSlug);
  return settingsRunExclusive(async () => {
    return await invokeLutrisSubcommand("update-setting", arguments_);
  });
}

async function addLutrisGame(gameData) {
  return settingsRunExclusive(async () => {
    return await invokeLutrisSubcommand("add-game", [JSON.stringify(gameData)]);
  });
}

async function getLutrisRunners() {
  return await invokeLutrisSubcommand("list-runners");
}

async function syncLutrisAccount() {
  return await invokeLutrisSubcommand("sync-account");
}

module.exports = {
  getLutrisGames,
  getLutrisSettings,
  getNewGameLutrisSettings,
  updateLutrisSetting,
  addLutrisGame,
  getLutrisRunners,
  syncLutrisAccount,
  invokeLutris,
};
