import { createPrimaryNavigation } from "./primary-navigation.js";
import { createUtilityNavigation } from "./utility-navigation.js";

export function createNavigation({
  primaryContainer,
  utilityContainer,
  utilityMenu,
  utilityMenuToggle,
  onSelect,
  views
}) {
  const primaryNavigation = createPrimaryNavigation({
    container: primaryContainer,
    onSelect,
    views
  });
  const utilityNavigation = createUtilityNavigation({
    container: utilityContainer,
    menu: utilityMenu,
    menuToggle: utilityMenuToggle,
    onSelect,
    views
  });

  function render() {
    primaryNavigation.render();
    utilityNavigation.render();
  }

  function setActiveView(viewId) {
    primaryNavigation.setActiveView(viewId);
    utilityNavigation.setActiveView(viewId);
  }

  return {
    destroy: () => utilityNavigation.destroy(),
    render,
    setActiveView
  };
}
