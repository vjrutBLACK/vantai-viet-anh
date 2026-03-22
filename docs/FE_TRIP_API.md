# API Trip — Tích hợp Frontend

Tài liệu mô tả luồng nghiệp vụ **Chuyến (Trip)** và hợp đồng request/response để FE tích hợp.

## Cấu hình chung

| Mục | Giá trị |
|-----|---------|
| **Base URL** | `{API_ORIGIN}/api/v1` (vd: `http://localhost:3000/api/v1`) |
| **Auth** | Header `Authorization: Bearer <access_token>` |
| **Company** | Lấy từ JWT (`companyId` trong token), **không** gửi `companyId` trên body/query |
| **Content-Type** | `application/json` (trừ upload file: `multipart/form-data`) |

### Validation

Backend dùng `ValidationPipe` với **`forbidNonWhitelisted: true`**: body/query **chỉ** được gửi các field đã khai báo trong DTO. Gửi thêm key lạ → **400** (`property X should not exist`).

Gửi số dạng **number** trong JSON (không bọc string) cho các field `@IsNumber()`.

---

## Model Trip (response)

Các field chính trả về từ API (có thể kèm quan hệ khi list/detail join):

| Field | Kiểu | Ghi chú |
|-------|------|---------|
| `id` | UUID | |
| `companyId` | UUID | |
| `tripCode` | string? | Mã chuyến (unique theo company) |
| `tripDate` | date | `YYYY-MM-DD` |
| `vehicleId`, `driverId` | UUID | Bắt buộc trước khi chuyển `in_progress` / `completed` |
| `coDriverId` | UUID? | |
| `customerId` | UUID | |
| `contactEmployeeId` | UUID? | Nhân viên hoa hồng theo chuyến (ghi đè mặc định khách) |
| `commissionRateApplied` | number? | % hoa hồng theo chuyến (ghi đè `customer.commissionRate`) |
| `paidAmount` | number | Đã thu của khách cho chuyến |
| `cargoType`, `cargoWeight`, `cargoQuantity` | | |
| `address` | string? | Địa chỉ / tuyến chuyến (một trường duy nhất) |
| `revenue` | number | Doanh thu (FE có thể gửi `price` khi tạo/sửa → map vào đây) |
| `fuelCost`, `tollCost`, `otherCosts` | number | |
| `driverSalary` | number | **Chỉ đọc** — server gán = `employees.baseSalary` của tài xế khi tạo chuyến có `driverId`, khi `PATCH` đổi `driverId`, hoặc khi `PATCH .../assign`. **FE không gửi** khi tạo/sửa. |
| `profit` | number | Server tính: `revenue - (fuel + toll + salary + other)` |
| `status` | string | **`new`**, **`assigned`**, **`in_progress`**, **`completed`**, **`cancelled`** (lưu **chữ thường**) |
| `notes` | string? | Text ghi chú; có thể điền từ field `route` khi tạo nếu không gửi `notes` |
| `createdAt`, `updatedAt` | ISO datetime | |
| `vehicle`, `driver`, `coDriver`, `customer` | object? | Có khi API join (list/detail) |

### Mapping FE → BE (tạo/cập nhật)

| FE gửi | BE lưu / xử lý |
|--------|----------------|
| `price` | `revenue` (nếu không gửi `revenue`) |
| `route` | `notes` (nếu không gửi `notes`) |
| `repairCost`, `fineCost` | Cộng vào `otherCosts` (cùng với `otherCosts` nếu có) |
| `contactEmployeeId`, `commissionRateApplied`, `paidAmount` | Cột tương ứng trên trip |
| *(không gửi)* `driverSalary` | BE set `driverSalary` = `baseSalary` của nhân viên tài xế khi có `driverId` (tạo / đổi tài xế / `PATCH .../assign`) |

---

## Luồng trạng thái (status)

