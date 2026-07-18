/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Car, 
  BellRing, 
  MapPin, 
  Check, 
  Star, 
  Zap, 
  ShieldCheck, 
  ChevronRight, 
  Store, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  Volume2, 
  UserPlus, 
  CloudUpload, 
  Rocket,
  TrendingUp,
  Clock
} from 'lucide-react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vendor } from '../types';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../lib/i18n';

export default function LandingPage() {
  const { t, language, isRTL } = useLanguage();

  // Interactive Live Simulator State
  const [simStep, setSimStep] = useState<number>(0);
  const [simCartCount, setSimCartCount] = useState<number>(0);
  const [simArrived, setSimArrived] = useState<boolean>(false);
  const [simStatus, setSimStatus] = useState<'pending' | 'preparing' | 'ready' | 'completed'>('pending');

  // Real-time Database Stats from Firestore
  const [dbVendors, setDbVendors] = useState<Vendor[]>([]);
  const [dbProductCount, setDbProductCount] = useState<number>(0);
  const [dbOrderCount, setDbOrderCount] = useState<number>(0);

  useEffect(() => {
    // 1. Listen to vendors
    const qVendors = query(collection(db, 'vendors'));
    const unsubVendors = onSnapshot(qVendors, (snapshot) => {
      const list = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Vendor))
        .filter(v => v.isPublic !== false); // Filter out private vendors
      setDbVendors(list);
    });

    // 2. Listen to products to count them (Products are public)
    const qProducts = query(collection(db, 'products'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setDbProductCount(snapshot.size);
    });

    return () => {
      unsubVendors();
      unsubProducts();
    };
  }, []);

  const getAvatarStyle = (index: number) => {
    const colors = [
      'bg-indigo-600 text-indigo-50 border-indigo-200',
      'bg-emerald-600 text-emerald-50 border-emerald-200',
      'bg-amber-600 text-amber-50 border-amber-200',
      'bg-violet-600 text-violet-50 border-violet-200',
    ];
    return colors[index % colors.length];
  };

  const getDisplayAvatars = () => {
    const avatars = [];
    if (dbVendors.length > 0) {
      dbVendors.slice(0, 4).forEach((vendor, idx) => {
        avatars.push({
          type: 'vendor',
          name: vendor.name,
          logoUrl: vendor.logoUrl,
          style: getAvatarStyle(idx)
        });
      });
    }
    // Fill the rest with beautiful theme fallbacks
    const fallbacks = [
      { name: 'Coffee', logoUrl: '', char: '☕', style: 'bg-amber-100 text-amber-700 border-amber-200' },
      { name: 'Bakery', logoUrl: '', char: '🥐', style: 'bg-orange-100 text-orange-700 border-orange-200' },
      { name: 'Flower', logoUrl: '', char: '🌸', style: 'bg-rose-100 text-rose-700 border-rose-200' },
      { name: 'Boutique', logoUrl: '', char: '🛍️', style: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    ];
    while (avatars.length < 4) {
      const f = fallbacks[avatars.length];
      avatars.push({
        type: 'fallback',
        name: f.name,
        logoUrl: '',
        char: f.char,
        style: f.style
      });
    }
    return avatars;
  };

  // native Web Audio Synth beep for realistic touch interaction
  const playSimSound = (freq = 800, duration = 0.12) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq / 2, ctx.currentTime + duration);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.log('Audio feedback bypass:', e);
    }
  };

  const resetSimulator = () => {
    playSimSound(500, 0.2);
    setSimStep(0);
    setSimCartCount(0);
    setSimArrived(false);
    setSimStatus('pending');
  };

  return (
    <div className="bg-slate-50/40 min-h-screen text-slate-800 selection:bg-indigo-500 selection:text-white overflow-hidden">
      
      {/* Immersive Responsive Hero Section */}
      <section className="relative pt-12 lg:pt-24 pb-16 lg:pb-28 overflow-hidden bg-white border-b border-slate-100">
        {/* Ambient Gradient Background Elements */}
        <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-[500px] h-[500px] bg-violet-100/40 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: Hero Text & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left rtl:lg:text-right">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50/70 border border-indigo-100/50 text-indigo-600 text-xs font-black uppercase tracking-wider shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                {t('hero.badge')}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] sm:leading-[1.05]"
              >
                {t('hero.title')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 relative inline-block">
                  {t('hero.titleAccent')}
                  <svg className="absolute -bottom-2 left-0 w-full h-2.5 text-indigo-100 fill-current opacity-60" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 25 0, 50 5 T 100 5 L 100 10 L 0 10 Z" />
                  </svg>
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-base sm:text-lg md:text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0"
              >
                {t('hero.subtitle')}
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center pt-2"
              >
                <Link
                  to="/register"
                  className="w-full sm:w-auto group relative bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-base transition-all hover:bg-indigo-600 hover:scale-[1.03] active:scale-95 shadow-xl shadow-indigo-100 inline-flex items-center gap-3 justify-center"
                >
                  {t('hero.cta')}
                  <ChevronRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180' : ''}`} />
                </Link>

                {/* Social Proof Stores counter */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-[22px] bg-white border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] relative overflow-hidden group hover:shadow-[0_12px_40px_rgba(99,102,241,0.05)] hover:border-slate-200/80 transition-all duration-300">
                  {/* Subtle background gradient on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  {/* Left part: Avatar stack with status indicators and star ratings */}
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="flex -space-x-3.5 rtl:space-x-reverse items-center">
                      {getDisplayAvatars().map((avatar, idx) => (
                        <div 
                          key={idx} 
                          className={`w-9 h-9 rounded-full border-2 border-white overflow-hidden shadow-sm hover:-translate-y-1 hover:z-30 transition-transform duration-200 cursor-pointer relative group/avatar flex items-center justify-center font-bold text-xs ${avatar.style}`}
                          title={avatar.name}
                        >
                          {avatar.logoUrl ? (
                            <img src={avatar.logoUrl} alt={avatar.name} className="w-full h-full object-cover" />
                          ) : (
                            avatar.char || avatar.name.charAt(0)
                          )}
                          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                        </div>
                      ))}
                    </div>
                    
                    <div className="h-8 w-[1px] bg-slate-100 hidden sm:block" />
                    
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-800">
                          {dbVendors.length}
                        </span>
                        <div className="flex text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {language === 'ar' ? 'متاجر مسجلة وموثقة' : 'Verified Registered Stores'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold">
                        {language === 'ar' 
                          ? `${dbProductCount} منتج متاح مباشر` 
                          : `${dbProductCount} real items listed`}
                      </p>
                    </div>
                  </div>
                  
                  {/* Dividers & Right part: Live stores location tracker */}
                  <div className="w-full h-[1px] bg-slate-50 sm:hidden" />
                  <div className="h-8 w-[1px] bg-slate-100 hidden sm:block" />

                  <div className="flex items-center gap-3 relative z-10 text-left rtl:text-right">
                    <div className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 leading-tight">
                        {language === 'ar' 
                          ? `${dbOrderCount} طلبات تم معالجتها` 
                          : `${dbOrderCount} Authentic Orders`}
                      </p>
                      <p className="text-[10px] font-bold text-indigo-600">
                        {dbVendors.length > 0 ? (
                          language === 'ar'
                            ? `نشط في: ${Array.from(new Set(dbVendors.map(v => v.location || 'المنامة'))).slice(0, 3).join('، ')}`
                            : `Active in: ${Array.from(new Set(dbVendors.map(v => v.location || 'Manama'))).slice(0, 3).join(', ')}`
                        ) : (
                          language === 'ar' ? 'المنامة، الرياض، جدة' : 'Manama, Riyadh, Jeddah'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Stunning Interactive Simulator */}
            <div className="lg:col-span-5 flex justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="w-full max-w-[390px] bg-slate-900 p-4 rounded-[3rem] shadow-2xl border-4 border-slate-800 relative group"
              >
                {/* Speaker Grill & Camera notch for realism */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-800 rounded-full z-20 flex items-center justify-between px-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  <div className="w-16 h-1 bg-slate-700 rounded-full" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                </div>

                {/* Simulated Screen */}
                <div className="bg-white rounded-[2.2rem] overflow-hidden min-h-[460px] flex flex-col text-slate-800 relative font-sans">
                  
                  {/* Status Bar */}
                  <div className="bg-slate-50 border-b border-slate-100/60 px-6 py-4 flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span>9:41 AM</span>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-emerald-600 uppercase tracking-widest text-[9px] font-black">
                        {language === 'ar' ? 'مباشر' : 'JAREEB LIVE'}
                      </span>
                    </div>
                  </div>

                  {/* Simulator Screen Content */}
                  <div className="flex-1 p-5 flex flex-col justify-between">
                    <AnimatePresence mode="wait">
                      
                      {/* Step 0: Elegant Catalog Mockup */}
                      {simStep === 0 && (
                        <motion.div
                          key="sim-step-0"
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -15 }}
                          className="flex-1 flex flex-col justify-between"
                        >
                          <div className="space-y-4">
                             <div className="flex items-center gap-2">
                               <div className="relative h-8 flex items-center">
                                 <img src="/logo-text.png" alt="Jareeb" className="h-8 w-auto object-contain" />
                               </div>
                               <div>
                                <h4 className="text-xs font-black text-slate-800">{language === 'ar' ? 'مخبز جريب الفاخر' : 'Jareeb Bakeries'}</h4>
                                <p className="text-[9px] text-slate-400 font-bold">{language === 'ar' ? 'المنامة، البحرين' : 'Manama, Bahrain'}</p>
                              </div>
                            </div>
                            
                            {/* Product Card */}
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                              <div className="h-28 rounded-xl bg-indigo-50 overflow-hidden relative flex items-center justify-center">
                                <span className="text-3xl">🥐</span>
                                <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full text-[9px] font-black text-indigo-600 border border-indigo-50">
                                  1.400 BHD
                                </div>
                              </div>
                              <div>
                                <h5 className="text-xs font-black text-slate-800">{language === 'ar' ? 'كرواسون الزعفران الساخن' : 'Hot Saffron Croissant'}</h5>
                                <p className="text-[10px] text-slate-400 font-medium">{language === 'ar' ? 'محضر طازجاً من أجود المكونات' : 'Freshly baked with local saffron.'}</p>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              playSimSound(880);
                              setSimCartCount(1);
                              setTimeout(() => setSimStep(1), 800);
                            }}
                            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                          >
                            <ShoppingBag className="w-4 h-4" />
                            {language === 'ar' ? `إضافة للطلب (${simCartCount})` : `Add to Order (${simCartCount})`}
                          </button>
                        </motion.div>
                      )}

                      {/* Step 1: Real-time Sound Alert & Ring Mockup */}
                      {simStep === 1 && (
                        <motion.div
                          key="sim-step-1"
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -15 }}
                          className="flex-1 flex flex-col justify-between"
                        >
                          <div className="space-y-4 text-center py-4">
                            <div className="mx-auto w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 relative">
                              <BellRing className="w-8 h-8 animate-bounce" />
                              <span className="absolute inset-0 rounded-full bg-rose-500/10 animate-ping" />
                            </div>
                            
                            <div className="space-y-1">
                              <h4 className="text-sm font-black text-slate-800">
                                {language === 'ar' ? 'رنين تنبيه مباشر! 🔊' : 'Live Order Sound Ringing!'}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {language === 'ar' ? 'تنبيه فوري لطلب جديد من السيارة' : 'Instant notification sounds on new incoming order.'}
                              </p>
                            </div>

                            <button 
                              onClick={() => playSimSound(1000, 0.25)}
                              className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black border border-rose-100 hover:bg-rose-100 transition-colors"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              {language === 'ar' ? 'اختبار نغمة التنبيه' : 'Test Alert Ringtone'}
                            </button>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/80 text-left rtl:text-right text-[10px]">
                              <p className="font-bold text-slate-500 uppercase tracking-widest text-[8px] mb-1">{language === 'ar' ? 'تفاصيل طلب العميل' : 'Customer Request'}</p>
                              <p className="font-black text-slate-700">1x {language === 'ar' ? 'كرواسون الزعفران' : 'Saffron Croissant'}</p>
                              <p className="text-slate-400 font-bold mt-1">🚗 {language === 'ar' ? 'الاستلام: فوراً (الآن)' : 'Pickup: ASAP'}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              playSimSound(600);
                              setSimStatus('preparing');
                              setSimStep(2);
                            }}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-colors"
                          >
                            {language === 'ar' ? 'قبول وبدء التحضير' : 'Accept & Start preparing'}
                          </button>
                        </motion.div>
                      )}

                      {/* Step 2: "I'm Here!" Customer Button */}
                      {simStep === 2 && (
                        <motion.div
                          key="sim-step-2"
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -15 }}
                          className="flex-1 flex flex-col justify-between"
                        >
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                              <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                {language === 'ar' ? 'جاري التحضير... ⏳' : 'Preparing...'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">🚗 {language === 'ar' ? 'أصل بالسيارة' : 'By Car'}</span>
                            </div>

                            <div className="space-y-2 text-center py-3">
                              <p className="text-xs font-bold text-slate-500">
                                {language === 'ar' ? 'بمجرد وصولك خارج منزل البائع، اضغط:' : 'The moment you pull up outside, tap:'}
                              </p>
                              
                              {/* Pulsating interactive Arrived Button */}
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  playSimSound(1200, 0.4);
                                  setSimArrived(true);
                                  setSimStatus('ready');
                                  setTimeout(() => setSimStep(3), 800);
                                }}
                                className={`mx-auto w-32 h-32 rounded-full border-4 ${
                                  simArrived ? 'bg-emerald-600 border-emerald-100 shadow-emerald-100' : 'bg-rose-600 border-rose-100 shadow-rose-100'
                                } text-white flex flex-col items-center justify-center font-black transition-all shadow-xl`}
                              >
                                <Car className="w-8 h-8 mb-1 animate-bounce" />
                                <span className="text-sm tracking-wider uppercase font-black">
                                  {language === 'ar' ? 'أنا هنا!' : 'I AM HERE!'}
                                </span>
                              </motion.button>
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center text-[10px] font-bold text-slate-400">
                              {language === 'ar' ? 'لكزس فضي - لوحة 1092' : 'Silver Lexus - Plate 1092'}
                            </div>
                          </div>

                          <p className="text-center text-[9px] text-slate-400 font-bold">
                            {language === 'ar' ? 'العميل لا يحتاج للنزول أو الانتظار أبداً' : 'No need for customers to ever exit the car'}
                          </p>
                        </motion.div>
                      )}

                      {/* Step 3: Success Screen */}
                      {simStep === 3 && (
                        <motion.div
                          key="sim-step-3"
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -15 }}
                          className="flex-1 flex flex-col justify-between"
                        >
                          <div className="space-y-4 text-center py-4">
                            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                              <CheckCircle2 className="w-8 h-8" />
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-sm font-black text-slate-800">
                                {language === 'ar' ? 'تم تسليم الطلب بنجاح! 🎉' : 'Order Handed Over!'}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {language === 'ar' ? 'استلم العميل الطلب في سيارته وغادر سعيداً.' : 'Client received order in-car and left happy.'}
                              </p>
                            </div>

                            {/* Client Feedback Simulation */}
                            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50 inline-block">
                              <div className="flex justify-center gap-1 text-amber-400 mb-1">
                                {[1,2,3,4,5].map(star => <Star key={star} className="w-3.5 h-3.5 fill-current" />)}
                              </div>
                              <p className="text-[9px] font-bold italic text-emerald-800">
                                "{language === 'ar' ? 'أفضل وأسرع تجربة استلام على الإطلاق!' : 'Best & fastest curbside handoff ever!'}"
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={resetSimulator}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-colors"
                          >
                            {language === 'ar' ? 'تكرار المحاكاة التفاعلية 🔄' : 'Restart Demo 🔄'}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Simulator Bottom Instructions Tab */}
                  <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex justify-between items-center text-[9px] font-black uppercase text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      {language === 'ar' ? 'محاكاة جريب التفاعلية' : 'Jareeb Interactive Demo'}
                    </span>
                    <button onClick={resetSimulator} className="hover:text-indigo-600 transition-colors">
                      {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* Modern Bento-styled Features Grid */}
      <section className="py-24 bg-slate-50/50 relative border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-widest"
            >
              <Zap className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
              {language === 'ar' ? 'المزايا الذكية' : 'Smart Capabilities'}
            </motion.div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
              {language === 'ar' ? 'مزايا متكاملة لتجارة عصرية' : 'Everything You Need to Scale'}
            </h2>
            <p className="text-slate-500 font-medium max-w-xl mx-auto leading-relaxed text-sm sm:text-base">
              {language === 'ar' 
                ? 'منصة جريب توفر لك كل الأدوات لإدارة مبيعاتك واستقبال عملائك من السيارة بسلاسة تامة واحترافية.' 
                : 'Jareeb provides all the tools you need to manage doorstep pickups, process online payments, and build consumer trust seamlessly.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <ShoppingBag className="w-7 h-7" />,
                title: language === 'ar' ? 'كتالوجات رقمية راقية' : 'Live Digital Catalogs',
                desc: language === 'ar' 
                  ? 'صمم متجرك الخاص واعرض منتجاتك مع الصور والأسعار والخيارات المختلفة في دقائق معدودة.' 
                  : 'Design your own premium store and showcase your items with pricing and specifications in minutes.',
                color: "text-blue-600",
                bg: "bg-blue-50/60"
              },
              {
                icon: <BellRing className="w-7 h-7" />,
                title: language === 'ar' ? 'تنبيهات صوتية فورية' : 'Real-time Sound Alerts',
                desc: language === 'ar' 
                  ? 'رنين وتنبيهات صوتية فورية داخل لوحة التحكم بمجرد إرسال طلب جديد لضمان الاستجابة الفائقة.' 
                  : 'Get instant sound notification alerts in your dashboard the moment a new client order arrives.',
                color: "text-indigo-600",
                bg: "bg-indigo-50/60"
              },
              {
                icon: <Car className="w-7 h-7" />,
                title: language === 'ar' ? 'خيارات استلام مرنة' : 'Flexible Pickup Options',
                desc: language === 'ar' 
                  ? 'يتيح للعميل حرية الاختيار بين الاستلام فوراً (الآن) أو جدولة موعد وتاريخ محدد يناسبه.' 
                  : 'Empower clients with the choice of instant pickup (ASAP) or scheduling a precise date and time.',
                color: "text-amber-600",
                bg: "bg-amber-50/60"
              },
              {
                icon: <MapPin className="w-7 h-7" />,
                title: language === 'ar' ? 'تتبع مباشر للعميل' : 'Interactive Order Tracking',
                desc: language === 'ar' 
                  ? 'صفحة تتبع متقدمة تتيح للمشتري ضغط زر «أنا هنا!» لإبلاغ المتجر فور وصوله خارجاً.' 
                  : 'Let shoppers tap "I am here!" on their tracking page to instantly notify the shop of their arrival.',
                color: "text-emerald-600",
                bg: "bg-emerald-50/60"
              },
              {
                icon: <ShieldCheck className="w-7 h-7" />,
                title: language === 'ar' ? 'إثبات الدفع الرقمي' : 'Secure Digital Receipts',
                desc: language === 'ar' 
                  ? 'يرفق العملاء صور إيصالات الدفع والتحويل البنكي ليتم مراجعتها واعتمادها بسهولة وسرعة.' 
                  : 'Allow clients to upload bank transfer receipts for quick validation and secure checkout verification.',
                color: "text-rose-600",
                bg: "bg-rose-50/60"
              },
              {
                icon: <TrendingUp className="w-7 h-7" />,
                title: language === 'ar' ? 'تحليلات ذكية شاملة' : 'Smart Dashboard Analytics',
                desc: language === 'ar' 
                  ? 'راقب المبيعات اليومية، إجمالي الأرباح، وتفضيلات العملاء لمساعدتك في اتخاذ قرارات مدروسة.' 
                  : 'Track daily performance indicators, complete order histories, and revenues to optimize operations.',
                color: "text-purple-600",
                bg: "bg-purple-50/60"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/20 hover:border-indigo-100/50 transition-all duration-500 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-50/10 to-transparent rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-150" />
                <div className={`${feature.bg} ${feature.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-500 shadow-sm`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-slate-500 leading-relaxed font-medium text-xs sm:text-sm">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Beautiful connected visual Roadmap section */}
      <section className="py-24 bg-white relative border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
              {language === 'ar' ? 'سهل الإعداد' : 'Easy Onboarding'}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
              {language === 'ar' ? 'كيف تفتح متجرك وتستقبل العملاء؟' : 'How to Launch Your Shop'}
            </h2>
            <p className="text-slate-500 font-medium max-w-lg mx-auto text-sm sm:text-base">
              {language === 'ar' ? 'ثلاث خطوات بسيطة تضمن لك الارتقاء بمبيعاتك والوصول الفوري.' : 'Three simple steps to level up your delivery game and customer experience.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Visual connector lines on desktop */}
            <div className="hidden md:block absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-dashed border-t-2 border-dashed border-slate-150 -translate-y-12 z-0" />

            {[
              { 
                title: language === 'ar' ? 'أنشئ حساب التاجر' : 'Create Merchant Profile', 
                desc: language === 'ar' ? 'سجل حساب بائع جديد في ثوانٍ مخصصة للعمليات المنزلية.' : 'Quickly sign up your vendor profile tailored to home-based or regional operations.',
                icon: <UserPlus className="w-6 h-6 text-indigo-600" />,
                bg: 'bg-indigo-50'
              },
              { 
                title: language === 'ar' ? 'أضف منتجاتك ومطابخك' : 'Upload Products & Menus', 
                desc: language === 'ar' ? 'أدخل أصنافك، الصور، والأسعار في نموذج سهل وسريع.' : 'Add your menu items, sizes, options, and cover photo instantly.',
                icon: <CloudUpload className="w-6 h-6 text-amber-600" />,
                bg: 'bg-amber-50'
              },
              { 
                title: language === 'ar' ? 'شارك الرابط وابدأ البيع!' : 'Share Store Link & Sell', 
                desc: language === 'ar' ? 'انشر رابط متجرك المباشر واستقبل رنين طلبات السيارات فوراً.' : 'Share your public store URL to social media and hear orders ring out loud.',
                icon: <Rocket className="w-6 h-6 text-emerald-600" />,
                bg: 'bg-emerald-50'
              }
            ].map((step, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center text-center p-8 border border-slate-100 rounded-3xl bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-slate-100/80 transition-all duration-300 relative z-10"
              >
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center mb-6 relative">
                  {step.icon}
                  <span className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-500 font-medium text-xs sm:text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link 
              to="/register" 
              className="inline-flex items-center gap-2 text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-6 py-3 rounded-xl hover:bg-indigo-100 hover:scale-105 active:scale-95 transition-all"
            >
              {language === 'ar' ? 'افتح متجرك المجاني الآن' : 'Open Your Free Store Now'}
              <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-slate-50/30 overflow-hidden relative border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-block px-4 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
              Pricing Plans
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
              {t('pricing.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {[
              {
                name: t('pricing.starter'),
                price: "5",
                desc: language === 'ar' ? "مثالي لتجربة فكرتك" : "Perfect for testing your idea",
                features: language === 'ar' ? ["حتى 10 منتجات", "لوحة تحكم أساسية", "تنبيهات وصول قياسية", "رابط متجر مباشر"] : ["Up to 10 products", "Basic dashboard", "Standard arrival alerts", "Live store URL"],
                icon: <Store className="w-6 h-6 text-slate-400" />,
                cta: language === 'ar' ? "ابدأ مجاناً" : "Start for free",
                popular: false,
                tag: language === 'ar' ? 'لفترة محدودة' : 'Limited Time'
              },
              {
                name: t('pricing.pro'),
                price: "15",
                desc: language === 'ar' ? "وسع مشروعك المنزلي بشكل أسرع" : "Scale your home business faster",
                features: language === 'ar' ? ["منتجات غير محدودة", "قاعدة بيانات عملاء ذكية و CRM", "تحليلات متقدمة", "تحديث تلقائي للمخزن بعد الفاتورة", "علامة تجارية مخصصة", "تنبيهات ذات أولوية"] : ["Unlimited products", "Smart Customer Database & CRM", "Advanced analytics", "Auto-Inventory Management", "Custom branding", "Priority alerts"],
                icon: <Zap className="w-6 h-6 text-indigo-600" />,
                cta: language === 'ar' ? "احصل على برو" : "Get Pro Access",
                popular: true
              },
              {
                name: t('pricing.enterprise'),
                customPriceLabel: language === 'ar' ? "يحدد السعر لاحقاً" : "Custom Price (TBD)",
                desc: language === 'ar' ? "قوة كاملة للعمليات الكبيرة" : "Full power for large operations",
                features: language === 'ar' ? ["مواقع متعددة", "حسابات موظفين", "نطاق مخصص", "وصول واجهة برمجة التطبيقات", "مدير حساب"] : ["Multiple locations", "Staff accounts", "Custom domain", "API access", "Account manager"],
                icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
                cta: language === 'ar' ? "اتصل بالمبيعات" : "Contact Sales",
                popular: false
              }
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className={`relative p-8 sm:p-10 rounded-[2.5rem] border ${
                  plan.popular 
                    ? 'bg-slate-900 text-white border-slate-800 shadow-2xl shadow-indigo-100/55' 
                    : 'bg-white border-slate-100 shadow-sm'
                } flex flex-col justify-between`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                    {t('pricing.popular')}
                  </div>
                )}

                {plan.tag && (
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap shadow-lg shadow-indigo-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {plan.tag}
                  </motion.div>
                )}
                
                <div>
                  <div className="mb-8 flex justify-between items-start">
                    <div>
                      <h3 className={`text-xl sm:text-2xl font-black mb-2 ${plan.popular ? 'text-[#e3dada]' : ''}`}>{plan.name}</h3>
                      <p className={`${plan.popular ? 'text-slate-400' : 'text-slate-400'} font-bold text-xs`}>{plan.desc}</p>
                    </div>
                    <div className={`${plan.popular ? 'bg-white/10' : 'bg-slate-50'} p-2.5 rounded-xl`}>
                      {plan.icon}
                    </div>
                  </div>

                  <div className="mb-8 flex items-baseline gap-2">
                    {'customPriceLabel' in plan ? (
                      <span className="text-xl sm:text-2xl font-black text-indigo-600">{plan.customPriceLabel}</span>
                    ) : (
                      <>
                        <span className="text-4xl sm:text-5xl font-black text-indigo-600">{plan.price}</span>
                        <span className={`${plan.popular ? 'text-slate-400' : 'text-slate-400'} font-black text-xs`}>{t('pricing.month')}</span>
                      </>
                    )}
                  </div>

                  <div className="space-y-4 mb-8">
                    {plan.features.map((feat, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${plan.popular ? 'bg-indigo-500 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                          <Check className="w-2.5 h-2.5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold opacity-90">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to="/register"
                  className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all block text-center ${
                    plan.popular 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.03] active:scale-95 shadow-lg shadow-indigo-900/30' 
                      : 'bg-slate-900 text-white hover:bg-indigo-600'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Participating Stores Section */}
      <FeaturedStores />
      
      {/* CSS Selector 3 Target Area: Elegant Rich Footer */}
      <footer className="bg-indigo-900 text-slate-300 border-t border-indigo-950/40 pt-20 pb-12 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-indigo-950/40">
            {/* Branding Column */}
            <div className="md:col-span-5 space-y-4 text-center md:text-left rtl:md:text-right">
              <h2 className="text-3xl font-black text-white tracking-tight flex items-center justify-center md:justify-start">
                <img src="/logo-text.png" alt="Jareeb" className="h-10 w-auto object-contain brightness-0 invert" />
              </h2>
              <p className="text-slate-400 font-medium text-xs sm:text-sm leading-relaxed max-w-sm">
                {language === 'ar' 
                  ? 'منصة ذكية تمكّن أصحاب المشاريع المنزلية من إنشاء متجر إلكتروني احترافي، إدارة الطلبات، واستقبال المدفوعات بكل سهولة.' 
                  : 'A smart platform that enables home business owners to create a professional online store, manage orders, and accept payments with ease.'}
              </p>
              {/* Regional Footprint Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-950/60 border border-indigo-850/10 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-wider">
                🌍 {language === 'ar' ? 'المنامة، البحرين - دول الخليج' : 'Manama, Bahrain - GCC Region'}
              </div>
            </div>

            {/* Platform Links Column */}
            <div className="md:col-span-3 text-center md:text-left rtl:md:text-right space-y-4">
              <h4 className="text-slate-200 text-[11px] font-black uppercase tracking-widest">
                {language === 'ar' ? 'المنصة' : 'Platform'}
              </h4>
              <ul className="space-y-2.5 text-xs font-bold text-slate-400">
                <li>
                  <Link to="/register" className="hover:text-indigo-400 transition-colors">
                    {language === 'ar' ? 'سجل كتاجر جديد' : 'Register Merchant'}
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-indigo-400 transition-colors">
                    {language === 'ar' ? 'دخول لوحة التحكم' : 'Vendor Login'}
                  </Link>
                </li>
                <li>
                  <a href="#simulator" className="hover:text-indigo-400 transition-colors">
                    {language === 'ar' ? 'تجربة المحاكاة التفاعلية' : 'Try Demo Simulator'}
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal & Help Column */}
            <div className="md:col-span-4 text-center md:text-left rtl:md:text-right space-y-4">
              <h4 className="text-slate-200 text-[11px] font-black uppercase tracking-widest">
                {language === 'ar' ? 'الدعم والروابط القانونية' : 'Legal & Support'}
              </h4>
              <ul className="space-y-2.5 text-xs font-bold text-slate-400">
                <li>
                  <Link to="/privacy" className="hover:text-indigo-400 transition-colors">
                    {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-indigo-400 transition-colors">
                    {language === 'ar' ? 'شروط الخدمة والاستخدام' : 'Terms of Service'}
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-indigo-400 transition-colors">
                    {language === 'ar' ? 'تواصل معنا / الدعم الفني' : 'Contact Support'}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright Row */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              © 2026 Jareeb. All rights reserved.
            </div>
            
            <div className="flex items-center gap-1.5 text-[9px] text-slate-600 font-bold uppercase tracking-wider">
              <span>🚀 {language === 'ar' ? 'استلام ذكي وسريع' : 'Smart Curbside Delivery'}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeaturedStores() {
  const { language, isRTL } = useLanguage();
  const [stores, setStores] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'premium'>('all');

  useEffect(() => {
    const q = query(collection(db, 'vendors'), limit(9));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return null;
  if (stores.length === 0) return null;

  // Re-ordering & Filtering logic to satisfy "re-arrange stores and present beautifully"
  const processedStores = stores
    .filter(store => {
      // 0. Visibility check
      if (store.isPublic === false) return false;

      // 1. Search term match
      const nameMatch = store.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const descMatch = store.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSearch = nameMatch || descMatch;
      
      // 2. Tab filtering
      if (filterTab === 'premium') {
        return matchesSearch && (store.plan === 'pro' || store.plan === 'enterprise');
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      // Priority sorting logic to arrange beautifully:
      // First priority: Plan status (Enterprise > Pro > Starter/undefined)
      const planScore = (p?: string) => p === 'enterprise' ? 3 : p === 'pro' ? 2 : 1;
      const scoreDiff = planScore(b.plan) - planScore(a.plan);
      if (scoreDiff !== 0) return scoreDiff;

      // Second priority: Has logo
      const aLogo = a.logoUrl ? 1 : 0;
      const bLogo = b.logoUrl ? 1 : 0;
      if (bLogo !== aLogo) return bLogo - aLogo;

      // Third priority: name alphabetical
      return (a.name || '').localeCompare(b.name || '');
    });

  return (
    <section className="py-24 bg-gradient-to-b from-slate-50/40 via-white to-slate-50/20 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-emerald-100/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-100/10 rounded-full blur-3xl pointer-events-none" />

      {/* CSS Selector 2 Target Area: Main Inner Wrapper */}
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* CSS Selector 1 Target Area: Title Header block */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 gap-8 border-b border-slate-100 pb-10">
          <div className="text-left rtl:text-right space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {language === 'ar' ? 'مجتمع مباشر' : 'Live Community'}
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
              {language === 'ar' ? 'المتاجر المباشرة المشتركة' : 'Participating Stores'}
            </h2>
            <p className="text-slate-500 font-medium text-sm sm:text-base leading-relaxed">
              {language === 'ar' 
                ? 'انضم إلى مجتمع متزايد من الشركات المحلية المتميزة واستمتع بتجربة استلام سريعة.' 
                : 'Browse exceptional local stores offering premium curbside pickup handoffs.'}
            </p>
          </div>

          {/* Search and Filters to re-arrange/control stores list */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'ابحث عن متجر...' : 'Search store...'}
                className="w-full sm:w-64 px-5 py-3 rounded-2xl border border-slate-200 outline-none text-xs font-bold text-slate-700 bg-white placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Premium Filter Toggle Tabs */}
            <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  filterTab === 'all'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {language === 'ar' ? 'الكل' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('premium')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  filterTab === 'premium'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-200/50'
                    : 'text-slate-500 hover:text-amber-600'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>{language === 'ar' ? 'المتميزة ⭐' : 'Premium ⭐'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Inner Grid for stores */}
        <div className="min-h-[200px]">
          {processedStores.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-slate-200 p-8"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4">
                <Store className="w-8 h-8" />
              </div>
              <h4 className="text-base font-black text-slate-800 mb-1">
                {language === 'ar' ? 'لم يتم العثور على نتائج' : 'No stores found'}
              </h4>
              <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
                {language === 'ar' ? 'يرجى تجربة كلمة بحث مختلفة أو تصفح المتاجر الأخرى.' : 'Try search term or filter parameters.'}
              </p>
            </motion.div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {processedStores.map((store, idx) => {
                const isPremium = store.plan === 'pro' || store.plan === 'enterprise';
                return (
                  <motion.div
                    key={store.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.4 }}
                    whileHover={{ y: -6 }}
                    className={`group bg-white p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col justify-between min-h-[250px] relative overflow-hidden ${
                      isPremium 
                        ? 'border-amber-200/80 shadow-md shadow-amber-50/50 hover:shadow-2xl hover:shadow-amber-100/40 hover:border-amber-400' 
                        : 'border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/20 hover:border-indigo-200'
                    }`}
                  >
                    {/* Glowing highlight for premium partner stores */}
                    {isPremium && (
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
                    )}

                    <div>
                      <div className="flex justify-between items-start mb-6">
                        {/* Logo Block with hover effect */}
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden p-0.5 border border-slate-100 group-hover:scale-105 transition-transform duration-500 flex items-center justify-center shadow-inner">
                          {store.logoUrl ? (
                            <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover rounded-xl animate-fade-in" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center font-black text-xl rounded-xl ${
                              isPremium 
                                ? 'bg-amber-50 text-amber-700' 
                                : 'bg-indigo-50 text-indigo-700'
                            }`}>
                              {(store.name || 'M').charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* Status / Plan Badges */}
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="bg-emerald-50 px-3 py-1 rounded-full text-[9px] font-black text-emerald-600 flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {language === 'ar' ? 'نشط' : 'ACTIVE'}
                          </div>
                          
                          {isPremium && (
                            <div className="bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                              <Sparkles className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                              <span>{language === 'ar' ? 'متميز' : 'PRO'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Store name and description */}
                      <h3 className="text-xl font-black text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors duration-300">
                        {store.name}
                      </h3>
                      <p className="text-slate-400 text-xs sm:text-sm font-medium line-clamp-2 leading-relaxed mb-4">
                        {store.description || (language === 'ar' ? 'تجربة استلام عصرية للمفضلات المحلية.' : 'Modern curbside experience for local favorites.')}
                      </p>
                    </div>
                    
                    {/* Handoff preferences snippet */}
                    {store.pickupDetails && (
                      <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] text-slate-500 font-bold leading-relaxed line-clamp-1">
                        🚗 {store.pickupDetails}
                      </div>
                    )}
                    
                    {/* Action footer */}
                    <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                      <Link 
                        to={`/store/${store.slug}`}
                        className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                          isPremium 
                            ? 'text-amber-600 group-hover:text-amber-800' 
                            : 'text-indigo-600 group-hover:text-indigo-800'
                        }`}
                      >
                        {language === 'ar' ? 'تسوق الآن' : 'Shop Now'} 
                        <ChevronRight className={`w-4 h-4 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180' : ''}`} />
                      </Link>
                      
                      <div className="flex items-center gap-1 text-slate-300 group-hover:text-slate-400 transition-colors">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {store.location || (language === 'ar' ? 'محلي' : 'Local')}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

