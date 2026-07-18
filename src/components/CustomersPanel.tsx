import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Vendor, Order, Customer } from '../types';
import { useLanguage } from '../lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  User as UserIcon, 
  MessageSquare, 
  Phone, 
  Clock, 
  Lock, 
  Crown, 
  Zap, 
  Check, 
  CheckCircle2, 
  Trash2, 
  AlertCircle, 
  Filter, 
  Send 
} from 'lucide-react';
import { format } from 'date-fns';

interface CustomersPanelProps {
  vendor: Vendor;
  orders: Order[];
}

export default function CustomersPanel({ vendor, orders }: CustomersPanelProps) {
  const { language } = useLanguage();
  const isPro = vendor.plan === 'pro' || vendor.plan === 'enterprise';
  const [manualCustomers, setManualCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, filter, modal state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'loyal' | 'manual'>('all');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState<Customer | { id?: string; name: string; phone: string; notes: string } | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showSingleMessageModal, setShowSingleMessageModal] = useState<{ name: string; phone: string } | null>(null);

  // Form states
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', notes: '' });
  const [notesText, setNotesText] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [singleMessage, setSingleMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load manual customers
  useEffect(() => {
    if (!isPro) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'customers'), where('vendorId', '==', vendor.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setManualCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Customer));
      setLoading(false);
    }, (error) => {
      console.warn('Customers collection is locked or inaccessible for this account:', error);
      setManualCustomers([]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [vendor.id, isPro]);

  // Handle plan upgrade programmatically
  const handleUpgradeToPro = async () => {
    try {
      await updateDoc(doc(db, 'vendors', vendor.id), {
        plan: 'pro'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'vendors');
    }
  };

  // 1. Render Locked State (Paywall)
  if (!isPro) {
    return (
      <div id="customer-db-paywall" className="bg-white p-8 sm:p-12 rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[400px] h-[400px] bg-indigo-50 rounded-full blur-[100px] opacity-60 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto py-6">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl mb-6 shadow-lg shadow-indigo-100 animate-bounce">
            <Crown className="w-10 h-10" />
          </div>

          <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4 leading-tight">
            {language === 'ar' ? 'قاعدة بيانات العملاء والتسويق الرقمي' : 'Customer Database & Direct Marketing'}
          </h3>
          <div className="w-12 h-1 bg-indigo-600 rounded-full mb-6" />

          <p className="text-slate-600 font-bold text-base leading-relaxed mb-8">
            {language === 'ar' 
              ? 'هذه الميزة الحصرية متاحة فقط لمشتركي باقة برو. تتيح لك باقة برو بناء قاعدة بيانات ذكية لعملائك، وحفظ ملاحظات مخصصة، ومراقبة سلوك الشراء لزيادة المبيعات، مع إمكانية إرسال العروض التسويقية المباشرة عبر الواتساب بنقرة واحدة.'
              : 'This premium feature is only available for Pro Access subscribers. The Pro plan enables you to automatically build a smart customer database, save custom notes, track buying behavior, and instantly launch WhatsApp marketing campaigns with one click.'
            }
          </p>

          {/* Value Propositions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-right mb-10">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                <Check className="w-4 h-4 font-black" />
              </div>
              <h4 className="font-black text-slate-800 text-sm mb-1">
                {language === 'ar' ? 'تجميع تلقائي ذكي' : 'Smart Auto-Aggregation'}
              </h4>
              <p className="text-xs text-slate-400 font-semibold">
                {language === 'ar' ? 'سحب بيانات العملاء تلقائياً من طلبات متجرك.' : 'Instantly fetch customer info from all orders.'}
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h4 className="font-black text-slate-800 text-sm mb-1">
                {language === 'ar' ? 'حملات واتساب الفورية' : 'WhatsApp Campaigns'}
              </h4>
              <p className="text-xs text-slate-400 font-semibold">
                {language === 'ar' ? 'إرسال عروض خاصة وتحديثات للعملاء بنقرة زر.' : 'Send personalized offers & coupons with a single click.'}
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                <Clock className="w-4 h-4" />
              </div>
              <h4 className="font-black text-slate-800 text-sm mb-1">
                {language === 'ar' ? 'ملاحظات وتتبع سلوك' : 'Notes & Track Spend'}
              </h4>
              <p className="text-xs text-slate-400 font-semibold">
                {language === 'ar' ? 'تسجيل ملاحظات على السيارات، المفضلة، وإجمالي الإنفاق.' : 'Record car preferences, favorite items, and total spent.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleUpgradeToPro}
            className="group relative bg-slate-900 text-white px-12 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-indigo-600 hover:scale-105 active:scale-95 shadow-xl flex items-center gap-3"
          >
            <Zap className="w-4 h-4 text-amber-400 group-hover:animate-bounce" />
            <span>{language === 'ar' ? 'الترقية إلى باقة برو الآن (تجربة مجانية)' : 'Upgrade to Pro Plan Now (Free Trial)'}</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Unlocked Core Customer Database Logic
  // Aggregate customers from all orders
  const aggregatedFromOrders = new Map<string, {
    name: string;
    phone: string;
    ordersCount: number;
    totalSpent: number;
    lastOrderDate: string;
    source: 'order';
  }>();

  orders.forEach(order => {
    if (!order.customerPhone) return;
    const phoneClean = order.customerPhone.trim();
    const existing = aggregatedFromOrders.get(phoneClean);
    if (!existing) {
      aggregatedFromOrders.set(phoneClean, {
        name: order.customerName,
        phone: phoneClean,
        ordersCount: 1,
        totalSpent: order.status === 'completed' ? order.total : 0,
        lastOrderDate: order.createdAt,
        source: 'order'
      });
    } else {
      existing.ordersCount += 1;
      if (order.status === 'completed') {
        existing.totalSpent += order.total;
      }
      if (new Date(order.createdAt) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = order.createdAt;
      }
    }
  });

  // Merge manual customers with order aggregations
  const finalCustomersMap = new Map<string, {
    id?: string;
    name: string;
    phone: string;
    ordersCount: number;
    totalSpent: number;
    lastOrderDate?: string;
    notes?: string;
    source: 'order' | 'manual' | 'both';
    createdAt: string;
  }>();

  // Load manual list first
  manualCustomers.forEach(mc => {
    finalCustomersMap.set(mc.phone.trim(), {
      id: mc.id,
      name: mc.name,
      phone: mc.phone,
      ordersCount: 0,
      totalSpent: 0,
      notes: mc.notes || '',
      source: 'manual',
      createdAt: mc.createdAt
    });
  });

  // Overlap or add order customers
  aggregatedFromOrders.forEach((oc, phone) => {
    const existing = finalCustomersMap.get(phone);
    if (existing) {
      existing.ordersCount = oc.ordersCount;
      existing.totalSpent = oc.totalSpent;
      existing.lastOrderDate = oc.lastOrderDate;
      existing.source = 'both';
    } else {
      finalCustomersMap.set(phone, {
        name: oc.name,
        phone: oc.phone,
        ordersCount: oc.ordersCount,
        totalSpent: oc.totalSpent,
        lastOrderDate: oc.lastOrderDate,
        source: 'order',
        createdAt: oc.lastOrderDate
      });
    }
  });

  const allCustomers = Array.from(finalCustomersMap.values());

  // Filter & Search
  const filteredCustomers = allCustomers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.phone.includes(searchQuery);
    
    if (!matchesSearch) return false;

    if (activeFilter === 'loyal') return c.ordersCount > 1;
    if (activeFilter === 'manual') return c.source === 'manual' || c.source === 'both';
    return true;
  });

  // Stats calculation
  const totalCustomersCount = allCustomers.length;
  const loyalCount = allCustomers.filter(c => c.ordersCount > 1).length;
  const totalValue = allCustomers.reduce((acc, curr) => acc + curr.totalSpent, 0);

  // Submit manual customer to Firestore
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    if (!newCustomer.name || !newCustomer.phone) {
      setFormError(language === 'ar' ? 'الرجاء إدخال الاسم ورقم الهاتف' : 'Name and phone are required');
      setSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, 'customers'), {
        vendorId: vendor.id,
        name: newCustomer.name,
        phone: newCustomer.phone.trim(),
        notes: newCustomer.notes,
        createdAt: new Date().toISOString()
      });
      setShowAddModal(false);
      setNewCustomer({ name: '', phone: '', notes: '' });
    } catch (err) {
      console.error('Error adding customer to database:', err);
      setFormError(language === 'ar' ? 'حدث خطأ أثناء الإضافة. الرجاء المحاولة مرة أخرى لاحقاً.' : 'Error adding customer. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  // Update notes
  const handleSaveNotes = async () => {
    if (!showNotesModal) return;
    setSubmitting(true);
    
    try {
      if ('id' in showNotesModal && showNotesModal.id) {
        // Document exists, update it
        await updateDoc(doc(db, 'customers', showNotesModal.id), {
          notes: notesText
        });
      } else {
        // Document doesn't exist, create it
        await addDoc(collection(db, 'customers'), {
          vendorId: vendor.id,
          name: showNotesModal.name,
          phone: showNotesModal.phone,
          notes: notesText,
          createdAt: new Date().toISOString()
        });
      }
      setShowNotesModal(null);
    } catch (err) {
      console.error('Error saving customer notes:', err);
      setFormError(language === 'ar' ? 'حدث خطأ أثناء حفظ الملاحظات. الرجاء المحاولة مرة أخرى.' : 'Error saving notes. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete manual customer
  const handleDeleteCustomer = async (id: string) => {
    if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا العميل من قاعدة البيانات؟' : 'Are you sure you want to delete this customer?')) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'customers');
      }
    }
  };

  // Launch WhatsApp link
  const openWhatsApp = (phone: string, text: string) => {
    // Clean phone number (remove +, spaces, leading zeros depending on standard)
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    
    // Default country prefix for Bahrain (+973) if the phone number is 8 digits
    if (cleanPhone.length === 8) {
      cleanPhone = '973' + cleanPhone;
    }

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // WhatsApp quick campaign template buttons
  const predefinedTemplates = [
    {
      title: language === 'ar' ? 'ترحيب بعميل' : 'Welcome Gift',
      text: language === 'ar' 
        ? `أهلاً بك يا [الاسم]! يسعدنا تعاملك مع متجر ${vendor.name}. نود تقديم خصم 10% لطلبك القادم باستخدام كود: WELCOME10\nزُر متجرنا هنا: ${window.location.origin}/store/${vendor.slug}`
        : `Hi [Name]! Thank you for ordering from ${vendor.name}. Enjoy 10% off your next order with code: WELCOME10\nOrder here: ${window.location.origin}/store/${vendor.slug}`
    },
    {
      title: language === 'ar' ? 'عرض عطلة نهاية الأسبوع' : 'Weekend Offer',
      text: language === 'ar'
        ? `أهلاً بك [الاسم]! استمتع بعروض نهاية الأسبوع المميزة من متجر ${vendor.name} 🛍️\nخصومات خاصة لفترة محدودة فقط! تفضل بزيارة المتجر للطلب: ${window.location.origin}/store/${vendor.slug}`
        : `Hi [Name]! Check out our special weekend offers at ${vendor.name} 🛍️\nLimited-time deals just for you! Order now: ${window.location.origin}/store/${vendor.slug}`
    },
    {
      title: language === 'ar' ? 'منتجات جديدة!' : 'New Products!',
      text: language === 'ar'
        ? `مرحباً [الاسم] 👋 لقد أضفنا منتجات جديدة لذيذة اليوم في متجر ${vendor.name}! لا تفوت تجربتها.\nتفضل بزيارة قائمة المنتجات والطلب الآن: ${window.location.origin}/store/${vendor.slug}`
        : `Hi [Name] 👋 We have just added delicious new products to our menu at ${vendor.name}! Don't miss out.\nOrder now: ${window.location.origin}/store/${vendor.slug}`
    }
  ];

  return (
    <div className="space-y-8 rtl:text-right text-right">
      
      {/* Title & Add Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rtl:flex-row-reverse">
        <div>
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">{language === 'ar' ? 'قاعدة بيانات العملاء والترويج' : 'Customer Database & CRM'}</h3>
          <p className="text-slate-400 font-bold text-sm">
            {language === 'ar' ? 'تتبع عملائك، ونظم معلوماتهم، وروج لهم مباشرة عبر الواتساب' : 'Monitor customer profiles, total spend, notes, and send WhatsApp promotions.'}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="px-6 py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{language === 'ar' ? 'إطلاق حملة جماعية' : 'Launch Broadcast'}</span>
          </button>

          <button
            onClick={() => {
              setFormError(null);
              setShowAddModal(true);
            }}
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'إضافة عميل يدوياً' : 'Add Customer'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="sleek-card p-6 border-l-4 border-l-indigo-600 rtl:border-l-0 rtl:border-r-4 rtl:border-r-indigo-600">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">{language === 'ar' ? 'إجمالي العملاء' : 'Total Customers'}</span>
          <p className="text-3xl font-black text-slate-800 tracking-tighter">{totalCustomersCount}</p>
        </div>

        <div className="sleek-card p-6">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">{language === 'ar' ? 'العملاء الأكثر ولاءً (>1 طلب)' : 'Returning / Loyal Customers'}</span>
          <p className="text-3xl font-black text-indigo-600 tracking-tighter">{loyalCount}</p>
        </div>

        <div className="sleek-card p-6">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">{language === 'ar' ? 'إجمالي قيمة المشتريات للعملاء' : 'Total Customer Value'}</span>
          <p className="text-3xl font-black text-emerald-600 tracking-tighter">BHD {totalValue.toFixed(2)}</p>
        </div>
      </div>

      {/* Search and Filters Layout */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between rtl:flex-row-reverse">
        
        {/* Search */}
        <div className="relative w-full md:w-96 flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 rtl:flex-row-reverse">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'ابحث باسم العميل أو رقم الهاتف...' : 'Search by name or phone...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none flex-1 font-bold text-sm px-3 text-right rtl:text-right"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeFilter === 'all' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {language === 'ar' ? 'الكل' : 'All'}
          </button>
          <button
            onClick={() => setActiveFilter('loyal')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeFilter === 'loyal' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {language === 'ar' ? 'الأكثر شراءً' : 'Loyal Customers'}
          </button>
          <button
            onClick={() => setActiveFilter('manual')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeFilter === 'manual' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {language === 'ar' ? 'المضافين يدوياً' : 'Manually Saved'}
          </button>
        </div>

      </div>

      {/* Customers List / Table */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center">
            <UserIcon className="w-12 h-12 text-slate-200 mb-4" />
            <p className="font-bold text-base">{language === 'ar' ? 'لا يوجد عملاء يطابقون خيارات البحث' : 'No customers matched your criteria'}</p>
            <p className="text-xs font-semibold text-slate-300 mt-1">{language === 'ar' ? 'سيتجمع عملاء متجرك تلقائياً فور تلقي طلبات جديدة يدوياً أو مباشرة.' : 'Customers will populate automatically from your live orders.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right rtl:text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">{language === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">{language === 'ar' ? 'المصدر' : 'Source'}</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider text-center">{language === 'ar' ? 'الطلبات' : 'Orders'}</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider text-center">{language === 'ar' ? 'إجمالي المشتريات' : 'Spent'}</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">{language === 'ar' ? 'آخر نشاط' : 'Last Active'}</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider max-w-xs">{language === 'ar' ? 'الملاحظات' : 'Private Notes'}</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((customer, idx) => (
                  <tr key={customer.phone + idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3 rtl:flex-row-reverse text-right">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold font-mono">
                          {customer.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{customer.name}</p>
                          <p className="text-xs font-mono text-slate-400 font-bold">{customer.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                        customer.source === 'order' ? 'bg-indigo-50 text-indigo-600' :
                        customer.source === 'manual' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {customer.source === 'order' ? (language === 'ar' ? 'طلب تلقائي' : 'Order Auto') :
                         customer.source === 'manual' ? (language === 'ar' ? 'يدوي' : 'Manual') :
                         (language === 'ar' ? 'طلب + يدوي' : 'Order + Manual')}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap font-bold text-slate-800">
                      {customer.ordersCount}
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap font-black text-indigo-600">
                      BHD {customer.totalSpent.toFixed(2)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap font-semibold text-xs text-slate-500">
                      {customer.lastOrderDate 
                        ? format(new Date(customer.lastOrderDate), 'yyyy-MM-dd') 
                        : (language === 'ar' ? 'غير متوفر' : 'N/A')}
                    </td>
                    <td className="px-6 py-5 max-w-xs truncate text-xs text-slate-500 font-medium">
                      {customer.notes ? (
                        <div className="group relative">
                          <span className="block truncate max-w-[150px]">{customer.notes}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setFormError(null);
                            setShowNotesModal(customer);
                            setNotesText('');
                          }}
                          className="text-slate-300 hover:text-indigo-600 text-[10px] font-bold uppercase tracking-wider underline"
                        >
                          {language === 'ar' ? 'أضف ملاحظة' : '+ Add Note'}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setShowSingleMessageModal({ name: customer.name, phone: customer.phone });
                            setSingleMessage('');
                          }}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
                          title={language === 'ar' ? 'أرسل رسالة واتساب' : 'Send WhatsApp Message'}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setFormError(null);
                            setShowNotesModal(customer);
                            setNotesText(customer.notes || '');
                          }}
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                          title={language === 'ar' ? 'تعديل الملاحظات' : 'Edit Notes'}
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        {customer.id && (
                          <button
                            onClick={() => handleDeleteCustomer(customer.id!)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors"
                            title={language === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Add manual customer */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 max-w-md w-full relative"
            >
              <div className="rtl:text-right text-right mb-6">
                <h4 className="text-xl font-black text-slate-900 tracking-tight">
                  {language === 'ar' ? 'إضافة عميل جديد يدوياً' : 'Add New Customer'}
                </h4>
                <p className="text-xs text-slate-400 font-bold">
                  {language === 'ar' ? 'أدخل أرقام الهواتف لإضافتهم لقاعدة بياناتك لغرض إرسال العروض والتسويق' : 'Add customer details manually to send offers.'}
                </p>
              </div>

              {formError && (
                <div className="p-4 mb-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-start gap-3 text-xs font-bold rtl:flex-row-reverse">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddCustomer} className="space-y-4 rtl:text-right">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'اسم العميل' : 'Customer Name'}</label>
                  <input
                    required
                    type="text"
                    value={newCustomer.name}
                    onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                    placeholder={language === 'ar' ? 'مثال: محمد علي' : 'e.g. Ali Ahmed'}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'رقم الهاتف (الواتساب)' : 'Phone Number (WhatsApp)'}</label>
                  <input
                    required
                    type="text"
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                    placeholder="e.g. +973 39999999"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'ملاحظات' : 'Notes'}</label>
                  <textarea
                    rows={2}
                    value={newCustomer.notes}
                    onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})}
                    placeholder={language === 'ar' ? 'ملاحظات مخصصة (السيارة، المشروب المفضل...)' : 'Private customer notes (car details, favorite drink...)'}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all"
                  >
                    {submitting ? '...' : (language === 'ar' ? 'حفظ العميل' : 'Save Customer')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Edit Notes */}
      <AnimatePresence>
        {showNotesModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 max-w-md w-full relative"
            >
              <div className="rtl:text-right text-right mb-6">
                <h4 className="text-xl font-black text-slate-900 tracking-tight">
                  {language === 'ar' ? 'تعديل ملاحظات العميل' : 'Edit Customer Notes'}
                </h4>
                <p className="text-xs text-slate-400 font-bold">
                  {language === 'ar' ? `العميل: ${showNotesModal.name}` : `Customer: ${showNotesModal.name}`}
                </p>
              </div>

              <div className="space-y-4 rtl:text-right">
                {formError && (
                  <div className="p-4 mb-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-start gap-3 text-xs font-bold rtl:flex-row-reverse">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'الملاحظات الخاصة' : 'Private Notes'}</label>
                  <textarea
                    rows={4}
                    value={notesText}
                    onChange={e => setNotesText(e.target.value)}
                    placeholder={language === 'ar' ? 'اكتب ملاحظاتك هنا عن العميل... مثال: سيارته لكزس بيضاء، يفضل القهوة باردة' : 'Write notes... e.g. white Lexus car, prefers iced coffee.'}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNotesModal(null)}
                    className="px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    disabled={submitting}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all"
                  >
                    {submitting ? '...' : (language === 'ar' ? 'حفظ التغييرات' : 'Save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: Send single WhatsApp message */}
      <AnimatePresence>
        {showSingleMessageModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 max-w-md w-full relative text-right rtl:text-right"
            >
              <div className="mb-6">
                <h4 className="text-xl font-black text-slate-900 tracking-tight">
                  {language === 'ar' ? 'توجيه رسالة عرض للعميل' : 'Send Customized Promotion'}
                </h4>
                <p className="text-xs text-slate-400 font-bold">
                  {language === 'ar' ? `إلى العميل: ${showSingleMessageModal.name} (${showSingleMessageModal.phone})` : `To: ${showSingleMessageModal.name} (${showSingleMessageModal.phone})`}
                </p>
              </div>

              {/* Templates */}
              <div className="mb-4">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  {language === 'ar' ? 'قوالب جاهزة سريعة:' : 'Quick Predefined Templates:'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {predefinedTemplates.map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSingleMessage(t.text.replace('[الاسم]', showSingleMessageModal.name).replace('[Name]', showSingleMessageModal.name))}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-100 rounded-xl text-[10px] font-black tracking-wide transition-all"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                    {language === 'ar' ? 'نص الرسالة التسويقية' : 'Promotion Text'}
                  </label>
                  <textarea
                    rows={4}
                    value={singleMessage}
                    onChange={e => setSingleMessage(e.target.value)}
                    placeholder={language === 'ar' ? 'اكتب رسالتك التسويقية هنا...' : 'Write message here...'}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowSingleMessageModal(null)}
                    className="px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => {
                      openWhatsApp(showSingleMessageModal.phone, singleMessage);
                      setShowSingleMessageModal(null);
                    }}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إرسال عبر واتساب' : 'Open WhatsApp'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 4: Bulk Broadcast Campaign */}
      <AnimatePresence>
        {showBroadcastModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 max-w-lg w-full relative text-right rtl:text-right"
            >
              <div className="mb-6">
                <h4 className="text-xl font-black text-slate-900 tracking-tight">
                  {language === 'ar' ? 'إطلاق حملة تسويقية لجميع العملاء' : 'Launch CRM Marketing Campaign'}
                </h4>
                <p className="text-xs text-slate-400 font-bold">
                  {language === 'ar' 
                    ? `سيتم إرسال عروض مخصصة لـ ${filteredCustomers.length} عميل في قاعدتك.` 
                    : `Send customized messages sequentially to ${filteredCustomers.length} selected customers.`}
                </p>
              </div>

              {/* Quick Template Choice */}
              <div className="mb-4">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  {language === 'ar' ? 'اختر قالب العرض الجاهز السريع:' : 'Select predefined campaign draft:'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {predefinedTemplates.map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setBroadcastMessage(t.text)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-100 rounded-xl text-[10px] font-black tracking-wide transition-all"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                    {language === 'ar' ? 'نص رسالة العرض العام (يمكنك استخدام [الاسم] ليتم استبداله تلقائياً)' : 'Campaign content (use [Name] or [الاسم] for dynamic auto-replacement)'}
                  </label>
                  <textarea
                    rows={4}
                    value={broadcastMessage}
                    onChange={e => setBroadcastMessage(e.target.value)}
                    placeholder={language === 'ar' ? 'اكتب العرض والخصومات هنا...' : 'Write your promotions here...'}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-sm text-right"
                  />
                </div>

                {/* Receiver List Mini Table */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-32 overflow-y-auto">
                  <div className="bg-slate-50 px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">{language === 'ar' ? 'قائمة المستلمين المعنيين' : 'Active Campaign Contacts'}</div>
                  <div className="divide-y divide-slate-100 px-3">
                    {filteredCustomers.map((c, i) => (
                      <div key={c.phone + i} className="py-2 flex justify-between items-center text-xs">
                        <span className="font-mono text-slate-400 font-bold">{c.phone}</span>
                        <span className="font-bold text-slate-700">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(false)}
                    className="px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Trigger sequential sending by letting them open the first and giving indicators
                      if (filteredCustomers.length > 0) {
                        const first = filteredCustomers[0];
                        const text = broadcastMessage
                          .replace('[الاسم]', first.name)
                          .replace('[Name]', first.name);
                        openWhatsApp(first.phone, text);
                      }
                      setShowBroadcastModal(false);
                      alert(language === 'ar' 
                        ? 'تم فتح المحادثة الأولى بنجاح! يمكنك العودة وإطلاق البقية بشكل متتالي لحماية حسابك من الحظر.' 
                        : 'First conversation opened. Open subsequent contacts to complete campaign safely without spam filters.');
                    }}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'بدء الإرسال المتتالي' : 'Launch CRM Sequence'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
