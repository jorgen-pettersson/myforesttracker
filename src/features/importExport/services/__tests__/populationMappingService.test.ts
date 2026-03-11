/**
 * Tests for Population Mapping Service
 */

import {
  mapPopulationObservation,
  shouldMapObservation,
  getMappedObservations,
  getInternalPopulationAttributes,
} from "../populationMappingService";

describe("populationMappingService", () => {
  describe("mapPopulationObservation", () => {
    test("maps ObsP observations to internal names", () => {
      expect(mapPopulationObservation("ObsP_AreaWeightedAge")).toBe(
        "areaWeightedAge"
      );
      expect(mapPopulationObservation("ObsP_MeanHeight")).toBe("meanHeight");
      expect(mapPopulationObservation("ObsP_WeightedDiameter")).toBe(
        "weightedDiameter"
      );
      expect(mapPopulationObservation("ObsP_StandBasalArea")).toBe(
        "standBasalArea"
      );
      expect(mapPopulationObservation("ObsP_AreaStandVolume")).toBe(
        "areaStandVolume"
      );
      expect(mapPopulationObservation("ObsP_AreaStemNumber")).toBe(
        "areaStemNumber"
      );
    });

    test("returns null for unmapped observations", () => {
      expect(mapPopulationObservation("ObsP_Unknown")).toBeNull();
      expect(mapPopulationObservation("ObsS_MaturityClass")).toBeNull();
    });
  });

  describe("shouldMapObservation", () => {
    test("returns true for mapped observations", () => {
      expect(shouldMapObservation("ObsP_MeanHeight")).toBe(true);
      expect(shouldMapObservation("ObsP_AreaWeightedAge")).toBe(true);
    });

    test("returns false for unmapped observations", () => {
      expect(shouldMapObservation("ObsP_Unknown")).toBe(false);
      expect(shouldMapObservation("ObsS_MaturityClass")).toBe(false);
    });
  });

  describe("getMappedObservations", () => {
    test("returns all Forestand observation names", () => {
      const observations = getMappedObservations();
      expect(observations).toContain("ObsP_AreaWeightedAge");
      expect(observations).toContain("ObsP_MeanHeight");
      expect(observations).toContain("ObsP_WeightedDiameter");
      expect(observations.length).toBe(7);
    });
  });

  describe("getInternalPopulationAttributes", () => {
    test("returns all internal attribute names", () => {
      const attributes = getInternalPopulationAttributes();
      expect(attributes).toContain("areaWeightedAge");
      expect(attributes).toContain("meanHeight");
      expect(attributes).toContain("weightedDiameter");
      expect(attributes.length).toBe(7);
    });
  });
});
