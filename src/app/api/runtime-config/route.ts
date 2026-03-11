import { NextResponse } from 'next/server';
import { APP_REPO_NAME, OPENCLAW_GATEWAY_SERVICE, LOG_SERVICES, PM2_SERVICES, SYSTEMD_SERVICES } from '@/lib/runtime-config';

export async function GET() {
  return NextResponse.json({
    appRepoName: APP_REPO_NAME,
    gatewayService: OPENCLAW_GATEWAY_SERVICE,
    logServices: LOG_SERVICES,
    systemdServices: SYSTEMD_SERVICES,
    pm2Services: PM2_SERVICES,
  });
}
