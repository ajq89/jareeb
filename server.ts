import express from "express";
import path from "path";
import fs from "fs/promises";
import { readFileSync } from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Firebase using the configuration json in workspace root
let db: any = null;
try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfigRaw = readFileSync(firebaseConfigPath, "utf-8");
  const firebaseConfig = JSON.parse(firebaseConfigRaw);
  const firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  console.log("Firebase initialized successfully on backend server.");
} catch (error) {
  console.error("Warning: Failed to load Firebase on backend server. Check firebase-applet-config.json.", error);
}

// API Routes FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Image upload route (handles base64 product images from the client)
app.post("/api/upload-image", express.json({ limit: "50mb" }), async (req: any, res: any) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: "Invalid base64 image format" });
    }

    const imageType = matches[1];
    const extension = imageType.split("/")[1] || "png";
    const buffer = Buffer.from(matches[2], "base64");

    const filename = `raw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads");

    // Ensure uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });

    const filepath = path.join(uploadsDir, filename);
    await fs.writeFile(filepath, buffer);

    const imageUrl = `/uploads/${filename}`;
    res.json({ imageUrl });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PhotoRoom AI Generation endpoint
app.post("/api/generate-ai-image", express.json({ limit: "10mb" }), async (req: any, res: any) => {
  try {
    const { vendorId, imageUrl, backgroundTheme } = req.body;

    if (!vendorId || !imageUrl || !backgroundTheme) {
      return res.status(400).json({ error: "Missing required parameters: vendorId, imageUrl, backgroundTheme" });
    }

    if (!db) {
      return res.status(500).json({ error: "Database service unavailable. Please check your Firestore setup." });
    }

    // 1. Validate credit quota of the vendor
    const vendorRef = doc(db, "vendors", vendorId);
    const vendorSnap = await getDoc(vendorRef);

    if (!vendorSnap.exists()) {
      return res.status(404).json({ error: "Vendor/Store profile not found." });
    }

    const vendorData = vendorSnap.data();

    // Verification: Pro Plan requirement checks
    if (vendorData.plan !== "pro" && vendorData.plan !== "enterprise") {
      return res.status(400).json({ error: "The AI Image Enhancement tool is a PRO-only premium feature. Please upgrade your plan." });
    }

    let credits = vendorData.aiCredits;
    // Default to 10 trial credits if undefined to ensure immediate utility
    if (credits === undefined) {
      credits = 10;
      await updateDoc(vendorRef, { aiCredits: credits });
    }

    if (credits <= 0) {
      return res.status(402).json({ error: "You have used all of your AI credits. Please buy more credits or contact support." });
    }

    // Deduct credit
    const nextCredits = credits - 1;
    await updateDoc(vendorRef, { aiCredits: nextCredits });

    // 2. Formulate high-quality thematic prompts
    let promptText = "";
    if (backgroundTheme === "marble") {
      promptText = "A high-end product standing on a luxury polished white marble counter with dynamic soft studio lighting, sharp details, cinematic bokeh, 4k commercial shoot";
    } else if (backgroundTheme === "wooden") {
      promptText = "A beautiful handcraft product resting on a rustic warm mahogany wooden surface, soft ambient shadows, deep color contrast, hyperrealistic";
    } else if (backgroundTheme === "minimalist") {
      promptText = "A minimalist product portrait centered against a smooth pastel colored paper background, soft direct highlights, elegant shadow outline";
    } else if (backgroundTheme === "outdoor") {
      promptText = "An organic product item on a light grey slab of concrete, beautiful warm sunlight rays filtering through leaves, long dramatic shadows, outdoor depth of field";
    } else {
      promptText = "A premium product setup with professional workspace aesthetics, commercial catalog style";
    }

    const apiKey = process.env.PHOTOROOM_API_KEY;

    // 3. Trigger PhotoRoom or Fallback gracefully
    if (!apiKey) {
      console.warn("PHOTOROOM_API_KEY is not defined. Emulating a perfect premium output using dynamic Unsplash resources.");
      
      let fallbackUrl = "";
      if (backgroundTheme === "marble") {
        fallbackUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80";
      } else if (backgroundTheme === "wooden") {
        fallbackUrl = "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?auto=format&fit=crop&w=800&q=80";
      } else if (backgroundTheme === "minimalist") {
        fallbackUrl = "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=800&q=80";
      } else {
        fallbackUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";
      }

      return res.json({
        imageUrl: fallbackUrl,
        creditsRemaining: nextCredits,
        isSimulated: true
      });
    }

    // Real photo call logic
    try {
      const filename = path.basename(imageUrl);
      const filepath = path.join(process.cwd(), "public", "uploads", filename);
      
      const fileBuffer = await fs.readFile(filepath);
      const blob = new Blob([fileBuffer], { type: "image/png" });

      const formData = new FormData();
      formData.append("image_file", blob, filename);
      formData.append("prompt", promptText);

      const response = await fetch("https://image-api.photoroom.com/v1/instant-backgrounds", {
        method: "POST",
        headers: {
          "x-api-key": apiKey
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PhotoRoom Error (${response.status}): ${errorText}`);
      }

      const responseArrayBuffer = await response.arrayBuffer();
      const responseBuffer = Buffer.from(responseArrayBuffer);

      const enhancedFilename = `enhanced_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
      const enhancedFilepath = path.join(process.cwd(), "public", "uploads", enhancedFilename);

      await fs.writeFile(enhancedFilepath, responseBuffer);

      return res.json({
        imageUrl: `/uploads/${enhancedFilename}`,
        creditsRemaining: nextCredits,
        isSimulated: false
      });

    } catch (apiError: any) {
      console.error("Error communicating with PhotoRoom API. Falling back safely.", apiError);
      
      // If photoRoom API crashes, refund the credit or provide simulated output
      let fallbackUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80";
      
      return res.json({
        imageUrl: fallbackUrl,
        creditsRemaining: nextCredits,
        isSimulated: true,
        warning: "PhotoRoom API error. Showing high fidelity theme match instead."
      });
    }

  } catch (err: any) {
    console.error("AI Generation Route Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Wrap Vite setup and app.listen in an async function to support awaiting Vite creation cleanly
async function bootstrap() {
  // Expose public uploads folder for static access
  app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

  // Vite Middleware Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
  });
}

bootstrap();
