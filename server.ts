import express from "express";
import path from "path";
import fs from "fs/promises";
import { readFileSync } from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Clean environment variables helper to strip quotes
function cleanEnvValue(val: string | undefined): string | undefined {
  if (!val) return val;
  let clean = val.trim();
  if (clean.startsWith('"') && clean.endsWith('"')) {
    clean = clean.slice(1, -1);
  } else if (clean.startsWith("'") && clean.endsWith("'")) {
    clean = clean.slice(1, -1);
  }
  return clean.trim();
}

// Initialize Supabase Admin/Service client on backend
let serverSupabase: any = null;
function getServerSupabaseClient() {
  if (serverSupabase) return serverSupabase;
  let supabaseUrl = cleanEnvValue(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const supabaseKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  
  if (supabaseUrl) {
    // Strip sub-paths like /storage/v1 or /rest/v1 if accidentally included by user
    if (supabaseUrl.includes("/storage/v1")) {
      supabaseUrl = supabaseUrl.split("/storage/v1")[0];
    }
    if (supabaseUrl.includes("/rest/v1")) {
      supabaseUrl = supabaseUrl.split("/rest/v1")[0];
    }
    // Remove trailing slashes
    while (supabaseUrl.endsWith("/")) {
      supabaseUrl = supabaseUrl.slice(0, -1);
    }
  }

  if (supabaseUrl && supabaseKey) {
    serverSupabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase Client successfully initialized on backend server with URL:", supabaseUrl);
    return serverSupabase;
  }
  return null;
}

// Initialize Firebase Admin using the configuration json in workspace root
let db: Firestore | null = null;
let bucket: any = null;

try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfigRaw = readFileSync(firebaseConfigPath, "utf-8");
  const firebaseConfig = JSON.parse(firebaseConfigRaw);

  const firebaseApp = getApps().length === 0 ? initializeApp({
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket
  }) : getApps()[0];

  db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  bucket = getStorage(firebaseApp).bucket();
  console.log("Firebase Admin initialized successfully on backend server with database:", firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.error("Warning: Failed to load Firebase Admin on backend server. Falling back to internal defaults.", error);
  // Fallback initialization if applicationDefault() fails
  try {
    const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
    const firebaseConfigRaw = readFileSync(firebaseConfigPath, "utf-8");
    const firebaseConfig = JSON.parse(firebaseConfigRaw);
    
    const firebaseApp = getApps().length === 0 ? initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket
    }) : getApps()[0];

    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    bucket = getStorage(firebaseApp).bucket();
  } catch (innerError) {
    console.error("Critical: Failed to initialize Firebase Admin fallback.", innerError);
  }
}

