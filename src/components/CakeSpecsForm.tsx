import React, { useState, useEffect } from "react";
import { Cake, Type, Layers, Scale } from "lucide-react";
import { Product } from "../types";

export interface CakeSpecs {
  writing: string;
  flavor: string;
  weight: number; // 1, 1.5, 2, 3
  calculatedPrice: number;
}

interface CakeSpecsFormProps {
  product: Product & { price_per_kg?: number };
  onChange: (specs: CakeSpecs) => void;
  language?: "ar" | "en";
}

const FLAVORS = [
  { id: "chocolate", ar: "شوكولاتة", en: "Chocolate" },
  { id: "vanilla", ar: "فانيلا", en: "Vanilla" },
  { id: "red_velvet", ar: "ريد فيلفيت", en: "Red Velvet" },
  { id: "velvet_strawberry", ar: "فيلفيت فراولة", en: "Velvet Strawberry" },
];

const WEIGHTS = [
  { value: 1, label: "1 kg / ١ كيلو" },
  { value: 1.5, label: "1.5 kg / ١.٥ كيلو" },
  { value: 2, label: "2 kg / ٢ كيلو" },
  { value: 3, label: "3 kg / ٣ كيلو" },
];

export default function CakeSpecsForm({
  product,
  onChange,
  language = "ar",
}: CakeSpecsFormProps) {
  const [writing, setWriting] = useState("");
  const [flavor, setFlavor] = useState(FLAVORS[0].id);
  const [weight, setWeight] = useState(WEIGHTS[0].value);

  const pricePerKg = product.price_per_kg || product.price || 15; // fallback to base price if price_per_kg is not defined

  const calculatedPrice = Number((weight * pricePerKg).toFixed(2));

  // Propagate state changes back to parent component
  useEffect(() => {
    onChange({
      writing,
      flavor,
      weight,
      calculatedPrice,
    });
  }, [writing, flavor, weight, calculatedPrice, onChange]);

  const texts = {
    ar: {
      title: "مواصفات الكعكة المخصصة",
      writingLabel: "الكتابة على الكعكة (مثال: عيد ميلاد سعيد أحمد)",
      writingPlaceholder: "اكتب النص الذي ترغب في وضعه على الكعكة هنا...",
      flavorLabel: "النكهة المفضلة",
      weightLabel: "الوزن المطلوب",
      priceSummary: "السعر المحتسب بناءً على الوزن:",
      pricePerKg: "سعر الكيلو جرام:",
    },
    en: {
      title: "Custom Cake Specifications",
      writingLabel: "Writing on the cake (e.g., Happy Birthday John)",
      writingPlaceholder: "Enter the text you want written on the cake...",
      flavorLabel: "Preferred Flavor",
      weightLabel: "Required Weight",
      priceSummary: "Calculated price based on weight:",
      pricePerKg: "Price per kg:",
    },
  };

  const t = texts[language];

  return (
    <div className="space-y-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80 my-6">
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/50">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
          <Cake className="w-5 h-5 animate-pulse" />
        </div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
          {t.title}
        </h3>
      </div>

      {/* Writing on Cake input */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-slate-400" />
          {t.writingLabel}
        </label>
        <textarea
          value={writing}
          onChange={(e) => setWriting(e.target.value)}
          placeholder={t.writingPlaceholder}
          maxLength={100}
          rows={2}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-300 text-right rtl:text-right"
        />
      </div>

      {/* Flavor Select input */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          {t.flavorLabel}
        </label>
        <select
          value={flavor}
          onChange={(e) => setFlavor(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
        >
          {FLAVORS.map((f) => (
            <option key={f.id} value={f.id}>
              {language === "ar" ? f.ar : f.en}
            </option>
          ))}
        </select>
      </div>

      {/* Weight Select input */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5 text-slate-400" />
          {t.weightLabel}
        </label>
        <select
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
        >
          {WEIGHTS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </div>

      {/* Price calculation summary */}
      <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/30 flex justify-between items-center text-xs">
        <div className="space-y-1">
          <p className="text-slate-400 font-bold">{t.priceSummary}</p>
          <p className="text-[10px] text-slate-400 font-medium italic">
            {t.pricePerKg} {pricePerKg} BHD / kg
          </p>
        </div>
        <div className="text-right">
          <span className="text-indigo-600 font-black text-lg">
            {calculatedPrice} BHD
          </span>
        </div>
      </div>
    </div>
  );
}
