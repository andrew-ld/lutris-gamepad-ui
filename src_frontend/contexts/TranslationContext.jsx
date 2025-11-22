import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as ipc from "../utils/ipc";
import { applyReplacements } from "../utils/string";
import { useIsMounted } from "../hooks/useIsMounted";

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
  const isMounted = useIsMounted();

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const packagedLocales = await loadPackagedLocales();
        const preferredLangs = navigator.languages;

        const defaultLocale = packagedLocales.get("en");
        if (!defaultLocale) {
          throw new Error("Missing default locale file!");
        }
        const bestFitLocale = selectBestLocale(packagedLocales, preferredLangs);

        if (isMounted()) {
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

    loadTranslations().catch((e) => {
      ipc.logError("unable to load translations", e);
    });
  }, [isMounted]);

  const t = useCallback(
    (key, replacements, filename) => {
      let result;

      if (filename && translations && translations[filename]) {
        result = translations[filename][key] || key;
      } else {
        result = key;
      }

      return applyReplacements(result, replacements);
    },
    [translations]
  );

  return (
    <TranslationContext.Provider value={{ t }}>
      {children}
    </TranslationContext.Provider>
  );
};
