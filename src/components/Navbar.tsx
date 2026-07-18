/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from 'firebase/auth';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, signInWithGoogle } from '../lib/firebase';
import { Store, LogOut, LayoutDashboard, User as UserIcon, Languages, Shield } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();

  const isStorefront = location.pathname.startsWith('/store/');
  const isTracking = location.pathname.startsWith('/track/');

  if (isStorefront || isTracking) {
    return null;
  }

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/" className="flex items-center group">
              <img src="/logo.png" alt="Jareeb" className="h-10 w-auto object-contain transition-transform group-hover:scale-105" />
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1 sm:gap-2 text-slate-500 hover:text-indigo-600 font-bold text-[10px] sm:text-xs uppercase tracking-widest px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-colors border border-slate-100 sm:border-transparent hover:border-slate-100"
            >
              <Languages className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            {user ? (
              <>
                {user.email === 'mursal.bh@gmail.com' && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-bold px-2 sm:px-3 py-2 rounded-lg transition-colors bg-amber-50"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden md:inline text-xs">{language === 'ar' ? 'الإدارة' : 'Admin'}</span>
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 sm:gap-2 text-slate-600 hover:text-indigo-600 font-bold px-2 sm:px-3 py-2 rounded-lg transition-colors text-xs"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden md:inline">{t('nav.dashboard')}</span>
                </Link>
                <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-200 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-2 sm:rtl:pr-4">
                  <div className="hidden sm:block text-right rtl:text-left">
                    <p className="text-sm font-bold text-slate-800 leading-tight">{user.displayName}</p>
                    <button
                      onClick={handleLogout}
                      className="text-[10px] text-slate-400 font-bold uppercase hover:text-rose-500 flex items-center gap-1 justify-end ml-auto transition-colors rtl:mr-auto rtl:ml-0"
                    >
                      {language === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
                    </button>
                  </div>
                  {/* Mobile logout button */}
                  <button
                    onClick={handleLogout}
                    className="block sm:hidden p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                    title={language === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 sm:w-9 h-9 rounded-xl border border-slate-200 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-indigo-100 shadow-lg active:scale-95"
              >
                {t('nav.signin')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
