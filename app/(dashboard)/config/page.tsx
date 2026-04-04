"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useConfigFiles, useConfigFile, useWriteConfig, useDeleteConfig, useRenameConfig } from "@/hooks/use-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { YamlEditor } from "@/components/editors/yaml-editor";
import { DuplicateConfigDialog } from "@/components/config/duplicate-config-dialog";
import { NewFromTemplateDialog } from "@/components/config/new-from-template-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileCode, Save, ArrowLeft, Copy, FilePlus, Trash2, Pencil } from "lucide-react";

export default function ConfigPage() {
  return (
    <Suspense>
      <ConfigPageContent />
    </Suspense>
  );
}

function ConfigPageContent() {
  const searchParams = useSearchParams();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Open file from URL query param (e.g. /config?file=myconfig.yaml)
  useEffect(() => {
    const file = searchParams.get("file");
    if (file) {
      setSelectedFile(file);
    }
  }, [searchParams]);
  const [editedContent, setEditedContent] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [duplicateFile, setDuplicateFile] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [deleteFile, setDeleteFile] = useState<string | null>(null);
  const [renameFile, setRenameFile] = useState<string | null>(null);
  const [renameNewName, setRenameNewName] = useState("");

  const { data: files, isLoading: loadingFiles } = useConfigFiles();
  const { data: fileData, isLoading: loadingFile } =
    useConfigFile(selectedFile);
  const writeConfig = useWriteConfig();
  const deleteConfig = useDeleteConfig();
  const renameConfig = useRenameConfig();

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
    writeConfig.mutate(
      { filePath: selectedFile, content: editedContent },
      {
        onSuccess: () => {
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

    renameConfig.mutate(
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
    deleteConfig.mutate(
      { filePath: deleteFile },
      {
        onSuccess: () => {
          // If we deleted the currently selected file, go back to the list
          if (selectedFile === deleteFile) {
            setSelectedFile(null);
            setHasUnsavedChanges(false);
          }
          setDeleteFile(null);
        },
      }
    );
  };

  // When file data loads, set the editor content
  if (fileData && editedContent !== fileData.content && !hasUnsavedChanges) {
    setEditedContent(fileData.content);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Config Files</h1>
        <p className="text-muted-foreground">
          Browse and edit Traefik YAML configuration files
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
                variant="outline"
                size="sm"
                onClick={() => setDuplicateFile(selectedFile)}
              >
                <Copy className="mr-1 h-4 w-4" />
                Duplicate
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
                disabled={!hasUnsavedChanges || writeConfig.isPending}
              >
                <Save className="mr-1 h-4 w-4" />
                {writeConfig.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          {writeConfig.isError && (
            <Card className="border-destructive">
              <CardContent className="pt-4">
                <p className="text-sm text-destructive">
                  {writeConfig.error.message}
                </p>
              </CardContent>
            </Card>
          )}

          {loadingFile ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Loading file...</p>
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
                Configuration Files
              </CardTitle>
              <Button size="sm" onClick={() => setShowTemplateDialog(true)}>
                <FilePlus className="mr-1 h-4 w-4" />
                New from Template
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingFiles ? (
              <p className="text-sm text-muted-foreground">
                Loading config files...
              </p>
            ) : !files?.length ? (
              <p className="text-sm text-muted-foreground">
                No configuration files found in config directory
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
                        className="h-8 w-8"
                        onClick={() => setDuplicateFile(file)}
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
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

      {duplicateFile && (
        <DuplicateConfigDialog
          open={!!duplicateFile}
          onOpenChange={(open) => !open && setDuplicateFile(null)}
          sourceFile={duplicateFile}
        />
      )}

      <NewFromTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        onCreated={(filePath) => handleSelectFile(filePath)}
      />

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
            <DialogTitle>Rename Config File</DialogTitle>
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
                <Label htmlFor="rename-config-name">New name</Label>
                <Input
                  id="rename-config-name"
                  value={renameNewName}
                  onChange={(e) => setRenameNewName(e.target.value)}
                  placeholder="e.g. my-service"
                />
              </div>
            </div>
            {renameConfig.isError && (
              <p className="text-sm text-destructive mb-4">
                {renameConfig.error.message}
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
              <Button type="submit" disabled={!renameNewName.trim() || renameConfig.isPending}>
                {renameConfig.isPending ? "Renaming..." : "Rename"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteFile} onOpenChange={(open) => !open && setDeleteFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Config File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <code className="text-sm bg-muted px-1 rounded">{deleteFile}</code>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteConfig.isError && (
            <p className="text-sm text-destructive">
              {deleteConfig.error.message}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFile(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfig.isPending}
            >
              {deleteConfig.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
