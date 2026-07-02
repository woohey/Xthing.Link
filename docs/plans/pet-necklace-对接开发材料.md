# PetNecklace 系统对接开发材料

本文面向 **PetNecklace 仓库**（固件、MQTT 采集、HTTP 服务）的开发者，说明与 **xThing.Link 网站** 协同时的职责划分、数据流、接口与字段约定。实现时请以 JSON **字段名（英文）** 为准，便于两端一致。

---

## 1. 分工与目标

| 侧 | 职责 |
|----|------|
| **PetNecklace 项目** | NB-IoT 设备固件；设备经 **MQTT** 上报数据；**采集服务** 订阅 Broker、入库、围栏/告警逻辑；对外提供 **HTTPS REST API**（见下文）。 |
| **xThing.Link（本站）** | 静态站点；`/demos/pet-necklace/` 仅作为 **展示端**：通过浏览器 `fetch` 调用你们的 API，或开发阶段使用本站内置的 **Mock 静态 JSON**。不涉及设备直连、不托管 MQTT Broker。 |

**目标**：网站 Dashboard 能展示：设备状态、最新定位、按日轨迹与回放、电子围栏、告警列表。设备数量按「少量」设计即可。

---

## 2. 端到端数据流（推荐）

```
[项圈 STM32 + 蜂窝模组] --MQTT publish--> [MQTT Broker]
                                              ↑
[采集/业务服务] --MQTT subscribe--> 解析 JSON → 入库 → 业务（围栏/告警/轨迹聚合）
       ↓
  PostgreSQL 等持久化
       ↓
  REST API（HTTPS，/api/v1/...）
       ↓
[xThing.Link 浏览器] GET JSON → 地图与列表展示
```

**MQTT 与 NAT**：NB-IoT 常处于运营商 NAT 后，设备难以被公网直连；由设备 **主动连接 Broker** 上报，服务端订阅，与《MQTT 改造方案》一致。详见 PetNecklace 仓库内 `MQTT改造方案.md`。

---

## 3. 设备侧上报 JSON（建议与 HTTP 对齐）

采集服务从 MQTT 收到载荷后，落库并映射为 API 字段。建议设备或网关统一使用 **UTF-8 JSON**，示例：

```json
{
  "dev": "collar_001",
  "lat": 31.2304,
  "lng": 121.4737,
  "bat": 87,
  "ts": "2026-04-20T07:58:00.000Z"
}
```

**与 HTTP API 的对应关系（建议）**

| 设备/MQTT 字段 | API / 库表含义 |
|----------------|----------------|
| dev | device_id |
| lat / lng | latitude / longitude（WGS84） |
| bat | battery_level（0–100） |
| ts | recorded_at（ISO 8601，建议 UTC） |

可按实际增加步数、海拔等，但需在 API 文档与库表中同步扩展。

---

## 4. HTTP API 一览（v1）

**Base URL**：由你们部署决定，例如 `https://pet-api.xthing.link`，路径统一前缀：

`https://<host>/api/v1`

**认证**：首版可为内网或固定只读 Token；若启用，请在响应中约定 401 行为，并为浏览器配置 **CORS**（允许 xThing.Link 站点来源、`GET`、必要时 `Authorization`）。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/devices` | 设备列表 |
| GET | `/devices/{device_id}/locations/latest` | 最新一条定位 |
| GET | `/devices/{device_id}/status` | 设备在线与运行态 |
| GET | `/devices/{device_id}/alerts` | 告警列表 |
| GET | `/devices/{device_id}/geofences` | 电子围栏定义 |
| GET | `/devices/{device_id}/trajectories` | 按日轨迹索引 |
| GET | `/devices/{device_id}/trajectories/{date}` | 单日轨迹点，`date` 格式 `YYYY-MM-DD` |

**详细字段与示例 JSON**：与 xThing.Link 仓库内 **`docs/plans/pet-necklace-api-contract.md`** 保持一致即可（该文件即对接契约）。

---

## 5. 关键数据形状摘要

### 5.1 最新定位 `locations/latest`

- `latitude` / `longitude`：number  
- `recorded_at` / `received_at`：string，ISO 8601  

### 5.2 设备状态 `status`

- `online`：boolean  
- `last_seen_at`：string  
- `firmware_version`、`battery_level`、`charging`、`motion_state`、`network_mode`：按需  

### 5.3 告警 `alerts`

- `alert_type`：如 `geofence_enter`、`geofence_exit`、`low_battery` 等  
- `message`、`created_at`、`is_read`  
- 可选 `latitude` / `longitude`、`geofence_id`  

### 5.4 围栏 `geofences`

- `fence_type`：`circle` 或 `polygon`  
- 圆形：`center_lat`、`center_lng`、`radius_meters`（米）  
- 多边形：`boundary` 为 GeoJSON **Polygon**，外环坐标为 **[经度, 纬度]**  

### 5.5 轨迹

- `trajectories`：返回多日摘要（`date`、`points_count`、距离等）  
- `trajectories/{date}`：当日 `points[]`，每点含 `latitude`、`longitude`、`recorded_at`，可选 `speed`  

---

## 6. xThing.Link 侧如何对接

- 构建或部署时设置环境变量（**仅前端可见，勿放密钥**）：  
  - `PUBLIC_PET_API_MODE=live`  
  - `PUBLIC_PET_API_BASE=https://你们的 API 根`（无尾部斜杠，不含 `/api/v1`）  
- 浏览器从静态页请求 `PUBLIC_PET_API_BASE + /api/v1/...`，需 **CORS** 放行本站域名。  
- 开发阶段本站可使用 `public/mock/pet-necklace/v1/` 下静态 JSON，字段与上表一致，便于前端先行联调。

---

## 7. 联调建议顺序

1. 部署 Broker + 采集服务，设备或模拟器 MQTT 上报成功。  
2. 实现 `GET /health`、`GET /devices`、`GET /.../locations/latest`。  
3. 实现 `status`、`trajectories` + `trajectories/{date}`（可先短轨迹）。  
4. 实现 `geofences`、`alerts`（可先写死或规则生成）。  
5. 配置 HTTPS 与 CORS，将 `PUBLIC_PET_API_*` 指向现网，在 xThing.Link Demo 页验证。

---

## 8. 参考文件位置（xThing.Link 仓库）

| 内容 | 路径 |
|------|------|
| HTTP 契约（字段级） | `docs/plans/pet-necklace-api-contract.md` |
| 本文（对接总览） | `docs/plans/pet-necklace-对接开发材料.md` |
| Mock 数据示例 | `public/mock/pet-necklace/v1/` |
| 前端 API 封装 | `src/lib/pet-necklace-api.ts` |

PetNecklace 固件与 MQTT 细节以 **PetNecklace 仓库** 内 `MQTT改造方案.md`、`docs/specs/pet-necklace-server.md`（若仍维护）为准；HTTP 部分建议以 **`pet-necklace-api-contract.md`** 为单一事实来源并逐步在服务端实现。

---

## 9. 修订记录

- 2026-04-20：初版，与当前 Demo 契约及 Mock 对齐。
