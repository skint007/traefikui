"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTemplateFiles, useTemplateFile } from "@/hooks/use-templates";
import { useWriteConfig } from "@/hooks/use-config";
import { extractVariables, applyVariables } from "@/lib/config/template-utils";

interface NewFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (filePath: string) => void;
}

export function NewFromTemplateDialog({
  open,
  onOpenChange,
  onCreated,
}: NewFromTemplateDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});

  const { data: templateFiles } = useTemplateFiles();
  const { data: templateData } = useTemplateFile(selectedTemplate);
  const writeConfig = useWriteConfig();

  // Extract variables when template content loads
  const variableNames = templateData
    ? extractVariables(templateData.content)
    : [];

  // Reset variable values when template changes
  useEffect(() => {
    if (templateData) {
      const names = extractVariables(templateData.content);
      setVariables(
        Object.fromEntries(names.map((name) => [name, variables[name] ?? ""]))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateData]);

  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedTemplate(null);
      setFileName("");
      setVariables({});
      writeConfig.reset();
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateData || !fileName.trim()) return;

    const content = applyVariables(templateData.content, variables);
    const filePath = fileName.trim().match(/\.(yaml|yml)$/)
      ? fileName.trim()
      : `${fileName.trim()}.yaml`;

    writeConfig.mutate(
      { filePath, content },
      {
        onSuccess: () => {
          onCreated?.(filePath);
          handleOpen(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New from Template</DialogTitle>
          <DialogDescription>
            Create a new config file from a template
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select
                value={selectedTemplate ?? ""}
                onValueChange={(v) => setSelectedTemplate(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templateFiles?.map((file) => (
                    <SelectItem key={file} value={file}>
                      {file}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-name">Filename</Label>
              <Input
                id="file-name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. my-service.yaml"
              />
            </div>

            {variableNames.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Template Variables</Label>
                {variableNames.map((name) => (
                  <div key={name} className="space-y-1">
                    <Label htmlFor={`var-${name}`} className="text-xs text-muted-foreground">
                      {`{{${name}}}`}
                    </Label>
                    <Input
                      id={`var-${name}`}
                      value={variables[name] ?? ""}
                      onChange={(e) =>
                        setVariables((prev) => ({
                          ...prev,
                          [name]: e.target.value,
                        }))
                      }
                      placeholder={name}
                    />
                  </div>
                ))}
              </div>
            )}

            {writeConfig.isError && (
              <p className="text-sm text-destructive">
                {writeConfig.error.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !selectedTemplate || !fileName.trim() || writeConfig.isPending
              }
            >
              {writeConfig.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
