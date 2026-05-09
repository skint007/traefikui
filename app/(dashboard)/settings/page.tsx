"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useServers,
  useCreateServer,
  useUpdateServer,
  useDeleteServer,
  useServerHealth,
  useLocalInstanceName,
  useUpdateLocalInstanceName,
} from "@/hooks/use-servers";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Server,
  Plus,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
  CircleHelp,
  ShieldCheck,
  Monitor,
  Users,
  ShieldEllipsis,
  ShieldOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppUser {
  id: string;
  name: string;
  email: string;
  createdAt: number;
  twoFactorEnabled: boolean | null;
  role: "admin" | "user";
}

interface ServerFormData {
  name: string;
  url: string;
  apiKey: string; // Only sent when creating or changing the key
  isDefault: boolean;
}

const emptyForm: ServerFormData = {
  name: "",
  url: "",
  apiKey: "",
  isDefault: false,
};

export default function SettingsPage() {
  const { data: servers, isLoading } = useServers();
  const createServer = useCreateServer();
  const updateServer = useUpdateServer();
  const deleteServer = useDeleteServer();
  const { data: session } = useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServerFormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(true);

  const queryClient = useQueryClient();
  const { data: users, isLoading: loadingUsers } = useQuery<AppUser[]>({
    queryKey: ["settings", "users"],
    queryFn: async () => {
      const res = await fetch("/api/settings/users");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "admin" | "user" }) => {
      const res = await fetch(`/api/settings/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update role");
      }
      return res.json() as Promise<{ id: string; role: "admin" | "user" }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "users"] });
    },
  });

  const adminCount = users?.filter((u) => u.role === "admin").length ?? 0;

  const { data: localName } = useLocalInstanceName();
  const updateLocalName = useUpdateLocalInstanceName();
  const [editingLocalName, setEditingLocalName] = useState(false);
  const [localNameDraft, setLocalNameDraft] = useState("");

  useEffect(() => {
    fetch("/api/settings/registration")
      .then((res) => res.json())
      .then((data) => setRegistrationEnabled(data.enabled))
      .catch(() => {})
      .finally(() => setRegistrationLoading(false));
  }, []);

  const handleLocalNameSave = () => {
    const name = localNameDraft.trim() || "Local Instance";
    setEditingLocalName(false);
    updateLocalName.mutate(name);
  };

  const handleRegistrationToggle = async (enabled: boolean) => {
    setRegistrationEnabled(enabled);
    try {
      const res = await fetch("/api/settings/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        setRegistrationEnabled(!enabled);
      }
    } catch {
      setRegistrationEnabled(!enabled);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const handleOpenEdit = (srv: {
    id: string;
    name: string;
    url: string;
    isDefault: boolean;
  }) => {
    setEditingId(srv.id);
    setFormData({
      name: srv.name,
      url: srv.url,
      apiKey: "", // API key is masked server-side — leave empty unless changing
      isDefault: srv.isDefault,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      const { apiKey, ...rest } = formData;
      const payload = apiKey.trim()
        ? { id: editingId, ...formData }
        : { id: editingId, ...rest }; // omit apiKey if unchanged
      updateServer.mutate(payload, {
        onSuccess: () => setShowForm(false),
      });
    } else {
      createServer.mutate(formData, {
        onSuccess: () => setShowForm(false),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteServer.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  };

  const mutationError = editingId
    ? updateServer.error
    : createServer.error;
  const isPending = editingId
    ? updateServer.isPending
    : createServer.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage remote Traefik server connections
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>
            Control user registration and access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>User Registration</Label>
              <p className="text-sm text-muted-foreground">
                Allow new users to create accounts. Automatically disabled after
                the first user registers.
              </p>
            </div>
            <Switch
              checked={registrationEnabled ?? false}
              onCheckedChange={handleRegistrationToggle}
              disabled={registrationLoading || registrationEnabled === null}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registered Users
          </CardTitle>
          <CardDescription>
            Users with access to this TraefikUI instance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {updateRole.error && (
            <p className="mb-3 text-sm text-destructive">
              {updateRole.error.message}
            </p>
          )}
          {loadingUsers ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : !users?.length ? (
            <p className="text-sm text-muted-foreground">No registered users</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const isLastAdmin = u.role === "admin" && adminCount <= 1;
                const targetRole = u.role === "admin" ? "user" : "admin";
                const canChange = isAdmin && !isLastAdmin;
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium">{u.name}</span>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={u.role === "admin" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {u.role === "admin" ? "Admin" : "User"}
                      </Badge>
                      {u.twoFactorEnabled && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <ShieldEllipsis className="h-3 w-3" />
                          2FA
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Joined {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          disabled={!canChange || updateRole.isPending}
                          title={
                            isLastAdmin
                              ? "Promote another user before demoting the last admin"
                              : undefined
                          }
                          onClick={() =>
                            updateRole.mutate({ id: u.id, role: targetRole })
                          }
                        >
                          {u.role === "admin" ? (
                            <>
                              <ShieldOff className="mr-1 h-3.5 w-3.5" />
                              Revoke admin
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                              Make admin
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Servers
            </CardTitle>
            {isAdmin && (
              <Button size="sm" onClick={handleOpenCreate}>
                <Plus className="mr-1 h-4 w-4" />
                Add Server
              </Button>
            )}
          </div>
          <CardDescription>
            {isAdmin
              ? "Shared list — visible to all users. Only admins can add, edit, or remove servers."
              : "Shared list — visible to all users. Contact an admin to make changes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Local instance — always shown */}
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-green-500" />
                <div>
                  <div className="flex items-center gap-2">
                    {editingLocalName ? (
                      <form
                        className="flex items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleLocalNameSave();
                        }}
                      >
                        <Input
                          className="h-7 w-48 text-sm"
                          value={localNameDraft}
                          onChange={(e) => setLocalNameDraft(e.target.value)}
                          autoFocus
                          onBlur={handleLocalNameSave}
                        />
                      </form>
                    ) : (
                      <>
                        <span className="font-medium">{localName ?? "Local Instance"}</span>
                        <Badge variant="secondary" className="text-xs">
                          Built-in
                        </Badge>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {process.env.NEXT_PUBLIC_APP_URL || "Direct connection via TRAEFIK_API_URL"}
                  </p>
                </div>
              </div>
              {!editingLocalName && isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setLocalNameDraft(localName ?? "Local Instance");
                    setEditingLocalName(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading servers...</p>
            ) : (
              servers?.map((srv) => (
                <ServerRow
                  key={srv.id}
                  server={srv}
                  isTesting={testingId === srv.id}
                  onTest={() => setTestingId(srv.id)}
                  onTestDone={() => setTestingId(null)}
                  onEdit={isAdmin ? () => handleOpenEdit(srv) : undefined}
                  onDelete={isAdmin ? () => setDeleteId(srv.id) : undefined}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Server Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Server" : "Add Server"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the server connection details"
                : "Connect to a remote TraefikUI agent"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="server-name">Name</Label>
                <Input
                  id="server-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Production Server"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="server-url">URL</Label>
                <Input
                  id="server-url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, url: e.target.value }))
                  }
                  placeholder="e.g. https://agent.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="server-api-key">API Key</Label>
                <Input
                  id="server-api-key"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, apiKey: e.target.value }))
                  }
                  placeholder={editingId ? "Leave empty to keep current key" : "Agent API key"}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="server-default"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) =>
                    setFormData((f) => ({ ...f, isDefault: checked }))
                  }
                />
                <Label htmlFor="server-default">Set as default server</Label>
              </div>
              {mutationError && (
                <p className="text-sm text-destructive">
                  {mutationError.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !formData.name.trim() ||
                  !formData.url.trim() ||
                  (!editingId && !formData.apiKey.trim()) ||
                  isPending
                }
              >
                {isPending ? "Saving..." : editingId ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Server</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this server connection? This will
              not affect the remote server itself.
            </DialogDescription>
          </DialogHeader>
          {deleteServer.isError && (
            <p className="text-sm text-destructive">
              {deleteServer.error.message}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteServer.isPending}
            >
              {deleteServer.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ServerRow({
  server,
  isTesting,
  onTest,
  onTestDone,
  onEdit,
  onDelete,
}: {
  server: {
    id: string;
    name: string;
    url: string;
    status: string;
    isDefault: boolean;
    lastSeen: string | null;
  };
  isTesting: boolean;
  onTest: () => void;
  onTestDone: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div className="flex items-center gap-3">
        <StatusIcon status={server.status} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{server.name}</span>
            {server.isDefault && (
              <Badge variant="secondary" className="text-xs">
                Default
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{server.url}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <TestConnectionButton
          serverId={server.id}
          isTesting={isTesting}
          onTest={onTest}
          onDone={onTestDone}
        />
        {onEdit && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function TestConnectionButton({
  serverId,
  isTesting,
  onTest,
  onDone,
}: {
  serverId: string;
  isTesting: boolean;
  onTest: () => void;
  onDone: () => void;
}) {
  const { data, isLoading, refetch } = useServerHealth(
    isTesting ? serverId : null
  );

  const handleClick = async () => {
    onTest();
    await refetch();
    setTimeout(onDone, 3000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 text-xs"
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        "Testing..."
      ) : isTesting && data ? (
        data.ok ? (
          <span className="text-green-600">Connected</span>
        ) : (
          <span className="text-red-600">Failed</span>
        )
      ) : (
        "Test"
      )}
    </Button>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "online") return <Wifi className="h-4 w-4 text-green-500" />;
  if (status === "offline") return <WifiOff className="h-4 w-4 text-red-500" />;
  return <CircleHelp className={cn("h-4 w-4 text-yellow-500")} />;
}
