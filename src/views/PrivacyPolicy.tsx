/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { useLanguage } from '../lib/i18n';
import { motion } from 'motion/react';
import {
  Shield,
  Lock,
  Eye,
  Users,
  Share2,
  Cookie,
  CreditCard,
  UserCheck,
  Database,
  Globe,
  RefreshCw,
  Mail,
  Calendar,
  Search,
  Printer,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
} from 'lucide-react';

interface PolicySection {
  id: number;
  icon: any;
  titleAr: string;
  titleEn: string;
  contentAr: string[];
  contentEn: string[];
  paragraphsAr?: string[];
  paragraphsEn?: string[];
}

export default function PrivacyPolicy() {
  const { language, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<number | null>(null);

  const sections: PolicySection[] = useMemo(() => [
    {
      id: 1,
      icon: Eye,
      titleAr: '1. المعلومات التي نجمعها',
      titleEn: '1. Information We Collect',
      paragraphsAr: ['قد نقوم بجمع المعلومات التالية:'],
      paragraphsEn: ['We may collect the following information:'],
      contentAr: [
        'الاسم.',
        'البريد الإلكتروني.',
        'رقم الهاتف.',
        'اسم المتجر.',
        'عنوان النشاط (إن وجد).',
        'بيانات المنتجات والخدمات التي يضيفها المستخدم.',
        'بيانات الطلبات والعملاء.',
        'معلومات الدفع (لا نقوم بتخزين بيانات البطاقات البنكية).',
        'عنوان IP ونوع الجهاز والمتصفح.',
        'ملفات تعريف الارتباط (Cookies).'
      ],
      contentEn: [
        'Name.',
        'Email address.',
        'Phone number.',
        'Store name.',
        'Business address (if any).',
        'Product and service data added by the user.',
        'Order and customer data.',
        'Payment information (we do not store credit card details).',
        'IP address, device type, and browser info.',
        'Cookies.'
      ]
    },
    {
      id: 2,
      icon: Users,
      titleAr: '2. كيفية استخدام المعلومات',
      titleEn: '2. How We Use Information',
      paragraphsAr: ['نستخدم المعلومات من أجل:'],
      paragraphsEn: ['We use the collected information for:'],
      contentAr: [
        'إنشاء وإدارة حساب المستخدم.',
        'تشغيل المتجر الإلكتروني.',
        'معالجة الطلبات.',
        'تحسين أداء المنصة.',
        'إرسال الإشعارات المتعلقة بالحساب أو الطلبات.',
        'تقديم الدعم الفني.',
        'منع الاحتيال وحماية المنصة.',
        'الالتزام بالأنظمة والقوانين.'
      ],
      contentEn: [
        'Creating and managing user accounts.',
        'Operating the online store.',
        'Processing orders and fulfillment.',
        'Improving platform performance and features.',
        'Sending account or order related notifications.',
        'Providing technical support.',
        'Fraud prevention and platform protection.',
        'Compliance with legal rules and regulations.'
      ]
    },
    {
      id: 3,
      icon: Share2,
      titleAr: '3. مشاركة المعلومات',
      titleEn: '3. Sharing of Information',
      paragraphsAr: [
        'لا نقوم ببيع أو تأجير بيانات المستخدمين.',
        'قد تتم مشاركة البيانات فقط مع:'
      ],
      paragraphsEn: [
        'We do not sell or rent our users\' personal data.',
        'Data may only be shared with:'
      ],
      contentAr: [
        'مزودي خدمات الدفع.',
        'شركات الشحن أو التوصيل (عند الحاجة).',
        'مزودي الخدمات التقنية والاستضافة.',
        'الجهات الحكومية إذا تطلب القانون ذلك.'
      ],
      contentEn: [
        'Payment gateway and processing providers.',
        'Shipping or delivery companies (when necessary).',
        'Technical service and hosting providers.',
        'Government authorities if required by law.'
      ]
    },
    {
      id: 4,
      icon: Lock,
      titleAr: '4. حماية البيانات',
      titleEn: '4. Data Protection & Security',
      paragraphsAr: [
        'نستخدم إجراءات أمنية وتقنيات حديثة للمساعدة في حماية بيانات المستخدمين من الوصول غير المصرح به أو التعديل أو الفقدان.'
      ],
      paragraphsEn: [
        'We use advanced security procedures and modern technologies to help protect user data from unauthorized access, modification, or loss.'
      ],
      contentAr: [],
      contentEn: []
    },
    {
      id: 5,
      icon: Cookie,
      titleAr: '5. ملفات تعريف الارتباط (Cookies)',
      titleEn: '5. Cookies Policy',
      paragraphsAr: [
        'قد تستخدم المنصة ملفات تعريف الارتباط لتحسين تجربة المستخدم، وحفظ إعداداته، وتحليل استخدام الموقع.',
        'يمكن للمستخدم تعطيل ملفات تعريف الارتباط من خلال إعدادات المتصفح، مع العلم أن بعض الميزات قد لا تعمل بالشكل المطلوب.'
      ],
      paragraphsEn: [
        'The platform may use cookies to enhance the user experience, save preferences, and analyze website usage.',
        'Users can disable cookies through their browser settings, although some features may not function as intended.'
      ],
      contentAr: [],
      contentEn: []
    },
    {
      id: 6,
      icon: CreditCard,
      titleAr: '6. المدفوعات',
      titleEn: '6. Payments Handling',
      paragraphsAr: [
        'تتم عمليات الدفع من خلال مزودي خدمات دفع معتمدين.',
        'لا نقوم بالاحتفاظ ببيانات البطاقات الائتمانية أو معلومات الدفع الحساسة على خوادمنا.'
      ],
      paragraphsEn: [
        'Payment transactions are processed securely through certified payment service providers.',
        'We do not store credit card details or sensitive financial information on our servers.'
      ],
      contentAr: [],
      contentEn: []
    },
    {
      id: 7,
      icon: Shield,
      titleAr: '7. بيانات العملاء الخاصة بالمتاجر',
      titleEn: '7. Customers\' Data for Stores',
      paragraphsAr: [
        'يكون صاحب المتجر مسؤولًا عن البيانات التي يجمعها من عملائه عبر متجره، ويجب عليه استخدامها بما يتوافق مع القوانين والأنظمة المعمول بها.'
      ],
      paragraphsEn: [
        'The store owner is solely responsible for the data collected from their customers through their store, and they must handle it in compliance with applicable laws and regulations.'
      ],
      contentAr: [],
      contentEn: []
    },
    {
      id: 8,
      icon: Database,
      titleAr: '8. الاحتفاظ بالبيانات',
      titleEn: '8. Data Retention',
      paragraphsAr: [
        'نحتفظ بالبيانات طالما كان الحساب نشطًا أو عند الحاجة لتقديم الخدمات، أو للامتثال للمتطلبات القانونية.',
        'يجوز للمستخدم طلب حذف حسابه، مع مراعاة أي التزامات قانونية تتطلب الاحتفاظ ببعض البيانات.'
      ],
      paragraphsEn: [
        'We retain personal data for as long as the account is active or as needed to provide our services, or to comply with legal requirements.',
        'Users may request account deletion, subject to any legal obligations requiring us to retain specific elements of data.'
      ],
      contentAr: [],
      contentEn: []
    },
    {
      id: 9,
      icon: UserCheck,
      titleAr: '9. حقوق المستخدم',
      titleEn: '9. User Rights',
      paragraphsAr: ['يحق للمستخدم:'],
      paragraphsEn: ['Users have the right to:'],
      contentAr: [
        'الاطلاع على بياناته.',
        'تحديث معلوماته.',
        'طلب تصحيح البيانات غير الصحيحة.',
        'طلب حذف الحساب وفقًا للأنظمة المعمول بها.',
        'طلب نسخة من بياناته إذا كان ذلك متاحًا.'
      ],
      contentEn: [
        'Access their personal data.',
        'Update and correct their details.',
        'Request correction of inaccurate information.',
        'Request account deletion in accordance with applicable laws.',
        'Request a copy of their data where technically feasible.'
      ]
    },
    {
      id: 10,
      icon: Globe,
      titleAr: '10. روابط خارجية',
      titleEn: '10. External Links',
      paragraphsAr: [
        'قد تحتوي المنصة على روابط لمواقع أو خدمات أخرى، ولسنا مسؤولين عن سياسات الخصوصية الخاصة بتلك المواقع.'
      ],
      paragraphsEn: [
        'The platform may contain links to other websites or services. We are not responsible for the privacy practices or content of third-party websites.'
      ],
      contentAr: [],
      contentEn: []
    },
    {
      id: 11,
      icon: RefreshCw,
      titleAr: '11. التعديلات على السياسة',
      titleEn: '11. Policy Modifications',
      paragraphsAr: [
        'يجوز لنا تحديث سياسة الخصوصية من وقت لآخر، وسيتم نشر أي تعديلات على هذه الصفحة مع تحديث تاريخ آخر تعديل.'
      ],
      paragraphsEn: [
        'We may update this privacy policy from time to time. Any changes will be posted on this page with an updated last modified date.'
      ],
      contentAr: [],
      contentEn: []
    },
    {
      id: 12,
      icon: Mail,
      titleAr: '12. التواصل معنا',
      titleEn: '12. Contact Us',
      paragraphsAr: ['إذا كانت لديك أي استفسارات تتعلق بسياسة الخصوصية، يمكنك التواصل معنا عبر:'],
      paragraphsEn: ['If you have any questions or feedback about this privacy policy, you can contact us via:'],
      contentAr: [
        'البريد الإلكتروني: support@jareeb.com',
        'صفحة التواصل داخل المنصة.'
      ],
      contentEn: [
        'Email: support@jareeb.com',
        'The contact page within the platform.'
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
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div id="root" className="min-h-screen bg-slate-50/50 py-12 md:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Decorative ambient elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-50/60 rounded-full filter blur-3xl -z-10 animate-pulse duration-[6000ms]" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-slate-100 rounded-full filter blur-3xl -z-10 animate-pulse duration-[8000ms]" />

        {/* Path Navigation */}
        <div className={`flex items-center gap-2 text-xs text-slate-400 mb-8 font-medium ${isRTL ? 'justify-start' : 'justify-start'}`}>
          <span className="hover:text-indigo-600 cursor-pointer transition-colors" onClick={() => window.location.href = '/'}>
            {language === 'ar' ? 'الرئيسية' : 'Home'}
          </span>
          {isRTL ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <span className="text-slate-600 font-semibold">
            {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
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
                  <Shield className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'وثيقة رسمية' : 'Official Policy'}
                </span>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                </h1>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all text-xs font-bold active:scale-95 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>{language === 'ar' ? 'طباعة الوثيقة' : 'Print Policy'}</span>
                </button>
              </div>
            </div>

            {/* Intro text */}
            <div className={`border-t border-slate-100 pt-6 mt-6 text-slate-600 leading-relaxed max-w-3xl ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-sm md:text-base font-medium">
                {language === 'ar' ? (
                  <>
                    نحن في <span className="text-indigo-600 font-bold">منصة جريب</span> نحترم خصوصية مستخدمينا ونلتزم بحماية بياناتهم الشخصية. توضح هذه السياسة كيفية جمع المعلومات واستخدامها وحمايتها عند استخدام منصتنا.
                  </>
                ) : (
                  <>
                    We at <span className="text-indigo-600 font-bold">Jareeb Platform</span> respect our users' privacy and are committed to protecting their personal data. This policy explains how we collect, use, and protect information when you use our platform.
                  </>
                )}
              </p>
            </div>

            {/* Meta Update badge */}
            <div className={`flex items-center gap-2 mt-6 text-xs text-slate-400 font-bold ${isRTL ? 'justify-start' : 'justify-start'}`}>
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                {language === 'ar' ? 'آخر تحديث: 17 يوليو 2026' : 'Last Updated: July 17, 2026'}
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar section */}
        <div className="mb-8 max-w-lg">
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRTL ? 'right-4' : 'left-4'}`} />
            <input
              type="text"
              placeholder={language === 'ar' ? 'ابحث في سياسة الخصوصية...' : 'Search within privacy policy...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full py-3.5 ${isRTL ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'} bg-white border border-slate-200 rounded-2xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium shadow-sm`}
            />
          </div>
        </div>

        {/* Grid of Contents */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Sticky Side Navigation Table of Contents (Desktop only) */}
          <div className="hidden lg:block lg:sticky lg:top-24 bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm space-y-1">
            <h3 className={`text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {language === 'ar' ? 'فهرس السياسة' : 'Policy Index'}
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

          {/* Main Content Pane */}
          <div className="lg:col-span-3 space-y-6">
            {filteredSections.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
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
                    id={`section-${sec.id}`}
                    key={sec.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`group bg-white border border-slate-200 rounded-3xl p-6 md:p-8 transition-all hover:border-slate-300/80 shadow-sm relative overflow-hidden ${
                      activeSection === sec.id ? 'ring-2 ring-indigo-500/20 border-indigo-200' : ''
                    } ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <div className="absolute top-0 right-0 w-16 h-1 bg-gradient-to-l from-indigo-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Header */}
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

                    {/* Paragraphs */}
                    {((language === 'ar' ? sec.paragraphsAr : sec.paragraphsEn) || []).map((paragraph, pIdx) => (
                      <p key={pIdx} className="text-slate-600 text-sm md:text-base leading-relaxed mb-4">
                        {paragraph}
                      </p>
                    ))}

                    {/* Content List */}
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

            {/* Back to Top */}
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
