import { APP_CONFIG } from "./config.js";
import { clearElement } from "../shared/dom.js";
import {
  getCustomPropertyDurationMs,
  prefersReducedMotion
} from "../shared/motion.js";
import { getViewById } from "../views/view-definitions.js";

export function createViewRouter({
  navigation,
  renderer,
  views,
  viewActions,
  viewPanel,
  viewSection,
  viewTitle
}) {
  let activeViewId = null;
  let destroyActiveView = null;
  let viewSwitchTimer = 0;

  function commitView(view) {
    const rendered = renderer.render(view);
    const content = rendered?.content ?? rendered;

    destroyActiveView?.();
    destroyActiveView = rendered?.destroy ?? null;
    viewSection.textContent = view.section;
    viewTitle.textContent = view.title;
    viewPanel.scrollTop = 0;
    viewPanel.scrollLeft = 0;
    clearElement(viewActions);
    clearElement(viewPanel);
    if (rendered?.topbarAction) {
      viewActions.append(rendered.topbarAction);
    }
    viewPanel.append(content);
  }

  function setActiveView(viewId) {
    const view = getViewById(views, viewId);

    if (view.id === activeViewId) {
      return;
    }

    activeViewId = view.id;
    clearTimeout(viewSwitchTimer);
    navigation.setActiveView(view.navigationId ?? view.id);

    if (!viewPanel.hasChildNodes() || prefersReducedMotion()) {
      viewPanel.classList.remove("is-switching");
      commitView(view);
      return;
    }

    viewPanel.classList.add("is-switching");
    const motionDurationMs = getCustomPropertyDurationMs(
      document.documentElement,
      "--motion-fast",
      APP_CONFIG.motion.fastFallbackMs
    );

    viewSwitchTimer = window.setTimeout(() => {
      commitView(view);
      requestAnimationFrame(() => viewPanel.classList.remove("is-switching"));
    }, Math.round(motionDurationMs / 2));
  }

  return {
    destroy() {
      clearTimeout(viewSwitchTimer);
      destroyActiveView?.();
      destroyActiveView = null;
      activeViewId = null;
    },
    setActiveView
  };
}
