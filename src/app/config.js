export const APP_CONFIG = {
  backups: {
    googleDrive: {
      apiKeyStorageKey: "google-drive-api-key",
      appIdStorageKey: "google-drive-project-number",
      clientIdStorageKey: "google-drive-client-id",
      destinationStorageKey: "google-drive-destination",
      storageNamespace: "wotagoods"
    },
    retainedCloudSnapshots: 3
  },
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
    projectExternalIcon: "#projectExternalIcon",
    projectRepositoryIcon: "#projectRepositoryIcon",
    projectRepositoryLink: "#projectRepositoryLink",
    sidebar: ".sidebar",
    utilityMenu: "#utilityMenu",
    utilityMenuIcon: "#utilityMenuIcon",
    utilityMenuToggle: "#utilityMenuToggle",
    utilityNavList: "#utilityNavList",
    viewActions: "#viewActions",
    viewPanel: "#viewPanel",
    viewSection: "#viewSection",
    viewToolbar: "#viewToolbar",
    viewTitle: "#viewTitle"
  },
  theme: {
    accent: {
      colors: {
        blue: "#2675c7",
        green: "#168078",
        orange: "#b95700",
        pink: "#c0397f",
        purple: "#8057c4",
        red: "#c2354b",
        yellow: "#d3ad00"
      },
      defaultValue: "green",
      storageKey: "accent",
      values: ["red", "orange", "yellow", "blue", "green", "pink", "purple"]
    },
    colors: {
      dark: "#101417"
    },
    dark: "dark",
    light: "light",
    storageKey: "theme",
    storageNamespace: "wotagoods"
  }
};
