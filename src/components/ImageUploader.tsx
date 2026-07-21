import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, Image as ImageIcon, Loader2, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { getSupabaseClient } from "../lib/supabase";

interface ImageUploaderProps {
  /** The ID of the store used for naming conflict prevention */
  storeId: string;
  /** Callback fired when the image is successfully uploaded to Supabase */
  onUploadSuccess: (url: string) => void;
  /** Optional callback for capturing upload errors */
  onUploadError?: (error: string) => void;
  /** Optional styling class overrides */
  className?: string;
  /** Label for the upload dropzone */
  label?: string;
  /** Interface language ('ar' for Arabic, 'en' for English) */
  language?: "ar" | "en";
}

export default function ImageUploader({
  storeId,
  onUploadSuccess,
  onUploadError,
  className = "",
  label,
  language = "ar",
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if Supabase variables are set
  const hasSupabaseKeys = 
    Boolean((import.meta as any).env.VITE_SUPABASE_URL) && 
    Boolean((import.meta as any).env.VITE_SUPABASE_ANON_KEY);

  // Localization strings
  const dict = {
    ar: {
      dragActive: "أفلت الصورة هنا لرفعها...",
      dragPrompt: label || "اسحب وأفلت صورة المنتج هنا، أو انقر للاختيار",
      subPrompt: "يدعم PNG, JPG, JPEG, WEBP (بحد أقصى 2 ميجابايت)",
      validating: "جاري التحقق من الملف...",
      uploading: "جاري الرفع...",
      success: "تم رفع الصورة بنجاح!",
      errorInvalidType: "عذراً، الملف المحدد ليس صورة صالحة. يرجى اختيار صورة بصيغة (PNG, JPG, JPEG, WEBP).",
      errorTooLarge: "حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 2 ميجابايت.",
      errorMissingKeys: "مفتاح Supabase غير مهيأ. يرجى إضافة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY إلى الإعدادات.",
      errorUploadFailed: "فشل رفع الصورة إلى Supabase Storage. يرجى التحقق من إعدادات الـ Bucket وسياسات RLS.",
      retry: "إعادة المحاولة",
    },
    en: {
      dragActive: "Drop the image here to upload...",
      dragPrompt: label || "Drag & drop product image here, or click to browse",
      subPrompt: "Supports PNG, JPG, JPEG, WEBP (Max size 2MB)",
      validating: "Validating file...",
      uploading: "Uploading...",
      success: "Image uploaded successfully!",
      errorInvalidType: "Invalid file type. Please select an image (PNG, JPG, JPEG, WEBP).",
      errorTooLarge: "File is too large. Maximum allowed size is 2MB.",
      errorMissingKeys: "Supabase keys are missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      errorUploadFailed: "Upload to Supabase Storage failed. Please check your storage bucket setup and RLS rules.",
      retry: "Retry",
    }
  };

  const t = dict[language];

  // Helper to sanitize file extension
  const getCleanExtension = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase() || "png";
    return ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";
  };

  // Main file processing & validation logic
  const processAndUploadFile = async (file: File) => {
    setErrorMessage(null);
    setUploadProgress(0);

    // 1. File Type Validation
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      const err = t.errorInvalidType;
      setErrorMessage(err);
      if (onUploadError) onUploadError(err);
      return;
    }

    // 2. File Size Validation (2MB = 2 * 1024 * 1024 bytes)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      const err = t.errorTooLarge;
      setErrorMessage(err);
      if (onUploadError) onUploadError(err);
      return;
    }

    // 3. Supabase Key Validation
    if (!hasSupabaseKeys) {
      const err = t.errorMissingKeys;
      setErrorMessage(err);
      if (onUploadError) onUploadError(err);
      return;
    }

    // Generate local preview URL
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    setIsUploading(true);

    try {
      // 4. Generate Unique File Name
      const cleanExt = getCleanExtension(file.name);
      const sanitizedStoreId = storeId.replace(/[^a-zA-Z0-9-_]/g, "") || "global";
      let uniqueFilename = `${sanitizedStoreId}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;
      
      // Clean up path from any accidental multiple slashes and leading/trailing slashes
      uniqueFilename = uniqueFilename.replace(/\/+/g, "/");
      if (uniqueFilename.startsWith("/")) {
        uniqueFilename = uniqueFilename.substring(1);
      }
      if (uniqueFilename.endsWith("/")) {
        uniqueFilename = uniqueFilename.slice(0, -1);
      }

      const supabase = getSupabaseClient();

      // Track upload start simulated progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 150);

      // 5. Execute Supabase Storage Upload
      try {
        const { data, error } = await supabase.storage
          .from("products")
          .upload(uniqueFilename, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          throw error;
        }

        setUploadProgress(100);

        // 6. Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from("products")
          .getPublicUrl(uniqueFilename);

        if (!publicUrl) {
          throw new Error("Unable to fetch public URL from Supabase storage bucket.");
        }

        // Fire success callback
        onUploadSuccess(publicUrl);
      } catch (directUploadError: any) {
        console.warn("Direct client-side upload failed, attempting backend-side fallback upload...", directUploadError);
        
        const base64Str = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
        });

        const res = await fetch("/api/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64Str,
            vendorId: storeId,
            type: "product"
          })
        });

        if (!res.ok) {
          const responseText = await res.text();
          throw new Error(`Server fallback failed: ${responseText}`);
        }

        const serverData = await res.json();
        if (serverData.imageUrl) {
          setUploadProgress(100);
          onUploadSuccess(serverData.imageUrl);
        } else {
          throw new Error("Server response did not include a valid image URL.");
        }
      }

      clearInterval(progressInterval);

    } catch (error: any) {
      console.error("Supabase image upload failed:", error);
      const err = `${t.errorUploadFailed} (${error.message || error})`;
      setErrorMessage(err);
      if (onUploadError) onUploadError(err);
      // Clear preview if upload failed
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Drag Events Handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAndUploadFile(e.dataTransfer.files[0]);
    }
  };

  // File Input Change Handler
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processAndUploadFile(e.target.files[0]);
    }
  };

  // Trigger input click
  const triggerFileInput = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  // Clear current image and state
  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    setUploadProgress(0);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Missing Keys Visual Banner Guard */}
      {!hasSupabaseKeys && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-xs sm:text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">
              {language === "ar" ? "إعداد Supabase مطلوب" : "Supabase Setup Required"}
            </p>
            <p className="text-amber-700 font-normal leading-relaxed">
              {t.errorMissingKeys}
            </p>
          </div>
        </div>
      )}

      {/* Main Dropzone / Interactive Card */}
      <div
        onClick={triggerFileInput}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center text-center
          ${isDragging 
            ? "border-indigo-500 bg-indigo-50/50 scale-[1.01]" 
            : "border-slate-200 hover:border-indigo-400 bg-white hover:bg-slate-50/30"
          }
          ${isUploading ? "pointer-events-none opacity-80" : ""}
          ${errorMessage ? "border-rose-200 bg-rose-50/10" : ""}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/jpg, image/webp"
          className="hidden"
          disabled={isUploading}
        />

        {/* 1. Preview State */}
        {previewUrl ? (
          <div className="relative w-full aspect-video max-h-48 rounded-xl overflow-hidden group">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover rounded-xl"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={clearSelection}
                className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all hover:scale-110 active:scale-95 shadow-lg shadow-rose-900/30"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Uploading indicator on top of preview */}
            {isUploading && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                <span className="text-xs font-black text-slate-700">{t.uploading}</span>
                <div className="w-32 bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-indigo-600 mt-1">{uploadProgress}%</span>
              </div>
            )}

            {/* Success indicator on preview completion */}
            {!isUploading && uploadProgress === 100 && (
              <div className="absolute bottom-3 right-3 bg-emerald-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-[10px] font-black shadow-lg shadow-emerald-900/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t.success}</span>
              </div>
            )}
          </div>
        ) : (
          /* 2. Upload Prompt State */
          <div className="space-y-4 py-4">
            <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300
              ${isDragging 
                ? "bg-indigo-500 text-white scale-110 rotate-12 shadow-lg shadow-indigo-200" 
                : "bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"
              }
            `}>
              <Upload className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-black text-slate-700">
                {isDragging ? t.dragActive : t.dragPrompt}
              </p>
              <p className="text-[10px] font-bold text-slate-400">
                {t.subPrompt}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Error Alert Feedback */}
      {errorMessage && (
        <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <p className="leading-relaxed">{errorMessage}</p>
            <button
              type="button"
              onClick={triggerFileInput}
              className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 underline uppercase tracking-wider"
            >
              {t.retry}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
