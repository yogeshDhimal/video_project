import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import AuthPageShell from '../components/AuthPageShell';
import { getAuthErrorMessage } from '../utils/authErrors';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const dismiss = toast.loading('Creating your account…');
    try {
      await register({ email, password, username });
      toast.dismiss(dismiss);
      toast.success('Account created');
      navigate('/');
    } catch (err) {
      toast.dismiss(dismiss);
      toast.error(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell>
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-sm dark:border-white/10 dark:bg-charcoal-850/60 dark:shadow-[0_24px_80px_-20px_rgba(0,0,0,0.55)]"
      >
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-6">Create account</h1>
        <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:bg-charcoal-900 dark:border-white/10 dark:text-slate-100 disabled:opacity-60"
          required
          minLength={2}
          disabled={submitting}
          autoComplete="username"
        />
        <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:bg-charcoal-900 dark:border-white/10 dark:text-slate-100 disabled:opacity-60"
          required
          disabled={submitting}
          autoComplete="email"
        />
        <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Password (min 8)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:bg-charcoal-900 dark:border-white/10 dark:text-slate-100 disabled:opacity-60"
          required
          minLength={8}
          disabled={submitting}
          autoComplete="new-password"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 font-semibold text-white shadow-md dark:shadow-glow transition-all disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 min-h-[48px]"
        >
          {submitting ? (
            <>
              <span className="inline-block h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Creating account…
            </>
          ) : (
            'Sign up'
          )}
        </button>
        <p className="text-center text-slate-600 dark:text-slate-500 text-sm mt-6">
          Have an account?{' '}
          <Link to="/login" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthPageShell>
  );
}
