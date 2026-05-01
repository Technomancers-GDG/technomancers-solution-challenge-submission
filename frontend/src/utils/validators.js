/**
 * Input validation utilities
 */

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid email
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Indian format)
 * @param {string} phone - Phone number
 * @returns {boolean} True if valid phone
 */
export function isValidPhone(phone) {
  const phoneRegex = /^(\+91|0)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

/**
 * Validate latitude coordinate
 * @param {number} lat - Latitude
 * @returns {boolean} True if valid
 */
export function isValidLatitude(lat) {
  const num = Number(lat);
  return !isNaN(num) && num >= -90 && num <= 90;
}

/**
 * Validate longitude coordinate
 * @param {number} lon - Longitude
 * @returns {boolean} True if valid
 */
export function isValidLongitude(lon) {
  const num = Number(lon);
  return !isNaN(num) && num >= -180 && num <= 180;
}

/**
 * Validate that a value is not empty
 * @param {*} value - Value to check
 * @returns {boolean} True if value is not empty
 */
export function isNotEmpty(value) {
  return value !== null && value !== undefined && value !== "";
}

/**
 * Validate that a string has minimum length
 * @param {string} str - String to validate
 * @param {number} minLength - Minimum length
 * @returns {boolean} True if valid
 */
export function hasMinLength(str, minLength = 1) {
  return typeof str === "string" && str.trim().length >= minLength;
}

/**
 * Validate that a string has maximum length
 * @param {string} str - String to validate
 * @param {number} maxLength - Maximum length
 * @returns {boolean} True if valid
 */
export function hasMaxLength(str, maxLength = 255) {
  return typeof str === "string" && str.length <= maxLength;
}

/**
 * Validate facility name
 * @param {string} name - Facility name
 * @returns {object} {isValid, error}
 */
export function validateFacilityName(name) {
  if (!hasMinLength(name, 3)) {
    return { isValid: false, error: "Facility name must be at least 3 characters" };
  }
  if (!hasMaxLength(name, 100)) {
    return { isValid: false, error: "Facility name must not exceed 100 characters" };
  }
  return { isValid: true };
}

/**
 * Validate vehicle identifier
 * @param {string} id - Vehicle ID
 * @returns {object} {isValid, error}
 */
export function validateVehicleId(id) {
  if (!hasMinLength(id, 2)) {
    return { isValid: false, error: "Vehicle ID must be at least 2 characters" };
  }
  if (!hasMaxLength(id, 50)) {
    return { isValid: false, error: "Vehicle ID must not exceed 50 characters" };
  }
  return { isValid: true };
}

/**
 * Validate numeric capacity value
 * @param {number} capacity - Capacity
 * @returns {object} {isValid, error}
 */
export function validateCapacity(capacity) {
  const num = Number(capacity);
  if (isNaN(num) || num <= 0) {
    return { isValid: false, error: "Capacity must be a positive number" };
  }
  if (num > 1000000) {
    return { isValid: false, error: "Capacity exceeds maximum allowed value" };
  }
  return { isValid: true };
}

/**
 * Validate coordinates (latitude, longitude)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {object} {isValid, error}
 */
export function validateCoordinates(lat, lon) {
  if (!isValidLatitude(lat)) {
    return { isValid: false, error: "Invalid latitude (must be between -90 and 90)" };
  }
  if (!isValidLongitude(lon)) {
    return { isValid: false, error: "Invalid longitude (must be between -180 and 180)" };
  }
  return { isValid: true };
}

/**
 * Validate driver name
 * @param {string} name - Driver name
 * @returns {object} {isValid, error}
 */
export function validateDriverName(name) {
  if (!hasMinLength(name, 2)) {
    return { isValid: false, error: "Driver name must be at least 2 characters" };
  }
  if (!hasMaxLength(name, 100)) {
    return { isValid: false, error: "Driver name must not exceed 100 characters" };
  }
  // Basic check for valid name characters
  if (!/^[a-zA-Z\s'-]+$/i.test(name)) {
    return { isValid: false, error: "Driver name contains invalid characters" };
  }
  return { isValid: true };
}

/**
 * Validate years of experience
 * @param {number} years - Years of experience
 * @returns {object} {isValid, error}
 */
export function validateExperience(years) {
  const num = Number(years);
  if (isNaN(num) || num < 0) {
    return { isValid: false, error: "Experience must be 0 or greater" };
  }
  if (num > 60) {
    return { isValid: false, error: "Experience must be less than 60 years" };
  }
  return { isValid: true };
}

/**
 * Validate date is in future
 * @param {Date|string} date - Date to validate
 * @returns {object} {isValid, error}
 */
export function validateFutureDate(date) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return { isValid: false, error: "Invalid date format" };
  }
  if (d <= new Date()) {
    return { isValid: false, error: "Date must be in the future" };
  }
  return { isValid: true };
}

/**
 * Validate a form object against a schema
 * @param {object} form - Form object
 * @param {object} schema - Validation schema {fieldName: validatorFn}
 * @returns {object} {isValid, errors}
 */
export function validateForm(form, schema) {
  const errors = {};
  let isValid = true;

  for (const [field, validator] of Object.entries(schema)) {
    const result = validator(form[field]);
    if (!result.isValid) {
      errors[field] = result.error;
      isValid = false;
    }
  }

  return { isValid, errors };
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
  if (typeof input !== "string") return input;
  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Check if a value is within expected range
 * @param {number} value - Value to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if within range
 */
export function isInRange(value, min, max) {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * Check if a string matches a pattern
 * @param {string} str - String to check
 * @param {RegExp} pattern - Pattern to match
 * @returns {boolean} True if matches
 */
export function matchesPattern(str, pattern) {
  return pattern.test(String(str));
}
