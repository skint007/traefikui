"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  middlewareFormSchema,
  type MiddlewareFormData,
} from "@/lib/traefik/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MiddlewareFormProps {
  defaultValues?: Partial<MiddlewareFormData>;
  onSubmit: (data: MiddlewareFormData) => void;
  isPending?: boolean;
}

const middlewareTypes = [
  { value: "headers", label: "Security Headers" },
  { value: "ipAllowList", label: "IP Allow List" },
  { value: "redirectScheme", label: "Redirect Scheme" },
  { value: "stripPrefix", label: "Strip Prefix" },
  { value: "addPrefix", label: "Add Prefix" },
  { value: "rateLimit", label: "Rate Limit" },
  { value: "compress", label: "Compress" },
  { value: "chain", label: "Chain" },
] as const;

export function MiddlewareForm({
  defaultValues,
  onSubmit,
  isPending,
}: MiddlewareFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MiddlewareFormData>({
    resolver: zodResolver(middlewareFormSchema),
    defaultValues: {
      name: "",
      type: "headers",
      ...defaultValues,
    },
  });

  const selectedType = watch("type");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Middleware Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="my-middleware"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={selectedType}
              onValueChange={(value) =>
                setValue("type", value as MiddlewareFormData["type"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {middlewareTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedType === "headers" && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <Switch {...register("headers.frameDeny")} />
                <Label>Frame Deny (X-Frame-Options: DENY)</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch {...register("headers.contentTypeNosniff")} />
                <Label>Content Type Nosniff</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch {...register("headers.browserXssFilter")} />
                <Label>Browser XSS Filter</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch {...register("headers.forceSTSHeader")} />
                <Label>Force STS Header</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch {...register("headers.stsIncludeSubdomains")} />
                <Label>STS Include Subdomains</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch {...register("headers.stsPreload")} />
                <Label>STS Preload</Label>
              </div>
              <div className="space-y-2">
                <Label>STS Seconds</Label>
                <Input
                  type="number"
                  {...register("headers.stsSeconds", { valueAsNumber: true })}
                  placeholder="31536000"
                />
              </div>
              <div className="space-y-2">
                <Label>Referrer Policy</Label>
                <Input
                  {...register("headers.referrerPolicy")}
                  placeholder="strict-origin-when-cross-origin"
                />
              </div>
              <div className="space-y-2">
                <Label>Content Security Policy</Label>
                <Input
                  {...register("headers.contentSecurityPolicy")}
                  placeholder="default-src 'self'"
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions Policy</Label>
                <Input
                  {...register("headers.permissionsPolicy")}
                  placeholder="camera=(), microphone=()"
                />
              </div>
            </div>
          )}

          {selectedType === "ipAllowList" && (
            <div className="space-y-2 pt-2">
              <Label>Source Ranges (one per line)</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder={"192.168.1.0/24\n10.0.0.0/8"}
                onChange={(e) => {
                  const ranges = e.target.value
                    .split("\n")
                    .filter((r) => r.trim());
                  setValue("ipAllowList.sourceRange", ranges);
                }}
              />
            </div>
          )}

          {selectedType === "redirectScheme" && (
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label>Scheme</Label>
                <Input
                  {...register("redirectScheme.scheme")}
                  placeholder="https"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch {...register("redirectScheme.permanent")} />
                <Label>Permanent (301)</Label>
              </div>
            </div>
          )}

          {selectedType === "stripPrefix" && (
            <div className="space-y-2 pt-2">
              <Label>Prefixes (one per line)</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="/api"
                onChange={(e) => {
                  const prefixes = e.target.value
                    .split("\n")
                    .filter((p) => p.trim());
                  setValue("stripPrefix.prefixes", prefixes);
                }}
              />
            </div>
          )}

          {selectedType === "addPrefix" && (
            <div className="space-y-2 pt-2">
              <Label>Prefix</Label>
              <Input
                {...register("addPrefix.prefix")}
                placeholder="/api"
              />
            </div>
          )}

          {selectedType === "rateLimit" && (
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label>Average (requests)</Label>
                <Input
                  type="number"
                  {...register("rateLimit.average", { valueAsNumber: true })}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Burst</Label>
                <Input
                  type="number"
                  {...register("rateLimit.burst", { valueAsNumber: true })}
                  placeholder="50"
                />
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <Input
                  {...register("rateLimit.period")}
                  placeholder="1s"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Middleware"}
      </Button>
    </form>
  );
}
