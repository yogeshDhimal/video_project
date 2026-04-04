import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SpotlightSlider({ items }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const navigate = useNavigate();

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handlePointerDown = (e) => {
    setTouchEnd(null);
    setTouchStart(e.clientX || (e.touches && e.touches[0].clientX));
    setIsSwiping(false);
  };

  const handlePointerMove = (e) => {
    if (!touchStart) return;
    setTouchEnd(e.clientX || (e.touches && e.touches[0].clientX));
    setIsSwiping(true);
  };

  const handlePointerUp = () => {
    if (!touchStart || !touchEnd) {
      setTouchStart(null);
      return;
    }
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 40;
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) nextSlide();
      else prevSlide();
    }
    setTimeout(() => setIsSwiping(false), 50);
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleClick = (episodeId) => {
    if (!isSwiping) navigate(`/watch/${episodeId}`);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 7000);
    return () => clearInterval(timer);
  }, [isHovered, nextSlide]);

  if (!items || items.length === 0) return null;

  return (
    <div 
      className="relative w-full h-[450px] sm:h-[500px] md:h-[600px] bg-charcoal-950 overflow-hidden group mb-14 rounded-3xl border shadow-xl border-slate-200 dark:border-white/10 select-none cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); handlePointerUp(); }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      {/* Slides Container */}
      {items.map((item, index) => {
        const isActive = index === currentIndex;
        const episode = item.episode;
        const series = item.series;
        
        return (
          <div 
            key={episode._id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
          >
            {/* Background Art */}
            <div className="absolute inset-0">
              <img 
                src={`/api/stream/thumbnail/${episode._id}`} 
                alt={series?.title}
                className="w-full h-full object-cover object-center pointer-events-none"
                draggable={false}
              />
              {/* Force distinct dark cinematic gradients regardless of light/dark mode for image visibility */}
              <div className="absolute inset-0 bg-gradient-to-r from-charcoal-950 via-charcoal-900/60 to-transparent w-full md:w-[80%] pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-900/40 to-transparent pointer-events-none" />
            </div>

            {/* Content Layer (Clickable) */}
            <div 
              onClick={() => handleClick(episode._id)}
              className={`absolute inset-0 flex flex-col justify-end md:justify-center p-6 md:p-14 lg:p-20 transition-all duration-700 delay-100 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}
            >
              <div className="max-w-3xl pointer-events-none">
                {/* Spotlight Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-lg font-bold text-sm md:text-base mb-4 backdrop-blur-sm shadow-sm">
                  Spotlight #{index + 1}
                </div>

                {/* Title */}
                <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-black text-white mb-4 leading-tight drop-shadow-xl line-clamp-2">
                  {series?.title}
                </h1>

                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-semibold text-slate-300 mb-6 drop-shadow-md">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-md text-white">
                    <span className="text-teal-400">▶</span> {episode?.title}
                  </span>
                  {series?.genres?.slice(0,2).map(g => (
                     <span key={g} className="px-2 py-0.5 rounded-md border border-white/20 text-white/80 bg-black/20 backdrop-blur-sm">{g}</span>
                  ))}
                  <span className="px-2 py-0.5 rounded-md border border-white/20 text-white/80 bg-black/20 backdrop-blur-sm">{series?.releaseYear}</span>
                </div>

                {/* Description */}
                <p className="text-sm md:text-base text-slate-300/90 max-w-2xl line-clamp-3 mb-4 leading-relaxed font-medium drop-shadow-md">
                  {series?.description || episode?.description}
                </p>
                
                <p className="inline-flex items-center gap-2 text-sm font-bold text-teal-400 transition-colors drop-shadow">
                  Tap to watch <span className="text-lg">›</span>
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Navigation Controls (Hidden on small mobile) */}
      <div className="hidden sm:flex absolute right-6 md:right-10 bottom-6 md:bottom-1/2 md:translate-y-1/2 flex-col gap-3 z-20">
        <button 
          onClick={prevSlide}
          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/50 hover:bg-teal-500 text-slate-800 hover:text-white border border-slate-300 hover:border-transparent dark:bg-black/40 dark:text-white dark:border-white/10 backdrop-blur-md transition-all group-hover:opacity-100 md:opacity-0 shadow-md dark:shadow-none"
          aria-label="Previous Slide"
        >
          <span className="text-xl md:text-2xl ml-[-2px]">‹</span>
        </button>
        <button 
          onClick={nextSlide}
          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/50 hover:bg-teal-500 text-slate-800 hover:text-white border border-slate-300 hover:border-transparent dark:bg-black/40 dark:text-white dark:border-white/10 backdrop-blur-md transition-all group-hover:opacity-100 md:opacity-0 shadow-md dark:shadow-none"
          aria-label="Next Slide"
        >
          <span className="text-xl md:text-2xl mr-[-2px]">›</span>
        </button>
      </div>

      {/* Pagination Indicators */}
      <div className="absolute bottom-4 right-6 sm:bottom-6 md:right-14 z-20 flex items-center gap-2">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goToSlide(idx)}
            className={`transition-all duration-300 rounded-full dark:bg-white bg-slate-800 ${
              idx === currentIndex ? 'w-6 h-1.5 opacity-100' : 'w-1.5 h-1.5 opacity-30 hover:opacity-100'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
