import { useState, useEffect, useCallback } from "react";
import { DEFAULT_DATA, migrateOldData } from "../utils/calculations.js";

const STORAGE_KEY = "vault-app-data-v2";
const OLD_STORAGE_KEY = "vault-app-data";

/**
 * Persistencia local con localStorage (preparado para migrar a Supabase/Firebase
 * más adelante: solo hay que cambiar el cuerpo de `save` y la carga inicial).
 */
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
    } catch {
      // Almacenamiento lleno o no disponible (modo privado, etc.) — se ignora.
    }
  }, []);

  return { data, save, loaded, justMigrated };
}
