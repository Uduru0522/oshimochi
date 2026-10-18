const { defineConfig } = require("@playwright/test");

const servers = [
  { name: "root", port: 4187, basePath: "/" },
  { name: "pages", port: 4188, basePath: "/oshimochi/" }
];

module.exports = defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.js",
  forbidOnly: true,
  fullyParallel: true,
  workers: process.env.CI ? 1 : 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    browserName: "chromium",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: servers.map(({ name, port, basePath }) => ({
    name,
    use: { baseURL: `http://127.0.0.1:${port}${basePath}` }
  })),
  webServer: servers.map(({ port, basePath }) => ({
    command: `node server.js --base-path=${basePath}`,
    env: { PORT: String(port) },
    url: `http://127.0.0.1:${port}${basePath}`,
    reuseExistingServer: false
  }))
});
