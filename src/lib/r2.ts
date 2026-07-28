import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const getR2Env = () => {
  const env = (import.meta as any).env || {};
  return {
    endpoint: env.VITE_R2_ENDPOINT,
    accessKeyId: env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.VITE_R2_SECRET_ACCESS_KEY,
    publicDomain: env.VITE_R2_PUBLIC_DOMAIN,
    bucketName: env.VITE_R2_BUCKET_NAME,
  };
};

let s3Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!s3Client) {
    const { endpoint, accessKeyId, secretAccessKey } = getR2Env();
    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error("R2 configuration is missing. Please check your environment variables.");
    }
    s3Client = new S3Client({
      region: "auto",
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
  }
  return s3Client;
}

/**
 * Converts a Blob or File to a Base64 data URL string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads a file or blob to Cloudflare R2 bucket or server upload fallback
 * @param file The file or blob to upload
 * @param folder The folder in the bucket ('stores' or 'receipts')
 * @returns The public URL of the uploaded file
 */
export async function uploadToR2(file: File | Blob, folder: 'stores' | 'receipts'): Promise<string> {
  const { endpoint, accessKeyId, secretAccessKey, publicDomain, bucketName } = getR2Env();

  // 1. Attempt Client-side Direct S3 Upload if all R2 credentials are available
  if (endpoint && accessKeyId && secretAccessKey && publicDomain && bucketName) {
    try {
      const client = getR2Client();
      const fileExtension = (file as File).name ? (file as File).name.split('.').pop() : 'jpg';
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
      
      const arrayBuffer = await file.arrayBuffer();
      
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: new Uint8Array(arrayBuffer),
        ContentType: file.type || 'image/jpeg',
      });

      await client.send(command);
      
      const domain = publicDomain.endsWith('/') ? publicDomain.slice(0, -1) : publicDomain;
      console.log("Uploaded file directly to Cloudflare R2 from browser:", `${domain}/${fileName}`);
      return `${domain}/${fileName}`;
    } catch (clientError: any) {
      console.warn("Client-side direct R2 upload failed (e.g. CORS or credential issue), falling back to server API...", clientError.message || clientError);
    }
  }

  // 2. Server-side Upload Fallback (/api/upload-image)
  try {
    const base64Str = await blobToBase64(file);
    
    const res = await fetch("/api/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: base64Str,
        type: folder
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Server returned status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    if (data.imageUrl) {
      console.log("Uploaded file via server upload API:", data.imageUrl);
      return data.imageUrl;
    }
    throw new Error("Server upload endpoint did not return a valid image URL");
  } catch (serverError: any) {
    console.warn("Server upload mechanism fallback to dataUrl:", serverError);
    try {
      const base64Str = await blobToBase64(file);
      return base64Str;
    } catch (e) {
      throw new Error(serverError.message || "Failed to upload file");
    }
  }
}

