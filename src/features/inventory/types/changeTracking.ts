/**
 * Change Tracking Types
 *
 * Defines the structure for Place change tracking and audit trail.
 * These types support an append-only audit log with JSON Patch style operations.
 */

/**
 * Actor who made the change
 */
export type ChangeActor = {
  type: "user" | "system" | "import";
  id?: string; // Device UUID for user, source identifier for import
};

/**
 * JSON Patch inspired operation
 * Includes optional 'from' field for storing previous values
 */
export type PatchOperation =
  | { op: "add"; path: string; value: unknown }
  | { op: "remove"; path: string; from?: unknown }
  | { op: "replace"; path: string; from?: unknown; value: unknown }
  | { op: "move"; path: string; from: string }
  | { op: "copy"; path: string; from: string }
  | { op: "test"; path: string; value: unknown };

/**
 * High-level change classification
 */
export type ChangeKind =
  | "place.created"
  | "place.deleted"
  | "place.renamed"
  | "attributes.updated"
  | "geometry.added"
  | "geometry.replaced"
  | "geometry.deleted"
  | "relation.added"
  | "relation.removed"
  | "media.attached"
  | "media.removed"
  | "visibility.toggled"
  | "journal.entryAdded"
  | "source.imported"
  | "source.reconciled";

/**
 * A single change event in the Place audit trail
 */
export interface PlaceChange {
  id: string; // Unique change identifier
  placeId: string; // ID of the affected Place
  at: string; // ISO 8601 timestamp
  actor: ChangeActor; // Who made the change
  kind: ChangeKind; // High-level change type
  patch: PatchOperation[]; // Detailed operations
  summary?: string; // Human-readable summary for UI
  reason?: string; // Optional user-provided reason
  metadata?: Record<string, unknown>; // Additional context
}
