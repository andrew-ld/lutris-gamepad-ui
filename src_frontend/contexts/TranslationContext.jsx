import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as ipc from "../utils/ipc";

const TranslationContext = createContext(null);

export const useTranslation = () => useContext(TranslationContext);

const packagedLocaleImporters = import.meta.glob("../locale/*.json");

async function loadPackagedLocales() {
  const localePromises = Object.entries(packagedLocaleImporters).map(
    async ([path, importer]) => {
      const langCode = path.split(".").at(-2);
      const module = await importer();
      return [langCode, module.default];
    }
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
    result[ns] = { ...strings, ...(target[ns] || {}) };
  }

  return result;
}

export const TranslationProvider = ({ children }) => {
  const [translations, setTranslations] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTranslations = async () => {
    try {
      const packagedLocales = await loadPackagedLocales();
      const preferredLangs = navigator.languages;

      const defaultLocale = packagedLocales.get("en");
      if (!defaultLocale) {
        throw new Error("Missing default locale file!");
      }
      const bestFitLocale = selectBestLocale(packagedLocales, preferredLangs);

      if (defaultLocale !== bestFitLocale && bestFitLocale !== null) {
        setTranslations(mergeLocales(defaultLocale, bestFitLocale));
      }
    } catch (error) {
      ipc.logError("Failed to load translations:", error);
    }
  };

  useEffect(() => {
    loadTranslations().finally(() => {
      setIsLoading(false);
    });
  }, []);

  const t = useCallback(
    (key, replacements, filename) => {
      let result;

      if (filename && translations && translations[filename]) {
        result = translations[filename][key] || key;
      } else {
        result = key;
      }

      if (replacements) {
        for (const [k, v] of Object.entries(replacements)) {
          result = result.replaceAll(`{{${k}}}`, v);
        }
      }

      return result;
    },
    [translations]
  );

  if (isLoading) {
    return null;
  }

  return (
    <TranslationContext.Provider value={{ t }}>
      {children}
    </TranslationContext.Provider>
  );
};
