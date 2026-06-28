import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Skull, Database, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TileStatusBadge } from "@/components/TileStatusBadge";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: summary, isLoading, isError } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <h1 className="text-xl md:text-2xl font-bold font-mono text-primary uppercase tracking-widest">Ops Overview</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Skeleton className="h-24 md:h-32 bg-card" />
          <Skeleton className="h-24 md:h-32 bg-card" />
          <Skeleton className="h-24 md:h-32 bg-card" />
          <Skeleton className="h-24 md:h-32 bg-card" />
        </div>
        <Skeleton className="h-64 md:h-96 bg-card" />
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-mono text-destructive uppercase tracking-widest">System Error</h2>
          <p className="text-muted-foreground font-mono text-sm">Failed to retrieve telemetry data. Check Tile connection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <header className="flex items-center justify-between border-b border-border pb-3 md:pb-4">
        <h1 className="text-xl md:text-2xl font-bold font-mono text-primary uppercase tracking-widest">Ops Overview</h1>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="hidden sm:inline">SYSTEM ONLINE</span>
          <span className="sm:hidden">ONLINE</span>
        </div>
      </header>

      {/* 2-col on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <MetricCard title="Total Assets" value={summary.total} icon={<Database className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title="Active" value={summary.active} icon={<Activity className="h-4 w-4 text-green-500" />} />
        <MetricCard title="Lost" value={summary.lost} icon={<AlertTriangle className="h-4 w-4 text-destructive" />} />
        <MetricCard title="Dead" value={summary.dead} icon={<Skull className="h-4 w-4 text-gray-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="col-span-1 lg:col-span-2 border-primary/20 bg-card rounded-none">
          <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
            <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Recently Lost Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {summary.recentlyLost.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground font-mono text-sm">
                No recently lost assets detected. All systems nominal.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {summary.recentlyLost.map(tile => (
                  <div key={tile.uuid} className="p-3 px-4 flex items-center justify-between hover:bg-muted/20 transition-colors gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="font-mono font-medium text-foreground flex items-center gap-2 flex-wrap">
                        <span className="truncate">{tile.equipment?.label || tile.name}</span>
                        <TileStatusBadge tile={tile} />
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {tile.lastSeen ? new Date(tile.lastSeen).toLocaleString() : 'UNKNOWN'}
                      </div>
                    </div>
                    <Link
                      href={`/equipment/${tile.equipment?.id || ''}`}
                      className="font-mono text-xs text-primary hover:underline uppercase tracking-wider flex-shrink-0"
                    >
                      Details
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 border-primary/20 bg-card rounded-none">
          <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
            <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" /> Asset Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {summary.byCategory.length === 0 ? (
               <div className="text-center text-muted-foreground font-mono text-sm">
                 No assets categorized.
               </div>
            ) : (
              summary.byCategory.map(cat => (
                <div key={cat.category} className="flex items-center justify-between">
                  <span className="font-mono text-sm">{cat.category}</span>
                  <span className="font-mono text-sm text-primary font-bold">{cat.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="border-border bg-card rounded-none relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50" />
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 md:px-4 md:pb-2 md:pt-4">
        <CardTitle className="text-[10px] md:text-xs font-mono uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="px-3 pb-3 md:px-4 md:pb-4">
        <div className="text-2xl md:text-3xl font-mono font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}
