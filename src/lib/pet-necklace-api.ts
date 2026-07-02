/**
 * PetNecklace REST API client for the site demo.
 * @see docs/plans/pet-necklace-api-contract.md
 */

export type PetApiMode = 'mock' | 'live';

export interface DeviceSummary {
  device_id: string;
  name: string;
  pet_name: string;
  updated_at: string;
}

export interface DevicesResponse {
  devices: DeviceSummary[];
}

export interface LocationLatest {
  device_id: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  speed?: number | null;
  battery_level?: number | null;
  signal_strength?: number | null;
  recorded_at: string;
  received_at: string;
}

/** Runtime device state (connectivity, firmware, motion). */
export interface DeviceStatus {
  device_id: string;
  online: boolean;
  last_seen_at: string;
  firmware_version?: string | null;
  battery_level?: number | null;
  charging?: boolean | null;
  motion_state?: 'unknown' | 'resting' | 'walking' | 'running' | string;
  network_mode?: string | null;
}

export type AlertType =
  | 'geofence_enter'
  | 'geofence_exit'
  | 'low_battery'
  | 'offline'
  | 'sos'
  | string;

export interface AlertItem {
  id: string;
  device_id: string;
  alert_type: AlertType;
  severity?: 'info' | 'warning' | 'critical';
  message: string;
  latitude?: number | null;
  longitude?: number | null;
  geofence_id?: string | null;
  geofence_name?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AlertsResponse {
  alerts: AlertItem[];
  total: number;
}

export type FenceType = 'circle' | 'polygon';

/** GeoJSON Polygon; outer ring uses [lng, lat] per RFC 7946 */
export interface GeoPolygonBoundary {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface GeofenceItem {
  id: string;
  device_id: string;
  name: string;
  fence_type: FenceType;
  is_active: boolean;
  center_lat?: number | null;
  center_lng?: number | null;
  radius_meters?: number | null;
  boundary?: GeoPolygonBoundary | null;
}

export interface GeofencesResponse {
  geofences: GeofenceItem[];
}

export interface TrajectorySummary {
  date: string;
  points_count: number;
  total_distance_meters?: number | null;
  duration_minutes?: number | null;
}

export interface TrajectoriesListResponse {
  device_id: string;
  trajectories: TrajectorySummary[];
}

export interface TrajectoryPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  speed?: number | null;
  recorded_at: string;
}

export interface TrajectoryDayResponse {
  device_id: string;
  date: string;
  points: TrajectoryPoint[];
  summary?: {
    total_distance_meters?: number | null;
    max_speed_mps?: number | null;
    avg_speed_mps?: number | null;
    moving_time_minutes?: number | null;
    stop_time_minutes?: number | null;
  } | null;
}

export function getPetApiMode(): PetApiMode {
  const m = import.meta.env.PUBLIC_PET_API_MODE;
  return m === 'live' ? 'live' : 'mock';
}

export function getPetApiBase(): string {
  return import.meta.env.PUBLIC_PET_API_BASE?.replace(/\/$/, '') ?? '';
}

function joinBase(path: string): string {
  const base = getPetApiBase();
  if (!base) {
    return path;
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

const enc = encodeURIComponent;

/**
 * Build fetch URL. Mock uses static JSON under `/public/mock/pet-necklace/v1/`.
 * Live uses `/api/v1/...` on `PUBLIC_PET_API_BASE`.
 */
export function urlFor(
  key:
    | 'health'
    | 'devices'
    | `location-latest:${string}`
    | `status:${string}`
    | `alerts:${string}`
    | `geofences:${string}`
    | `trajectories:${string}`
    | `trajectory-day:${string}:${string}`,
): string {
  const mode = getPetApiMode();

  if (mode === 'mock') {
    if (key === 'health') {
      return '/mock/pet-necklace/v1/health.json';
    }
    if (key === 'devices') {
      return '/mock/pet-necklace/v1/devices.json';
    }
    if (key.startsWith('location-latest:')) {
      const id = key.slice('location-latest:'.length);
      return `/mock/pet-necklace/v1/devices/${enc(id)}/location-latest.json`;
    }
    if (key.startsWith('status:')) {
      const id = key.slice('status:'.length);
      return `/mock/pet-necklace/v1/devices/${enc(id)}/status.json`;
    }
    if (key.startsWith('alerts:')) {
      const id = key.slice('alerts:'.length);
      return `/mock/pet-necklace/v1/devices/${enc(id)}/alerts.json`;
    }
    if (key.startsWith('geofences:')) {
      const id = key.slice('geofences:'.length);
      return `/mock/pet-necklace/v1/devices/${enc(id)}/geofences.json`;
    }
    if (key.startsWith('trajectories:')) {
      const id = key.slice('trajectories:'.length);
      return `/mock/pet-necklace/v1/devices/${enc(id)}/trajectories.json`;
    }
    if (key.startsWith('trajectory-day:')) {
      const rest = key.slice('trajectory-day:'.length);
      const colon = rest.lastIndexOf(':');
      const deviceId = rest.slice(0, colon);
      const date = rest.slice(colon + 1);
      return `/mock/pet-necklace/v1/devices/${enc(deviceId)}/trajectories/${enc(date)}.json`;
    }
  }

  if (key === 'health') {
    return joinBase('/api/v1/health');
  }
  if (key === 'devices') {
    return joinBase('/api/v1/devices');
  }
  if (key.startsWith('location-latest:')) {
    const id = key.slice('location-latest:'.length);
    return joinBase(`/api/v1/devices/${enc(id)}/locations/latest`);
  }
  if (key.startsWith('status:')) {
    const id = key.slice('status:'.length);
    return joinBase(`/api/v1/devices/${enc(id)}/status`);
  }
  if (key.startsWith('alerts:')) {
    const id = key.slice('alerts:'.length);
    return joinBase(`/api/v1/devices/${enc(id)}/alerts`);
  }
  if (key.startsWith('geofences:')) {
    const id = key.slice('geofences:'.length);
    return joinBase(`/api/v1/devices/${enc(id)}/geofences`);
  }
  if (key.startsWith('trajectories:')) {
    const id = key.slice('trajectories:'.length);
    return joinBase(`/api/v1/devices/${enc(id)}/trajectories`);
  }
  if (key.startsWith('trajectory-day:')) {
    const rest = key.slice('trajectory-day:'.length);
    const colon = rest.lastIndexOf(':');
    const deviceId = rest.slice(0, colon);
    const date = rest.slice(colon + 1);
    return joinBase(`/api/v1/devices/${enc(deviceId)}/trajectories/${enc(date)}`);
  }

  return '/mock/pet-necklace/v1/health.json';
}

export async function fetchDevices(): Promise<DevicesResponse> {
  const res = await fetch(urlFor('devices'));
  if (!res.ok) {
    throw new Error(`devices: ${res.status}`);
  }
  return res.json() as Promise<DevicesResponse>;
}

export async function fetchLatestLocation(deviceId: string): Promise<LocationLatest> {
  const res = await fetch(urlFor(`location-latest:${deviceId}`));
  if (!res.ok) {
    throw new Error(`location: ${res.status}`);
  }
  return res.json() as Promise<LocationLatest>;
}

export async function fetchDeviceStatus(deviceId: string): Promise<DeviceStatus> {
  const res = await fetch(urlFor(`status:${deviceId}`));
  if (!res.ok) {
    throw new Error(`status: ${res.status}`);
  }
  return res.json() as Promise<DeviceStatus>;
}

export async function fetchAlerts(deviceId: string): Promise<AlertsResponse> {
  const res = await fetch(urlFor(`alerts:${deviceId}`));
  if (!res.ok) {
    throw new Error(`alerts: ${res.status}`);
  }
  return res.json() as Promise<AlertsResponse>;
}

export async function fetchGeofences(deviceId: string): Promise<GeofencesResponse> {
  const res = await fetch(urlFor(`geofences:${deviceId}`));
  if (!res.ok) {
    throw new Error(`geofences: ${res.status}`);
  }
  return res.json() as Promise<GeofencesResponse>;
}

export async function fetchTrajectoriesList(deviceId: string): Promise<TrajectoriesListResponse> {
  const res = await fetch(urlFor(`trajectories:${deviceId}`));
  if (!res.ok) {
    throw new Error(`trajectories: ${res.status}`);
  }
  return res.json() as Promise<TrajectoriesListResponse>;
}

export async function fetchTrajectoryDay(deviceId: string, date: string): Promise<TrajectoryDayResponse> {
  const res = await fetch(urlFor(`trajectory-day:${deviceId}:${date}`));
  if (!res.ok) {
    throw new Error(`trajectory ${date}: ${res.status}`);
  }
  return res.json() as Promise<TrajectoryDayResponse>;
}

export async function fetchHealth(): Promise<{ status: string; version?: string }> {
  const res = await fetch(urlFor('health'));
  if (!res.ok) {
    throw new Error(`health: ${res.status}`);
  }
  return res.json() as Promise<{ status: string; version?: string }>;
}
