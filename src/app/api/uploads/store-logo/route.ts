// ─── Store Logo Upload Endpoint ───
// Accepts an image file (JPEG/PNG/WEBP, max 2 MB), validates it, persists it
// under public/uploads/stores/[storeId]/, and returns the public URL that can
// be saved on StoreBranding.logoUrl.
//
// Persistence note: this route writes to the local filesystem. Render.com free
// and web-service plans do NOT persist files across deploys. For production
// Render deployments, replace the writeFile block below with a Cloudinary/S3
// upload. The public contract (POST multipart -> { url }) stays identical.

import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { getCurrentStore } from "@/lib/auth/session";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
  const store = await getCurrentStore();
  if (!store) {
    return errorResponse(401, "unauthenticated", "Iniciá sesión para subir el logo.");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(400, "invalid_body", "El cuerpo del request no es multipart/form-data válido.");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse(400, "missing_file", "Falta el archivo (campo 'file').");
  }

  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    return errorResponse(415, "unsupported_type", "Solo se aceptan imágenes JPEG, PNG o WEBP.");
  }

  if (file.size > MAX_BYTES) {
    return errorResponse(413, "file_too_large", "El archivo supera el máximo de 2 MB.");
  }
  if (file.size === 0) {
    return errorResponse(400, "empty_file", "El archivo está vacío.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Tenant-scoped directory, random filename to avoid collisions and caching issues.
  const storeDir = join(process.cwd(), "public", "uploads", "stores", store.id);
  const fileName = `logo-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const absolutePath = join(storeDir, fileName);

  try {
    await mkdir(storeDir, { recursive: true });
    await writeFile(absolutePath, buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return errorResponse(
      500,
      "storage_failure",
      `No se pudo guardar el archivo. Revisá permisos o la configuración de storage externo. (${msg})`,
    );
  }

  const publicUrl = `/uploads/stores/${store.id}/${fileName}`;
  return NextResponse.json({ url: publicUrl, fileName, size: file.size, mime: file.type });
}
