import { useRef, useCallback, memo } from 'react';
import { DEFAULT_EDGE_COLOR } from '../config';

/**
 * Bouton rond arc-en-ciel avec un « + » blanc au centre.
 * Au clic, ouvre le sélecteur de couleur natif (<input type="color">).
 *
 * Props :
 *  - value        : couleur hex actuellement sélectionnée (pour le input)
 *  - onChange(hex) : callback quand l'utilisateur choisit une couleur
 *  - isActive      : si true, affiche le style "sélectionné" (bordure sombre + scale)
 *  - size          : taille en rem du bouton (défaut 1rem = w-4 h-4)
 */
const CustomColorPicker = ({ value = DEFAULT_EDGE_COLOR, onChange, isActive = false, size = 'w-4 h-4' }) => {
  const inputRef = useRef(null);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback((e) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${size} rounded-full border-2 hover:scale-125 transition-transform relative flex items-center justify-center ${
        isActive ? 'border-gray-700 scale-110' : 'border-gray-300'
      }`}
      style={{
        background: 'conic-gradient(from 0deg, #f44336, #ff9800, #ffeb3b, #4caf50, #2196f3, #9c27b0, #f44336)',
      }}
      title="Couleur personnalisée"
    >
      {/* Cercle blanc central avec le "+" */}
      <span
        className="absolute rounded-full bg-white flex items-center justify-center"
        style={{
          width: '60%',
          height: '60%',
        }}
      >
        <svg
          viewBox="0 0 12 12"
          fill="none"
          className="text-gray-500"
          style={{ width: '65%', height: '65%' }}
        >
          <path
            d="M6 2v8M2 6h8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>

      {/* Input color caché */}
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
      />
    </button>
  );
};

export default memo(CustomColorPicker);
