import { useEffect, useState } from "react";
import { toShareCode, type ExportSelection } from "@/songs/share";

/** The share code of a selection, recomputed when it changes (compression is asynchronous). `null` while computing. */
export function useShareCode(selection: ExportSelection): string | null {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    setCode(null);
    toShareCode(selection)
      .then((next) => current && setCode(next))
      .catch(() => current && setCode(null));
    return () => {
      current = false;
    };
  }, [selection]);
  return code;
}
