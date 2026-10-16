import { createNavButton } from "./nav-items.js";
import { bindUtilityMenu } from "./utility-menu.js";
import { NAV_GROUPS } from "../views/view-metadata.js";

export function createUtilityNavigation({ container, menu, menuToggle, onSelect, views }) {
  const buttons = new Map();
  const utilityViews = views.filter((view) => view.nav?.group === NAV_GROUPS.utility);
  const menuController = bindUtilityMenu({ menu, toggle: menuToggle });

  function render() {
    const fragment = document.createDocumentFragment();

    buttons.clear();

    utilityViews.forEach((view) => {
      const button = createNavButton(view, {
        className: "utility-nav-item",
        onSelect: () => onSelect(view.id)
      });

      buttons.set(view.id, button);
      fragment.append(button);
    });

    container.replaceChildren(fragment);
  }

  function setActiveView(viewId) {
    buttons.forEach((button, id) => {
      button.setAttribute("aria-current", id === viewId ? "page" : "false");
    });

    menuToggle.toggleAttribute("data-active", buttons.has(viewId));
  }

  return {
    destroy: () => menuController.destroy(),
    render,
    setActiveView
  };
}
