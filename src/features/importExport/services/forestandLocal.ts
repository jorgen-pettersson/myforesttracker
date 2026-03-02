import "react-native-get-random-values";
import proj4 from "proj4";
import { XMLParser } from "fast-xml-parser";
import { v4 as uuidv4 } from "uuid";

const EPSG_4326 = "EPSG:4326";
const DEFAULT_SOURCE_CRS = "EPSG:3006";

const SWEREF99_TM =
  "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";

proj4.defs("EPSG:3006", SWEREF99_TM);

type XmlNode = Record<string, any> | string | number | null | undefined;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
});

const ensureArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const getText = (node: XmlNode): string | null => {
  if (node === null || node === undefined) {
    return null;
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (typeof node === "object" && "#text" in node) {
    const text = (node as any)["#text"];
    return text != null ? String(text) : null;
  }
  return null;
};

const getAttr = (node: any, name: string): string | null => {
  if (!node || typeof node !== "object") {
    return null;
  }
  const direct = node[`@_${name}`];
  if (direct != null) {
    return String(direct);
  }
  const legacy = node[`@_${name.replace(/^[^:]+:/, "")}`];
  if (legacy != null) {
    return String(legacy);
  }
  return null;
};

const findAllByName = (node: XmlNode, name: string): any[] => {
  const results: any[] = [];
  if (!node || typeof node !== "object") {
    return results;
  }
  const obj = node as Record<string, any>;
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (key === name) {
      results.push(...ensureArray(value));
    } else if (typeof value === "object") {
      for (const child of ensureArray(value)) {
        results.push(...findAllByName(child, name));
      }
    }
  }
  return results;
};

const getDirectChildren = (node: any, name: string): any[] => {
  if (!node || typeof node !== "object") {
    return [];
  }
  const value = (node as Record<string, any>)[name];
  return ensureArray(value);
};

const getPathNodes = (node: any, path: string[]): any[] => {
  let current: any[] = [node];
  for (const segment of path) {
    const next: any[] = [];
    for (const item of current) {
      next.push(...getDirectChildren(item, segment));
    }
    if (next.length === 0) {
      return [];
    }
    current = next;
  }
  return current;
};

const normalizeSrsName = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const match = value.match(/EPSG(?::|::)?(\d+)/i);
  if (match) {
    return `EPSG:${match[1]}`;
  }
  return value;
};

const extractSourceCrs = (doc: any): string => {
  const envelopes = findAllByName(doc, "Envelope");
  if (envelopes.length > 0) {
    const srsName = getAttr(envelopes[0], "srsName");
    const normalized = normalizeSrsName(srsName);
    if (normalized) {
      return normalized;
    }
  }

  const multiSurfaces = findAllByName(doc, "MultiSurface");
  if (multiSurfaces.length > 0) {
    const srsName = getAttr(multiSurfaces[0], "srsName");
    const normalized = normalizeSrsName(srsName);
    if (normalized) {
      return normalized;
    }
  }

  return DEFAULT_SOURCE_CRS;
};

const createTransform = (sourceCrs: string) => {
  if (!sourceCrs || sourceCrs === EPSG_4326) {
    return (x: number, y: number) => [x, y] as [number, number];
  }
  const normalized = normalizeSrsName(sourceCrs) || sourceCrs;
  return (x: number, y: number) => {
    const result = proj4(normalized, EPSG_4326, [x, y]);
    return [result[0], result[1]] as [number, number];
  };
};

const findFirstDescendant = (node: any, name: string): any | null => {
  const matches = findAllByName(node, name);
  return matches.length > 0 ? matches[0] : null;
};

const parseCoordinatePairList = (text: string): number[][] => {
  const values = text.trim().split(/\s+/);
  const coords: number[][] = [];
  for (let i = 0; i + 1 < values.length; i += 2) {
    const x = Number(values[i]);
    const y = Number(values[i + 1]);
    if (!Number.isNaN(x) && !Number.isNaN(y)) {
      coords.push([x, y]);
    }
  }
  return coords;
};

const extractRingCoordinates = (
  ringNode: any,
  transform: (x: number, y: number) => [number, number]
): number[][] => {
  const posListNode = findFirstDescendant(ringNode, "posList");
  let rawCoords: number[][] = [];

  if (posListNode) {
    const text = getText(posListNode);
    if (text) {
      rawCoords = parseCoordinatePairList(text);
    }
  } else {
    const posNodes = findAllByName(ringNode, "pos");
    for (const posNode of posNodes) {
      const text = getText(posNode);
      if (!text) {
        continue;
      }
      const pair = parseCoordinatePairList(text);
      if (pair.length > 0) {
        rawCoords.push(pair[0]);
      }
    }
  }

  const transformed = rawCoords.map(([x, y]) => transform(x, y));
  if (transformed.length > 0) {
    const first = transformed[0];
    const last = transformed[transformed.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      transformed.push([first[0], first[1]]);
    }
  }
  return transformed;
};

