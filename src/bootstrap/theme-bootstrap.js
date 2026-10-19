(() => {
  const ACCENT_THEME_COLORS = {
    blue: "#2675c7",
    green: "#168078",
    orange: "#b95700",
    pink: "#c0397f",
    purple: "#8057c4",
    red: "#c2354b",
    yellow: "#d3ad00"
  };
  const DARK_THEME_COLOR = "#171c1b";
  const DEFAULT_ACCENT = "green";

  try {
    const savedAccent = localStorage.getItem("oshimochi.accent");
    const accent = Object.hasOwn(ACCENT_THEME_COLORS, savedAccent)
      ? savedAccent
      : DEFAULT_ACCENT;
    const theme = localStorage.getItem("oshimochi.theme") === "dark" ? "dark" : "light";
    const themeColor = theme === "dark" ? DARK_THEME_COLOR : ACCENT_THEME_COLORS[accent];

    document.documentElement.dataset.accent = accent;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
  } catch {
    document.documentElement.dataset.accent = DEFAULT_ACCENT;
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }
})();
