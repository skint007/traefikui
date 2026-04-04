"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDuplicateConfig } from "@/hooks/use-templates";

interface DuplicateConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceFile: string;
}

export function DuplicateConfigDialog({
  open,
  onOpenChange,
  sourceFile,
}: DuplicateConfigDialogProps) {
  const [destPath, setDestPath] = useState("");
  const duplicate = useDuplicateConfig();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      // Pre-fill with source filename plus "-copy"
      const ext = sourceFile.endsWith(".yml") ? ".yml" : ".yaml";
      const base = sourceFile.replace(/\.(yaml|yml)$/, "");
      setDestPath(`${base}-copy${ext}`);
    }
    duplicate.reset();
    onOpenChange(isOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destPath.trim()) return;

    duplicate.mutate(
      { sourcePath: sourceFile, destPath: destPath.trim() },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Config File</DialogTitle>
          <DialogDescription>
            Create a copy of <code className="text-sm bg-muted px-1 rounded">{sourceFile}</code>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dest-path">New filename</Label>
              <Input
                id="dest-path"
                value={destPath}
                onChange={(e) => setDestPath(e.target.value)}
                placeholder="e.g. my-service.yaml"
              />
            </div>
            {duplicate.isError && (
              <p className="text-sm text-destructive">
                {duplicate.error.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!destPath.trim() || duplicate.isPending}>
              {duplicate.isPending ? "Duplicating..." : "Duplicate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
