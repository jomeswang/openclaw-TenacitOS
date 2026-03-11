import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { scanAllSkills } from '@/lib/skill-parser';

function countFiles(skillPath: string): { count: number; files: string[] } {
  const files: string[] = [];
  function walk(dir: string, prefix = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, rel);
      else files.push(rel);
    }
  }
  walk(skillPath);
  return { count: files.length, files };
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const skills = scanAllSkills();
  const skill = skills.find((s) => s.id === id || s.name === id);
  if (!skill || !skill.location || !fs.existsSync(skill.location)) {
    return NextResponse.json({ error: 'skill not found' }, { status: 404 });
  }

  const skillMd = path.join(skill.location, 'SKILL.md');
  const fullContent = fs.existsSync(skillMd) ? fs.readFileSync(skillMd, 'utf-8') : '';
  const { count, files } = countFiles(skill.location);

  return NextResponse.json({
    ...skill,
    fileCount: count,
    files,
    fullContent,
  });
}
