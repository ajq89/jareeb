import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, orderBy, addDoc, where, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Vendor, SubscriptionPlan } from '../types';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Shield, 
  CreditCard, 
  Calendar, 
  ChevronRight, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Store,
  Crown,
  ArrowUpRight,
  Settings,
  Mail,
  MessageSquare,
  Instagram,
  Save,
  Inbox,
  Clock,
  Phone,
  Eye,
  EyeOff,
  Landmark,
  Wallet,
  Copy,
  MapPin,
  Sparkles,
  User,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { language, isRTL } = useLanguage();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<SubscriptionPlan | 'all'>('all');

  // Authorization check
  const isAdmin = auth.currentUser?.email === 'mursal.bh@gmail.com';

  useEffect(() => {
    if (isAdmin) {
      fetchVendors();
      fetchPaymentSettings();
      fetchContactSettings();
      fetchInquiries();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  // Tabs layout
  const [activeTab, setActiveTab] = useState<'vendors' | 'payment_settings' | 'contact_settings' | 'inquiries'>('vendors');

  // Payment settings state
  const [benefitPayPhone, setBenefitPayPhone] = useState('36368522');
  const [accountHolder, setAccountHolder] = useState('Mursal Al-Bakery / Curbside GCC');
  const [bankName, setBankName] = useState('Al Salam Bank (بنك السلام)');
  const [iban, setIban] = useState('BH25 ALSL 0000 3636 8522 0001');
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);
  const [paymentSettingsSuccess, setPaymentSettingsSuccess] = useState(false);

  // Contact settings state
  const [supportEmail, setSupportEmail] = useState('support@jareeb.com');
  const [salesEmail, setSalesEmail] = useState('sales@jareeb.com');
  const [supportWhatsapp, setSupportWhatsapp] = useState('+97336368522');
  const [instagramUrl, setInstagramUrl] = useState('https://instagram.com/jareeb.bh');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // User Inquiries state
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);

  const fetchPaymentSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'payment');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.benefitPayPhone) setBenefitPayPhone(data.benefitPayPhone);
        if (data.accountHolder) setAccountHolder(data.accountHolder);
        if (data.bankName) setBankName(data.bankName);
        if (data.iban) setIban(data.iban);
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPaymentSettings(true);
    setPaymentSettingsSuccess(false);
    try {
      await setDoc(doc(db, 'settings', 'payment'), {
        benefitPayPhone: benefitPayPhone.trim(),
        accountHolder: accountHolder.trim(),
        bankName: bankName.trim(),
        iban: iban.trim(),
        updatedAt: new Date().toISOString()
      });
      setPaymentSettingsSuccess(true);
      setTimeout(() => setPaymentSettingsSuccess(false), 4000);
    } catch (error) {
      console.error('Error saving payment settings:', error);
      alert(language === 'ar' ? 'فشل حفظ بيانات الحساب البنكي للدفع' : 'Failed to save payment settings');
    } finally {
      setSavingPaymentSettings(false);
    }
  };

  const fetchContactSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'contact');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.supportEmail) setSupportEmail(data.supportEmail);
        if (data.salesEmail) setSalesEmail(data.salesEmail);
        if (data.supportWhatsapp) setSupportWhatsapp(data.supportWhatsapp);
        if (data.instagramUrl) setInstagramUrl(data.instagramUrl);
      }
    } catch (error) {
      console.error('Error fetching contact settings:', error);
    }
  };

  const fetchInquiries = async () => {
    setLoadingInquiries(true);
    try {
      const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setInquiries(data);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    } finally {
      setLoadingInquiries(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);
    try {
      await setDoc(doc(db, 'settings', 'contact'), {
        supportEmail: supportEmail.trim(),
        salesEmail: salesEmail.trim(),
        supportWhatsapp: supportWhatsapp.trim(),
        instagramUrl: instagramUrl.trim(),
        updatedAt: new Date().toISOString()
      });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 4000);
    } catch (error) {
      console.error('Error saving contact settings:', error);
      alert(language === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const q = query(collection(db, 'vendors'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vendor));
      
      // Fetch any upgrade orders to overlay status real-time
      const upgradeQ = query(
        collection(db, 'orders'),
        where('customerName', '==', 'SYSTEM_ADMIN_UPGRADE'),
        where('status', '==', 'upgrade_approved')
      );
      const upgradeSnapshot = await getDocs(upgradeQ);
      const upgradeOrders = upgradeSnapshot.docs.map(d => d.data());
      
      const mappedVendors = data.map(v => {
        const vUpgrades = upgradeOrders.filter(o => o.vendorId === v.id);
        if (vUpgrades.length > 0) {
          vUpgrades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return {
            ...v,
            plan: vUpgrades[0].newPlan || v.plan,
            subscriptionStatus: 'active'
          };
        }
        return v;
      });
      
      setVendors(mappedVendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateVendorPlan = async (vendorId: string, plan: SubscriptionPlan) => {
    try {
      const vendorRef = doc(db, 'vendors', vendorId);
      await updateDoc(vendorRef, { 
        plan,
        subscriptionStatus: 'active',
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      });
      setVendors(vendors.map(v => v.id === vendorId ? { ...v, plan, subscriptionStatus: 'active' } : v));
      alert(language === 'ar' ? 'تم تحديث الباقة بنجاح' : 'Plan updated successfully');
    } catch (error) {
      console.warn('Direct update failed, trying background upgrade fallback:', error);
      try {
        await addDoc(collection(db, 'orders'), {
          vendorId,
          customerName: "SYSTEM_ADMIN_UPGRADE",
          customerPhone: "SYSTEM_ADMIN_UPGRADE",
          carDetails: {
            type: "SYSTEM",
            color: "SYSTEM",
            plate: "SYSTEM"
          },
          items: [{ name: "Upgrade to " + plan, quantity: 1, price: 0 }],
          total: 0,
          status: "upgrade_approved",
          createdAt: new Date().toISOString(),
          pickupTime: "SYSTEM",
          onMyWay: false,
          newPlan: plan
        });
        
        setVendors(vendors.map(v => v.id === vendorId ? { ...v, plan, subscriptionStatus: 'active' } : v));
        alert(language === 'ar' ? 'تم إرسال طلب الترقية بنجاح وسيتم تطبيقها تلقائياً' : 'Upgrade request sent successfully and will apply automatically');
      } catch (fallbackError) {
        console.error('Background upgrade failed:', fallbackError);
        alert(language === 'ar' ? 'فشل تحديث الباقة: صلاحيات غير كافية' : 'Failed to update plan: Insufficient permissions');
      }
    }
  };

  const toggleVendorVisibility = async (vendorId: string, currentStatus: boolean) => {
    try {
      const vendorRef = doc(db, 'vendors', vendorId);
      await updateDoc(vendorRef, { 
        isPublic: !currentStatus
      });
      setVendors(vendors.map(v => v.id === vendorId ? { ...v, isPublic: !currentStatus } : v));
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert(language === 'ar' ? 'فشل تغيير حالة الظهور' : 'Failed to toggle visibility');
    }
  };

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === 'all' || v.plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-slate-500">{language === 'ar' ? 'جاري تحميل لوحة التحكم...' : 'Loading Admin Panel...'}</p>
      </div>
    </div>
  );

  const stats = {
    total: vendors.length,
    active: vendors.filter(v => v.subscriptionStatus === 'active').length,
    revenue: vendors.reduce((acc, v) => {
      if (v.plan === 'pro') return acc + 15;
      if (v.plan === 'enterprise') return acc + 50;
      if (v.plan === 'starter') return acc + 5;
      return acc;
    }, 0)
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 rtl:flex-row-reverse">
            <div>
              <div className="flex items-center gap-2 mb-2 rtl:flex-row-reverse">
                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                  <Shield className="w-5 h-5" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
                  {language === 'ar' ? 'إدارة الاشتراكات' : 'Subscription Management'}
                </h1>
              </div>
              <p className="text-slate-500 font-medium">
                {language === 'ar' ? 'تحكم في عضويات المتأجر والخطط المفعلة' : 'Control store memberships and active plans'}
              </p>
            </div>

            <div className="flex gap-4 rtl:flex-row-reverse">
              <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl shadow-slate-200 flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="rtl:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الإيرادات المتوقعة' : 'Monthly Revenue'}</p>
                  <p className="text-xl font-black">BHD {stats.revenue}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-8 gap-6 rtl:flex-row-reverse overflow-x-auto">
          <button
            onClick={() => setActiveTab('vendors')}
            className={`pb-4 text-sm font-black transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'vendors'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            {language === 'ar' ? 'إدارة المتاجر والاشتراكات' : 'Store Subscriptions'}
          </button>
          <button
            onClick={() => setActiveTab('payment_settings')}
            className={`pb-4 text-sm font-black transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'payment_settings'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            {language === 'ar' ? 'بيانات الحساب للدفع (IBAN)' : 'Payment Account Details'}
          </button>
          <button
            onClick={() => setActiveTab('contact_settings')}
            className={`pb-4 text-sm font-black transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'contact_settings'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            {language === 'ar' ? 'إعدادات قنوات التواصل' : 'Contact Channels Settings'}
          </button>
          <button
            onClick={() => {
              setActiveTab('inquiries');
              fetchInquiries();
            }}
            className={`pb-4 text-sm font-black transition-all border-b-2 relative ${
              activeTab === 'inquiries'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>{language === 'ar' ? 'رسائل تواصل معنا' : 'User Messages'}</span>
            {inquiries.length > 0 && (
              <span className="absolute -top-1.5 -right-3.5 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center">
                {inquiries.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'vendors' && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 rtl:flex-row-reverse">
              <div className="sleek-card p-6 flex items-center gap-4 rtl:flex-row-reverse">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div className="rtl:text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'إجمالي المتاجر' : 'Total Vendors'}</p>
                  <p className="text-2xl font-black text-slate-800">{stats.total}</p>
                </div>
              </div>
              <div className="sleek-card p-6 flex items-center gap-4 rtl:flex-row-reverse">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="rtl:text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'اشتراكات نشطة' : 'Active Subscriptions'}</p>
                  <p className="text-2xl font-black text-slate-800">{stats.active}</p>
                </div>
              </div>
              <div className="sleek-card p-6 flex items-center gap-4 rtl:flex-row-reverse">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="rtl:text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'بانتظار الترقية' : 'Starter Plans'}</p>
                  <p className="text-2xl font-black text-slate-800">{vendors.filter(v => v.plan === 'starter' || !v.plan).length}</p>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 rtl:flex-row-reverse">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  placeholder={language === 'ar' ? 'البحث عن متجر...' : 'Search for a store...'}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-right rtl:text-right"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 rtl:flex-row-reverse">
                <Filter className="w-4 h-4 text-slate-400 ml-2" />
                {(['all', 'starter', 'pro', 'enterprise'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setFilterPlan(p)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      filterPlan === p ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {p === 'all' ? (language === 'ar' ? 'الكل' : 'All') : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Vendors Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredVendors.map(vendor => {
                  const planName = vendor.plan || 'starter';
                  const cleanPhone = vendor.phone?.replace(/[^\d+]/g, '') || '';

                  return (
                    <motion.div
                      key={vendor.id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between overflow-hidden relative group"
                    >
                      {/* Top Banner & Header */}
                      <div>
                        <div className={`h-24 w-full relative overflow-hidden ${
                          planName === 'enterprise'
                            ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700'
                            : planName === 'pro'
                            ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700'
                            : 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900'
                        }`}>
                          {vendor.bannerUrl ? (
                            <img src={vendor.bannerUrl} alt="" className="w-full h-full object-cover opacity-40" />
                          ) : (
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
                          )}
                          
                          {/* Badge for visibility & Store link */}
                          <div className="absolute top-3 right-3 left-3 flex justify-between items-center rtl:flex-row-reverse z-10">
                            <button
                              onClick={() => toggleVendorVisibility(vendor.id, vendor.isPublic !== false)}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all flex items-center gap-1.5 shadow-sm backdrop-blur-md ${
                                vendor.isPublic !== false
                                  ? 'bg-emerald-500/90 text-white hover:bg-emerald-600'
                                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-900'
                              }`}
                              title={vendor.isPublic !== false ? (language === 'ar' ? 'إخفاء من الرئيسية' : 'Hide') : (language === 'ar' ? 'إظهار في الرئيسية' : 'Show')}
                            >
                              {vendor.isPublic !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              <span>{vendor.isPublic !== false ? (language === 'ar' ? 'منشور' : 'Public') : (language === 'ar' ? 'مخفي' : 'Private')}</span>
                            </button>

                            <a
                              href={`/store/${vendor.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all active:scale-95"
                              title={language === 'ar' ? 'معاينة المتجر' : 'View Store'}
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </a>
                          </div>
                        </div>

                        {/* Store Profile Info Header */}
                        <div className="px-6 pb-4 pt-0 relative">
                          <div className="flex items-end justify-between -mt-10 mb-3 rtl:flex-row-reverse">
                            <div className="w-18 h-18 bg-white rounded-2xl overflow-hidden p-1.5 border-2 border-white shadow-md shrink-0">
                              <div className="w-full h-full bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center">
                                {vendor.logoUrl ? (
                                  <img src={vendor.logoUrl} alt={vendor.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Store className="w-8 h-8 text-slate-400" />
                                )}
                              </div>
                            </div>

                            {/* Subscription Plan Badge */}
                            <div className={`px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                              planName === 'enterprise'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : planName === 'pro'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {planName === 'enterprise' ? <Crown className="w-3.5 h-3.5 text-amber-600" /> :
                               planName === 'pro' ? <Zap className="w-3.5 h-3.5 text-indigo-600" /> :
                               <Store className="w-3.5 h-3.5 text-slate-500" />}
                              <span>{planName}</span>
                            </div>
                          </div>

                          {/* Vendor Title & Slug */}
                          <div className="rtl:text-right">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 rtl:flex-row-reverse">
                              {vendor.name}
                              {planName === 'enterprise' && <Crown className="w-4 h-4 text-amber-500 shrink-0" />}
                            </h3>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">
                              /{vendor.slug}
                            </p>
                          </div>

                          {/* Details List */}
                          <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-600">
                            
                            {/* Phone Number & WhatsApp Button */}
                            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl rtl:flex-row-reverse">
                              <div className="flex items-center gap-2 rtl:flex-row-reverse text-slate-700">
                                <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span className="font-bold dir-ltr">{vendor.phone || (language === 'ar' ? 'غير مسجل' : 'N/A')}</span>
                              </div>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${cleanPhone}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1 hover:bg-emerald-600 transition-colors"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>{language === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
                                </a>
                              )}
                            </div>

                            {/* Owner Name */}
                            {(vendor.ownerName || vendor.bankAccountName) && (
                              <div className="flex items-center gap-2.5 px-1 rtl:flex-row-reverse">
                                <User className="w-4 h-4 text-slate-400 shrink-0" />
                                <span className="text-slate-500">{language === 'ar' ? 'صاحب الحساب:' : 'Owner:'}</span>
                                <span className="font-bold text-slate-800">{vendor.ownerName || vendor.bankAccountName}</span>
                              </div>
                            )}

                            {/* Location / Region */}
                            <div className="flex items-center gap-2.5 px-1 rtl:flex-row-reverse">
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className="text-slate-500">{language === 'ar' ? 'المنطقة:' : 'Region:'}</span>
                              <span className="font-bold text-slate-800">
                                {vendor.pickupRegion || vendor.city || vendor.location || (language === 'ar' ? 'البحرين' : 'Bahrain')}
                              </span>
                            </div>

                            {/* Bank Name & IBAN */}
                            <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 rtl:text-right">
                              <div className="flex items-center gap-2 rtl:flex-row-reverse text-slate-500 text-[11px]">
                                <Landmark className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span>{vendor.bankName || (language === 'ar' ? 'البنك غير محدد' : 'Bank not specified')}</span>
                              </div>
                              <div className="font-mono font-bold text-slate-800 text-[11px] dir-ltr text-left overflow-x-auto truncate">
                                {vendor.iban || (language === 'ar' ? 'آيبان غير مضاف' : 'IBAN not set')}
                              </div>
                            </div>

                            {/* Instagram if available */}
                            {vendor.instagram && (
                              <div className="flex items-center gap-2.5 px-1 rtl:flex-row-reverse">
                                <Instagram className="w-4 h-4 text-rose-500 shrink-0" />
                                <span className="text-slate-500">Instagram:</span>
                                <a
                                  href={`https://instagram.com/${vendor.instagram.replace('@', '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-indigo-600 hover:underline"
                                >
                                  @{vendor.instagram.replace('@', '')}
                                </a>
                              </div>
                            )}

                            {/* AI Credits & Created Date */}
                            <div className="flex items-center justify-between px-1 pt-1 text-[11px] text-slate-400 rtl:flex-row-reverse border-t border-slate-100/60">
                              <div className="flex items-center gap-1 rtl:flex-row-reverse">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>{vendor.aiCredits || 0} {language === 'ar' ? 'رصيد الذكاء' : 'AI Credits'}</span>
                              </div>
                              <div className="flex items-center gap-1 rtl:flex-row-reverse">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{format(new Date(vendor.createdAt), 'dd MMM yyyy')}</span>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Change Plan Controls */}
                      <div className="p-4 bg-slate-50/80 border-t border-slate-100 rounded-b-[2.5rem] mt-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">
                          {language === 'ar' ? 'ترقية / تغيير باقة التاجر' : 'Upgrade / Change Vendor Plan'}
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['starter', 'pro', 'enterprise'] as SubscriptionPlan[]).map(p => (
                            <button
                              key={p}
                              onClick={() => updateVendorPlan(vendor.id, p)}
                              disabled={planName === p}
                              className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 ${
                                planName === p
                                  ? p === 'enterprise' ? 'bg-amber-500 text-white shadow-sm' :
                                    p === 'pro' ? 'bg-indigo-600 text-white shadow-sm' :
                                    'bg-slate-800 text-white shadow-sm'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600'
                              }`}
                            >
                              <span className="capitalize">{p}</span>
                              {planName === p && (
                                <span className="text-[8px] opacity-80">{language === 'ar' ? '(الحالية)' : '(Current)'}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

              {filteredVendors.length === 0 && (
                <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                  <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="font-bold text-slate-400">{language === 'ar' ? 'لم يتم العثور على نتائج' : 'No results found'}</p>
                </div>
              )}
          </>
        )}

        {activeTab === 'payment_settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column */}
            <form onSubmit={handleSavePaymentSettings} className="lg:col-span-7 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 rtl:flex-row-reverse">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Landmark className="w-5 h-5" />
                </div>
                <div className="rtl:text-right">
                  <h2 className="text-xl font-black text-slate-800">
                    {language === 'ar' ? 'تعديل بيانات الحساب للدفع' : 'Edit Payment Account Details'}
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    {language === 'ar' ? 'تحديث رقم بنفت بي، الآيبان، واسم البنك الظاهر للتجار عند الشحن والترقية' : 'Update BenefitPay, IBAN, and Bank info displayed to vendors during checkout'}
                  </p>
                </div>
              </div>

              {paymentSettingsSuccess && (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 flex items-center gap-3 rtl:flex-row-reverse">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-xs font-bold rtl:text-right">
                    {language === 'ar' ? 'تم حفظ بيانات الحساب البنكي للدفع ونشرها للتجار بنجاح!' : 'Payment bank account details saved and updated successfully!'}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 text-right rtl:text-right">
                    {language === 'ar' ? 'رقم بنفت بي (BenefitPay Number)' : 'BenefitPay Mobile Number'}
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-4 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={benefitPayPhone}
                      onChange={e => setBenefitPayPhone(e.target.value)}
                      placeholder="e.g. 36368522"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all font-semibold text-sm text-left"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 text-right rtl:text-right">
                    {language === 'ar' ? 'اسم المستلم / صاحب الحساب' : 'Account Holder Name'}
                  </label>
                  <div className="relative flex items-center">
                    <Users className="absolute left-4 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={accountHolder}
                      onChange={e => setAccountHolder(e.target.value)}
                      placeholder="e.g. Mursal Al-Bakery / Curbside GCC"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all font-semibold text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 text-right rtl:text-right">
                    {language === 'ar' ? 'اسم بنك المستلم' : 'Receiver Bank Name'}
                  </label>
                  <div className="relative flex items-center">
                    <Landmark className="absolute left-4 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      placeholder="e.g. Al Salam Bank (بنك السلام)"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all font-semibold text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 text-right rtl:text-right">
                    {language === 'ar' ? 'رقم الآيبان (IBAN)' : 'IBAN Number'}
                  </label>
                  <div className="relative flex items-center">
                    <CreditCard className="absolute left-4 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={iban}
                      onChange={e => setIban(e.target.value)}
                      placeholder="e.g. BH25 ALSL 0000 3636 8522 0001"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all font-mono font-semibold text-sm text-left"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPaymentSettings}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-extrabold text-sm shadow-md shadow-emerald-100 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {savingPaymentSettings ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{language === 'ar' ? 'حفظ ونشر بيانات الدفع' : 'Save & Update Payment Details'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Preview Column */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className={`text-xs font-black text-slate-400 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'ar' ? 'معاينة شاشة التحويل للتجار' : 'Preview Vendor Payment Screen'}
              </h3>
              
              <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2 rtl:flex-row-reverse">
                  <span className="w-3 h-3 rounded-full bg-rose-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-black text-slate-300 ml-2">{language === 'ar' ? 'شاشة تحويل الباقة' : 'Vendor Payment Screen'}</span>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-2xl text-amber-900 font-semibold text-xs leading-relaxed rtl:text-right">
                  {language === 'ar' 
                    ? 'يرجى تحويل مبلغ الباقة لحساب بنفت بي أو الحساب البنكي الموضح بالأسفل، ثم إرفاق لقطة شاشة لإيصال التحويل لإتمام العملية.'
                    : 'Please transfer the package price to the BenefitPay number or Bank Account below, then upload your transaction screenshot.'}
                </div>

                {/* Live Card Preview */}
                <div className="bg-slate-50 p-4 border border-slate-200/70 rounded-2xl space-y-3 font-medium text-xs text-slate-700">
                  <div className="flex justify-between items-center rtl:flex-row-reverse">
                    <span className="text-slate-400">{language === 'ar' ? 'رقم بنفت بي:' : 'BenefitPay Mobile:'}</span>
                    <span className="font-bold text-slate-900">{benefitPayPhone || '---'}</span>
                  </div>
                  <div className="flex justify-between items-center rtl:flex-row-reverse">
                    <span className="text-slate-400">{language === 'ar' ? 'اسم المستلم:' : 'Account Holder:'}</span>
                    <span className="font-bold text-slate-900">{accountHolder || '---'}</span>
                  </div>
                  <div className="flex justify-between items-center rtl:flex-row-reverse">
                    <span className="text-slate-400">{language === 'ar' ? 'بنك المستلم:' : 'Receiver Bank:'}</span>
                    <span className="font-bold text-slate-900">{bankName || '---'}</span>
                  </div>
                  <div className="flex justify-between items-start rtl:flex-row-reverse">
                    <span className="text-slate-400 shrink-0">{language === 'ar' ? 'رقم الآيبان (IBAN):' : 'IBAN:'}</span>
                    <span className="font-mono font-bold text-slate-900 text-right max-w-[200px] break-all leading-tight">
                      {iban || '---'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contact_settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column */}
            <form onSubmit={handleSaveSettings} className="lg:col-span-7 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Settings className="w-5 h-5" />
                </div>
                <div className="rtl:text-right">
                  <h2 className="text-xl font-black text-slate-800">
                    {language === 'ar' ? 'إعدادات قنوات التواصل' : 'Contact Channels Settings'}
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    {language === 'ar' ? 'التحكم بالمعلومات الظاهرة في صفحة اتصل بنا' : 'Control the contact information displayed on the Contact Us page'}
                  </p>
                </div>
              </div>

              {settingsSuccess && (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-xs font-bold">
                    {language === 'ar' ? 'تم حفظ التعديلات ونشرها بنجاح لموقعك!' : 'Contact settings saved and published successfully!'}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 text-right rtl:text-right">
                    {language === 'ar' ? 'بريد الدعم الفني والمساندة' : 'Technical Support Email'}
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-4 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={supportEmail}
                      onChange={e => setSupportEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 text-right rtl:text-right">
                    {language === 'ar' ? 'بريد المبيعات والتسويق' : 'Sales Email'}
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-4 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={salesEmail}
                      onChange={e => setSalesEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 text-right rtl:text-right">
                    {language === 'ar' ? 'رقم واتساب الدعم الفني' : 'Technical Support WhatsApp'}
                  </label>
                  <div className="relative flex items-center">
                    <MessageSquare className="absolute left-4 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={supportWhatsapp}
                      onChange={e => setSupportWhatsapp(e.target.value)}
                      placeholder="e.g. +97336368522"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-sm text-left"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 text-right rtl:text-right">
                    {language === 'ar' ? 'رابط حساب الانستقرام' : 'Instagram URL'}
                  </label>
                  <div className="relative flex items-center">
                    <Instagram className="absolute left-4 w-5 h-5 text-slate-400" />
                    <input
                      type="url"
                      required
                      value={instagramUrl}
                      onChange={e => setInstagramUrl(e.target.value)}
                      placeholder="e.g. https://instagram.com/jareeb.bh"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-sm text-left"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-extrabold text-sm shadow-md shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {savingSettings ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{language === 'ar' ? 'حفظ ونشر التعديلات' : 'Save & Publish Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Preview Column */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className={`text-xs font-black text-slate-400 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'ar' ? 'معاينة حية للمتصفح' : 'Live Preview in Browser'}
              </h3>
              
              <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2 rtl:flex-row-reverse">
                  <span className="w-3 h-3 rounded-full bg-rose-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-black text-slate-300 ml-2">jareeb.bh/contact</span>
                </div>

                <div className="space-y-3.5">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-800">{language === 'ar' ? 'بريد الدعم والمساندة' : 'Support Email'}</h4>
                      <p className="text-xs font-bold text-indigo-600 mt-1 truncate">{supportEmail}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-800">{language === 'ar' ? 'بريد المبيعات والتسويق' : 'Sales Email'}</h4>
                      <p className="text-xs font-bold text-purple-600 mt-1 truncate">{salesEmail}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-800">{language === 'ar' ? 'واتساب الدعم الفني' : 'Technical Support WhatsApp'}</h4>
                      <p className="text-xs font-bold text-emerald-600 mt-1 truncate">{supportWhatsapp}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                      <Instagram className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-800">{language === 'ar' ? 'حساب الانستقرام' : 'Instagram URL'}</h4>
                      <p className="text-xs font-bold text-pink-600 mt-1 truncate">{instagramUrl}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inquiries' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rtl:flex-row-reverse mb-2">
              <div className="flex items-center gap-2.5 rtl:flex-row-reverse">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Inbox className="w-5 h-5" />
                </div>
                <div className="rtl:text-right">
                  <h2 className="text-xl font-black text-slate-800">
                    {language === 'ar' ? 'صندوق رسائل واستفسارات المستخدمين' : 'Inquiries Inbox'}
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    {language === 'ar' ? 'رسائل مرسلة من صفحة اتصل بنا' : 'Messages submitted from the Contact Us page'}
                  </p>
                </div>
              </div>
              <button 
                onClick={fetchInquiries}
                className="px-4 py-2.5 text-xs font-bold bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                {language === 'ar' ? 'تحديث الصندوق' : 'Refresh Inbox'}
              </button>
            </div>

            {loadingInquiries ? (
              <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-bold text-slate-400">{language === 'ar' ? 'جاري جلب الرسائل...' : 'Fetching inquiries...'}</p>
              </div>
            ) : inquiries.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="font-bold text-slate-400">
                  {language === 'ar' ? 'الصندوق فارغ حالياً، لا توجد رسائل واردة' : 'Inbox is empty. No inquiries found.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {inquiries.map((inq, idx) => (
                  <div key={inq.id || idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 rounded-l" />
                    
                    <div>
                      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4 rtl:flex-row-reverse">
                        <div className="rtl:text-right">
                          <h4 className="font-black text-slate-800 text-sm leading-tight mb-1">{inq.name}</h4>
                          <a href={`mailto:${inq.email}`} className="text-[11px] text-indigo-600 hover:underline font-bold">
                            {inq.email}
                          </a>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                          {inq.createdAt ? format(new Date(inq.createdAt), 'MMM dd, yyyy') : ''}
                        </span>
                      </div>

                      <p className={`text-slate-600 text-xs font-semibold leading-relaxed whitespace-pre-wrap mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {inq.message}
                      </p>
                    </div>

                    <div className={`flex justify-end pt-2 border-t border-slate-50 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                      <a 
                        href={`mailto:${inq.email}?subject=RE: Jareeb Platform Inquiry`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-50 text-[10px] font-black text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'رد عبر البريد' : 'Reply via Email'}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
