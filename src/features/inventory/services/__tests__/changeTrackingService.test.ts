/**
 * Tests for Change Tracking Service
 */

import {
  generateChangeId,
  generateGeometryId,
  createChange,
  appendChange,
  diffPlaces,
  inferChangeKind,
  generateSummary,
  ensureGeometryIds,
} from "../changeTrackingService";
import { Place, ChangeActor } from "../../types";

describe("changeTrackingService", () => {
  const mockActor: ChangeActor = { type: "user", id: "test-device" };

  describe("ID generation", () => {
    test("generateChangeId creates unique IDs", () => {
      const id1 = generateChangeId();
      const id2 = generateChangeId();
      expect(id1).toMatch(/^chg-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^chg-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test("generateGeometryId creates unique IDs", () => {
      const id1 = generateGeometryId();
      const id2 = generateGeometryId();
      expect(id1).toMatch(/^geom-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^geom-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("createChange", () => {
    test("creates change with all required fields", () => {
      const change = createChange({
        placeId: "place-1",
        actor: mockActor,
        kind: "attributes.updated",
        patch: [{ op: "replace", path: "/attributes/name", value: "New" }],
      });

      expect(change).toMatchObject({
        placeId: "place-1",
        actor: mockActor,
        kind: "attributes.updated",
      });
      expect(change.id).toMatch(/^chg-/);
      expect(change.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(change.patch).toHaveLength(1);
    });

    test("includes optional fields", () => {
      const change = createChange({
        placeId: "place-1",
        actor: mockActor,
        kind: "attributes.updated",
        patch: [],
        summary: "Test summary",
        reason: "Test reason",
        metadata: { key: "value" },
      });

      expect(change.summary).toBe("Test summary");
      expect(change.reason).toBe("Test reason");
      expect(change.metadata).toEqual({ key: "value" });
    });
  });

  describe("appendChange", () => {
    test("appends change to empty history", () => {
      const place: Place = {
        id: "place-1",
        placeType: "Place_Point",
      };

      const change = createChange({
        placeId: "place-1",
        actor: mockActor,
        kind: "place.created",
        patch: [],
      });

      const result = appendChange(place, change);

      expect(result.changeHistory).toHaveLength(1);
      expect(result.changeHistory![0]).toBe(change);
      expect(result.modifiedAt).toBe(change.at);
    });

    test("appends to existing history", () => {
      const existingChange = createChange({
        placeId: "place-1",
        actor: mockActor,
        kind: "place.created",
        patch: [],
      });

      const place: Place = {
        id: "place-1",
        placeType: "Place_Point",
        changeHistory: [existingChange],
      };

      const newChange = createChange({
        placeId: "place-1",
        actor: mockActor,
        kind: "attributes.updated",
        patch: [],
      });

      const result = appendChange(place, newChange);

      expect(result.changeHistory).toHaveLength(2);
      expect(result.changeHistory![0]).toBe(existingChange);
      expect(result.changeHistory![1]).toBe(newChange);
    });
  });

  describe("ensureGeometryIds", () => {
    test("adds IDs to geometries without IDs", () => {
      const place: Place = {
        id: "place-1",
        placeType: "Place_Point",
        geometries: [
          {
            geometry: { type: "Point", coordinates: [0, 0] },
            crs: "EPSG:4326",
          },
        ],
      };

      const result = ensureGeometryIds(place);

      expect(result.geometries![0].id).toBeDefined();
      expect(result.geometries![0].id).toMatch(/^geom-/);
    });

    test("preserves existing geometry IDs", () => {
      const place: Place = {
        id: "place-1",
        placeType: "Place_Point",
        geometries: [
          {
            id: "existing-id",
            geometry: { type: "Point", coordinates: [0, 0] },
            crs: "EPSG:4326",
          },
        ],
      };

      const result = ensureGeometryIds(place);

      expect(result.geometries![0].id).toBe("existing-id");
    });
  });

  describe("diffPlaces", () => {
    test("detects no changes for identical places", () => {
      const place: Place = {
        id: "place-1",
        placeType: "Place_Point",
        attributes: { name: "Test", notes: "Notes" },
      };

      const patches = diffPlaces(place, place);
      expect(patches).toHaveLength(0);
    });

    test("detects attribute addition", () => {
      const oldPlace: Place = {
        id: "place-1",
        placeType: "Place_Point",
        attributes: { name: "Test" },
      };

      const newPlace: Place = {
        ...oldPlace,
        attributes: { name: "Test", notes: "New notes" },
      };

      const patches = diffPlaces(oldPlace, newPlace);

      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        op: "add",
        path: "/attributes/notes",
      });
      expect((patches[0] as any).value).toBe("New notes");
    });

    test("detects attribute removal", () => {
      const oldPlace: Place = {
        id: "place-1",
        placeType: "Place_Point",
        attributes: { name: "Test", notes: "Notes" },
      };

      const newPlace: Place = {
        ...oldPlace,
        attributes: { name: "Test" },
      };

      const patches = diffPlaces(oldPlace, newPlace);

      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        op: "remove",
        path: "/attributes/notes",
      });
      expect((patches[0] as any).from).toBe("Notes");
    });

    test("detects attribute replacement", () => {
      const oldPlace: Place = {
        id: "place-1",
        placeType: "Place_Point",
        attributes: { name: "Old Name" },
      };

      const newPlace: Place = {
        ...oldPlace,
        attributes: { name: "New Name" },
      };

      const patches = diffPlaces(oldPlace, newPlace);

      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        op: "replace",
        path: "/attributes/name",
      });
      expect((patches[0] as any).from).toBe("Old Name");
      expect((patches[0] as any).value).toBe("New Name");
    });

    test("detects nested site attribute changes", () => {
      const oldPlace: Place = {
        id: "place-1",
        placeType: "Place_Area",
        attributes: {
          name: "Test",
          site: {
            ManagementClass: { code: "PG", label: "Old" },
          },
        },
      };

      const newPlace: Place = {
        ...oldPlace,
        attributes: {
          name: "Test",
          site: {
            ManagementClass: { code: "NS", label: "New" },
          },
        },
      };

      const patches = diffPlaces(oldPlace, newPlace);

      expect(patches).toHaveLength(1);
      expect(patches[0].op).toBe("replace");
      expect(patches[0].path).toBe("/attributes/site/ManagementClass");
      const replacePatch = patches[0] as any;
      expect(replacePatch.from).toEqual({ code: "PG", label: "Old" });
      expect(replacePatch.value).toEqual({ code: "NS", label: "New" });
    });

    test("detects geometry changes", () => {
      const oldPlace: Place = {
        id: "place-1",
        placeType: "Place_Point",
        geometries: [
          {
            id: "geom-1",
            geometry: { type: "Point", coordinates: [0, 0] },
          },
        ],
      };

      const newPlace: Place = {
        ...oldPlace,
        geometries: [
          {
            id: "geom-2",
            geometry: { type: "Point", coordinates: [1, 1] },
          },
        ],
      };

      const patches = diffPlaces(oldPlace, newPlace);

      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        op: "replace",
        path: "/geometries/0",
      });
      expect((patches[0] as any).from).toBe("geom-1");
      expect((patches[0] as any).value).toBe("geom-2");
    });

    test("detects media addition", () => {
      const oldPlace: Place = {
        id: "place-1",
        placeType: "Place_Point",
        media: [],
      };

      const newPlace: Place = {
        ...oldPlace,
        media: [
          {
            id: "media-1",
            type: "photo",
            uri: "file://photo.jpg",
            createdAt: "2026-03-09T10:00:00Z",
          },
        ],
      };

      const patches = diffPlaces(oldPlace, newPlace);

      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        op: "add",
        path: "/media/-",
      });
      expect((patches[0] as any).value).toMatchObject({
        id: "media-1",
        type: "photo",
      });
    });

    test("detects media removal", () => {
      const oldPlace: Place = {
        id: "place-1",
        placeType: "Place_Point",
        media: [
          {
            id: "media-1",
            type: "photo",
            uri: "file://photo.jpg",
            createdAt: "2026-03-09T10:00:00Z",
          },
        ],
      };

      const newPlace: Place = {
        ...oldPlace,
        media: [],
      };

      const patches = diffPlaces(oldPlace, newPlace);

      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        op: "remove",
        path: "/media/0",
      });
    });

    test("detects visibility toggle", () => {
      const oldPlace: Place = {
        id: "place-1",
        placeType: "Place_Point",
        visible: true,
      };

      const newPlace: Place = {
        ...oldPlace,
        visible: false,
      };

      const patches = diffPlaces(oldPlace, newPlace);

      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        op: "replace",
        path: "/visible",
        from: true,
        value: false,
      });
    });

    test("detects userJournal addition", () => {
      const oldPlace: Place = {
        id: "place-1",
        placeType: "Place_Point",
        userJournal: [],
      };

      const newPlace: Place = {
        ...oldPlace,
        userJournal: [
          {
            timestamp: "2026-03-09T10:00:00Z",
            title: "Journal Entry",
            body: "Details",
            media: [],
          },
        ],
      };

      const patches = diffPlaces(oldPlace, newPlace);

      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        op: "add",
        path: "/userJournal/-",
      });
    });

    test("detects multiple changes at once", () => {
      const oldPlace: Place = {
        id: "place-1",
        placeType: "Place_Point",
        attributes: { name: "Old" },
        visible: true,
      };

      const newPlace: Place = {
        ...oldPlace,
        attributes: { name: "New", notes: "Added notes" },
        visible: false,
      };

      const patches = diffPlaces(oldPlace, newPlace);

      expect(patches.length).toBeGreaterThanOrEqual(3);
      expect(patches.some((p) => p.path === "/attributes/name")).toBe(true);
      expect(patches.some((p) => p.path === "/attributes/notes")).toBe(true);
      expect(patches.some((p) => p.path === "/visible")).toBe(true);
    });
  });

  describe("inferChangeKind", () => {
    test("infers place.renamed from name change", () => {
      const patches = [
        {
          op: "replace" as const,
          path: "/attributes/name",
          from: "Old",
          value: "New",
        },
      ];
      expect(inferChangeKind(patches)).toBe("place.renamed");
    });

    test("infers attributes.updated from attribute change", () => {
      const patches = [
        {
          op: "replace" as const,
          path: "/attributes/notes",
          from: "Old",
          value: "New",
        },
      ];
      expect(inferChangeKind(patches)).toBe("attributes.updated");
    });

    test("infers geometry.replaced from geometry change", () => {
      const patches = [
        {
          op: "replace" as const,
          path: "/geometries/0",
          from: "geom-1",
          value: "geom-2",
        },
      ];
      expect(inferChangeKind(patches)).toBe("geometry.replaced");
    });

    test("infers media.attached from media addition", () => {
      const patches = [
        {
          op: "add" as const,
          path: "/media/-",
          value: { id: "media-1", type: "photo" },
        },
      ];
      expect(inferChangeKind(patches)).toBe("media.attached");
    });

    test("infers media.removed from media removal", () => {
      const patches = [
        {
          op: "remove" as const,
          path: "/media/0",
          from: { id: "media-1" },
        },
      ];
      expect(inferChangeKind(patches)).toBe("media.removed");
    });

    test("infers visibility.toggled from visible change", () => {
      const patches = [
        {
          op: "replace" as const,
          path: "/visible",
          from: true,
          value: false,
        },
      ];
      expect(inferChangeKind(patches)).toBe("visibility.toggled");
    });

    test("infers journal.entryAdded from userJournal addition", () => {
      const patches = [
        {
          op: "add" as const,
          path: "/userJournal/-",
          value: { title: "Entry" },
        },
      ];
      expect(inferChangeKind(patches)).toBe("journal.entryAdded");
    });
  });

  describe("generateSummary", () => {
    test("generates summary for place.created", () => {
      const summary = generateSummary([], "place.created");
      expect(summary).toBe("Place created");
    });

    test("generates summary for place.renamed with details", () => {
      const patches = [
        {
          op: "replace" as const,
          path: "/attributes/name",
          from: "Old Name",
          value: "New Name",
        },
      ];
      const summary = generateSummary(patches, "place.renamed");
      expect(summary).toBe('Renamed from "Old Name" to "New Name"');
    });

    test("generates summary for attributes.updated with count", () => {
      const patches = [
        {
          op: "replace" as const,
          path: "/attributes/name",
          from: "Old",
          value: "New",
        },
        {
          op: "replace" as const,
          path: "/attributes/notes",
          from: "Old",
          value: "New",
        },
      ];
      const summary = generateSummary(patches, "attributes.updated");
      expect(summary).toBe("Updated 2 attributes");
    });

    test("generates summary for single attribute update", () => {
      const patches = [
        {
          op: "replace" as const,
          path: "/attributes/notes",
          from: "Old",
          value: "New",
        },
      ];
      const summary = generateSummary(patches, "attributes.updated");
      expect(summary).toBe("Updated 1 attribute");
    });

    test("generates summary for media.attached with count", () => {
      const patches = [
        { op: "add" as const, path: "/media/-", value: {} },
        { op: "add" as const, path: "/media/-", value: {} },
      ];
      const summary = generateSummary(patches, "media.attached");
      expect(summary).toBe("Added 2 media items");
    });

    test("generates summary for journal.entryAdded with title", () => {
      const patches = [
        {
          op: "add" as const,
          path: "/userJournal/-",
          value: { title: "My Entry" },
        },
      ];
      const summary = generateSummary(patches, "journal.entryAdded");
      expect(summary).toBe('Added journal entry: "My Entry"');
    });
  });

  describe("ensureGeometryIds", () => {
    test("handles place without geometries", () => {
      const place: Place = {
        id: "place-1",
        placeType: "Place_Point",
      };

      const result = ensureGeometryIds(place);
      expect(result).toEqual(place);
    });

    test("handles empty geometries array", () => {
      const place: Place = {
        id: "place-1",
        placeType: "Place_Point",
        geometries: [],
      };

      const result = ensureGeometryIds(place);
      expect(result.geometries).toEqual([]);
    });
  });
});
