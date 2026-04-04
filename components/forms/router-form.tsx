"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { routerFormSchema, type RouterFormData } from "@/lib/traefik/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface RouterFormProps {
  defaultValues?: Partial<RouterFormData>;
  onSubmit: (data: RouterFormData) => void;
  isPending?: boolean;
}

export function RouterForm({
  defaultValues,
  onSubmit,
  isPending,
}: RouterFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RouterFormData>({
    resolver: zodResolver(routerFormSchema),
    defaultValues: {
      name: "",
      rule: "",
      entryPoints: ["websecure"],
      service: "",
      middlewares: [],
      ...defaultValues,
    },
  });

  const {
    fields: entryPointFields,
    append: appendEntryPoint,
    remove: removeEntryPoint,
  } = useFieldArray({ control, name: "entryPoints" as never });

  const {
    fields: middlewareFields,
    append: appendMiddleware,
    remove: removeMiddleware,
  } = useFieldArray({ control, name: "middlewares" as never });

  const hasTls = !!watch("tls");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Router Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="my-router" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule">Rule</Label>
            <Input
              id="rule"
              placeholder="Host(`example.com`)"
              {...register("rule")}
            />
            {errors.rule && (
              <p className="text-xs text-destructive">{errors.rule.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="service">Service</Label>
            <Input
              id="service"
              placeholder="my-service"
              {...register("service")}
            />
            {errors.service && (
              <p className="text-xs text-destructive">
                {errors.service.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Entrypoints</Label>
            {entryPointFields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Input
                  {...register(`entryPoints.${index}` as const)}
                  placeholder="websecure"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEntryPoint(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendEntryPoint("" as never)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Entrypoint
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Middlewares</Label>
            {middlewareFields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Input
                  {...register(`middlewares.${index}` as const)}
                  placeholder="my-middleware"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMiddleware(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendMiddleware("" as never)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Middleware
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={hasTls}
              onCheckedChange={(checked) => {
                setValue(
                  "tls",
                  checked ? { certResolver: "" } : undefined
                );
              }}
            />
            <Label>Enable TLS</Label>
          </div>

          {hasTls && (
            <div className="space-y-2 pl-4 border-l-2">
              <Label htmlFor="certResolver">Cert Resolver</Label>
              <Input
                id="certResolver"
                placeholder="letsencrypt"
                {...register("tls.certResolver")}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="priority">Priority (optional)</Label>
            <Input
              id="priority"
              type="number"
              {...register("priority", { valueAsNumber: true })}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Router"}
      </Button>
    </form>
  );
}
