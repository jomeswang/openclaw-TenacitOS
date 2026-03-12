'use client';

interface OfficeAgent {
  id: string;
  name: string;
  emoji?: string;
  role?: string;
  color?: string;
  currentTask?: string;
  isActive?: boolean;
}

export default function OfficeFallback({ agents }: { agents: OfficeAgent[] }) {
  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--background)', color: 'var(--text-primary)' }}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Office</h1>
        <p className="text-sm md:text-base mb-6" style={{ color: 'var(--text-secondary)' }}>
          3D 视图当前已降级为稳定卡片视图，方便移动端和异常场景下继续查看。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-2xl p-4 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-2xl mb-2">{agent.emoji || '🤖'}</div>
                  <div className="font-semibold text-lg">{agent.name}</div>
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{agent.role || 'Agent'}</div>
                </div>
                <div
                  className="w-3 h-3 rounded-full mt-1"
                  style={{ background: agent.isActive ? '#22c55e' : '#6b7280' }}
                />
              </div>

              <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                {agent.isActive ? 'Active' : 'Idle'}
              </div>

              <div className="text-sm break-words" style={{ color: 'var(--text-primary)' }}>
                {agent.currentTask || 'No active task'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
