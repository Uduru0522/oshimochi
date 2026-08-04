import { createElement } from "../../shared/dom.js";

export function getContainedImageFrame(width, height) {
  if (![width, height].every((value) => Number.isFinite(value) && value > 0)) {
    return { height: "100%", width: "100%" };
  }

  if (width > height) {
    return { height: `${(height / width) * 100}%`, width: "100%" };
  }

  if (height > width) {
    return { height: "100%", width: `${(width / height) * 100}%` };
  }

  return { height: "100%", width: "100%" };
}

export function createItemThumbnail(
  item,
  getAsset,
  { className = "item-list-thumbnail" } = {}
) {
  const element = createElement("div", {
    className: `item-thumbnail ${className}`
  });
  let disposed = false;
  let imageUrl = "";

  function releaseImageUrl() {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      imageUrl = "";
    }
  }

  if (item.imageAssetId) {
    getAsset(item.imageAssetId)
      .then((asset) => {
        if (!asset || disposed) {
          return;
        }

        imageUrl = URL.createObjectURL(asset.data);
        const image = createElement("img", { attributes: { alt: "" } });
        Object.assign(image.style, getContainedImageFrame(asset.width, asset.height));
        image.addEventListener("load", releaseImageUrl, { once: true });
        image.addEventListener("error", releaseImageUrl, { once: true });
        image.src = imageUrl;
        element.replaceChildren(image);
      })
      .catch((error) => {
        if (!disposed) {
          console.warn("Item image could not be loaded:", error);
        }
      });
  }

  return {
    element,
    destroy() {
      disposed = true;
      releaseImageUrl();
    }
  };
}
