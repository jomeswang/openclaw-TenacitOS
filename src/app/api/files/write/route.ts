/**
 * Write file content endpoint
 * POST /api/files/write
 * Body: { workspace, path, content }
 */
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { logActivity } from '@/lib/activities-db';

import { APP_REPO_NAME, APP_REPO_PATH, DEFAULT_WORKSPACE_PATH } from '@/lib/runtime-config';

const WORKSPACE_MAP: Record<string, string> = {
  workspace: DEFAULT_WORKSPACE_PATH,
  [APP_REPO_NAME]: APP_REPO_PATH,
  tenacitos: APP_REPO_PATH,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspace, path: filePath, content } = body;

    if (!filePath || content === undefined) {
      return NextResponse.json({ error: 'Missing path or content' }, { status: 400 });
    }

    const base = WORKSPACE_MAP[workspace || 'workspace'];
    if (!base) {
      return NextResponse.json({ error: 'Unknown workspace' }, { status: 400 });
    }

    const fullPath = path.resolve(base, filePath);
    if (!fullPath.startsWith(base)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Create parent directories if needed
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');

    const stat = await fs.stat(fullPath);

    logActivity('file_write', `Edited file: ${filePath}`, 'success', {
      metadata: { workspace, filePath, size: stat.size },
    });

    return NextResponse.json({ success: true, path: filePath, size: stat.size });
  } catch (error) {
    console.error('[write] Error:', error);
    return NextResponse.json({ error: 'Write failed' }, { status: 500 });
  }
}
