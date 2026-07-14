import L from "leaflet";

export const getTileIcon = (tile: { lost: boolean; dead: boolean }) => {
  let colorClass = "bg-green-500 border-green-800 shadow-[0_0_10px_rgba(34,197,94,0.5)]";
  if (tile.dead) {
    colorClass = "bg-gray-500 border-gray-800";
  } else if (tile.lost) {
    colorClass = "bg-red-500 border-red-800 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
  }

  return L.divIcon({
    className: "custom-div-icon bg-transparent border-none",
    html: `<div class="w-4 h-4 rounded-full border-2 ${colorClass}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
};

// QR/RFID-only equipment plotted at its last reported scan location.
// Square + amber to distinguish "reported position" from live Tile GPS dots.
export const getScanLocationIcon = (selected = false) => {
  return L.divIcon({
    className: "custom-div-icon bg-transparent border-none",
    html: `<div class="w-4 h-4 rounded-sm border-2 bg-amber-400 border-amber-700 ${selected ? "shadow-[0_0_12px_rgba(251,191,36,0.8)]" : "shadow-[0_0_8px_rgba(251,191,36,0.4)]"}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
};

export const getHistoryPointIcon = () => {
  return L.divIcon({
    className: "custom-div-icon bg-transparent border-none",
    html: `<div class="w-3 h-3 rounded-full border-2 bg-primary border-primary-foreground opacity-70"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};
