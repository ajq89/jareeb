/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Vendor, Product, Addon, Size, ProductCategory } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, ShoppingBag, X, CheckCircle2, CreditCard, User, Phone, Clock, Plus, ChevronRight, CupSoda, Bell, Package, Instagram, MapPin, ExternalLink, Filter, Coffee, Languages, Globe } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { getSupabaseClient } from '../lib/supabase';
import CakeSpecsForm from '../components/CakeSpecsForm';

function dataURLtoBlob(dataurl: string): Blob {
  try {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.error('Failed to convert base64 to Blob:', err);
    throw new Error('Invalid base64 data URL format');
  }
}


export default function Storefront() {
  const { t, language, setLanguage } = useLanguage();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [cart, setCart] = useState<{ 
    product: Product; 
    quantity: number; 
    selectedAddons: Addon[];
    selectedSize?: Size;
    cartId: string;
    cakeSpecs?: any;
  }[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supabase store status state
  const [supabaseStoreClosed, setSupabaseStoreClosed] = useState<boolean | null>(null);
  const [supabaseClosureMessage, setSupabaseClosureMessage] = useState<string | null>(null);

  // Addon & Size selection state
  const [addonProduct, setAddonProduct] = useState<Product | null>(null);
  const [tempSelectedAddons, setTempSelectedAddons] = useState<Addon[]>([]);
  const [tempSelectedSize, setTempSelectedSize] = useState<Size | null>(null);
  const [tempCakeSpecs, setTempCakeSpecs] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({ 
    name: '', 
    phone: '', 
    pickupOption: 'asap' as 'asap' | 'scheduled', 
    scheduledPickupTime: '', 
    notifyWhenReady: true 
  });
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptUploadError, setReceiptUploadError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingReceipt(true);
      setReceiptUploadError('');
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize to reasonable dimensions
          const MAX_SIZE = 1000;
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

          // Compress to JPEG with 0.6 quality - significant reduction
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          try {
            const hasSupabaseKeys = 
              Boolean((import.meta as any).env.VITE_SUPABASE_URL) && 
              Boolean((import.meta as any).env.VITE_SUPABASE_ANON_KEY);

            if (hasSupabaseKeys) {
              try {
                console.log('Attempting receipt upload to Supabase storage...');
                const supabase = getSupabaseClient();
                
                // Convert base64 dataURL to Blob
                const blob = dataURLtoBlob(dataUrl);
                
                const filename = `receipts/receipt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
                
                const { error } = await supabase.storage
                  .from('products')
                  .upload(filename, blob, {
                    contentType: 'image/jpeg',
                    cacheControl: '3600',
                    upsert: true
                  });

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                  .from('products')
                  .getPublicUrl(filename);

                setReceiptImage(publicUrl);
                console.log('Receipt image uploaded successfully to Supabase:', publicUrl);
                setIsUploadingReceipt(false);
                return;
              } catch (supabaseErr) {
                console.warn('Supabase receipt upload failed, falling back to server...', supabaseErr);
              }
            }

            const res = await fetch('/api/upload-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: dataUrl, vendorId: vendor?.id })
            });
            if (!res.ok) {
              const errorText = await res.text();
              throw new Error(`Server returned ${res.status}: ${errorText}`);
            }
            const data = await res.json();
            setReceiptImage(data.imageUrl);
            console.log('Receipt image uploaded successfully:', data.imageUrl);
          } catch (err: any) {
            console.error('Failed to upload receipt image:', err);
            // Fallback to local base64 if upload fails completely
            setReceiptImage(dataUrl);
            setReceiptUploadError(language === 'ar' ? 'فشل الرفع للمخدم، تم استخدام الصورة محلياً.' : 'Upload failed, image stored locally.');
          } finally {
            setIsUploadingReceipt(false);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const loadStore = async () => {
      try {
        const vq = query(collection(db, 'vendors'), where('slug', '==', slug));
        const vSnap = await getDocs(vq);
        
        if (vSnap.empty) {
          setError('Store not found');
          setLoading(false);
          return;
        }

        const vData = { id: vSnap.docs[0].id, ...vSnap.docs[0].data() } as Vendor;
        setVendor(vData);
        setLoading(false); // Render vendor info immediately

        // Fetch products
        const pq = query(collection(db, 'products'), where('vendorId', '==', vData.id));
        const pSnap = await getDocs(pq);
        setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Product));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `store/${slug}`);
        setError('Failed to load store');
      } finally {
        setProductsLoading(false);
      }
    };

    loadStore();
  }, [slug]);

  useEffect(() => {
    const fetchSupabaseStoreStatus = async () => {
      if (!vendor?.id) return;
      try {
        const hasSupabaseKeys = 
          Boolean((import.meta as any).env.VITE_SUPABASE_URL) && 
          Boolean((import.meta as any).env.VITE_SUPABASE_ANON_KEY);
        if (!hasSupabaseKeys) return;

        const supabase = getSupabaseClient();
        const { data, error } = (await supabase
          .from('stores')
          .select('is_closed, closure_message')
          .eq('id', vendor.id)
          .maybeSingle()) as any;

        if (data && !error) {
          setSupabaseStoreClosed(!!data.is_closed);
          setSupabaseClosureMessage(data.closure_message || null);
        }
      } catch (err) {
        console.warn('Failed to fetch store status from Supabase:', err);
      }
    };

    fetchSupabaseStoreStatus();
  }, [vendor]);

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const activeCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const categories: { id: ProductCategory | 'all'; label: string; icon: any }[] = ([
    { id: 'all', label: language === 'ar' ? 'الكل' : 'All', icon: Filter },
    { id: 'drink', label: language === 'ar' ? 'مشروبات' : 'Drinks', icon: CupSoda },
    { id: 'meal', label: language === 'ar' ? 'وجبات' : 'Meals', icon: ShoppingBag },
    { id: 'canned', label: language === 'ar' ? 'معلبات' : 'Canned', icon: ShoppingCart },
    { id: 'other', label: language === 'ar' ? 'أخرى' : 'Other', icon: Package },
  ] as { id: ProductCategory | 'all'; label: string; icon: any }[]).filter(cat => cat.id === 'all' || activeCategories.includes(cat.id));

  const addToCart = (product: Product, selectedAddons: Addon[] = [], selectedSize?: Size, cakeSpecs?: any) => {
    setCart(prev => {
      // Create a unique key for the combination of product + addons + size
      const addonIds = [...selectedAddons].sort((a, b) => a.id.localeCompare(b.id)).map(a => a.id).join(',');
      const sizeId = selectedSize?.id || 'none';
      const cakeSpecsId = cakeSpecs ? JSON.stringify(cakeSpecs) : 'none';
      
      const existing = prev.find(item => 
        item.product.id === product.id && 
        [...item.selectedAddons].sort((a, b) => a.id.localeCompare(b.id)).map(a => a.id).join(',') === addonIds &&
        (item.selectedSize?.id || 'none') === sizeId &&
        JSON.stringify(item.cakeSpecs || null) === JSON.stringify(cakeSpecs || null)
      );
      
      if (existing) {
        return prev.map(item => 
          item === existing ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { 
        product, 
        quantity: 1, 
        selectedAddons, 
        selectedSize,
        cartId: Math.random().toString(36).substr(2, 9),
        cakeSpecs: cakeSpecs || null
      }];
    });
    setAddonProduct(null);
    setTempSelectedAddons([]);
    setTempSelectedSize(null);
    setTempCakeSpecs(null);
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const cartTotal = cart.reduce((acc, item) => {
    const basePrice = item.selectedSize 
      ? item.selectedSize.price 
      : (item.cakeSpecs ? item.cakeSpecs.calculatedPrice : item.product.price);
    const productBase = basePrice * item.quantity;
    const addonsCost = item.selectedAddons.reduce((sum, a) => sum + a.price, 0) * item.quantity;
    return acc + productBase + addonsCost;
  }, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;
    setIsSubmitting(true);

    try {
      // Find cake specs if any
      const mainCakeSpecs = cart.find(item => item.cakeSpecs)?.cakeSpecs || {};

      // 1. Create the order
      const orderRef = await addDoc(collection(db, 'orders'), {
        vendorId: vendor.id,
        customerName: formData.name,
        customerPhone: formData.phone,
        pickupTime: formData.pickupOption === 'asap' ? 'ASAP' : formData.scheduledPickupTime,
        pickupOption: formData.pickupOption,
        scheduledPickupTime: formData.pickupOption === 'scheduled' ? formData.scheduledPickupTime : null,
        notifyWhenReady: formData.notifyWhenReady,
        receiptUrl: receiptImage,
        cake_specs: mainCakeSpecs, // Compatible with top-level cake_specs column
        items: cart.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.selectedSize 
            ? item.selectedSize.price 
            : (item.cakeSpecs ? item.cakeSpecs.calculatedPrice : item.product.price),
          quantity: item.quantity,
          selectedAddons: item.selectedAddons,
          selectedSize: item.selectedSize || null,
          cakeSpecs: item.cakeSpecs || null
        })),
        total: cartTotal,
        status: 'pending',
        onMyWay: false,
        createdAt: new Date().toISOString(),
      });

      // 2. Decrease stock for each item (wrap in try-catch to allow checkout even if stock updating fails)
      for (const item of cart) {
        if (item.product.id) {
          try {
            // Only decrease stock if it is a positive number (limited stock)
            if (item.product.stock !== undefined && item.product.stock > 0) {
              const productRef = doc(db, 'products', item.product.id);
              await updateDoc(productRef, {
                stock: increment(-item.quantity)
              });
            }
          } catch (stockError) {
            console.warn('Could not decrease product stock:', stockError);
          }
        }
      }

      navigate(`/track/${orderRef.id}`);
    } catch (error) {
      console.error('Checkout error:', error);
      alert(language === 'ar' ? 'فشل إرسال الطلب. يرجى المحاولة مرة أخرى.' : 'Checkout failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold animate-pulse">{language === 'ar' ? 'جاري فتح المتجر...' : 'Opening Store...'}</p>
      </div>
    </div>
  );
  if (error || !vendor) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center max-w-sm">
        <X className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <p className="text-slate-800 font-black text-lg mb-2">{error || 'Store not found'}</p>
        <button onClick={() => navigate('/')} className="text-indigo-600 font-bold text-sm">Return Home</button>
      </div>
    </div>
  );

  const isExpired = vendor && (
    vendor.subscriptionStatus === 'expired' ||
    (vendor.subscriptionEndDate && new Date(vendor.subscriptionEndDate) < new Date())
  );

  const isClosed = supabaseStoreClosed !== null 
    ? supabaseStoreClosed 
    : (vendor?.isClosedByUser || (vendor as any)?.is_closed || false);

  const closureMessage = supabaseClosureMessage 
    ? supabaseClosureMessage 
    : ((vendor as any)?.closure_message || (language === 'ar' 
        ? 'يقوم المتجر حالياً بتجهيز دفعات جديدة من المنتجات أو استكمال الطلبات القائمة. يرجى العودة لزيارتنا قريباً!' 
        : 'The store is currently preparing fresh batches or processing current orders. We will be back online very soon!'));

  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white max-w-md w-full p-8 rounded-[2rem] shadow-xl border border-slate-100 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto shadow-inner">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              {language === 'ar' ? 'المحل مغلق مؤقتاً 🔒' : 'Store Temporarily Closed 🔒'}
            </h1>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              {language === 'ar' 
                ? 'عذراً، هذا المتجر غير نشط حالياً لانتهاء فترة التجربة أو الاشتراك. يرجى التواصل مع إدارة المحل أو المحاولة لاحقاً.' 
                : 'Sorry, this store is temporarily inactive due to subscription expiry. Please contact the store owner or try again later.'}
            </p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
          >
            {language === 'ar' ? 'الرجوع للرئيسية' : 'Go Home'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 relative">
      {/* Floating Language Switcher */}
      <div className="fixed top-4 left-4 rtl:left-auto rtl:right-4 sm:top-6 sm:left-6 sm:rtl:left-auto sm:rtl:right-6 z-50">
        <button
          id="lang-switcher-button"
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/85 hover:bg-white backdrop-blur-md border border-slate-200/60 shadow-[0_10px_25px_rgba(0,0,0,0.08)] text-slate-800 hover:text-indigo-600 transition-all duration-200 active:scale-95"
          title={language === 'ar' ? 'Switch to English' : 'تغيير اللغة إلى العربية'}
        >
          <Globe className="w-5 h-5 text-indigo-600" />
        </button>
      </div>

      {/* Immersive Header */}
      <div className="relative h-80 sm:h-80 bg-slate-950 overflow-hidden group/header">
        {vendor.bannerUrl ? (
          <motion.img 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            src={vendor.bannerUrl} 
            alt="" 
            className="w-full h-full object-cover opacity-65 filter brightness-[0.75] contrast-[1.05] saturate-[1.1] transition-transform duration-700 group-hover/header:scale-105" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-900 opacity-90" />
        )}
        {/* Cinematic Dual Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-transparent to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 pb-8 sm:pb-10">
          <div className="max-w-xl mx-auto flex flex-col md:flex-row items-center gap-5 sm:gap-6 text-center md:text-left md:rtl:text-right">
            <motion.div 
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/95 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10 shrink-0 ring-4 ring-white/10 backdrop-blur-sm hover:rotate-3 transition-transform duration-300"
            >
              <img src={vendor.logoUrl} alt={vendor.name} className="w-full h-full object-cover rounded-2xl" />
            </motion.div>
            
            <div className="flex-1 text-white z-10">
              <div className="flex flex-col items-center md:items-start gap-2 mb-3">
                <motion.h1 
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] leading-tight text-white select-none"
                >
                  {vendor.name}
                </motion.h1>
                
{/* Verified Store Badge - Removed as requested */}
                {/* 
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{language === 'ar' ? 'متجر نشط وموثق' : 'Active & Verified'}</span>
                </motion.div>
                */}
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-start md:rtl:justify-end gap-2 sm:gap-3">
                {vendor.phone && (
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white/90 bg-slate-900/45 hover:bg-slate-900/60 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-full transition-all duration-200">
                    <Phone className="w-3 h-3 text-indigo-400" />
                    <span>{vendor.phone}</span>
                  </div>
                )}
                {vendor.instagram && (
                  <a 
                    href={`https://instagram.com/${vendor.instagram}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white/90 bg-slate-900/45 hover:bg-slate-900/60 hover:text-white backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-full transition-all duration-200 shadow-sm"
                  >
                    <Instagram className="w-3 h-3 text-pink-400" />
                    <span>@{vendor.instagram}</span>
                  </a>
                )}
                {vendor.mapUrl ? (
                  <a 
                    href={vendor.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 backdrop-blur-md border border-indigo-500/20 px-3 py-1.5 rounded-full transition-all duration-200 shadow-sm"
                  >
                    <MapPin className="w-3 h-3 text-emerald-300 shrink-0" />
                    <span>{vendor.location || (language === 'ar' ? 'موقعنا على الخارطة' : 'Our Location')}</span>
                    {vendor.buildingNo && (
                      <span className="text-[9px] bg-white/20 px-1 py-0.5 rounded text-white font-black ml-1">
                        {language === 'ar' ? `مبنى ${vendor.buildingNo}` : `Bldg ${vendor.buildingNo}`}
                      </span>
                    )}
                  </a>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white/90 bg-slate-900/45 hover:bg-slate-900/60 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-full transition-all duration-200">
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{vendor.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-4 sm:px-6 -mt-8 relative z-20">
        {/* Store Closure Banner */}
        {isClosed && (
          <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-6 shadow-xl shadow-rose-100/20 mb-6 flex items-start gap-4 text-right rtl:text-right">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner text-xl">
              📢
            </div>
            <div className="space-y-1.5 flex-1">
              <h2 className="text-lg font-black text-rose-950">
                {language === 'ar' ? 'المتجر مغلق مؤقتاً' : 'Store Closed Temporarily'}
              </h2>
              <p className="text-sm font-semibold text-rose-700 leading-relaxed">
                {closureMessage}
              </p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[10px] font-black uppercase tracking-wider mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>{language === 'ar' ? 'الطلبات معطلة' : 'Orders Disabled'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Description & Social Card */}
        <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-slate-200/30 mb-8 border border-slate-100/50">
          <p className="text-slate-600 font-medium leading-relaxed text-center text-base sm:text-sm">
            {vendor.description}
          </p>
        </div>

        {/* Category Filter Bar (Sticky on Mobile & Desktop Scroll) */}
        <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 flex gap-2.5 overflow-x-auto no-scrollbar border-b border-slate-100/60 mb-8 shadow-sm shadow-slate-100/10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2.5 px-5 py-3.5 rounded-2xl sm:rounded-3xl font-extrabold text-xs sm:text-[11px] uppercase tracking-[0.08em] sm:tracking-[0.12em] whitespace-nowrap transition-all duration-300 border-2 ${
                selectedCategory === cat.id 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/10' 
                  : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
              }`}
            >
              <cat.icon className={`w-3.5 h-3.5 ${selectedCategory === cat.id ? 'text-white' : 'text-slate-400'}`} />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Dynamic Products Grid */}
        <div className="grid grid-cols-2 gap-3.5 sm:flex sm:flex-col sm:space-y-6">
          <AnimatePresence mode="popLayout">
            {productsLoading ? (
              // Skeleton UI for loading
              [...Array(6)].map((_, i) => (
                <div key={`skeleton-${i}`} className="bg-white rounded-2xl sm:rounded-[2.5rem] overflow-hidden border border-slate-50 shadow-sm animate-pulse">
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full h-36 sm:w-48 sm:h-48 bg-slate-100" />
                    <div className="p-3.5 sm:p-6 flex-1 space-y-4">
                      <div className="h-4 bg-slate-100 rounded-full w-3/4" />
                      <div className="h-3 bg-slate-100 rounded-full w-1/2" />
                      <div className="h-8 bg-slate-100 rounded-xl sm:rounded-3xl w-full mt-4" />
                    </div>
                  </div>
                </div>
              ))
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl sm:rounded-[2.5rem] overflow-hidden border border-slate-50 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="relative w-full h-36 sm:w-48 sm:h-48 overflow-hidden bg-slate-50 shrink-0">
                      <img 
                        src={product.imageUrl || 'https://picsum.photos/seed/product/400/400'} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 left-2 sm:top-4 sm:left-4">
                        <span className={`text-[9px] sm:text-[10px] font-bold sm:font-black uppercase px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-sm backdrop-blur-md ${
                          product.category === 'drink' ? 'bg-blue-600 text-white' :
                          product.category === 'meal' ? 'bg-orange-600 text-white' :
                          product.category === 'canned' ? 'bg-emerald-600 text-white' :
                          'bg-slate-900 text-white'
                        }`}>
                          {product.category === 'drink' ? 'مشروب' : product.category === 'meal' ? 'وجبة' : product.category === 'canned' ? 'معلب' : 'أخرى'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-3.5 sm:p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-1.5 sm:gap-4 text-right rtl:text-right">
                          <h3 className="font-black text-sm sm:text-xl text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{product.name}</h3>
                          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-1 sm:gap-1.5 flex-wrap">
                            <span className="text-indigo-600 font-black text-xs sm:text-lg bg-indigo-50 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-2xl shrink-0 whitespace-nowrap">{product.price} BHD</span>
                            {product.stock !== undefined && product.stock < 0 && (
                              <span className="text-[9px] sm:text-[8px] font-bold sm:font-black uppercase text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100 whitespace-nowrap">{t('store.outOfStock')}</span>
                            )}
                            {/* Unlimited tag removed as requested */}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mb-2.5 sm:mb-4">
                          {product.stock !== undefined && product.stock > 0 && product.stock <= 5 && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] sm:text-[10px] font-black rounded-md border border-amber-100 italic">{t('store.onlyLeft', { n: product.stock })}</span>
                          )}
                          {product.volume && <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[9px] sm:text-[10px] font-black rounded-md border border-slate-100">{product.volume}</span>}
                          {product.calories && <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[9px] sm:text-[10px] font-black rounded-md border border-slate-100">{product.calories} kcal</span>}
                          {product.weight && <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[9px] sm:text-[10px] font-black rounded-md border border-slate-100">{product.weight}</span>}
                          {product.madeToOrder && (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-600 text-[9px] sm:text-[11px] font-black rounded-lg border border-purple-100 shadow-sm">
                              <Clock className="w-3 h-3" />
                              {language === 'ar' ? `تجهيز: ${product.prepTime}` : `Prep: ${product.prepTime}`}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-slate-500 text-xs sm:text-[13px] font-medium line-clamp-1 sm:line-clamp-2 mb-4 sm:mb-6 leading-relaxed">
                          {product.description}
                        </p>
                      </div>

                      <button
                        disabled={(product.stock !== undefined && product.stock < 0) || isClosed}
                        onClick={() => {
                          if ((product.addons && product.addons.length > 0) || (product.sizes && product.sizes.length > 0) || product.is_custom_cake) {
                            setAddonProduct(product);
                            setTempSelectedAddons([]);
                            setTempSelectedSize(product.sizes?.[0] || null);
                            setTempCakeSpecs(null); // Reset cake specs
                          } else {
                            addToCart(product);
                          }
                        }}
                        className={`w-full py-2.5 sm:py-3.5 rounded-xl sm:rounded-3xl font-black text-[10px] sm:text-[10px] uppercase tracking-wider sm:tracking-[0.2em] flex items-center justify-center gap-1 sm:gap-3 transition-all active:scale-95 shadow-lg ${
                          (product.stock !== undefined && product.stock < 0) || isClosed
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                            : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-slate-200'
                        }`}
                      >
                        {isClosed ? (
                          language === 'ar' ? 'المتجر مغلق' : 'Store Closed'
                        ) : product.stock !== undefined && product.stock < 0 ? (
                          t('store.outOfStock')
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{t('store.addToOrder')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : null}
          </AnimatePresence>

          {!productsLoading && filteredProducts.length === 0 && (
            <div className="py-24 text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <ShoppingBag className="w-12 h-12" />
              </div>
              <h3 className="text-slate-800 font-black text-xl mb-2">{language === 'ar' ? 'القسم فارغ حالياً' : 'No products in this section'}</h3>
              <p className="text-slate-400 text-sm font-medium">{language === 'ar' ? 'لا توجد منتجات في هذا القسم حالياً، جرب تصفح الأقسام الأخرى' : 'No products available here yet, try browsing other categories'}</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <motion.button
          initial={{ y: 100, x: '-50%' }}
          animate={{ y: 0, x: '-50%' }}
          style={{ left: '50%' }}
          onClick={() => setIsCheckoutOpen(true)}
          className="fixed bottom-6 w-[calc(100%-2rem)] max-w-md bg-indigo-600 text-white px-6 sm:px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(79,70,229,0.3)] z-40 flex items-center justify-between gap-4 hover:bg-indigo-700 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="w-5.5 h-5.5" />
              <span className="absolute -top-3 -right-3 bg-white text-indigo-600 text-xs sm:text-[9px] w-6 h-6 sm:w-5.5 sm:h-5.5 flex items-center justify-center rounded-full font-black shadow-md">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            </div>
            <span className="font-black text-base tracking-tight">{t('store.checkout')}</span>
          </div>
          <span className="font-black text-base tracking-tight bg-indigo-500/40 px-3.5 py-1.5 rounded-xl">{cartTotal} BHD</span>
        </motion.button>
      )}

      {/* Checkout Modals & Bottom Sheets */}
      <AnimatePresence>
        {addonProduct && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddonProduct(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-white rounded-t-[2.2rem] sm:rounded-[2.2rem] shadow-2xl overflow-hidden p-6 sm:p-8 border-t sm:border border-slate-100 max-h-[90vh] overflow-y-auto z-10"
            >
              <button 
                onClick={() => setAddonProduct(null)} 
                className="absolute top-6 right-6 p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-8">
                {/* Store Closure Safeguard Banner inside Modal */}
                {isClosed && (
                  <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-800 text-xs font-semibold rtl:flex-row-reverse text-right rtl:text-right">
                    <span className="text-lg">📢</span>
                    <div className="space-y-0.5">
                      <p className="font-black text-rose-950">
                        {language === 'ar' ? 'المتجر مغلق مؤقتاً' : 'Store is Closed'}
                      </p>
                      <p className="text-rose-600 font-medium leading-relaxed">
                        {closureMessage}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 items-start mb-6">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                    <img 
                      src={addonProduct.imageUrl || 'https://picsum.photos/seed/product/200/200'} 
                      className="w-full h-full object-cover" 
                      alt={addonProduct.name}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{addonProduct.name}</h2>
                    <p className="text-indigo-600 font-black">
                      {addonProduct.is_custom_cake && tempCakeSpecs
                        ? `${tempCakeSpecs.calculatedPrice} BHD`
                        : `${(tempSelectedSize ? tempSelectedSize.price : addonProduct.price)} BHD`
                      }
                    </p>
                  </div>
                </div>

                {/* Custom Cake Specifications Form */}
                {addonProduct.is_custom_cake && (
                  <CakeSpecsForm
                    product={addonProduct}
                    onChange={setTempCakeSpecs}
                    language={language}
                  />
                )}

                {/* Sizes Selection with Interactive Icons */}
                {addonProduct.sizes && addonProduct.sizes.length > 0 && (
                  <div className="mb-8 space-y-4">
                    <h3 className="text-xs sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">{language === 'ar' ? 'اختر الحجم' : 'Select Size'}</h3>
                    <div className="flex justify-around items-end gap-2 bg-slate-50/50 p-6 rounded-3xl border border-slate-50">
                      {addonProduct.sizes.map(size => {
                        const isSelected = tempSelectedSize?.id === size.id;
                        
                        // Icon mapping
                        const IconComponent = addonProduct.category === 'drink' ? CupSoda : 
                                            addonProduct.category === 'meal' ? ShoppingBag : 
                                            addonProduct.category === 'canned' ? ShoppingCart : Package;
                        
                        // Dynamic scaling based on label
                        const getScale = (label: string) => {
                          const smalls = ['S', 'Small', 'Single'];
                          const mediums = ['M', 'Medium', 'Standard', 'Double'];
                          const larges = ['L', 'Large', 'Family'];
                          const extraLarges = ['XL', 'Extra Large', 'Party'];
                          
                          if (smalls.includes(label)) return 'scale-90';
                          if (mediums.includes(label)) return 'scale-100';
                          if (larges.includes(label)) return 'scale-110';
                          if (extraLarges.includes(label)) return 'scale-125';
                          return 'scale-100';
                        };
                        
                        return (
                          <button
                            key={size.id}
                            onClick={() => setTempSelectedSize(size)}
                            className="flex flex-col items-center group relative"
                          >
                            <motion.div
                              animate={{ 
                                scale: isSelected ? 1.1 : 1,
                                y: isSelected ? -5 : 0
                              }}
                              className={`p-3 rounded-2xl transition-colors ${
                                isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              <IconComponent className={`w-8 h-8 ${getScale(size.label)}`} />
                            </motion.div>
                            <span className={`mt-2 text-xs sm:text-[10px] font-black uppercase tracking-widest transition-colors ${
                              isSelected ? 'text-indigo-600' : 'text-slate-500'
                            }`}>
                              {size.label}
                            </span>
                            <span className="text-[10px] sm:text-[8px] font-bold text-slate-500">{size.price} BHD</span>
                            {isSelected && (
                              <motion.div 
                                layoutId="active-size"
                                className="absolute -bottom-1 w-1 h-1 bg-indigo-600 rounded-full"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-xs sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">{language === 'ar' ? 'إضافات اختيارية' : 'Select Addons'}</h3>
                  <div className="space-y-2">
                    {addonProduct.addons?.map(addon => {
                      const isSelected = tempSelectedAddons.some(a => a.id === addon.id);
                      return (
                        <button
                          key={addon.id}
                          onClick={() => {
                            if (isSelected) {
                              setTempSelectedAddons(tempSelectedAddons.filter(a => a.id !== addon.id));
                            } else {
                              setTempSelectedAddons([...tempSelectedAddons, addon]);
                            }
                          }}
                          className={`w-full flex justify-between items-center p-4 rounded-2xl border-2 transition-all ${
                            isSelected 
                              ? 'border-indigo-600 bg-indigo-50/50' 
                              : 'border-slate-50 hover:border-slate-100 bg-slate-50/50'
                          }`}
                        >
                          <div className="text-left rtl:text-right">
                            <p className={`font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{addon.name}</p>
                            <p className="text-xs text-slate-400 font-medium">+ {addon.price} BHD</p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                disabled={isClosed}
                onClick={() => addToCart(addonProduct, tempSelectedAddons, tempSelectedSize || undefined, tempCakeSpecs)}
                className={`w-full font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 text-white ${
                  isClosed
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-slate-900 hover:bg-indigo-600'
                }`}
              >
                {isClosed ? (
                  language === 'ar' ? 'المتجر مغلق' : 'Store Closed'
                ) : (
                  <>
                    {language === 'ar' ? 'أضف للسلة' : 'Add to Cart'} • {(
                      (addonProduct.is_custom_cake && tempCakeSpecs
                        ? tempCakeSpecs.calculatedPrice
                        : (tempSelectedSize ? tempSelectedSize.price : addonProduct.price)) + 
                      tempSelectedAddons.reduce((s, a) => s + a.price, 0)
                    ).toFixed(2)} BHD
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}

        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg bg-white rounded-t-[2.2rem] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col z-10"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rtl:flex-row-reverse">
                <h2 className="text-xl font-bold">{t('store.checkout')}</h2>
                <button onClick={() => setIsCheckoutOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Cart Items */}
                <div className="space-y-3">
                  <h3 className="text-xs sm:text-xs font-black text-slate-500 uppercase tracking-wider">{t('store.yourCart')}</h3>
                  {cart.map(item => (
                    <div key={item.cartId} className="flex justify-between items-start text-sm rtl:flex-row-reverse">
                      <div className="flex items-start gap-3 rtl:flex-row-reverse text-right rtl:text-right">
                        <span className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center font-bold text-slate-600 mt-0.5">
                          {item.quantity}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800">
                            {item.product.name}
                            {item.selectedSize && <span className="ml-1 text-indigo-600">({item.selectedSize.label})</span>}
                          </p>
                          {item.selectedAddons.length > 0 && (
                            <p className="text-xs sm:text-[10px] text-slate-500 font-medium">
                              + {item.selectedAddons.map(a => a.name).join(', ')}
                            </p>
                          )}
                          {item.cakeSpecs && (
                            <div className="mt-1.5 p-2 bg-slate-50 border border-slate-100 rounded-xl space-y-0.5 text-slate-600 text-xs text-right rtl:text-right">
                              <p className="font-bold text-slate-700 mb-1">{language === 'ar' ? 'تفاصيل الكيكة:' : 'Cake Specifications:'}</p>
                              <p><span className="font-semibold text-slate-500">{language === 'ar' ? 'الوزن:' : 'Weight:'}</span> {item.cakeSpecs.weightKg} {language === 'ar' ? 'كجم' : 'kg'}</p>
                              <p><span className="font-semibold text-slate-500">{language === 'ar' ? 'النكهة:' : 'Flavor:'}</span> {item.cakeSpecs.flavor}</p>
                              {item.cakeSpecs.writing && (
                                <p className="italic"><span className="font-semibold text-slate-500">{language === 'ar' ? 'الكتابة:' : 'Writing:'}</span> "{item.cakeSpecs.writing}"</p>
                              )}
                            </div>
                          )}
                          {item.product.madeToOrder && (
                            <p className="text-[10px] text-purple-600 font-black mt-0.5 flex items-center gap-1 rtl:flex-row-reverse">
                              <Clock className="w-3 h-3" />
                              {language === 'ar' ? `تنفيذ عند الطلب: ${item.product.prepTime}` : `Made to order: ${item.product.prepTime}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right rtl:text-left">
                        <p className="font-bold">
                          {((item.selectedSize 
                            ? item.selectedSize.price 
                            : (item.cakeSpecs ? item.cakeSpecs.calculatedPrice : item.product.price)) 
                            + item.selectedAddons.reduce((s, a) => s + a.price, 0)) * item.quantity} BHD
                        </p>
                        <button 
                          onClick={() => removeFromCart(item.cartId)}
                          className="text-xs sm:text-[10px] text-rose-500 font-extrabold uppercase tracking-widest hover:underline"
                        >
                          {language === 'ar' ? 'إزالة' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center rtl:flex-row-reverse">
                    <span className="font-bold">{t('store.total')}</span>
                    <span className="text-lg font-extrabold text-indigo-600">{cartTotal} BHD</span>
                  </div>
                </div>

                {cart.some(i => i.product.madeToOrder) && (
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-start gap-3 rtl:flex-row-reverse">
                    <Clock className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                    <div className="text-right rtl:text-right">
                      <p className="text-xs font-black text-purple-900">{language === 'ar' ? 'تنبيه: طلب مسبق' : 'Pre-order Notice'}</p>
                      <p className="text-[10px] text-purple-600 font-bold leading-tight">
                        {language === 'ar' 
                          ? 'سلتك تحتوي على منتجات تتطلب وقتاً للتجهيز. سيتم البدء في التنفيذ بعد تأكيد طلبك.' 
                          : 'Your cart contains items that require preparation time. Execution will start after confirmation.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Checkout Form */}
                <form onSubmit={handleCheckout} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center gap-2 rtl:flex-row-reverse">
                      <User className="w-4 h-4 text-slate-400" />
                      {t('store.name')}
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-right rtl:text-right"
                      placeholder={language === 'ar' ? 'أدخل اسمك' : 'Enter your name'}
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center gap-2 rtl:flex-row-reverse">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {t('store.phone')}
                    </label>
                    <input
                      required
                      type="tel"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-right rtl:text-right"
                      placeholder="3xxxxxxx"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  {/* Pickup Preference & Time */}
                  <div className="space-y-4 text-right rtl:text-right">
                    <label className="block text-sm sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      {language === 'ar' ? 'وقت وتاريخ الاستلام' : 'Pickup Date & Time'}
                    </label>
                    <p className="text-slate-500 font-medium text-sm sm:text-xs mb-3 leading-relaxed">
                      {language === 'ar' 
                        ? 'يرجى تحديد رغبتك بالاستلام: استلام حالا (جريب) أو جدولة موعد وتاريخ محدد.' 
                        : 'Choose your pickup preference: instant pickup (ASAP) or schedule a specific date and time.'}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, pickupOption: 'asap' })}
                        className={`p-4 rounded-2xl border-2 text-center font-black text-xs sm:text-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${
                          formData.pickupOption === 'asap'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md shadow-indigo-100/50'
                            : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <span className="text-lg">⚡</span>
                        <span>{language === 'ar' ? 'حالا (جريب)' : 'ASAP (Jareeb)'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, pickupOption: 'scheduled' })}
                        className={`p-4 rounded-2xl border-2 text-center font-black text-xs sm:text-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${
                          formData.pickupOption === 'scheduled'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md shadow-indigo-100/50'
                            : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <span className="text-lg">📅</span>
                        <span>{language === 'ar' ? 'تاريخ ووقت محدد' : 'Schedule Pickup'}</span>
                      </button>
                    </div>

                    {formData.pickupOption === 'scheduled' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2 mt-3"
                      >
                        <label className="block text-xs sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {language === 'ar' ? 'اختر التاريخ والوقت:' : 'Choose Date & Time:'}
                        </label>
                        <input 
                          required={formData.pickupOption === 'scheduled'} 
                          type="datetime-local" 
                          value={formData.scheduledPickupTime} 
                          onChange={e => setFormData({...formData, scheduledPickupTime: e.target.value})}
                          className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 bg-white font-bold text-slate-800 text-sm"
                        />
                      </motion.div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, notifyWhenReady: !formData.notifyWhenReady })}
                      className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                        formData.notifyWhenReady 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900' 
                          : 'border-slate-100 bg-white text-slate-400'
                      }`}
                    >
                      <span className="text-sm font-extrabold text-slate-800">{language === 'ar' ? 'أخبرني عندما يجهز' : 'Notify me when ready'}</span>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        formData.notifyWhenReady ? 'border-indigo-600 bg-indigo-600' : 'border-slate-200'
                      }`}>
                        {formData.notifyWhenReady && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                    </button>
                  </div>

                  {/* Consolidated Payment Card */}
                  <div className="bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                    {/* Transfer Details Header */}
                    <div className="bg-indigo-600 p-6 text-white">
                      <div className="flex items-center gap-3 mb-4 rtl:flex-row-reverse">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <div className="rtl:text-right">
                          <h4 className="text-base sm:text-sm font-black uppercase tracking-widest">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</h4>
                          <p className="text-xs sm:text-[10px] text-indigo-100 font-bold">{language === 'ar' ? 'قم بتحويل المبلغ الإجمالي للتأكيد' : 'Transfer the total amount to confirm'}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white/10 p-3.5 rounded-xl backdrop-blur-sm border border-white/10 rtl:flex-row-reverse">
                          <span className="text-xs sm:text-[10px] font-black uppercase text-indigo-100">{language === 'ar' ? 'المبلغ المطلوب' : 'Amount to Pay'}</span>
                          <span className="text-xl sm:text-lg font-black">{cartTotal.toFixed(2)} BHD</span>
                        </div>
                        <div className="bg-white/10 p-3.5 rounded-xl backdrop-blur-sm border border-white/10 rtl:text-right">
                          <span className="text-xs sm:text-[10px] font-black uppercase text-indigo-100 block mb-1.5">{language === 'ar' ? 'الآيبان (اضغط للنسخ)' : 'IBAN (Tap to copy)'}</span>
                          <p 
                            className="font-mono text-sm sm:text-xs font-bold select-all cursor-pointer hover:text-indigo-200 transition-colors break-all"
                            onClick={() => {
                              navigator.clipboard.writeText(vendor.iban);
                              alert(language === 'ar' ? 'تم نسخ رقم الآيبان!' : "IBAN copied to clipboard!");
                            }}
                          >
                            {vendor.iban}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Receipt Upload Section */}
                    <div className="p-6 rtl:text-right">
                      <label className="block text-xs sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{language === 'ar' ? 'ارفق إيصال التحويل' : 'Upload Transfer Receipt'}</label>
                      <div className="relative group">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          required={!receiptImage}
                          disabled={isUploadingReceipt}
                        />
                        <div className={`w-full aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                          isUploadingReceipt ? 'border-indigo-600 bg-indigo-50/20' :
                          receiptImage ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200 group-hover:border-indigo-400 bg-white group-hover:bg-indigo-50/20'
                        }`}>
                          {isUploadingReceipt ? (
                            <div className="flex flex-col items-center justify-center p-6">
                              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                              <p className="text-xs font-black text-indigo-600 tracking-wider uppercase">
                                {language === 'ar' ? 'جاري رفع الإيصال...' : 'Uploading receipt...'}
                              </p>
                            </div>
                          ) : receiptImage ? (
                            <div className="relative w-full h-full p-2">
                              <img src={receiptImage} className="w-full h-full object-cover rounded-xl" alt="Receipt preview" />
                              <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                <p className="text-indigo-600 font-black text-xs sm:text-[10px] bg-white px-3.5 py-2 rounded-full shadow-sm uppercase tracking-widest">{language === 'ar' ? 'تغيير الصورة' : 'Change Image'}</p>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors mb-3">
                                <Plus className="w-6 h-6" />
                              </div>
                              <p className="text-sm sm:text-xs font-black text-slate-500 group-hover:text-indigo-600 uppercase tracking-tight">{language === 'ar' ? 'إرفاق الإيصال' : 'Attach Receipt'}</p>
                              <p className="text-xs sm:text-[10px] text-slate-400 font-extrabold mt-1 text-center px-4 italic">{language === 'ar' ? 'لتأكيد عملية الدفع' : 'Confirmation of your transfer'}</p>
                            </>
                          )}
                        </div>
                      </div>
                      {receiptUploadError && (
                        <p className="text-xs font-bold text-rose-500 mt-2 text-center">{receiptUploadError}</p>
                      )}
                    </div>
                  </div>

                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 sm:py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 text-lg sm:text-base tracking-wide"
                  >
                    {isSubmitting ? (language === 'ar' ? 'جاري المعالجة...' : 'Processing...') : t('store.placeOrder')}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
