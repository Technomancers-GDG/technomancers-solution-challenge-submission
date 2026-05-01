/**
 * Color scheme constants and utilities
 */

// Color palette from CSS variables
export const colors = {
  // Background and panels
  bg: "#09131f",
  panel: "rgba(11, 22, 35, 0.82)",
  panelStrong: "rgba(10, 18, 31, 0.96)",

  // Borders and dividers
  border: "rgba(142, 174, 196, 0.22)",

  // Text
  text: "#eff6ff",
  muted: "#9fb7c8",

  // Primary brand colors
  accent: "#f4b000",
  teal: "#3bd6b4",
  coral: "#ff7e66",
  steel: "#84a5ff",

  // Status colors
  good: "#3bd6b4",
  warning: "#ffa500",
  danger: "#ff5b5b",
  neutral: "#9fb7c8",

  // Semantic colors for gradients
  accentGradientStart: "#f4b000",
  accentGradientEnd: "#f08700",
  tealGradientStart: "#3bd6b4",
  tealGradientEnd: "#2fa398",
};

/**
 * Get color for a utilization percentage
 * @param {number} percent - Utilization percentage (0-100)
 * @returns {string} Color code
 */
export function getUtilizationColor(percent) {
  if (percent < 70) return colors.good;
  if (percent < 90) return colors.warning;
  return colors.danger;
}

/**
 * Get color for a severity level
 * @param {string|number} severity - Severity level
 * @returns {string} Color code
 */
export function getSeverityColor(severity) {
  const level = typeof severity === "string" ? severity.toLowerCase() : severity;
  if (level === "critical" || level === 3) return colors.danger;
  if (level === "warning" || level === 2) return colors.warning;
  if (level === "info" || level === 1) return colors.good;
  return colors.neutral;
}

/**
 * Get color for a status value
 * @param {string} status - Status value
 * @returns {string} Color code
 */
export function getStatusColor(status) {
  const statusMap = {
    idle: colors.neutral,
    active: colors.good,
    in_transit: colors.accent,
    loading: colors.warning,
    unloading: colors.warning,
    maintenance: colors.danger,
    delayed: colors.danger,
    completed: colors.good,
    pending: colors.warning,
    accepted: colors.good,
    ignored: colors.neutral,
    resolved: colors.good,
  };
  return statusMap[status] || colors.neutral;
}

/**
 * Get background color with opacity for a status
 * @param {string} status - Status value
 * @returns {string} RGBA color code
 */
export function getStatusBackground(status) {
  const baseColor = getStatusColor(status);
  // Extract hex values and convert to RGB with opacity
  if (baseColor === colors.danger) return "rgba(255, 91, 91, 0.15)";
  if (baseColor === colors.warning) return "rgba(255, 165, 0, 0.15)";
  if (baseColor === colors.good) return "rgba(59, 214, 180, 0.15)";
  if (baseColor === colors.accent) return "rgba(244, 176, 0, 0.15)";
  return "rgba(159, 183, 200, 0.1)";
}

/**
 * Get SDG color by SDG number
 * @param {number} sdgNumber - SDG number (3, 9, 11, 12, 13, etc.)
 * @returns {string} Color code
 */
export function getSdgColor(sdgNumber) {
  const sdgColors = {
    3: "#dd3d3d", // Good Health and Well-being - Red
    9: "#dd6d2d", // Industry, Innovation, Infrastructure - Orange
    11: "#ddb52d", // Sustainable Cities and Communities - Yellow
    12: "#aaad2c", // Responsible Consumption - Olive
    13: "#2d7f2d", // Climate Action - Green
  };
  return sdgColors[sdgNumber] || colors.steel;
}

/**
 * Create gradient background string
 * @param {string} direction - Gradient direction (e.g., "135deg", "to right")
 * @param {string[]} colorStops - Color stops
 * @returns {string} CSS gradient string
 */
export function createGradient(direction, colorStops) {
  return `linear-gradient(${direction}, ${colorStops.join(", ")})`;
}

/**
 * Blend two colors by percentage
 * @param {string} color1 - First color (hex)
 * @param {string} color2 - Second color (hex)
 * @param {number} percent - Blend percentage (0-100)
 * @returns {string} Blended color (hex)
 */
export function blendColors(color1, color2, percent) {
  const hex2rgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  };

  const [r1, g1, b1] = hex2rgb(color1);
  const [r2, g2, b2] = hex2rgb(color2);
  const p = percent / 100;

  const r = Math.round(r1 * (1 - p) + r2 * p);
  const g = Math.round(g1 * (1 - p) + g2 * p);
  const b = Math.round(b1 * (1 - p) + b2 * p);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Check if color is dark
 * @param {string} color - Color code (hex)
 * @returns {boolean} True if dark
 */
export function isDarkColor(color) {
  const hex2rgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [128, 128, 128];
  };

  const [r, g, b] = hex2rgb(color);
  // Luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

/**
 * Get contrasting text color for a background
 * @param {string} bgColor - Background color
 * @returns {string} Text color (black or white)
 */
export function getContrastColor(bgColor) {
  return isDarkColor(bgColor) ? "#ffffff" : "#000000";
}

export default colors;
