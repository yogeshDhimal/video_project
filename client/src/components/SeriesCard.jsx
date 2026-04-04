import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function SeriesCard({ series, episodeId, mathProof }) {
  const [showInsight, setShowInsight] = useState(false);
  const to = episodeId ? `/watch/${episodeId}` : `/series/${series._id}`;
  return (
    <>
      <Link
        to={to}
        className="group block rounded-2xl overflow-hidden bg-white border border-slate-200/90 shadow-sm dark:bg-charcoal-850/50 dark:border-white/[0.07] card-hover backdrop-blur-sm dark:shadow-none"
      >
        <div className="aspect-[2/3] relative bg-gradient-to-b from-slate-100 to-slate-200 dark:from-charcoal-800 dark:to-charcoal-950">
          <img
            src={`/api/assets/poster/${series._id}`}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-95 group-hover:opacity-100 transition-opacity" />
          
          {mathProof && (
            <div 
              className="absolute top-2 left-2 z-10"
              onClick={(e) => { e.preventDefault(); setShowInsight(true); }}
            >
              <button className="bg-charcoal-900/80 backdrop-blur-md border border-teal-500/50 text-teal-400 text-[10px] font-bold px-2 py-1 rounded shadow-lg hover:bg-teal-500 hover:text-white transition-colors flex items-center gap-1">
                <span>🤖</span> INSIGHT
              </button>
            </div>
          )}

          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-teal-300 text-xs font-bold">
            ▶
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3 pt-8">
            <h3 className="font-display font-semibold text-white text-sm line-clamp-2 leading-snug group-hover:text-teal-50 transition-colors">
              {series.title}
            </h3>
            <p className="text-[11px] text-teal-300/90 dark:text-teal-400/80 mt-1 font-medium">{series.releaseYear}</p>
          </div>
        </div>
      </Link>

      {showInsight && mathProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
             onClick={() => setShowInsight(false)}>
           <div className="bg-charcoal-900 border border-teal-500/30 rounded-2xl w-full max-w-md p-6 md:p-8 shadow-2xl relative"
                onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">
                <span className="text-teal-400">⚡</span> SVD Mathematical Engine
              </h2>
              <p className="text-sm text-slate-400 mb-6 font-medium">Latent Matrix Factorization via Stochastic Gradient Descent</p>
              
              <div className="space-y-4 mb-8">
                 <div className="bg-charcoal-950 rounded-xl p-4 border border-white/5 shadow-inner">
                   <p className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-2">User Feature Vector (U)</p>
                   <code className="text-sm font-semibold text-teal-300 bg-teal-500/10 px-2 py-1 rounded">[{mathProof.uVector?.join(', ')}]</code>
                   <p className="text-xs text-slate-500 mt-2">Extracted hidden preferences from your watch history (K=3 factors).</p>
                 </div>
                 
                 <div className="bg-charcoal-950 rounded-xl p-4 border border-white/5 shadow-inner">
                   <p className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-2">Item Feature Vector (V)</p>
                   <code className="text-sm font-semibold text-amber-300 bg-amber-500/10 px-2 py-1 rounded">[{mathProof.vVector?.join(', ')}]</code>
                   <p className="text-xs text-slate-500 mt-2">Extracted psychological dimensions of this specific video.</p>
                 </div>

                 <div className="bg-teal-500/10 rounded-xl p-4 border border-teal-500/30 shadow-lg">
                   <p className="text-xs text-teal-500 font-bold tracking-wider uppercase mb-2">Mathematical Dot Product</p>
                   <div className="flex items-end gap-2">
                     <code className="text-3xl font-black text-white leading-none">{mathProof.dotProduct?.toFixed(2)}</code>
                     <span className="text-teal-500/60 font-bold mb-1">/ 5.00 Predicted Rating</span>
                   </div>
                 </div>
              </div>
              
              <button 
                onClick={() => setShowInsight(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md"
              >
                Close Insight
              </button>
           </div>
        </div>
      )}
    </>
  );
}
