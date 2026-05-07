import { useCallback, useEffect } from "react";

import { create } from "zustand";

import * as ipc from "../utils/ipc";
import { applyReplacements } from "../utils/string";

const packagedLocaleImporters = import.meta.glob("../locale/*.json");

async function loadPackagedLocales() {
  const localePromises = Object.entries(packagedLocaleImporters).map(
    async ([path, importer]) => {
      const langCode = path.split(".").at(-2);
      const module = await importer();
      return [langCode, module.default];
    },
  );
  return new Map(await Promise.all(localePromises));
}

function selectBestLocale(packagedLocales, preferredLangs) {
  for (const lang of preferredLangs) {
    if (packagedLocales.has(lang)) {
      return packagedLocales.get(lang);
    }
    const baseLang = lang.split("-")[0];
    if (packagedLocales.has(baseLang)) {
      return packagedLocales.get(baseLang);
    }
  }
  return null;
}

function mergeLocales(base, target) {
  const result = {};

  for (const [ns, strings] of Object.entries(base)) {
    result[ns] = { ...strings, ...target[ns] };
  }

  return result;
}

export const useTranslationStore = create((set) => ({
  translations: null,
  setTranslations: (translations) => set({ translations }),
}));

export const useTranslation = () => {
  const translations = useTranslationStore((state) => state.translations);

  const t = useCallback(
    (key, replacements, filename) => {
      const result =
        filename && translations && translations[filename]
          ? translations[filename][key] || key
          : key;

      return applyReplacements(result, replacements);
    },
    [translations],
  );

  return { t };
};

export const useInitializeTranslationStore = () => {
  const setTranslations = useTranslationStore((state) => state.setTranslations);

  useEffect(() => {
    let isActive = true;

    const loadTranslations = async () => {
      try {
        const packagedLocales = await loadPackagedLocales();
        const preferredLangs = navigator.languages;

        const defaultLocale = packagedLocales.get("en");
        if (!defaultLocale) {
          throw new Error("Missing default locale file!");
        }
        const bestFitLocale = selectBestLocale(packagedLocales, preferredLangs);

        if (isActive) {
          if (defaultLocale !== bestFitLocale && bestFitLocale !== null) {
            setTranslations(mergeLocales(defaultLocale, bestFitLocale));
          } else {
            setTranslations(defaultLocale);
          }
        }
      } catch (error) {
        ipc.logError("Failed to load translations:", error);
      }
    };

    loadTranslations().catch((error) => {
      ipc.logError("unable to load translations", error);
    });

    return () => {
      isActive = false;
    };
  }, [setTranslations]);
};
