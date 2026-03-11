/**
 * Real-time log streaming via SSE
 * GET /api/logs/stream?service=<name>&backend=<pm2|systemd|file>
 */
import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { OPENCLAW_GATEWAY_SERVICE, PM2_SERVICES, SYSTEMD_SERVICES } from '@/lib/runtime-config';

const ALLOWED_SERVICES = [...new Set([...SYSTEMD_SERVICES, ...PM2_SERVICES, OPENCLAW_GATEWAY_SERVICE])];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service') || SYSTEMD_SERVICES[0] || OPENCLAW_GATEWAY_SERVICE;
  const backend = searchParams.get('backend') || 'systemd';

  if (!ALLOWED_SERVICES.includes(service)) {
    return new Response('Service not allowed', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ line: data, ts: new Date().toISOString() })}\n\n`));
        } catch {}
      };

      send(`[stream] Connected to ${service} (${backend})`);

      let cmd: string[];
      if (backend === 'pm2') {
        cmd = ['bash', '-lc', `command -v pm2 >/dev/null && pm2 logs ${service} --lines 50 --nocolor || echo "pm2 not available"`];
      } else {
        const unit = service.endsWith('.service') ? service : `${service}.service`;
        cmd = ['bash', '-lc', `journalctl --user -u ${unit} -n 50 --no-pager -f 2>&1 || journalctl -u ${unit} -n 50 --no-pager -f 2>&1`];
      }

      const proc = spawn(cmd[0], cmd.slice(1), { stdio: ['ignore', 'pipe', 'pipe'] });

      proc.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          send(line);
        }
      });

      proc.stderr.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          send(line);
        }
      });

      proc.on('error', (err) => {
        send(`[error] ${err.message}`);
        try { controller.close(); } catch {}
      });

      proc.on('close', () => {
        send('[stream] Process ended');
        try { controller.close(); } catch {}
      });

      // Cleanup on disconnect
      request.signal?.addEventListener('abort', () => {
        proc.kill();
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
