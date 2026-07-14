import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetTiles, getGetTilesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Skull, Database, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TileStatusBadge } from "@/components/TileStatusBadge";
import { Link } from "wouter";
import { useNearestCities } from "@/hooks/useNearestCities";
import { useMemo } from "react";

export default function Dashboard() {
  const { data: summary, isLoading, isError } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: tiles } = useGetTiles({
    query: { queryKey: getGetTilesQueryKey() }
  });

  // Deduplicate by ~1km grid (2 decimal places) so we only geocode unique city-level locations
  // instead of all 54 individual tile coordinates (each Nominatim call costs 1 sec).
  const representativeTiles = useMemo(() => {
    if (!tiles) return [];
    const seen = new Set<string>();
    const result: typeof tiles = [];
    for (const tile of tiles) {
      if (tile.latitude == null || tile.longitude == null) continue;
      const key = `${tile.latitude.toFixed(2)},${tile.longitude.toFixed(2)}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(tile);
      }
    }
    return result;
  }, [tiles]);

  const cities = useNearestCities(representativeTiles);

  // Map every tile → its representative's resolved city
  const byCity = useMemo(() => {
    if (!tiles || !representativeTiles.length || cities.size === 0) return [];

    // Build coord-key → city lookup from resolved representatives
    const keyToCity = new Map<string, string>();
    for (const rep of representativeTiles) {
      if (rep.latitude == null || rep.longitude == null) continue;
      const city = cities.get(rep.uuid);
      if (city) keyToCity.set(`${rep.latitude.toFixed(2)},${rep.longitude.toFixed(2)}`, city);
    }

    const cityMap = new Map<string, number>();
    for (const tile of tiles) {
      if (tile.latitude == null || tile.longitude == null) continue;
      const city = keyToCity.get(`${tile.latitude.toFixed(2)},${tile.longitude.toFixed(2)}`);
      if (!city) continue;
      cityMap.set(city, (cityMap.get(city) ?? 0) + 1);
    }

    return Array.from(cityMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);
  }, [tiles, representativeTiles, cities]);

  const maxCityCount = byCity[0]?.count ?? 1;
  const resolvedCount = cities.size;
  const totalCount = representativeTiles.length;
  const allResolved = resolvedCount >= totalCount && totalCount > 0;

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

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <MetricCard title="Total Assets" value={summary.total} icon={<Database className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title="Active" value={summary.active} icon={<Activity className="h-4 w-4 text-green-500" />} />
        <MetricCard title="Lost" value={summary.lost} icon={<AlertTriangle className="h-4 w-4 text-destructive" />} />
        <MetricCard title="Dead" value={summary.dead} icon={<Skull className="h-4 w-4 text-gray-500" />} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        {/* Recently Lost */}
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
                      href={tile.equipment ? `/equipment/${tile.equipment.id}` : `/equipment?linkTile=${tile.uuid}`}
                      className="font-mono text-xs text-primary hover:underline uppercase tracking-wider flex-shrink-0"
                    >
                      {tile.equipment ? "Details" : "Link"}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: By Category + By Location stacked */}
        <div className="col-span-1 flex flex-col gap-4 md:gap-6">

          {/* By Category */}
          <Card className="border-primary/20 bg-card rounded-none">
            <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
              <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" /> By Category
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

          {/* By Location */}
          <Card className="border-primary/20 bg-card rounded-none">
            <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> By Location
                </CardTitle>
                {!allResolved && totalCount > 0 && (
                  <span className="font-mono text-[10px] text-muted-foreground animate-pulse">
                    {resolvedCount}/{totalCount}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {byCity.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-3 flex-1 bg-muted/50" />
                      <Skeleton className="h-3 w-6 bg-muted/50" />
                    </div>
                  ))}
                  <p className="text-[10px] font-mono text-muted-foreground text-center pt-1">
                    Resolving locations…
                  </p>
                </div>
              ) : (
                byCity.map(({ city, count }) => {
                  const pct = Math.round((count / maxCityCount) * 100);
                  return (
                    <div key={city} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-foreground truncate max-w-[140px]" title={city}>{city}</span>
                        <span className="font-mono text-xs text-primary font-bold ml-2 flex-shrink-0">{count}</span>
                      </div>
                      <div className="h-1 bg-muted/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

        </div>
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
