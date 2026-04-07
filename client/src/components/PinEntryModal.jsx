import { useState, useRef, useEffect } from 'react';

export default function PinEntryModal({ isOpen, onSubmit, onCancel, isLoading, error }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [shake, setShake] = useState(false);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Reset digits when modal opens
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '']);
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    }
  }, [isOpen]);

  // Shake on error
  useEffect(() => {
    if (error) {
      setShake(true);
      setDigits(['', '', '', '']);
      setTimeout(() => {
        setShake(false);
        inputRefs[0].current?.focus();
      }, 600);
    }
  }, [error]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return; // Only allow single digit
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto-advance to next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (value && index === 3) {
      const pin = newDigits.join('');
      if (pin.length === 4) {
        onSubmit(pin);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    if (e.key === 'Enter') {
      const pin = digits.join('');
      if (pin.length === 4) onSubmit(pin);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      inputRefs[3].current?.focus();
      onSubmit(pasted);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className={`relative bg-white dark:bg-charcoal-900 rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-white/10 ${shake ? 'animate-shake' : 'animate-fadeUp'}`}>
        {/* Lock Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-display font-bold text-center text-slate-900 dark:text-white mb-1">
          Private Room
        </h2>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
          Enter the 4-digit PIN to join this room
        </p>

        {/* PIN Input Boxes */}
        <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all duration-200
                ${digit 
                  ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-500' 
                  : 'border-slate-200 bg-slate-50 text-slate-900 dark:bg-charcoal-850 dark:border-white/10 dark:text-white'
                }
                focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 dark:focus:ring-teal-500/10
                ${error ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-500' : ''}
              `}
              disabled={isLoading}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-center text-sm text-rose-500 font-semibold mb-4 animate-fadeIn">
            {error}
          </p>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-center mb-4">
            <div className="w-6 h-6 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
          </div>
        )}

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="w-full py-3 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-xl hover:bg-slate-50 dark:hover:bg-white/5"
        >
          Cancel
        </button>
      </div>

      {/* Shake animation style */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
