import { NextResponse, NextRequest } from 'next/server';
// Suppression de l'importation de 'react-dom/server' pour résoudre l'erreur de build.
// Next.js gère le rendu du composant retourné par cette fonction.
import { MapPinIcon, MapPinIconProps } from '@/components/MapPinIcon'; // Assurez-vous que le chemin est correct et que MapPinIcon.tsx existe

/**
 * @function GET
 * @description Route Handler pour servir le SVG personnalisé à /favicon.
 * Intercepte les requêtes GET pour ce chemin et renvoie un SVG.
 * Gère les paramètres d'URL comme ?theme=dark.
 * * IMPORTANT : Cette fonction DOIT retourner un objet NextResponse contenant le balisage SVG
 * ou, pour les versions de Next.js qui le supportent, retourner directement le JSX.
 * Dans l'App Router, pour des réponses non-HTML/JSON, l'utilisation de NextResponse est la plus fiable.
 * @param {NextRequest} request - L'objet de requête Next.js.
 */
export async function GET(request: NextRequest) {
  // 1. Lire les paramètres de requête (theme et size)
  const { searchParams } = new URL(request.url);
  const theme = searchParams.get('theme');
  const size: string = searchParams.get('size') || '100px'; 

  // 2. Définir les couleurs basées sur le paramètre 'theme'
  let color: string;
  let pinColor: string;

  if (theme === 'dark') {
    // Couleurs pour un fond sombre (icône claire)
    color = '#FFFFFF';
    pinColor = '#FFD700'; // Or
  } else {
    // Couleurs pour un fond clair (icône sombre)
    color = '#000000'; // Noir
    pinColor = '#155dfc'; // Bleu
  }

  // 3. Préparer les props pour le composant SVG
  // L'utilisation de l'interface MapPinIconProps assure une vérification de type statique.
  const props: MapPinIconProps = {
      color: color,
      pinColor: pinColor,
      size: size,
  };

  // 4. Créer l'élément React en utilisant la syntaxe JSX (nécessite un environnement TSX,
  // mais dans un Route Handler, ceci est souvent compilé par l'App Router).
  // Pour éviter la dépendance à react-dom/server, nous rendons le balisage en chaîne manuellement.
  
  // Construction directe du balisage SVG avec les props pour contourner renderToStaticMarkup.
  // C'est une méthode de contournement fiable pour les Route Handlers App Router.
  const svgString = `<svg 
      width="${props.size}" 
      height="${props.size}" 
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      aria-hidden="true" 
      role="img" 
      preserveAspectRatio="xMidYMid meet"
    >
      <path 
        d="M65.809 5a2.5 2.5 0 0 0-1.03.232L34.166 19.453L3.553 5.233A2.5 2.5 0 0 0 0 7.5v70.29a2.5 2.5 0 0 0 1.447 2.267l31.666 14.71A2.5 2.5 0 0 0 34.19 95a2.5 2.5 0 0 0 1.032-.232l30.613-14.221l30.613 14.22A2.5 2.5 0 0 0 100 92.5V22.21a2.5 2.5 0 0 0-1.447-2.267L66.887 5.233A2.5 2.5 0 0 0 65.809 5zm1.142 5.775L95 23.805v64.777L67.322 75.725l-.37-64.95zm-2.998.354l.37 64.605l-28.677 13.323l-.369-64.606L63.953 11.13zM5 11.418l27.275 12.67l.371 64.95L5 76.192V11.418z" 
        fill="${props.color}" 
        fillRule="evenodd"
      />
      <path 
        d="M50.106 4a2.309 2.309 0 0 0-2.308 2.308v61.56c-.001 2.364 3.131 3.201 4.31 1.15l13.388-17.12l13.388 17.12c1.178 2.051 4.31 1.214 4.31-1.15V6.307A2.309 2.309 0 0 0 80.886 4z" 
        fill="${props.pinColor}" 
      />
    </svg>`;


  // 5. Servir la réponse avec les en-têtes appropriés
  return new NextResponse(svgString, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      // Cache-Control est essentiel pour que le navigateur et les proxys mettent le SVG en cache.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}