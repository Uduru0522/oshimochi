export const APP_CONFIG = {
  debugQueryParam: "debug",
  defaultViewId: "dashboard",
  language: {
    storageKey: "language",
    storageNamespace: "wotagoods"
  },
  layout: {
    narrowQuery: "(max-width: 1100px)",
    transitionDurationMs: 180
  },
  motion: {
    fastFallbackMs: 160
  },
  project: {
    repositoryUrl: "https://github.com/Uduru0522/wotagoods-manager"
  },
  serviceWorkerPath: "service-worker.js",
  selectors: {
    appShell: ".app-shell",
    brandSubtitle: "#brandSubtitle",
    primaryNavList: "#primaryNavList",
    projectRepositoryIcon: "#projectRepositoryIcon",
    projectRepositoryLink: "#projectRepositoryLink",
    sidebar: ".sidebar",
    utilityNavList: "#utilityNavList",
    viewActions: "#viewActions",
    viewPanel: "#viewPanel",
    viewSection: "#viewSection",
    viewToolbar: "#viewToolbar",
    viewTitle: "#viewTitle"
  },
  theme: {
    colors: {
      dark: "#101417",
      light: "#2f6f73"
    },
    dark: "dark",
    light: "light",
    storageKey: "theme",
    storageNamespace: "wotagoods"
  }
};
