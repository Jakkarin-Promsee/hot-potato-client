import { useCallback } from "react";
import { useLanguageStore } from "@/stores/language.store";

export const useEditorI18n = () => {
  const language = useLanguageStore((s) => s.language);
  const isThai = language === "th";

  const t = useCallback(
    (english: string, thai: string) => (isThai ? thai : english),
    [isThai],
  );

  return { language, isThai, t };
};