const convertPolygonToCoordinates = (
  polygonNode: any,
  transform: (x: number, y: number) => [number, number]
): number[][][] => {
  const rings: number[][][] = [];
  const exteriorNodes = findAllByName(polygonNode, "exterior");
  if (exteriorNodes.length > 0) {
    const exteriorCoords = extractRingCoordinates(exteriorNodes[0], transform);
    rings.push(exteriorCoords);
  }
  const interiorNodes = findAllByName(polygonNode, "interior");
  for (const interior of interiorNodes) {
    rings.push(extractRingCoordinates(interior, transform));
  }
  return rings;
};

const convertMultiSurfaceToCoordinates = (
  multiSurfaceNode: any,
  transform: (x: number, y: number) => [number, number]
): number[][][][] => {
  const multiPolygon: number[][][][] = [];
  const surfaceMembers = findAllByName(multiSurfaceNode, "surfaceMember");
  for (const surfaceMember of surfaceMembers) {
    const polygonNode = findFirstDescendant(surfaceMember, "Polygon");
    if (!polygonNode) {
      continue;
    }
    multiPolygon.push(convertPolygonToCoordinates(polygonNode, transform));
  }
  return multiPolygon;
};

const isGeometryRelatedElement = (name: string) => {
  return [
    "multiSurface",
    "MultiSurface",
    "surfaceMember",
    "Polygon",
    "exterior",
    "interior",
    "LinearRing",
    "Point",
    "point",
  ].includes(name);
};

const collectGeometryMemberIds = (node: any, ids: string[] = []): string[] => {
  if (!node || typeof node !== "object") {
    return ids;
  }

  const gmlId = getAttr(node, "id") || getAttr(node, "gml:id");
  if (gmlId) {
    ids.push(gmlId);
  }

  for (const key of Object.keys(node)) {
    const value = node[key];
    if (isGeometryRelatedElement(key)) {
      for (const child of ensureArray(value)) {
        collectGeometryMemberIds(child, ids);
      }
    } else if (typeof value === "object") {
      for (const child of ensureArray(value)) {
        collectGeometryMemberIds(child, ids);
      }
    }
  }

  return ids;
};

const getPlaceId = (place: any): string | null => {
  const direct = getText(getDirectChildren(place, "placeId")[0]);
  if (direct) {
    return direct;
  }
  const identityNodes = getDirectChildren(place, "identity");
  for (const identity of identityNodes) {
    const identifier = getText(getDirectChildren(identity, "identifier")[0]);
    if (identifier) {
      return identifier;
    }
    const localId = getText(getDirectChildren(identity, "localId")[0]);
    if (localId) {
      return localId;
    }
  }
  return null;
};

const getPlaceName = (place: any): string | null => {
  const name = getText(getDirectChildren(place, "name")[0]);
  return name ?? null;
};

const getDeclaredArea = (place: any): number | null => {
  const areaText = getText(getDirectChildren(place, "area")[0]);
  if (!areaText) {
    return null;
  }
  const value = Number(areaText);
  return Number.isNaN(value) ? null : value;
};

const getShapeKind = (shape: any): string => {
  const landUse = findAllByName(shape, "ObsS_TraditionalLandUse");
  return landUse.length > 0 ? "landUsePatch" : "shape";
};

const getCompartmentGeometry = (compartment: any): any | null => {
  const direct = getPathNodes(compartment, ["multiSurface", "MultiSurface"]);
  if (direct.length > 0) {
    return direct[0];
  }
  const anyShape = getPathNodes(compartment, [
    "anyShape",
    "Place_Shape",
    "multiSurface",
    "MultiSurface",
  ]);
  if (anyShape.length > 0) {
    return anyShape[0];
  }
  const shape = getPathNodes(compartment, [
    "shape",
    "Place_Shape",
    "multiSurface",
    "MultiSurface",
  ]);
  if (shape.length > 0) {
    return shape[0];
  }
  return null;
};

const getShapeGeometry = (shape: any): any | null => {
  const direct = getPathNodes(shape, ["multiSurface", "MultiSurface"]);
  return direct.length > 0 ? direct[0] : null;
};

const getParcelGeometry = (parcel: any): any | null => {
  const direct = getPathNodes(parcel, ["multiSurface", "MultiSurface"]);
  return direct.length > 0 ? direct[0] : null;
};

