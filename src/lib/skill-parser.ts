import fs from 'fs';
import path from 'path';

export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  location: string;
  source: 'workspace' | 'system';
  homepage?: string;
  emoji?: string;
  fileCount: number;
  fullContent: string;
  files: string[];
  agents: string[]; // which agents/workspaces have this skill
}

interface FrontMatter {
  name?: string;
  description?: string;
  homepage?: string;
  metadata?: {
    openclaw?: {
      emoji?: string;
    };
  };
}

interface ConfiguredSkill {
  name: string;
  location: string;
}

interface SkillsConfig {
  systemSkillsPath?: string;
  workspaceSkillsPath?: string;
  skills: ConfiguredSkill[];
}

const CONFIG_PATH = path.join(process.cwd(), 'data', 'configured-skills.json');
const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/root/.openclaw';
const DEFAULT_SYSTEM_PATH = '/usr/lib/node_modules/openclaw/skills';
const DEFAULT_WORKSPACE_PATH = path.join(OPENCLAW_DIR, 'workspace', 'skills');

function resolveSystemSkillsPath(configuredPath?: string): string {
  const candidates = [
    configuredPath,
    process.env.OPENCLAW_SYSTEM_SKILLS_PATH,
    DEFAULT_SYSTEM_PATH,
    '/root/.local/share/pnpm/global/5/.pnpm/openclaw@2026.3.7_@napi-rs+canvas@0.1.96_@types+express@5.0.6_hono@4.12.5_node-llama-cpp@3.16.2/node_modules/openclaw/skills',
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return configuredPath || DEFAULT_SYSTEM_PATH;
}

function resolveWorkspaceSkillsPath(configuredPath?: string): string {
  const candidates = [
    configuredPath,
    process.env.OPENCLAW_WORKSPACE_SKILLS_PATH,
    path.join(OPENCLAW_DIR, 'workspace', 'skills'),
    path.join(OPENCLAW_DIR, 'workspace-infra', 'skills'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return configuredPath || DEFAULT_WORKSPACE_PATH;
}

/**
 * Parse SKILL.md front matter (YAML between --- delimiters)
 */
function parseFrontMatter(content: string): { frontMatter: FrontMatter; body: string } {
  const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  
  if (!frontMatterMatch) {
    return { frontMatter: {}, body: content };
  }

  const yamlContent = frontMatterMatch[1];
  const body = frontMatterMatch[2];
  
  const frontMatter: FrontMatter = {};
  
  const nameMatch = yamlContent.match(/^name:\s*(.+)$/m);
  if (nameMatch) frontMatter.name = nameMatch[1].trim();
  
  const descMatch = yamlContent.match(/^description:\s*(.+)$/m);
  if (descMatch) frontMatter.description = descMatch[1].trim();
  
  const homepageMatch = yamlContent.match(/^homepage:\s*(.+)$/m);
  if (homepageMatch) frontMatter.homepage = homepageMatch[1].trim();
  
  const emojiMatch = yamlContent.match(/"emoji":\s*"([^"]+)"/);
  if (emojiMatch) {
    frontMatter.metadata = { openclaw: { emoji: emojiMatch[1] } };
  }
  
  return { frontMatter, body };
}

/**
 * Extract first paragraph as description if no front matter description
 */
function extractFirstParagraph(body: string): string {
  const lines = body.split('\n');
  let inParagraph = false;
  let paragraph = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('#')) {
      if (inParagraph) break;
      continue;
    }
    
    if (!trimmed && !inParagraph) continue;
    
    if (trimmed && !inParagraph) {
      inParagraph = true;
      paragraph = trimmed;
      continue;
    }
    
    if (trimmed && inParagraph) {
      paragraph += ' ' + trimmed;
      continue;
    }
    
    if (!trimmed && inParagraph) break;
  }
  
  return paragraph || 'No description available';
}

/**
 * Count files in a skill folder (excluding hidden files)
 */
function countFiles(skillPath: string): { count: number; files: string[] } {
  try {
    const files: string[] = [];
    
    function scanDir(dir: string, prefix: string = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          scanDir(path.join(dir, entry.name), relativePath);
        } else {
          files.push(relativePath);
        }
      }
    }
    
    scanDir(skillPath);
    return { count: files.length, files };
  } catch {
    return { count: 0, files: [] };
  }
}

/**
 * Parse a single skill from its directory
 */
