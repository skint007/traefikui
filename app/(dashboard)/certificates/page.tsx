"use client";

import { useConfigFile } from "@/hooks/use-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, FileWarning } from "lucide-react";

interface CertConfig {
  tls?: {
    certificates?: Array<{
      certFile?: string;
      keyFile?: string;
    }>;
    stores?: Record<string, {
      defaultCertificate?: {
        certFile?: string;
        keyFile?: string;
      };
    }>;
  };
}

export default function CertificatesPage() {
  const { data, isLoading, error } = useConfigFile("certificates.yaml");

  const certConfig = data?.parsed as CertConfig | undefined;
  const certificates = certConfig?.tls?.certificates ?? [];
  const stores = certConfig?.tls?.stores ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Certificates</h1>
        <p className="text-muted-foreground">
          View and manage TLS certificate configuration
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Loading certificate configuration...
            </p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <FileWarning className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No certificates.yaml found in config directory. This is normal if
              certificates are managed by ACME/Let&apos;s Encrypt.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                TLS Certificates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No certificates configured
                </p>
              ) : (
                <div className="space-y-3">
                  {certificates.map((cert, i) => (
                    <div
                      key={i}
                      className="rounded-lg border p-4 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Certificate {i + 1}</Badge>
                      </div>
                      <div className="grid gap-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Cert: </span>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {cert.certFile}
                          </code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Key: </span>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {cert.keyFile}
                          </code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Certificate Stores</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(stores).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No certificate stores configured
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stores).map(([name, store]) => (
                    <div
                      key={name}
                      className="rounded-lg border p-4 space-y-2"
                    >
                      <div className="font-medium">{name}</div>
                      {store.defaultCertificate && (
                        <div className="grid gap-1 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Default Cert:{" "}
                            </span>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {store.defaultCertificate.certFile}
                            </code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Default Key:{" "}
                            </span>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {store.defaultCertificate.keyFile}
                            </code>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