```
                    ┌─────────────┐
                    │  CANCELLED  │◄─── PATCH .../status { "status": "CANCELLED" }
                    └──────▲──────┘      (từ hầu hết trạng thái, xem bảng dưới)
                           │
new ──► assigned ──► in_progress ──► completed
                  └──► completed (bỏ qua in_progress nếu cần)
```

| Chuyển | Điều kiện |
|--------|-----------|
| `new` → `assigned` | Gọi `PATCH .../assign` **hoặc** tạo trip đã có `vehicleId` + `driverId` → server set `assigned` |
| `assigned` → `in_progress` | Có `vehicleId` + `driverId` |
| `assigned` → `completed` | Có `vehicleId` + `driverId` — cho phép hoàn thành không qua `in_progress` |
| `in_progress` → `completed` | Có `vehicleId` + `driverId` → khi **completed** lần đầu, server có thể tạo bản ghi **Commission** (nếu có nhân viên + % hợp lệ) |
| * → `cancelled` | Cho phép qua `PATCH .../status` với `CANCELLED` (theo rule `to === 'cancelled'`) |

**Lưu ý:** Body `PATCH .../status` dùng **UPPERCASE** theo DTO: `NEW`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. Server so sánh sau khi `toLowerCase()`.

**Xóa trip:** `DELETE /trips/:id` chỉ khi `status === 'new'` — thực tế set `status = 'cancelled'` (soft), không xóa cứng.

**Sửa trip:** `PATCH /trips/:id` **không** cho phép khi `status === 'completed'`.

---

## Endpoints

### 1. Tạo chuyến — `POST /trips`

Tạo một chuyến mới trong **company** của user (lấy từ JWT). Không gửi `companyId` trên body.

#### Request

| Thuộc tính | Giá trị |
|------------|---------|
| **Method / URL** | `POST {BASE}/trips` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | JSON theo bảng dưới (`CreateTripDto`) |

#### Body — nhóm field

**Bắt buộc**

| Field | Kiểu | Mô tả |
|-------|------|--------|
| `tripDate` | string | Ngày chuyến — chuỗi date hợp lệ với `@IsDateString()` (thường dùng **`YYYY-MM-DD`**) |
| `customerId` | UUID | Khách hàng |

**Xe & tài xế (tùy chọn lúc tạo)**

| Field | Kiểu | Mô tả |
|-------|------|--------|
| `vehicleId` | UUID? | Xe |
| `driverId` | UUID? | Tài xế (position `lái xe` khi gán qua API khác) |
| `coDriverId` | UUID? | Phụ xe |

- Nếu **cả** `vehicleId` **và** `driverId` đều có → server gán `status = assigned`.
- Nếu thiếu một trong hai hoặc cả hai → `status = new` (bổ sung sau bằng `PATCH .../assign` hoặc `PATCH /trips/:id`).

**Mã chuyến**

| Field | Kiểu | Mô tả |
|-------|------|--------|
| `tripCode` | string? | Nếu **không gửi**: tự sinh `TRIP-YYYYMMDD-0001`, `0002`, … (theo ngày `tripDate`, unique trong company). Nếu **gửi**: dùng đúng giá trị (trim); trùng trong company → **400**. |

**Hàng hóa & địa chỉ**

| Field | Kiểu | Mô tả |
|-------|------|--------|
| `cargoType` | string? | Loại hàng |
| `cargoWeight` | number? | Trọng lượng |
| `cargoQuantity` | number? | Số lượng (integer trong nghiệp vụ) |
| `address` | string? | **Một** trường mô tả địa chỉ / tuyến chuyến (không tách điểm đi–đến) |

**Doanh thu & chi phí (số JSON, không bọc string)**

