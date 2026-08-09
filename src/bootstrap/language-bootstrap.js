(() => {
  try {
    const savedLanguage = localStorage.getItem("wotagoods.language");
    const normalized = savedLanguage === "ja" || savedLanguage === "zh-Hant"
      ? savedLanguage
      : "en";

    document.documentElement.lang = normalized;
    if (normalized !== "en") {
      document.documentElement.dataset.languagePending = "true";
      window.setTimeout(() => {
        delete document.documentElement.dataset.languagePending;
      }, 2000);
    }
  } catch {
    document.documentElement.lang = "en";
  }
})();
