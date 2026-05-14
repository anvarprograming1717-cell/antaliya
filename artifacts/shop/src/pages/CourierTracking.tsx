import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { MapPin, Navigation, Wifi, WifiOff } from "lucide-react";
import { useLocation } from "wouter";

interface CourierData {
  id: string;
  lat: number;
  lng: number;
  name: string;
  updatedAt: number;
}

interface MarkerData {
  marker: any;
  targetLat: number;
  targetLng: number;
  currentLat: number;
  currentLng: number;
  animFrame?: number;
}

export default function CourierTracking() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, MarkerData>>(new Map());
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [couriers, setCouriers] = useState<CourierData[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamically import Leaflet
    import("leaflet").then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      // Fix default marker icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [41.2995, 69.2401],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = { map, L };

      // Connect socket
      const socket = io(window.location.origin, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("customer:watch");
      });

      socket.on("disconnect", () => setConnected(false));

      function createCarIcon(L: any, name: string) {
        return L.divIcon({
          html: `<div style="
            background: #ef4444;
            border: 3px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            width: 36px; height: 36px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">
            <span style="transform: rotate(45deg); font-size: 16px;">🚗</span>
          </div>
          <div style="
            margin-top: 6px;
            background: rgba(0,0,0,0.7);
            color: white;
            border-radius: 8px;
            padding: 2px 6px;
            font-size: 11px;
            font-weight: bold;
            white-space: nowrap;
            text-align: center;
          ">${name}</div>`,
          className: "",
          iconSize: [60, 60],
          iconAnchor: [18, 36],
        });
      }

      function animateMarker(markerData: MarkerData) {
        const steps = 30;
        let step = 0;
        const startLat = markerData.currentLat;
        const startLng = markerData.currentLng;
        const diffLat = markerData.targetLat - startLat;
        const diffLng = markerData.targetLng - startLng;

        if (markerData.animFrame) cancelAnimationFrame(markerData.animFrame);

        function step_fn() {
          step++;
          const progress = step / steps;
          const eased = 1 - Math.pow(1 - progress, 3);
          const lat = startLat + diffLat * eased;
          const lng = startLng + diffLng * eased;
          markerData.marker.setLatLng([lat, lng]);
          markerData.currentLat = lat;
          markerData.currentLng = lng;
          if (step < steps) {
            markerData.animFrame = requestAnimationFrame(step_fn);
          }
        }
        markerData.animFrame = requestAnimationFrame(step_fn);
      }

      socket.on("couriers:all", (data: CourierData[]) => {
        const { map, L } = mapInstanceRef.current;
        setCouriers(data);

        // Remove markers not in new data
        const ids = new Set(data.map(d => d.id));
        for (const [id, md] of markersRef.current.entries()) {
          if (!ids.has(id)) {
            md.marker.remove();
            markersRef.current.delete(id);
          }
        }

        data.forEach(courier => {
          if (markersRef.current.has(courier.id)) {
            const md = markersRef.current.get(courier.id)!;
            md.targetLat = courier.lat;
            md.targetLng = courier.lng;
          } else {
            const marker = L.marker([courier.lat, courier.lng], {
              icon: createCarIcon(L, courier.name),
            }).addTo(map);
            marker.bindPopup(`<b>${courier.name}</b><br/>Kuryer harakatda`);
            markersRef.current.set(courier.id, {
              marker,
              targetLat: courier.lat,
              targetLng: courier.lng,
              currentLat: courier.lat,
              currentLng: courier.lng,
            });
          }
        });
      });

      socket.on("courier:moved", (courier: CourierData) => {
        const { map, L } = mapInstanceRef.current;
        setCouriers(prev => {
          const idx = prev.findIndex(c => c.id === courier.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = courier;
            return next;
          }
          return [...prev, courier];
        });

        if (markersRef.current.has(courier.id)) {
          const md = markersRef.current.get(courier.id)!;
          md.targetLat = courier.lat;
          md.targetLng = courier.lng;
          animateMarker(md);
        } else {
          const marker = L.marker([courier.lat, courier.lng], {
            icon: createCarIcon(L, courier.name),
          }).addTo(map);
          marker.bindPopup(`<b>${courier.name}</b><br/>Kuryer harakatda`);
          markersRef.current.set(courier.id, {
            marker,
            targetLat: courier.lat,
            targetLng: courier.lng,
            currentLat: courier.lat,
            currentLng: courier.lng,
          });
        }
      });

      socket.on("courier:offline", ({ id }: { id: string }) => {
        const md = markersRef.current.get(id);
        if (md) {
          md.marker.remove();
          markersRef.current.delete(id);
        }
        setCouriers(prev => prev.filter(c => c.id !== id));
      });
    });

    return () => {
      socketRef.current?.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.map.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-background/90 backdrop-blur border-b border-border z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/orders")}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            ←
          </button>
          <div>
            <h1 className="font-bold text-base">Kuryer kuzatuvi</h1>
            <p className="text-xs text-muted-foreground">Real vaqtda xarita</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
              <Wifi className="w-3.5 h-3.5" />
              Ulangan
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
              <WifiOff className="w-3.5 h-3.5" />
              Ulanmoqda...
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1" />

      {/* Bottom panel */}
      {couriers.length === 0 ? (
        <div className="absolute bottom-6 left-4 right-4 bg-background/90 backdrop-blur rounded-2xl border border-border p-4 text-center shadow-lg">
          <Navigation className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Faol kuryer yo'q</p>
          <p className="text-xs text-muted-foreground mt-1">Kuryer yetkazish boshlanganda bu yerda ko'rsatiladi</p>
        </div>
      ) : (
        <div className="absolute bottom-6 left-4 right-4 bg-background/90 backdrop-blur rounded-2xl border border-border p-4 shadow-lg">
          <p className="text-xs text-muted-foreground mb-2">Faol kuryerlar ({couriers.length})</p>
          <div className="space-y-1.5">
            {couriers.map(c => (
              <div key={c.id} className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">🚗 Harakatda</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