| Field | Kiểu | Mô tả |
|-------|------|--------|
| `revenue` **hoặc** `price` | number? | Doanh thu — server dùng `revenue ?? price ?? 0` |
| `paidAmount` | number? | Đã thu từ khách cho chuyến |
| `fuelCost` | number? | Chi phí nhiên liệu |
| `tollCost` | number? | Cầu đường |
| `otherCosts` | number? | Chi phí khác (trực tiếp) |
| `repairCost` | number? | Cộng dồn vào `otherCosts` (cùng kỳ tạo) |
| `fineCost` | number? | Cộng dồn vào `otherCosts` (cùng kỳ tạo) |

**Công thức gộp chi phí phụ:**  
`otherCosts` lưu = `otherCosts` (nếu có) + `repairCost` + `fineCost`.

**Hoa hồng theo chuyến**

| Field | Kiểu | Mô tả |
|-------|------|--------|
| `contactEmployeeId` | UUID \| `null`? | NV nhận hoa hồng (ghi đè mặc định từ khách) |
| `commissionRateApplied` | number \| `null`? | % hoa hồng theo chuyến |

**Ghi chú & alias**

| Field | Kiểu | Mô tả |
|-------|------|--------|
| `notes` | string? | Ghi chú — **ưu tiên** hơn `route` nếu cả hai đều có |
| `route` | string? | Nếu **không** gửi `notes` → nội dung ghi vào `notes` |

**Trạng thái**

| Field | Kiểu | Mô tả |
|-------|------|--------|
| `status` | string? | Thường **không gửi**; server gán `new` hoặc `assigned` như trên |

#### Không có trong body tạo chuyến

| Nội dung | Lý do |
|----------|--------|
| `driverSalary` | **Không** có trong DTO — server set = `employees.baseSalary` của tài xế **khi** request có `driverId`. Nếu chưa có `driverId` lúc tạo → `driverSalary` mặc định `0` cho đến khi gán tài xế. |
| `companyId` | Lấy từ JWT |
| `profit` | Server tính: `revenue - (fuelCost + tollCost + driverSalary + otherCosts)` sau khi đã gán `driverSalary` (nếu có `driverId`) |

#### Ví dụ — tối thiểu

```json
{
  "tripDate": "2026-03-19",
  "customerId": "eea85151-f8a0-4917-8ce9-9d60040533ea"
}
```

#### Ví dụ — đủ xe + tài xế + tài chính

```json
{
  "tripDate": "2026-03-19",
  "customerId": "eea85151-f8a0-4917-8ce9-9d60040533ea",
  "vehicleId": "1112676f-7c74-407b-b3f7-31c5e11b292e",
  "driverId": "045bf13e-c9a7-4a94-bb6a-eb624fd22574",
  "cargoType": "Xi măng",
  "address": "Hà Nội — Hải Phòng",
  "price": 10000000,
  "paidAmount": 1000000,
  "fuelCost": 0,
  "tollCost": 0,
  "otherCosts": 0,
  "notes": "Giao trong ngày",
  "contactEmployeeId": null,
  "commissionRateApplied": null
}
```

#### Response — thành công

**HTTP 201** (mặc định Nest cho `POST`, trừ khi project đặt `@HttpCode` khác). Body dạng:

```json
{
  "success": true,
  "data": {
    "id": "…",
    "companyId": "…",
    "tripCode": "TRIP-20260319-0001",
    "tripDate": "2026-03-19",
    "vehicleId": "…",
    "driverId": "…",
    "customerId": "…",
    "revenue": 10000000,
    "driverSalary": 5000000,
    "profit": 5000000,
    "status": "assigned",
    "…": "các field khác như entity Trip"
  }
}
```

`driverSalary` trong response phản ánh **`baseSalary`** của nhân viên tài xế tại thời điểm tạo (nếu đã có `driverId`).

#### Lỗi thường gặp

| HTTP | Nguyên nhân |
|------|-------------|
| **400** | Thiếu/sai kiểu field bắt buộc; gửi key không thuộc DTO (`forbidNonWhitelisted`); `tripCode` trùng |
| **401** | Thiếu / hết hạn token |

---

### 2. Danh sách chuyến

