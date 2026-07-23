import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const R2_ENDPOINT = (import.meta as any).env.VITE_R2_ENDPOINT;
const R2_ACCESS_KEY_ID = (import.meta as any).env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = (import.meta as any).env.VITE_R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_DOMAIN = (import.meta as any).env.VITE_R2_PUBLIC_DOMAIN;
const R2_BUCKET_NAME = (import.meta as any).env.VITE_R2_BUCKET_NAME;

let s3Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!s3Client) {
    if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error("R2 configuration is missing. Please check your environment variables.");
    }
    s3Client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

/**
 * Uploads a file to Cloudflare R2 bucket
 * @param file The file or blob to upload
 * @param folder The folder in the bucket ('stores' or 'receipts')
 * @returns The public URL of the uploaded file
 */
export async function uploadToR2(file: File | Blob, folder: 'stores' | 'receipts'): Promise<string> {
  const client = getR2Client();
  const fileExtension = (file as File).name ? (file as File).name.split('.').pop() : 'jpg';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
  
  const arrayBuffer = await file.arrayBuffer();
  
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileName,
    Body: new Uint8Array(arrayBuffer),
    ContentType: file.type,
  });

  try {
    await client.send(command);
    
    // Construct the public URL
    // Ensure R2_PUBLIC_DOMAIN doesn't have a trailing slash
    const domain = R2_PUBLIC_DOMAIN.endsWith('/') ? R2_PUBLIC_DOMAIN.slice(0, -1) : R2_PUBLIC_DOMAIN;
    return `${domain}/${fileName}`;
  } catch (error) {
    console.error("R2 Upload Error:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to upload file to R2");
  }
}
