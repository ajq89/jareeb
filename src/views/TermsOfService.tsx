/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { useLanguage } from '../lib/i18n';
import { motion } from 'motion/react';
import {
  FileText,
  User,
  Activity,
  Package,
  CreditCard,
  Layers,
  Award,
  AlertTriangle,
  Server,
  XCircle,
  HelpCircle,
  Scale,
  Calendar,
  Search,
  Printer,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  Info,
} from 'lucide-react';

interface TermsSection {
  id: number;
  icon: any;
  titleAr: string;
  titleEn: string;
  contentAr: string[];
  contentEn: string[];
  paragraphsAr?: string[];
  paragraphsEn?: string[];
}

export default function TermsOfService() {
  const { language, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<number | null>(null);

  const sections: TermsSection[] = useMemo(() => [
    {
      id: 1,
      icon: Info,
      titleAr: '1. التعريف بالمنصة',
      titleEn: '1. Platform Overview',
      paragraphsAr: [
        'توفر منصة جريب خدمة إلكترونية تتيح للمستخدمين إنشاء وإدارة متاجرهم الإلكترونية، وعرض المنتجات، واستقبال الطلبات، وإدارة أعمالهم عبر الإنترنت.'
      ],
      paragraphsEn: [
        'Jareeb Platform provides an online service that enables users to create and manage their e-stores, showcase products, receive orders, and run their business operations online.'
      ],
      contentAr: [],
      contentEn: []
    },
    {
      id: 2,
      icon: User,
      titleAr: '2. إنشاء الحساب',
      titleEn: '2. Account Creation',
      paragraphsAr: ['عند التسجيل في المنصة، يلتزم المستخدم بما يلي:'],
      paragraphsEn: ['When registering on the platform, the user agrees and is committed to:'],
      contentAr: [
        'تقديم معلومات صحيحة ومحدثة.',
        'الحفاظ على سرية بيانات تسجيل الدخول.',
        'تحمل المسؤولية الكاملة عن جميع الأنشطة التي تتم من خلال حسابه.',
        'عدم مشاركة الحساب مع الآخرين دون إذن.'
      ],
      contentEn: [
        'Providing accurate, true, and up-to-date information.',
        'Maintaining the confidentiality of login credentials.',
        'Taking full responsibility for all activities occurring under their account.',
        'Not sharing the account with others without prior permission.'
      ]
    },
    {
      id: 3,
      icon: Activity,
      titleAr: '3. استخدام المنصة',
      titleEn: '3. Platform Usage',
      paragraphsAr: [
        'يوافق المستخدم على استخدام المنصة بطريقة قانونية وأخلاقية، ويُمنع استخدام المنصة في:'
      ],
      paragraphsEn: [
        'The user agrees to use the platform in a legal and ethical manner. It is strictly prohibited to use the platform for:'
      ],
      contentAr: [
        'بيع المنتجات أو الخدمات المخالفة للقوانين.',
        'نشر محتوى مضلل أو احتيالي.',
        'انتهاك حقوق الملكية الفكرية للغير.',
        'نشر برامج ضارة أو محاولة اختراق المنصة.',
        'إساءة استخدام الخدمات أو تعطيل عمل المنصة.'
      ],
      contentEn: [
        'Selling products or services that violate laws.',
        'Publishing misleading or fraudulent content.',
        'Infringing upon the intellectual property rights of others.',
        'Distributing harmful software or attempting to hack/compromise the platform.',
        'Abusing services or disrupting the operation of the platform.'
      ]
    },
    {
      id: 4,
      icon: Package,
      titleAr: '4. المنتجات والمسؤولية',
      titleEn: '4. Products & Liabilities',
      paragraphsAr: [
        'يتحمل صاحب المتجر المسؤولية الكاملة عن:',
        'ولا تتحمل المنصة أي مسؤولية عن النزاعات بين البائع والمشتري.'
      ],
      paragraphsEn: [
        'The store owner assumes full responsibility for:',
        'The platform bears absolutely no liability for any disputes arising between the seller and the buyer.'
      ],
      contentAr: [
        'المنتجات أو الخدمات التي يعرضها.',
        'جودة المنتجات والخدمات المقدمة.',
        'تسعير المنتجات والضرائب ذات الصلة.',
        'دقة الأوصاف والصور والبيانات المدرجة.',
        'تنفيذ الطلبات وتوصيلها للعملاء.',
        'خدمة العملاء والرد على الاستفسارات.',
        'الامتثال للأنظمة والقوانين المحلية المعمول بها.'
      ],
      contentEn: [
        'The products or services they showcase.',
        'The quality of products and services provided.',
        'Product pricing and any relevant taxes.',
        'Accuracy of descriptions, images, and listed data.',
        'Fulfilling and delivering orders to customers.',
        'Customer support and answering inquiries.',
        'Compliance with applicable local rules and regulations.'
      ]
    },
    {
      id: 5,
      icon: CreditCard,
      titleAr: '5. المدفوعات',
      titleEn: '5. Payments Processing',
      paragraphsAr: [
        'قد توفر المنصة وسائل دفع إلكترونية عبر مزودي خدمات معتمدين.',
        'لا تتحمل المنصة مسؤولية أي أعطال أو تأخير ناتج عن مزود خدمة الدفع.'
      ],
      paragraphsEn: [
        'The platform may provide electronic payment methods through certified payment gateway providers.',
        'The platform is not responsible for any malfunctions or delays caused by third-party payment service providers.'
      ],
      contentAr: [],
      contentEn: []
    },
    {
      id: 6,
      icon: Layers,
      titleAr: '6. الاشتراكات والرسوم',
      titleEn: '6. Subscriptions & Fees',
      paragraphsAr: [
        'قد تقدم المنصة باقات مجانية ومدفوعة.',
        'في حال الاشتراك في إحدى الباقات المدفوعة:'
      ],
      paragraphsEn: [
        'The platform may offer both free and paid subscription plans.',
        'When subscribing to one of the paid packages:'
      ],
      contentAr: [
        'يتم توضيح الرسوم والضرائب بوضوح قبل إتمام الاشتراك.',
        'يتم تجديد الاشتراك تلقائيًا وفقًا للباقة المختارة ما لم يقم المستخدم بإلغائه.',
        'الرسوم المدفوعة غير قابلة للاسترداد إلا إذا نصت السياسة صراحة على خلاف ذلك.'
      ],
      contentEn: [
        'Fees and taxes are clearly indicated before completing the subscription.',
        'Subscriptions are automatically renewed based on the selected billing cycle unless cancelled by the user.',
        'Paid fees are non-refundable unless the refund policy explicitly states otherwise.'
      ]
    },
    {
      id: 7,
      icon: Award,
      titleAr: '7. الملكية الفكرية',
      titleEn: '7. Intellectual Property',
      paragraphsAr: [
        'جميع حقوق المنصة، بما في ذلك التصميم، والبرمجيات، والشعارات، والمحتوى، مملوكة لمنصة جريب.',
        'لا يجوز نسخ أو إعادة استخدام أي جزء من المنصة دون الحصول على إذن كتابي مسبق.'
      ],
      paragraphsEn: [
        'All platform rights, including designs, software code, branding assets, and system content, are owned by Jareeb Platform.',
        'No part of the platform may be copied, redistributed, or reused without prior written consent.'
      ],
      contentAr: [],
      contentEn: []
    },
    {
      id: 8,
      icon: Server,
      titleAr: '8. توفر الخدمة',
      titleEn: '8. Service Availability',
      paragraphsAr: [
        'نسعى إلى توفير الخدمة بأعلى مستوى ممكن من الكفاءة والاستقرار، إلا أننا لا نضمن استمرارها دون انقطاع أو أخطاء تقنية طارئة.',
        'يجوز لنا إجراء أعمال الصيانة الدورية أو التحديثات العاجلة عند الحاجة لتحسين الأداء.'
      ],
      paragraphsEn: [
        'We strive to maintain high service reliability and stability, but we do not guarantee continuous uninterrupted access or a complete absence of technical anomalies.',
        'We reserve the right to perform scheduled maintenance or urgent updates whenever necessary to improve performance.'
      ],
      contentAr: [],
      contentEn: []
    },
    {
      id: 9,
      icon: AlertTriangle,
      titleAr: '9. تعليق أو إيقاف الحساب',
      titleEn: '9. Account Suspension or Termination',
      paragraphsAr: ['يحق للمنصة تعليق أو إغلاق أي حساب فورًا وبدون إشعار مسبق في حال:'],
      paragraphsEn: ['The platform reserves the right to suspend or terminate any account immediately and without notice in case of:'],
      contentAr: [
        'مخالفة أي بند من هذه الشروط والأحكام.',
        'استخدام المنصة بشكل غير قانوني أو مريب.',
        'تقديم معلومات مضللة أو هوية مزيفة عند التسجيل.',
        'إساءة استخدام الخدمات أو إلحاق الضرر بالمستخدمين الآخرين.'
      ],
      contentEn: [
        'Violation of any clause in these Terms of Service.',
        'Using the platform in an illegal, unauthorized, or suspicious manner.',
        'Providing misleading info or false identity during registration.',
        'Abusing services or causing harm/disruption to other platform users.'
      ]
    },
    {
      id: 10,
      icon: XCircle,
      titleAr: '10. حدود المسؤولية',
      titleEn: '10. Limitation of Liability',
      paragraphsAr: ['لا تتحمل المنصة أي مسؤولية عن:'],
      paragraphsEn: ['The platform shall not be held liable for:'],
      contentAr: [
        'أي خسائر تجارية أو مالية ناتجة عن استخدام أو عدم القدرة على استخدام المنصة.',
        'أي نزاعات، مطالبات، أو معاملات بين البائع والعملاء.',
        'الأعطال والأخطاء الفنية الناتجة عن مزودي الخدمات الخارجية (مثل بوابات الدفع أو الاستضافة).',
        'فقدان الأرباح، البيانات، أو السمعة التجارية الناتج عن ظروف قاهرة خارجة عن السيطرة.'
      ],
      contentEn: [
        'Any commercial or financial losses resulting from the use or inability to use the platform.',
        'Any disputes, claims, or financial transactions between the seller and their customers.',
        'Service disruptions or technical failures caused by external providers (such as hosting or payment gateways).',
        'Loss of profits, business data, or reputation due to force majeure and uncontrollable events.'
      ]
    },
    {
      id: 11,
      icon: FileText,
      titleAr: '11. تعديل الشروط',
      titleEn: '11. Modification of Terms',
      paragraphsAr: [
        'يجوز لنا تعديل شروط الخدمة هذه في أي وقت، ويعتبر استمرار استخدامك للمنصة بعد نشر التعديلات الجديدة بمثابة موافقة صريحة منك عليها.'
      ],
      paragraphsEn: [
        'We reserve the right to amend these Terms of Service at any time. Your continued use of the platform after updates are published constitutes your explicit agreement to the modified terms.'
      ],
      contentAr: [],
      contentEn: []
    },
    {
      id: 12,
      icon: XCircle,
      titleAr: '12. إنهاء الاستخدام',
      titleEn: '12. Account Deactivation',
      paragraphsAr: [
        'يجوز للمستخدم إغلاق حسابه في أي وقت من خلال إعدادات لوحة التحكم، كما يجوز للمنصة إنهاء أو تعليق الحساب عند مخالفة الشروط أو إذا استدعت الضرورة التشغيلية ذلك.'
      ],
      paragraphsEn: [
        'Users can close their account at any time via control panel settings. The platform may also terminate or suspend the account if terms are breached or if operational necessities arise.'
      ],
      contentAr: [],
      contentEn: []
    },
    {
      id: 13,
      icon: Scale,
      titleAr: '13. القانون المعمول به',
      titleEn: '13. Governing Law',
      paragraphsAr: [
        'تخضع هذه الشروط وتفسر وفقًا للقوانين المعمول بها في مملكة البحرين، وتكون المحاكم المختصة في البحرين هي الجهة المختصة بالنظر في أي نزاع يتعلق بهذه الشروط، ما لم ينص القانون على خلاف ذلك.'
      ],
      paragraphsEn: [
        'These terms are governed by and construed in accordance with the laws of the Kingdom of Bahrain. The competent courts of Bahrain shall have exclusive jurisdiction over any disputes relating to these terms, unless otherwise prescribed by law.'
      ],
      contentAr: [],
      contentEn: []
    },
    {
      id: 14,
      icon: HelpCircle,
      titleAr: '14. التواصل معنا',
      titleEn: '14. Contact Support',
      paragraphsAr: ['لأي استفسارات أو ملاحظات تتعلق بشروط الخدمة، يمكنكم التواصل معنا عبر:'],
      paragraphsEn: ['For any inquiries or feedback regarding our Terms of Service, feel free to contact us through:'],
      contentAr: [
        'البريد الإلكتروني الدعم الفني: support@jareeb.com',
        'صفحة "تواصل معنا" المخصصة داخل المنصة.'
      ],
      contentEn: [
        'Technical support email: support@jareeb.com',
        'The dedicated contact page on the platform.'
      ]
    }
  ], []);

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase();
    return sections.filter((section) => {
      const matchAr =
        section.titleAr.toLowerCase().includes(query) ||
        section.paragraphsAr?.some((p) => p.toLowerCase().includes(query)) ||
        section.contentAr.some((c) => c.toLowerCase().includes(query));
      const matchEn =
        section.titleEn.toLowerCase().includes(query) ||
        section.paragraphsEn?.some((p) => p.toLowerCase().includes(query)) ||
        section.contentEn.some((c) => c.toLowerCase().includes(query));
      return language === 'ar' ? matchAr : matchEn;
    });
  }, [sections, searchQuery, language]);

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (id: number) => {
    setActiveSection(id);
    const element = document.getElementById(`terms-section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div id="root" className="min-h-screen bg-slate-50/50 py-12 md:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Decorative ambient blurred backgrounds */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-50/60 rounded-full filter blur-3xl -z-10 animate-pulse duration-[7000ms]" />
        <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-slate-100 rounded-full filter blur-3xl -z-10 animate-pulse duration-[9000ms]" />

        {/* Breadcrumb Navigation */}
        <div className={`flex items-center gap-2 text-xs text-slate-400 mb-8 font-medium ${isRTL ? 'justify-start' : 'justify-start'}`}>
          <span className="hover:text-indigo-600 cursor-pointer transition-colors" onClick={() => window.location.href = '/'}>
            {language === 'ar' ? 'الرئيسية' : 'Home'}
          </span>
          {isRTL ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <span className="text-slate-600 font-semibold">
            {language === 'ar' ? 'شروط الخدمة والاستخدام' : 'Terms of Service'}
          </span>
        </div>

        {/* Master Header Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-10 shadow-sm mb-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-slate-50 rounded-full -ml-8 -mb-8" />
          
          <div className="relative z-10">
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 mb-4">
                  <Scale className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'شروط رسمية' : 'Platform Agreement'}
                </span>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  {language === 'ar' ? 'شروط الخدمة والاستخدام' : 'Terms of Service & Usage'}
                </h1>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all text-xs font-bold active:scale-95 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>{language === 'ar' ? 'طباعة الشروط' : 'Print Terms'}</span>
                </button>
              </div>
            </div>

            {/* Intro text */}
            <div className={`border-t border-slate-100 pt-6 mt-6 text-slate-600 leading-relaxed max-w-3xl ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-sm md:text-base font-medium">
                {language === 'ar' ? (
                  <>
                    مرحبًا بك في <span className="text-indigo-600 font-bold">منصة جريب</span>. باستخدامك للمنصة، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي من هذه الشروط، فيرجى عدم استخدام المنصة.
                  </>
                ) : (
                  <>
                    Welcome to <span className="text-indigo-600 font-bold">Jareeb Platform</span>. By using our platform, you agree to comply with and be bound by these terms and conditions. If you do not agree with any of these terms, please do not use the platform.
                  </>
                )}
              </p>
            </div>

            {/* Last Modified Date Badge */}
            <div className={`flex items-center gap-2 mt-6 text-xs text-slate-400 font-bold ${isRTL ? 'justify-start' : 'justify-start'}`}>
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                {language === 'ar' ? 'آخر تحديث: 17 يوليو 2026' : 'Last Updated: July 17, 2026'}
              </span>
            </div>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="mb-8 max-w-lg">
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRTL ? 'right-4' : 'left-4'}`} />
            <input
              type="text"
              placeholder={language === 'ar' ? 'ابحث في شروط الخدمة...' : 'Search within terms...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full py-3.5 ${isRTL ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'} bg-white border border-slate-200 rounded-2xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium shadow-sm`}
            />
          </div>
        </div>

        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Sticky Sidebar Directory Navigation (Desktop only) */}
          <div className="hidden lg:block lg:sticky lg:top-24 bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm space-y-1">
            <h3 className={`text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {language === 'ar' ? 'فهرس الشروط' : 'Terms Index'}
            </h3>
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              {sections.map((sec) => {
                const IconComponent = sec.icon;
                const isSelected = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-right ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-[1.02]'
                        : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                    } ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} />
                    <span className="truncate w-full block text-start">
                      {language === 'ar' ? sec.titleAr.replace(/^\d+\.\s*/, '') : sec.titleEn.replace(/^\d+\.\s*/, '')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content Body */}
          <div className="lg:col-span-3 space-y-6">
            {filteredSections.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold text-sm">
                  {language === 'ar' ? 'لم يتم العثور على نتائج للبحث.' : 'No search results found.'}
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
                >
                  {language === 'ar' ? 'مسح البحث' : 'Clear search'}
                </button>
              </div>
            ) : (
              filteredSections.map((sec) => {
                const IconComponent = sec.icon;
                return (
                  <motion.div
                    id={`terms-section-${sec.id}`}
                    key={sec.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`group bg-white border border-slate-200 rounded-3xl p-6 md:p-8 transition-all hover:border-slate-300/80 shadow-sm relative overflow-hidden ${
                      activeSection === sec.id ? 'ring-2 ring-indigo-500/20 border-indigo-200' : ''
                    } ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <div className="absolute top-0 right-0 w-16 h-1 bg-gradient-to-l from-indigo-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Section Title Header */}
                    <div className={`flex items-start gap-4 mb-5 ${isRTL ? 'flex-row' : 'flex-row'}`}>
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-slate-100 shrink-0 group-hover:bg-indigo-50/50 group-hover:border-indigo-100/50 transition-colors">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-lg md:text-xl font-extrabold text-slate-800 leading-tight">
                          {language === 'ar' ? sec.titleAr : sec.titleEn}
                        </h2>
                      </div>
                    </div>

                    {/* Paragraph blocks */}
                    {((language === 'ar' ? sec.paragraphsAr : sec.paragraphsEn) || []).map((paragraph, pIdx) => (
                      <p key={pIdx} className="text-slate-600 text-sm md:text-base leading-relaxed mb-4">
                        {paragraph}
                      </p>
                    ))}

                    {/* Interactive bullet points list */}
                    {(language === 'ar' ? sec.contentAr : sec.contentEn).length > 0 && (
                      <ul className="space-y-2.5 mt-2">
                        {(language === 'ar' ? sec.contentAr : sec.contentEn).map((item, idx) => (
                          <li
                            key={idx}
                            className={`flex items-start gap-2.5 text-sm md:text-base text-slate-600 leading-relaxed ${
                              isRTL ? 'flex-row' : 'flex-row'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                );
              })
            )}

            {/* Back to Top Floating Action */}
            <div className="flex justify-center pt-4">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-100 font-bold text-xs shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <ArrowUp className="w-4 h-4" />
                <span>{language === 'ar' ? 'الرجوع للأعلى' : 'Back to top'}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
