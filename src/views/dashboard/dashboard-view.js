import { createDashboardElements } from './dashboard-elements.js';
import { createDashboardController } from './dashboard-controller.js';
export function renderDashboardView(options) {
  const { element, refs } = createDashboardElements();
  const controller = createDashboardController({ ...options, root: element, refs });
  return { content: element, destroy: controller.destroy };
}
