/**
 * Tests for Forestand Mapping Service
 */

import {
  getForestandFieldMapping,
  mapForestandFieldName,
  transformForestandCode,
  hasCodeTransformations,
  getValidForestandCodes,
  validateForestandCode,
  getMappedForestandFields,
} from "../forestandMappingService";

describe("forestandMappingService", () => {
  describe("getForestandFieldMapping", () => {
    test("returns mapping config for valid field", () => {
      const mapping = getForestandFieldMapping("ObsS_MaturityClass");
      expect(mapping).toBeTruthy();
      expect(mapping?.mapping).toBe("MaturityClass");
      expect(mapping?.codeTransformations).toBeTruthy();
    });

    test("returns null for unmapped field", () => {
      const mapping = getForestandFieldMapping("ObsS_Unknown");
      expect(mapping).toBeNull();
    });
  });

  describe("mapForestandFieldName", () => {
    test("maps Forestand field to internal attribute", () => {
      expect(mapForestandFieldName("ObsS_MaturityClass")).toBe("MaturityClass");
      expect(mapForestandFieldName("ObsS_ManagementClass")).toBe(
        "ManagementClass"
      );
      expect(mapForestandFieldName("ObsS_SoilMoisture")).toBe("SoilMoisture");
    });

    test("returns null for unmapped field", () => {
      expect(mapForestandFieldName("ObsS_SIS")).toBeNull();
      expect(mapForestandFieldName("ObsS_Unknown")).toBeNull();
    });
  });

  describe("transformForestandCode", () => {
    test("passthrough when Forestand code = Internal code", () => {
      expect(transformForestandCode("ObsS_MaturityClass", "K1")).toBe("K1");
      expect(transformForestandCode("ObsS_MaturityClass", "S1")).toBe("S1");
      expect(transformForestandCode("ObsS_SoilMoisture", "E3")).toBe("E3");
    });

    test("transforms species codes correctly", () => {
      expect(transformForestandCode("ObsS_Species", "1")).toBe("T");
      expect(transformForestandCode("ObsS_Species", "2")).toBe("G");
      expect(transformForestandCode("ObsS_Species", "3")).toBe("B");
      expect(transformForestandCode("ObsS_Species", "10")).toBe("C");
      expect(transformForestandCode("ObsS_Species", "20")).toBe("E");
      expect(transformForestandCode("ObsS_Species", "21")).toBe("F");
    });

    test("passthrough for unknown codes with warning", () => {
      // Mock console.warn to verify warning is logged
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = transformForestandCode("ObsS_Species", "999");
      expect(result).toBe("999");
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Code 999 not in transformation map")
      );

      warnSpy.mockRestore();
    });

    test("passthrough for unmapped field with warning", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = transformForestandCode("UnknownField", "ABC");
      expect(result).toBe("ABC");
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe("hasCodeTransformations", () => {
    test("returns true for fields with transformations", () => {
      expect(hasCodeTransformations("ObsS_MaturityClass")).toBe(true);
      expect(hasCodeTransformations("ObsS_Species")).toBe(true);
    });

    test("returns false for unmapped fields", () => {
      expect(hasCodeTransformations("ObsS_Unknown")).toBe(false);
    });
  });

  describe("getValidForestandCodes", () => {
    test("returns all codes for MaturityClass", () => {
      const codes = getValidForestandCodes("ObsS_MaturityClass");
      expect(codes).toContain("K1");
      expect(codes).toContain("K2");
      expect(codes).toContain("S1");
      expect(codes.length).toBe(12);
    });

    test("returns species codes", () => {
      const codes = getValidForestandCodes("ObsS_Species");
      expect(codes).toContain("1");
      expect(codes).toContain("2");
      expect(codes).toContain("3");
      expect(codes.length).toBe(6);
    });

    test("returns empty array for unmapped field", () => {
      const codes = getValidForestandCodes("ObsS_Unknown");
      expect(codes).toEqual([]);
    });
  });

  describe("validateForestandCode", () => {
    test("validates known codes", () => {
      expect(validateForestandCode("ObsS_MaturityClass", "K1")).toBe(true);
      expect(validateForestandCode("ObsS_Species", "1")).toBe(true);
    });

    test("rejects unknown codes", () => {
      expect(validateForestandCode("ObsS_MaturityClass", "INVALID")).toBe(
        false
      );
      expect(validateForestandCode("ObsS_Species", "999")).toBe(false);
    });

    test("accepts any code for unmapped fields", () => {
      expect(validateForestandCode("ObsS_Unknown", "ANY")).toBe(true);
    });
  });

  describe("getMappedForestandFields", () => {
    test("returns all mapped field names", () => {
      const fields = getMappedForestandFields();
      expect(fields).toContain("ObsS_MaturityClass");
      expect(fields).toContain("ObsS_ManagementClass");
      expect(fields).toContain("ObsS_Species");
      expect(fields.length).toBeGreaterThan(20);
    });
  });
});
