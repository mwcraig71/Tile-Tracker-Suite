import { useState, useMemo, useEffect } from "react";
import {
  useGetTiles, getGetTilesQueryKey,
  useListEquipment, getListEquipmentQueryKey,
  type TileDevice, type Equipment,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, HardDrive, Filter, X, Plus, QrCode } from "lucide-react";
import { TileStatusBadge } from "@/components/TileStatusBadge";
import { EquipmentFormDialog } from "@/components/EquipmentFormDialog";
import { Link, useSearch, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNearestCities } from "@/hooks/useNearestCities";

import { EQUIPMENT_CATEGORIES } from "@/lib/categories";
const CATEGORIES = [...EQUIPMENT_CATEGORIES];
const ALL = "all";

/**
 * A row in the registry: either a Tile (optionally linked to equipment)
 * or a QR/RFID-only equipment record with no Tile.
 */
interface AssetRow {
  key: string;
  tile: TileDevice | null;
  equipment: Equipment | null;
}

function NoTileBadge({ equipment }: { equipment: Equipment }) {
  return (
    <Badge variant="outline" className="font-mono text-xs rounded-none border-border text-muted-foreground gap-1">
      <QrCode className="h-3 w-3" />
      {equipment.rfidTag ? "QR + RFID" : "QR ONLY"}
    </Badge>
  );
}

