/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order, Vendor } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Clock, CheckCircle2, MapPin, Navigation, Car, Phone, AlertCircle, ArrowLeft, X } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '../lib/i18n';

export default function TrackingPage() {
  const { t, language, isRTL } = useLanguage();
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [isArrivalModalOpen, setIsArrivalModalOpen] = useState(false);
  const [carDetails, setCarDetails] = useState({ type: '', color: '', plate: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), async (snapshot) => {
      if (snapshot.exists()) {
        const orderData = { id: snapshot.id, ...snapshot.data() } as Order;
        setOrder(orderData);

        if (!vendor) {
          try {
            const vSnap = await getDoc(doc(db, 'vendors', orderData.vendorId));
            if (vSnap.exists()) {
              setVendor({ id: vSnap.id, ...vSnap.data() } as Vendor);
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `vendors/${orderData.vendorId}`);
          }
        }
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `orders/${orderId}`);
      setLoading(false);
    });

    return unsubscribe;
  }, [orderId, vendor]);

  const handleOnMyWay = async () => {
    if (!orderId) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), { onMyWay: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleArrival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'arrived',
        carDetails,
      });
      setIsArrivalModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-20 text-center">{language === 'ar' ? 'جاري التحميل...' : 'Loading Tracking Info...'}</div>;
  if (!order) return <div className="p-20 text-center text-red-500 font-bold">{language === 'ar' ? 'الطلب غير موجود' : 'Order not found'}</div>;

  const statusColors = {
    pending: 'bg-slate-100 text-slate-600',
    processing: 'bg-blue-100 text-blue-700',
    ready: 'bg-amber-100 text-amber-700',
    arrived: 'bg-amber-600 text-white',
    completed: 'bg-emerald-100 text-emerald-700',
  };

  const statusLabels = {
    pending: language === 'ar' ? 'بانتظار القبول' : 'Pending',
    processing: language === 'ar' ? 'جاري التحضير' : 'Processing',
    ready: language === 'ar' ? 'جاهز للاستلام' : 'Ready',
    arrived: language === 'ar' ? 'وصلت الآن' : 'OUTSIDE NOW',
    completed: language === 'ar' ? 'اكتمل الطلب' : 'Completed',
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-10">
        <Link to={`/store/${vendor?.slug}`} className="inline-flex items-center gap-2 text-sm sm:text-xs font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors mb-6 group">
          <ArrowLeft className={`w-3 h-3 transition-transform ${isRTL ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} />
          {language === 'ar' ? 'العودة للمتجر' : 'Back to Store'}
        </Link>
        <div className="flex justify-between items-end rtl:flex-row-reverse">
          <div className="rtl:text-right">
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-1">{t('track.title')}</h1>
            <p className="text-xs sm:text-[10px] text-slate-500 font-black uppercase tracking-widest">{language === 'ar' ? 'رقم الطلب' : 'Order ID'}: #{order.id.slice(-6).toUpperCase()}</p>
          </div>
          <div className={`px-4 py-1.5 rounded-xl font-black text-xs sm:text-[10px] uppercase tracking-widest shadow-sm ${statusColors[order.status]}`}>
            {statusLabels[order.status]}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Progress Card */}
        <div className="sleek-card p-10 relative overflow-hidden shadow-2xl">
          {order.status === 'completed' ? (
            <div className="text-center py-10">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-emerald-100 shadow-xl">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">{t('track.status.completed')}</h2>
              <p className="text-slate-500 font-medium leading-relaxed">{language === 'ar' ? 'استمتع بمشترياتك! نتطلع لرؤيتك مرة أخرى.' : 'Enjoy your items! We look forward to seeing you again.'}</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between mb-12 relative z-10 rtl:flex-row-reverse">
                {[
                  { icon: <Clock />, label: language === 'ar' ? 'مقبول' : 'Accepted', active: order.status !== 'pending' },
                  { icon: <Package />, label: language === 'ar' ? 'جاهز' : 'Ready', active: ['ready', 'arrived', 'completed'].includes(order.status) },
                  { icon: <Car />, label: language === 'ar' ? 'وصلت' : 'Arrived', active: order.status === 'arrived' },
                ].map((step, i) => (
                  <React.Fragment key={i}>
                    <div className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shadow-sm ${
                        step.active ? 'bg-indigo-600 border-indigo-600 text-white scale-110 shadow-indigo-200 shadow-xl' : 'bg-white border-slate-100 text-slate-200'
                      }`}>
                        {React.cloneElement(step.icon as React.ReactElement, { className: 'w-6 h-6' })}
                      </div>
                      <p className={`text-xs sm:text-[10px] mt-4 font-black uppercase tracking-widest ${step.active ? 'text-indigo-600' : 'text-slate-300'}`}>
                        {step.label}
                      </p>
                    </div>
                    {i < 2 && (
                      <div className="flex-1 h-0.5 bg-slate-100 mt-6 mx-2 self-start rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: step.active ? '100%' : '0%' }}
                          className="h-full bg-indigo-600"
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-4">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-indigo-100 shadow-lg flex items-center justify-center text-indigo-600 border border-slate-100 shrink-0">
                      <MapPin className="w-7 h-7" />
                    </div>
                    <div className="rtl:text-right flex-1">
                      <p className="text-xs sm:text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{language === 'ar' ? 'عنوان الاستلام بالتفصيل' : 'Detailed Pickup Address'}</p>
                      <p className="font-black text-slate-800 text-lg leading-tight">{vendor?.name}</p>
                      
                      {/* Standard Bahrain Address Display */}
                      <p className="text-sm sm:text-xs text-slate-600 font-bold mt-1.5 flex flex-wrap gap-1.5 rtl:flex-row-reverse">
                        {vendor?.location && <span>{vendor.location}</span>}
                        {vendor?.buildingNo && <span>• {language === 'ar' ? `مبنى ${vendor.buildingNo}` : `Bldg ${vendor.buildingNo}`}</span>}
                        {vendor?.roadNo && <span>• {language === 'ar' ? `طريق ${vendor.roadNo}` : `Road ${vendor.roadNo}`}</span>}
                        {vendor?.blockNo && <span>• {language === 'ar' ? `مجمع ${vendor.blockNo}` : `Block ${vendor.blockNo}`}</span>}
                        {vendor?.city && <span>• {vendor.city}</span>}
                      </p>
                    </div>
                  </div>

                  {vendor?.mapUrl && (
                    <a 
                      href={vendor.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3.5 rounded-xl text-xs sm:text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-emerald-100/50"
                    >
                      <MapPin className="w-4 h-4 text-white" />
                      {language === 'ar' ? 'فتح الموقع في قوقل ماب' : 'Open in Google Maps'}
                    </a>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  {!order.onMyWay && order.status !== 'arrived' && (
                    <button
                      onClick={handleOnMyWay}
                      className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-indigo-200 shadow-2xl hover:bg-indigo-700 flex items-center justify-center gap-3 transition-all active:scale-95"
                    >
                      <Navigation className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                      {language === 'ar' ? 'أنا في الطريق' : 'I am on my way'}
                    </button>
                  )}
                  
                  {order.onMyWay && order.status !== 'arrived' && (
                    <div className="bg-indigo-50 text-indigo-700 p-5 rounded-2xl border border-indigo-100 text-center font-black flex items-center justify-center gap-3 shadow-sm">
                      <Navigation className={`w-5 h-5 animate-pulse ${isRTL ? 'rotate-180' : ''}`} />
                      {language === 'ar' ? 'تم إخطار المتجر: أنت قادم!' : "Vendor notified: You're coming!"}
                    </div>
                  )}

                  {order.status !== 'arrived' && (
                    <button
                      onClick={() => setIsArrivalModalOpen(true)}
                      className="w-full bg-white border-2 border-slate-900 text-slate-900 font-black py-5 rounded-2xl hover:bg-slate-900 hover:text-white flex items-center justify-center gap-3 transition-all active:scale-95"
                    >
                      <Car className="w-5 h-5" />
                      {t('track.arrived')}
                    </button>
                  )}

                  {order.status === 'arrived' && (
                    <div className="bg-rose-500 text-white p-8 rounded-3xl shadow-rose-200 shadow-2xl text-center space-y-3 ring-8 ring-rose-500/10">
                      <p className="text-3xl font-black tracking-tighter">{t('track.arrived')}</p>
                      <p className="font-medium text-rose-100 leading-relaxed text-sm">{language === 'ar' ? 'تم إخطار المتجر. يرجى البقاء في سيارتك، طلبك في الطريق إليك الآن.' : 'The vendor has been notified. Stay in your vehicle, your order is being brought out to you.'}</p>
                      <div className="pt-4 flex justify-center gap-4 text-xs sm:text-[10px] font-black uppercase tracking-[0.2em] text-rose-100 opacity-90">
                        <span>{order.carDetails?.type}</span>
                        <span>•</span>
                        <span>{order.carDetails?.color}</span>
                        <span>•</span>
                        <span>{order.carDetails?.plate}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Order Info */}
        <div className="sleek-card p-8 space-y-6">
          <h3 className="font-black text-xl tracking-tight flex items-center gap-2 rtl:flex-row-reverse">
            <Clock className="w-5 h-5 text-indigo-600" />
            {language === 'ar' ? 'جدول الطلب' : 'Order Schedule'}
          </h3>
          <div className="grid grid-cols-2 gap-6 rtl:text-right">
            <div>
              <p className="text-slate-500 font-black uppercase text-xs sm:text-[10px] tracking-widest mb-1">{language === 'ar' ? 'وقت الاستلام' : 'Scheduled For'}</p>
              <p className="font-black text-slate-800">
                {order.pickupTime ? (
                  (() => {
                    try {
                      const date = new Date(order.pickupTime);
                      if (isNaN(date.getTime())) {
                        return order.pickupTime; // Return time string "14:30"
                      }
                      return format(date, 'MMM d, h:mm a');
                    } catch (e) {
                      return order.pickupTime;
                    }
                  })()
                ) : (language === 'ar' ? 'تنبيه عند الجاهزية' : 'Notify when ready')}
              </p>
            </div>
            <div>
              <p className="text-slate-500 font-black uppercase text-xs sm:text-[10px] tracking-widest mb-1">{language === 'ar' ? 'رقم التواصل' : 'Contact Phone'}</p>
              <p className="font-black text-slate-800">{order.customerPhone}</p>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-100">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
              <h4 className="text-xs sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 rtl:text-right">{language === 'ar' ? 'محتويات الطلب' : 'Your Items'}</h4>
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start rtl:flex-row-reverse">
                  <div className="flex-1 rtl:text-right">
                    <p className="font-black text-slate-800 text-sm">
                      {item.quantity}x {item.name}
                      {item.selectedSize && (
                        <span className="mx-2 text-indigo-600 font-black uppercase text-xs sm:text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded">
                          {item.selectedSize.label}
                        </span>
                      )}
                    </p>
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <p className="text-xs sm:text-[10px] text-slate-500 font-bold mt-1 px-4 border-l-2 rtl:border-l-0 rtl:border-r-2 border-indigo-100 italic">
                        + {item.selectedAddons.map(a => a.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <p className="font-black text-slate-600 text-sm">
                    {(item.price + item.selectedAddons?.reduce((s, a) => s + a.price, 0) || 0) * item.quantity} BHD
                  </p>
                </div>
              ))}
              <div className="pt-4 mt-2 border-t border-slate-200 flex justify-between items-center rtl:flex-row-reverse">
                <span className="font-black text-slate-500 text-sm sm:text-xs uppercase tracking-widest">{language === 'ar' ? 'الإجمالي المدفوع' : 'Total Paid'}</span>
                <span className="text-xl font-black text-indigo-600 tracking-tight">{order.total} BHD</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex items-start gap-4 rtl:flex-row-reverse">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div className="rtl:text-right">
                <p className="text-xs sm:text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">{language === 'ar' ? 'مطلوب الدفع' : 'Payment Required'}</p>
                <p className="text-xs text-amber-700 font-medium leading-relaxed">{language === 'ar' ? 'يرجى التأكد من تحويل المبلغ الإجمالي إلى حساب المتجر (IBAN). قد تحتاج إلى إظهار الإيصال عند الاستلام.' : "Please ensure you've transferred the total to the vendor's IBAN. You may need to show the receipt upon pickup."}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Arrival Modal */}
      <AnimatePresence>
        {isArrivalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsArrivalModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden p-10 border border-slate-100"
            >
              <button onClick={() => setIsArrivalModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-indigo-100 shadow-xl border border-indigo-100">
                  <Car className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{language === 'ar' ? 'تفاصيل السيارة' : 'Vehicle Details'}</h2>
                <p className="text-slate-400 font-medium text-sm mt-1">{language === 'ar' ? 'ساعد المتجر في العثور على سيارتك بسرعة' : 'Help the vendor find your car quickly'}</p>
              </div>

              <form onSubmit={handleArrival} className="space-y-6">
                <div className="rtl:text-right">
                  <label className="block text-xs sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">{language === 'ar' ? 'نوع السيارة' : 'Vehicle Type'}</label>
                  <input
                    required
                    type="text"
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:bg-white bg-slate-50 outline-none transition-all font-bold text-right rtl:text-right"
                    placeholder={language === 'ar' ? 'مثلاً: تويوتا لاند كروزر' : 'e.g. Toyota Land Cruiser'}
                    value={carDetails.type}
                    onChange={e => setCarDetails({ ...carDetails, type: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 rtl:text-right">
                  <div>
                    <label className="block text-xs sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">{language === 'ar' ? 'اللون' : 'Color'}</label>
                    <input
                      required
                      type="text"
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:bg-white bg-slate-50 outline-none transition-all font-bold text-right rtl:text-right"
                      placeholder={language === 'ar' ? 'أبيض' : 'White'}
                      value={carDetails.color}
                      onChange={e => setCarDetails({ ...carDetails, color: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">{language === 'ar' ? 'رقم اللوحة' : 'License Plate'}</label>
                    <input
                      required
                      type="text"
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:bg-white bg-slate-50 outline-none transition-all font-mono font-black text-right rtl:text-right"
                      placeholder="1234 ABC"
                      value={carDetails.plate}
                      onChange={e => setCarDetails({ ...carDetails, plate: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 mt-4 hover:bg-indigo-600"
                >
                  {isSubmitting ? (language === 'ar' ? 'جاري إخطار المتجر...' : 'Notifying Vendor...') : (language === 'ar' ? 'تأكيد الوصول' : 'Confirm Arrival')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
