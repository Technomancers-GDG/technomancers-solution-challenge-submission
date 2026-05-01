/**
 * Formatting utilities for display values
 */

/**
 * Format a number as a percentage with specified decimal places
 * @param {number} value - The value (0-100)
 * @param {number} decimals - Decimal places (default: 1)
 * @returns {string} Formatted percentage (e.g., "85.5%")
 */
export function formatPercent(value, decimals = 1) {
  if (value == null) return "N/A";
  return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Format a number with commas for thousands
 * @param {number} value - The number to format
 * @param {number} decimals - Decimal places (default: 0)
 * @returns {string} Formatted number (e.g., "1,234.5")
 */
export function formatNumber(value, decimals = 0) {
  if (value == null) return "N/A";
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a number as a currency value
 * @param {number} value - The amount
 * @param {string} currency - Currency code (default: "INR")
 * @returns {string} Formatted currency (e.g., "₹1,234.50")
 */
export function formatCurrency(value, currency = "INR") {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
  }).format(value);
}

/**
 * Format a date for display
 * @param {Date|string} date - The date to format
 * @param {boolean} includeTime - Include time (default: false)
 * @returns {string} Formatted date (e.g., "Apr 23, 2026" or "Apr 23, 2026 10:30 AM")
 */
export function formatDate(date, includeTime = false) {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "N/A";

  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }

  return d.toLocaleDateString("en-IN", options);
}

/**
 * Format a time duration in human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "2h 30m" or "45m" or "30s")
 */
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return "0s";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Format a distance in kilometers
 * @param {number} km - Distance in kilometers
 * @returns {string} Formatted distance (e.g., "125.5 km" or "500 m")
 */
export function formatDistance(km) {
  if (km == null) return "N/A";
  if (km >= 1) {
    return `${Number(km).toFixed(1)} km`;
  } else {
    return `${Math.round(km * 1000)} m`;
  }
}

/**
 * Format a temperature value
 * @param {number} celsius - Temperature in Celsius
 * @returns {string} Formatted temperature (e.g., "25°C")
 */
export function formatTemperature(celsius) {
  if (celsius == null) return "N/A";
  return `${Number(celsius).toFixed(1)}°C`;
}

/**
 * Format a speed value
 * @param {number} kmph - Speed in km/h
 * @returns {string} Formatted speed (e.g., "65 km/h")
 */
export function formatSpeed(kmph) {
  if (kmph == null) return "N/A";
  return `${Number(kmph).toFixed(1)} km/h`;
}

/**
 * Format a capacity value with unit
 * @param {number} value - Capacity value
 * @param {string} unit - Unit of measurement (default: "units")
 * @returns {string} Formatted capacity (e.g., "500 units")
 */
export function formatCapacity(value, unit = "units") {
  if (value == null) return "N/A";
  return `${formatNumber(value, 0)} ${unit}`;
}

/**
 * Format a confidence score (0-1 or 0-100)
 * @param {number} score - Confidence score
 * @returns {string} Formatted score with percentage (e.g., "85%")
 */
export function formatConfidence(score) {
  if (score == null) return "N/A";
  const normalized = score > 1 ? score : score * 100;
  return formatPercent(normalized, 0);
}

/**
 * Truncate text to a maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text with ellipsis if needed
 */
export function truncateText(text, maxLength = 50) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Format a status badge color based on value
 * @param {string} status - Status value
 * @returns {string} CSS class name for styling
 */
export function getStatusColor(status) {
  const statusMap = {
    idle: "status-neutral",
    active: "status-good",
    in_transit: "status-accent",
    loading: "status-warning",
    unloading: "status-warning",
    maintenance: "status-danger",
    delayed: "status-danger",
    completed: "status-good",
    pending: "status-warning",
    accepted: "status-good",
    ignored: "status-neutral",
    resolved: "status-good",
  };
  return statusMap[status] || "status-neutral";
}

/**
 * Get severity badge color
 * @param {string|number} severity - Severity level
 * @returns {string} CSS class name
 */
export function getSeverityColor(severity) {
  const level = typeof severity === "string" ? severity.toLowerCase() : severity;
  if (level === "critical" || level === 3) return "severity-critical";
  if (level === "warning" || level === 2) return "severity-warning";
  if (level === "info" || level === 1) return "severity-info";
  return "severity-info";
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date|string} date - The date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "N/A";

  const now = new Date();
  const diffMs = now - d;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(d);
}
