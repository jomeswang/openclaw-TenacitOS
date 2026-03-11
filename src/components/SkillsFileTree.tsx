"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
}

function insertPath(root: TreeNode[], filePath: string) {
  const parts = filePath.split("/");
  let current = root;
  let currentPath = "";

  parts.forEach((part, index) => {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    const isFile = index === parts.length - 1;
    let node = current.find((n) => n.name === part && n.type === (isFile ? "file" : "folder"));

    if (!node) {
      node = {
        name: part,
        path: currentPath,
        type: isFile ? "file" : "folder",
        children: isFile ? undefined : [],
      };
      current.push(node);
      current.sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        if (a.name === "SKILL.md") return -1;
        if (b.name === "SKILL.md") return 1;
        return a.name.localeCompare(b.name);
      });
    }

    if (!isFile) current = node.children!;
  });
}

function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  files.forEach((file) => insertPath(root, file));
  return root;
}

function TreeItem({ node, level = 0 }: { node: TreeNode; level?: number }) {
  const [open, setOpen] = useState(level < 1 || node.name === 'SKILL.md');

  if (node.type === "file") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0 6px 0", marginLeft: `${level * 14}px`, color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
        <File style={{ width: "14px", height: "14px", color: node.name === 'SKILL.md' ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
        <span style={{ color: node.name === 'SKILL.md' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: node.name === 'SKILL.md' ? 700 : 400 }}>{node.name}</span>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", marginLeft: `${level * 14}px`, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "12px" }}
      >
        {open ? <ChevronDown style={{ width: "14px", height: "14px" }} /> : <ChevronRight style={{ width: "14px", height: "14px" }} />}
        <Folder style={{ width: "14px", height: "14px", color: "#eab308", flexShrink: 0 }} />
        <span>{node.name}</span>
      </button>
      {open && node.children?.map((child) => <TreeItem key={child.path} node={child} level={level + 1} />)}
    </div>
  );
}

export default function SkillsFileTree({ files }: { files: string[] }) {
  const tree = useMemo(() => buildTree(files), [files]);

  if (!files.length) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No file list available</div>;
  }

  return (
    <div>
      {tree.map((node) => (
        <TreeItem key={node.path} node={node} />
      ))}
    </div>
  );
}
