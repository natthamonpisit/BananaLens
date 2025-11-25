import React, { useState, useRef, useEffect } from 'react';
import { FilterSettings } from '../types';

interface BeforeAfterProps {
  originalUrl: string;
  settings: FilterSettings;
  isCompareActive: boolean;
}

const BeforeAfter: React.FC<BeforeAfterProps> = ({ originalUrl, settings, isCompareActive }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getFilterString = (s: FilterSettings) => {
    return `brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturation}%) sepia(${s.sepia}%) grayscale(${s.grayscale}%) hue-rotate(${s.hueRotate}deg) blur(${s.blur}px)`;
  };

  const handleMouseDown = () => {
      if (isCompareActive) setIsResizing(true);
  };
  
  const handleMouseUp = () => setIsResizing(false);
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current || !isCompareActive) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  };

  const handleTouchMove = (e: TouchEvent) => {
      if (!isResizing || !containerRef.current || !isCompareActive) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
      setSliderPosition((x / rect.width) * 100);
  }

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isResizing, isCompareActive]);

  return (
    <div 
      ref={containerRef}
      className="relative inline-block max-w-full max-h-full select-none touch-none"
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {/* 
         LAYER 1: Edited Image (Layout Driver) 
         This image is static (not absolute) so it defines the width/height of the container.
         It ensures the slider overlay matches the image dimensions exactly.
      */}
      <img
        src={originalUrl}
        alt="Edited"
        className="block max-w-full max-h-full w-auto h-auto object-contain transition-all duration-500"
        style={{ 
            filter: getFilterString(settings) 
        }}
        draggable={false}
      />
      
      {/* Compare Mode UI Elements - Absolute Overlay */}
      {isCompareActive && (
        <div className="absolute inset-0">
            {/* Label After */}
            <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none z-10 font-medium backdrop-blur-sm">
                After
            </div>

            {/* 
                LAYER 2: Original Image (Overlay) 
                Matches the layout driver exactly because parent is shrink-wrapped.
            */}
            <img
                src={originalUrl}
                alt="Original"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{ 
                    clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` 
                }}
                draggable={false}
            />

            {/* Label Before */}
            <div 
                className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none z-10 font-medium backdrop-blur-sm"
                style={{ opacity: sliderPosition > 10 ? 1 : 0 }}
            >
                Before
            </div>

            {/* Slider Handle & Line */}
            <div 
                className="absolute inset-y-0 w-10 -ml-5 flex items-center justify-center cursor-ew-resize z-20 group"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
            >
                {/* Vertical Line */}
                <div className="w-0.5 h-full bg-banana-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                
                {/* Handle Button */}
                <div className="absolute w-8 h-8 bg-banana-500 rounded-full shadow-lg flex items-center justify-center ring-4 ring-black/20 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <polyline points="15 18 9 12 15 6"></polyline>
                    <polyline points="9 18 3 12 9 6" style={{transform: 'rotate(180deg)', transformOrigin: 'center'}}></polyline>
                </svg>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default BeforeAfter;