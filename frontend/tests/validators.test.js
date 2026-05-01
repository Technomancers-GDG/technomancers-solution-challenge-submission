import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  isValidPhone,
  isValidLatitude,
  isValidLongitude,
  isNotEmpty,
  validateFacilityName,
  validateVehicleId,
  validateCapacity,
  validateCoordinates,
} from "../src/utils/validators";

describe("Validators", () => {
  describe("isValidEmail", () => {
    it("should validate email formats", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user+tag@domain.co.uk")).toBe(true);
      expect(isValidEmail("invalid.email")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
    });
  });

  describe("isValidPhone", () => {
    it("should validate Indian phone numbers", () => {
      expect(isValidPhone("+919876543210")).toBe(true);
      expect(isValidPhone("09876543210")).toBe(true);
      expect(isValidPhone("9876543210")).toBe(true);
      expect(isValidPhone("1234567890")).toBe(false);
      expect(isValidPhone("98765432")).toBe(false);
    });
  });

  describe("isValidLatitude", () => {
    it("should validate latitude values", () => {
      expect(isValidLatitude(28.6139)).toBe(true);
      expect(isValidLatitude(-34.0522)).toBe(true);
      expect(isValidLatitude(90)).toBe(true);
      expect(isValidLatitude(91)).toBe(false);
      expect(isValidLatitude(-91)).toBe(false);
    });
  });

  describe("isValidLongitude", () => {
    it("should validate longitude values", () => {
      expect(isValidLongitude(77.2090)).toBe(true);
      expect(isValidLongitude(-118.2437)).toBe(true);
      expect(isValidLongitude(180)).toBe(true);
      expect(isValidLongitude(181)).toBe(false);
      expect(isValidLongitude(-181)).toBe(false);
    });
  });

  describe("isNotEmpty", () => {
    it("should check for empty values", () => {
      expect(isNotEmpty("text")).toBe(true);
      expect(isNotEmpty(0)).toBe(true);
      expect(isNotEmpty(null)).toBe(false);
      expect(isNotEmpty(undefined)).toBe(false);
      expect(isNotEmpty("")).toBe(false);
    });
  });

  describe("validateFacilityName", () => {
    it("should validate facility names", () => {
      const validResult = validateFacilityName("Central Warehouse");
      expect(validResult.isValid).toBe(true);

      const tooShortResult = validateFacilityName("AB");
      expect(tooShortResult.isValid).toBe(false);
      expect(tooShortResult.error).toContain("at least 3 characters");
    });
  });

  describe("validateCapacity", () => {
    it("should validate capacity values", () => {
      expect(validateCapacity(1000).isValid).toBe(true);
      expect(validateCapacity(0).isValid).toBe(false);
      expect(validateCapacity(-100).isValid).toBe(false);
      expect(validateCapacity("abc").isValid).toBe(false);
    });
  });

  describe("validateCoordinates", () => {
    it("should validate latitude and longitude together", () => {
      const validResult = validateCoordinates(28.6139, 77.2090);
      expect(validResult.isValid).toBe(true);

      const invalidLatResult = validateCoordinates(91, 77.2090);
      expect(invalidLatResult.isValid).toBe(false);

      const invalidLonResult = validateCoordinates(28.6139, 181);
      expect(invalidLonResult.isValid).toBe(false);
    });
  });
});
