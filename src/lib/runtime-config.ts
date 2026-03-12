import path from 'path';
import { OPENCLAW_DIR, OPENCLAW_WORKSPACE } from './paths';

function splitEnv(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export const APP_REPO_NAME = process.env.TENACITOS_APP_REPO_NAME || 'tenacitOS';
export const APP_REPO_PATH = process.env.TENACITOS_APP_REPO_PATH || process.cwd();
export const OPENCLAW_GATEWAY_SERVICE = process.env.OPENCLAW_GATEWAY_SERVICE || 'openclaw-gateway';

export const SYSTEMD_SERVICES = splitEnv('TENACITOS_SYSTEMD_SERVICES', [APP_REPO_NAME, OPENCLAW_GATEWAY_SERVICE, 'nginx']);
export const PM2_SERVICES = splitEnv('TENACITOS_PM2_SERVICES', []);

export const LOG_SERVICES = [
  ...SYSTEMD_SERVICES.map((name) => ({ name, backend: 'systemd' as const, label: name })),
  ...PM2_SERVICES.map((name) => ({ name, backend: 'pm2' as const, label: name })),
];

export const DEFAULT_WORKSPACE_PATH = OPENCLAW_WORKSPACE || path.join(OPENCLAW_DIR, 'workspace');
export const PM2_LOG_DIR = process.env.PM2_LOG_DIR || '/root/.pm2/logs';
