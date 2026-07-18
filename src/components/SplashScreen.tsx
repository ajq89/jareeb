import { motion } from 'motion/react';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F8FAFC]"
    >
      <div className="relative flex flex-col items-center">
        {/* Decorative ambient glow */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"
        />

        {/* Logo Container with Zoom Animation */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: 1.2, 
            ease: [0.22, 1, 0.36, 1] // Custom quintic ease-out 
          }}
          className="relative z-10 mb-12"
        >
          <img 
            src="/splash-logo.png" 
            alt="Jareeb" 
            className="w-48 sm:w-64 h-auto object-contain drop-shadow-2xl brightness-105"
          />
        </motion.div>

        {/* Minimalist Progress Line */}
        <div className="w-40 h-[2px] bg-slate-200 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ 
              duration: 1.8, 
              ease: "easeInOut" 
            }}
            className="absolute top-0 left-0 h-full bg-indigo-600"
          />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400"
        >
          Premium Curbside Experience
        </motion.p>
      </div>
    </motion.div>
  );
}
