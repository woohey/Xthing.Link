import { useEffect, useMemo } from 'react';
import { Circle, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { GeofenceItem, TrajectoryPoint } from '../lib/pet-necklace-api';

import 'leaflet/dist/leaflet.css';

/** Leaflet default icons break under Vite unless paths are set. */
{
  const proto = L.Icon.Default.prototype as unknown as { _getIconUrl?: string };
  delete proto._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

function ringToLeaflet(ring: number[][]): [number, number][] {
  return ring.map(([lng, lat]) => [lat, lng] as [number, number]);
}

function FitBounds({ latlngs }: { latlngs: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (latlngs.length === 0) {
      return;
    }
    const b = L.latLngBounds(latlngs[0], latlngs[0]);
    latlngs.forEach((p) => b.extend(p));
    map.fitBounds(b, { padding: [32, 32], maxZoom: 16 });
  }, [map, latlngs]);
  return null;
}

export interface PetNecklaceMapProps {
  trajectory: TrajectoryPoint[];
  geofences: GeofenceItem[];
  playbackIndex: number;
}

const TRAIL_COLOR = '#94a3b8';
const PLAYED_COLOR = '#00bcd4';
const FENCE_STROKE = '#0b4e6d';

export default function PetNecklaceMap({ trajectory, geofences, playbackIndex }: PetNecklaceMapProps) {
  const positions = useMemo(
    () => trajectory.map((p) => [p.latitude, p.longitude] as [number, number]),
    [trajectory],
  );

  const playedPositions = useMemo(() => {
    if (positions.length === 0) {
      return [];
    }
    const end = Math.min(playbackIndex, positions.length - 1);
    return positions.slice(0, end + 1);
  }, [positions, playbackIndex]);

  const current = positions.length > 0 ? positions[Math.min(playbackIndex, positions.length - 1)] : null;

  const boundsPoints = useMemo(() => {
    const pts: [number, number][] = [...positions];
    for (const g of geofences) {
      if (!g.is_active) {
        continue;
      }
      if (g.fence_type === 'circle' && g.center_lat != null && g.center_lng != null) {
        pts.push([g.center_lat, g.center_lng]);
      }
      if (g.fence_type === 'polygon' && g.boundary?.coordinates?.[0]) {
        for (const [lng, lat] of g.boundary.coordinates[0]) {
          pts.push([lat, lng]);
        }
      }
    }
    return pts;
  }, [positions, geofences]);

  const center: [number, number] = current ?? [31.2304, 121.4737];

  return (
    <MapContainer
      className="pet-dashboard__map pet-dashboard__map--leaflet"
      center={center}
      zoom={15}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {boundsPoints.length > 0 ? <FitBounds latlngs={boundsPoints} /> : null}

      {geofences.map((g) => {
        if (!g.is_active) {
          return null;
        }
        if (g.fence_type === 'circle' && g.center_lat != null && g.center_lng != null && g.radius_meters != null) {
          return (
            <Circle
              key={g.id}
              center={[g.center_lat, g.center_lng]}
              radius={g.radius_meters}
              pathOptions={{
                color: FENCE_STROKE,
                weight: 2,
                fillOpacity: 0.06,
              }}
            >
              <Popup>{g.name}</Popup>
            </Circle>
          );
        }
        if (g.fence_type === 'polygon' && g.boundary?.coordinates?.[0]) {
          const pos = ringToLeaflet(g.boundary.coordinates[0]);
          return (
            <Polygon
              key={g.id}
              positions={pos}
              pathOptions={{
                color: FENCE_STROKE,
                weight: 2,
                fillOpacity: 0.06,
              }}
            >
              <Popup>{g.name}</Popup>
            </Polygon>
          );
        }
        return null;
      })}

      {positions.length > 1 ? (
        <Polyline positions={positions} pathOptions={{ color: TRAIL_COLOR, weight: 3, opacity: 0.45 }} />
      ) : null}
      {playedPositions.length > 1 ? (
        <Polyline positions={playedPositions} pathOptions={{ color: PLAYED_COLOR, weight: 4, opacity: 0.95 }} />
      ) : null}

      {current ? (
        <Marker position={current}>
          <Popup>
            回放位置
            <br />
            {trajectory[Math.min(playbackIndex, trajectory.length - 1)]?.recorded_at
              ? new Date(trajectory[Math.min(playbackIndex, trajectory.length - 1)].recorded_at).toLocaleString()
              : ''}
          </Popup>
        </Marker>
      ) : null}
    </MapContainer>
  );
}