const buildFeature = (
  place: any,
  placeType: string,
  geometry: number[][][][] | null,
  sourceCrs: string,
  parentPlaceId: string | null,
  shapeKind?: string
) => {
  const placeId = getPlaceId(place);
  const placeName = getPlaceName(place);
  const declaredAreaHa = getDeclaredArea(place);
  const geometryMemberIds = geometry ? collectGeometryMemberIds(place, []) : [];

  const forestand: Record<string, any> = {
    placeType,
    placeName,
    placeId: placeId ?? null,
    parentPlaceId,
    declaredAreaHa: declaredAreaHa ?? null,
    sourceCrs,
    geometryMemberIds,
  };

  if (placeType === "Place_Shape") {
    forestand.shapeKind = shapeKind || "shape";
  }

  return {
    type: "Feature",
    id: uuidv4(),
    geometry: geometry
      ? {
          type: "MultiPolygon",
          coordinates: geometry,
        }
      : null,
    properties: {
      forestand,
    },
  };
};

export const convertForestandXmlToGeoJson = (xmlContent: string) => {
  const document = parser.parse(xmlContent);
  const sourceCrs = extractSourceCrs(document);
  const transform = createTransform(sourceCrs);
  const features: any[] = [];
  const processed = new Set<string>();
  const objectIds = new WeakMap<object, string>();

  const getElementKey = (element: any) => {
    const gmlId = getAttr(element, "id") || getAttr(element, "gml:id");
    if (gmlId) {
      return `gml:${gmlId}`;
    }
    const placeId = getPlaceId(element);
    if (placeId) {
      return `place:${placeId}`;
    }
    if (element && typeof element === "object") {
      const cached = objectIds.get(element);
      if (cached) {
        return cached;
      }
      const generated = `obj:${uuidv4()}`;
      objectIds.set(element, generated);
      return generated;
    }
    return `obj:${uuidv4()}`;
  };

  const addFeatureIfNew = (
    place: any,
    placeType: string,
    geometry: number[][][][] | null,
    parentPlaceId: string | null,
    shapeKind?: string
  ) => {
    const key = getElementKey(place);
    if (processed.has(key)) {
      return false;
    }
    processed.add(key);
    features.push(
      buildFeature(
        place,
        placeType,
        geometry,
        sourceCrs,
        parentPlaceId,
        shapeKind
      )
    );
    return true;
  };

  const addShapeFeatures = (compartment: any) => {
    const encloses = getDirectChildren(compartment, "encloses");
    for (const enclosed of encloses) {
      const shapes = getDirectChildren(enclosed, "Place_Shape");
      for (const shape of shapes) {
        const shapeGeometryNode = getShapeGeometry(shape);
        const shapeGeometry = shapeGeometryNode
          ? convertMultiSurfaceToCoordinates(shapeGeometryNode, transform)
          : null;
        const shapeKind = getShapeKind(shape);
        const parentId = getPlaceId(compartment);
        addFeatureIfNew(
          shape,
          "Place_Shape",
          shapeGeometry,
          parentId ?? null,
          shapeKind
        );
      }
    }
  };

  const addCompartmentFeature = (
    compartment: any,
    parentPlaceId: string | null
  ) => {
    const geometryNode = getCompartmentGeometry(compartment);
    const geometry = geometryNode
      ? convertMultiSurfaceToCoordinates(geometryNode, transform)
      : null;
    addFeatureIfNew(compartment, "Place_Compartment", geometry, parentPlaceId);
    addShapeFeatures(compartment);
  };

  const parcels = findAllByName(document, "Place_Parcel");
  for (const parcel of parcels) {
    const parcelPlaceId = getPlaceId(parcel);
    const parcelGeometryNode = getParcelGeometry(parcel);
    const parcelGeometry = parcelGeometryNode
      ? convertMultiSurfaceToCoordinates(parcelGeometryNode, transform)
      : null;
    addFeatureIfNew(parcel, "Place_Parcel", parcelGeometry, null);

    const compartmentContainers = getDirectChildren(parcel, "compartment");
    for (const compartmentContainer of compartmentContainers) {
      const children = getDirectChildren(
        compartmentContainer,
        "Place_Compartment"
      );
      for (const compartment of children) {
        addCompartmentFeature(compartment, parcelPlaceId ?? null);
      }
    }
  }

  const compartments = findAllByName(document, "Place_Compartment");
  for (const compartment of compartments) {
    addCompartmentFeature(compartment, null);
  }

  return {
    type: "FeatureCollection",
    features,
  };
};
