import { useCallback, useEffect, useState } from 'react';
import {
  fetchAlerts,
  fetchDeviceStatus,
  fetchDevices,
  fetchGeofences,
  fetchLatestLocation,
  fetchTrajectoryDay,
  fetchTrajectoriesList,
  getPetApiMode,
  type AlertItem,
  type DeviceStatus,
  type DeviceSummary,
  type GeofenceItem,
  type LocationLatest,
  type TrajectoryDayResponse,
  type TrajectoriesListResponse,
} from '../lib/pet-necklace-api';
import PetNecklaceMap from './PetNecklaceMap';

function osmExternalUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`;
}

const MOTION_LABEL: Record<string, string> = {
  resting: '静息',
  walking: '行走',
  running: '奔跑',
  unknown: '未知',
};

function motionLabel(state?: string | null): string {
  if (!state) {
    return '';
  }
  return MOTION_LABEL[state] ?? state;
}

function fenceTypeLabel(t: string): string {
  if (t === 'circle') {
    return '圆形';
  }
  if (t === 'polygon') {
    return '多边形';
  }
  return t;
}

function severityLabel(s?: string | null): string {
  if (!s) {
    return '';
  }
  const m: Record<string, string> = {
    info: '信息',
    warning: '警告',
    critical: '严重',
  };
  return m[s] ?? s;
}

export default function PetNecklaceDashboard() {
  const mode = getPetApiMode();
  const [devices, setDevices] = useState<DeviceSummary[] | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationLatest | null>(null);
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[] | null>(null);
  const [geofences, setGeofences] = useState<GeofenceItem[] | null>(null);
  const [trajList, setTrajList] = useState<TrajectoriesListResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [trajectoryDay, setTrajectoryDay] = useState<TrajectoryDayResponse | null>(null);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trajLoading, setTrajLoading] = useState(false);

  const loadCore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { devices: list } = await fetchDevices();
      setDevices(list);
      const id = list[0]?.device_id ?? null;
      setDeviceId(id);
      if (!id) {
        setLocation(null);
        setStatus(null);
        setAlerts(null);
        setGeofences(null);
        setTrajList(null);
        setSelectedDate('');
        setTrajectoryDay(null);
        return;
      }

      const [loc, st, al, gf, tlist] = await Promise.all([
        fetchLatestLocation(id),
        fetchDeviceStatus(id),
        fetchAlerts(id),
        fetchGeofences(id),
        fetchTrajectoriesList(id),
      ]);

      setLocation(loc);
      setStatus(st);
      setAlerts(al.alerts);
      setGeofences(gf.geofences);
      setTrajList(tlist);
      const firstDate = tlist.trajectories[0]?.date ?? '';
      setSelectedDate(firstDate);
      setPlaybackIndex(0);
      setPlaying(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setDevices(null);
      setDeviceId(null);
      setLocation(null);
      setStatus(null);
      setAlerts(null);
      setGeofences(null);
      setTrajList(null);
      setTrajectoryDay(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (!deviceId || !selectedDate) {
      setTrajectoryDay(null);
      return;
    }
    let cancelled = false;
    setTrajLoading(true);
    setError(null);
    void fetchTrajectoryDay(deviceId, selectedDate)
      .then((day) => {
        if (!cancelled) {
          setTrajectoryDay(day);
          setPlaybackIndex(0);
          setPlaying(false);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '轨迹加载失败');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTrajLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [deviceId, selectedDate]);

  useEffect(() => {
    if (!playing || !trajectoryDay?.points.length) {
      return;
    }
    const n = trajectoryDay.points.length;
    if (n <= 1) {
      return;
    }
    const id = window.setInterval(() => {
      setPlaybackIndex((i) => (i >= n - 1 ? i : i + 1));
    }, 650);
    return () => window.clearInterval(id);
  }, [playing, trajectoryDay?.points.length]);

  useEffect(() => {
    if (!trajectoryDay?.points.length) {
      return;
    }
    if (playbackIndex >= trajectoryDay.points.length - 1) {
      setPlaying(false);
    }
  }, [playbackIndex, trajectoryDay?.points.length]);

  const points = trajectoryDay?.points ?? [];
  const maxIdx = Math.max(0, points.length - 1);

  return (
    <div className="pet-dashboard">
      <div className="pet-dashboard__toolbar">
        <span className={`badge ${mode === 'mock' ? 'badge--accent' : ''}`}>{mode === 'mock' ? '模拟数据' : '线上 API'}</span>
        <button type="button" className="pet-dashboard__refresh" onClick={() => void loadCore()} disabled={loading}>
          {loading ? '加载中…' : '刷新'}
        </button>
      </div>

      {error ? (
        <p className="pet-dashboard__error" role="alert">
          {error}
        </p>
      ) : null}

      {!error && !loading && devices && devices.length === 0 ? <p className="muted">暂无已注册设备。</p> : null}

      {location && status ? (
        <>
          <section className="pet-dashboard__section">
            <h2 className="pet-dashboard__h2">设备状态</h2>
            <div className="bento-grid">
              <div className="card">
                <p className="card__title" style={{ marginBottom: '0.5rem' }}>
                  {devices?.[0]?.pet_name ?? 'Pet'}
                </p>
                <p className="card__desc" style={{ margin: 0 }}>
                  <code>{location.device_id}</code>
                </p>
                <p className="card__meta">
                  <span className={`badge ${status.online ? 'badge--accent' : ''}`}>{status.online ? '在线' : '离线'}</span>
                  {status.motion_state ? <span className="badge">{motionLabel(status.motion_state)}</span> : null}
                  {status.network_mode ? <span className="badge">{status.network_mode}</span> : null}
                </p>
              </div>
              <div className="card">
                <p className="card__title" style={{ marginBottom: '0.5rem' }}>
                  遥测
                </p>
                <p className="card__desc" style={{ margin: '0 0 0.35rem' }}>
                  电量 {location.battery_level ?? status.battery_level ?? '—'}%
                  {status.charging ? ' · 充电中' : ''}
                </p>
                <p className="card__desc" style={{ margin: 0, fontSize: '0.92rem' }}>
                  固件 {status.firmware_version ?? '—'} · 最后在线{' '}
                  {status.last_seen_at ? new Date(status.last_seen_at).toLocaleString() : '—'}
                </p>
              </div>
              <div className="card">
                <p className="card__title" style={{ marginBottom: '0.5rem' }}>
                  最新定位
                </p>
                <p className="card__desc" style={{ margin: '0 0 0.35rem' }}>
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </p>
                <p className="card__meta">
                  <a className="primary-link" href={osmExternalUrl(location.latitude, location.longitude)} target="_blank" rel="noreferrer">
                    在 OpenStreetMap 中打开
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section className="pet-dashboard__section">
            <h2 className="pet-dashboard__h2">地图 · 轨迹与围栏</h2>
            <p className="muted pet-dashboard__hint">
              灰色线为当日完整轨迹；青色线为当前回放进度；圆与多边形为已启用的电子围栏。
            </p>

            <div className="pet-dashboard__playback">
              <label className="pet-dashboard__label" htmlFor="pet-traj-date">
                日期
              </label>
              <select
                id="pet-traj-date"
                className="pet-dashboard__select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={!trajList?.trajectories.length}
              >
                {(trajList?.trajectories ?? []).map((t) => (
                  <option key={t.date} value={t.date}>
                    {t.date}（{t.points_count} 点
                    {t.total_distance_meters != null ? ` · 约 ${Math.round(t.total_distance_meters)} m` : ''}）
                  </option>
                ))}
              </select>
              {trajLoading ? <span className="muted pet-dashboard__inline-status">轨迹加载中…</span> : null}
            </div>

            {points.length > 0 && geofences ? (
              <>
                <div className="pet-dashboard__map-wrap">
                  <PetNecklaceMap trajectory={points} geofences={geofences} playbackIndex={playbackIndex} />
                </div>

                <div className="pet-dashboard__playback pet-dashboard__playback--slider">
                  <label className="pet-dashboard__label" htmlFor="pet-playback">
                    回放（{playbackIndex + 1} / {points.length}）
                  </label>
                  <input
                    id="pet-playback"
                    type="range"
                    min={0}
                    max={maxIdx}
                    value={Math.min(playbackIndex, maxIdx)}
                    onChange={(e) => {
                      setPlaybackIndex(Number(e.target.value));
                      setPlaying(false);
                    }}
                  />
                  <button
                    type="button"
                    className="pet-dashboard__refresh"
                    onClick={() => setPlaying((p) => !p)}
                    disabled={points.length <= 1}
                  >
                    {playing ? '暂停' : '播放'}
                  </button>
                </div>

                {trajectoryDay?.summary ? (
                  <ul className="pet-dashboard__stats">
                    <li>里程 · {trajectoryDay.summary.total_distance_meters ?? '—'} m</li>
                    <li>
                      速度 最大 / 平均 · {trajectoryDay.summary.max_speed_mps ?? '—'} / {trajectoryDay.summary.avg_speed_mps ?? '—'} m/s
                    </li>
                    <li>
                      移动 / 停留 · {trajectoryDay.summary.moving_time_minutes ?? '—'} / {trajectoryDay.summary.stop_time_minutes ?? '—'} 分钟
                    </li>
                  </ul>
                ) : null}
              </>
            ) : !trajLoading ? (
              <p className="muted">当日暂无轨迹点。</p>
            ) : null}
          </section>

          <section className="pet-dashboard__section">
            <h2 className="pet-dashboard__h2">电子围栏</h2>
            {geofences && geofences.length > 0 ? (
              <ul className="pet-dashboard__fence-list">
                {geofences.map((g) => (
                  <li key={g.id} className="card card--compact">
                    <strong>{g.name}</strong>
                    <span className="muted"> · {fenceTypeLabel(g.fence_type)}</span>
                    {g.is_active ? null : <span className="muted">（未启用）</span>}
                    {g.fence_type === 'circle' && g.radius_meters != null ? (
                      <p className="card__desc" style={{ margin: '0.35rem 0 0' }}>
                        半径约 {Math.round(g.radius_meters)} m，中心 {g.center_lat?.toFixed(4)}, {g.center_lng?.toFixed(4)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">暂无围栏。</p>
            )}
          </section>

          <section className="pet-dashboard__section">
            <h2 className="pet-dashboard__h2">告警</h2>
            {alerts && alerts.length > 0 ? (
              <div className="pet-dashboard__table-wrap">
                <table className="pet-dashboard__table">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>类型</th>
                      <th>内容</th>
                      <th>已读</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((a) => (
                      <tr key={a.id}>
                        <td>{new Date(a.created_at).toLocaleString()}</td>
                        <td>
                          <code>{a.alert_type}</code>
                          {a.severity ? <span className="muted"> · {severityLabel(a.severity)}</span> : null}
                        </td>
                        <td>{a.message}</td>
                        <td>{a.is_read ? '是' : '否'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">暂无告警。</p>
            )}
          </section>
        </>
      ) : null}

      {loading && !location ? <p className="muted">正在加载演示数据…</p> : null}
    </div>
  );
}
