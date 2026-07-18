/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Vendor, Product, Order, OrderStatus, ProductCategory } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Package, Clock, CheckCircle2, MapPin, Globe, CreditCard, Bell, ChevronRight, Trash2, Car, Pencil, CupSoda, ShoppingBag, ShoppingCart, Instagram, Image as ImageIcon, Save, Phone, User as UserIcon, Printer, History, Zap, Crown, Store, Sparkles, Lock, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '../lib/i18n';
import CustomersPanel from '../components/CustomersPanel';
import ImageEnhancer from '../components/ImageEnhancer';


interface DashboardProps {
  user: User;
}

export default function VendorDashboard({ user }: DashboardProps) {
  const { t, language, isRTL } = useLanguage();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'settings' | 'history' | 'membership' | 'customers'>('orders');
  const [loading, setLoading] = useState(true);
  
  // Setup state
  const [setupData, setSetupData] = useState({ name: '', slug: '', iban: '' });
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Expired state handlers
  const [expiredUpgradingPlanId, setExpiredUpgradingPlanId] = useState<string | null>(null);
  const [expiredSuccessMsg, setExpiredSuccessMsg] = useState("");

  // Active upgrade plan from order source of truth fallback
  const [activeUpgradePlan, setActiveUpgradePlan] = useState<string | null>(null);
  
  // Real-time Sound Alerts Toggle Control
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem('jareeb_sound_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const playNotificationChime = () => {
    if (!soundEnabledRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        
        gainNode.gain.setValueAtTime(0.15, start);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + duration);
      };
      
      const now = ctx.currentTime;
      playTone(523.25, now, 0.3); // C5
      playTone(659.25, now + 0.12, 0.3); // E5
      playTone(783.99, now + 0.24, 0.4); // G5
    } catch (e) {
      console.error('Failed to play notification chime:', e);
    }
  };

  const playArrivalChime = () => {
    if (!soundEnabledRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        
        gainNode.gain.setValueAtTime(0.2, start);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + duration);
      };
      
      const now = ctx.currentTime;
      playTone(880, now, 0.15); // A5
      playTone(880, now + 0.18, 0.15); // A5 double beep
    } catch (e) {
      console.error('Failed to play arrival chime:', e);
    }
  };

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    try {
      localStorage.setItem('jareeb_sound_enabled', String(newVal));
    } catch {}
    if (newVal) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const [knownPendingOrders, setKnownPendingOrders] = useState<Set<string>>(new Set());

  // Notifications
  const [lastOrderArrived, setLastOrderArrived] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProducts: (() => void) | null = null;
    let unsubscribeOrders: (() => void) | null = null;

    const vendorQuery = query(collection(db, 'vendors'), where('uid', '==', user.uid));
    
    const unsubscribeVendor = onSnapshot(vendorQuery, (snapshot) => {
      if (!snapshot.empty) {
        const vendorData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Vendor;
        setVendor(vendorData);
        
        // Cleanup old sub-listeners if they exist
        if (unsubscribeProducts) unsubscribeProducts();
        if (unsubscribeOrders) unsubscribeOrders();

        // Load products
        const pq = query(collection(db, 'products'), where('vendorId', '==', vendorData.id));
        unsubscribeProducts = onSnapshot(pq, (pSnap) => {
          setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Product));
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'products');
        });

        // Load orders (Real-time)
        const oq = query(
          collection(db, 'orders'), 
          where('vendorId', '==', vendorData.id),
          orderBy('createdAt', 'desc')
        );
        unsubscribeOrders = onSnapshot(oq, async (oSnap) => {
          const allOrders = oSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Order);
          
          // Handle real-time administrative plan upgrades in the background
          const upgradeOrders = allOrders.filter(o => o.customerName === "SYSTEM_ADMIN_UPGRADE");
          const realOrders = allOrders.filter(o => o.customerName !== "SYSTEM_ADMIN_UPGRADE");
          
          setOrders(realOrders);

          // Find the latest approved upgrade order to override active plan state in real-time
          const approvedUpgrades = upgradeOrders.filter(o => o.status === 'upgrade_approved');
          if (approvedUpgrades.length > 0) {
            approvedUpgrades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setActiveUpgradePlan(approvedUpgrades[0].newPlan || 'pro');
          } else {
            setActiveUpgradePlan(null);
          }
          
          for (const upgradeOrder of upgradeOrders) {
            if (upgradeOrder.status === 'upgrade_approved') {
              const requestedPlan = upgradeOrder.newPlan || 'pro';
              try {
                // Try to update the vendor document directly
                await updateDoc(doc(db, 'vendors', vendorData.id), {
                  plan: requestedPlan,
                  subscriptionStatus: 'active',
                  subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                });
                // If direct update succeeds, delete the processed trigger order
                await deleteDoc(doc(db, 'orders', upgradeOrder.id));
              } catch (upgradeErr) {
                // If it fails (due to schema/rules constraints), log a warning but keep the order
                // because the UI will fallback to reading the upgrade plan from the order itself.
                console.warn('Failed to automatically apply plan upgrade to vendors collection. Keeping order as persistent source of truth.', upgradeErr);
              }
            }
          }
          
          // Check for new arrivals
          const arrived = realOrders.find(o => o.status === 'arrived');
          if (arrived) {
            setLastOrderArrived(prev => {
              if (arrived.id !== prev) {
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Customer Arrived!', { body: `${arrived.customerName} is outside.` });
                }
                playArrivalChime();
                return arrived.id;
              }
              return prev;
            });
          }

          // Check for new pending orders
          const pending = realOrders.filter(o => o.status === 'pending');
          const newPending = pending.filter(o => !knownPendingOrders.has(o.id));
          if (newPending.length > 0) {
            playNotificationChime();
          }
          setKnownPendingOrders(new Set(pending.map(o => o.id)));
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'orders');
        });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'vendors');
      setLoading(false);
    });

    if ('Notification' in window) {
      Notification.requestPermission();
    }

    return () => {
      unsubscribeVendor();
      if (unsubscribeProducts) unsubscribeProducts();
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, [user.uid, knownPendingOrders]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingUp(true);
    try {
      const vendorRef = doc(collection(db, 'vendors'));
      await setDoc(vendorRef, {
        uid: user.uid,
        ...setupData,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'vendors');
    } finally {
      setIsSettingUp(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">{language === 'ar' ? 'جاري التحميل...' : 'Loading Dashboard...'}</div>;

  const todayRevenue = orders
    .filter(o => o.status === 'completed' && new Date(o.createdAt).toDateString() === new Date().toDateString())
    .reduce((acc, curr) => acc + curr.total, 0);

  const resolvedVendor = vendor ? { 
    ...vendor, 
    plan: activeUpgradePlan || vendor.plan || 'starter',
    subscriptionStatus: activeUpgradePlan ? 'active' : (vendor.subscriptionStatus || 'Active')
  } : null;

  const isExpired = resolvedVendor && (
    resolvedVendor.subscriptionStatus === 'expired' || 
    (resolvedVendor.subscriptionEndDate && new Date(resolvedVendor.subscriptionEndDate) < new Date())
  );

  const handleExpiredUpgrade = async (planId: string) => {
    if (!resolvedVendor) return;
    setExpiredUpgradingPlanId(planId);
    setExpiredSuccessMsg("");
    try {
      await updateDoc(doc(db, 'vendors', resolvedVendor.id), {
        plan: planId,
        subscriptionStatus: 'active',
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      setExpiredSuccessMsg(language === 'ar' ? 'تمت الترقية وتنشيط المتجر بنجاح!' : 'Store activated and upgraded successfully!');
    } catch (error) {
      console.error("Expired upgrade error:", error);
    } finally {
      setExpiredUpgradingPlanId(null);
    }
  };

  if (resolvedVendor && isExpired) {
    const plans = [
      { 
        id: 'starter', 
        name: language === 'ar' ? 'باقة البداية' : 'Starter Plan',
        price: '5',
        features: language === 'ar' ? ['حتى 10 منتجات', 'لوحة تحكم أساسية', 'رابط متجر مباشر'] : ['Up to 10 products', 'Basic dashboard', 'Live store URL'],
        icon: <Store className="w-5 h-5" />,
        color: 'bg-slate-100 text-slate-600'
      },
      { 
        id: 'pro', 
        name: language === 'ar' ? 'باقة برو' : 'Pro Access',
        price: '15',
        features: language === 'ar' ? ['منتجات غير محدودة', 'قاعدة بيانات عملاء ذكية', 'تحليلات متقدمة', 'تحديث المخزن التلقائي', 'أداة تحسين الصور بالذكاء الاصطناعي'] : ['Unlimited products', 'Smart Customer Database & CRM', 'Advanced analytics', 'Auto-Inventory', 'AI Image Studio'],
        icon: <Zap className="w-5 h-5" />,
        color: 'bg-indigo-100 text-indigo-600',
        popular: true
      },
      { 
        id: 'enterprise', 
        name: language === 'ar' ? 'باقة الشركات' : 'Enterprise',
        customPriceLabel: language === 'ar' ? 'يحدد السعر لاحقاً' : 'Custom Price (TBD)',
        features: language === 'ar' ? ['مواقع متعددة', 'حسابات موظفين', 'نطاق مخصص', 'أداة تحسين الصور بالذكاء الاصطناعي'] : ['Multiple locations', 'Staff accounts', 'Custom domain', 'AI Image Studio'],
        icon: <Crown className="w-5 h-5" />,
        color: 'bg-amber-100 text-amber-600'
      }
    ];

    return (
      <div className="max-w-5xl mx-auto px-4 py-12 rtl:text-right">
        {/* Sleek Header */}
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-amber-500/10 items-center justify-center text-amber-600 shadow-md">
            <Zap className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {language === 'ar' ? 'انتهت فترة الاشتراك أو التجربة المجانية 🔒' : 'Trial Period or Active Subscription Expired 🔒'}
          </h1>
          <p className="text-slate-500 font-medium text-sm max-w-2xl mx-auto leading-relaxed">
            {language === 'ar' 
              ? `عذراً، انتهت صلاحية متجرك (${resolvedVendor.name}). لوحة التحكم معطلة مؤقتاً حتى يتم تجديد الاشتراك أو الترقية لمتابعة استقبال الطلبات المباشرة والاستلام بسلاسة.` 
              : `Your store (${resolvedVendor.name}) has expired. Dashboard access is temporarily restricted until you renew or upgrade to continue receiving and managing live curbside orders.`}
          </p>
        </div>

        {/* Warning card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-[2rem] p-6 mb-10 flex flex-col sm:flex-row items-center gap-4 text-slate-700">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-600 shrink-0 shadow-inner">
            <Clock className="w-6 h-6" />
          </div>
          <div className="flex-1 text-center sm:text-left rtl:sm:text-right space-y-1">
            <h4 className="font-bold text-slate-800">
              {language === 'ar' ? 'مطلوب تجديد الاشتراك لتنشيط المتجر' : 'Subscription Renewal Required'}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {language === 'ar' 
                ? 'اختر إحدى الباقات المميزة أدناه لتفعيل حسابك فوراً واستعادة صلاحيات لوحة التحكم الكاملة.' 
                : 'Choose one of our tailored plans below to instantly restore full dashboard access and reactivate your store.'}
            </p>
            {resolvedVendor.subscriptionEndDate && (
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700/80 mt-1">
                {language === 'ar' ? 'انتهى في: ' : 'Expired on: '}
                {(() => {
                  try {
                    return format(new Date(resolvedVendor.subscriptionEndDate), 'PPP');
                  } catch {
                    return resolvedVendor.subscriptionEndDate;
                  }
                })()}
              </p>
            )}
          </div>
        </div>

        {expiredSuccessMsg && (
          <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl font-semibold text-sm text-center">
            {expiredSuccessMsg}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map(plan => {
            const isCurrent = resolvedVendor.plan === plan.id || (!resolvedVendor.plan && plan.id === 'starter');
            const isUpgradingThis = expiredUpgradingPlanId === plan.id;
            return (
              <div 
                key={plan.id}
                className={`relative p-8 rounded-[2.5rem] border bg-white transition-all shadow-sm flex flex-col ${
                  plan.popular 
                  ? 'border-indigo-600 ring-4 ring-indigo-50 md:scale-105 z-10 shadow-lg shadow-indigo-100' 
                  : 'border-slate-100 hover:border-slate-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                    {language === 'ar' ? 'الباقة الأكثر شعبية' : 'Most Popular'}
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-5 justify-between rtl:flex-row-reverse">
                  <div className="flex items-center gap-3 rtl:flex-row-reverse">
                    <div className={`p-2.5 rounded-xl ${plan.color}`}>
                      {plan.icon}
                    </div>
                    <h4 className="font-black text-slate-800">{plan.name}</h4>
                  </div>
                  {isCurrent && (
                    <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {language === 'ar' ? 'السابقة' : 'Previous'}
                    </span>
                  )}
                </div>

                <div className="mb-6 rtl:text-right">
                  {'customPriceLabel' in plan ? (
                    <span className="text-xl font-black text-slate-800">{plan.customPriceLabel}</span>
                  ) : (
                    <div className="flex items-baseline gap-1 rtl:flex-row-reverse">
                      <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                      <span className="text-xs font-bold text-slate-400">BHD/{language === 'ar' ? 'شهر' : 'mo'}</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((f, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 text-xs font-medium text-slate-500 rtl:flex-row-reverse">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="rtl:text-right">{f}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => handleExpiredUpgrade(plan.id)}
                  disabled={expiredUpgradingPlanId !== null}
                  className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50 ${
                    plan.popular
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isUpgradingThis 
                    ? (language === 'ar' ? 'جاري التنشيط...' : 'Activating...') 
                    : (language === 'ar' ? 'تفعيل الحساب الآن' : 'Activate Account Now')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!resolvedVendor) {
    return (
      <div className="max-w-xl mx-auto mt-20 p-8 bg-white rounded-3xl shadow-xl border border-slate-100 rtl:text-right">
        <h2 className="text-3xl font-bold mb-6">{language === 'ar' ? 'إعداد متجرك' : 'Setup Your Store'}</h2>
        <form onSubmit={handleSetup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ar' ? 'اسم المتجر' : 'Store Name'}</label>
            <input
              required
              type="text"
              value={setupData.name}
              onChange={e => setSetupData({...setupData, name: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-right rtl:text-right"
              placeholder={language === 'ar' ? 'اسم متجرك المميز' : 'My Awesome Bakery'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ar' ? 'رابط المتجر (Slug)' : 'Store URL (Slug)'}</label>
            <div className="flex rtl:flex-row-reverse">
              <span className="px-4 py-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-500 rtl:rounded-l-none rtl:rounded-r-xl rtl:border-l-0 rtl:border-r">/store/</span>
              <input
                required
                type="text"
                value={setupData.slug}
                onChange={e => setSetupData({...setupData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                className="flex-1 px-4 py-3 rounded-r-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none rtl:rounded-r-none rtl:rounded-l-xl text-right rtl:text-right"
                placeholder="bakery-name"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ar' ? 'رقم الحساب (IBAN) للدفع' : 'IBAN for Payments'}</label>
            <input
              required
              type="text"
              value={setupData.iban}
              onChange={e => setSetupData({...setupData, iban: e.target.value.toUpperCase()})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-right rtl:text-right"
              placeholder="SA00 0000 0000 0000 0000 0000"
            />
          </div>
          <button
            disabled={isSettingUp}
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isSettingUp ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...') : (language === 'ar' ? 'إنشاء المتجر' : 'Create Store')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Sleek Header & Audio Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 rtl:flex-row-reverse text-right rtl:text-right border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 rtl:flex-row-reverse">
            {language === 'ar' ? `أهلاً بك، ${resolvedVendor.name} 👋` : `Welcome back, ${resolvedVendor.name} 👋`}
          </h1>
          <p className="text-slate-400 font-medium text-sm mt-1">
            {language === 'ar' ? 'لوحة تحكم جريب لإدارة الطلبات المباشرة والاستلام بسلاسة.' : 'Jareeb dashboard for managing direct incoming orders and real-time handoffs.'}
          </p>
        </div>
        
        {/* Real-time Controls Header (Sound Alerts & Store Status) */}
        <div className="flex flex-wrap items-center gap-3 justify-end sm:justify-start rtl:justify-end">
          {/* Real-time Sound Alerts Toggle Control */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleSound}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all font-black text-xs uppercase tracking-wider ${
              soundEnabled 
                ? 'bg-indigo-50 border-indigo-100 text-indigo-700 shadow-sm' 
                : 'bg-rose-50 border-rose-100 text-rose-600'
            }`}
          >
            {soundEnabled ? (
              <>
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </div>
                <span>{language === 'ar' ? 'تنبيهات رنين الطلبات: نشطة 🔔' : 'Sound Alerts: Active 🔔'}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>{language === 'ar' ? 'تنبيهات رنين الطلبات: معطلة 🔇' : 'Sound Alerts: Disabled 🔇'}</span>
              </>
            )}
          </motion.button>

          {/* Store Open/Closed Toggle - Restricted to Pro Plans and above */}
          {(() => {
            const isProOrAbove = resolvedVendor.plan === 'pro' || resolvedVendor.plan === 'enterprise';
            const isClosed = !!resolvedVendor.isClosedByUser;
            
            if (!isProOrAbove) {
              return (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    alert(language === 'ar' 
                      ? '🔒 ميزة إغلاق المتجر مؤقتاً متوفرة فقط للمشتركين في باقة برو (Pro Access) أو أعلى. يمكنك الترقية من تبويب "العضوية والخطط" بالأسفل!' 
                      : '🔒 The temporary store closure feature is exclusive to Pro Access subscribers or higher. You can upgrade in the "Membership" tab below!'
                    );
                    setActiveTab('membership');
                  }}
                  className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {language === 'ar' ? 'إغلاق المتجر مؤقتاً (باقة برو) 🔒' : 'Temporary Closure (Pro Plan) 🔒'}
                  </span>
                </motion.button>
              );
            }

            return (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'vendors', resolvedVendor.id), {
                      isClosedByUser: !isClosed
                    });
                  } catch (err) {
                    console.error("Error toggling store status:", err);
                  }
                }}
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all font-black text-xs uppercase tracking-wider ${
                  isClosed 
                    ? 'bg-rose-50 border-rose-100 text-rose-700 shadow-sm shadow-rose-100' 
                    : 'bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm shadow-emerald-100'
                }`}
              >
                {isClosed ? (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                    <span>{language === 'ar' ? 'المحل: مغلق مؤقتاً 🔴' : 'Store: Temporarily Closed 🔴'}</span>
                  </>
                ) : (
                  <>
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <span>{language === 'ar' ? 'المحل: مفتوح ومتاح للطلب 🟢' : 'Store: Open for Orders 🟢'}</span>
                  </>
                )}
              </motion.button>
            );
          })()}
        </div>
      </div>

      {/* Header Stat Cards (Bento) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 rtl:flex-row-reverse">
        <div className="sleek-card p-6 rtl:text-right">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{language === 'ar' ? 'إيرادات اليوم' : "Today's Revenue"}</p>
          <div className="flex items-end gap-2 rtl:flex-row-reverse">
            <p className="text-3xl font-black text-slate-800 tracking-tighter">BHD {todayRevenue.toFixed(2)}</p>
          </div>
        </div>
        <div className="sleek-card p-6 border-l-4 border-l-indigo-600 rtl:border-l-0 rtl:border-r-4 rtl:border-r-indigo-600 rtl:text-right">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{language === 'ar' ? 'الطلبات المعلقة' : 'Pending Orders'}</p>
          <p className="text-3xl font-black text-slate-800 tracking-tighter">{orders.filter(o => o.status === 'pending').length}</p>
        </div>
        <div className="sleek-card p-6 rtl:text-right">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{language === 'ar' ? 'إجمالي المنتجات' : 'Total Products'}</p>
          <p className="text-3xl font-black text-slate-800 tracking-tighter">{products.length}</p>
        </div>
        <div className="sleek-card p-6 bg-slate-900 text-white border-none shadow-indigo-200 rtl:text-right">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{language === 'ar' ? 'رابط المتجر' : 'Store Link'}</p>
          <p className="text-sm font-mono truncate mb-2 text-slate-300">/store/{resolvedVendor.slug}</p>
          <div className="flex gap-2 rtl:flex-row-reverse">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/store/${resolvedVendor.slug}`);
                alert(language === 'ar' ? 'تم النسخ!' : 'Copied!');
              }}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-700"
            >
              {language === 'ar' ? 'نسخ' : 'Copy'}
            </button>
            <a 
              href={`/store/${resolvedVendor.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold transition-colors text-center"
            >
              {language === 'ar' ? 'عرض مباشر' : 'View Live'}
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar/Mobile Nav */}
        <div className="col-span-12 lg:col-span-3">
          <div className="lg:block overflow-x-auto whitespace-nowrap lg:space-y-1 pb-4 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
          {[
            { id: 'orders', label: language === 'ar' ? 'طلبات مباشرة' : 'Live Orders', icon: <Clock className="w-4 h-4" /> },
            { id: 'history', label: language === 'ar' ? 'سجل الطلبات' : 'Order History', icon: <History className="w-4 h-4" /> },
            { id: 'products', label: language === 'ar' ? 'المنتجات' : 'Products', icon: <Package className="w-4 h-4" /> },
            { id: 'customers', label: language === 'ar' ? 'قاعدة العملاء' : 'Customer Database', icon: <UserIcon className="w-4 h-4" /> },
            { id: 'membership', label: language === 'ar' ? 'العضوية والخطط' : 'Membership', icon: <CreditCard className="w-4 h-4" /> },
            { id: 'settings', label: language === 'ar' ? 'الإعدادات' : 'Settings', icon: <Globe className="w-4 h-4" /> },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`inline-flex lg:flex items-center gap-3 px-4 py-3 lg:w-full rounded-xl font-bold text-sm transition-all rtl:flex-row-reverse mr-2 lg:mr-0 ${
                activeTab === item.id 
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm' 
                : 'text-slate-500 bg-white hover:bg-white hover:text-slate-800'
              }`}
            >
              {item.icon}
              {item.label}
              {item.id === 'orders' && orders.filter(o => o.status === 'arrived').length > 0 && (
                <span className="mr-auto rtl:ml-auto w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="col-span-12 lg:col-span-9 space-y-8">
          {/* Arrival Alert Section */}
          <AnimatePresence>
            {orders.filter(o => o.status === 'arrived').map(order => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-rose-500 rounded-3xl p-6 text-white shadow-2xl ring-8 ring-rose-500/10 relative overflow-hidden mb-6"
              >
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] uppercase tracking-tighter bg-rose-600 px-2 py-0.5 rounded font-black">Arrival Now / وصلت الآن</span>
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    </div>
                    <h3 className="text-3xl font-black mb-1">{order.carDetails?.type}</h3>
                    <p className="text-rose-100 text-sm italic">{order.customerName} is waiting outside</p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col border border-white/20">
                      <span className="text-[10px] uppercase text-rose-200 font-bold mb-1">Plate / اللوحة</span>
                      <span className="text-2xl font-mono font-black tracking-widest">{order.carDetails?.plate}</span>
                    </div>
                    
                    <button 
                      onClick={() => updateDoc(doc(db, 'orders', order.id), { status: 'completed' })}
                      className="h-full px-8 bg-white text-rose-600 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 hover:bg-rose-50 transition-all active:scale-95"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Handed Over
                    </button>
                  </div>
                </div>
                {/* Decorative car icon */}
                <Car className="absolute -right-8 -bottom-8 w-48 h-48 text-rose-400 opacity-20" />
              </motion.div>
            ))}
          </AnimatePresence>

          {activeTab === 'orders' && <OrdersList orders={orders.filter(o => o.status !== 'completed')} vendor={resolvedVendor} />}
          {activeTab === 'history' && <OrdersList orders={orders.filter(o => o.status === 'completed')} vendor={resolvedVendor} isHistory />}
          {activeTab === 'products' && <ProductsList vendorId={resolvedVendor.id} products={products} vendor={resolvedVendor} />}
          {activeTab === 'customers' && <CustomersPanel vendor={resolvedVendor} orders={orders} />}
          {activeTab === 'membership' && <MembershipPanel vendor={resolvedVendor} />}
          {activeTab === 'settings' && <SettingsPanel vendor={resolvedVendor} setActiveTab={setActiveTab} />}
        </div>
      </div>
    </div>
  );
}

function MembershipPanel({ vendor }: { vendor: Vendor }) {
  const { language } = useLanguage();
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  
  const handleUpgrade = async (planId: string) => {
    setUpgradingPlanId(planId);
    setSuccessMsg("");
    try {
      await updateDoc(doc(db, 'vendors', vendor.id), {
        plan: planId,
        subscriptionStatus: 'active',
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      setSuccessMsg(language === 'ar' ? 'تمت الترقية بنجاح!' : 'Plan upgraded successfully!');
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (error) {
      console.error("Upgrade error:", error);
    } finally {
      setUpgradingPlanId(null);
    }
  };
  
  const plans = [
    { 
      id: 'starter', 
      name: language === 'ar' ? 'باقة البداية' : 'Starter Plan',
      price: '5',
      features: language === 'ar' ? ['حتى 10 منتجات', 'لوحة تحكم أساسية', 'رابط متجر مباشر'] : ['Up to 10 products', 'Basic dashboard', 'Live store URL'],
      icon: <Store className="w-5 h-5" />,
      color: 'bg-slate-100 text-slate-600'
    },
    { 
      id: 'pro', 
      name: language === 'ar' ? 'باقة برو' : 'Pro Access',
      price: '15',
      features: language === 'ar' ? ['منتجات غير محدودة', 'قاعدة بيانات عملاء ذكية', 'تحليلات متقدمة', 'تحديث المخزن التلقائي', 'أداة تحسين الصور بالذكاء الاصطناعي'] : ['Unlimited products', 'Smart Customer Database & CRM', 'Advanced analytics', 'Auto-Inventory', 'AI Image Studio'],
      icon: <Zap className="w-5 h-5" />,
      color: 'bg-indigo-100 text-indigo-600',
      popular: true
    },
    { 
      id: 'enterprise', 
      name: language === 'ar' ? 'باقة الشركات' : 'Enterprise',
      customPriceLabel: language === 'ar' ? 'يحدد السعر لاحقاً' : 'Custom Price (TBD)',
      features: language === 'ar' ? ['مواقع متعددة', 'حسابات موظفين', 'نطاق مخصص', 'أداة تحسين الصور بالذكاء الاصطناعي'] : ['Multiple locations', 'Staff accounts', 'Custom domain', 'AI Image Studio'],
      icon: <Crown className="w-5 h-5" />,
      color: 'bg-amber-100 text-amber-600'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 rtl:flex-row-reverse mb-8">
          <div className="rtl:text-right">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {language === 'ar' ? 'إدارة العضوية' : 'Membership Control'}
            </h3>
            <p className="text-slate-400 font-medium text-sm">
              {language === 'ar' ? 'تحكم في باقة اشتراكك والمميزات المفعلة لمتجرك' : 'Manage your subscription and active features for your store'}
            </p>
          </div>
          
          <div className={`px-6 py-3 rounded-2xl flex items-center gap-3 border ${
            vendor.plan === 'pro' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
            vendor.plan === 'enterprise' ? 'bg-amber-50 border-amber-100 text-amber-700' :
            'bg-slate-50 border-slate-100 text-slate-600'
          }`}>
            <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest">
              {language === 'ar' ? 'الحالة:' : 'Status:'} {vendor.subscriptionStatus || 'Active'}
            </span>
          </div>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl font-semibold text-sm text-center">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => {
            const isCurrent = vendor.plan === plan.id || (!vendor.plan && plan.id === 'starter');
            const isUpgradingThis = upgradingPlanId === plan.id;
            return (
              <div 
                key={plan.id}
                className={`relative p-6 rounded-3xl border transition-all ${
                  isCurrent 
                  ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-xl' 
                  : 'border-slate-100 bg-slate-50/50 hover:border-slate-300'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                    {language === 'ar' ? 'باقتك الحالية' : 'Current Plan'}
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-4 rtl:flex-row-reverse">
                  <div className={`p-2 rounded-xl ${plan.color}`}>
                    {plan.icon}
                  </div>
                  <h4 className="font-black text-slate-800 rtl:text-right">{plan.name}</h4>
                </div>

                <div className="mb-6 rtl:text-right">
                  {'customPriceLabel' in plan ? (
                    <span className="text-xl font-black text-slate-800">{plan.customPriceLabel}</span>
                  ) : (
                    <div className="flex items-baseline gap-1 rtl:flex-row-reverse">
                      <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                      <span className="text-xs font-bold text-slate-400">BHD/{language === 'ar' ? 'شهر' : 'mo'}</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-500 rtl:flex-row-reverse">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span className="rtl:text-right">{f}</span>
                    </li>
                  ))}
                </ul>

                {!isCurrent && (
                  <button 
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgradingPlanId !== null}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {isUpgradingThis 
                      ? (language === 'ar' ? 'جاري الترقية...' : 'Upgrading...') 
                      : (language === 'ar' ? 'ترقية الآن' : 'Upgrade Now')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-indigo-200">
        <div className="rtl:text-right">
          <h4 className="text-xl font-black mb-2">{language === 'ar' ? 'هل تحتاج إلى مميزات مخصصة؟' : 'Need custom features?'}</h4>
          <p className="text-indigo-100 font-medium text-sm">
            {language === 'ar' ? 'تحدث معنا مباشرة للحصول على باقة تناسب حجم أعمالك المتزايد.' : 'Talk to us directly for a plan that fits your growing business scale.'}
          </p>
        </div>
        <button className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl whitespace-nowrap">
          {language === 'ar' ? 'تواصل مع الدعم' : 'Contact Support'}
        </button>
      </div>
    </div>
  );
}

function OrdersList({ orders, vendor, isHistory }: { orders: Order[], vendor: Vendor, isHistory?: boolean }) {
  const { t, language, isRTL } = useLanguage();
  const updateStatus = async (id: string, status: OrderStatus) => {
    await updateDoc(doc(db, 'orders', id), { status });
  };

  const printReceipt = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      alert('الرجاء السماح بالنوافذ المنبثقة لطباعة الفاتورة');
      return;
    }

    const receiptHtml = `
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>فاتورة طلب - ${order.id.slice(0, 8)}</title>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700;900&display=swap');
            @page { margin: 0; }
            body { 
              font-family: 'Noto Sans Arabic', sans-serif; 
              padding: 20px; 
              max-width: 300px; 
              margin: 0 auto; 
              color: #000;
              font-size: 12px;
              line-height: 1.4;
            }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .store-name { font-weight: 900; font-size: 18px; margin: 0; }
            .order-id { font-size: 10px; font-weight: bold; margin-top: 5px; }
            .section { margin-bottom: 10px; }
            .section-title { font-weight: 900; font-size: 10px; border-bottom: 1px solid #eee; margin-bottom: 5px; display: block; }
            .item { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .item-details { flex: 1; }
            .item-name { font-weight: 700; }
            .addon { font-size: 10px; color: #555; display: block; margin-right: 10px; }
            .total { border-top: 1px double #000; padding-top: 8px; margin-top: 10px; display: flex; justify-content: space-between; font-weight: 900; font-size: 16px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .info-label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="store-name">${vendor?.name || 'المتجر'}</h1>
            <div class="order-id">رقم الطلب: ${order.id.slice(0, 8).toUpperCase()}</div>
            <div style="font-size: 10px; margin-top: 4px;">
              ${new Date(order.createdAt).toLocaleString('ar-BH')}
            </div>
          </div>

          <div class="section">
            <span class="section-title">بيانات العميل</span>
            <div class="info-row">
              <span class="info-label">الاسم:</span>
              <span>${order.customerName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">الهاتف:</span>
              <span>${order.customerPhone}</span>
            </div>
          </div>

          <div class="section">
            <span class="section-title">بيانات السيارة</span>
            <div class="info-row">
              <span class="info-label">السيارة:</span>
              <span>${order.carDetails?.color || ''} ${order.carDetails?.type || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">اللوحة:</span>
              <span>${order.carDetails?.plate || ''}</span>
            </div>
          </div>

          <div class="section">
            <span class="section-title">المنتجات</span>
            ${order.items.map(item => `
              <div class="item">
                <div class="item-details">
                  <div class="item-name">${item.quantity}x ${item.name}</div>
                  ${item.selectedSize ? `<span class="addon">الحجم: ${item.selectedSize.label}</span>` : ''}
                  ${item.selectedAddons?.map(addon => `<span class="addon">+ ${addon.name}</span>`).join('') || ''}
                </div>
                <div class="item-price">${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            `).join('')}
          </div>

          <div class="total">
            <span>الإجمالي</span>
            <span>${order.total.toFixed(2)} BHD</span>
          </div>

          <div class="footer">
            <div style="font-weight: 900; margin-bottom: 2px;">شكراً لطلبكم!</div>
            <div>${vendor.location || ''}</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const statusConfig = {
    pending: { label: language === 'ar' ? 'طلب جديد' : 'New Order', bg: 'bg-indigo-50', text: 'text-indigo-700', action: language === 'ar' ? 'قبول' : 'Accept', nextStatus: 'processing' },
    processing: { label: language === 'ar' ? 'جاري التحضير' : 'Preparing', bg: 'bg-blue-50', text: 'text-blue-700', action: language === 'ar' ? 'جاهز للاستلام' : 'Ready for Pickup', nextStatus: 'ready' },
    ready: { label: language === 'ar' ? 'جاهز / ينتظر' : 'Ready / Waiting', bg: 'bg-amber-50', text: 'text-amber-700', action: language === 'ar' ? 'اكتمل' : 'Complete', nextStatus: 'completed' },
    arrived: { label: language === 'ar' ? 'وصل الآن' : 'OUTSIDE NOW', bg: 'bg-rose-500', text: 'text-white', action: language === 'ar' ? 'تم التسليم' : 'Handed Over', nextStatus: 'completed' },
    completed: { label: language === 'ar' ? 'تم' : 'Done', bg: 'bg-slate-100', text: 'text-slate-500', action: '', nextStatus: '' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2 rtl:flex-row-reverse">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
          {isHistory ? (language === 'ar' ? 'سجل الطلبات' : 'Order History') : (language === 'ar' ? 'طلبات نشطة' : 'Active Orders')} ({orders.length})
        </h3>
      </div>
      {orders.length === 0 && (
        <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-50 shadow-sm">
          <p className="text-slate-400 font-medium italic">
            {isHistory ? (language === 'ar' ? 'لا يوجد طلبات مكتملة بعد.' : 'No completed orders yet.') : (language === 'ar' ? 'لا يوجد طلبات نشطة حالياً.' : 'No active orders found.')}
          </p>
        </div>
      )}
      {orders.map(order => (
        <motion.div
          key={order.id}
          layout
          initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`sleek-card p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 rtl:text-right ${
            order.status === 'arrived' ? 'ring-2 ring-rose-500 border-transparent shadow-rose-100 shadow-xl' : ''
          }`}
        >
          <div className="flex items-start sm:items-center gap-4 w-full sm:w-auto rtl:flex-row-reverse">
            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 ${statusConfig[order.status].bg} ${statusConfig[order.status].text}`}>
              <span className="text-[10px] uppercase opacity-60">{language === 'ar' ? 'وقت' : 'Slot'}</span>
              <span className="text-base">
                {order.pickupTime ? (
                  (() => {
                    try {
                      const date = new Date(order.pickupTime);
                      return isNaN(date.getTime()) ? (language === 'ar' ? 'فوراً' : 'ASAP') : format(date, 'HH:mm');
                    } catch (e) {
                      return language === 'ar' ? 'فوراً' : 'ASAP';
                    }
                  })()
                ) : (language === 'ar' ? 'فوراً' : 'ASAP')}
              </span>
            </div>
            <div className="flex-1 rtl:text-right">
              <div className="flex items-center gap-2 mb-0.5 rtl:flex-row-reverse">
                <span className="font-bold text-slate-800">{order.customerName}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${statusConfig[order.status].bg} ${statusConfig[order.status].text}`}>
                  {statusConfig[order.status].label}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{order.customerPhone}</p>
              {order.pickupOption === 'scheduled' && order.scheduledPickupTime && (
                <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-black mt-1.5 rtl:flex-row-reverse">
                  <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>
                    {language === 'ar' ? 'موعد الاستلام:' : 'Scheduled Pickup:'} {
                      (() => {
                        try {
                          const date = new Date(order.scheduledPickupTime);
                          return isNaN(date.getTime()) ? order.scheduledPickupTime : format(date, 'MMM d, h:mm a');
                        } catch(e) {
                          return order.scheduledPickupTime;
                        }
                      })()
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full sm:flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100/50 rtl:text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">{language === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}</p>
            <div className="space-y-1">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs rtl:flex-row-reverse">
                  <span className="font-bold text-slate-700">
                    {item.quantity}x {item.name} 
                  </span>
                  <span className="font-bold text-slate-500">{item.price * item.quantity} BHD</span>
                </div>
              ))}
              <div className="pt-2 mt-1 border-t border-slate-200 flex justify-between items-center text-sm rtl:flex-row-reverse">
                <span className="font-black text-slate-400 uppercase text-[10px]">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                <span className="font-black text-indigo-600">{order.total} BHD</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 w-full sm:w-auto rtl:flex-row-reverse">
            <button 
              onClick={() => printReceipt(order)}
              className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90"
            >
              <Printer className="w-5 h-5" />
            </button>
            {order.status !== 'completed' && statusConfig[order.status].action && (
              <button 
                onClick={() => updateStatus(order.id, statusConfig[order.status].nextStatus as OrderStatus)}
                className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black text-xs transition-all active:scale-95 shadow-sm ${
                  order.status === 'arrived' 
                  ? 'bg-rose-600 text-white hover:bg-rose-700' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {statusConfig[order.status].action}
              </button>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ProductsList({ vendorId, products, vendor }: { vendorId: string, products: Product[], vendor: any }) {
  const { language, isRTL } = useLanguage();
  const [showAdd, setShowAdd] = useState(false);
  const [showAIStudio, setShowAIStudio] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLocalImageUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError(language === 'ar' ? 'يرجى تحديد ملف صورة صالح.' : 'Please select a valid image file.');
      return;
    }
    setIsUploadingImage(true);
    setUploadError('');
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      const base64Str = await base64Promise;
      
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Str })
      });
      if (!res.ok) {
        throw new Error(language === 'ar' ? 'فشل رفع الصورة للخادم.' : 'Server failed to process file upload.');
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(language === 'ar' ? 'استجاب الخادم بتنسيق غير صالح.' : 'Server returned an invalid response format.');
      }
      const data = await res.json();
      setNewData(prev => ({ ...prev, imageUrl: data.imageUrl }));
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const [newData, setNewData] = useState<{
    name: string;
    price: number;
    description: string;
    imageUrl: string;
    category: ProductCategory;
    volume: string;
    calories: string;
    weight: string;
    expiryDate: string;
    addons: { id: string; name: string; price: number }[];
    sizes: { id: string; name: string; price: number; label: string }[];
    stock: number;
  }>({ 
    name: '', 
    price: 0, 
    description: '', 
    imageUrl: '', 
    category: 'other',
    volume: '',
    calories: '',
    weight: '',
    expiryDate: '',
    addons: [], 
    sizes: [],
    stock: 0
  });

  const getLabelOptions = (category: ProductCategory) => {
    switch (category) {
      case 'drink': return ['S', 'M', 'L', 'XL'];
      case 'meal': return ['Single', 'Double', 'Family', 'Party'];
      case 'canned': return ['Small', 'Standard', 'Large'];
      default: return ['S', 'M', 'L', 'XL'];
    }
  };

  const resetForm = () => {
    setNewData({ 
      name: '', 
      price: 0, 
      description: '', 
      imageUrl: '', 
      category: 'other',
      volume: '',
      calories: '',
      weight: '',
      expiryDate: '',
      addons: [], 
      sizes: [],
      stock: 0
    });
    setShowAdd(false);
    setEditingId(null);
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), {
          ...newData
        });
      } else {
        await addDoc(collection(db, 'products'), {
          vendorId,
          ...newData,
          createdAt: new Date().toISOString()
        });
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  };

  const handleEdit = (product: Product) => {
    setNewData({
      name: product.name,
      price: product.price,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      category: product.category || 'other',
      volume: product.volume || '',
      calories: product.calories || '',
      weight: product.weight || '',
      expiryDate: product.expiryDate || '',
      addons: product.addons || [],
      sizes: product.sizes || [],
      stock: product.stock || 0
    });
    setEditingId(product.id);
    setShowAdd(true);
  };

  const deleteProduct = async (id: string) => {
    if (confirm(language === 'ar' ? 'هل تريد حذف هذا المنتج؟' : 'Delete this product?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center rtl:flex-row-reverse">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'كتالوج المنتجات' : 'Product Catalog'}</h3>
        <button 
          onClick={() => {
            if (showAdd && !editingId) {
              setShowAdd(false);
            } else {
              resetForm();
              setShowAdd(true);
            }
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-indigo-100 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          {language === 'ar' ? 'منتج جديد' : 'New Product'}
        </button>
      </div>

      {showAdd && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sleek-card p-8 bg-slate-50 shadow-2xl rtl:text-right"
        >
          <div className="flex justify-between items-center mb-6 rtl:flex-row-reverse">
            <h4 className="text-xl font-black tracking-tight">{editingId ? (language === 'ar' ? 'تعديل منتج' : 'Edit Product') : (language === 'ar' ? 'إضافة منتج جديد' : 'Add New Product')}</h4>
          </div>
            <form onSubmit={saveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase mb-3">{language === 'ar' ? 'فئة المنتج' : 'Product Category'}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'drink', label: language === 'ar' ? 'مشروبات' : 'Drinks', icon: CupSoda, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { id: 'meal', label: language === 'ar' ? 'وجبات' : 'Meals', icon: ShoppingBag, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { id: 'canned', label: language === 'ar' ? 'معلبات' : 'Canned', icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { id: 'other', label: language === 'ar' ? 'أخرى' : 'Other', icon: Plus, color: 'text-slate-600', bg: 'bg-slate-50' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewData({ ...newData, category: cat.id as ProductCategory })}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                        newData.category === cat.id 
                          ? `border-indigo-600 bg-indigo-50/50 shadow-md` 
                          : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <cat.icon className={`w-6 h-6 mb-2 ${newData.category === cat.id ? 'text-indigo-600' : cat.color}`} />
                      <span className={`text-xs font-black ${newData.category === cat.id ? 'text-indigo-600' : 'text-slate-600'}`}>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">{language === 'ar' ? 'اسم المنتج' : 'Product Name'}</label>
                <input 
                  required 
                  type="text" 
                  value={newData.name} 
                  onChange={e => setNewData({...newData, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-white font-bold text-right rtl:text-right"
                  placeholder={newData.category === 'drink' ? (language === 'ar' ? 'مثلاً: آيس لاتيه' : 'e.g. Iced Latte') : newData.category === 'meal' ? (language === 'ar' ? 'مثلاً: برجر' : 'e.g. Burger') : (language === 'ar' ? 'اسم المنتج' : 'Product name')}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">{language === 'ar' ? 'السعر الأساسي (BHD)' : 'Base Price (BHD)'}</label>
                <input 
                  required 
                  type="number" 
                  step="0.1"
                  value={newData.price} 
                  onChange={e => setNewData({...newData, price: Number(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-white font-bold text-right rtl:text-right"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">{language === 'ar' ? 'المخزون المتوفر' : 'Stock Level'}</label>
                <input 
                  type="number" 
                  value={newData.stock} 
                  onChange={e => setNewData({...newData, stock: Number(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-white font-bold text-right rtl:text-right"
                  placeholder="0"
                />
              </div>

              {/* Category Specific Fields */}
              {newData.category === 'drink' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <div>
                    <label className="block text-xs font-black text-blue-800 uppercase mb-2">{language === 'ar' ? 'الحجم (مثلاً: 330 مل، 1 لتر)' : 'Volume (e.g. 330ml, 1L)'}</label>
                    <input 
                      type="text" 
                      value={newData.volume} 
                      onChange={e => setNewData({...newData, volume: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-blue-200 outline-none focus:border-indigo-500 bg-white font-bold text-right rtl:text-right"
                    />
                  </div>
                </motion.div>
              )}

              {newData.category === 'meal' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-orange-50/50 rounded-2xl border border-orange-100">
                  <div>
                    <label className="block text-xs font-black text-orange-800 uppercase mb-2">{language === 'ar' ? 'السعرات الحرارية (اختياري)' : 'Calories (optional)'}</label>
                    <input 
                      type="text" 
                      value={newData.calories} 
                      onChange={e => setNewData({...newData, calories: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-orange-200 outline-none focus:border-indigo-500 bg-white font-bold text-right rtl:text-right"
                    />
                  </div>
                </motion.div>
              )}

              {newData.category === 'canned' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <div className="rtl:text-right">
                    <label className="block text-xs font-black text-emerald-800 uppercase mb-2">{language === 'ar' ? 'الوزن (مثلاً: 400 جرام، 1 كجم)' : 'Weight (e.g. 400g, 1kg)'}</label>
                    <input 
                      type="text" 
                      value={newData.weight} 
                      onChange={e => setNewData({...newData, weight: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-emerald-200 outline-none focus:border-indigo-500 bg-white font-bold text-right rtl:text-right"
                    />
                  </div>
                  <div className="rtl:text-right">
                    <label className="block text-xs font-black text-emerald-800 uppercase mb-2">{language === 'ar' ? 'تاريخ الانتهاء (اختياري)' : 'Expiry Date (optional)'}</label>
                    <input 
                      type="text" 
                      value={newData.expiryDate} 
                      onChange={e => setNewData({...newData, expiryDate: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-emerald-200 outline-none focus:border-indigo-500 bg-white font-bold text-right rtl:text-right"
                      placeholder="MM/YYYY"
                    />
                  </div>
                </motion.div>
              )}
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">{language === 'ar' ? 'الوصف' : 'Description'}</label>
                <textarea 
                  value={newData.description} 
                  onChange={e => setNewData({...newData, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 h-24 bg-white text-right rtl:text-right"
                />
              </div>
              <div className="md:col-span-2 space-y-4">
                <div className="flex justify-between items-center rtl:flex-row-reverse">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'صورة المنتج' : 'Product Image'}</label>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {newData.imageUrl ? (
                    <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {/* Preview Image */}
                      <div className="w-full sm:w-32 aspect-square bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center relative shadow-inner group shrink-0">
                        <img 
                          src={newData.imageUrl} 
                          alt="Product preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setNewData({...newData, imageUrl: ''})}
                          className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all shadow-md scale-90 hover:scale-100"
                          title={language === 'ar' ? 'حذف الصورة' : 'Remove Image'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Controls and Metadata */}
                      <div className="flex-1 flex flex-col justify-center space-y-2.5 rtl:text-right text-right">
                        <div>
                          <p className="text-xs font-black text-slate-700">{language === 'ar' ? 'تم اختيار صورة المنتج' : 'Product Image Loaded'}</p>
                          <p className="text-[10px] text-slate-400 font-bold truncate max-w-xs">{newData.imageUrl}</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 rtl:flex-row-reverse">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>📂</span>
                            <span>{language === 'ar' ? 'تغيير الصورة' : 'Change Photo'}</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const isProOrAbove = vendor?.plan === 'pro' || vendor?.plan === 'enterprise';
                              if (isProOrAbove) {
                                setShowAIStudio(true);
                              } else {
                                alert(language === 'ar' 
                                  ? '🔒 ميزة تصميم وتحسين الصور بالذكاء الاصطناعي متوفرة فقط للمشتركين في باقة برو (Pro Access) أو أعلى! يمكنك ترقية اشتراكك من صفحة الاشتراك والخطط.' 
                                  : '🔒 AI Design Studio is exclusive to Pro Access subscribers or higher! You can upgrade your plan in the Membership tab.'
                                );
                              }
                            }}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                            <span>{language === 'ar' ? 'تصميم واحترافية بالذكاء الاصطناعي ✨' : 'Design & Style with AI ✨'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Option 1: Local upload */}
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
                          isUploadingImage 
                            ? "border-indigo-400 bg-indigo-50/10 scale-[0.99]" 
                            : "border-slate-200 bg-white hover:border-indigo-500 hover:bg-indigo-50/5"
                        }`}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleLocalImageUpload(e.target.files[0]);
                            }
                          }}
                          accept="image/*" 
                          className="hidden" 
                        />
                        {isUploadingImage ? (
                          <div className="flex flex-col items-center space-y-2">
                            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            <p className="text-[11px] font-bold text-indigo-600">
                              {language === 'ar' ? 'جاري رفع صورتك...' : 'Uploading image...'}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center space-y-1">
                            <span className="text-xl">📂</span>
                            <p className="text-xs font-black text-slate-700">
                              {language === 'ar' ? 'رفع صورة من جهازك' : 'Upload from device'}
                            </p>
                            <p className="text-[9px] text-slate-400 font-medium">
                              {language === 'ar' ? 'تحميل مباشر وسريع' : 'Fast direct upload'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Option 2: AI Design Studio */}
                      <div 
                        onClick={() => {
                          const isProOrAbove = vendor?.plan === 'pro' || vendor?.plan === 'enterprise';
                          if (isProOrAbove) {
                            setShowAIStudio(true);
                          } else {
                            alert(language === 'ar' 
                              ? '🔒 ميزة استوديو تصميم الصور بالذكاء الاصطناعي متوفرة فقط للمشتركين في باقة برو (Pro Access) أو أعلى! يمكنك ترقية اشتراكك من صفحة الاشتراك والخطط.' 
                              : '🔒 AI Design Studio is exclusive to Pro Access subscribers or higher! You can upgrade your plan in the Membership tab.'
                            );
                          }
                        }}
                        className="border-2 border-indigo-150 bg-indigo-50/30 hover:border-indigo-400 hover:bg-indigo-50/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group/ai relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-200/10 rounded-full -mr-8 -mt-8 animate-pulse" />
                        
                        <div className="text-center space-y-1 relative z-10 flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mb-1 group-hover/ai:scale-110 transition-transform duration-300">
                            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                          </div>
                          <p className="text-xs font-black text-indigo-900 flex items-center gap-1">
                            {language === 'ar' ? 'التصميم بالذكاء الاصطناعي ✨' : 'Design using AI ✨'}
                          </p>
                          <p className="text-[9px] text-indigo-500 font-bold">
                            {language === 'ar' ? 'إزالة الخلفية ووضع خلفية رخام أو خشب' : 'Remove bg & use high-end themes'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fallback image URL text input */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'رابط الصورة المباشر' : 'Direct Image URL'}</label>
                  <input 
                    type="text" 
                    value={newData.imageUrl} 
                    onChange={e => setNewData({...newData, imageUrl: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-white text-xs text-right rtl:text-right font-semibold text-slate-600"
                    placeholder={language === 'ar' ? 'رابط الصورة (يمكنك أيضاً كتابة رابط خارجي يدويًا)' : 'Image link (you can also manually write an external URL)'}
                  />
                </div>

                {/* Upload errors */}
                {uploadError && (
                  <p className="text-[10px] font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg text-right rtl:text-right">
                    ⚠️ {uploadError}
                  </p>
                )}
              </div>

              {/* Sizes Section */}
              <div className="md:col-span-2 space-y-4 pt-6 border-t border-slate-200">
                <div className="flex justify-between items-center rtl:flex-row-reverse">
                  <div className="rtl:text-right">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'أحجام ومميزات المنتج وأسعارها' : 'Product Sizes & Pricing'}</label>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">{language === 'ar' ? 'أضف أحجاماً ومميزات مختلفة (صغير، كبير، إلخ) مع تحديد الأسعار الخاصة بها.' : 'Add different sizes (Small, Medium, etc.) with their specific prices.'}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      const options = getLabelOptions(newData.category);
                      setNewData({
                        ...newData, 
                        sizes: [...newData.sizes, { id: Math.random().toString(36).substr(2, 9), name: '', price: newData.price, label: options[0] }]
                      });
                    }}
                    className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-indigo-100 transition-colors rtl:flex-row-reverse"
                  >
                    <Plus className="w-3 h-3" /> {language === 'ar' ? 'إضافة حجم / ميزة' : 'Add Size'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {newData.sizes.map((size, index) => (
                    <div key={size.id} className="flex flex-col sm:flex-row gap-4 bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100 shadow-sm relative group items-center">
                      {/* Visual Interactive Icon Preview */}
                      <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-50 w-24">
                        {newData.category === 'drink' ? (
                          <CupSoda className={`text-indigo-600 transition-all duration-300 ${
                            size.label === 'S' ? 'w-6 h-6 scale-90' : 
                            size.label === 'M' ? 'w-8 h-8 scale-100' : 
                            size.label === 'L' ? 'w-10 h-10 scale-110' : 'w-12 h-12 scale-125'
                          }`} />
                        ) : newData.category === 'meal' ? (
                          <ShoppingBag className={`text-orange-600 transition-all duration-300 ${
                            size.label === 'Single' ? 'w-6 h-6 scale-90' : 
                            size.label === 'Double' ? 'w-8 h-8 scale-100' : 
                            size.label === 'Family' ? 'w-10 h-10 scale-110' : 'w-12 h-12 scale-125'
                          }`} />
                        ) : newData.category === 'canned' ? (
                          <ShoppingCart className={`text-emerald-600 transition-all duration-300 ${
                            size.label === 'Small' ? 'w-6 h-6 scale-90' : 
                            size.label === 'Standard' ? 'w-8 h-8 scale-100' : 'w-12 h-12 scale-125'
                          }`} />
                        ) : (
                          <Package className={`text-slate-600 transition-all duration-300 ${
                            size.label === 'S' ? 'w-6 h-6 scale-90' : 
                            size.label === 'M' ? 'w-8 h-8 scale-100' : 
                            size.label === 'L' ? 'w-10 h-10 scale-110' : 'w-12 h-12 scale-125'
                          }`} />
                        )}
                        <span className="mt-2 text-[10px] font-black text-slate-600 truncate w-full text-center">{size.label}</span>
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full rtl:text-right">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'رمز / نوع الميزة' : 'Size Label'}</label>
                          <div className="flex gap-2">
                            {getLabelOptions(newData.category).map(label => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => {
                                  const updated = [...newData.sizes];
                                  updated[index].label = label;
                                  setNewData({ ...newData, sizes: updated });
                                }}
                                className={`flex-1 py-2 rounded-lg text-xs font-black border-2 transition-all ${
                                  size.label === label 
                                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                                    : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'الاسم والسعر' : 'Name & Price'}</label>
                          <div className="flex gap-2">
                            <input 
                              required 
                              type="text" 
                              placeholder={language === 'ar' ? 'مثال: كبير' : 'e.g. Large'}
                              value={size.name} 
                              onChange={e => {
                                const updated = [...newData.sizes];
                                updated[index].name = e.target.value;
                                setNewData({ ...newData, sizes: updated });
                              }}
                              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 text-sm font-bold bg-white text-right rtl:text-right"
                            />
                            <div className="relative w-32">
                              <input 
                                required 
                                type="number" 
                                step="0.1"
                                value={size.price} 
                                onChange={e => {
                                  const updated = [...newData.sizes];
                                  updated[index].price = Number(e.target.value);
                                  setNewData({ ...newData, sizes: updated });
                                }}
                                className="w-full pl-4 pr-10 py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 text-sm font-bold bg-white text-right rtl:text-right"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-400">BHD</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button 
                        type="button" 
                        onClick={() => {
                          setNewData({
                            ...newData,
                            sizes: newData.sizes.filter((_, i) => i !== index)
                          });
                        }}
                        className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl border border-transparent hover:border-rose-100 transition-all hover:scale-105 shrink-0 self-center"
                        title={language === 'ar' ? 'حذف الحجم' : 'Delete Size'}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                {newData.sizes.length === 0 && (
                  <div className="bg-slate-50 p-12 rounded-[2rem] border border-dashed border-slate-200 text-center">
                    <p className="text-slate-400 text-xs font-bold italic">{language === 'ar' ? 'لم يتم تحديد أحجام. اضغط على "إضافة حجم / ميزة" لإعداد خيارات متنوعة.' : 'No sizes defined. Click "Add Size" to configure variations.'}</p>
                  </div>
                )}
              </div>
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-200">
              <div className="flex justify-between items-center rtl:flex-row-reverse">
                <label className="block text-xs font-black text-slate-400 uppercase">{language === 'ar' ? 'إضافات ومميزات أخرى (اختيارية)' : 'Product Addons (Extras)'}</label>
                <button 
                  type="button" 
                  onClick={() => setNewData({
                    ...newData, 
                    addons: [...newData.addons, { id: Math.random().toString(36).substr(2, 9), name: '', price: 0 }]
                  })}
                  className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-800 rtl:flex-row-reverse"
                >
                  <Plus className="w-3 h-3" /> {language === 'ar' ? 'إضافة ميزة/إضافة أخرى' : 'Add Extra Item'}
                </button>
              </div>
              
              {newData.addons.map((addon, index) => (
                <div key={addon.id} className="flex gap-3 items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm rtl:flex-row-reverse">
                  <input 
                    required 
                    type="text" 
                    placeholder={language === 'ar' ? 'مثال: حليب إضافي' : 'e.g. Extra Milk'}
                    value={addon.name} 
                    onChange={e => {
                      const updated = [...newData.addons];
                      updated[index].name = e.target.value;
                      setNewData({ ...newData, addons: updated });
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-100 outline-none focus:border-indigo-500 text-sm font-bold text-right rtl:text-right"
                  />
                  <div className="w-32 flex items-center gap-2 rtl:flex-row-reverse">
                    <input 
                      required 
                      type="number" 
                      step="0.1"
                      placeholder="0.0"
                      value={addon.price} 
                      onChange={e => {
                        const updated = [...newData.addons];
                        updated[index].price = Number(e.target.value);
                        setNewData({ ...newData, addons: updated });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-100 outline-none focus:border-indigo-500 text-sm font-bold text-right rtl:text-right"
                    />
                    <span className="text-[10px] font-bold text-slate-400">BHD</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setNewData({
                        ...newData,
                        addons: newData.addons.filter((_, i) => i !== index)
                      });
                    }}
                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {newData.addons.length === 0 && (
                <p className="text-[10px] text-slate-400 italic text-center py-2">{language === 'ar' ? 'لا توجد إضافات محددة لهذا المنتج' : 'No addons defined for this product'}</p>
              )}
            </div>

            <div className="md:col-span-2 flex justify-end gap-4 mt-2 rtl:flex-row-reverse">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all">
                {editingId ? (language === 'ar' ? 'تحديث المنتج' : 'Update Product') : (language === 'ar' ? 'حفظ المنتج' : 'Save Product')}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {products.map(p => (
          <div key={p.id} className="sleek-card p-4 flex gap-5 group relative">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
              <img 
                src={p.imageUrl || 'https://picsum.photos/seed/product/200/200'} 
                className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                alt={p.name}
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1 rtl:flex-row-reverse">
                <p className="font-bold text-slate-800 truncate">{p.name}</p>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                  p.category === 'drink' ? 'bg-blue-100 text-blue-600' :
                  p.category === 'meal' ? 'bg-orange-100 text-orange-600' :
                  p.category === 'canned' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {p.category === 'drink' ? (language === 'ar' ? 'مشروب' : 'Drink') : p.category === 'meal' ? (language === 'ar' ? 'وجبة' : 'Meal') : p.category === 'canned' ? (language === 'ar' ? 'معلب' : 'Canned') : (language === 'ar' ? 'أخرى' : 'Other')}
                </span>
                {(p.stock !== undefined) && (
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                    p.stock > 10 ? 'bg-indigo-50 text-indigo-600' : 
                    p.stock > 0 ? 'bg-amber-100 text-amber-600' : 
                    'bg-rose-100 text-rose-600'
                  }`}>
                    {p.stock > 0 ? (language === 'ar' ? `في المخزن: ${p.stock}` : `In Stock: ${p.stock}`) : (language === 'ar' ? 'نفذ المخزون' : 'Out of Stock')}
                  </span>
                )}
              </div>
              <p className="text-indigo-600 font-black text-lg">{p.price} BHD</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {p.sizes?.map(s => (
                  <span key={s.id} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded">{s.label}</span>
                ))}
                {p.volume && <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[10px] font-black rounded border border-slate-100">{p.volume}</span>}
                {p.calories && <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[10px] font-black rounded border border-slate-100">{p.calories} kcal</span>}
                {p.weight && <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[10px] font-black rounded border border-slate-100">{p.weight}</span>}
              </div>
              <p className="text-slate-400 text-xs font-medium line-clamp-2 mt-1">{p.description}</p>
            </div>
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button 
                onClick={() => handleEdit(p)}
                className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                title="Edit Product"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button 
                onClick={() => deleteProduct(p.id)}
                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                title="Delete Product"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showAIStudio && (
          <ImageEnhancer 
            vendorId={vendorId}
            currentPlan={vendor?.plan || 'starter'}
            aiCredits={vendor?.aiCredits !== undefined ? vendor.aiCredits : 10}
            onImageSaved={(url) => {
              setNewData(prev => ({
                ...prev,
                imageUrl: url
              }));
            }}
            onClose={() => setShowAIStudio(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsPanel({ vendor, setActiveTab }: { vendor: Vendor; setActiveTab?: (tab: 'orders' | 'products' | 'settings' | 'history' | 'membership' | 'customers') => void }) {
  const { language, isRTL } = useLanguage();
  const [formData, setFormData] = useState({
    name: vendor.name || '',
    description: vendor.description || '',
    phone: vendor.phone || '',
    instagram: vendor.instagram || '',
    location: vendor.location || '',
    logoUrl: vendor.logoUrl || '',
    bannerUrl: vendor.bannerUrl || '',
    iban: vendor.iban || '',
    customDomain: vendor.customDomain || '',
    isPublic: vendor.isPublic !== false
  });
  const [saving, setSaving] = useState(false);
  const [isEditingIban, setIsEditingIban] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize to reasonable dimensions
          const MAX_SIZE = type === 'logo' ? 400 : 1200;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.6 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          if (type === 'logo') setFormData(prev => ({ ...prev, logoUrl: dataUrl }));
          else setFormData(prev => ({ ...prev, bannerUrl: dataUrl }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, 'vendors', vendor.id), {
        ...formData
      });
      if (e) alert(language === 'ar' ? 'تم حفظ الإعدادات بنجاح!' : 'Settings saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'vendors');
    } finally {
      setSaving(false);
    }
  };

  const storeUrl = vendor.customDomain ? `https://${vendor.customDomain}` : `${window.location.origin}/store/${vendor.slug}`;
  
  return (
    <div className="space-y-8 pb-20 rtl:text-right">
      <div className="flex justify-between items-center mb-4 rtl:flex-row-reverse">
        <h3 className="text-3xl font-black tracking-tight text-slate-800">{language === 'ar' ? 'إعدادات المتجر' : 'Store Settings'}</h3>
        <button 
          onClick={saveSettings}
          disabled={saving}
          className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ التغييرات' : 'Save All Changes')}
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Visual Identity Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h4 className="font-black text-lg mb-6 flex items-center gap-2 text-slate-800 rtl:flex-row-reverse">
              <ImageIcon className="w-5 h-5 text-indigo-600" />
              {language === 'ar' ? 'الهوية البصرية' : 'Visual Identity'}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Logo Upload */}
              <div className="flex flex-col items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{language === 'ar' ? 'شعار المتجر' : 'Store Logo'}</p>
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                    ) : (
                      <Plus className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => handleImageUpload(e, 'logo')}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] flex items-center justify-center text-white text-xs font-black pointer-events-none">
                    {language === 'ar' ? 'تغيير الشعار' : 'Change Logo'}
                  </div>
                </div>
              </div>

              {/* Banner Upload */}
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{language === 'ar' ? 'غلاف المتجر' : 'Store Banner'}</p>
                <div className="relative group h-32 w-full">
                  <div className="w-full h-full rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center">
                    {formData.bannerUrl ? (
                      <img src={formData.bannerUrl} className="w-full h-full object-cover" alt="Banner" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Plus className="w-8 h-8 text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400">{language === 'ar' ? 'انقر لرفع الغلاف' : 'Click to upload banner'}</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => handleImageUpload(e, 'banner')}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  {formData.bannerUrl && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center text-white text-xs font-black pointer-events-none">
                      {language === 'ar' ? 'تغيير الغلاف' : 'Change Banner'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Store Profile Section */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <h4 className="font-black text-lg flex items-center gap-2 text-slate-800 rtl:flex-row-reverse">
            <UserIcon className="w-5 h-5 text-indigo-600" />
            {language === 'ar' ? 'ملف المتجر' : 'Store Profile'}
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{language === 'ar' ? 'اسم المتجر' : 'Store Name'}</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none focus:border-indigo-500 bg-slate-50/50 font-bold text-right rtl:text-right"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{language === 'ar' ? 'وصف المتجر' : 'Store Description'}</label>
              <textarea 
                rows={3}
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none focus:border-indigo-500 bg-slate-50/50 font-bold text-right rtl:text-right"
                placeholder={language === 'ar' ? 'أخبر عملائك عن متجرك...' : 'Tell customers about your store...'}
              />
            </div>
            
            {/* Visibility Toggle */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 rtl:flex-row-reverse">
                <div className="flex items-center gap-3 rtl:flex-row-reverse">
                  <div className={`p-2 rounded-xl ${formData.isPublic ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                    {formData.isPublic ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">{language === 'ar' ? 'ظهور المتجر' : 'Store Visibility'}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{formData.isPublic ? (language === 'ar' ? 'متجرك معروض حالياً في الصفحة الرئيسية' : 'Your store is currently visible on the home page') : (language === 'ar' ? 'متجرك مخفي من الصفحة الرئيسية' : 'Your store is hidden from the home page')}</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, isPublic: !formData.isPublic})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.isPublic ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isPublic ? (isRTL ? '-translate-x-6' : 'translate-x-6') : (isRTL ? '-translate-x-1' : 'translate-x-1')}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Social Section */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <h4 className="font-black text-lg flex items-center gap-2 text-slate-800 rtl:flex-row-reverse">
            <Instagram className="w-5 h-5 text-indigo-600" />
            {language === 'ar' ? 'التواصل والشبكات الاجتماعية' : 'Contact & Social'}
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{language === 'ar' ? 'واتساب / الهاتف' : 'WhatsApp / Phone'}</label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 rtl:flex-row-reverse">
                <Phone className="w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="bg-transparent outline-none flex-1 font-bold text-right rtl:text-right"
                  placeholder="e.g. +973 30000000"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{language === 'ar' ? 'حساب إنستغرام' : 'Instagram Handle'}</label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 rtl:flex-row-reverse">
                <Instagram className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400 font-bold">@</span>
                <input 
                  type="text" 
                  value={formData.instagram} 
                  onChange={e => setFormData({...formData, instagram: e.target.value})}
                  className="bg-transparent outline-none flex-1 font-bold text-right rtl:text-right"
                  placeholder="store_username"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{language === 'ar' ? 'الموقع / العنوان' : 'Location / Address'}</label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 rtl:flex-row-reverse">
                <MapPin className="w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={formData.location} 
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  className="bg-transparent outline-none flex-1 font-bold text-right rtl:text-right"
                  placeholder="e.g. Seef Mall, Manama"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Links & Payments Section */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm rtl:text-right">
            <h4 className="font-black text-lg mb-6 flex items-center gap-2 text-slate-800 rtl:flex-row-reverse">
              <Globe className="w-5 h-5 text-indigo-600" />
              {language === 'ar' ? 'رابط المتجر المباشر' : 'Live Store URL'}
            </h4>
            <div className="flex gap-2 rtl:flex-row-reverse">
              <input 
                readOnly 
                value={storeUrl} 
                className="flex-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 font-mono text-xs"
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(storeUrl);
                  alert(language === 'ar' ? 'تم النسخ!' : 'Copied!');
                }}
                className="bg-indigo-50 text-indigo-600 px-4 rounded-xl font-black text-xs hover:bg-indigo-100 transition-colors"
              >
                {language === 'ar' ? 'نسخ' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm rtl:text-right">
            <div className="flex justify-between items-center mb-6 rtl:flex-row-reverse">
              <h4 className="font-black text-lg flex items-center gap-2 text-slate-800 rtl:flex-row-reverse">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                {language === 'ar' ? 'معلومات الدفع (IBAN)' : 'Payout Info (IBAN)'}
              </h4>
              {!isEditingIban && (
                <button 
                  onClick={() => setIsEditingIban(true)}
                  className="text-indigo-600 text-xs font-black uppercase tracking-widest flex items-center gap-1 hover:underline rtl:flex-row-reverse"
                >
                  <Pencil className="w-3 h-3" /> {language === 'ar' ? 'تعديل' : 'Edit'}
                </button>
              )}
            </div>
            {isEditingIban ? (
              <div className="flex gap-2 rtl:flex-row-reverse">
                <input 
                  type="text" 
                  value={formData.iban} 
                  onChange={e => setFormData({...formData, iban: e.target.value.toUpperCase()})}
                  className="flex-1 px-4 py-3 rounded-xl border border-indigo-200 outline-none focus:border-indigo-500 bg-white font-mono font-bold shadow-sm"
                  placeholder="SA00 0000..."
                  autoFocus
                />
                <button 
                  onClick={async () => {
                    setIsEditingIban(false);
                    await saveSettings();
                  }}
                  className="bg-indigo-600 text-white px-4 rounded-xl text-xs font-black hover:bg-indigo-700 transition-all flex items-center justify-center min-w-[60px]"
                  disabled={saving}
                >
                  {saving ? '...' : (language === 'ar' ? 'تم' : 'Done')}
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-mono font-bold text-slate-600 flex justify-between items-center rtl:flex-row-reverse">
                <span>{formData.iban || (language === 'ar' ? 'لم يتم التحديد' : 'Not specified')}</span>
                <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">Verified</span>
              </div>
            )}
          </div>

          {/* Custom Domain Settings Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm rtl:text-right md:col-span-2 relative overflow-hidden group">
            {/* Lock Overlay for Starter Plan */}
            {!(vendor.plan === 'pro' || vendor.plan === 'enterprise') && (
              <div className="absolute inset-0 bg-slate-50/70 backdrop-blur-[3px] z-20 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 shadow-sm border border-indigo-100/50">
                  <Lock className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-black text-slate-800 mb-2">
                  {language === 'ar' ? 'ربط نطاق مخصص (باقة برو) 🔒' : 'Custom Domain (Pro Feature) 🔒'}
                </h4>
                <p className="text-xs text-slate-500 font-bold max-w-md mb-6 leading-relaxed">
                  {language === 'ar' 
                    ? 'هذه الميزة متاحة فقط للمشتركين في باقة برو أو أعلى. اربط متجرك بنطاقك المخصص لبناء هوية تجارية مستقلة واحترافية.' 
                    : 'This feature is exclusive to Pro plan subscribers. Connect your own domain to build an independent, professional brand identity.'}
                </p>
                <button 
                  onClick={() => {
                    if (setActiveTab) setActiveTab('membership');
                  }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                  <span>{language === 'ar' ? 'الترقية إلى باقة برو الآن' : 'Upgrade to Pro Plan Now'}</span>
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 rtl:flex-row-reverse">
              <h4 className="font-black text-lg flex items-center gap-2 text-slate-800 rtl:flex-row-reverse">
                <Globe className="w-5 h-5 text-indigo-600" />
                {language === 'ar' ? 'ربط نطاق مخصص (الدومين)' : 'Connect Custom Domain'}
              </h4>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-wider self-start sm:self-auto">
                {language === 'ar' ? 'ميزة باقة برو مفعلة' : 'Pro Plan Feature Active'}
              </div>
            </div>

            <p className="text-xs text-slate-400 font-bold mb-4">
              {language === 'ar' 
                ? 'اربط موقعك بنطاقك الخاص (مثال: my-shop.com) بدلاً من الرابط الافتراضي للظهور بشكل احترافي أمام عملائك.' 
                : 'Connect your store to your own domain (e.g., my-shop.com) instead of the default URL for a professional brand identity.'}
            </p>

            <div className="space-y-4">
              <div className="flex gap-2 rtl:flex-row-reverse max-w-xl">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-3.5 text-xs font-bold text-slate-400 select-none">https://</span>
                  <input 
                    type="text" 
                    value={formData.customDomain} 
                    onChange={e => setFormData({...formData, customDomain: e.target.value.toLowerCase().replace(/https?:\/\//, '').trim()})}
                    className="w-full pl-16 pr-4 py-3 rounded-xl border border-slate-100 outline-none focus:border-indigo-500 bg-slate-50/50 font-bold text-left"
                    placeholder="my-shop.com"
                  />
                </div>
                <button 
                  onClick={async () => {
                    await saveSettings();
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl font-black text-xs transition-all flex items-center justify-center whitespace-nowrap active:scale-95"
                  disabled={saving}
                >
                  {saving ? '...' : (language === 'ar' ? 'حفظ النطاق' : 'Save Domain')}
                </button>
              </div>

              {formData.customDomain && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                    <span className="text-xs font-black text-slate-700">{language === 'ar' ? 'إعدادات الـ DNS المطلوبة:' : 'Required DNS Settings:'}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {language === 'ar' ? 'متصل ومفعل' : 'Connected & Active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs text-slate-600 text-left">
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{language === 'ar' ? 'نوع السجل' : 'Record Type'}</div>
                      <div className="bg-white px-3 py-2 rounded-lg border border-slate-200/60 font-bold text-indigo-600">CNAME</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{language === 'ar' ? 'الاسم / المضيف' : 'Host / Name'}</div>
                      <div className="bg-white px-3 py-2 rounded-lg border border-slate-200/60 font-bold">@</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{language === 'ar' ? 'القيمة / الهدف' : 'Value / Target'}</div>
                      <div className="bg-white px-3 py-2 rounded-lg border border-slate-200/60 font-bold truncate">cname.curbside.me</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
