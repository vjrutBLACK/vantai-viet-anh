# Hướng dẫn tích hợp Frontend (API Backend)

Tài liệu dành cho team FE: cách gọi API, auth, format response, và danh sách endpoint theo module.

---

## 1. Cấu hình chung

| Mục | Giá trị |
|-----|---------|
| **Base URL** | `{API_ORIGIN}/api/v1` (vd: `http://localhost:3000/api/v1`) |
| **JSON** | `Content-Type: application/json` (trừ upload file: `multipart/form-data`) |
| **Đa tenant** | `companyId` lấy từ **JWT** sau khi đăng nhập — **không** gửi `companyId` trong body (trừ khi backend có endpoint đặc biệt) |

### Response chuẩn

Hầu hết endpoint trả:

```json
{ "success": true, "data": { ... } }
```

hoặc list:

```json
{ "success": true, "data": [...], "pagination": { "page", "limit", "total", "totalPages" } }
```

Lỗi validation (HTTP **400**): body có field không thuộc DTO (`forbidNonWhitelisted`) hoặc sai kiểu.

### Validation quan trọng

- Chỉ gửi **đúng field** khai báo trong DTO (tránh thừa key → 400).
- Số tiền trong JSON dùng **number**, không bọc string.
- Ngày dạng **`YYYY-MM-DD`** khi API yêu cầu `IsDateString`.

---

## 2. Xác thực (Auth)

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| POST | `/auth/login` | Không | Body: `{ "email", "password" }` |
| POST | `/auth/refresh` | Không | Body: `{ "refreshToken" }` |
| POST | `/auth/logout` | JWT | Client xóa token là đủ (stateless) |
| GET | `/auth/me` | JWT | Thông tin user: `id`, `email`, `fullName`, `role`, `companyId` |

**Header sau khi login:**

```http
Authorization: Bearer <access_token>
```

JWT thường chứa `companyId`, `permissions` (RBAC) — dùng để ẩn/hiện menu và gọi API có guard quyền.

---

## 3. RBAC & lỗi 403

Một số API dùng `@Permissions('...')` (vd: import, users). Nếu user thiếu quyền → **403**.

Permission mẫu (seed): `MANAGE_EMPLOYEE`, `MANAGE_VEHICLE`, `CREATE_TRIP`, `UPDATE_TRIP`, `ASSIGN_DRIVER`, `VIEW_REPORT`, …

---

## 4. Bảng endpoint theo module

### 4.1 Chuyến (Trips)

| Method | Path | Ghi chú |
|--------|------|---------|
| POST | `/trips` | Tạo chuyến — xem chi tiết field tại `FE_TRIP_API.md` |
| GET | `/trips` | Query: `page`, `limit`, `startDate`, `endDate`, `vehicleId`, `driverId`, `customerId`, `status`, `search` (mã chuyến / `address`) |
| GET | `/trips/stats` | `startDate`, `endDate` |
| GET | `/trips/export` | Export Excel (base64 trong `data.buffer`) |
| GET | `/trips/import/:importId` | Trạng thái job import |
| POST | `/trips/import` | multipart `file` |
| POST | `/trips/import/validate` | Validate file |
| GET | `/trips/:id` | Chi tiết |
| PATCH | `/trips/:id` | Sửa (không cho sửa khi `completed`) |
| PATCH | `/trips/:id/assign` | `{ vehicleId, driverId }` |
| PATCH | `/trips/:id/status` | `{ status }` — giá trị DTO: `NEW`, `ASSIGNED`, … |
| DELETE | `/trips/:id` | Chỉ khi status `new` (soft → cancelled) |

**Chi tiết luồng trạng thái, mapping `price`/`route`, commission:** → **`docs/FE_TRIP_API.md`**

---

### 4.2 Xe (Vehicles)

| Method | Path |
|--------|------|
| POST | `/vehicles` |
| GET | `/vehicles` — `page`, `limit`, `pageSize`, `search`, `status`, `vehicleType` |
| GET | `/vehicles/stats` |
| GET | `/vehicles/:id/trips` — `fromDate`, `toDate`, `page`, `limit` |
| GET | `/vehicles/:id/repairs` — `fromDate`, `toDate` (từ transactions: sửa chữa) |
| GET | `/vehicles/:id` |
| PATCH | `/vehicles/:id` |
| DELETE | `/vehicles/:id` |

Alias body: `plateNumber` / `licensePlate`, `type` / `vehicleType`, `ACTIVE` → `active`.

→ **`docs/FE_VEHICLE_EMPLOYEE_API.md`**

---

### 4.3 Nhân viên (Employees)

| Method | Path |
|--------|------|
| POST | `/employees` — bắt buộc `baseSalary` (lương nền; hoa hồng chuyến tính riêng) |
| GET | `/employees` — `page`, `limit`, `search`, `position` (vd: `lái xe`), `status` |
| GET | `/employees/drivers` — `search` |
| GET | `/employees/:id/trips` |
| GET | `/employees/:id/salaries` — bắt buộc `fromDate`, `toDate`; `source=dynamic` \| `transactions` |
| GET | `/employees/:id/income` — `fromDate`, `toDate` |
| GET | `/employees/:id/commissions` — `start`, `end` (YYYY-MM) |
| GET | `/employees/:id` |
| PATCH | `/employees/:id` |
| DELETE | `/employees/:id` |

→ **`docs/FE_VEHICLE_EMPLOYEE_API.md`**

---

