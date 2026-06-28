import { useState } from "react";
import { useGetTiles, getGetTilesQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, HardDrive } from "lucide-react";
import { TileStatusBadge } from "@/components/TileStatusBadge";
import { EquipmentFormDialog } from "@/components/EquipmentFormDialog";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function EquipmentList() {
  const [search, setSearch] = useState("");

  const { data: tiles, isLoading } = useGetTiles({
    query: { queryKey: getGetTilesQueryKey() }
  });

  const filteredTiles = tiles?.filter(tile => {
    const term = search.toLowerCase();
    return tile.name.toLowerCase().includes(term) ||
           tile.equipment?.label.toLowerCase().includes(term) ||
           tile.equipment?.category.toLowerCase().includes(term) ||
           tile.equipment?.serialNumber?.toLowerCase().includes(term);
  });

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 w-full">
      <header className="flex flex-col gap-3 border-b border-border pb-3 md:pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-mono text-primary uppercase tracking-widest flex items-center gap-2">
            <HardDrive className="h-5 w-5 md:h-6 md:w-6" /> Equipment Registry
          </h1>
          <p className="text-xs md:text-sm font-mono text-muted-foreground mt-1">Master list of all tracked physical assets.</p>
        </div>

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-equipment"
            className="pl-9 font-mono bg-card border-primary/20 rounded-none focus-visible:ring-primary"
          />
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-card rounded-none" />
          ))}
        </div>
      ) : (
        <>
          {/* Mobile card list — hidden on md+ */}
          <div className="md:hidden space-y-2">
            {filteredTiles?.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground font-mono text-sm">
                No equipment found{search ? ` for "${search}"` : ""}.
              </div>
            ) : (
              filteredTiles?.map((tile) => (
                <div
                  key={tile.uuid}
                  data-testid={`card-equipment-${tile.uuid}`}
                  className="border border-border bg-card p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {tile.equipment ? (
                        <>
                          <div className="font-mono font-semibold text-foreground truncate">{tile.equipment.label}</div>
                          {tile.equipment.serialNumber && (
                            <div className="text-xs font-mono text-muted-foreground">SN: {tile.equipment.serialNumber}</div>
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

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {tile.equipment?.category && (
                        <Badge variant="outline" className="font-mono text-xs rounded-none border-primary/30 text-primary bg-primary/5">
                          {tile.equipment.category}
                        </Badge>
                      )}
                      {tile.latitude && tile.longitude && (
                        <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 text-primary" />
                          {tile.latitude.toFixed(3)}, {tile.longitude.toFixed(3)}
                        </div>
                      )}
                    </div>

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

                  {tile.lastSeen && (
                    <div className="font-mono text-xs text-muted-foreground border-t border-border/50 pt-2">
                      Last seen: {new Date(tile.lastSeen).toLocaleString()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop table — hidden on mobile */}
          <div className="hidden md:block border border-border bg-card rounded-none overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border">
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground w-1/4">Equipment Label</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Category</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Location</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Last Seen</TableHead>
                  <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTiles?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center font-mono text-sm text-muted-foreground">
                      No equipment records found{search ? ` matching "${search}"` : ""}.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTiles?.map((tile) => (
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
                          <span className="text-muted-foreground text-xs font-mono">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <TileStatusBadge tile={tile} />
                      </TableCell>
                      <TableCell>
                        {tile.latitude && tile.longitude ? (
                          <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 text-primary" />
                            {tile.latitude.toFixed(4)}, {tile.longitude.toFixed(4)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs font-mono">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {tile.lastSeen ? new Date(tile.lastSeen).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
