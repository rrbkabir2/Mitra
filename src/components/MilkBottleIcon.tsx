import React from 'react';

interface MilkBottleIconProps {
  size?: number;
  className?: string;
  fillColor?: string;
}

export const MilkBottleIcon: React.FC<MilkBottleIconProps> = ({
  size = 24,
  className = '',
  fillColor = 'currentColor',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bottle Cap */}
      <rect x="9" y="2" width="6" height="2.5" rx="1.25" fill={fillColor} />
      {/* Bottle Neck */}
      <path
        d="M10 4.5H14V7L16.5 9.5C17.44 10.44 18 11.71 18 13.04V19C18 20.66 16.66 22 15 22H9C7.34 22 6 20.66 6 19V13.04C6 11.71 6.56 10.44 7.5 9.5L10 7V4.5Z"
        fill={fillColor}
        fillOpacity="0.2"
        stroke={fillColor}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {/* Milk Fill Level Wave */}
      <path
        d="M6.5 14.5C7.5 13.8 9.5 13.8 11 14.5C12.5 15.2 14.5 15.2 16 14.5C16.8 14.1 17.5 14.3 17.5 14.5V19C17.5 20.38 16.38 21.5 15 21.5H9C7.62 21.5 6.5 20.38 6.5 19V14.5Z"
        fill={fillColor}
        fillOpacity="0.75"
      />
      {/* Trust checkmark inside milk */}
      <path
        d="M10 17.5L11.5 19L14.5 16"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
