import { useState, useEffect, useCallback } from "react";
import { DEFAULT_DATA, migrateOldData } from "../utils/calculations.js";

const STORAGE_KEY = "vault-app-data-v2";
const OLD_STORAGE_KEY = "vault-app-data";

export function useVaultData() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [justMigrated, setJustMigrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setData({ ...DEFAULT_DATA, ...JSON.parse(raw) });
      } else {
        let initial = DEFAULT_DATA;
        const old = localStorage.getItem(OLD_STORAGE_KEY);
        if (old) {
          try {
            initial = migrateOldData(JSON.parse(old));
            setJustMigrated(true);
          } catch {
            initial = DEFAULT_DATA;
          }
        }
        setData(initial);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
    } catch {
      setData(DEFAULT_DATA);
    }
    setLoaded(true);
  }, []);

  const save = useCallback((next) => {
    setData(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  return { data, save, loaded, justMigrated };
}
