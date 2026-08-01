const ICON_PATHS = {
  dashboard: [
    "M4 13h7V4H4v9Zm9 7h7V4h-7v16ZM4 20h7v-5H4v5Z"
  ],
  items: [
    "M5 4h14v16H5V4Z",
    "M8 8h8",
    "M8 12h8",
    "M8 16h5"
  ],
  add: [
    "M12 5v14",
    "M5 12h14"
  ],
  close: [
    "M6 6l12 12",
    "M18 6 6 18"
  ],
  delete: [
    "M3 6h18",
    "M8 6V4h8v2",
    "M19 6l-1 14H6L5 6",
    "M10 11v6",
    "M14 11v6"
  ],
  edit: [
    "M12 20h9",
    "M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"
  ],
  filter: [
    "M4 5h16",
    "M7 12h10",
    "M10 19h4"
  ],
  sort: [
    "M8 6h12",
    "M8 12h9",
    "M8 18h6",
    "M4 4v16",
    "M2 18l2 2 2-2"
  ],
  goodsType: [
    "M5 7h14",
    "M7 7v12h10V7",
    "M9 11h6",
    "M9 15h4"
  ],
  lock: [
    "M6 10h12v10H6V10Z",
    "M8 10V7a4 4 0 0 1 8 0v3"
  ],
  moveDown: ["M6 9l6 6 6-6"],
  moveUp: ["M18 15l-6-6-6 6"],
  administration: [
    "M12 4l7 4v8l-7 4-7-4V8l7-4Z",
    "M12 8v8",
    "M8 10l8 4"
  ],
  options: [
    "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z",
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
  ]
};

export function createIcon(iconName) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  svg.classList.add("nav-svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("viewBox", "0 0 24 24");

  ICON_PATHS[iconName].forEach((pathData) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    svg.append(path);
  });

  return svg;
}
