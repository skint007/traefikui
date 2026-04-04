"use client";

import { useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}

export function YamlEditor({
  value,
  onChange,
  readOnly = false,
  height = "400px",
}: YamlEditorProps) {
  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
    },
    [onChange]
  );

  return (
    <div className="overflow-hidden rounded-md border">
      <CodeMirror
        value={value}
        height={height}
        theme={oneDark}
        extensions={[yaml()]}
        onChange={handleChange}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          autocompletion: false,
        }}
      />
    </div>
  );
}
