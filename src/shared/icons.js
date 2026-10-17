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
  information: [
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
    "M12 10v6",
    "M12 7h.01"
  ],
  grid: [
    "M4 4h6v6H4V4Z",
    "M14 4h6v6h-6V4Z",
    "M4 14h6v6H4v-6Z",
    "M14 14h6v6h-6v-6Z"
  ],
  github: [
    "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.28-.36 6.72-1.61 6.72-7A5.4 5.4 0 0 0 19.22 4a5 5 0 0 0-.09-3.5S17.95.14 15 1.82a13.38 13.38 0 0 0-7 0C5.05.14 3.87.5 3.87.5A5 5 0 0 0 3.78 4a5.4 5.4 0 0 0-1.5 3.5c0 5.42 3.44 6.61 6.72 7A4.8 4.8 0 0 0 8 18v4",
    "M8 19c-3 .9-3-2-4-2"
  ],
  externalLink: [
    "M14 3h7v7",
    "M10 14 21 3",
    "M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"
  ],
  list: [
    "M8 6h12",
    "M8 12h12",
    "M8 18h12",
    "M4 6h.01",
    "M4 12h.01",
    "M4 18h.01"
  ],
  add: [
    "M12 5v14",
    "M5 12h14"
  ],
  arrowLeft: [
    "M19 12H5",
    "M12 19l-7-7 7-7"
  ],
  chevronRight: ["M9 18l6-6-6-6"],
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
  archiveRestore: [
    "M3 8h18v12H3V8Z",
    "M1 4h22v4H1V4Z",
    "M9 14l3-3 3 3",
    "M12 11v6"
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
  moreVertical: [
    "M12 6.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z",
    "M12 13.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z",
    "M12 20.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z"
  ],
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
