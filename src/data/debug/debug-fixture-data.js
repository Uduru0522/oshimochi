export const GOODS_TYPE_FIXTURES = Object.freeze([
  {
    id: "tapestries",
    displayName: "Tapestries",
    description: "Wall scrolls, fabric posters, and related display goods."
  },
  {
    id: "figures",
    displayName: "Figures",
    description: "Scale figures, prize figures, and boxed display items."
  },
  {
    id: "acrylic-goods",
    displayName: "Acrylic goods",
    description:
      "Acrylic stands, keychains, panels, desk displays, and event-exclusive accessories. This deliberately longer description verifies that collection metadata wraps cleanly and expands its overview panel without escaping the border."
  }
]);

export const CUSTOM_FIELD_FIXTURES = Object.freeze({
  tapestries: Object.freeze([
    { key: "series", displayName: "Series", dataType: "text", isRequired: true },
    { key: "notes", displayName: "Notes", dataType: "long_text" },
    { key: "width_cm", displayName: "Width (cm)", dataType: "number" },
    { key: "release_date", displayName: "Release date", dataType: "date" },
    {
      key: "display_status",
      displayName: "Display status",
      dataType: "boolean",
      isRequired: true,
      options: { falseLabel: "Stored", trueLabel: "Displayed" }
    },
    { key: "source", displayName: "Reference page", dataType: "url" },
    {
      key: "condition",
      displayName: "Condition",
      dataType: "select",
      options: {
        choices: [
          { id: "sealed", label: "Sealed" },
          { id: "opened", label: "Opened" },
          { id: "displayed", label: "Displayed" }
        ]
      }
    }
  ]),
  figures: Object.freeze([
    { key: "manufacturer", displayName: "Manufacturer", dataType: "text" },
    {
      key: "scale",
      displayName: "Scale",
      dataType: "select",
      options: {
        choices: [
          { id: "one_seventh", label: "1/7" },
          { id: "one_eighth", label: "1/8" },
          { id: "non_scale", label: "Non-scale" }
        ]
      }
    },
    {
      key: "edition",
      displayName: "Edition",
      dataType: "boolean",
      isRequired: true,
      options: { falseLabel: "Standard", trueLabel: "Limited" }
    }
  ]),
  "acrylic-goods": Object.freeze([
    {
      key: "format",
      displayName: "Format",
      dataType: "select",
      options: {
        choices: [
          { id: "stand", label: "Stand" },
          { id: "keychain", label: "Keychain" },
          { id: "panel", label: "Panel" }
        ]
      }
    },
    { key: "event", displayName: "Event", dataType: "text" }
  ])
});

