import React, { SVGProps } from 'react';

/**
 * Interface des propriétés spécifiques au composant MapPinIcon.
 * Elle étend SVGProps<SVGSVGElement> pour inclure toutes les props SVG standard 
 * (comme 'className', 'onClick', etc.) et assurer la compatibilité TypeScript.
 */
export interface MapPinIconProps extends SVGProps<SVGSVGElement> {
  color?: string;
  pinColor?: string;
  size?: string;
}

/**
 * @component MapPinIcon
 * @description Inline SVG Map Pin Icon component, fully typed with TypeScript.
 * It is designed to be used in Next.js pages or Route Handlers for dynamic SVG generation.
 */
export const MapPinIcon: React.FC<MapPinIconProps> = ({ 
  color = 'currentColor', 
  pinColor = '#155dfc', 
  size = '32px', 
  ...rest // Récupère toutes les autres props SVG standard
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      aria-hidden="true" 
      role="img" 
      preserveAspectRatio="xMidYMid meet"
      {...rest} // Applique toutes les props SVG restantes
    >
      {/* Path 1: Main body. Uses the 'color' prop. */}
      <path 
        d="M65.809 5a2.5 2.5 0 0 0-1.03.232L34.166 19.453L3.553 5.233A2.5 2.5 0 0 0 0 7.5v70.29a2.5 2.5 0 0 0 1.447 2.267l31.666 14.71A2.5 2.5 0 0 0 34.19 95a2.5 2.5 0 0 0 1.032-.232l30.613-14.221l30.613 14.22A2.5 2.5 0 0 0 100 92.5V22.21a2.5 2.5 0 0 0-1.447-2.267L66.887 5.233A2.5 2.5 0 0 0 65.809 5zm1.142 5.775L95 23.805v64.777L67.322 75.725l-.37-64.95zm-2.998.354l.37 64.605l-28.677 13.323l-.369-64.606L63.953 11.13zM5 11.418l27.275 12.67l.371 64.95L5 76.192V11.418z" 
        fill={color} 
        fillRule="evenodd"
      />
      {/* Path 2: Inner pin. Uses the 'pinColor' prop. */}
      <path 
        d="M50.106 4a2.309 2.309 0 0 0-2.308 2.308v61.56c-.001 2.364 3.131 3.201 4.31 1.15l13.388-17.12l13.388 17.12c1.178 2.051 4.31 1.214 4.31-1.15V6.307A2.309 2.309 0 0 0 80.886 4z" 
        fill={pinColor} 
      />
    </svg>
  );
};