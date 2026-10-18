const { test: base, expect } = require("@playwright/test");

const test = base.extend({
  expectedConsoleErrors: [[], { option: true }],
  page: async ({ page, expectedConsoleErrors }, use) => {
    const errors = [];
    const consoleErrors = [];

    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await use(page);
    expect(errors, "The app must not throw uncaught browser errors.").toEqual([]);
    expect(consoleErrors, "Console errors must match the test's explicit expectations.")
      .toEqual(expectedConsoleErrors.map((pattern) => expect.stringMatching(pattern)));
  }
});

module.exports = { test, expect };