// Keep one dense collection for query and layout testing; the others stay small
// enough for focused field-type checks.
export const TAPESTRY_CATALOG = Object.freeze([
  {
    key: "summer-festival",
    name: "Summer Festival B2 Tapestry",
    series: "Starlight Memories",
    notes: "Convention edition with the original storage sleeve.",
    widthCm: 51.5,
    releaseDate: "2025-08-16",
    isDisplayed: true,
    source: "https://example.com/catalog/summer-festival",
    condition: "displayed",
    image: { label: "SUMMER", orientation: "portrait", color: "#267a73" }
  },
  {
    key: "winter-cafe",
    name: "Winter Cafe Wall Scroll",
    series: "Cafe Collection",
    widthCm: 72.8,
    releaseDate: "2024-12-20",
    isDisplayed: false,
    condition: "sealed",
    image: { label: "WINTER", orientation: "landscape", color: "#536f91" }
  },
  {
    key: "legacy-record",
    name: "Legacy Imported Tapestry",
    isDisplayed: false,
    condition: "opened",
    image: { label: "LEGACY", orientation: "portrait", color: "#876949" }
  },
  {
    key: "moonlit-concert",
    name: "Moonlit Concert Tapestry",
    series: "Starlight Memories",
    notes: "First-print bonus artwork.",
    widthCm: 51.5,
    releaseDate: "2025-11-02",
    isDisplayed: true,
    source: "https://example.com/catalog/moonlit-concert",
    condition: "opened",
    image: { label: "MOON", orientation: "landscape", color: "#56518b" }
  },
  {
    key: "spring-market",
    name: "Spring Market Wall Scroll",
    series: "Seasonal Market",
    notes: "Purchased at the spring pop-up store.",
    widthCm: 42,
    releaseDate: "2023-03-18",
    isDisplayed: false,
    condition: "sealed",
    image: { label: "SPRING", orientation: "portrait", color: "#568267" }
  },
  {
    key: "anniversary-key-visual",
    name: "10th Anniversary Exhibition Main Visual Extra-Large Tapestry",
    series: "Anniversary Archive",
    notes:
      "Large-format commemorative release with a deliberately long item name and note for responsive list and card testing.",
    widthCm: 103,
    releaseDate: "2025-05-10",
    isDisplayed: true,
    source: "https://example.com/events/anniversary/archive/main-visual",
    condition: "displayed",
    image: { label: "10 YEARS", orientation: "landscape", color: "#8a5f76" }
  },
  {
    key: "seaside-vacation",
    name: "Seaside Vacation Tapestry",
    series: "Holiday Sketches",
    widthCm: 51.5,
    releaseDate: "2022-07-22",
    isDisplayed: false,
    source: "https://example.com/catalog/seaside-vacation",
    image: { label: "SEASIDE", orientation: "portrait", color: "#347f9d" }
  },
  {
    key: "autumn-reading-room",
    name: "Autumn Reading Room Scroll",
    series: "Cafe Collection",
    notes: "Minor crease near the lower edge; sleeve retained.",
    widthCm: 60,
    releaseDate: "2021-10-08",
    isDisplayed: false,
    condition: "opened",
    image: { label: "AUTUMN", orientation: "landscape", color: "#8d633f" }
  },
  {
    key: "new-year-shrine",
    name: "New Year Shrine Visit Tapestry",
    series: "Holiday Sketches",
    notes: "Lucky-bag exclusive.",
    widthCm: 51.5,
    releaseDate: "2024-01-01",
    isDisplayed: true,
    condition: "displayed",
    image: { label: "NEW YEAR", orientation: "portrait", color: "#9a4f51" }
  },
  {
    key: "cherry-blossom-picnic",
    name: "Cherry Blossom Picnic Wall Scroll",
    series: "Seasonal Market",
    widthCm: 72.8,
    releaseDate: "2025-03-29",
    isDisplayed: true,
    source: "https://example.com/catalog/cherry-blossom",
    condition: "opened",
    image: { label: "SAKURA", orientation: "landscape", color: "#a85f78" }
  },
  {
    key: "rainy-day-cafe",
    name: "Rainy Day Cafe Tapestry",
    series: "Cafe Collection",
    notes: "Standard online-store release.",
    widthCm: 51.5,
    releaseDate: "2023-06-11",
    isDisplayed: false,
    source: "https://example.com/catalog/rainy-day-cafe",
    condition: "sealed",
    image: { label: "RAIN", orientation: "portrait", color: "#526c86" }
  },
  {
    key: "starry-night-festival",
    name: "Starry Night Festival B1 Tapestry",
    series: "Starlight Memories",
    notes: "The widest regular fixture, useful for numeric range filtering.",
    widthCm: 72.8,
    releaseDate: "2020-08-15",
    isDisplayed: true,
    condition: "displayed",
    image: { label: "STARRY", orientation: "landscape", color: "#3f527c" }
  },
  {
    key: "halloween-limited",
    name: "Halloween Limited Scroll",
    series: "Seasonal Market",
    widthCm: 42,
    releaseDate: "2024-10-19",
    isDisplayed: false,
    source: "https://example.com/events/halloween-2024",
    condition: "sealed",
    image: { label: "HALLOWEEN", orientation: "portrait", color: "#704c83" }
  },
  {
    key: "winter-uniform",
    name: "Winter Uniform Portrait Tapestry",
    series: "School Days",
    notes: "Displayed once, then returned to its sleeve.",
    widthCm: 51.5,
    releaseDate: "2022-12-02",
    isDisplayed: false,
    condition: "opened",
    image: { label: "UNIFORM", orientation: "landscape", color: "#50698a" }
  },
  {
    key: "summer-uniform-group",
    name: "Summer Uniform Group Tapestry",
    series: "School Days",
    widthCm: 72.8,
    releaseDate: "2023-07-14",
    isDisplayed: true,
    condition: "displayed",
    image: { label: "SCHOOL", orientation: "portrait", color: "#397d88" }
  },
  {
    key: "birthday-celebration",
    name: "Birthday Celebration Wall Scroll",
    series: "Anniversary Archive",
    notes: "Made-to-order release; order card stored separately.",
    widthCm: 51.5,
    releaseDate: "2025-02-07",
    isDisplayed: false,
    source: "https://example.com/catalog/birthday-celebration",
    condition: "sealed",
    image: { label: "BIRTHDAY", orientation: "landscape", color: "#9b5b68" }
  },
  {
    key: "retro-game-collaboration",
    name: "Retro Game Collaboration Tapestry",
    series: "Collaboration Works",
    widthCm: 60,
    releaseDate: "2019-09-21",
    isDisplayed: true,
    source: "https://example.com/collaborations/retro-game",
    condition: "opened",
    image: { label: "RETRO", orientation: "portrait", color: "#65713d" }
  },
  {
    key: "orchestra-performance",
    name: "Orchestra Performance Main Visual",
    series: "Starlight Memories",
    notes: "Venue-exclusive horizontal artwork.",
    widthCm: 84.1,
    releaseDate: "2024-04-06",
    isDisplayed: true,
    condition: "displayed",
    image: { label: "ORCHESTRA", orientation: "landscape", color: "#69588b" }
  },
  {
    key: "museum-collaboration",
    name: "Museum Collaboration Art Tapestry",
    series: "Collaboration Works",
    notes:
      "Includes a long provenance note to verify wrapping when list rows, cards, reviews, and general search display substantial content without horizontal overflow.",
    widthCm: 51.5,
    releaseDate: "2021-11-13",
    isDisplayed: false,
    source: "https://example.com/collaborations/museum/collection-2021",
    condition: "sealed",
    image: { label: "MUSEUM", orientation: "portrait", color: "#78654a" }
  },
  {
    key: "sports-day-banner",
    name: "Sports Day Team Banner",
    series: "School Days",
    widthCm: 145.6,
    releaseDate: "2020-05-30",
    isDisplayed: false,
    condition: "opened",
    image: { label: "SPORTS", orientation: "landscape", color: "#a04e42" }
  },
  {
    key: "tea-party",
    name: "Afternoon Tea Party Tapestry",
    series: "Cafe Collection",
    notes: "Bonus postcard is still sealed with the package.",
    widthCm: 42,
    releaseDate: "2025-09-06",
    isDisplayed: true,
    source: "https://example.com/catalog/afternoon-tea",
    condition: "sealed",
    image: { label: "TEA PARTY", orientation: "portrait", color: "#8b6b79" }
  },
  {
    key: "travel-memories",
    name: "Travel Memories Panorama Scroll",
    series: "Holiday Sketches",
    widthCm: 210.5,
    releaseDate: "2018-06-23",
    isDisplayed: false,
    condition: "opened",
    image: { label: "TRAVEL", orientation: "landscape", color: "#477b71" }
  },
  {
    key: "midnight-blue-edition",
    name: "Midnight Blue Limited Edition",
    series: "Anniversary Archive",
    notes: "Numbered edition 041 of 300.",
    widthCm: 51.5,
    releaseDate: "2026-01-10",
    isDisplayed: true,
    source: "https://example.com/catalog/midnight-blue-limited",
    condition: "displayed",
    image: { label: "MIDNIGHT", orientation: "portrait", color: "#364e70" }
  },
  {
    key: "prototype-sample",
    name: "Uncatalogued Prototype Sample",
    notes: "Intentionally missing the required Series value for warning-state testing.",
    widthCm: 48.3,
    isDisplayed: false,
    condition: "opened",
    image: { label: "PROTOTYPE", orientation: "landscape", color: "#6c6c6c" }
  }
]);

