// Object storage client. Used for profile avatars (and anything else that
// would otherwise bloat MongoDB). Configured via env vars so the same code
// works with MinIO in dev and AWS S3 / Cloudflare R2 / Backblaze B2 in prod.
//
// Required env vars (all five must be set for uploads to work):
//   S3_ENDPOINT          e.g. "http://localhost:9000" (MinIO), "" for AWS default
//   S3_REGION            e.g. "us-east-1" (AWS), "auto" (R2), any string for MinIO
//   S3_BUCKET            the bucket name (must exist + be readable from the app)
//   S3_ACCESS_KEY_ID     access / username
//   S3_SECRET_ACCESS_KEY secret / password
//
// MinIO local-dev defaults match the official quickstart image:
//   S3_ENDPOINT=http://localhost:9000
//   S3_REGION=us-east-1
//   S3_BUCKET=aquawatch
//   S3_ACCESS_KEY_ID=minioadmin
//   S3_SECRET_ACCESS_KEY=minioadmin

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

let cached: { client: S3Client; bucket: string } | null = null;

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      "Object storage isn't configured. Set S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY in your .env.",
    );
    this.name = "StorageNotConfiguredError";
  }
}

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}

function getClient(): { client: S3Client; bucket: string } {
  if (cached) return cached;
  if (!isStorageConfigured()) throw new StorageNotConfiguredError();

  const config: S3ClientConfig = {
    region: process.env.S3_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  };
  // Custom endpoint = MinIO / R2 / B2 / any S3-compatible host. Omit on AWS
  // to use the default region-based endpoint.
  if (process.env.S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT;
    // MinIO needs path-style addressing; AWS prefers virtual-hosted style.
    config.forcePathStyle = true;
  }

  cached = {
    client: new S3Client(config),
    bucket: process.env.S3_BUCKET!,
  };
  return cached;
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const { client, bucket } = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=60",
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  const { client, bucket } = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export interface FetchedObject {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength?: number;
}

/**
 * Stream a stored object back so an API route can pipe it to the browser.
 * Returns null when the key doesn't exist (S3 throws NoSuchKey).
 */
export async function getObjectStream(
  key: string,
): Promise<FetchedObject | null> {
  const { client, bucket } = getClient();
  try {
    const result = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (!result.Body) return null;
    return {
      body: result.Body.transformToWebStream(),
      contentType: result.ContentType ?? "application/octet-stream",
      contentLength: result.ContentLength ?? undefined,
    };
  } catch (err) {
    const code = (err as { name?: string }).name;
    if (code === "NoSuchKey" || code === "NotFound") return null;
    throw err;
  }
}

export function avatarKey(userId: string): string {
  return `avatars/${userId}`;
}
