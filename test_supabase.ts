import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

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

async function test() {
  let supabaseUrl = cleanEnvValue(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const supabaseKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);

  console.log("Supabase URL raw:", process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  console.log("Supabase Key raw length:", (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)?.length);

  if (supabaseUrl) {
    if (supabaseUrl.includes("/storage/v1")) {
      supabaseUrl = supabaseUrl.split("/storage/v1")[0];
    }
    if (supabaseUrl.includes("/rest/v1")) {
      supabaseUrl = supabaseUrl.split("/rest/v1")[0];
    }
    while (supabaseUrl.endsWith("/")) {
      supabaseUrl = supabaseUrl.slice(0, -1);
    }
  }

  console.log("Cleaned Supabase URL:", supabaseUrl);

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Key");
    return;
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log("Created supabase client");

    // Try to create/verify bucket
    const { data: bucketData, error: bucketErr } = await supabaseClient.storage.createBucket("products", {
      public: true
    });
    console.log("Bucket check/create result:", bucketErr ? bucketErr.message : "Success bucket exists/created", bucketData);

    const testPath = `test_upload_${Date.now()}.txt`;
    console.log("Attempting upload to products/", testPath);

    const { data, error } = await supabaseClient.storage
      .from("products")
      .upload(testPath, Buffer.from("hello world"), {
        contentType: "text/plain",
        upsert: true
      });

    if (error) {
      console.error("Upload failed with error:", error);
    } else {
      console.log("Upload succeeded! Data:", data);
      const { data: { publicUrl } } = supabaseClient.storage.from("products").getPublicUrl(testPath);
      console.log("Public URL:", publicUrl);
    }
  } catch (err: any) {
    console.error("Caught exception:", err);
  }
}

test();
