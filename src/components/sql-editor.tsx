"use client";

import { useTheme } from "next-themes";
import Editor, { useMonaco } from "@monaco-editor/react";
import { useEffect, useState } from "react";

interface SqlEditorProps {
  value: string;
  onChange: (val: string) => void;
  readOnly?: boolean;
}

export function SqlEditor({ value, onChange, readOnly = false }: SqlEditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const monaco = useMonaco();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-full w-full bg-muted animate-pulse rounded-md border" />;
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-md border bg-background">
      <Editor
        height="100%"
        defaultLanguage="sql"
        value={value}
        onChange={(val) => onChange(val || "")}
        theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: "on",
          readOnly,
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
