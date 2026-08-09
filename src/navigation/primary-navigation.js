import { createElement } from "../shared/dom.js";
import { translate } from "../localization/translate.js";
import { NAV_GROUPS, NAV_KINDS, VIEW_IDS } from "../views/view-metadata.js";
import { bindDragScroll } from "../shared/drag-scroll.js";
import { createNavButton, createNavSeparator } from "./nav-items.js";
import { bindScrollableRow } from "./scrollable-row.js";

function createEmptyGoodsNotice() {
  const note = createElement("p", {
    className: "nav-empty-note",
    textContent: translate("No goods types yet")
  });

  note.title = translate(
    "Create a goods type in Administration, or open debug mode for sample types."
  );

  return note;
}

function groupViews(views) {
  const primaryViews = views.filter((view) => view.nav?.group === NAV_GROUPS.primary);

  return {
    administration: primaryViews.find((view) => view.id === VIEW_IDS.administration),
    dashboard: primaryViews.find((view) => view.id === VIEW_IDS.dashboard),
    goodsTypes: primaryViews.filter((view) => view.nav?.kind === NAV_KINDS.goodsType)
  };
}

export function createPrimaryNavigation({ container, onSelect, views }) {
  const buttons = new Map();

  function createTrackedButton(view) {
    const button = createNavButton(view, {
      onSelect: (selectedView) => onSelect(selectedView.id)
    });

    buttons.set(view.id, button);

    return button;
  }

  function render() {
    const fragment = document.createDocumentFragment();
    const { administration, dashboard, goodsTypes } = groupViews(views);

    buttons.clear();

    if (dashboard) {
      fragment.append(createTrackedButton(dashboard));
    }

    fragment.append(createNavSeparator());

    if (goodsTypes.length === 0) {
      fragment.append(createEmptyGoodsNotice());
    }

    goodsTypes.forEach((view) => fragment.append(createTrackedButton(view)));

    if (administration) {
      fragment.append(createNavSeparator(), createTrackedButton(administration));
    }

    container.replaceChildren(fragment);
    bindDragScroll(container.parentElement, { axis: "y" });
    bindScrollableRow(container);
  }

  function setActiveView(viewId) {
    buttons.forEach((button, id) => {
      button.setAttribute("aria-current", id === viewId ? "page" : "false");
    });
  }

  return {
    render,
    setActiveView
  };
}
