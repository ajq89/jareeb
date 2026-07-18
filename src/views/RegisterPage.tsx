import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../lib/i18n';
import { 
  User as UserIcon, 
  Store as StoreIcon, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Eye, 
  EyeOff, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function RegisterPage() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  // Multi-step index: 0, 1, 2, 3, 4
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [accountData, setAccountData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: ''
  });

  const [storeData, setStoreData] = useState({
    storeName: '',
    slug: '',
    description: ''
  });

  const [pickupData, setPickupData] = useState({
    region: '',
    times: '',
    details: ''
  });

  const [bankData, setBankData] = useState({
    iban: '',
    accountName: '',
    bankName: ''
  });

  // Store checking states
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);

  const [storeNameChecking, setStoreNameChecking] = useState(false);
  const [storeNameError, setStoreNameError] = useState<string | null>(null);
  const [isStoreNameAvailable, setIsStoreNameAvailable] = useState<boolean | null>(null);

  // Steps Configuration
  const steps = [
    {
      title: language === 'ar' ? 'بيانات حسابك' : 'Account Details',
      subtitle: language === 'ar' ? 'هذي البيانات تستخدمينها لتسجيل الدخول لاحقًا' : 'These details will be used to log in later',
      icon: <UserIcon className="w-5 h-5" />
    },
    {
      title: language === 'ar' ? 'بيانات متجرك' : 'Store Details',
      subtitle: language === 'ar' ? 'هذي المعلومات تظهر للزبونات في متجرك' : 'This information will be visible to your customers',
      icon: <StoreIcon className="w-5 h-5" />
    },
    {
      title: language === 'ar' ? 'عنوان الاستلام' : 'Pickup Address',
      subtitle: language === 'ar' ? 'تظهر هذي البيانات للزبونة بعد تأكيد الطلب فقط' : 'This data is only shown to the customer after order confirmation',
      icon: <MapPin className="w-5 h-5" />
    },
    {
      title: language === 'ar' ? 'بيانات التحويل البنكي' : 'Bank Transfer Details',
      subtitle: language === 'ar' ? 'تُعرض للزبونة عند تأكيد الطلب لإتمام الدفع عبر التحويل اليدوي' : 'Displayed to the customer for manual bank transfer payment',
      icon: <CreditCard className="w-5 h-5" />
    },
    {
      title: language === 'ar' ? 'مراجعة البيانات' : 'Review Details',
      subtitle: language === 'ar' ? 'تأكدي من صحة بياناتك قبل إنشاء المتجر' : 'Please verify all details before creating your store',
      icon: <CheckCircle2 className="w-5 h-5" />
    }
  ];

  // Validate Slug
  const handleSlugChange = async (val: string) => {
    const formattedSlug = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setStoreData(prev => ({ ...prev, slug: formattedSlug }));
    setSlugError(null);
    setIsSlugAvailable(null);

    if (formattedSlug.length < 3) {
      if (formattedSlug.length > 0) {
        setSlugError(language === 'ar' ? 'يجب أن يكون الرابط من 3 أحرف على الأقل' : 'URL slug must be at least 3 characters');
      }
      return;
    }

    setSlugChecking(true);
    try {
      const q = query(collection(db, 'vendors'), where('slug', '==', formattedSlug));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setSlugError(language === 'ar' ? 'معرّف الرابط هذا محجوز مسبقاً، اختر معرّفاً آخر' : 'This store URL is already taken');
        setIsSlugAvailable(false);
      } else {
        setIsSlugAvailable(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSlugChecking(false);
    }
  };

  // Validate Store Name
  const handleStoreNameChange = async (val: string) => {
    setStoreData(prev => ({ ...prev, storeName: val }));
    setStoreNameError(null);
    setIsStoreNameAvailable(null);

    const trimmed = val.trim();
    if (trimmed.length < 3) {
      if (trimmed.length > 0) {
        setStoreNameError(language === 'ar' ? 'يجب أن يكون اسم المتجر من 3 أحرف على الأقل' : 'Store name must be at least 3 characters');
      }
      return;
    }

    setStoreNameChecking(true);
    try {
      const q = query(collection(db, 'vendors'), where('name', '==', trimmed));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setStoreNameError(language === 'ar' ? 'اسم المتجر هذا مسجل بالفعل لمتجر آخر' : 'This store name is already registered to another store');
        setIsStoreNameAvailable(false);
      } else {
        setIsStoreNameAvailable(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStoreNameChecking(false);
    }
  };

  // Step Validation
  const validateStep = () => {
    setError(null);
    if (step === 0) {
      if (!accountData.fullName.trim()) {
        setError(language === 'ar' ? 'الرجاء إدخال الاسم الكامل' : 'Please enter your full name');
        return false;
      }
      if (!accountData.email.trim() || !accountData.email.includes('@')) {
        setError(language === 'ar' ? 'الرجاء إدخال بريد إلكتروني صحيح' : 'Please enter a valid email');
        return false;
      }
      if (accountData.password.length < 6) {
        setError(language === 'ar' ? 'كلمة المرور يجب أن لا تقل عن 6 خانات' : 'Password must be at least 6 characters');
        return false;
      }
      if (!accountData.phone.trim()) {
        setError(language === 'ar' ? 'الرجاء إدخال رقم الجوال' : 'Please enter your phone number');
        return false;
      }
    }

    if (step === 1) {
      if (!storeData.storeName.trim()) {
        setError(language === 'ar' ? 'الرجاء إدخال اسم المتجر' : 'Please enter your store name');
        return false;
      }
      if (storeNameError) {
        setError(storeNameError);
        return false;
      }
      if (!storeData.slug.trim()) {
        setError(language === 'ar' ? 'الرجاء إدخال معرّف الرابط' : 'Please enter your store link slug');
        return false;
      }
      if (slugError) {
        setError(slugError);
        return false;
      }
    }

    if (step === 2) {
      if (!pickupData.region.trim()) {
        setError(language === 'ar' ? 'الرجاء تحديد المنطقة / المدينة' : 'Please enter the region / city');
        return false;
      }
      if (!pickupData.times.trim()) {
        setError(language === 'ar' ? 'الرجاء تحديد أوقات الاستلام' : 'Please enter pickup times');
        return false;
      }
    }

    if (step === 3) {
      if (!bankData.iban.trim()) {
        setError(language === 'ar' ? 'الرجاء إدخال رقم الآيبان' : 'Please enter IBAN');
        return false;
      }
      if (!bankData.accountName.trim()) {
        setError(language === 'ar' ? 'الرجاء إدخال الاسم على الحساب' : 'Please enter account holder name');
        return false;
      }
      if (!bankData.bankName.trim()) {
        setError(language === 'ar' ? 'الرجاء إدخال اسم البنك' : 'Please enter bank name');
        return false;
      }
    }

    if (step === 4) {
      if (!agreedToTerms) {
        setError(language === 'ar' ? 'يجب الموافقة على شروط الخدمة والاستخدام وسياسة الخصوصية للمتابعة' : 'You must agree to the Terms of Service and Privacy Policy to proceed');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    setStep(prev => prev - 1);
  };

  // Submit flow
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Create User
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        accountData.email, 
        accountData.password
      );

      const firebaseUser = userCredential.user;

      // Update profile display name
      await updateProfile(firebaseUser, {
        displayName: accountData.fullName
      });

      // 2. Create Vendor Store Record
      const vendorRef = doc(collection(db, 'vendors'));
      await setDoc(vendorRef, {
        uid: firebaseUser.uid,
        name: storeData.storeName,
        slug: storeData.slug,
        description: storeData.description,
        phone: accountData.phone,
        iban: bankData.iban,
        ownerName: accountData.fullName,
        pickupRegion: pickupData.region,
        pickupTimes: pickupData.times,
        pickupDetails: pickupData.details,
        bankAccountName: bankData.accountName,
        bankName: bankData.bankName,
        plan: 'starter',
        subscriptionStatus: 'trial',
        subscriptionEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days trial
        createdAt: new Date().toISOString()
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError(language === 'ar' ? 'البريد الإلكتروني مستخدم بالفعل بحساب آخر' : 'Email is already in use');
      } else {
        setError(err.message || (language === 'ar' ? 'حدث خطأ أثناء التسجيل. الرجاء المحاولة مرة أخرى.' : 'Registration failed. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-indigo-50/80 rounded-full blur-[120px] opacity-70 pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-slate-100 rounded-full blur-[120px] opacity-70 pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-indigo-100/30 rounded-full blur-[100px] opacity-50 pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-emerald-50/40 rounded-full blur-[100px] opacity-50 pointer-events-none animate-pulse duration-[10000ms]" />

      <div className="max-w-xl w-full relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center mb-4 group">
            <img src="/logo-text.png" alt="Jareeb" className="h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
          </Link>
          <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">
            {language === 'ar' ? 'بوابة التجار المبدعين' : 'Creative Vendor Portal'}
          </p>
        </div>

        {/* Steps Progress Header */}
        <div className="bg-white px-6 py-4 rounded-[1.5rem] border border-slate-100 shadow-sm mb-6 flex justify-between items-center gap-2 rtl:flex-row-reverse">
          {steps.map((s, idx) => (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step === idx 
                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-50 shadow-md scale-110' 
                  : step > idx 
                  ? 'bg-emerald-100 text-emerald-600' 
                  : 'bg-slate-50 text-slate-400 border border-slate-200'
                }`}>
                  {step > idx ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 rounded-full transition-colors ${
                  step > idx ? 'bg-emerald-200' : 'bg-slate-100'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-indigo-100/40 p-8 sm:p-10 relative overflow-hidden">
          {/* Top colored aesthetic bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Header of active step */}
              <div className="rtl:text-right text-right">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black mb-3">
                  {steps[step].icon}
                  <span>{language === 'ar' ? `الخطوة ${step + 1} من 5` : `Step ${step + 1} of 5`}</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{steps[step].title}</h2>
                <p className="text-slate-400 font-semibold text-xs leading-relaxed">{steps[step].subtitle}</p>
              </div>

              {/* Error messages */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-start gap-3 text-xs font-bold text-right rtl:text-right rtl:flex-row-reverse"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Form inputs depending on current step */}
              {step === 0 && (
                <div className="space-y-4 rtl:text-right text-right">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'ar' ? 'مثال: لمى الحداد' : 'e.g. Lama AlHaddad'}
                      value={accountData.fullName}
                      onChange={e => setAccountData(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="[email protected]"
                      value={accountData.email}
                      onChange={e => setAccountData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-sm text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'كلمة المرور' : 'Password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={accountData.password}
                        onChange={e => setAccountData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'رقم الجوال' : 'Phone Number'}
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder={language === 'ar' ? 'مثال: 39xxxxxx' : 'e.g. 39xxxxxx'}
                      value={accountData.phone}
                      onChange={e => setAccountData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-sm"
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4 rtl:text-right text-right">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'اسم المتجر' : 'Store Name'}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        placeholder={language === 'ar' ? 'مثال: حلويات نورة' : 'e.g. Noura Sweets'}
                        value={storeData.storeName}
                        onChange={e => handleStoreNameChange(e.target.value)}
                        className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-sm text-right"
                      />
                      {storeNameChecking && (
                        <div className="absolute right-4 w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      )}
                      {!storeNameChecking && isStoreNameAvailable === true && storeData.storeName.trim().length >= 3 && (
                        <div className="absolute right-4 text-emerald-500 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                      {!storeNameChecking && isStoreNameAvailable === false && storeData.storeName.trim().length >= 3 && (
                        <div className="absolute right-4 text-rose-500 flex items-center justify-center">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    {storeNameError ? (
                      <p className="text-[10px] font-bold text-rose-500 mt-1.5 flex items-center gap-1 justify-start">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {storeNameError}
                      </p>
                    ) : isStoreNameAvailable === true && storeData.storeName.trim().length >= 3 ? (
                      <p className="text-[10px] font-bold text-emerald-600 mt-1.5 flex items-center gap-1 justify-start">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {language === 'ar' ? 'اسم المتجر متاح ومميز!' : 'Store name is unique and available!'}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'معرّف الرابط (أحرف إنجليزية فقط، بدون مسافات)' : 'Store Link URL (english lowercase, no spaces)'}
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-xs font-bold text-slate-400 select-none">/store/</span>
                      <input
                        type="text"
                        required
                        placeholder="noura-sweets"
                        value={storeData.slug}
                        onChange={e => handleSlugChange(e.target.value)}
                        className="w-full pl-16 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-sm text-left"
                      />
                      {slugChecking && (
                        <div className="absolute right-4 w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      )}
                      {!slugChecking && isSlugAvailable === true && storeData.slug.length >= 3 && (
                        <div className="absolute right-4 text-emerald-500 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                      {!slugChecking && isSlugAvailable === false && storeData.slug.length >= 3 && (
                        <div className="absolute right-4 text-rose-500 flex items-center justify-center">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    {slugError ? (
                      <p className="text-[10px] font-bold text-rose-500 mt-1.5 flex items-center gap-1 justify-start">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {slugError}
                      </p>
                    ) : isSlugAvailable === true && storeData.slug.length >= 3 ? (
                      <p className="text-[10px] font-bold text-emerald-600 mt-1.5 flex items-center gap-1 justify-start">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {language === 'ar' ? 'رابط متجرك فريد ومتاح للتسجيل!' : 'Your store link is unique and available!'}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'وصف مختصر عن مشروعك' : 'Short project description'}
                    </label>
                    <textarea
                      placeholder={language === 'ar' ? 'مثال: نخبز ألذ الحلويات الفاخرة الطازجة لتصلك دافئة وحسب الطلب' : 'e.g. We bake premium fresh sweets delivered warm to order'}
                      value={storeData.description}
                      onChange={e => setStoreData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-sm h-28 resize-none"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 rtl:text-right text-right">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'المنطقة / المدينة' : 'Region / City'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'ar' ? 'مثال: جد حفص، المنامة' : 'e.g. Jidhafs, Manama'}
                      value={pickupData.region}
                      onChange={e => setPickupData(prev => ({ ...prev, region: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'أوقات الاستلام' : 'Pickup Times'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'ar' ? 'مثال: يوميًا من 5 إلى 9 مساءً' : 'e.g. Daily from 5 to 9 PM'}
                      value={pickupData.times}
                      onChange={e => setPickupData(prev => ({ ...prev, times: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'تفاصيل إضافية تساعد الزبونة توصل' : 'Additional details helping customer arrive'}
                    </label>
                    <textarea
                      placeholder={language === 'ar' ? 'مثال: المنزل الأزرق المقابل لجمعية جدحفص الاستهلاكية، مواقف مظللة' : 'e.g. Blue house opposite Jidhafs supermarket, shaded parking available'}
                      value={pickupData.details}
                      onChange={e => setPickupData(prev => ({ ...prev, details: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-sm h-28 resize-none"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 rtl:text-right text-right">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'رقم الآيبان (IBAN)' : 'IBAN Number'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="BH00 0000 0000 0000 0000 00"
                      value={bankData.iban}
                      onChange={e => setBankData(prev => ({ ...prev, iban: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-sm text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'الاسم على الحساب' : 'Account Owner Name'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'ar' ? 'مثال: لمى الحداد' : 'e.g. Lama AlHaddad'}
                      value={bankData.accountName}
                      onChange={e => setBankData(prev => ({ ...prev, accountName: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      {language === 'ar' ? 'البنك' : 'Bank'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'ar' ? 'مثال: بنك البحرين الوطني' : 'e.g. National Bank of Bahrain'}
                      value={bankData.bankName}
                      onChange={e => setBankData(prev => ({ ...prev, bankName: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-sm"
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6 rtl:text-right text-right max-h-[400px] overflow-y-auto pr-2">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <h3 className="font-black text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2 rtl:flex-row-reverse text-sm">
                      <UserIcon className="w-4 h-4 text-indigo-600" />
                      <span>{language === 'ar' ? 'بيانات الحساب الشخصي' : 'Personal Account'}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-400 font-bold">{language === 'ar' ? 'الاسم' : 'Name'}</p>
                        <p className="font-bold text-slate-700">{accountData.fullName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">{language === 'ar' ? 'الجوال' : 'Phone'}</p>
                        <p className="font-bold text-slate-700">{accountData.phone}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-400 font-bold">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p>
                        <p className="font-bold text-slate-700">{accountData.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <h3 className="font-black text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2 rtl:flex-row-reverse text-sm">
                      <StoreIcon className="w-4 h-4 text-indigo-600" />
                      <span>{language === 'ar' ? 'بيانات المتجر' : 'Store Details'}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-400 font-bold">{language === 'ar' ? 'اسم المتجر' : 'Store Name'}</p>
                        <p className="font-bold text-slate-700">{storeData.storeName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">{language === 'ar' ? 'الرابط الخاص بك' : 'Store Link'}</p>
                        <p className="font-bold text-indigo-600">/store/{storeData.slug}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-400 font-bold">{language === 'ar' ? 'وصف المشروع' : 'Project Description'}</p>
                        <p className="font-bold text-slate-700 whitespace-pre-wrap">{storeData.description || '...'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <h3 className="font-black text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2 rtl:flex-row-reverse text-sm">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      <span>{language === 'ar' ? 'بيانات الاستلام' : 'Pickup Details'}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-400 font-bold">{language === 'ar' ? 'المنطقة' : 'Region'}</p>
                        <p className="font-bold text-slate-700">{pickupData.region}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">{language === 'ar' ? 'أوقات العمل' : 'Working Hours'}</p>
                        <p className="font-bold text-slate-700">{pickupData.times}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-400 font-bold">{language === 'ar' ? 'تفاصيل الوصول' : 'Directions'}</p>
                        <p className="font-bold text-slate-700 whitespace-pre-wrap">{pickupData.details || '...'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <h3 className="font-black text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2 rtl:flex-row-reverse text-sm">
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                      <span>{language === 'ar' ? 'بيانات التحويل والبنك' : 'Bank details'}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-400 font-bold">{language === 'ar' ? 'البنك' : 'Bank'}</p>
                        <p className="font-bold text-slate-700">{bankData.bankName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">{language === 'ar' ? 'الاسم على الحساب' : 'Account Name'}</p>
                        <p className="font-bold text-slate-700">{bankData.accountName}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-400 font-bold">IBAN</p>
                        <p className="font-bold text-slate-700 font-mono">{bankData.iban}</p>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Privacy Agreement Checkbox */}
                  <div className="bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100 flex items-start gap-3 text-xs select-none">
                    <input
                      id="agreed-to-terms"
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 mt-1 accent-indigo-600 rounded cursor-pointer shrink-0"
                    />
                    <label htmlFor="agreed-to-terms" className="text-slate-600 leading-relaxed cursor-pointer font-bold text-right rtl:text-right">
                      {language === 'ar' ? (
                        <>
                          أوافق على <Link to="/terms" target="_blank" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5 font-extrabold">شروط الخدمة والاستخدام</Link> و <Link to="/privacy" target="_blank" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5 font-extrabold">سياسة الخصوصية</Link> لمنصة جريب.
                        </>
                      ) : (
                        <>
                          I agree to the <Link to="/terms" target="_blank" className="text-indigo-600 hover:underline inline font-extrabold">Terms of Service</Link> and <Link to="/privacy" target="_blank" className="text-indigo-600 hover:underline inline font-extrabold">Privacy Policy</Link> of Jareeb Platform.
                        </>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex gap-4 pt-4 rtl:flex-row-reverse border-t border-slate-100">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 px-6 py-4 border border-slate-200 hover:border-slate-300 text-slate-600 font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    <span>{language === 'ar' ? 'السابق' : 'Previous'}</span>
                  </button>
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-[2] bg-slate-900 text-white hover:bg-indigo-600 px-6 py-4 font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-indigo-50"
                  >
                    <span>{language === 'ar' ? 'التالي' : 'Next'}</span>
                    {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-[2] bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-4 font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 animate-bounce" />
                        <span>{language === 'ar' ? 'إنشاء المتجر' : 'Create Store'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer info link */}
        <p className="text-center text-slate-400 font-bold text-xs mt-6">
          {language === 'ar' ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
          <Link 
            to="/login"
            className="text-indigo-600 hover:underline"
          >
            {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
          </Link>
        </p>

      </div>
    </div>
  );
}