export function parseSkill(skillPath: string, skillName: string, agents: string[] = []): SkillInfo | null {
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  
  if (!fs.existsSync(skillMdPath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const { frontMatter, body } = parseFrontMatter(content);
    const { count, files } = countFiles(skillPath);
    
    const source = skillPath.includes('/workspace') ? 'workspace' : 'system';
    
    return {
      id: skillName,
      name: frontMatter.name || skillName,
      description: frontMatter.description || extractFirstParagraph(body),
      location: skillPath,
      source,
      homepage: frontMatter.homepage,
      emoji: frontMatter.metadata?.openclaw?.emoji,
      fileCount: count,
      fullContent: content,
      files,
      agents,
    };
  } catch {
    return null;
  }
}

/**
 * Build a map of skill-name -> [agentId] by scanning all workspace skill dirs
 */
function buildAgentSkillMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const openclawDir = OPENCLAW_DIR;

  // Agent workspaces: workspace, workspace-infra, workspace-social, etc.
  // Read from openclaw.json if possible
  let agentList: Array<{ id: string; workspace: string }> = [];
  try {
    const openclawConfig = JSON.parse(fs.readFileSync(path.join(openclawDir, 'openclaw.json'), 'utf-8'));
    agentList = (openclawConfig?.agents?.list || []).map((a: any) => ({
      id: a.id,
      workspace: a.workspace || path.join(openclawDir, 'workspace'),
    }));
  } catch {
    // Fallback: scan directories
    try {
      const dirs = fs.readdirSync(openclawDir, { withFileTypes: true });
      for (const d of dirs) {
        if (d.isDirectory() && d.name.startsWith('workspace')) {
          const agentId = d.name === 'workspace' ? 'main' : d.name.replace('workspace-', '');
          agentList.push({ id: agentId, workspace: path.join(openclawDir, d.name) });
        }
      }
    } catch {}
  }

  for (const { id, workspace } of agentList) {
    const skillsDir = path.join(workspace, 'skills');
    try {
      if (!fs.existsSync(skillsDir)) continue;
      const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true });
      for (const d of skillDirs) {
        if (d.isDirectory()) {
          const existing = map.get(d.name) || [];
          existing.push(id);
          map.set(d.name, existing);
        }
      }
    } catch {}
  }

  return map;
}

/**
 * Load skills config from config file
 */
function loadSkillsConfig(): SkillsConfig {
  try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { skills: [] };
  }
}

function scanWorkspaceSkills(workspacePath: string, agentSkillMap: Map<string, string[]>): SkillInfo[] {
  const results: SkillInfo[] = [];
  try {
    if (!fs.existsSync(workspacePath)) return results;
    const dirs = fs.readdirSync(workspacePath, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
      const skillPath = path.join(workspacePath, dir.name);
      const skill = parseSkill(skillPath, dir.name, agentSkillMap.get(dir.name) || []);
      if (skill) results.push(skill);
    }
  } catch (error) {
    console.error('Error scanning workspace skills:', error);
  }
  return results;
}

function scanConfiguredSystemSkills(config: SkillsConfig, systemPath: string, agentSkillMap: Map<string, string[]>): SkillInfo[] {
  const results: SkillInfo[] = [];
  for (const { name, location } of config.skills || []) {
    let skillPath: string;
    if (location === 'system') skillPath = path.join(systemPath, name);
    else if (location === 'workspace') continue;
    else skillPath = location;

    if (!fs.existsSync(skillPath)) continue;
    const skill = parseSkill(skillPath, name, agentSkillMap.get(name) || []);
    if (skill) results.push(skill);
  }
  return results;
}

/**
 * Scan workspace skills fully, and configured system skills selectively.
 */
export function scanAllSkills(): SkillInfo[] {
  const map = new Map<string, SkillInfo>();

  try {
    const config = loadSkillsConfig();
    const systemPath = resolveSystemSkillsPath(config.systemSkillsPath);
    const workspacePath = resolveWorkspaceSkillsPath(config.workspaceSkillsPath);
    const agentSkillMap = buildAgentSkillMap();

    const workspaceSkills = scanWorkspaceSkills(workspacePath, agentSkillMap);
    const systemSkills = scanConfiguredSystemSkills(config, systemPath, agentSkillMap);

    for (const skill of [...systemSkills, ...workspaceSkills]) {
      map.set(skill.id, skill);
    }
  } catch (error) {
    console.error('Error scanning skills:', error);
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.source !== b.source) return a.source === 'workspace' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
