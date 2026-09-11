// ============================================================
// POST /api/media/upload — Multipart media file upload
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';
import { getAuthUser } from '@/lib/platform/platform-auth';
import { getSiteFromRequest } from '@/lib/site-context';

function reqId() {
  return 'req_' + nanoid(8);
}

const mediaIncludes = {
  folder: { select: { id: true, name: true, parentId: true } },
  uploadedBy: { select: { id: true, name: true, email: true, avatar: true } },
} as const;

export async function POST(request: NextRequest) {
  const id = reqId();

  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formErr) {
      console.error(`[MEDIA:UPLOAD] ${id} — Failed to parse formData:`, formErr);
      return NextResponse.json(
        { error: { code: 'INVALID_FORM_DATA', message: 'Request must be multipart/form-data' }, meta: { requestId: id } },
        { status: 400 },
      );
    }

    // Collect all files from 'file' and 'files' fields
    const rawFiles = [
      ...formData.getAll('file'),
      ...formData.getAll('files'),
    ];
    const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) {
      return NextResponse.json(
        { error: { code: 'NO_FILE', message: 'No valid file provided for upload' }, meta: { requestId: id } },
        { status: 400 },
      );
    }

    // Resolve uploader ID
    const authUser = await getAuthUser(request);
    const formUploaderId = formData.get('uploadedById') as string | null;
    let uploaderId = formUploaderId && formUploaderId !== 'system' ? formUploaderId : authUser?.id;

    if (!uploaderId) {
      const fallbackUser = await db.user.findFirst({ select: { id: true } });
      uploaderId = fallbackUser?.id || 'system';
    }

    // Resolve site ID and folder ID
    let siteId = await getSiteFromRequest(request);
    if (!siteId && authUser) {
      const { getActivePlanSiteId } = await import('@/lib/site-context');
      siteId = await getActivePlanSiteId(authUser);
    }
    const formFolderId = formData.get('folderId') as string | null;
    let folderId: string | null = null;
    if (formFolderId && formFolderId !== '' && formFolderId !== 'null' && formFolderId !== 'root') {
      const existingFolder = await db.mediaFolder.findUnique({ where: { id: formFolderId } });
      if (existingFolder) folderId = existingFolder.id;
    }

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const createdItems = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || '';
      const baseClean = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'file';
      const uniqueFilename = `${Date.now()}_${nanoid(6)}_${baseClean}${ext}`;
      const filePath = path.join(uploadDir, uniqueFilename);

      await fs.promises.writeFile(filePath, buffer);

      let width: number | null = null;
      let height: number | null = null;
      if (file.type.startsWith('image/')) {
        try {
          const meta = await sharp(buffer).metadata();
          width = meta.width ?? null;
          height = meta.height ?? null;
        } catch {
          // Sharp metadata extraction is best-effort (e.g., SVGs or specific formats)
        }
      }

      const fileUrl = `/uploads/${uniqueFilename}`;

      const item = await db.media.create({
        data: {
          filename: uniqueFilename,
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          width,
          height,
          url: fileUrl,
          thumbnailUrl: file.type.startsWith('image/') ? fileUrl : null,
          folderId,
          siteId: siteId || undefined,
          uploadedById: uploaderId,
          processingStatus: 'READY',
        },
        include: mediaIncludes,
      });

      createdItems.push(item);
    }

    return NextResponse.json(
      {
        data: createdItems.length === 1 ? createdItems[0] : createdItems,
        meta: { requestId: id, count: createdItems.length },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(`[MEDIA:UPLOAD] ${id} — Internal error:`, error);
    const msg = error instanceof Error ? error.message : 'Failed to upload media';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: msg }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}
