"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceFormSchema, type ServiceFormData } from "@/lib/traefik/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface ServiceFormProps {
  defaultValues?: Partial<ServiceFormData>;
  onSubmit: (data: ServiceFormData) => void;
  isPending?: boolean;
}

export function ServiceForm({
  defaultValues,
  onSubmit,
  isPending,
}: ServiceFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      servers: [{ url: "" }],
      passHostHeader: true,
      ...defaultValues,
    },
  });

  const {
    fields: serverFields,
    append: appendServer,
    remove: removeServer,
  } = useFieldArray({ control, name: "servers" });

  const hasHealthCheck = !!watch("healthCheck");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Service Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="my-service" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Backend Servers</Label>
            {serverFields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Input
                  {...register(`servers.${index}.url`)}
                  placeholder="http://backend:8080"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeServer(index)}
                  disabled={serverFields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {errors.servers && (
              <p className="text-xs text-destructive">
                {typeof errors.servers.message === "string"
                  ? errors.servers.message
                  : "Invalid server configuration"}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendServer({ url: "" })}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Server
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Switch {...register("passHostHeader")} />
            <Label>Pass Host Header</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={hasHealthCheck}
              onCheckedChange={(checked) => {
                setValue(
                  "healthCheck",
                  checked
                    ? { path: "/health", interval: "10s", timeout: "3s" }
                    : undefined
                );
              }}
            />
            <Label>Enable Health Check</Label>
          </div>

          {hasHealthCheck && (
            <div className="space-y-3 pl-4 border-l-2">
              <div className="space-y-2">
                <Label htmlFor="hcPath">Path</Label>
                <Input
                  id="hcPath"
                  placeholder="/health"
                  {...register("healthCheck.path")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="hcInterval">Interval</Label>
                  <Input
                    id="hcInterval"
                    placeholder="10s"
                    {...register("healthCheck.interval")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hcTimeout">Timeout</Label>
                  <Input
                    id="hcTimeout"
                    placeholder="3s"
                    {...register("healthCheck.timeout")}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Service"}
      </Button>
    </form>
  );
}