// API Routes FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Image upload route (handles base64 product images from the client)
app.post("/api/upload-image", express.json({ limit: "50mb" }), async (req: any, res: any) => {
  console.log("POST /api/upload-image request received");
  try {
    const { image, vendorId } = req.body;
    if (!image) {
      console.error("Upload error: No image data provided");
      return res.status(400).json({ error: "No image data provided" });
    }

    console.log(`Image received, length: ${image.length}, vendorId: ${vendorId || 'none'}`);

    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      console.error("Upload error: Invalid base64 image format");
      return res.status(400).json({ error: "Invalid base64 image format" });
    }

    const imageType = matches[1];
    const extension = imageType.split("/")[1] || "png";
    const buffer = Buffer.from(matches[2], "base64");

    const filename = `raw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;
    let imageUrl = "";

    // 1. ALWAYS SAVE LOCALLY FIRST as a reliable local cache
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadsDir, { recursive: true });

      const filepath = path.join(uploadsDir, filename);
      await fs.writeFile(filepath, buffer);
      console.log(`Image saved locally: /uploads/${filename}`);
      imageUrl = `/uploads/${filename}`;
    } catch (fsErr: any) {
      console.error("CRITICAL: Failed to save image locally:", fsErr);
    }

    // 2. PRIORITIZE SUPABASE STORAGE UPLOAD (Highly recommended for persistence)
    const supabaseClient = getServerSupabaseClient();
    if (supabaseClient) {
      try {
        console.log("Attempting backend-side upload to Supabase Storage...");
        
        // Ensure 'products' bucket exists and is public (helps prevent 'bucket not found' or RLS policy initialization issues)
        try {
          const { error: createErr } = await supabaseClient.storage.createBucket("products", {
            public: true
          });
          if (createErr) {
            console.log("Bucket creation status/info (bucket 'products' probably already exists):", createErr.message);
          } else {
            console.log("Successfully verified or created the 'products' storage bucket");
          }
        } catch (bucketErr: any) {
          console.warn("Soft warning: Bucket creation check skipped:", bucketErr.message || bucketErr);
        }

        // Dynamically route to correct folders to comply with Supabase RLS policies
        const type = req.body.type || "";
        let pathInBucket = "";
        
        const cleanVendorId = (vendorId && vendorId !== "undefined" && vendorId !== "null") ? vendorId : "global";

        if (type === "logo" || type === "banner") {
          pathInBucket = `stores/${cleanVendorId}/${type}_${Date.now()}.${extension}`;
        } else if (!vendorId || vendorId === "undefined" || vendorId === "null") {
          pathInBucket = `receipts/receipt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;
        } else if (type === "enhancer") {
          pathInBucket = `enhancer/${cleanVendorId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;
        } else {
          pathInBucket = `products/${cleanVendorId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;
        }

        // Clean up path from any accidental multiple slashes and leading/trailing slashes
        pathInBucket = pathInBucket.replace(/\/+/g, "/");
        if (pathInBucket.startsWith("/")) {
          pathInBucket = pathInBucket.substring(1);
        }
        if (pathInBucket.endsWith("/")) {
          pathInBucket = pathInBucket.slice(0, -1);
        }

        console.log(`Resolved backend upload bucket path: ${pathInBucket}`);

        // Use Uint8Array to guarantee binary compatibility across JS runtimes
        const { data, error } = await supabaseClient.storage
          .from("products")
          .upload(pathInBucket, new Uint8Array(buffer), {
            contentType: imageType,
            cacheControl: "3600",
            upsert: true
          });

        if (error) {
          throw error;
        }

        const { data: { publicUrl } } = supabaseClient.storage
          .from("products")
          .getPublicUrl(pathInBucket);

        if (publicUrl) {
          imageUrl = publicUrl;
          console.log(`Uploaded image to Supabase Storage via backend: ${imageUrl}`);
        }
      } catch (supabaseErr: any) {
        console.error("Failed to upload image to Supabase Storage server-side:", supabaseErr.message || supabaseErr);
      }
    }

    // 3. FALLBACK TO FIREBASE STORAGE (if Supabase upload wasn't used or failed, and Firebase is available)
    if ((!imageUrl || !imageUrl.startsWith("http")) && vendorId && bucket) {
      try {
        console.log(`Attempting Firebase Storage fallback upload for vendor ${vendorId}...`);
        const file = bucket.file(`vendors/${vendorId}/${filename}`);
        
        const uploadPromise = file.save(buffer, {
          metadata: { contentType: imageType },
          public: true
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Firebase Storage upload timed out")), 10000)
        );

        await Promise.race([uploadPromise, timeoutPromise]);
        
        imageUrl = `https://storage.googleapis.com/${bucket.name}/vendors/${vendorId}/${filename}`;
        console.log(`Uploaded image to Firebase Storage fallback for vendor ${vendorId}: ${imageUrl}`);
      } catch (storageErr: any) {
        console.warn("Firebase Storage fallback upload skipped or failed.", storageErr.message);
      }
    }

    if (!imageUrl) {
      throw new Error("Failed to save image to any storage medium.");
    }

    res.json({ imageUrl });
  } catch (err: any) {
    console.error("Final Upload error:", err);
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
    const vendorRef = db.collection("vendors").doc(vendorId);
    const vendorSnap = await vendorRef.get();

    if (!vendorSnap.exists) {
      return res.status(404).json({ error: "Vendor/Store profile not found." });
    }

    const vendorData = vendorSnap.data() || {};

    // Verification: Pro Plan requirement checks
    if (vendorData.plan !== "pro" && vendorData.plan !== "enterprise") {
      return res.status(400).json({ error: "The AI Image Enhancement tool is a PRO-only premium feature. Please upgrade your plan." });
    }

    let credits = vendorData.aiCredits;
    // Default to 10 trial credits if undefined to ensure immediate utility
    if (credits === undefined) {
      credits = 10;
      await vendorRef.update({ aiCredits: credits });
    }

    if (credits <= 0) {
      return res.status(402).json({ error: "You have used all of your AI credits. Please buy more credits or contact support." });
    }

    // Deduct credit
    const nextCredits = credits - 1;
    await vendorRef.update({ aiCredits: nextCredits });

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
      // PhotoRoom expects a Blob or File. In Node, we can send the buffer directly.
      const formData = new FormData();
      formData.append("image_file", new Blob([fileBuffer]), filename);
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

    // Explicit fallback for client-side routing in development mode
    app.get("*", async (req, res, next) => {
      // Skip API routes, uploaded files, and requests with file extensions (to allow Vite to serve assets)
      if (req.path.startsWith("/api") || req.path.startsWith("/uploads") || (req.path.includes(".") && !req.path.endsWith(".html"))) {
        return next();
      }
      try {
        const template = await fs.readFile(path.join(process.cwd(), "index.html"), "utf-8");
        const html = await vite.transformIndexHtml(req.originalUrl || req.url, template);
        res.status(200).type("text/html").send(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      // Skip API routes, uploaded files, and requests with file extensions to avoid MIME mismatch or file downloads
      if (req.path.startsWith("/api") || req.path.startsWith("/uploads") || (req.path.includes(".") && !req.path.endsWith(".html"))) {
        return res.status(404).send("Not Found");
      }
      res.status(200).type("text/html; charset=utf-8").sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
  });
}

bootstrap();