### 4.4 Lương (Salaries)

| Method | Path |
|--------|------|
| GET | `/salaries` — bắt buộc `fromDate`, `toDate`; `employeeId`, `role`, `sortBy`, `sortOrder` |
| GET | `/salaries/export` |
| GET | `/salaries/config/:employeeId` |
| PUT | `/salaries/config/:employeeId` |

→ **`docs/FE_SALARY_API.md`**

---

### 4.5 Công nợ (Debts) & Nhà cung cấp (Suppliers)

| Method | Path |
|--------|------|
| POST | `/debts` |
| GET | `/debts` |
| GET | `/debts/:id` |
| POST | `/debts/:id/pay` — `{ "amount" }` |
| DELETE | `/debts/:id` |
| POST | `/suppliers` |
| GET | `/suppliers` |

→ **`docs/FE_DEBT_API.md`**

---

### 4.6 Khách hàng (Customers)

| Method | Path |
|--------|------|
| POST | `/customers` |
| GET | `/customers` |
| GET | `/customers/:id` — chi tiết + công nợ tóm tắt |
| GET | `/customers/:id/trips` — `page`, `limit` |
| GET | `/customers/:id/payments` — `page`, `limit` |
| PATCH | `/customers/:id` |
| DELETE | `/customers/:id` |

---

### 4.7 Giao dịch (Transactions) — Thu / Chi

| Method | Path |
|--------|------|
| POST | `/transactions` — body: `type`/`INCOME`\|`EXPENSE`, `category` (`TRIP_PAYMENT`, `FUEL`, `REPAIR`, `SALARY`), `date`, `amount`, … |
| GET | `/transactions` — `fromDate`/`toDate` hoặc `startDate`/`endDate`, `type`, `category`, … |
| GET | `/transactions/summary` — tổng thu / chi / lợi nhuận |
| GET | `/transactions/breakdown` — theo danh mục |
| GET | `/transactions/export` — Excel (base64) |
| GET | `/transactions/vehicle/:vehicleId/summary` |
| GET | `/transactions/employee/:employeeId/summary` |
| GET | `/transactions/stats` |
| GET | `/transactions/balance` |
| GET | `/transactions/:id` |
| PATCH | `/transactions/:id` |
| DELETE | `/transactions/:id` |

**Category chuẩn:** `TRIP_PAYMENT` (thu chuyến), `FUEL`, `REPAIR`, `SALARY`. **Type:** API trả `INCOME`/`EXPENSE`; ghép category đúng loại (xem `FE_FINANCE_API.md`).

→ **`docs/FE_FINANCE_API.md`**

---

### 4.8 Báo cáo (Reports)

| Method | Path |
|--------|------|
| GET | `/reports/dashboard` — `startDate`, `endDate` |
| GET | `/reports/vehicles` |
| GET | `/reports/drivers` |
| GET | `/reports/customers` |
| GET | `/reports/profit-loss` — `startDate`, `endDate` bắt buộc; `groupBy` optional |

---

### 4.9 Người dùng hệ thống (Users) — cần quyền

| Method | Path |
|--------|------|
| GET | `/users` — `page`, `limit` |
| POST | `/users` |
| PATCH | `/users/:id/roles` — body `{ "roles": ["ADMIN", ...] }` |

---

### 4.10 Import Excel — cần quyền `MANAGE_EMPLOYEE`

| Method | Path |
|--------|------|
| POST | `/import/:type` — `type` ∈ `vehicles` \| `employees` \| `customers`; multipart `file` (.xlsx, max ~5MB) |

---

### 4.11 Công ty (Companies)

Chỉ truy cập **đúng company** của user (`id` = `companyId` trong JWT).

| Method | Path |
|--------|------|
| GET | `/companies/:id` |
| PATCH | `/companies/:id` |

---

## 5. Gợi ý triển khai FE

1. **Axios/fetch wrapper:** gắn `Authorization`, xử lý 401 (refresh hoặc logout), parse `success` / `message`.
2. **Bảng có phân trang:** dùng `pagination` từ response.
3. **Export Excel:** decode `data.buffer` base64 → `Blob` → tải file (trips, salaries).
4. **Upload:** `FormData` + field `file`; không set `Content-Type` thủ công (browser tự thêm boundary).
5. **Timezone:** hiển thị theo locale user; gửi `tripDate` / filter ngày đúng calendar day (`YYYY-MM-DD`).

---

## 6. Tài liệu chi tiết (đã có trong repo)

| File | Nội dung |
|------|----------|
| `docs/FE_TRIP_API.md` | Luồng Trip, status, mapping FE→BE |
| `docs/FE_DEBT_API.md` | Công nợ, suppliers, tích hợp trip |
| `docs/FE_SALARY_API.md` | Báo cáo lương, cấu hình salary_configs |
| `docs/FE_VEHICLE_EMPLOYEE_API.md` | Xe/NV: trips history, repairs, income, aliases |

---

## 7. Checklist nhanh trước khi ship

- [ ] Đăng nhập → lưu access token → mọi request (trừ login/refresh) có header Bearer.
- [ ] Không gửi field thừa trong body JSON (whitelist).
- [ ] Màn hình Trip / Debt / Salary đúng query bắt buộc (`fromDate`/`toDate` nơi cần).
- [ ] Xử lý 400 (validation), 401, 403, 404 thân thiện (toast/message).
- [ ] Export file: đúng decode base64.

*Nếu backend đổi version API, cập nhật song song file này và các doc module.*
