import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  formatPercent,
  formatNumber,
  formatDate,
  formatDuration,
  formatDistance,
  formatRelativeTime,
} from "../src/utils/formatters";

describe("Formatters", () => {
  describe("formatPercent", () => {
    it("should format numbers as percentages", () => {
      expect(formatPercent(85.5, 1)).toBe("85.5%");
      expect(formatPercent(100, 0)).toBe("100%");
      expect(formatPercent(0, 1)).toBe("0.0%");
    });

    it("should handle null values", () => {
      expect(formatPercent(null)).toBe("N/A");
      expect(formatPercent(undefined)).toBe("N/A");
    });
  });

  describe("formatNumber", () => {
    it("should format numbers with thousand separators", () => {
      expect(formatNumber(1234567)).toBe("12,34,567");
      expect(formatNumber(1000.5, 1)).toBe("1,000.5");
    });

    it("should handle null values", () => {
      expect(formatNumber(null)).toBe("N/A");
    });
  });

  describe("formatDate", () => {
    it("should format dates correctly", () => {
      const date = new Date("2026-04-23");
      const formatted = formatDate(date);
      expect(formatted).toContain("23");
      expect(formatted).toContain("2026");
    });

    it("should handle invalid dates", () => {
      expect(formatDate(null)).toBe("N/A");
      expect(formatDate("invalid")).toBe("N/A");
    });
  });

  describe("formatDuration", () => {
    it("should format durations correctly", () => {
      expect(formatDuration(3661)).toBe("1h 1m");
      expect(formatDuration(120)).toBe("2m 0s");
      expect(formatDuration(45)).toBe("45s");
    });

    it("should handle edge cases", () => {
      expect(formatDuration(0)).toBe("0s");
      expect(formatDuration(null)).toBe("0s");
    });
  });

  describe("formatDistance", () => {
    it("should format distances correctly", () => {
      expect(formatDistance(125.5)).toBe("125.5 km");
      expect(formatDistance(0.5)).toBe("500 m");
    });

    it("should handle null values", () => {
      expect(formatDistance(null)).toBe("N/A");
    });
  });

  describe("formatRelativeTime", () => {
    it("should show 'just now' for recent times", () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe("just now");
    });

    it("should handle null values", () => {
      expect(formatRelativeTime(null)).toBe("N/A");
    });
  });
});
