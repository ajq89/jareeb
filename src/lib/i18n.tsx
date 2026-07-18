import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ar' | 'en';

interface Translation {
  [key: string]: {
    ar: string;
    en: string;
  };
}

const translations: Translation = {
  // Navigation & General
  'nav.home': { ar: 'الرئيسية', en: 'Home' },
  'nav.dashboard': { ar: 'لوحة التحكم', en: 'Dashboard' },
  'nav.signin': { ar: 'تسجيل الدخول', en: 'Sign In' },
  'nav.getStarted': { ar: 'ابدأ الآن', en: 'Get Started' },
  
  // Landing Page
  'hero.title': { ar: 'من فكرة...', en: 'From Idea...' },
  'hero.titleAccent': { ar: 'إلى أول عملية بيع.', en: 'to First Sale.' },
  'hero.subtitle': { ar: 'منصة تساعد أصحاب المشاريع المنزلية على إنشاء متجر إلكتروني احترافي، إدارة المنتجات والطلبات، واستقبال المدفوعات بسهولة، دون الحاجة إلى أي خبرة تقنية.', en: 'A platform that helps home business owners build a professional online store, manage products and orders, and accept payments with ease, without requiring any technical experience.' },
  'hero.badge': { ar: 'مستقبل الاستلام من السيارة', en: 'The Future of Curbside Pickup' },
  'hero.cta': { ar: 'ابدأ الآن', en: 'Get Started Now' },
  'hero.stores': { ar: 'متجر', en: 'Stores' },
  
  // Features
  'features.title': { ar: 'كل ما تحتاجه للنمو', en: 'Everything you need to scale' },
  'features.subtitle': { ar: 'تم بناؤه بواسطة رواد أعمال محليين للشركات المحلية. سريع، موثوق، وبسيط للغاية.', en: 'Built by local entrepreneurs for local businesses. Fast, reliable, and incredibly simple.' },
  'features.catalogs.title': { ar: 'كتالوجات مباشرة', en: 'Live Catalogs' },
  'features.catalogs.desc': { ar: 'واجهات متاجر جميلة للمخابز المنزلية والمطابخ والبوتيكات. الإعداد في دقائق.', en: 'Beautiful storefronts for home bakeries, kitchens, and boutiques. Setup in minutes.' },
  'features.alerts.title': { ar: 'تنبيهات الوصول', en: 'Arrival Alerts' },
  'features.alerts.desc': { ar: 'تنبيهات صوتية وبصرية فورية بمجرد وصول العملاء إلى الخارج.', en: 'Real-time sound and visual notifications the moment customers arrive outside.' },
  'features.bento.title': { ar: 'لوحة تحكم بينتو', en: 'Bento Dashboard' },
  'features.bento.desc': { ar: 'واجهة عالية الأداء لتتبع الطلبات والإيرادات وحالة العملاء مباشرة.', en: 'High-performance interface to track orders, revenue, and customer status live.' },

  // Pricing
  'pricing.title': { ar: 'خطط مرنة لكل مرحلة', en: 'Flexible plans for every stage' },
  'pricing.starter': { ar: 'البداية', en: 'Starter' },
  'pricing.pro': { ar: 'برو للأعمال', en: 'Pro Business' },
  'pricing.enterprise': { ar: 'المؤسسات', en: 'Enterprise' },
  'pricing.free': { ar: 'مجانًا', en: 'Free' },
  'pricing.month': { ar: 'بحريني / شهرياً', en: 'BHD / month' },
  'pricing.popular': { ar: 'الأكثر شيوعاً', en: 'Most Popular' },
  
  // Storefront
  'store.addToOrder': { ar: 'إضافة للطلب', en: 'Add to order' },
  'store.outOfStock': { ar: 'نفد من المخزون', en: 'Out of Stock' },
  'store.onlyLeft': { ar: 'بقي {n} فقط!', en: 'Only {n} left!' },
  'store.yourCart': { ar: 'سلة التسوق', en: 'Your Cart' },
  'store.checkout': { ar: 'إتمام الطلب', en: 'Checkout' },
  'store.name': { ar: 'الاسم', en: 'Name' },
  'store.phone': { ar: 'رقم الهاتف', en: 'Phone Number' },
  'store.carColor': { ar: 'لون السيارة', en: 'Car Color' },
  'store.carModel': { ar: 'موديل السيارة', en: 'Car Model' },
  'store.plateNumber': { ar: 'رقم اللوحة', en: 'Plate Number' },
  'store.placeOrder': { ar: 'إرسال الطلب', en: 'Place Order' },
  'store.total': { ar: 'الإجمالي', en: 'Total' },

  // Dashboard
  'dash.liveOrders': { ar: 'الطلبات المباشرة', en: 'Live Orders' },
  'dash.history': { ar: 'سجل الطلبات', en: 'Order History' },
  'dash.products': { ar: 'المنتجات', en: 'Products' },
  'dash.settings': { ar: 'الإعدادات', en: 'Settings' },
  'dash.revenue': { ar: 'إيرادات اليوم', en: 'Today\'s Revenue' },
  'dash.activeOrders': { ar: 'طلبات نشطة', en: 'Active Orders' },
  'dash.noOrders': { ar: 'لا توجد طلبات نشطة حالياً.', en: 'No active orders found.' },
  'dash.print': { ar: 'طباعة الفاتورة', en: 'Print Receipt' },
  
  // Tracking
  'track.title': { ar: 'تتبع طلبك', en: 'Track Your Order' },
  'track.arrived': { ar: 'لقد وصلت!', en: 'I HAVE ARRIVED!' },
  'track.arrivedDesc': { ar: 'اضغط لإبلاغ المتجر أنك في الخارج', en: 'Tap to notify the store you are outside' },
  'track.status.pending': { ar: 'بانتظار التأكيد', en: 'Pending Confirmation' },
  'track.status.processing': { ar: 'جاري التحضير', en: 'Preparing Your Order' },
  'track.status.ready': { ar: 'طلبك جاهز!', en: 'Your Order is Ready!' },
  'track.status.completed': { ar: 'تم الاستلام', en: 'Order Completed' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, any>) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    return (saved as Language) || 'ar';
  });

  useEffect(() => {
    localStorage.setItem('app_lang', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, params?: Record<string, any>) => {
    let text = translations[key]?.[language] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v.toString());
      });
    }
    return text;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
