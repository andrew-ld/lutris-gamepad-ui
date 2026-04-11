export const slugifyValue = (value) => {
  return String(value || "")
    .normalize("NFKD")
    .replaceAll(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replaceAll(/[\s_-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
};

const isPathLikeType = (type) => {
  const normalized = String(type || "").toLowerCase();
  return (
    normalized.includes("path") ||
    normalized.includes("directory") ||
    normalized.includes("folder") ||
    normalized.includes("file")
  );
};

const isPathLikeKey = (key) => {
  return /(path|dir|directory|folder|file|executable|binary|rom)/i.test(
    String(key || ""),
  );
};

export const isPathLikeItem = (item) => {
  if (!item) {
    return false;
  }

  return isPathLikeType(item.type) || isPathLikeKey(item.key);
};

const getOptionInitialValue = (option) => {
  if (option.value !== undefined && option.value !== null) {
    return option.value;
  }

  if (option.default !== undefined && option.default !== null) {
    return option.default;
  }

  if (option.type === "bool") {
    return false;
  }

  return "";
};

export const buildOptionsBySection = (tabs = [], settings = {}) => {
  const nextOptions = {};

  for (const tab of tabs) {
    if (tab.kind !== "options" || !tab.section) {
      continue;
    }

    nextOptions[tab.section] = settings?.[tab.section] || [];
  }

  return nextOptions;
};

export const mergeOptionValues = (previousValues, nextOptions) => {
  const nextValues = {};

  for (const [sectionName, options] of Object.entries(nextOptions)) {
    nextValues[sectionName] = {};

    for (const option of options) {
      const previousValue = previousValues[sectionName]?.[option.key];
      nextValues[sectionName][option.key] =
        previousValue === undefined
          ? getOptionInitialValue(option)
          : previousValue;
    }
  }

  return nextValues;
};

export const buildSectionPayload = (options = [], values = {}) => {
  const payload = {};

  for (const option of options) {
    const value = values[option.key];
    if (option.type === "bool") {
      payload[option.key] = Boolean(value);
    } else if (value !== "" && value !== null && value !== undefined) {
      payload[option.key] = value;
    }
  }

  return payload;
};

export const buildGameInfoPayload = (fields, getGameInfoValue) => {
  return Object.fromEntries(
    fields.map((field) => [field.key, getGameInfoValue(field.key)]),
  );
};
