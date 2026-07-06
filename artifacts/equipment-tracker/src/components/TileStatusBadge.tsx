import { Badge } from "@/components/ui/badge";
import type { TileDevice } from "@workspace/api-client-react";

interface TileStatusBadgeProps {
  tile: Pick<TileDevice, "lost" | "dead">;
}

export function TileStatusBadge({ tile }: TileStatusBadgeProps) {
  if (tile.dead) {
    return (
      <Badge variant="secondary" className="font-mono text-[10px] tracking-wider border-gray-500 text-gray-400">
        DEAD
      </Badge>
    );
  }
  if (tile.lost) {
    return (
      <Badge variant="destructive" className="font-mono text-[10px] tracking-wider">
        LOST
      </Badge>
    );
  }
  return (
    <Badge variant="default" className="bg-green-600/20 text-green-500 border border-green-600/50 hover:bg-green-600/30 font-mono text-[10px] tracking-wider">
      ACTIVE
    </Badge>
  );
}
