import { useHealthCheck, getHealthCheckQueryKey, useGetTiles, getGetTilesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Server, AlertCircle, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: health, isError } = useHealthCheck({
    query: { queryKey: getHealthCheckQueryKey() }
  });

  const handleRefresh = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: getGetTilesQueryKey() });
      toast({
        title: "Synchronization Initiated",
        description: "Re-fetching data from Tile API.",
      });
    } catch {
      toast({
        title: "Sync Failed",
        description: "Could not contact Tile API.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6 md:space-y-8">
      <header className="border-b border-border pb-3 md:pb-4">
        <h1 className="text-xl md:text-2xl font-bold font-mono text-primary uppercase tracking-widest flex items-center gap-2">
          <Server className="h-5 w-5 md:h-6 md:w-6" /> System Configuration
        </h1>
        <p className="text-xs md:text-sm font-mono text-muted-foreground mt-1">Manage API connections and system diagnostics.</p>
      </header>

      <div className="grid gap-4 md:gap-6">
        <Card className="border-primary/20 bg-card rounded-none">
          <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
            <CardTitle className="font-mono uppercase tracking-wider text-xs md:text-sm">System Health</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 border border-border bg-background">
              {isError ? (
                <AlertCircle className="h-7 w-7 md:h-8 md:w-8 text-destructive flex-shrink-0" />
              ) : (
                <CheckCircle2 className="h-7 w-7 md:h-8 md:w-8 text-green-500 flex-shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="font-mono font-bold text-foreground text-sm">API SERVER STATUS</span>
                <span className="font-mono text-xs md:text-sm text-muted-foreground">
                  {isError ? "OFFLINE or UNREACHABLE" : "ONLINE — Nominal"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card rounded-none">
          <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
            <CardTitle className="font-mono uppercase tracking-wider text-xs md:text-sm">Tile Integration</CardTitle>
            <CardDescription className="font-mono text-xs">Connection to Tile API via server environment</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
            <div className="bg-muted/20 p-3 md:p-4 border border-border/50 font-mono text-xs md:text-sm text-muted-foreground space-y-2">
              <p>Authentication credentials are stored securely as environment variables on the server — never exposed to the browser.</p>
              <ul className="list-disc list-inside pl-2 mt-2 text-foreground space-y-1">
                <li><code className="bg-background px-1 py-0.5 border border-border text-xs">TILE_EMAIL</code> — Account email</li>
                <li><code className="bg-background px-1 py-0.5 border border-border text-xs">TILE_PASSWORD</code> — Account password</li>
              </ul>
              <p className="mt-2 text-xs">If tiles are not appearing, verify these variables are set and restart the server.</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border">
              <div className="font-mono">
                <div className="text-sm text-foreground font-semibold">Manual Synchronization</div>
                <p className="text-xs text-muted-foreground">Force a refresh of all tile locations.</p>
              </div>
              <Button
                onClick={handleRefresh}
                data-testid="button-force-sync"
                className="font-mono uppercase tracking-wider rounded-none gap-2 w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4" /> Force Sync
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
