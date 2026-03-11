import { NextResponse } from 'next/server';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';

const OPENCLAW_CONFIG = path.join(os.homedir(), '.openclaw', 'openclaw.json');

interface ModelOption {
  value: string;
  label: string;
  provider: string;
}

function readConfig() {
  const raw = fs.readFileSync(OPENCLAW_CONFIG, 'utf-8');
  return JSON.parse(raw);
}

function writeConfig(config: unknown) {
  fs.writeFileSync(OPENCLAW_CONFIG, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

function getModelOptions(config: Record<string, any>): ModelOption[] {
  const providers = config?.models?.providers || {};
  const options: ModelOption[] = [];

  for (const [providerKey, provider] of Object.entries<any>(providers)) {
    const models = provider?.models || [];
    for (const model of models) {
      if (!model?.id) continue;
      options.push({
        value: `${providerKey}/${model.id}`,
        label: model.name || model.id,
        provider: providerKey,
      });
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export async function GET() {
  try {
    const config = readConfig();
    const currentModel = config?.agents?.defaults?.model?.primary || '';
    const options = getModelOptions(config);

    return NextResponse.json({
      currentModel,
      options,
      canRestart: true,
    });
  } catch (error) {
    console.error('[model-config] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load model config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { model, restartGateway } = await request.json();

    if (!model || typeof model !== 'string') {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }

    const config = readConfig();
    const options = getModelOptions(config);
    const valid = options.some((item) => item.value === model);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid model selection' }, { status: 400 });
    }

    if (!config.agents) config.agents = {};
    if (!config.agents.defaults) config.agents.defaults = {};
    if (!config.agents.defaults.model) config.agents.defaults.model = {};

    config.agents.defaults.model.primary = model;
    writeConfig(config);

    let restartOutput = '';
    if (restartGateway) {
      restartOutput = execSync('systemctl --user restart openclaw-gateway.service && sleep 2 && openclaw gateway status', {
        encoding: 'utf-8',
        timeout: 30000,
      });
    }

    return NextResponse.json({
      success: true,
      model,
      restarted: !!restartGateway,
      restartOutput,
    });
  } catch (error) {
    console.error('[model-config] POST failed:', error);
    return NextResponse.json({ error: 'Failed to update model config' }, { status: 500 });
  }
}
