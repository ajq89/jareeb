import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Wand2, 
  UploadCloud, 
  Check, 
  Download, 
  AlertTriangle, 
  X, 
  Eye, 
  Grid, 
  Sun, 
  Compass, 
  Lock, 
  Coins, 
  ArrowLeftRight 
} from "lucide-react";
import { useLanguage } from "../lib/i18n";
import { doc, updateDoc } from "firebase/firestore";
import { getSupabaseClient } from "../lib/supabase";
import { db } from "../lib/firebase";

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


interface ImageEnhancerProps {
  vendorId: string;
  currentPlan: string;
  aiCredits: number;
  onImageSaved: (url: string) => void;
  onClose: () => void;
  onCreditsUpdated?: (nextCredits: number) => void;
}

type BackgroundTheme = "marble" | "wooden" | "minimalist" | "outdoor";

export default function ImageEnhancer({
  vendorId,
  currentPlan,
  aiCredits,
  onImageSaved,
  onClose,
  onCreditsUpdated
}: ImageEnhancerProps) {
  const { language, isRTL } = useLanguage();
  
  // Checking plan constraint
  const isPremium = currentPlan === "pro" || currentPlan === "enterprise";

  // Component States
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawImageUrl, setRawImageUrl] = useState<string>("");
  const [enhancedImageUrl, setEnhancedImageUrl] = useState<string>("");
  const [selectedTheme, setSelectedTheme] = useState<BackgroundTheme>("marble");
  
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0); // 0: Analyze, 1: Remove bg, 2: Apply theme, 3: Optimize
  const [errorMessage, setErrorMessage] = useState("");
  
  const [sliderPosition, setSliderPosition] = useState(50); // percentage of before/after split
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUpgradingLocal, setIsUpgradingLocal] = useState(false);

  const handleUpgradeFromEnhancer = async () => {
    setIsUpgradingLocal(true);
    try {
      await updateDoc(doc(db, "vendors", vendorId), {
        plan: "pro",
        subscriptionStatus: "active",
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      window.location.reload();
    } catch (err) {
      console.error("Upgrade error from enhancer:", err);
    } finally {
      setIsUpgradingLocal(false);
    }
  };

  // Theme descriptions
  const themes = [
    {
      id: "marble" as BackgroundTheme,
      labelAr: "رخام فاخر ⭐",
      labelEn: "Luxury Marble ⭐",
      descAr: "قالب طاولة رخامية بيضاء مصقولة مع عروق ذهبية وإضاءة ناعمة",
      descEn: "Polished white marble countertop with golden veins & studio lighting",
      icon: Sparkles,
      color: "from-amber-400 to-yellow-600 bg-amber-50 border-amber-200"
    },
    {
      id: "wooden" as BackgroundTheme,
      labelAr: "خشب دافئ 🪵",
      labelEn: "Warm Wood 🪵",
      descAr: "سطح خشبي كلاسيكي مريح ومثالي للمأكولات والحلويات المنزلية",
      descEn: "Rustic warm mahogany wood surface, ideal for culinary assets",
      icon: Grid,
      color: "from-orange-400 to-amber-700 bg-orange-50 border-orange-200"
    },
    {
      id: "minimalist" as BackgroundTheme,
      labelAr: "ستوديو بسيط 🎨",
      labelEn: "Studio Minimalist 🎨",
      descAr: "خلفية بلون أحادي هادئ وظلال ناعمة تبرز تفاصيل منتجك بجمال",
      descEn: "Smooth pastel-colored minimal studio background with subtle highlights",
      icon: Compass,
      color: "from-indigo-400 to-indigo-700 bg-indigo-50 border-indigo-200"
    },
    {
      id: "outdoor" as BackgroundTheme,
      labelAr: "إضاءة شمس ☀️",
      labelEn: "Outdoor Sunlight ☀️",
      descAr: "قالب خرساني طبيعي مع أشعة شمس منسابة وظلال أوراق الشجر",
      descEn: "Concrete slab bathed in direct sunlight with leafy aesthetic shadows",
      icon: Sun,
      color: "from-sky-400 to-blue-600 bg-blue-50 border-blue-200"
    }
  ];

  // Drag & Drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  const compressAndResizeImage = (file: File, maxDimension: number = 1000, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDimension) {
              height *= maxDimension / width;
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width *= maxDimension / height;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
        img.src = event.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage(language === "ar" ? "الرجاء اختيار ملف صورة صالح." : "Please select a valid image file.");
      return;
    }
    
    setSelectedFile(file);
    setErrorMessage("");
    setIsUploading(true);

    try {
      const base64Str = await compressAndResizeImage(file, 1000, 0.7);
      
      const hasSupabaseKeys = 
        Boolean((import.meta as any).env.VITE_SUPABASE_URL) && 
        Boolean((import.meta as any).env.VITE_SUPABASE_ANON_KEY);

      if (hasSupabaseKeys) {
        try {
          console.log('Attempting client-side enhancer image upload to Supabase...');
          const supabase = getSupabaseClient();
          
          // Convert base64 dataURL to Blob
          const blob = dataURLtoBlob(base64Str);
          
          const fileExt = file.name.split('.').pop() || 'jpg';
          let filename = `enhancer/${vendorId || 'global'}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          
          // Clean up path from any accidental multiple slashes and leading/trailing slashes
          filename = filename.replace(/\/+/g, "/");
          if (filename.startsWith("/")) {
            filename = filename.substring(1);
          }
          if (filename.endsWith("/")) {
            filename = filename.slice(0, -1);
          }
          
          const { error: uploadErr } = await supabase.storage
            .from('products')
            .upload(filename, blob, {
              contentType: file.type || 'image/jpeg',
              cacheControl: '3600',
              upsert: true
            });

          if (uploadErr) throw uploadErr;

          const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(filename);

          if (!publicUrl) throw new Error('No public URL returned.');

          setRawImageUrl(publicUrl);
          console.log('Enhancer image uploaded successfully to Supabase:', publicUrl);
          setIsUploading(false);
          return;
        } catch (supabaseErr: any) {
          console.warn('Supabase enhancer upload failed, falling back to server...', supabaseErr);
        }
      }

      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Str, vendorId })
      });

      if (!res.ok) {
        throw new Error(language === "ar" ? "فشل رفع الصورة للخادم." : "Server failed to process file upload.");
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(language === "ar" ? "استجاب الخادم بتنسيق غير صالح." : "Server returned an invalid response format.");
      }

      const data = await res.json();
      setRawImageUrl(data.imageUrl);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Upload error");
    } finally {
      setIsUploading(false);
    }
  };

  const generateAIImage = async () => {
    if (!rawImageUrl) return;
    if (aiCredits <= 0) {
      setErrorMessage(language === "ar" ? "ليس لديك رصيد ذكاء اصطناعي كافٍ." : "You do not have enough AI credits.");
      return;
    }

    setErrorMessage("");
    setIsGenerating(true);
    setGenerationStep(0);

    // Staggered interactive step simulations
    const interval = setInterval(() => {
      setGenerationStep(prev => {
        if (prev < 3) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 1500);

    try {
      const res = await fetch("/api/generate-ai-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          imageUrl: rawImageUrl,
          backgroundTheme: selectedTheme
        })
      });

      clearInterval(interval);

      const contentType = res.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      if (!res.ok) {
        if (isJson) {
          const errData = await res.json();
          throw new Error(errData.error || "Generation error");
        } else {
          const text = await res.text();
          console.error("Server HTML response on error:", text);
          throw new Error(language === "ar" ? "فشل توليد الصورة بالذكاء الاصطناعي بسبب خطأ في الخادم." : "Failed to generate AI image due to a server error.");
        }
      }

      if (!isJson) {
        throw new Error(language === "ar" ? "استجاب الخادم بتنسيق غير صالح." : "Server returned an invalid response format.");
      }

      const data = await res.json();
      setEnhancedImageUrl(data.imageUrl);
      
      // Update local credits in parent state
      if (onCreditsUpdated && data.creditsRemaining !== undefined) {
        onCreditsUpdated(data.creditsRemaining);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to generate AI image");
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerDownload = async () => {
    if (!enhancedImageUrl) return;
    try {
      const response = await fetch(enhancedImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `enhanced_product_${selectedTheme}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      // Fallback
      window.open(enhancedImageUrl, "_blank");
    }
  };

  const handleSaveToProduct = () => {
    if (enhancedImageUrl) {
      onImageSaved(enhancedImageUrl);
      onClose();
    }
  };

  // Render Step Messages for AI Studio styling feeling
  const renderStepMessage = () => {
    if (generationStep === 0) {
      return language === "ar" ? "جاري تحليل زوايا المنتج وحدوده..." : "Analyzing product geometric boundaries...";
    }
    if (generationStep === 1) {
      return language === "ar" ? "إزالة الخلفية الأصلية بدقة متناهية..." : "Removing old background with pixel-perfect precision...";
    }
    if (generationStep === 2) {
      return language === "ar" ? "دمج القالب ومطابقة الإضاءة الاحترافية..." : "Synthesizing new studio environment lighting...";
    }
    return language === "ar" ? "تحسين الألوان والتفاصيل النهائية..." : "Polishing color grade & shadows...";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-auto max-h-[90vh]"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all hover:scale-105 active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Plan Checking State - If NOT Pro/Enterprise, show lock layout */}
        {!isPremium ? (
          <div className="p-8 md:p-16 flex flex-col items-center justify-center text-center w-full min-h-[450px] space-y-6">
            <div className="w-20 h-20 bg-amber-50 border border-amber-200 rounded-3xl flex items-center justify-center text-amber-500 animate-bounce">
              <Lock className="w-10 h-10" />
            </div>
            <div className="space-y-2 max-w-lg">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 rounded-full text-[10px] font-black text-amber-800 uppercase tracking-widest">
                👑 {language === "ar" ? "باقة برو للأعمال حصرية" : "Pro Plan Exclusive"}
              </span>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                {language === "ar" ? "مُحسّن الصور بالذكاء الاصطناعي مغلق" : "AI Image Enhancer is Locked"}
              </h3>
              <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed">
                {language === "ar" 
                  ? "قم بترقية اشتراكك للوصول إلى محرك استبدال خلفية المنتجات الفوري وتحويل صور منزلك إلى جلسات تصوير مخصصة لجذب المئات من مبيعات السيارات!"
                  : "Upgrade to our Pro or Enterprise plan to gain immediate access to automated studio background rendering and elevate your local boutique sales!"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={onClose}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                {language === "ar" ? "إغلاق" : "Cancel"}
              </button>
              <button 
                onClick={handleUpgradeFromEnhancer}
                disabled={isUpgradingLocal}
                className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center gap-2"
              >
                {isUpgradingLocal ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {language === "ar" ? "جاري الترقية..." : "Upgrading..."}
                  </>
                ) : (
                  <>
                    <span>⚡ {language === "ar" ? "ترقية مجانية فورية للبرو" : "Instant Free Upgrade to Pro"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Left Side: Creative Interactive Canvas Panel */}
            <div className="w-full md:w-1/2 bg-slate-50/50 p-8 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-between overflow-y-auto min-h-[300px]">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl">
                    <Wand2 className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">
                      {language === "ar" ? "مُحسّن الصور الاحترافي" : "AI Image Studio"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                      {language === "ar" ? "مدعوم بنظام PhotoRoom" : "POWERED BY PHOTOROOM ENGINE"}
                    </p>
                  </div>
                </div>

                {/* Subtitle & Info */}
                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                  {language === "ar" 
                    ? "اختر صورة لمنتجك من ملفاتك، وحدد الخلفية المفضلة لديك وسيقوم الذكاء الاصطناعي برسم المنتج باحترافية." 
                    : "Upload your product photo, choose an elegant workspace background, and let the AI generate high fidelity studio outputs."}
                </p>

                {/* File Upload Box or Before-After comparison */}
                {!rawImageUrl ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-56 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
                      dragActive 
                        ? "border-indigo-500 bg-indigo-50/30 shadow-inner scale-98" 
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/20"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    
                    {isUploading ? (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-xs font-black text-indigo-600">
                          {language === "ar" ? "جاري تجهيز الصورة..." : "Processing image assets..."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="mx-auto w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                          <UploadCloud className="w-6 h-6 text-indigo-500" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-700">
                            {language === "ar" ? "اسحب وأفلت صورتك هنا" : "Drag & drop product photo"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {language === "ar" ? "أو اضغط للتصفح من جهازك" : "or click to browse filesystem"}
                          </p>
                        </div>
                        <div className="inline-flex px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-wide">
                          JPG, PNG, WEBP (Max 5MB)
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Visual Comparison Stage */}
                    <div className="relative aspect-square w-full max-w-[320px] mx-auto bg-slate-100 rounded-[2rem] overflow-hidden border border-slate-100 shadow-md">
                      
                      {!enhancedImageUrl ? (
                        /* Only raw photo uploaded preview */
                        <div className="relative w-full h-full">
                          <img 
                            src={rawImageUrl} 
                            alt="Raw product photo" 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute top-4 left-4 bg-slate-900/70 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg backdrop-blur-sm">
                            {language === "ar" ? "قبل التعديل 📷" : "Original Shot 📷"}
                          </div>
                          
                          {/* Cancel Image */}
                          <button
                            onClick={() => {
                              setRawImageUrl("");
                              setEnhancedImageUrl("");
                              setSelectedFile(null);
                            }}
                            className="absolute top-4 right-4 bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-md transition-all hover:scale-105"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        /* Beautiful interactive Before / After slider comparison */
                        <div className="relative w-full h-full select-none">
                          {/* After (Enhanced) Image */}
                          <img 
                            src={enhancedImageUrl} 
                            alt="Enhanced product photo" 
                            className="w-full h-full object-cover pointer-events-none" 
                          />
                          <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-md">
                            {language === "ar" ? "بعد الذكاء الاصطناعي ✨" : "AI Rendered ✨"}
                          </div>

                          {/* Before (Raw) Image (clipped using slider width) */}
                          <div 
                            className="absolute inset-0 overflow-hidden pointer-events-none"
                            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                          >
                            <img 
                              src={rawImageUrl} 
                              alt="Raw product photo" 
                              className="absolute inset-0 w-full h-full object-cover" 
                              style={{ width: "320px", maxWidth: "none" }} // Ensure same dimensions
                            />
                            <div className="absolute top-4 left-4 bg-slate-900/70 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg backdrop-blur-sm">
                              {language === "ar" ? "قبل التعديل" : "Before"}
                            </div>
                          </div>

                          {/* Slider handle bar */}
                          <div 
                            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-lg flex items-center justify-center pointer-events-none"
                            style={{ left: `${sliderPosition}%` }}
                          >
                            <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-100 text-slate-600 scale-90">
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          {/* Input range overlaid for native dragging */}
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={sliderPosition} 
                            onChange={(e) => setSliderPosition(Number(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                          />
                        </div>
                      )}

                      {/* Generation Animation Skeleton */}
                      <AnimatePresence>
                        {isGenerating && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4"
                          >
                            <div className="relative">
                              <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                              <Sparkles className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-xs font-black text-white uppercase tracking-wider">
                                {language === "ar" ? "جاري التوليد بالذكاء الاصطناعي" : "AI IS RENDERING YOUR PHOTO"}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold animate-pulse">
                                {renderStepMessage()}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Reset Button */}
                    {!isGenerating && enhancedImageUrl && (
                      <div className="text-center">
                        <button
                          onClick={() => {
                            setEnhancedImageUrl("");
                            setSliderPosition(50);
                          }}
                          className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest inline-flex items-center gap-1 bg-white px-4 py-2 border border-slate-100 shadow-sm rounded-xl transition-all hover:scale-105"
                        >
                          🔄 {language === "ar" ? "تغيير قالب الخلفية" : "Try different background"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Error messages if any */}
              {errorMessage && (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5 text-rose-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-[11px] font-black text-right rtl:text-right">{errorMessage}</p>
                </div>
              )}

              {/* Status bar: credits tracking */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                      {language === "ar" ? "الرصيد المتبقي" : "AI CREDITS REMAINING"}
                    </p>
                    <p className="text-xs font-black text-slate-700">
                      {aiCredits} {language === "ar" ? "رصيد" : "credits"}
                    </p>
                  </div>
                </div>
                
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  {language === "ar" ? "خصم رصيد لكل صورة" : "1 credit per generation"}
                </span>
              </div>
            </div>

            {/* Right Side: Visual Background Templates Configurator */}
            <div className="w-full md:w-1/2 p-8 flex flex-col justify-between overflow-y-auto max-h-[50vh] md:max-h-none">
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 text-left rtl:text-right">
                  {language === "ar" ? "اختر قالب الخلفية الذكي" : "Select Background Template"}
                </h4>

                {/* Templates Grid Selector */}
                <div className="grid grid-cols-1 gap-3 mb-6">
                  {themes.map((theme) => {
                    const isSelected = selectedTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSelectedTheme(theme.id)}
                        className={`p-4 rounded-2xl border-2 text-right rtl:text-right flex items-start gap-4 transition-all ${
                          isSelected 
                            ? "border-indigo-600 bg-indigo-50/20 shadow-md scale-[1.01]" 
                            : "border-slate-100 bg-white hover:border-slate-200"
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${theme.color} shrink-0`}>
                          <theme.icon className="w-5 h-5 text-indigo-700" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <h5 className="text-xs font-black text-slate-800">
                            {language === "ar" ? theme.labelAr : theme.labelEn}
                          </h5>
                          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                            {language === "ar" ? theme.descAr : theme.descEn}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white shrink-0 scale-90">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Actions Block */}
              <div className="space-y-3 pt-6 border-t border-slate-100">
                {!enhancedImageUrl ? (
                  /* Action trigger to start generation */
                  <button
                    type="button"
                    disabled={!rawImageUrl || isGenerating}
                    onClick={generateAIImage}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                      rawImageUrl && !isGenerating
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-xl shadow-indigo-200 active:scale-98"
                        : "bg-slate-100 text-slate-300 cursor-not-allowed"
                    }`}
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>{language === "ar" ? "توليد صورة الذكاء الاصطناعي ✨" : "Generate AI Image ✨"}</span>
                  </button>
                ) : (
                  /* Output Success Actions */
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleSaveToProduct}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>{language === "ar" ? "اعتماد الصورة وحفظها للمنتج" : "Apply & Save to Product"}</span>
                    </button>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={triggerDownload}
                        className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{language === "ar" ? "تحميل الملف" : "Download"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEnhancedImageUrl("");
                          setRawImageUrl("");
                          setSelectedFile(null);
                        }}
                        className="py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all"
                      >
                        <span>{language === "ar" ? "رفع صورة جديدة" : "New Image"}</span>
                      </button>
                    </div>
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full text-center py-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  {language === "ar" ? "تراجع وإغلاق" : "Cancel & Close"}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
