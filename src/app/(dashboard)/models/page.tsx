"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, RefreshCw, Save, RotateCcw } from "lucide-react";

interface ModelOption {
  value: string;
  label: string;
  provider: string;
}

interface ModelConfigResponse {
  currentModel: string;
  options: ModelOption[];
  canRestart: boolean;
}

export default function ModelsPage() {
  const [data, setData] = useState<ModelConfigResponse | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups = new Map<string, ModelOption[]>();
    for (const item of data?.options || []) {
      const arr = groups.get(item.provider) || [];
      arr.push(item);
      groups.set(item.provider, arr);
    }
    return Array.from(groups.entries());
  }, [data]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/model-config");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load models");
      setData(json);
      setSelectedModel(json.currentModel || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load models");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (restartGateway: boolean) => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/model-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, restartGateway }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save model");
      setMessage(restartGateway ? "模型已更新，并已重启 Gateway" : "模型已更新");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save model");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            <Bot className="w-7 h-7" style={{ color: "var(--accent)" }} />
            Model Switcher
          </h1>
          <p className="text-sm md:text-base" style={{ color: "var(--text-secondary)" }}>
            选择 OpenClaw 当前激活的默认模型，并可在保存后重启 Gateway。
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading || saving}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg w-full md:w-auto"
          style={{
            backgroundColor: "var(--card)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac" }}>
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      <div className="mb-6 p-4 md:p-5 rounded-2xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>当前默认模型</div>
        <div className="text-base md:text-lg font-semibold break-all" style={{ color: "var(--text-primary)" }}>
          {data?.currentModel || "—"}
        </div>
      </div>

      <div className="space-y-5">
        {loading ? (
          <div className="p-6 rounded-2xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            正在加载模型列表...
          </div>
        ) : (
          grouped.map(([provider, models]) => (
            <section key={provider} className="p-4 md:p-5 rounded-2xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{provider}</h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{models.length} 个可选模型</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {models.map((model) => {
                  const active = selectedModel === model.value;
                  return (
                    <button
                      key={model.value}
                      onClick={() => setSelectedModel(model.value)}
                      className="text-left p-4 rounded-xl transition-all"
                      style={{
                        border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                        background: active ? "rgba(168,85,247,0.12)" : "var(--surface)",
                        minHeight: "92px",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold break-words" style={{ color: "var(--text-primary)" }}>{model.label}</div>
                          <div className="text-xs mt-2 break-all" style={{ color: "var(--text-muted)" }}>{model.value}</div>
                        </div>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 999,
                            border: active ? "5px solid var(--accent)" : "2px solid var(--border)",
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => save(false)}
          disabled={saving || loading || !selectedModel}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl w-full sm:w-auto disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "white" }}
        >
          <Save className="w-4 h-4" />
          保存模型
        </button>

        <button
          onClick={() => save(true)}
          disabled={saving || loading || !selectedModel}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl w-full sm:w-auto disabled:opacity-50"
          style={{ backgroundColor: "var(--card)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
        >
          <RotateCcw className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
          保存并重启 Gateway
        </button>
      </div>
    </div>
  );
}
