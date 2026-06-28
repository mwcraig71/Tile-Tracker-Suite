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
    } catch (e) {
      toast({
        title: "Sync Failed",
        description: "Could not contact Tile API.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-8">
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold font-mono text-primary uppercase tracking-widest flex items-center gap-2">
          <Server className="h-6 w-6" /> System Configuration
        </h1>
        <p className="text-sm font-mono text-muted-foreground mt-1">Manage API connections and system diagnostics.</p>
      </header>

      <div className="grid gap-6">
        <Card className="border-primary/20 bg-card rounded-none">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="font-mono uppercase tracking-wider text-sm">System Health</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 p-4 border border-border bg-background">
              {isError ? (
                <AlertCircle className="h-8 w-8 text-destructive" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              )}
              <div className="flex flex-col">
                <span className="font-mono font-bold text-foreground">API SERVER STATUS</span>
                <span className="font-mono text-sm text-muted-foreground">
                  {isError ? "OFFLINE or UNREACHABLE" : "ONLINE - Nominal"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card rounded-none">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="font-mono uppercase tracking-wider text-sm">Tile Integration</CardTitle>
            <CardDescription className="font-mono text-xs">Configure connection to external Tile API</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="bg-muted/20 p-4 border border-border/50 font-mono text-sm text-muted-foreground space-y-2">
              <p>The FieldTrack system uses environment variables for Tile API authentication. This ensures credentials remain secure on the server.</p>
              <ul className="list-disc list-inside pl-4 mt-2 text-foreground">
                <li><code className="bg-background px-1 py-0.5 border border-border">TILE_EMAIL</code> - Account email</li>
                <li><code className="bg-background px-1 py-0.5 border border-border">TILE_PASSWORD</code> - Account password</li>
              </ul>
              <p className="mt-4 text-xs">If tiles are not appearing, verify these variables are set in the backend environment and restart the server.</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="font-mono text-sm text-foreground">
                <strong>Manual Synchronization</strong>
                <p className="text-xs text-muted-foreground">Force a refresh of all tile locations from the Tile network.</p>
              </div>
              <Button onClick={handleRefresh} className="font-mono uppercase tracking-wider rounded-none gap-2">
                <RefreshCw className="h-4 w-4" /> Force Sync
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
