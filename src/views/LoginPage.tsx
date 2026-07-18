import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, signInWithGoogle } from '../lib/firebase';
import { motion } from 'motion/react';
import { useLanguage } from '../lib/i18n';
import { 
  Store as StoreIcon, 
  Eye, 
  EyeOff, 
  AlertCircle,
  LogIn,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export default function LoginPage() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError(language === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password');
      } else {
        setError(err.message || (language === 'ar' ? 'حدث خطأ أثناء تسجيل الدخول. الرجاء المحاولة مرة أخرى.' : 'Failed to sign in. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/20 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-indigo-200 to-indigo-100 rounded-full blur-[150px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-violet-200 to-purple-100 rounded-full blur-[150px] opacity-35 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-slate-50 rounded-full blur-[200px] opacity-80 pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center mb-4 group">
            <img src="/logo-text.png" alt="Jareeb" className="h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
          </Link>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            {language === 'ar' ? 'بوابة التجار المبدعين' : 'Creative Vendor Portal'}
          </p>
        </div>

        {/* Main Login Card */}
        <div className="bg-white/85 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.03)] p-8 sm:p-10 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(99,102,241,0.05)]">
          <div className="rtl:text-right text-right mb-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
              {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            </h2>
            <p className="text-slate-400 font-bold text-xs leading-relaxed">
              {language === 'ar' ? 'أدخل بيانات حسابك لإدارة متجرك ومتابعة طلباتك' : 'Enter your details to manage your store and monitor orders'}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 mb-6 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-start gap-3 text-xs font-bold text-right rtl:text-right rtl:flex-row-reverse"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 rtl:text-right text-right">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <input
                type="email"
                required
                placeholder="[email protected]"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={`w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 focus:bg-white transition-all duration-200 font-semibold text-sm ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">
                {language === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`w-full ${isRTL ? 'pl-12 pr-5' : 'pr-12 pl-5'} py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 focus:bg-white transition-all duration-200 font-semibold text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 px-6 py-4 font-black rounded-2xl transition-all duration-300 shadow-lg shadow-indigo-600/15 hover:shadow-indigo-600/25 active:scale-[0.98] flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{language === 'ar' ? 'دخول' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          {/* Social Sign In Divider */}
          <div className="relative my-7 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <span className="relative bg-white px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {language === 'ar' ? 'أو' : 'OR'}
            </span>
          </div>

          {/* Google Sign In Option */}
          <button
            type="button"
            onClick={() => {
              signInWithGoogle().then((u) => {
                if (u) navigate('/dashboard');
              });
            }}
            className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-3.5 font-bold text-xs uppercase tracking-widest rounded-2xl transition-all duration-200 shadow-sm hover:shadow active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{language === 'ar' ? 'تسجيل الدخول باستخدام Google' : 'Sign In with Google'}</span>
          </button>
        </div>

        {/* Footer info link */}
        <p className="text-center text-slate-400 font-bold text-xs mt-8">
          {language === 'ar' ? 'ليس لديك حساب؟ ' : 'Don\'t have an account? '}
          <Link to="/register" className="text-indigo-600 hover:text-indigo-700 hover:underline font-extrabold transition-all">
            {language === 'ar' ? 'أنشئ متجرك الآن' : 'Create your store now'}
          </Link>
        </p>

      </div>
    </div>
  );
}
