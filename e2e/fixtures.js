const { test: base, expect } = require("@playwright/test");

const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];

    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });

    await use(page);
    expect(errors, "The app must not log browser errors.").toEqual([]);
  }
});

module.exports = { test, expect };
