import { createActionButton } from "../../shared/action-button.js";
import { translate } from "../../localization/translate.js";
import { createElement } from "../../shared/dom.js";
import {
  calculateContainedRectangle,
  calculateCropRectangle
} from "./image-processor.js";

const MIN_CROP_SCALE = 0.25;
const ORIENTATIONS = Object.freeze([
  Object.freeze({ label: "Portrait", value: "portrait" }),
  Object.freeze({ label: "Landscape", value: "landscape" })
]);

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createOrientationControl(source, onChange) {
  const control = createElement("div", {
    attributes: { "aria-label": translate("Image orientation"), role: "group" },
    className: "item-orientation-control"
  });

  function update() {
    control.dataset.orientation = source.orientation;
    control.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.value === source.orientation));
    });
  }

  ORIENTATIONS.forEach(({ label, value }) => {
    const button = createActionButton(translate(label), {
      className: "item-orientation-option"
    });
    button.dataset.value = value;
    button.addEventListener("click", () => {
      if (source.orientation === value) {
        return;
      }

      source.orientation = value;
      onChange();
      update();
    });
    control.append(button);
  });
  update();
  return control;
}

function bindCropStage({ cropBox, image, onChange, source, stage }) {
  let geometry = null;
  let drag = null;
  let destroyed = false;

  function update() {
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;

    if (destroyed || !stage.clientWidth || !stage.clientHeight || !naturalWidth || !naturalHeight) {
      return;
    }

    const preview = calculateContainedRectangle(
      naturalWidth,
      naturalHeight,
      stage.clientWidth,
      stage.clientHeight
    );

    if (!preview) {
      return;
    }

    image.style.width = `${preview.width}px`;
    image.style.height = `${preview.height}px`;
    image.style.left = `${preview.x}px`;
    image.style.top = `${preview.y}px`;

    const isPortrait = source.orientation === "portrait";
    const crop = calculateCropRectangle(
      preview.width,
      preview.height,
      isPortrait ? 560 : 792,
      isPortrait ? 792 : 560,
      source.positionX,
      source.positionY,
      source.cropScale
    );

    geometry = {
      availableX: preview.width - crop.width,
      availableY: preview.height - crop.height
    };
    cropBox.style.width = `${crop.width}px`;
    cropBox.style.height = `${crop.height}px`;
    cropBox.style.left = `${preview.x + crop.x}px`;
    cropBox.style.top = `${preview.y + crop.y}px`;
  }

  function finishDrag(event) {
    if (!drag || !cropBox.hasPointerCapture(event.pointerId)) {
      return;
    }

    cropBox.releasePointerCapture(event.pointerId);
    drag = null;
    delete cropBox.dataset.dragging;
  }

  cropBox.addEventListener("pointerdown", (event) => {
    drag = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      positionX: source.positionX,
      positionY: source.positionY
    };
    cropBox.setPointerCapture(event.pointerId);
    cropBox.dataset.dragging = "true";
  });
  cropBox.addEventListener("pointermove", (event) => {
    if (!drag || !cropBox.hasPointerCapture(event.pointerId) || !geometry) {
      return;
    }

    source.positionX = geometry.availableX > 0
      ? clamp(drag.positionX + (event.clientX - drag.pointerX) / geometry.availableX)
      : 0.5;
    source.positionY = geometry.availableY > 0
      ? clamp(drag.positionY + (event.clientY - drag.pointerY) / geometry.availableY)
      : 0.5;
    onChange();
    update();
  });
  cropBox.addEventListener("pointerup", finishDrag);
  cropBox.addEventListener("pointercancel", finishDrag);
  image.addEventListener("load", update, { once: true });

  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(update)
    : null;
  const animationFrame = requestAnimationFrame(update);
  resizeObserver?.observe(stage);

  return {
    destroy() {
      destroyed = true;
      resizeObserver?.disconnect();
      cancelAnimationFrame(animationFrame);
    },
    update
  };
}

export function createItemCropEditor({ onChange, onRemove, source }) {
  const stage = createElement("div", { className: "item-crop-stage" });
  const image = createElement("img", {
    attributes: {
      alt: translate("Selected source image"),
      draggable: "false",
      src: source.previewUrl
    }
  });
  const cropBox = createElement("div", {
    attributes: { "aria-label": translate("Crop selection") },
    className: "item-crop-box"
  });
  const controls = createElement("div", { className: "item-image-controls" });
  const sizeControl = createElement("label", { className: "item-crop-size" });
  const sizeSlider = createElement("input", {
    attributes: {
      "aria-label": translate("Crop size"),
      max: "100",
      min: String(MIN_CROP_SCALE * 100),
      type: "range",
      value: String(source.cropScale * 100)
    }
  });
  const removeButton = createActionButton(translate("Remove"), {
    className: "secondary-action"
  });

  stage.append(image, cropBox);
  const cropBinding = bindCropStage({ cropBox, image, onChange, source, stage });
  const orientationControl = createOrientationControl(source, () => {
    onChange();
    cropBinding.update();
  });
  sizeSlider.addEventListener("input", () => {
    source.cropScale = clamp(Number(sizeSlider.value) / 100, MIN_CROP_SCALE, 1);
    onChange();
    cropBinding.update();
  });
  removeButton.addEventListener("click", onRemove, { once: true });
  sizeControl.append(
    createElement("span", { textContent: translate("Crop size") }),
    sizeSlider
  );
  controls.append(orientationControl, sizeControl, removeButton);

  return {
    controls,
    destroy: cropBinding.destroy,
    stage
  };
}
