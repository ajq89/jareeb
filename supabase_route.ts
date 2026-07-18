// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client with service role key to securely execute updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { storeId, imageUrl, backgroundTheme } = await request.json();

    if (!storeId || !imageUrl || !backgroundTheme) {
      return NextResponse.json(
        { error: "Missing required parameters: storeId, imageUrl, backgroundTheme" },
        { status: 400 }
      );
    }

    const photoroomKey = process.env.PHOTOROOM_API_KEY;
    if (!photoroomKey) {
      return NextResponse.json(
        { error: "PhotoRoom API Key is not configured on the server environment." },
        { status: 500 }
      );
    }

    // 1. Deduct AI credit atomically using our RPC function
    const { data: remainingCredits, error: rpcError } = await supabaseAdmin.rpc(
      "deduct_ai_credits",
      { store_id_param: storeId }
    );

    if (rpcError) {
      console.error("Supabase credit deduction failed:", rpcError);
      return NextResponse.json(
        { error: rpcError.message || "Insufficient credits or store profile not found." },
        { status: 402 }
      );
    }

    // 2. Formulate target thematic prompt for PhotoRoom
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

    // 3. Download the raw product image from Supabase Storage
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch original product image from raw URL: ${imageUrl}`);
    }
    const rawImageBuffer = await imageResponse.arrayBuffer();

    // 4. Construct multipart form-data request to PhotoRoom Instant Backgrounds
    const formData = new FormData();
    const blob = new Blob([rawImageBuffer], { type: "image/png" });
    formData.append("image_file", blob, "product.png");
    formData.append("prompt", promptText);

    const photoroomResponse = await fetch("https://image-api.photoroom.com/v1/instant-backgrounds", {
      method: "POST",
      headers: {
        "x-api-key": photoroomKey
      },
      body: formData
    });

    if (!photoroomResponse.ok) {
      const errorText = await photoroomResponse.text();
      throw new Error(`PhotoRoom API Error (${photoroomResponse.status}): ${errorText}`);
    }

    const enhancedImageBuffer = await photoroomResponse.arrayBuffer();

    // 5. Save the enhanced image back into Supabase Storage 'product-images' bucket
    const uniqueFilename = `enhanced_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
    const storagePath = `${storeId}/${uniqueFilename}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("product-images")
      .upload(storagePath, Buffer.from(enhancedImageBuffer), {
        contentType: "image/png",
        cacheControl: "3600"
      });

    if (uploadError) {
      throw new Error(`Supabase Storage upload failed: ${uploadError.message}`);
    }

    // 6. Retrieve Public URL for the uploaded enhanced file
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("product-images")
      .getPublicUrl(storagePath);

    return NextResponse.json({
      imageUrl: publicUrlData.publicUrl,
      creditsRemaining: remainingCredits
    });

  } catch (err: any) {
    console.error("AI Generation Handler crashed:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
