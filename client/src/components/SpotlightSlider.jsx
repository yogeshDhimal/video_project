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
      className="relative w-full h-[55vh] sm:h-[60vh] md:h-[65vh] bg-white dark:bg-charcoal-950 overflow-hidden group select-none transition-colors duration-500"
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
            className={`absolute inset-0 w-full h-full transition-all duration-[1200ms] ease-in-out ${
              isActive ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 z-0'
            }`}
          >
            {/* Background Art with Adaptive Cinematic Fades */}
            <div className="absolute inset-0">
              <img 
                src={`/api/stream/thumbnail/${episode._id}`} 
                alt={series?.title}
                className="w-full h-full object-cover object-center pointer-events-none transition-transform duration-[12000ms] ease-linear"
                style={{ transform: isActive ? 'scale(1.15)' : 'scale(1)' }}
                draggable={false}
              />
              
              {/* Cinematic Shielding Layer — Always dark behind text for master-level readability */}
              <div className="absolute inset-y-0 left-0 w-full md:w-[70%] bg-gradient-to-r from-black/80 via-black/40 to-transparent z-[1]" />
              
              {/* Dynamic Theme Bottom Dissolve — Fades into the page theme */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white via-white/10 to-transparent dark:from-charcoal-950 dark:via-transparent dark:to-transparent z-[2]" />
            </div>

            {/* Content Layer (Cinematic Overlay) */}
            <div 
              onClick={() => handleClick(episode._id)}
              className={`absolute inset-0 z-20 flex flex-col justify-end p-8 sm:p-12 md:p-16 lg:p-20 transition-all duration-1000 delay-200 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
            >
              <div className="max-w-4xl pointer-events-none drop-shadow-2xl">
                {/* Spotlight Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-full font-bold text-[10px] uppercase tracking-widest mb-4 backdrop-blur-md">
                   <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                   Spotlight #{index + 1}
                </div>

                {/* Title — Optimized for all poster types */}
                <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-black text-white mb-4 leading-[0.95] tracking-tighter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] max-w-3xl">
                  {series?.title}
                </h1>

                {/* Meta Matrix */}
                <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-200 mb-6 drop-shadow-md">
                  <span className="text-teal-400 flex items-center gap-2">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M7 6v12l10-6z"/></svg>
                    EP {episode?.number || 1}
                  </span>
                  <div className="h-4 w-px bg-white/20" />
                  {series?.genres?.slice(0,2).map(g => (
                     <span key={g} className="text-white/80 uppercase tracking-tight">{g}</span>
                  ))}
                </div>

                {/* Cinematic Description — Fixed Readability */}
                <p className="text-sm md:text-base text-white/90 max-w-xl line-clamp-3 mb-8 leading-relaxed font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                  {series?.description || episode?.description}
                </p>
                
                {/* Action Row */}
                {/* Action Row */}
                <div className="flex items-center gap-4 pointer-events-auto">
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleClick(episode._id); }}
                     className="px-8 py-3.5 bg-teal-500 hover:bg-teal-400 text-charcoal-950 font-black rounded-xl transition-all duration-300 flex items-center gap-2.5 transform hover:scale-105 shadow-xl shadow-teal-500/30"
                   >
                     <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                     WATCH NOW
                   </button>
                   
                   <button 
                     onClick={(e) => { e.stopPropagation(); navigate(`/series/${series._id}`); }}
                     className="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all backdrop-blur-md border border-white/20 flex items-center gap-2.5"
                   >
                     <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                     DETAILS
                   </button>
                </div>


              </div>
            </div>
          </div>
        );
      })}

      {/* Modern Unbalanced Navigation Controls */}
      <div className="absolute right-8 md:right-16 bottom-10 md:bottom-16 z-30 flex items-center gap-2">
        <button 
          onClick={prevSlide}
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-black/20 hover:bg-black/40 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
          aria-label="Previous Slide"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button 
          onClick={nextSlide}
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-black/20 hover:bg-black/40 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
          aria-label="Next Slide"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>

      {/* Minimalism Pagination Indicators */}
      <div className="absolute left-8 sm:left-12 bottom-6 z-30 flex items-center gap-2">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goToSlide(idx)}
            className={`transition-all duration-500 rounded-full ${
              idx === currentIndex ? 'w-8 h-1 bg-teal-500' : 'w-1.5 h-1 bg-white/20 hover:bg-white/40'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}



