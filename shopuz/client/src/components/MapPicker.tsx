import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, X, Check, Loader2 } from "lucide-react";

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapPickerProps {
  onSelect: (address: string, lat: number, lng: number) => void;
  onClose: () => void;
  initialAddress?: string;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({ onSelect, onClose, initialAddress }: MapPickerProps) {
  const [search, setSearch] = useState(initialAddress || "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinAddress, setPinAddress] = useState("");
  const [reverseLoading, setReverseLoading] = useState(false);
  const [center] = useState<[number, number]>([41.2995, 69.2401]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<any>(null);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setReverseLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=uz`,
        { headers: { "Accept-Language": "uz,ru,en" } }
      );
      const data = await res.json();
      const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setPinAddress(addr);
      setSearch(addr);
    } catch {
      setPinAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setReverseLoading(false);
    }
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPin({ lat, lng });
    reverseGeocode(lat, lng);
    setShowSuggestions(false);
  }, [reverseGeocode]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&countrycodes=uz&accept-language=uz`,
          { headers: { "Accept-Language": "uz,ru,en" } }
        );
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);
  };

  const handleSuggestionClick = (s: Suggestion) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    setPin({ lat, lng });
    setPinAddress(s.display_name);
    setSearch(s.display_name);
    setShowSuggestions(false);
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 16);
    }
  };

  const handleConfirm = () => {
    if (!pin) return;
    onSelect(pinAddress || search, pin.lat, pin.lng);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background z-10">
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-base flex-1">Xaritadan manzil tanlash</h2>
        {pin && (
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl"
          >
            <Check className="w-4 h-4" />
            Tasdiqlash
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative px-4 py-2 bg-background border-b border-border z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Shahar, ko'cha, uy raqami..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {loadingSuggestions && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
          {search && !loadingSuggestions && (
            <button
              onClick={() => { setSearch(""); setSuggestions([]); setShowSuggestions(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-background border border-border rounded-2xl shadow-xl overflow-hidden z-50">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="w-full text-left px-4 py-3 flex items-start gap-2.5 hover:bg-muted transition-colors border-b border-border/50 last:border-b-0"
              >
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm line-clamp-2">{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={12}
          className="w-full h-full"
          ref={mapRef}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <ClickHandler onMapClick={handleMapClick} />
          {pin && <Marker position={[pin.lat, pin.lng]} />}
        </MapContainer>

        {/* Tap hint */}
        {!pin && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-4 py-2 rounded-full pointer-events-none z-[400]">
            Xaritaga bosib manzil tanlang
          </div>
        )}
      </div>

      {/* Selected address bar */}
      {pin && (
        <div className="px-4 py-3 bg-background border-t border-border z-10">
          <div className="flex items-start gap-2">
            {reverseLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary mt-0.5 shrink-0" />
            ) : (
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            )}
            <p className="text-sm text-foreground leading-snug flex-1">
              {reverseLoading ? "Manzil aniqlanmoqda..." : pinAddress}
            </p>
          </div>
          <button
            onClick={handleConfirm}
            disabled={reverseLoading}
            className="mt-2 w-full h-11 bg-primary text-white rounded-xl font-semibold text-sm disabled:opacity-60"
          >
            {reverseLoading ? "Kuting..." : "Shu manzilni tanlash"}
          </button>
        </div>
      )}
    </div>
  );
}
