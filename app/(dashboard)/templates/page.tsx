"use client";

import { useState } from "react";
import {
  useTemplateFiles,
  useTemplateFile,
  useWriteTemplate,
  useDeleteTemplate,
  useRenameTemplate,
} from "@/hooks/use-templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { YamlEditor } from "@/components/editors/yaml-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileCode,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import { extractVariables } from "@/lib/config/template-utils";

export default function TemplatesPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [deleteFile, setDeleteFile] = useState<string | null>(null);
  const [renameFile, setRenameFile] = useState<string | null>(null);
  const [renameNewName, setRenameNewName] = useState("");
  const [newFileName, setNewFileName] = useState("");

  const { data: files, isLoading: loadingFiles } = useTemplateFiles();
  const { data: fileData, isLoading: loadingFile } =
    useTemplateFile(selectedFile);
  const writeTemplate = useWriteTemplate();
  const deleteTemplate = useDeleteTemplate();
  const renameTemplate = useRenameTemplate();

  const handleSelectFile = (file: string) => {
    setSelectedFile(file);
    setHasUnsavedChanges(false);
  };

  const handleContentChange = (content: string) => {
    setEditedContent(content);
    setHasUnsavedChanges(content !== fileData?.content);
  };

  const handleSave = () => {
    if (!selectedFile) return;
    writeTemplate.mutate(
      { filePath: selectedFile, content: editedContent },
      { onSuccess: () => setHasUnsavedChanges(false) }
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    const filePath = newFileName.trim().match(/\.(yaml|yml)$/)
      ? newFileName.trim()
      : `${newFileName.trim()}.yaml`;

    const defaultContent = `# Template: ${filePath}\n# Use {{variable_name}} for placeholders\n`;

    writeTemplate.mutate(
      { filePath, content: defaultContent },
      {
        onSuccess: () => {
          setShowNewDialog(false);
          setNewFileName("");
          setSelectedFile(filePath);
          setEditedContent(defaultContent);
          setHasUnsavedChanges(false);
        },
      }
    );
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameFile || !renameNewName.trim()) return;

    const newPath = renameNewName.trim().match(/\.(yaml|yml)$/)
      ? renameNewName.trim()
      : `${renameNewName.trim()}.yaml`;

    renameTemplate.mutate(
      { oldPath: renameFile, newPath },
      {
        onSuccess: () => {
          if (selectedFile === renameFile) {
            setSelectedFile(newPath);
          }
          setRenameFile(null);
          setRenameNewName("");
        },
      }
    );
  };

  const openRenameDialog = (file: string) => {
    setRenameFile(file);
    setRenameNewName(file.replace(/\.(yaml|yml)$/, ""));
  };

  const handleDelete = () => {
    if (!deleteFile) return;
    deleteTemplate.mutate(
      { filePath: deleteFile },
      {
        onSuccess: () => {
          if (selectedFile === deleteFile) {
            setSelectedFile(null);
            setHasUnsavedChanges(false);
          }
          setDeleteFile(null);
        },
      }
    );
  };

  // Sync editor content when file data loads
  if (fileData && editedContent !== fileData.content && !hasUnsavedChanges) {
    setEditedContent(fileData.content);
  }

  const detectedVariables = editedContent
    ? extractVariables(editedContent)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        <p className="text-muted-foreground">
          Manage YAML templates with variable placeholders
        </p>
      </div>

      {selectedFile ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setHasUnsavedChanges(false);
                }}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {selectedFile}
              </code>
              {hasUnsavedChanges && (
                <Badge variant="warning">Unsaved changes</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openRenameDialog(selectedFile)}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Rename
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteFile(selectedFile)}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || writeTemplate.isPending}
              >
                <Save className="mr-1 h-4 w-4" />
                {writeTemplate.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          {detectedVariables.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Detected variables:
                </p>
                <div className="flex flex-wrap gap-2">
                  {detectedVariables.map((v) => (
                    <Badge key={v} variant="secondary">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {writeTemplate.isError && (
            <Card className="border-destructive">
              <CardContent className="pt-4">
                <p className="text-sm text-destructive">
                  {writeTemplate.error.message}
                </p>
              </CardContent>
            </Card>
          )}

          {loadingFile ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Loading template...
                </p>
              </CardContent>
            </Card>
          ) : (
            <YamlEditor
              value={editedContent}
              onChange={handleContentChange}
              height="600px"
            />
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Template Files
              </CardTitle>
              <Button size="sm" onClick={() => setShowNewDialog(true)}>
                <Plus className="mr-1 h-4 w-4" />
                New Template
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingFiles ? (
              <p className="text-sm text-muted-foreground">
                Loading templates...
              </p>
            ) : !files?.length ? (
              <p className="text-sm text-muted-foreground">
                No templates found. Create one to get started.
              </p>
            ) : (
              <div className="space-y-1">
                {files.map((file) => (
                  <div
                    key={file}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted group"
                  >
                    <button
                      onClick={() => handleSelectFile(file)}
                      className="flex items-center gap-3 text-left text-sm flex-1"
                    >
                      <FileCode className="h-4 w-4 text-muted-foreground" />
                      <code>{file}</code>
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openRenameDialog(file)}
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteFile(file)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Template Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Template</DialogTitle>
            <DialogDescription>
              Create a new YAML template file
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-template-name">Template name</Label>
                <Input
                  id="new-template-name"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. web-service.yaml"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!newFileName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog
        open={!!renameFile}
        onOpenChange={(open) => {
          if (!open) {
            setRenameFile(null);
            setRenameNewName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Template</DialogTitle>
            <DialogDescription>
              Rename{" "}
              <code className="text-sm bg-muted px-1 rounded">
                {renameFile}
              </code>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRename}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rename-template-name">New name</Label>
                <Input
                  id="rename-template-name"
                  value={renameNewName}
                  onChange={(e) => setRenameNewName(e.target.value)}
                  placeholder="e.g. web-service"
                />
              </div>
            </div>
            {renameTemplate.isError && (
              <p className="text-sm text-destructive mb-4">
                {renameTemplate.error.message}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRenameFile(null);
                  setRenameNewName("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!renameNewName.trim() || renameTemplate.isPending}>
                {renameTemplate.isPending ? "Renaming..." : "Rename"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteFile} onOpenChange={(open) => !open && setDeleteFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <code className="text-sm bg-muted px-1 rounded">
                {deleteFile}
              </code>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteTemplate.isError && (
            <p className="text-sm text-destructive">
              {deleteTemplate.error.message}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteFile(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
