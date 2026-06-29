import { useState, useMemo } from "react";
import { useGetTiles, getGetTilesQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, HardDrive, Filter, X } from "lucide-react";
import { TileStatusBadge } from "@/components/TileStatusBadge";
import { EquipmentFormDialog } from "@/components/EquipmentFormDialog";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNearestCities } from "@/hooks/useNearestCities";

import { EQUIPMENT_CATEGORIES } from "@/lib/categories";
const CATEGORIES = [...EQUIPMENT_CATEGORIES];
const ALL = "all";

export default function EquipmentList() {
  const [nameFilter, setNameFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [cityFilter, setCityFilter] = useState("");

  const { data: tiles, isLoading } = useGetTiles({
    query: { queryKey: getGetTilesQueryKey() }
  });

  const cities = useNearestCities(tiles);

  const filteredTiles = useMemo(() => {
    if (!tiles) return [];
    return tiles.filter(tile => {
      // Name filter
      if (nameFilter) {
        const term = nameFilter.toLowerCase();
        const matchesName =
          tile.name.toLowerCase().includes(term) ||
          tile.equipment?.label.toLowerCase().includes(term) ||
          (tile.equipment?.serialNumber?.toLowerCase().includes(term) ?? false);
        if (!matchesName) return false;
      }

      // Category filter
      if (categoryFilter !== ALL) {
        if (!tile.equipment?.category || tile.equipment.category !== categoryFilter) return false;
      }

      // City filter
      if (cityFilter) {
        const city = cities.get(tile.uuid) ?? "";
        if (!city.toLowerCase().includes(cityFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [tiles, nameFilter, categoryFilter, cityFilter, cities]);

  // Unique cities for the datalist autocomplete
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    cities.forEach((city) => { if (city && city !== "Unknown") set.add(city); });
    return Array.from(set).sort();
  }, [cities]);

  const hasActiveFilters = nameFilter || categoryFilter !== ALL || cityFilter;

  function clearFilters() {
    setNameFilter("");
    setCategoryFilter(ALL);
    setCityFilter("");
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 w-full">
      <header className="flex flex-col gap-3 border-b border-border pb-3 md:pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-mono text-primary uppercase tracking-widest flex items-center gap-2">
            <HardDrive className="h-5 w-5 md:h-6 md:w-6" /> Equipment Registry
          </h1>
          <p className="text-xs md:text-sm font-mono text-muted-foreground mt-1">
            Master list of all tracked physical assets.
          </p>
        </div>

        {/* Filter row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Name search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or serial..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              data-testid="input-filter-name"
              className="pl-9 font-mono bg-card border-primary/20 rounded-none focus-visible:ring-primary text-sm"
            />
          </div>

          {/* Category dropdown */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger
              data-testid="select-filter-category"
              className="w-full sm:w-44 font-mono text-sm bg-card border-primary/20 rounded-none focus:ring-primary"
            >
              <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1 flex-shrink-0" />
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent className="font-mono rounded-none">
              <SelectItem value={ALL}>All types</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
              <SelectItem value="Uncategorized">Uncategorized</SelectItem>
            </SelectContent>
          </Select>

          {/* City filter */}
          <div className="relative sm:w-44">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              list="city-options"
              placeholder="Filter by city..."
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              data-testid="input-filter-city"
              className="pl-9 font-mono bg-card border-primary/20 rounded-none focus-visible:ring-primary text-sm w-full"
            />
            <datalist id="city-options">
              {uniqueCities.map(city => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              data-testid="button-clear-filters"
              className="font-mono text-xs rounded-none text-muted-foreground hover:text-foreground gap-1 flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>

        {/* Result count */}
        {!isLoading && (
          <p className="font-mono text-xs text-muted-foreground">
            {filteredTiles.length} of {tiles?.length ?? 0} assets
            {cities.size > 0 && tiles && cities.size < tiles.filter(t => t.latitude).length && (
              <span className="text-primary/60 ml-2">· resolving locations...</span>
            )}
          </p>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-card rounded-none" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-2">
            {filteredTiles.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground font-mono text-sm">
                No assets match the current filters.
              </div>
            ) : (
              filteredTiles.map((tile) => {
                const city = cities.get(tile.uuid);
                return (
                  <div
                    key={tile.uuid}
                    data-testid={`card-equipment-${tile.uuid}`}
                    className="border border-border bg-card p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {tile.equipment ? (
                          <>
                            <div className="font-mono font-semibold text-foreground truncate">
                              {tile.equipment.label}
                            </div>
                            {tile.equipment.serialNumber && (
                              <div className="text-xs font-mono text-muted-foreground">
                                SN: {tile.equipment.serialNumber}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="font-mono text-muted-foreground italic text-sm">Unlinked Tile</div>
                            <div className="text-xs font-mono text-muted-foreground truncate">{tile.name}</div>
                          </>
                        )}
                      </div>
                      <TileStatusBadge tile={tile} />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {tile.equipment?.category && (
                        <Badge variant="outline" className="font-mono text-xs rounded-none border-primary/30 text-primary bg-primary/5">
                          {tile.equipment.category}
                        </Badge>
                      )}
                      {city ? (
                        <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                          {city}
                        </div>
                      ) : tile.latitude && tile.longitude ? (
                        <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground/50">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="animate-pulse">resolving...</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between border-t border-border/50 pt-2">
                      <div className="font-mono text-xs text-muted-foreground">
                        {tile.lastSeen ? new Date(tile.lastSeen).toLocaleDateString() : "No signal"}
                      </div>
                      <div className="flex items-center gap-1">
                        {tile.latitude != null && tile.longitude != null && (
                          <Link href={`/map?tile=${tile.uuid}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="font-mono text-xs rounded-none hover:text-primary h-7 px-2 text-muted-foreground"
                              title="Show on map"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                        {tile.equipment ? (
                          <Link href={`/equipment/${tile.equipment.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-details-${tile.uuid}`}
                              className="font-mono text-xs uppercase tracking-wider rounded-none hover:text-primary h-7 px-2"
                            >
                              Details
                            </Button>
                          </Link>
                        ) : (
                          <EquipmentFormDialog tileUuid={tile.uuid} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden md:block border border-border bg-card rounded-none overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border">
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground w-1/5">Name / Label</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Category</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Location</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Last Seen</TableHead>
                  <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center font-mono text-sm text-muted-foreground">
                      No assets match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTiles.map((tile) => {
                    const city = cities.get(tile.uuid);
                    return (
                      <TableRow key={tile.uuid} className="border-border hover:bg-muted/20 transition-colors">
                        <TableCell className="font-mono font-medium">
                          {tile.equipment ? (
                            <div className="flex flex-col">
                              <span className="text-foreground">{tile.equipment.label}</span>
                              {tile.equipment.serialNumber && (
                                <span className="text-xs text-muted-foreground">SN: {tile.equipment.serialNumber}</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-muted-foreground italic">Unlinked Tile</span>
                              <span className="text-xs text-muted-foreground">{tile.name}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {tile.equipment?.category ? (
                            <Badge variant="outline" className="font-mono text-xs rounded-none border-primary/30 text-primary bg-primary/5">
                              {tile.equipment.category}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs font-mono">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <TileStatusBadge tile={tile} />
                        </TableCell>
                        <TableCell>
                          {city ? (
                            <div className="flex items-center gap-1 font-mono text-xs text-foreground">
                              <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                              {city}
                            </div>
                          ) : tile.latitude && tile.longitude ? (
                            <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground/50">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="animate-pulse">resolving...</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs font-mono">No GPS</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {tile.lastSeen ? new Date(tile.lastSeen).toLocaleString() : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {tile.latitude != null && tile.longitude != null && (
                              <Link href={`/map?tile=${tile.uuid}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="font-mono text-xs rounded-none hover:text-primary text-muted-foreground"
                                  title="Show on map"
                                >
                                  <MapPin className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            )}
                            {tile.equipment ? (
                              <Link href={`/equipment/${tile.equipment.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-details-desktop-${tile.uuid}`}
                                  className="font-mono text-xs uppercase tracking-wider rounded-none hover:text-primary"
                                >
                                  Details
                                </Button>
                              </Link>
                            ) : (
                              <EquipmentFormDialog tileUuid={tile.uuid} />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
