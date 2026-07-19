/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../lib/i18n';
import { motion } from 'motion/react';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Mail, 
  MessageSquare, 
  Instagram, 
  ChevronRight, 
  ChevronLeft, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  MapPin,
  Headphones,
  Sparkles
} from 'lucide-react';

interface ContactSettings {
  supportEmail: string;
  salesEmail: string;
  supportWhatsapp: string;
  instagramUrl: string;
}

const DEFAULT_SETTINGS: ContactSettings = {
  supportEmail: 'support@jareeb.com',
  salesEmail: 'sales@jareeb.com',
  supportWhatsapp: '+97336368522',
  instagramUrl: 'https://instagram.com/jareeb.bh',
};

export default function ContactPage() {
  const { language, isRTL } = useLanguage();
  const [settings, setSettings] = useState<ContactSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Inquiry form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const docRef = doc(db, 'settings', 'contact');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<ContactSettings>;
          setSettings({
            supportEmail: data.supportEmail || DEFAULT_SETTINGS.supportEmail,
            salesEmail: data.salesEmail || DEFAULT_SETTINGS.salesEmail,
            supportWhatsapp: data.supportWhatsapp || DEFAULT_SETTINGS.supportWhatsapp,
            instagramUrl: data.instagramUrl || DEFAULT_SETTINGS.instagramUrl,
          });
        }
      } catch (err) {
        console.error('Error fetching contact settings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await addDoc(collection(db, 'inquiries'), {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        createdAt: new Date().toISOString(),
        status: 'unread'
      });
      setSubmitSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      console.error('Error submitting inquiry:', err);
      setSubmitError(language === 'ar' ? 'حدث خطأ أثناء إرسال رسالتك. يرجى المحاولة لاحقاً.' : 'An error occurred while sending your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedWhatsappLink = () => {
    const cleanNum = settings.supportWhatsapp.replace(/[^0-9+]/g, '');
    const numNoPlus = cleanNum.startsWith('+') ? cleanNum.slice(1) : cleanNum;
    return `https://wa.me/${numNoPlus}`;
  };

  return (
    <div id="root" className="min-h-screen bg-slate-50/50 py-12 md:py-20 relative overflow-hidden">
      
      {/* Decorative ambient blurred backgrounds */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-50/70 rounded-full filter blur-3xl -z-10 animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-slate-100 rounded-full filter blur-3xl -z-10 animate-pulse duration-[10000ms]" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Breadcrumb Navigation */}
        <div className={`flex items-center gap-2 text-xs text-slate-400 mb-8 font-semibold ${isRTL ? 'justify-start' : 'justify-start'}`}>
          <span className="hover:text-indigo-600 cursor-pointer transition-colors" onClick={() => window.location.href = '/'}>
            {language === 'ar' ? 'الرئيسية' : 'Home'}
          </span>
          {isRTL ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <span className="text-slate-600 font-extrabold">
            {language === 'ar' ? 'اتصل بنا' : 'Contact Us'}
          </span>
        </div>

        {/* Master Header Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-10 shadow-sm mb-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-slate-50 rounded-full -ml-8 -mb-8" />
          
          <div className="relative z-10">
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 mb-4">
                  <Headphones className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'مركز المساعدة والتواصل' : 'Support & Contact Center'}
                </span>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-3">
                  {language === 'ar' ? 'يسعدنا دائماً تواصلك معنا' : "We'd Love to Hear from You"}
                </h1>
                <p className="text-slate-500 font-medium text-sm md:text-base max-w-2xl leading-relaxed">
                  {language === 'ar' 
                    ? 'في منصة جريب، نلتزم بتقديم أفضل الدعم الممكن لمساعدتك على تنمية تجارتك وإدارة متجرك بكفاءة عالية. تواصل معنا بأي وقت!'
                    : 'At Jareeb Platform, we are committed to providing the best possible support to help you grow your commerce and run your store efficiently.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Quick Contact Cards Column */}
          <div className="lg:col-span-5 space-y-5">
            <h2 className={`text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {language === 'ar' ? 'قنوات الاتصال المباشر' : 'Direct Channels'}
            </h2>

            {/* Support Email Card */}
            <motion.a
              href={`mailto:${settings.supportEmail}`}
              whileHover={{ y: -3 }}
              className="block bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-300 transition-all relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 h-full w-1 bg-indigo-600 rounded-l" />
              <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-black text-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'ايميل الدعم الفني والمساندة' : 'Support Email'}
                  </h3>
                  <p className={`text-xs font-bold text-slate-400 mt-0.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'للاستفسارات التقنية والمشاكل' : 'For technical queries & bugs'}
                  </p>
                  <p className={`text-sm font-extrabold text-indigo-600 mt-2 truncate ${isRTL ? 'text-right' : 'text-left'}`}>
                    {settings.supportEmail}
                  </p>
                </div>
              </div>
            </motion.a>

            {/* Sales Email Card */}
            <motion.a
              href={`mailto:${settings.salesEmail}`}
              whileHover={{ y: -3 }}
              className="block bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-purple-300 transition-all relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 h-full w-1 bg-purple-600 rounded-l" />
              <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-black text-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'ايميل المبيعات والتسويق' : 'Sales Email'}
                  </h3>
                  <p className={`text-xs font-bold text-slate-400 mt-0.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'للاستفسار عن الباقات والحلول الكبرى' : 'For custom plans & partnerships'}
                  </p>
                  <p className={`text-sm font-extrabold text-purple-600 mt-2 truncate ${isRTL ? 'text-right' : 'text-left'}`}>
                    {settings.salesEmail}
                  </p>
                </div>
              </div>
            </motion.a>

            {/* Whatsapp Support Card */}
            <motion.a
              href={formattedWhatsappLink()}
              target="_blank"
              rel="noreferrer"
              whileHover={{ y: -3 }}
              className="block bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-emerald-300 transition-all relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 h-full w-1 bg-emerald-500 rounded-l" />
              <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-black text-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'واتساب الدعم الفني' : 'Technical Support WhatsApp'}
                  </h3>
                  <p className={`text-xs font-bold text-slate-400 mt-0.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'محادثة فورية وسريعة مع أحد عملائنا' : 'Instant chat support with our specialists'}
                  </p>
                  <p className={`text-sm font-extrabold text-emerald-600 mt-2 truncate ${isRTL ? 'text-right' : 'text-left'}`}>
                    {settings.supportWhatsapp}
                  </p>
                </div>
              </div>
            </motion.a>

            {/* Instagram Account Card */}
            <motion.a
              href={settings.instagramUrl}
              target="_blank"
              rel="noreferrer"
              whileHover={{ y: -3 }}
              className="block bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-pink-300 transition-all relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 h-full w-1 bg-pink-500 rounded-l" />
              <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-12 h-12 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 shrink-0 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                  <Instagram className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-black text-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'حساب الانستقرام الرسمي' : 'Official Instagram Account'}
                  </h3>
                  <p className={`text-xs font-bold text-slate-400 mt-0.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'أحدث أخبار المنصة والتحديثات' : 'Follow our updates & releases'}
                  </p>
                  <p className={`text-sm font-extrabold text-pink-600 mt-2 truncate ${isRTL ? 'text-right' : 'text-left'}`}>
                    {settings.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@')}
                  </p>
                </div>
              </div>
            </motion.a>

            {/* Working Hours Banner */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-500 leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{language === 'ar' ? 'أوقات العمل والرد' : 'Working Hours'}</span>
              </div>
              <p>
                {language === 'ar'
                  ? 'نسعد باستلام استفساراتكم والرد عليها خلال ساعات العمل الرسمية من الأحد إلى الخميس من الساعة 8:00 صباحاً وحتى 5:00 مساءً بتوقيت البحرين.'
                  : 'We are online and ready to support you from Sunday to Thursday, 8:00 AM to 5:00 PM (Bahrain Time).'}
              </p>
            </div>
          </div>

          {/* Inquiry Send Form Column */}
          <div className="lg:col-span-7">
            <h2 className={`text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {language === 'ar' ? 'أرسل لنا رسالة مباشرة' : 'Send a Direct Message'}
            </h2>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
              <form onSubmit={handleInquirySubmit} className="space-y-5">
                
                {submitSuccess && (
                  <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold leading-tight">
                        {language === 'ar' ? 'تم إرسال رسالتك بنجاح!' : 'Your message has been sent successfully!'}
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">
                        {language === 'ar' 
                          ? 'شكراً لتواصلك مع جريب. سيقوم فريق الدعم بمراجعة رسالتك والرد عليك قريباً.' 
                          : 'Thank you for reaching out to Jareeb. Our support team will review your inquiry and get back to you shortly.'}
                      </p>
                    </div>
                  </div>
                )}

                {submitError && (
                  <div className="p-4 bg-rose-50 text-rose-800 rounded-2xl border border-rose-100 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                    <p className="text-sm font-bold">{submitError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 text-right rtl:text-right">
                    {language === 'ar' ? 'الاسم بالكامل' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={language === 'ar' ? 'أدخل اسمك الكريم' : 'e.g. Abdulla Al-Khalifa'}
                    className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 text-right rtl:text-right">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={language === 'ar' ? 'yourname@example.com' : 'yourname@example.com'}
                    className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-sm text-left`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 text-right rtl:text-right">
                    {language === 'ar' ? 'نص الرسالة أو الاستفسار' : 'Your Message / Inquiry'}
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={language === 'ar' ? 'اكتب استفسارك بالتفصيل هنا...' : 'How can we help you? Please provide as much detail as possible...'}
                    className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-sm leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 text-white font-extrabold text-sm shadow-md shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{language === 'ar' ? 'إرسال الرسالة للمراجعة' : 'Send Message'}</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
