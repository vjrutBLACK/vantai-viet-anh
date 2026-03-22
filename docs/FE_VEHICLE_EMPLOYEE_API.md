# Vehicle & Employee — API bổ sung

Base: `/api/v1` · JWT bắt buộc.

## Vehicle

| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/vehicles` | Body có thể dùng **`plateNumber`** hoặc **`licensePlate`**; **`type`** alias **`vehicleType`**; **`status`**: `ACTIVE` → `active`; **`maintenanceCost`** (optional): chi phí bảo trì khi status = maintenance — tự tạo giao dịch EXPENSE REPAIR trong thu chi |
| PATCH | `/vehicles/:id` | Giống POST, **`maintenanceCost`** optional — khi set kèm status=maintenance sẽ đồng bộ sang thu chi |
| GET | `/vehicles/:id/trips` | Lịch sử chuyến xe: `fromDate`, `toDate`, `page`, `limit` (optional) |
| GET | `/vehicles/:id/repairs` | Chi phí sửa chữa từ **transactions**: `expense`, `category` = **REPAIR** hoặc **maintenance** / **repair** (không phụ thuộc hoa thường) |

## Employee

| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/employees` | **`name`** alias **`fullName`**; **`position`** (vd: `lái xe`, `phụ xe`); **bắt buộc** `baseSalary` — xem bảng dưới |
| GET | `/employees` | Query: `position` (chuỗi khớp cột `employees.position`, vd `lái xe`) |
| GET | `/employees/:id/trips` | Chuyến làm **tài xế** (`driverId`): `fromDate`, `toDate`, `page`, `limit` |
| GET | `/employees/:id/salaries` | **`fromDate`**, **`toDate`** bắt buộc; **`source`**: `dynamic` (mặc định, trip + salary_configs) hoặc `transactions` (category **SALARY** / salary / payroll) |
| GET | `/employees/:id/income` | **`fromDate`**, **`toDate`**: `{ totalTrips, totalRevenue, salary }` (tính dynamic như báo cáo lương) |

### `POST /employees` — body tạo nhân viên

| Field | Bắt buộc | Ghi chú |
|-------|----------|---------|
| `fullName` **hoặc** `name` | ✅ (một trong hai) | Họ tên |
| `baseSalary` | ✅ | **Lương nền** (VND, ≥ 0). Chỉ phần cố định; **hoa hồng theo chuyến** và thu nhập khác được tính/ghi nhận ở module commission / báo cáo lương, **không** nhập vào field này. |
| `employeeCode` | | Mã NV |
| `position` | | Ví dụ: `lái xe`, `phụ xe` (không dùng field `role` riêng) |
| `phone`, `email` | | |
| `licenseNumber`, `licenseType` | | |
| `status` | | |

**400** nếu thiếu họ tên hoặc thiếu / sai kiểu `baseSalary`.

**PATCH** `/employees/:id`: có thể cập nhật `baseSalary` (optional, partial).

## Quy ước tiền

- Sửa xe / lương qua **transactions** (category như trên).
- Tổng lương “ước tính” (income / salaries?source=dynamic) từ **trips** + **salary_configs** như module `/salaries`.
