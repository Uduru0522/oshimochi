const { expect } = require("../fixtures.js");

async function chooseImage(page, dialog, orientation = "Portrait") {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const context = canvas.getContext("2d");
    context.fillStyle = "#c63d3d";
    context.fillRect(0, 0, 100, 200);
    context.fillStyle = "#305cb8";
    context.fillRect(100, 0, 100, 200);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const chooser = page.waitForEvent("filechooser");
  await dialog.getByRole("button", { name: /^(Choose|Replace) image$/ }).click();
  await (await chooser).setFiles({
    name: "two-colors.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64")
  });
  await expect(dialog.getByAltText("Selected source image")).toBeVisible();
  await dialog.getByRole("button", { name: orientation, exact: true }).click();
  await expect(dialog.getByRole("button", { name: orientation, exact: true }))
    .toHaveAttribute("aria-pressed", "true");
}

async function readImage(image) {
  await expect(image).toBeVisible();
  return image.evaluate(async (element) => {
    await element.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    const context = canvas.getContext("2d");
    context.drawImage(element, 0, 0, 8, 8);
    return {
      width: element.naturalWidth,
      height: element.naturalHeight,
      pixels: [...context.getImageData(0, 0, 8, 8).data]
    };
  });
}

module.exports = { chooseImage, readImage };