`GET /trips`

**Query — `QueryTripDto`**

| Param | Mặc định | Mô tả |
|-------|----------|-------|
| `page` | 1 | integer ≥ 1 |
| `limit` | 20 | integer ≥ 1 |
| `startDate`, `endDate` | | Lọc `tripDate` (date string) |
| `vehicleId`, `driverId`, `customerId` | | UUID |
| `status` | | string (vd: `new`, `completed`) |
| `search` | | Tìm trong `tripCode`, `address` (ILIKE) |

**Response:**

```json
{
  "success": true,
  "data": [ /* trips + relations */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

### 3. Chi tiết chuyến

`GET /trips/:id`

**Response:** `{ "success": true, "data": { ...trip, vehicle, driver, coDriver, customer } }`

---

### 4. Cập nhật chuyến

`PATCH /trips/:id`

- Partial update; mapping `price` / `route` / `repairCost` / `fineCost` giống tạo mới.
- **400** nếu trip đã `completed`.

---

### 5. Gán xe + tài xế

`PATCH /trips/:id/assign`

**Body:**

```json
{
  "vehicleId": "uuid",
  "driverId": "uuid"
}
```

- Kiểm tra xe **active**, tài xế **active** + position `lái xe`.
- Không trùng xe/tài xế với chuyến khác cùng `tripDate` (trừ `cancelled`).
- Nếu đang `new` → có thể chuyển `assigned`.

---

### 6. Đổi trạng thái

`PATCH /trips/:id/status`

**Body:**

```json
{ "status": "IN_PROGRESS" }
```

Giá trị hợp lệ: `NEW`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` (DTO validate đúng từ này).

---

### 7. Hủy / xóa (soft)

`DELETE /trips/:id`

- Chỉ khi `status === 'new'`.
- Set `cancelled`.

---

### 8. Thống kê (chuyến hoàn thành)

`GET /trips/stats?startDate=&endDate=`

- Chỉ tính trip `status = completed`.

**Response:** `{ "success": true, "data": { ... } }` (chi tiết aggregate trong service).

---

### 9. Export Excel

`GET /trips/export`

- Cùng query filter như `GET /trips` (page/limit bị override nội bộ để export tối đa).
- **Response:** `{ "success": true, "data": { "buffer": "<base64>", "fileName": "trips_export_YYYY-MM-DD.xlsx" } }`
- FE: decode base64 → tải file.
- **Cột địa chỉ:** một cột **Địa chỉ chuyến** (`address`) — không còn tách điểm đi / điểm đến / khoảng cách.

---

### 10. Import chuyến (queue)

`POST /trips/import` — `multipart/form-data`

| Part | Mô tả |
|------|--------|
| `file` | File Excel — **cột G = địa chỉ chuyến**; từ cột H trở đi: loại hàng, trọng lượng, số lượng, doanh thu, … (xem `EXCEL_MAPPING.md`) |
| `sheetName` | (optional) |
| `overwrite` | `true` / `false` string |

**Response:** `{ "success": true, "data": { "importId", "status": "processing", "message" } }`

---

### 11. Trạng thái job import

`GET /trips/import/:importId`

**Response:** `{ "success": true, "data": { "id", "status", "progress", "result" } }`

---

### 12. Validate file import (không ghi DB)

`POST /trips/import/validate` — `multipart/form-data` + `file`, optional `sheetName`

**Response:** `{ "success": true, "data": { ... } }`

---

## Lỗi thường gặp

| HTTP | Nguyên nhân gợi ý |
|------|-------------------|
| 401 | Thiếu/sai JWT |
| 400 | Validation (field thừa, sai kiểu, chuyển status không hợp lệ, completed không cho sửa, xe/tài xế không đủ điều kiện, …) |
| 404 | Sai `id` hoặc không đúng company |

Message lỗi từ Nest: `message` hoặc mảng `message` (validation).

---

