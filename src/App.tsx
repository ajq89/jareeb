/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { LanguageProvider } from './lib/i18n';

// Views
import LandingPage from './views/LandingPage';
import RegisterPage from './views/RegisterPage';
import LoginPage from './views/LoginPage';
import VendorDashboard from './views/VendorDashboard';
import Storefront from './views/Storefront';
import TrackingPage from './views/TrackingPage';
import AdminDashboard from './views/AdminDashboard';
import PrivacyPolicy from './views/PrivacyPolicy';
import TermsOfService from './views/TermsOfService';
import ContactPage from './views/ContactPage';
import Navbar from './components/Navbar';
import SplashScreen from './components/SplashScreen';
import SwipeNavigation from './components/SwipeNavigation';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Minimum 2 seconds to show the splash screen
    const minSplashTime = 2000;
    const startTime = Date.now();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minSplashTime - elapsedTime);

      // Transition precisely after the minimum time
      setTimeout(() => {
        setLoading(false);
        // Start fading out the splash screen
        setShowSplash(false);
      }, remainingTime);
    });
    return unsubscribe;
  }, []);

  return (
    <LanguageProvider>
      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" />}
      </AnimatePresence>
      
      {!loading && (
        <BrowserRouter>
          <SwipeNavigation />
          <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
            <Navbar user={user} />
            <main>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />
                  <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
                  <Route 
                    path="/dashboard" 
                    element={user ? <VendorDashboard user={user} /> : <Navigate to="/login" />} 
                  />
                  <Route path="/store/:slug" element={<Storefront />} />
                  <Route path="/track/:orderId" element={<TrackingPage />} />
                  <Route 
                    path="/admin" 
                    element={user?.email === 'mursal.bh@gmail.com' ? <AdminDashboard /> : <Navigate to="/" />} 
                  />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/contact" element={<ContactPage />} />
                </Routes>
              </AnimatePresence>
            </main>
          </div>
        </BrowserRouter>
      )}
    </LanguageProvider>
  );
}
