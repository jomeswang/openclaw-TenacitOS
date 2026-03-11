import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { scanAllSkills } from '@/lib/skill-parser';

function listSkillsViaCli() {
  const output = execSync('openclaw skills list --json', {
    encoding: 'utf-8',
    timeout: 15000,
  });

  const parsed = JSON.parse(output);
  const rawSkills = Array.isArray(parsed) ? parsed : parsed.skills || [];

  return rawSkills.map((skill: any) => ({
    id: skill.id || skill.name,
    name: skill.name || skill.id,
    description: skill.description || '',
    location: skill.location || skill.path || '',
    source: skill.source === 'openclaw-bundled' || skill.source === 'openclaw-extra' ? 'system' : (skill.source || 'system'),
    homepage: skill.homepage,
    emoji: skill.emoji,
    fileCount: 0,
    fullContent: '',
    files: [],
    agents: skill.agents || [],
    status: skill.status,
    ready: skill.status ? skill.status.includes('ready') : undefined,
  }));
}

function mergeSkills(cliSkills: any[], fileSkills: any[]) {
  const map = new Map<string, any>();

  for (const skill of cliSkills) {
    map.set(skill.id || skill.name, skill);
  }

  for (const skill of fileSkills) {
    const key = skill.id || skill.name;
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        ...skill,
        description: skill.description || existing.description,
        location: skill.location || existing.location,
        homepage: skill.homepage || existing.homepage,
        emoji: skill.emoji || existing.emoji,
        fileCount: skill.fileCount || existing.fileCount || 0,
        files: skill.files?.length ? skill.files : (existing.files || []),
        fullContent: skill.fullContent || existing.fullContent || '',
        agents: skill.agents?.length ? skill.agents : (existing.agents || []),
      });
    } else {
      map.set(key, skill);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.source !== b.source) {
      return a.source === 'workspace' ? -1 : 1;
    }
    return (a.name || '').localeCompare(b.name || '');
  });
}

export async function GET() {
  try {
    let cliSkills: any[] = [];
    try {
      cliSkills = listSkillsViaCli();
    } catch (cliError) {
      console.warn('Failed to list skills via openclaw CLI:', cliError);
    }

    const fileSkills = scanAllSkills();
    const skills = mergeSkills(cliSkills, fileSkills);

    return NextResponse.json({
      skills,
      source: cliSkills.length > 0 ? 'merged-openclaw-cli+filesystem' : 'filesystem-fallback',
    });
  } catch (error) {
    console.error('Failed to scan skills:', error);
    return NextResponse.json({ skills: [] }, { status: 500 });
  }
}
