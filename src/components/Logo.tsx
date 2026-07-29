import React, { useState } from 'react';
import { useLanguage } from '../lib/i18n';

interface LogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showSubtext?: boolean;
  className?: string;
}

export default function Logo({
  variant = 'dark',
  size = 'md',
  showSubtext = true,
  className = ''
}: LogoProps) {
  const [imgError, setImgError] = useState(false);
  const { language } = useLanguage();

  const isLight = variant === 'light';

  const sizeClasses = {
    sm: 'h-8 text-xl',
    md: 'h-12 text-2xl sm:text-3xl',
    lg: 'h-16 text-3xl sm:text-4xl',
  }[size];

  const textColor = isLight ? 'text-white' : 'text-slate-900';
  const subtextColor = isLight ? 'text-indigo-300' : 'text-slate-400';

  if (!imgError) {
    return (
      <div className={`inline-flex flex-col items-center justify-center ${className}`}>
        <img
          src="/logo-text.png"
          alt="Jareeb - جريب"
          onError={() => setImgError(true)}
          className={`${sizeClasses.split(' ')[0]} w-auto object-contain transition-transform duration-300 hover:scale-105`}
        />
        {showSubtext && (
          <span className={`text-[8px] sm:text-[10px] font-black ${subtextColor} tracking-wider uppercase mt-0.5`}>
            {language === 'ar' ? 'من بيتهم ... الى سيارتك' : 'From Home ... To Your Car'}
          </span>
        )}
      </div>
    );
  }

  // Fallback if image fails to load
  return (
    <div className={`inline-flex flex-col items-center sm:items-start group ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`font-black ${textColor} tracking-tighter uppercase ${sizeClasses.split(' ').slice(1).join(' ')}`}>
          Jareeb
        </span>
        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse mt-1" />
      </div>
      {showSubtext && (
        <span className={`text-[8px] sm:text-[10px] font-black ${subtextColor} -mt-1 tracking-wider uppercase`}>
          {language === 'ar' ? 'من بيتهم ... الى سيارتك' : 'From Home ... To Your Car'}
        </span>
      )}
    </div>
  );
}