## Checklist UI/UX — Luồng Trip

Dùng để review trước khi ship FE.

### Danh sách & tìm kiếm
- [ ] Phân trang (`page`, `limit`) + hiển thị tổng bản ghi / tổng trang.
- [ ] Bộ lọc: khoảng ngày, khách, xe, tài xế, trạng thái.
- [ ] Ô tìm kiếm (theo mã chuyến / địa chỉ chuyến) — align với `search`.
- [ ] Badge màu / nhãn tiếng Việt rõ ràng cho từng `status` (`new`, `assigned`, `in_progress`, `completed`, `cancelled`).

### Tạo chuyến
- [ ] Form bắt buộc: ngày chuyến, khách hàng.
- [ ] Chọn xe + tài xế (optional khi tạo); nếu đủ → user hiểu chuyến ở trạng thái **Đã gán** (`assigned`).
- [ ] Field doanh thu: có thể dùng nhãn “Giá / Doanh thu” gửi `price` hoặc `revenue` (không gửi cả hai mơ hồ — ưu tiên một).
- [ ] “Tuyến / Lộ trình” (`route`) vs “Ghi chú” (`notes`): giải thích `notes` thắng khi cả hai có (hoặc chỉ hiển thị một ô tùy nghiệp vụ).
- [ ] `paidAmount`, chi phí sửa chữa / phạt: nhập số, format tiền VND.
- [ ] Hoa hồng theo chuyến: `contactEmployeeId`, `commissionRateApplied` (optional) — tooltip “ghi đè cấu hình khách”.
- [ ] Submit: loading, hiển thị lỗi 400 từ API (field-level nếu parse được).

### Chi tiết chuyến
- [ ] Hiển thị đầy đủ tài chính + `profit`.
- [ ] Hiển thị quan hệ: khách, xe, tài xế (tên/mã) từ object join.
- [ ] Ẩn hoặc disable **Sửa** khi `status === 'completed'`.

### Gán xe / tài xế
- [ ] Action riêng hoặc trong form — gọi `PATCH .../assign` với đủ 2 UUID.
- [ ] Thông báo lỗi thân thiện khi xe bận / tài xế bận cùng ngày hoặc không đủ điều kiện.

### Đổi trạng thái
- [ ] Chỉ hiện các nút chuyển **hợp lệ** theo bảng luồng (tránh bấm rồi 400).
- [ ] Gửi đúng **UPPERCASE** trong body `status`.
- [ ] Trước `IN_PROGRESS` / `COMPLETED`: kiểm tra đã có xe + tài xế (FE pre-check + vẫn handle lỗi API).
- [ ] Khi chuyển **Hoàn thành**: confirm (ảnh hưởng commission / không sửa sau).

### Hủy / xóa
- [ ] `DELETE` chỉ cho `new` — UI ẩn hoặc giải thích; có thể dùng `PATCH` **CANCELLED** cho các trạng thái khác nếu nghiệp vụ cho phép.
- [ ] Phân biệt “Xóa” (chỉ new) vs “Hủy chuyến” (cancelled).

### Import / Export
- [ ] Export: gọi `GET /trips/export`, decode base64, tải `.xlsx`.
- [ ] Import: upload → hiển thị `importId`, poll `GET /trips/import/:importId` hoặc UX tương đương.
- [ ] Validate trước: `POST .../import/validate` để báo lỗi sớm.

### Chung
- [ ] Mọi request có `Authorization`.
- [ ] Empty state, skeleton loading, toast thành công/thất bại.
- [ ] Timezone/ngày: hiển thị local nhưng gửi `tripDate` dạng `YYYY-MM-DD` đúng calendar day.
- [ ] Không gửi field thừa trong JSON (tránh 400 whitelist).

---

*Tài liệu căn cứ code tại `src/modules/trips/` và `src/entities/trip.entity.ts`. Cập nhật khi DTO/thay đổi rule nghiệp vụ.*
