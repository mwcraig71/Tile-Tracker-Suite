// Reverse geocoding via Nominatim (OpenStreetMap) — free, no key needed.
// Rate limit: 1 request per second per Nominatim's usage policy.

const cache = new Map<string, string>();

interface QueueItem {
  key: string;
  lat: number;
  lng: number;
  resolve: (city: string) => void;
}

const queue: QueueItem[] = [];
let processing = false;

async function processQueue() {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const item = queue.shift()!;

    // Already resolved while waiting in queue
    if (cache.has(item.key)) {
      item.resolve(cache.get(item.key)!);
      continue;
    }

    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse?lat=${item.lat}&lon=${item.lng}` +
        `&format=json&zoom=10&addressdetails=1`;

      const resp = await fetch(url, {
        headers: { "Accept-Language": "en-US,en" },
      });

      if (resp.ok) {
        const data = await resp.json();
        const addr = data.address || {};
        // Prefer city > town > village > county > state
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.county ||
          addr.state ||
          "Unknown";

        cache.set(item.key, city);
        item.resolve(city);
      } else {
        cache.set(item.key, "Unknown");
        item.resolve("Unknown");
      }
    } catch {
      cache.set(item.key, "Unknown");
      item.resolve("Unknown");
    }

    // Respect Nominatim 1 req/sec rate limit
    if (queue.length > 0) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  processing = false;
}

export function getNearestCity(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;

  if (cache.has(key)) {
    return Promise.resolve(cache.get(key)!);
  }

  return new Promise((resolve) => {
    queue.push({ key, lat, lng, resolve });
    processQueue();
  });
}
