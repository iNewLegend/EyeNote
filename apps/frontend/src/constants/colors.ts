export const BRAND_COLORS = {
  // Primary Colors
  PRIMARY: "#4804ad",
  PRIMARY_HOVER: "#5e1d78",
  PRIMARY_LIGHT: "rgba(72, 4, 173, 0.1)",

  // UI Colors
  BACKGROUND_DARK: "#1a1325",
  BACKGROUND_INPUT: "#2f1136",
  HOVER_WIDGET: "#610ba7",

  // Accent Colors
  ACCENT_LIGHT: "#c792ea",
  ACCENT_DARK: "#2c014a",

  // Functional Colors
  TEXT: "#213547",
  BACKGROUND: "#ffffff",
  BORDER: "#ddd",
  SHADOW: "rgba(0, 0, 0, 0.1)",

  // States
  SUCCESS: "#4CAF50",
  ERROR: "#f44336",
  WARNING: "#ff9800",
  INFO: "#2196f3",
} as const;

export const THEME = {
  light: {
    primary: BRAND_COLORS.PRIMARY,
    background: BRAND_COLORS.BACKGROUND,
    text: BRAND_COLORS.TEXT,
  },
  dark: {
    primary: BRAND_COLORS.PRIMARY,
    background: BRAND_COLORS.BACKGROUND_DARK,
    text: BRAND_COLORS.ACCENT_LIGHT,
  },
} as const;
