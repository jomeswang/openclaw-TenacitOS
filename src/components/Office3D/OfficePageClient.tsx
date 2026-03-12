'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import OfficeFallback from './OfficeFallback';

const Office3D = dynamic(() => import('./Office3D'), { ssr: false });

interface OfficeAgent {
  id: string;
  name: string;
  emoji?: string;
  role?: string;
  color?: string;
  currentTask?: string;
  isActive?: boolean;
}

class OfficeErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[office] 3D render failed:', error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default function OfficePageClient() {
  const [agents, setAgents] = useState<OfficeAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [forceFallback, setForceFallback] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/office')
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        setAgents(Array.isArray(json?.agents) ? json.agents : []);
      })
      .catch((err) => {
        console.error('[office] failed to load agents:', err);
        setForceFallback(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)', color: 'var(--text-primary)' }}>Loading office...</div>;
  }

  if (forceFallback || agents.length === 0) {
    return <OfficeFallback agents={agents} />;
  }

  return (
    <OfficeErrorBoundary fallback={<OfficeFallback agents={agents} />}>
      <Office3D externalAgents={agents} />
    </OfficeErrorBoundary>
  );
}
