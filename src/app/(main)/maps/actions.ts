"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GeometryType } from "@prisma/client";
import { getSession } from "@/lib/auth"; // Assurez-vous que ce chemin est correct selon votre config
import { Geometry } from "geojson";

// --- TYPES ---
interface UpdateMapState {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

// --- HELPER: GeoJSON vers WKT (Well-Known Text) ---
// Ce helper est crucial pour supporter MultiPolygon, MultiLineString, etc.
function geojsonToWKT(geometry: Geometry): string {
  const type = geometry.type;
  const coords = geometry.coordinates;

  if (!coords || coords.length === 0) throw new Error("Coordonnées invalides");

  const formatCoord = (c: number[]) => `${c[0]} ${c[1]}`;

  switch (type) {
    case "Point":
      return `POINT(${formatCoord(coords)})`;

    case "MultiPoint":
      return `MULTIPOINT(${coords.map((c) => formatCoord(c)).join(", ")})`;

    case "LineString":
      return `LINESTRING(${coords.map((c) => formatCoord(c)).join(", ")})`;

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

// --- ACTION PRINCIPALE : Mise à jour de la zone ---
export async function updateStudyArea(
  id: string,
  prevState: UpdateMapState,
  formData: FormData
): Promise<UpdateMapState> {
  // 1. Vérification des droits (Authentification)
  const session = await getSession();
  const user = session?.user;

  if (!user) {
    return {
      success: false,
      message: "Vous devez être connecté pour modifier une zone.",
    };
  }

  // Vérification du rôle (Admin, Bibliothécaire ou Auteur)
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !["ADMIN", "LIBRARIAN", "AUTHOR"].includes(dbUser.role)) {
    return {
      success: false,
      message: "Vous n'avez pas les droits pour modifier cette carte.",
    };
  }

  try {
    // 2. Extraction des données
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const geojsonRaw = formData.get("geojson") as string;

    if (!name || !geojsonRaw) {
      return { success: false, message: "Le nom et la géométrie sont requis." };
    }
    const geojsonData = JSON.parse(geojsonRaw);

    // Déterminer le type de géométrie principal
    // Si c'est une FeatureCollection, on prend la première feature ou on merge
    // Pour simplifier ici, on assume que l'éditeur renvoie une Feature ou FeatureCollection
    let geometry = geojsonData;
    if (geojsonData.type === "FeatureCollection") {
      // Logique pour détecter si c'est Multi ou Simple
      const count = geojsonData.features.length;
      if (count === 0) throw new Error("Aucune géométrie dessinée");

      const firstType = geojsonData.features[0].geometry.type;

      // Si plusieurs polygones -> MultiPolygon
      if (
        count > 1 &&
        (firstType === "Polygon" || firstType === "MultiPolygon")
      ) {
        geometry = {
          type: "MultiPolygon",
          coordinates: geojsonData.features.map((f) =>
            f.geometry.type === "Polygon"
              ? f.geometry.coordinates
              : f.geometry.coordinates[0]
          ),
        };
      } else if (count === 1) {
        geometry = geojsonData.features[0].geometry;
      } else {
        // Fallback simple
        geometry = geojsonData.features[0].geometry;
      }
    } else if (geojsonData.type === "Feature") {
      geometry = geojsonData.geometry;
    }

    const geometryType = geometry.type.toUpperCase() as GeometryType;
    const wkt = geojsonToWKT(geometry);

    // 3. Mise à jour de la base de données
    // A. Mise à jour des métadonnées Prisma
    await prisma.studyArea.update({
      where: { id },
      data: {
        name,
        description,
        geometryType,
        // On pourrait aussi mettre à jour le fichier GeoJSON ici si stocké en Blob/S3
        // Pour l'instant, on assume que le GeoJSON complet est renvoyé pour mise à jour du fichier lié si nécessaire
      },
    });

    // B. Mise à jour de la géométrie PostGIS brute
    await prisma.$executeRawUnsafe(
      `UPDATE "StudyArea" SET geometry = ST_GeomFromText($1, 4326) WHERE id = $2`,
      wkt,
      id
    );

    // C. (Optionnel) Mise à jour du fichier GeoJSON lié dans la table File
    // Cela dépend de si vous voulez garder l'historique ou écraser
    // Ici, on pourrait réécrire le contenu du fichier si vous utilisez un stockage objet,
    // ou mettre à jour le champ 'url' si un nouveau fichier a été uploadé via uploadthing.

    revalidatePath(`/maps/${id}`);
    revalidatePath("/maps"); // Si vous avez une liste

    return { success: true, message: "Zone d'étude mise à jour avec succès." };
  } catch (error) {
    console.error("Erreur updateStudyArea:", error);
    return {
      success: false,
      message: `Erreur lors de la sauvegarde: ${(error as Error).message}`,
    };
  }
}
