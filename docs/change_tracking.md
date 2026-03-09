Audit trail / change tracking design

Purpose
Track machine-readable changes to a Place over time, separately from user-authored userjournal entries.

Important separation
- userjournal are user content: title, description, media, optional tags.
- Audit trail is system change tracking: what changed, when, by whom.

Decision
Use an append-only audit log with JSON Patch style operations for attribute and structure changes.

Core model

PlaceChange
- id: unique change id
- placeId: id of the affected Place
- at: timestamp for when the change happened
- actor: who made the change
- kind: high-level change type
- patch: array of patch operations
- summary: optional short human-readable description for UI/logging
- reason: optional free-text reason supplied by user/system
- metadata: optional extra info for technical/debug/import purposes

Suggested JSON shape

{
  "id": "chg-0001",
  "placeId": "place-42",
  "at": "2026-03-09T10:15:00+01:00",
  "actor": {
    "type": "user",
    "id": "u-123"
  },
  "kind": "attributes.updated",
  "summary": "Updated place name",
  "patch": [
    {
      "op": "replace",
      "path": "/attributes/name",
      "from": "Old name",
      "value": "New name"
    }
  ],
  "reason": "Corrected label",
  "metadata": {
    "source": "app"
  }
}

Patch format
Use JSON Patch inspired operations:
- add
- remove
- replace
- move
- copy
- test (optional, mainly for validation/concurrency)

Recommended operation shape
- op: operation name
- path: JSON pointer path to target field
- value: new value for add/replace
- from: previous value for replace/remove, and/or source path for move/copy

Recommended convention
- For replace/remove, store previous value in "from" even though standard JSON Patch does not require it.
- This makes audit history easier to inspect and enables simpler rollback support later.

Examples

1. Rename place

{
  "id": "chg-0002",
  "placeId": "place-42",
  "at": "2026-03-09T10:20:00+01:00",
  "actor": { "type": "user", "id": "u-123" },
  "kind": "place.renamed",
  "summary": "Renamed place",
  "patch": [
    {
      "op": "replace",
      "path": "/attributes/name",
      "from": "Avd 42",
      "value": "Avdelning 42"
    }
  ]
}

2. Update nested attribute

{
  "id": "chg-0003",
  "placeId": "place-42",
  "at": "2026-03-09T10:25:00+01:00",
  "actor": { "type": "user", "id": "u-123" },
  "kind": "attributes.updated",
  "summary": "Updated soil moisture",
  "patch": [
    {
      "op": "replace",
      "path": "/attributes/site/soilMoisture",
      "from": { "code": "VT_03", "label": "Fuktig mark" },
      "value": { "code": "VT_02", "label": "Frisk mark" }
    }
  ]
}

3. Add media directly to place

{
  "id": "chg-0004",
  "placeId": "place-42",
  "at": "2026-03-09T10:30:00+01:00",
  "actor": { "type": "user", "id": "u-123" },
  "kind": "media.attached",
  "summary": "Attached photo",
  "patch": [
    {
      "op": "add",
      "path": "/media/-",
      "value": {
        "id": "m-1",
        "type": "photo",
        "uri": "file://photo1.jpg"
      }
    }
  ]
}

4. Geometry replacement
For geometry edits, treat geometry as snapshot/version replacement rather than trying to diff coordinates.

{
  "id": "chg-0005",
  "placeId": "place-42",
  "at": "2026-03-09T10:35:00+01:00",
  "actor": { "type": "user", "id": "u-123" },
  "kind": "geometry.replaced",
  "summary": "Adjusted area boundary",
  "patch": [
    {
      "op": "replace",
      "path": "/geometryRef",
      "from": "geom-1",
      "value": "geom-2"
    }
  ],
  "metadata": {
    "fromGeometryId": "geom-1",
    "toGeometryId": "geom-2"
  }
}

Important geometry rule
Do not try to store coordinate-level patch diffs for polygon edits in the audit trail.
Instead:
- create a new geometry snapshot/version
- update the active geometry reference
- log that reference change in the audit trail

Recommended kind values
Use stable internal kinds, not source-system-specific ones.

- place.created
- place.deleted
- place.renamed
- attributes.updated
- geometry.added
- geometry.replaced
- geometry.deleted
- relation.added
- relation.removed
- media.attached
- media.removed
- source.imported
- source.reconciled

Design rules
- Audit trail is append-only.
- Never mutate old PlaceChange entries.
- Store audit trail separately from userjournal entries.
- Keep audit entries machine-readable first, human-readable second.
- Use internal field paths only; do not leak Forestand-specific paths into audit model.
- Keep "kind" coarse-grained and use "patch" for exact detail.

UI recommendation
- Show userjournal as the default timeline.
- Show audit trail in a separate "Changes" view or optional toggle.
- Use "summary" for compact UI display.
- Use patch data for detailed inspection/debugging.

Minimum implementation
At minimum, implement:
- id
- placeId
- at
- actor
- kind
- patch

Recommended TypeScript shape

type ChangeActor = {
  type: "user" | "system" | "import";
  id?: string;
};

type PatchOperation =
  | { op: "add"; path: string; value: unknown }
  | { op: "remove"; path: string; from?: unknown }
  | { op: "replace"; path: string; from?: unknown; value: unknown }
  | { op: "move"; path: string; from: string }
  | { op: "copy"; path: string; from: string }
  | { op: "test"; path: string; value: unknown };

type PlaceChange = {
  id: string;
  placeId: string;
  at: string;
  actor: ChangeActor;
  kind:
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
    | "source.imported"
    | "source.reconciled";
  patch: PatchOperation[];
  summary?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

Non-goals for now
- Full event sourcing
- Automatic rollback engine
- Coordinate-level geometry diffs
- Forestand-specific audit event model

Result
This gives a clean, source-independent internal audit trail that:
- tracks changes to place attributes and structure
- works well with geometry snapshots
- remains export/import adapter friendly
- is separated from user userjournal history