/**
 * Change Tracking Service
 *
 * Core service for tracking changes to Place objects.
 * Provides utilities for:
 * - Creating change entries
 * - Diffing Place objects to detect changes
 * - Generating human-readable summaries
 * - Managing geometry versioning
 */

import {
  Place,
  PlaceChange,
  PatchOperation,
  ChangeKind,
  ChangeActor,
  PlaceAttributes,
  PlaceGeometry,
  MediaItem,
  PlaceRelation,
  HistoryEntry,
} from "../types";

/**
 * Generate a unique change ID
 */
export function generateChangeId(): string {
  return `chg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Generate a unique geometry ID
 */
export function generateGeometryId(): string {
  return `geom-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Ensure all geometries have IDs
 */
export function ensureGeometryIds(place: Place): Place {
  if (!place.geometries || place.geometries.length === 0) {
    return place;
  }

  return {
    ...place,
    geometries: place.geometries.map((geom) => ({
      ...geom,
      id: geom.id || generateGeometryId(),
    })),
  };
}

/**
 * Create a new PlaceChange entry
 */
export function createChange(params: {
  placeId: string;
  actor: ChangeActor;
  kind: ChangeKind;
  patch: PatchOperation[];
  summary?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}): PlaceChange {
  return {
    id: generateChangeId(),
    at: new Date().toISOString(),
    ...params,
  };
}

/**
 * Append a change to a Place's change history
 */
export function appendChange(place: Place, change: PlaceChange): Place {
  return {
    ...place,
    changeHistory: [...(place.changeHistory || []), change],
    modifiedAt: change.at,
  };
}

/**
 * Deep equality check for values
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Diff a nested attribute object (e.g., site or population)
 */
function diffNestedAttributes(
  oldNested: Record<string, any> | undefined,
  newNested: Record<string, any> | undefined,
  basePath: string
): PatchOperation[] {
  const patches: PatchOperation[] = [];
  const oldKeys = new Set(Object.keys(oldNested || {}));
  const newKeys = new Set(Object.keys(newNested || {}));

  // Removed nested attributes
  for (const key of oldKeys) {
    if (!newKeys.has(key)) {
      patches.push({
        op: "remove",
        path: `${basePath}/${key}`,
        from: (oldNested as any)[key],
      });
    }
  }

  // Added or changed nested attributes
  for (const key of newKeys) {
    const oldVal = oldNested?.[key];
    const newVal = (newNested as any)[key];

    if (!oldKeys.has(key)) {
      // Added
      patches.push({
        op: "add",
        path: `${basePath}/${key}`,
        value: newVal,
      });
    } else if (!deepEqual(oldVal, newVal)) {
      // Changed
      patches.push({
        op: "replace",
        path: `${basePath}/${key}`,
        from: oldVal,
        value: newVal,
      });
    }
  }

  return patches;
}

/**
 * Diff attributes to detect changes
 * Handles both top-level and nested (site, population) attributes
 */
function diffAttributes(
  oldAttrs: PlaceAttributes | undefined,
  newAttrs: PlaceAttributes | undefined
): PatchOperation[] {
  const patches: PatchOperation[] = [];

  // List of top-level built-in attributes to diff
  const builtinKeys = ["name", "notes", "areaHa", "color", "parentPlaceId"];

  // Diff builtin attributes at top level
  for (const key of builtinKeys) {
    const oldVal = oldAttrs?.[key];
    const newVal = newAttrs?.[key];

    if (oldVal === undefined && newVal === undefined) {
      continue; // Both undefined, no change
    }

    if (oldVal === undefined && newVal !== undefined) {
      // Added
      patches.push({
        op: "add",
        path: `/attributes/${key}`,
        value: newVal,
      });
    } else if (oldVal !== undefined && newVal === undefined) {
      // Removed
      patches.push({
        op: "remove",
        path: `/attributes/${key}`,
        from: oldVal,
      });
    } else if (!deepEqual(oldVal, newVal)) {
      // Changed
      patches.push({
        op: "replace",
        path: `/attributes/${key}`,
        from: oldVal,
        value: newVal,
      });
    }
  }

  // Diff nested site attributes
  if (oldAttrs?.site || newAttrs?.site) {
    const sitePatches = diffNestedAttributes(
      oldAttrs?.site,
      newAttrs?.site,
      "/attributes/site"
    );
    patches.push(...sitePatches);
  }

  // Diff nested population attributes
  if (oldAttrs?.population || newAttrs?.population) {
    // For now, treat population as a single value (array comparison)
    // TODO: More granular population diffing in future
    if (!deepEqual(oldAttrs?.population, newAttrs?.population)) {
      if (!oldAttrs?.population && newAttrs?.population) {
        patches.push({
          op: "add",
          path: "/attributes/population",
          value: newAttrs.population,
        });
      } else if (oldAttrs?.population && !newAttrs?.population) {
        patches.push({
          op: "remove",
          path: "/attributes/population",
          from: oldAttrs.population,
        });
      } else {
        patches.push({
          op: "replace",
          path: "/attributes/population",
          from: oldAttrs?.population,
          value: newAttrs?.population,
        });
      }
    }
  }

  return patches;
}

/**
 * Diff geometries (reference-based, not coordinate-level)
 */
function diffGeometries(
  oldGeoms: PlaceGeometry[] | undefined,
  newGeoms: PlaceGeometry[] | undefined
): PatchOperation[] {
  const patches: PatchOperation[] = [];

  // Check if primary geometry (index 0) changed
  const oldPrimary = oldGeoms?.[0];
  const newPrimary = newGeoms?.[0];

  if (!deepEqual(oldPrimary?.geometry, newPrimary?.geometry)) {
    // Geometry changed - record as replacement with ID references
    patches.push({
      op: "replace",
      path: "/geometries/0",
      from: oldPrimary?.id,
      value: newPrimary?.id,
    });
  }

  return patches;
}

/**
 * Diff media items
 */
function diffMedia(
  oldMedia: MediaItem[] | undefined,
  newMedia: MediaItem[] | undefined
): PatchOperation[] {
  const patches: PatchOperation[] = [];
  const oldIds = new Set((oldMedia || []).map((m) => m.id));
  const newIds = new Set((newMedia || []).map((m) => m.id));

  // Added media
  for (const media of newMedia || []) {
    if (!oldIds.has(media.id)) {
      patches.push({
        op: "add",
        path: `/media/-`,
        value: { id: media.id, type: media.type, uri: media.uri },
      });
    }
  }

  // Removed media
  for (const media of oldMedia || []) {
    if (!newIds.has(media.id)) {
      const index = (oldMedia || []).findIndex((m) => m.id === media.id);
      patches.push({
        op: "remove",
        path: `/media/${index}`,
        from: { id: media.id, type: media.type },
      });
    }
  }

  return patches;
}

/**
 * Diff userJournal entries (append-only)
 */
function diffUserJournal(
  oldJournal: HistoryEntry[] | undefined,
  newJournal: HistoryEntry[] | undefined
): PatchOperation[] {
  const patches: PatchOperation[] = [];
  const oldLength = (oldJournal || []).length;
  const newLength = (newJournal || []).length;

  // Only detect additions (userJournal is append-only)
  if (newLength > oldLength) {
    const newEntries = (newJournal || []).slice(oldLength);
    for (const entry of newEntries) {
      patches.push({
        op: "add",
        path: "/userJournal/-",
        value: {
          timestamp: entry.timestamp,
          title: entry.title,
          body: entry.body,
          mediaCount: entry.media?.length || 0,
        },
      });
    }
  }

  return patches;
}

/**
 * Diff relations
 */
function diffRelations(
  oldRelations: PlaceRelation[] | undefined,
  newRelations: PlaceRelation[] | undefined
): PatchOperation[] {
  const patches: PatchOperation[] = [];
  const oldIds = new Set((oldRelations || []).map((r) => r.targetPlaceId));
  const newIds = new Set((newRelations || []).map((r) => r.targetPlaceId));

  // Added relations
  for (const rel of newRelations || []) {
    if (!oldIds.has(rel.targetPlaceId)) {
      patches.push({
        op: "add",
        path: `/relations/-`,
        value: rel,
      });
    }
  }

  // Removed relations
  for (const rel of oldRelations || []) {
    if (!newIds.has(rel.targetPlaceId)) {
      const index = (oldRelations || []).findIndex(
        (r) => r.targetPlaceId === rel.targetPlaceId
      );
      patches.push({
        op: "remove",
        path: `/relations/${index}`,
        from: rel,
      });
    }
  }

  return patches;
}

/**
 * Diff two Place objects to generate patch operations
 */
export function diffPlaces(oldPlace: Place, newPlace: Place): PatchOperation[] {
  const patches: PatchOperation[] = [];

  // Compare attributes
  patches.push(...diffAttributes(oldPlace.attributes, newPlace.attributes));

  // Compare geometries (reference-based)
  patches.push(...diffGeometries(oldPlace.geometries, newPlace.geometries));

  // Compare media
  patches.push(...diffMedia(oldPlace.media, newPlace.media));

  // Compare visible flag
  if (oldPlace.visible !== newPlace.visible) {
    patches.push({
      op: "replace",
      path: "/visible",
      from: oldPlace.visible,
      value: newPlace.visible,
    });
  }

  // Compare relations
  patches.push(...diffRelations(oldPlace.relations, newPlace.relations));

  // Compare userJournal (append-only)
  patches.push(...diffUserJournal(oldPlace.userJournal, newPlace.userJournal));

  return patches;
}

/**
 * Infer change kind from patch operations
 */
export function inferChangeKind(patch: PatchOperation[]): ChangeKind {
  const paths = patch.map((p) => p.path);

  if (paths.some((p) => p.startsWith("/geometries")))
    return "geometry.replaced";
  if (paths.some((p) => p.startsWith("/media"))) {
    const hasAdd = patch.some(
      (p) => p.op === "add" && p.path.startsWith("/media")
    );
    return hasAdd ? "media.attached" : "media.removed";
  }
  if (paths.some((p) => p === "/visible")) return "visibility.toggled";
  if (paths.some((p) => p === "/attributes/name")) return "place.renamed";
  if (paths.some((p) => p.startsWith("/attributes")))
    return "attributes.updated";
  if (paths.some((p) => p.startsWith("/relations"))) {
    const hasAdd = patch.some((p) => p.op === "add");
    return hasAdd ? "relation.added" : "relation.removed";
  }
  if (paths.some((p) => p.startsWith("/userJournal")))
    return "journal.entryAdded";

  return "attributes.updated"; // Default fallback
}

/**
 * Generate human-readable summary from patch operations
 */
export function generateSummary(
  patch: PatchOperation[],
  kind: ChangeKind
): string {
  switch (kind) {
    case "place.created":
      return "Place created";

    case "place.renamed": {
      const namePatch = patch.find((p) => p.path === "/attributes/name");
      if (namePatch && namePatch.op === "replace") {
        return `Renamed from "${namePatch.from}" to "${namePatch.value}"`;
      }
      return "Place renamed";
    }

    case "attributes.updated": {
      const attrCount = patch.filter((p) =>
        p.path.startsWith("/attributes")
      ).length;
      return `Updated ${attrCount} attribute${attrCount > 1 ? "s" : ""}`;
    }

    case "geometry.replaced":
      return "Updated geometry";

    case "media.attached": {
      const addCount = patch.filter((p) => p.op === "add").length;
      return `Added ${addCount} media item${addCount > 1 ? "s" : ""}`;
    }

    case "media.removed": {
      const removeCount = patch.filter((p) => p.op === "remove").length;
      return `Removed ${removeCount} media item${removeCount > 1 ? "s" : ""}`;
    }

    case "visibility.toggled":
      return "Toggled visibility";

    case "journal.entryAdded": {
      const journalPatch = patch.find((p) => p.path === "/userJournal/-");
      if (journalPatch && journalPatch.op === "add") {
        const entry = journalPatch.value as any;
        return `Added journal entry: "${entry.title}"`;
      }
      return "Added journal entry";
    }

    case "source.imported":
      return "Imported from external source";

    case "source.reconciled":
      return "Reconciled with imported data";

    case "relation.added":
      return "Added relation";

    case "relation.removed":
      return "Removed relation";

    default:
      return "Place modified";
  }
}
