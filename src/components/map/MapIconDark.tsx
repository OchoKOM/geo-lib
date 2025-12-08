import React from 'react';

/**
 * @component
 * @description Représente l'icône de broche de carte (Map Pin) en SVG, transformée en composant React.
 * * @param {object} props - Les propriétés du composant.
 * @param {string} [props.color] - La couleur principale du contour (fill de la première partie). Par défaut : 'currentColor'.
 * @param {string} [props.pinColor] - La couleur de la broche intérieure (fill de la deuxième partie). Par défaut : '#155dfc'.
 * @param {string} [props.size='800px'] - La taille du composant (width et height).
 * @param {object} [props.style={}] - Styles CSS supplémentaires à appliquer.
 */
const MapPinIcon = ({ 
  color = 'currentColor', 
  pinColor = '#155dfc', 
  size = '800px', 
  style = {},
  ...rest
}) => {
  // Le balisage SVG est directement intégré et utilise des props pour la flexibilité.
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink" // Renommage standard pour React
      aria-hidden="true" 
      role="img" 
      className="iconify iconify--gis" 
      preserveAspectRatio="xMidYMid meet"
      style={style}
      {...rest}
    >
      {/* PREMIÈRE PARTIE : Le contour et le corps de la broche
        Nous utilisons la prop 'color' (par défaut 'currentColor') pour le rendre stylisable via CSS.
        L'attribut 'fill-rule' devient 'fillRule' en React.
      */}
      <path 
        d="M65.809 5a2.5 2.5 0 0 0-1.03.232L34.166 19.453L3.553 5.233A2.5 2.5 0 0 0 0 7.5v70.29a2.5 2.5 0 0 0 1.447 2.267l31.666 14.71A2.5 2.5 0 0 0 34.19 95a2.5 2.5 0 0 0 1.032-.232l30.613-14.221l30.613 14.22A2.5 2.5 0 0 0 100 92.5V22.21a2.5 2.5 0 0 0-1.447-2.267L66.887 5.233A2.5 2.5 0 0 0 65.809 5zm1.142 5.775L95 23.805v64.777L67.322 75.725l-.37-64.95zm-2.998.354l.37 64.605l-28.677 13.323l-.369-64.606L63.953 11.13zM5 11.418l27.275 12.67l.371 64.95L5 76.192V11.418z" 
        fill={color} 
        fillRule="evenodd" // Correction du kebab-case
      />
      {/* DEUXIÈME PARTIE : Le petit drapeau intérieur (la pointe)
        Nous utilisons la prop 'pinColor' pour la couleur spécifique de cette partie.
      */}
      <path 
        d="M50.106 4a2.309 2.309 0 0 0-2.308 2.308v61.56c-.001 2.364 3.131 3.201 4.31 1.15l13.388-17.12l13.388 17.12c1.178 2.051 4.31 1.214 4.31-1.15V6.307A2.309 2.309 0 0 0 80.886 4z" 
        fill={pinColor} 
      />
    </svg>
  );
};

export default MapPinIcon;