export const OTHER_ITEM_CATALOG = Object.freeze([
  {
    id: "figure-limited-edition",
    goodsTypeId: "figures",
    name: "Limited Edition Scale Figure",
    customValues: {
      "figures-manufacturer": "Example Works",
      "figures-scale": "one_seventh",
      "figures-edition": true
    },
    createdAt: "2026-01-06T09:00:00.000Z",
    updatedAt: "2026-02-09T12:00:00.000Z",
    image: { label: "LIMITED", orientation: "portrait", color: "#86556f" }
  },
  {
    id: "figure-prize-release",
    goodsTypeId: "figures",
    name: "Prize Figure",
    customValues: {
      "figures-scale": "non_scale",
      "figures-edition": false
    },
    createdAt: "2026-01-07T09:00:00.000Z",
    updatedAt: "2026-02-08T12:00:00.000Z",
    image: { label: "PRIZE", orientation: "landscape", color: "#5e6f42" }
  },
  {
    id: "figure-standard-release",
    goodsTypeId: "figures",
    name: "Standard School Uniform Figure",
    customValues: {
      "figures-manufacturer": "North Star Models",
      "figures-scale": "one_eighth",
      "figures-edition": false
    },
    createdAt: "2026-01-08T09:00:00.000Z",
    updatedAt: "2026-02-07T12:00:00.000Z",
    image: { label: "STANDARD", orientation: "portrait", color: "#486a82" }
  },
  {
    id: "figure-retired-prototype",
    goodsTypeId: "figures",
    name: "Retired Prototype Figure",
    customValues: {
      "figures-manufacturer": "Archive Models",
      "figures-scale": "non_scale",
      "figures-edition": true
    },
    createdAt: "2026-01-11T09:00:00.000Z",
    updatedAt: "2026-02-10T12:00:00.000Z",
    isDeleted: true,
    deletedAt: "2026-02-10T12:00:00.000Z",
    image: { label: "RETIRED", orientation: "landscape", color: "#7b5e58" }
  },
  {
    id: "acrylic-anniversary-stand",
    goodsTypeId: "acrylic-goods",
    name: "Anniversary Acrylic Stand",
    customValues: {
      "acrylic-goods-format": "stand",
      "acrylic-goods-event": "10th Anniversary Exhibition"
    },
    createdAt: "2026-01-04T09:00:00.000Z",
    updatedAt: "2026-02-07T12:00:00.000Z",
    image: { label: "ACRYLIC", orientation: "portrait", color: "#3d7085" }
  },
  {
    id: "acrylic-summer-keychain",
    goodsTypeId: "acrylic-goods",
    name: "Summer Event Acrylic Keychain",
    customValues: {
      "acrylic-goods-format": "keychain",
      "acrylic-goods-event": "Summer Market 2025"
    },
    createdAt: "2026-01-09T09:00:00.000Z",
    updatedAt: "2026-02-06T12:00:00.000Z",
    image: { label: "KEYCHAIN", orientation: "landscape", color: "#3f8580" }
  },
  {
    id: "acrylic-gallery-panel",
    goodsTypeId: "acrylic-goods",
    name: "Gallery Collaboration Acrylic Panel",
    customValues: {
      "acrylic-goods-format": "panel",
      "acrylic-goods-event": "City Gallery Collaboration"
    },
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-02-05T12:00:00.000Z",
    image: { label: "PANEL", orientation: "portrait", color: "#6c5b88" }
  }
]);
