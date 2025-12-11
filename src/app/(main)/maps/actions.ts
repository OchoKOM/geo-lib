/* eslint-disable @typescript-eslint/ban-ts-comment */
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GeometryType } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { GeoJsonObject, Geometry } from "geojson";

// --- TYPES ---
interface UpdateMapState {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

// --- HELPER: GeoJSON vers WKT (Well-Known Text) ---
function geojsonToWKT(geometry: Geometry): string {
  const type = geometry.type;
  // @ts-expect-error
  const coords = geometry.coordinates;

  if (!coords || coords.length === 0) throw new Error("Coordonnées invalides");

  const formatCoord = (c: number[]) => `${c[0]} ${c[1]}`;

  switch (type) {
    case "Point":
      return `POINT(${formatCoord(coords)})`;
    case "MultiPoint":
      return `MULTIPOINT(${coords.map((c: number[]) => formatCoord(c)).join(", ")})`;
    case "LineString":
      return `LINESTRING(${coords.map((c: number[]) => formatCoord(c)).join(", ")})`;
    case "MultiLineString":
      return `MULTILINESTRING(${coords
        .map((line: []) => `(${line.map((c) => formatCoord(c)).join(", ")})`)
        .join(", ")})`;
    case "Polygon":
      return `POLYGON(${coords
        .map((ring: []) => `(${ring.map((c) => formatCoord(c)).join(", ")})`)
        .join(", ")})`;
    case "MultiPolygon":
      return `MULTIPOLYGON(${coords
        .map(
          (poly: []) =>
            `(${poly
              .map(
                (ring: []) => `(${ring.map((c) => formatCoord(c)).join(", ")})`
              )
              .join(", ")})`
        )
        .join(", ")})`;
    default:
      throw new Error(`Type de géométrie non supporté: ${type}`);
  }
}

// --- HELPER: Soft Delete File ---
async function softDeleteFile(fileId: string) {
    try {
        await prisma.file.update({
            where: { id: fileId },
            data: { isDeleted: true }
        });
        console.log(`Fichier ${fileId} marqué comme supprimé (soft delete).`);
    } catch (e) {
        console.error("Erreur soft delete:", e);
    }
}

// --- ACTION 1 : Mise à jour de la zone existante ---
export async function updateStudyArea(
  id: string,
  prevState: UpdateMapState,
  formData: FormData
): Promise<UpdateMapState> {
  const session = await getSession();
  const user = session?.user;

  if (!user) return { success: false, message: "Non autorisé." };

  try {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const geojsonRaw = formData.get("geojson") as string;
    const newFileId = formData.get("newFileId") as string | null; // ID du nouveau fichier uploadé via UploadThing

    if (!name || !geojsonRaw) {
      return { success: false, message: "Le nom et la géométrie sont requis." };
    }

    // 1. Traitement Géométrie PostGIS
    const geojsonData: GeoJsonObject = JSON.parse(geojsonRaw);
    // ... (Logique d'extraction de géométrie identique à votre fichier original) ...
    // Pour simplifier l'exemple, on reprend la logique de base :
    let geometry = geojsonData;
     if (geojsonData.type === "FeatureCollection") {
        // @ts-expect-error
        const count = geojsonData.features.length;
        if (count === 0) throw new Error("Aucune géométrie dessinée");
        // @ts-expect-error
        const firstType = geojsonData.features[0].geometry.type;
        if (count > 1 && (firstType === "Polygon" || firstType === "MultiPolygon")) {
            geometry = {
            type: "MultiPolygon",
            // @ts-expect-error
            coordinates: geojsonData.features.map((f) =>
                f.geometry.type === "Polygon" ? f.geometry.coordinates : f.geometry.coordinates[0]
            ),
            };
        } else {
          // @ts-expect-error
            geometry = geojsonData.features[0].geometry;
        }
    } else if (geojsonData.type === "Feature") {
      // @ts-expect-error
      geometry = geojsonData.geometry;
    }

    const geometryType = geometry.type.toUpperCase() as GeometryType;
    // @ts-expect-error
    const wkt = geojsonToWKT(geometry);

    // 2. Gestion du Soft Delete si un nouveau fichier est fourni
    if (newFileId) {
        // Récupérer l'ancien fichier pour le marquer comme supprimé
        const oldArea = await prisma.studyArea.findUnique({
            where: { id },
            select: { geojsonFileId: true }
        });

        if (oldArea && oldArea.geojsonFileId && oldArea.geojsonFileId !== newFileId) {
            await softDeleteFile(oldArea.geojsonFileId);
        }
    }

    await prisma.studyArea.update({
      where: { id },
      data: {
        name,
        description,
        geometryType,
        geojsonFileId: newFileId ? newFileId : undefined,
    },
    });

    await prisma.$executeRawUnsafe(
      `UPDATE "StudyArea" SET geometry = ST_GeomFromText($1, 4326) WHERE id = $2`,
      wkt,
      id
    );

    revalidatePath(`/maps/${id}`);
    revalidatePath("/maps");

    return { success: true, message: "Zone mise à jour avec succès." };
  } catch (error) {
    console.error("Erreur updateStudyArea:", error);
    return {
      success: false,
      message: `Erreur: ${(error as Error).message}`,
    };
  }
}

// --- ACTION 2 : Créer une nouvelle StudyArea à partir d'une couche ---
export async function createStudyAreaFromLayer(data: {
    name: string;
    description: string;
    fileId: string; // L'ID du fichier déjà uploadé via UploadThing
    geometry: Geometry; // Le GeoJSON pur pour PostGIS
}) {
    const session = await getSession();
    if (!session?.user) throw new Error("Non authentifié");

    try {
        const wkt = geojsonToWKT(data.geometry);
        const geometryType = data.geometry.type.toUpperCase() === 'POLYGON' ? 'POLYGON' : 
                             data.geometry.type.toUpperCase() === 'MULTIPOLYGON' ? 'MULTIPOLYGON' :
                             data.geometry.type.toUpperCase() === 'LINESTRING' ? 'LINESTRING' : 'POINT';

        // 1. Création de l'enregistrement Prisma
        const newArea = await prisma.studyArea.create({
            data: {
                name: data.name,
                description: data.description,
                geometryType: geometryType as GeometryType,
                geojsonFileId: data.fileId
            }
        });

        // 2. Injection de la géométrie PostGIS brute
        await prisma.$executeRawUnsafe(
            `UPDATE "StudyArea" SET geometry = ST_GeomFromText($1, 4326) WHERE id = $2`,
            wkt,
            newArea.id
        );

        revalidatePath("/maps");
        return { success: true, id: newArea.id };

    } catch (e) {
        console.error("Erreur création:", e);
        return { success: false, error: (e as Error).message };
    }
}

// --- ACTION 3 : Récupérer les zones disponibles pour import ---
export async function getAvailableStudyAreas() {
    const session = await getSession();
    if (!session?.user) return [];

    const areas = await prisma.studyArea.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            geojsonFile: true // On a besoin de l'URL pour charger le GeoJSON côté client
        },
        take: 50 // Limite pour l'exemple
    });

    return areas.map(a => ({
        id: a.id,
        name: a.name,
        type: a.geometryType,
        url: a.geojsonFile.url,
        description: a.description
    }));
}