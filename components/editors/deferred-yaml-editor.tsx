"use client";

import dynamic from "next/dynamic";

/** Load the editor only when a file opens, leaving list views free of CodeMirror. */
export const DeferredYamlEditor = dynamic(
  () => import("./yaml-editor").then((module) => module.YamlEditor),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        className="rounded-md border p-6 text-sm text-muted-foreground"
      >
        Loading editor...
      </div>
    ),
  }
);
