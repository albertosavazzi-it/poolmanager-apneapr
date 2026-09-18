import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number | string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = "w-8 h-8", size }) => {
  return (
    <img
      src="/android-chrome-192x192.png"
      alt="Pool Manager Logo"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    />
  );
};