export default function EquipmentList() {
  const [nameFilter, setNameFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [cityFilter, setCityFilter] = useState("");
  const [autoLinkUuid, setAutoLinkUuid] = useState<string | null>(null);
  const [autoLinkOpen, setAutoLinkOpen] = useState(false);
  const search = useSearch();
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const linkTile = params.get("linkTile");
    if (linkTile) {
      setAutoLinkUuid(linkTile);
      setTimeout(() => setAutoLinkOpen(true), 100);
      navigate("/equipment", { replace: true });
    }
  }, [search]);

  const { data: tiles, isLoading: tilesLoading } = useGetTiles({
    query: { queryKey: getGetTilesQueryKey() }
  });

  // Equipment with no Tile (QR/RFID-only) never appears in the tiles feed,
  // so pull the full registry too.
  const { data: allEquipment, isLoading: equipmentLoading } = useListEquipment({
    query: { queryKey: getListEquipmentQueryKey() }
  });

  const isLoading = tilesLoading && equipmentLoading;

  const cities = useNearestCities(tiles);

  const assets = useMemo<AssetRow[]>(() => {
    const tileRows: AssetRow[] = (tiles ?? []).map((tile) => ({
      key: tile.uuid,
      tile,
      equipment: tile.equipment ?? null,
    }));
    const untrackedRows: AssetRow[] = (allEquipment ?? [])
      .filter((e) => !e.tileUuid)
      .map((e) => ({ key: `eq-${e.id}`, tile: null, equipment: e }));
    return [...tileRows, ...untrackedRows];
  }, [tiles, allEquipment]);

  const filteredAssets = useMemo(() => {
    return assets.filter(({ tile, equipment }) => {
      // Name filter
      if (nameFilter) {
        const term = nameFilter.toLowerCase();
        const matchesName =
          (tile?.name.toLowerCase().includes(term) ?? false) ||
          (equipment?.label.toLowerCase().includes(term) ?? false) ||
          (equipment?.serialNumber?.toLowerCase().includes(term) ?? false);
        if (!matchesName) return false;
      }

      // Category filter
      if (categoryFilter !== ALL) {
        if (!equipment?.category || equipment.category !== categoryFilter) return false;
      }

      // City filter — only Tiles report a live city
      if (cityFilter) {
        if (!tile) return false;
        const city = cities.get(tile.uuid) ?? "";
        if (!city.toLowerCase().includes(cityFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [assets, nameFilter, categoryFilter, cityFilter, cities]);

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-mono text-primary uppercase tracking-widest flex items-center gap-2">
              <HardDrive className="h-5 w-5 md:h-6 md:w-6" /> Equipment Registry
            </h1>
            <p className="text-xs md:text-sm font-mono text-muted-foreground mt-1">
              Master list of all tracked physical assets.
            </p>
          </div>
          {/* Create equipment without a Tile — QR and/or RFID only */}
          <EquipmentFormDialog
            trigger={
              <Button size="sm" className="font-mono text-xs uppercase tracking-wider rounded-none gap-1.5 flex-shrink-0">
                <Plus className="h-3.5 w-3.5" /> Add Equipment
              </Button>
            }
          />
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
            {filteredAssets.length} of {assets.length} assets
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
            {filteredAssets.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground font-mono text-sm">
                No assets match the current filters.
              </div>
            ) : (
              filteredAssets.map(({ key, tile, equipment }) => {
                const city = tile ? cities.get(tile.uuid) : undefined;
                return (
                  <div
                    key={key}
                    data-testid={`card-equipment-${key}`}
                    className="border border-border bg-card p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {equipment ? (
                          <>
                            <div className="font-mono font-semibold text-foreground truncate">
                              {equipment.label}
                            </div>
                            {equipment.serialNumber && (
                              <div className="text-xs font-mono text-muted-foreground">
                                SN: {equipment.serialNumber}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="font-mono text-muted-foreground italic text-sm">Unlinked Tile</div>
                            <div className="text-xs font-mono text-muted-foreground truncate">{tile!.name}</div>
                          </>
                        )}
                      </div>
                      {tile ? <TileStatusBadge tile={tile} /> : <NoTileBadge equipment={equipment!} />}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {equipment?.category && (
                        <Badge variant="outline" className="font-mono text-xs rounded-none border-primary/30 text-primary bg-primary/5">
                          {equipment.category}
                        </Badge>
                      )}
                      {city ? (
                        <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                          {city}
                        </div>
                      ) : tile?.latitude && tile?.longitude ? (
                        <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground/50">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="animate-pulse">resolving...</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between border-t border-border/50 pt-2">
                      <div className="font-mono text-xs text-muted-foreground">
                        {tile
                          ? tile.lastSeen ? new Date(tile.lastSeen).toLocaleDateString() : "No signal"
                          : "QR/RFID tracked"}
                      </div>
                      <div className="flex items-center gap-1">
                        {tile && tile.latitude != null && tile.longitude != null && (
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
                        {equipment ? (
                          <Link href={`/equipment/${equipment.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-details-${key}`}
                              className="font-mono text-xs uppercase tracking-wider rounded-none hover:text-primary h-7 px-2"
                            >
                              Details
                            </Button>
                          </Link>
                        ) : (
                          <EquipmentFormDialog
                            tileUuid={tile!.uuid}
                            {...(tile!.uuid === autoLinkUuid ? { open: autoLinkOpen, onOpenChange: (v) => setAutoLinkOpen(v) } : {})}
                          />
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
                {filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center font-mono text-sm text-muted-foreground">
                      No assets match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map(({ key, tile, equipment }) => {
                    const city = tile ? cities.get(tile.uuid) : undefined;
                    return (
                      <TableRow key={key} className="border-border hover:bg-muted/20 transition-colors">
                        <TableCell className="font-mono font-medium">
                          {equipment ? (
                            <div className="flex flex-col">
                              <span className="text-foreground">{equipment.label}</span>
                              {equipment.serialNumber && (
                                <span className="text-xs text-muted-foreground">SN: {equipment.serialNumber}</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-muted-foreground italic">Unlinked Tile</span>
                              <span className="text-xs text-muted-foreground">{tile!.name}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {equipment?.category ? (
                            <Badge variant="outline" className="font-mono text-xs rounded-none border-primary/30 text-primary bg-primary/5">
                              {equipment.category}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs font-mono">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {tile ? <TileStatusBadge tile={tile} /> : <NoTileBadge equipment={equipment!} />}
                        </TableCell>
                        <TableCell>
                          {city ? (
                            <div className="flex items-center gap-1 font-mono text-xs text-foreground">
                              <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                              {city}
                            </div>
                          ) : tile?.latitude && tile?.longitude ? (
                            <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground/50">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="animate-pulse">resolving...</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs font-mono">{tile ? "No GPS" : "—"}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {tile
                            ? tile.lastSeen ? new Date(tile.lastSeen).toLocaleString() : "Never"
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {tile && tile.latitude != null && tile.longitude != null && (
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
                            {equipment ? (
                              <Link href={`/equipment/${equipment.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-details-desktop-${key}`}
                                  className="font-mono text-xs uppercase tracking-wider rounded-none hover:text-primary"
                                >
                                  Details
                                </Button>
                              </Link>
                            ) : (
                              <EquipmentFormDialog
                                tileUuid={tile!.uuid}
                                {...(tile!.uuid === autoLinkUuid ? { open: autoLinkOpen, onOpenChange: (v) => setAutoLinkOpen(v) } : {})}
                              />
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
