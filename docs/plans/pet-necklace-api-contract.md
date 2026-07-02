# PetNecklace HTTP API（本站对接契约）

**给 PetNecklace 项目开发者的总览说明**（分工、MQTT 要点、联调顺序）见同目录 **`pet-necklace-对接开发材料.md`**。本文专注 **路径与 JSON 字段**。

本站（Xthing.Link）与 PetNecklace 后端之间的约定。实现可先在 `public/mock/pet-necklace/v1/` 用静态 JSON 模拟，后端就绪后保持**路径与 JSON 形状**一致，仅切换 `PUBLIC_PET_API_BASE` 与 `PUBLIC_PET_API_MODE=live`。

**Base path（live）**：`/api/v1`  
**Mock 根路径**：`/mock/pet-necklace/v1`

---

## 1. `GET /api/v1/health`

**响应 200**

```json
{
  "status": "ok",
  "version": "1"
}
```

**Mock**：`health.json`

---

## 2. `GET /api/v1/devices`

**响应 200**

```json
{
  "devices": [
    {
      "device_id": "collar_001",
      "name": "Collar 001",
      "pet_name": "Mochi",
      "updated_at": "2026-04-20T08:00:00.000Z"
    }
  ]
}
```

**Mock**：`devices.json`

---

## 3. `GET /api/v1/devices/{device_id}/locations/latest`

最新定位点。

**Mock**：`devices/{device_id}/location-latest.json`

（字段见前文版本，此处不重复。）

---

## 4. `GET /api/v1/devices/{device_id}/status`

设备连接与运行态（用于 Dashboard「设备状态」卡片）。

**响应 200**

```json
{
  "device_id": "collar_001",
  "online": true,
  "last_seen_at": "2026-04-20T08:00:00.000Z",
  "firmware_version": "1.2.0",
  "battery_level": 87,
  "charging": false,
  "motion_state": "resting",
  "network_mode": "NB-IoT"
}
```

| 字段 | 说明 |
|------|------|
| motion_state | 如 `resting` / `walking` / `running`，或设备自定义字符串 |
| network_mode | 如 `NB-IoT`，可选 |

**Mock**：`devices/{device_id}/status.json`

---

## 5. `GET /api/v1/devices/{device_id}/alerts`

告警列表（按时间倒序由前端展示即可，排序未强制）。

**响应 200**

```json
{
  "alerts": [
    {
      "id": "alt_1",
      "device_id": "collar_001",
      "alert_type": "geofence_exit",
      "severity": "warning",
      "message": "Left home zone",
      "latitude": 31.2289,
      "longitude": 121.4712,
      "geofence_id": "gf_home",
      "geofence_name": "Home",
      "is_read": false,
      "created_at": "2026-04-19T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

**Mock**：`devices/{device_id}/alerts.json`

---

## 6. `GET /api/v1/devices/{device_id}/geofences`

电子围栏定义（地图叠加与列表）。

**响应 200**

```json
{
  "geofences": [
    {
      "id": "gf_home",
      "device_id": "collar_001",
      "name": "Home",
      "fence_type": "circle",
      "is_active": true,
      "center_lat": 31.2304,
      "center_lng": 121.4737,
      "radius_meters": 140
    },
    {
      "id": "gf_park",
      "device_id": "collar_001",
      "name": "Park",
      "fence_type": "polygon",
      "is_active": true,
      "boundary": {
        "type": "Polygon",
        "coordinates": [
          [
            [121.4748, 31.2298],
            [121.4765, 31.2298],
            [121.4765, 31.2312],
            [121.4748, 31.2312],
            [121.4748, 31.2298]
          ]
        ]
      }
    }
  ]
}
```

`boundary` 遵循 GeoJSON Polygon：**外环坐标为 [lng, lat]**。

**Mock**：`devices/{device_id}/geofences.json`

---

## 7. `GET /api/v1/devices/{device_id}/trajectories`

按日汇总的轨迹索引（用于日期下拉框）。

**响应 200**

```json
{
  "device_id": "collar_001",
  "trajectories": [
    {
      "date": "2026-04-20",
      "points_count": 18,
      "total_distance_meters": 2850,
      "duration_minutes": 380
    }
  ]
}
```

**Mock**：`devices/{device_id}/trajectories.json`

---

## 8. `GET /api/v1/devices/{device_id}/trajectories/{date}`

单日轨迹点（`date` 为 `YYYY-MM-DD`），用于地图折线与历史回放 scrubber。

**响应 200**

```json
{
  "device_id": "collar_001",
  "date": "2026-04-20",
  "points": [
    {
      "latitude": 31.23035,
      "longitude": 121.4735,
      "speed": 0.1,
      "recorded_at": "2026-04-20T00:10:00.000Z"
    }
  ],
  "summary": {
    "total_distance_meters": 2850,
    "max_speed_mps": 1.1,
    "avg_speed_mps": 0.55,
    "moving_time_minutes": 220,
    "stop_time_minutes": 160
  }
}
```

**Mock**：`devices/{device_id}/trajectories/{date}.json`

---

## 9. 环境变量（本站）

| 变量 | 说明 |
|------|------|
| `PUBLIC_PET_API_MODE` | `mock`（默认）或 `live` |
| `PUBLIC_PET_API_BASE` | live 时后端 origin，无尾部斜杠 |

**CORS**：live 时后端需允许站点来源与 `GET`。

**前端说明**：地图使用 Leaflet，Demo 岛使用 `client:only="react"`，避免 SSR 引用 `window`。

---

## 10. 与设备侧 JSON 的映射（供后续对接）

| MQTT / 设备字段 | API 字段 |
|-----------------|----------|
| dev | device_id |
| lat / lng | latitude / longitude |
| bat | battery_level |
| ts | recorded_at |

围栏与告警由服务端根据位置与规则生成并写入上述接口。
