import { useState, useEffect } from "react";
import { useHealthCheck, getHealthCheckQueryKey, getGetTilesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Server, AlertCircle, CheckCircle2, Wifi, WifiOff, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getAppKey, setAppKey, authHeaders } from "@/lib/app-key";
import { ShieldCheck } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CredentialsStatus {
  configured: boolean;
  email: string | null;
  source: "override" | "env" | "none";
  sessionActive: boolean;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: health, isError: apiError } = useHealthCheck({
    query: { queryKey: getHealthCheckQueryKey() }
  });

  const [credStatus, setCredStatus] = useState<CredentialsStatus | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [appKeyInput, setAppKeyInput] = useState("");
  const [showAppKey, setShowAppKey] = useState(false);
  const [appKeySet, setAppKeySet] = useState(() => !!getAppKey());

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/credentials`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setCredStatus(d))
      .catch(() => setCredStatus(null));
  }, []);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Authentication Failed", description: data.error ?? "Invalid credentials.", variant: "destructive" });
      } else {
        setCredStatus({ configured: true, email: data.email, source: "override", sessionActive: true });
        setPassword("");
        toast({ title: "Connected", description: `Signed in as ${data.email}.` });
        await queryClient.invalidateQueries({ queryKey: getGetTilesQueryKey() });
      }
    } catch {
      toast({ title: "Error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAppKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppKey(appKeyInput);
    setAppKeySet(!!appKeyInput.trim());
    setAppKeyInput("");
    toast({
      title: appKeyInput.trim() ? "Access Key Saved" : "Access Key Cleared",
      description: appKeyInput.trim()
        ? "Stored on this device. Reloading data..."
        : "This device will no longer authenticate.",
    });
    await queryClient.invalidateQueries();
  };

  const handleRefresh = async () => {
    setSyncing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: getGetTilesQueryKey() });
      toast({ title: "Sync Initiated", description: "Re-fetching tile locations." });
    } catch {
      toast({ title: "Sync Failed", description: "Could not contact Tile API.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const isConnected = credStatus?.configured && credStatus?.sessionActive;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6 md:space-y-8">
      <header className="border-b border-border pb-3 md:pb-4">
        <h1 className="text-xl md:text-2xl font-bold font-mono text-primary uppercase tracking-widest flex items-center gap-2">
          <Server className="h-5 w-5 md:h-6 md:w-6" /> System Configuration
        </h1>
        <p className="text-xs md:text-sm font-mono text-muted-foreground mt-1">
          Manage Tile account credentials and system diagnostics.
        </p>
      </header>

      <div className="grid gap-4 md:gap-6">

        {/* App Access Key */}
        <Card className="border-primary/20 bg-card rounded-none">
          <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-mono uppercase tracking-wider text-xs md:text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> App Access Key
                </CardTitle>
                <CardDescription className="font-mono text-xs mt-0.5">
                  Required to use this app. Matches the APP_API_KEY secret on the server.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs">
                {appKeySet ? (
                  <span className="text-green-500 uppercase tracking-wider">Set</span>
                ) : (
                  <span className="text-yellow-500 uppercase tracking-wider">Not set</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <form onSubmit={handleSaveAppKey} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input
                  type={showAppKey ? "text" : "password"}
                  autoComplete="off"
                  placeholder={appKeySet ? "•••••••• (saved on this device)" : "Paste access key"}
                  value={appKeyInput}
                  onChange={(e) => setAppKeyInput(e.target.value)}
                  className="font-mono rounded-none bg-background border-border focus-visible:ring-primary text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAppKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showAppKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="submit"
                className="font-mono uppercase tracking-wider rounded-none gap-2 w-full sm:w-auto flex-shrink-0"
              >
                <KeyRound className="h-4 w-4" /> Save Key
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tile Account Credentials */}
        <Card className="border-primary/20 bg-card rounded-none">
          <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-mono uppercase tracking-wider text-xs md:text-sm flex items-center gap-2">
                  <KeyRound className="h-4 w-4" /> Tile Account
                </CardTitle>
                <CardDescription className="font-mono text-xs mt-0.5">
                  Sign in with your Tile account to sync tracker locations.
                </CardDescription>
              </div>
              {credStatus && (
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  {isConnected ? (
                    <>
                      <Wifi className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-green-500 uppercase tracking-wider">Connected</span>
                    </>
                  ) : credStatus.configured ? (
                    <>
                      <WifiOff className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-yellow-500 uppercase tracking-wider">Idle</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground uppercase tracking-wider">Not set</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-5">
            {/* Current status banner */}
            {credStatus?.configured && (
              <div className={`flex items-center gap-3 p-3 border font-mono text-xs ${isConnected ? "border-green-500/30 bg-green-500/5 text-green-400" : "border-yellow-500/30 bg-yellow-500/5 text-yellow-400"}`}>
                {isConnected
                  ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                <div>
                  <span className="font-semibold">
                    {isConnected ? "Active session" : "Credentials stored"}
                  </span>
                  {" — "}
                  <span className="opacity-80">{credStatus.email}</span>
                  {credStatus.source === "env" && (
                    <span className="ml-2 opacity-60">(from environment)</span>
                  )}
                </div>
              </div>
            )}

            {/* Login form */}
            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    type="email"
                    autoComplete="username"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="font-mono rounded-none bg-background border-border focus-visible:ring-primary text-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="font-mono rounded-none bg-background border-border focus-visible:ring-primary text-sm pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <p className="font-mono text-xs text-muted-foreground">
                  Credentials are kept in server memory and not written to disk.
                  They reset on server restart.
                </p>
                <Button
                  type="submit"
                  disabled={saving || !email.trim() || !password.trim()}
                  className="font-mono uppercase tracking-wider rounded-none gap-2 w-full sm:w-auto flex-shrink-0"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {saving ? "Connecting..." : credStatus?.configured ? "Update Credentials" : "Connect Account"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="border-border bg-card rounded-none">
          <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
            <CardTitle className="font-mono uppercase tracking-wider text-xs md:text-sm">System Health</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 border border-border bg-background">
              {apiError ? (
                <AlertCircle className="h-7 w-7 md:h-8 md:w-8 text-destructive flex-shrink-0" />
              ) : (
                <CheckCircle2 className="h-7 w-7 md:h-8 md:w-8 text-green-500 flex-shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="font-mono font-bold text-foreground text-sm">API SERVER</span>
                <span className="font-mono text-xs md:text-sm text-muted-foreground">
                  {apiError ? "OFFLINE or UNREACHABLE" : "ONLINE — Nominal"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Sync */}
        <Card className="border-border bg-card rounded-none">
          <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
            <CardTitle className="font-mono uppercase tracking-wider text-xs md:text-sm">Synchronisation</CardTitle>
            <CardDescription className="font-mono text-xs">Force a refresh of all tile locations and statuses.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="font-mono text-xs text-muted-foreground">
                Tile locations update automatically. Use this to force an immediate refresh.
              </p>
              <Button
                onClick={handleRefresh}
                disabled={syncing}
                variant="outline"
                data-testid="button-force-sync"
                className="font-mono uppercase tracking-wider rounded-none gap-2 w-full sm:w-auto flex-shrink-0"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Force Sync
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
