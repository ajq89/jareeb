import React, { useState } from 'react';
import { useLanguage } from '../lib/i18n';
import logoDark from '../assets/images/logo-dark.png';
import logoLight from '../assets/images/logo-light.png';

interface LogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showSubtext?: boolean;
  className?: string;
}

export default function Logo({
  variant = 'dark',
  size = 'md',
  showSubtext = false,
  className = ''
}: LogoProps) {
  const [imgError, setImgError] = useState(false);
  const { language } = useLanguage();

  const isLight = variant === 'light';
  const logoSrc = isLight ? logoLight : logoDark;

  const sizeClasses = {
    sm: 'h-8 sm:h-9',
    md: 'h-11 sm:h-13',
    lg: 'h-14 sm:h-18',
  }[size];

  const textColor = isLight ? 'text-white' : 'text-slate-900';
  const subtextColor = isLight ? 'text-indigo-300' : 'text-slate-400';

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      {!imgError ? (
        <img
          src={logoSrc}
          alt="Jareeb - جريب"
          onError={() => setImgError(true)}
          className={`${sizeClasses} w-auto object-contain transition-transform duration-300 hover:scale-105 filter drop-shadow-sm`}
        />
      ) : (
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className={`font-black ${textColor} tracking-tighter uppercase ${size === 'lg' ? 'text-3xl sm:text-4xl' : size === 'sm' ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>
              Jareeb
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse mt-1" />
          </div>
          {showSubtext && (
            <span className={`text-[8px] sm:text-[10px] font-black ${subtextColor} tracking-wider uppercase mt-0.5`}>
              {language === 'ar' ? 'من بيتهم ... الى سيارتك' : 'From Home ... To Your Car'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

