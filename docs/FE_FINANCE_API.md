# Thu – Chi & Giao dịch (Company Finance)

Base: `/api/v1` · Header `Authorization: Bearer <token>`

## Nguyên tắc

- Mọi dòng tiền là **transaction** trong DB (cột `transactionType`: `income` | `expense`; API trả về **`INCOME` | `EXPENSE`**).
- **Đồng bộ với chuyến:** khi chuyến chuyển sang **`completed`** (hoặc import Excel tạo chuyến đã `completed`), server **tự tạo** một giao dịch thu **`INCOME` + `TRIP_PAYMENT`** bằng **`revenue`** của chuyến (nếu `revenue` > 0 và chưa có giao dịch thu gắn `tripId`). Các chuyến hoàn thành **trước** khi có tính năng này không có bản ghi tự sinh — cần nhập tay hoặc tái kích hoạt luồng (tuỳ nghiệp vụ).
- **Category** chuẩn (FE): `TRIP_PAYMENT`, `FUEL`, `REPAIR`, `SALARY` (lưu DB dạng chữ HOA).
- **Ghép type ↔ category:**
  - `TRIP_PAYMENT` → chỉ **`INCOME`**
  - `FUEL`, `REPAIR`, `SALARY` → chỉ **`EXPENSE`**
- Dữ liệu cũ (`fuel`, `maintenance`, …) vẫn đọc được; báo cáo gom theo category chuẩn hóa.

## POST `/transactions`

Body (ví dụ):

```json
{
  "type": "EXPENSE",
  "category": "FUEL",
  "amount": 500000,
  "vehicleId": "uuid",
  "tripId": "uuid",
  "date": "2026-03-01",
  "note": "Đổ dầu"
}
```

**Field tương đương (alias):**

| Chuẩn mới | Alias cũ |
|-----------|----------|
| `type` | `transactionType` |
| `date` | `transactionDate` |
| `note` | `description` |

- `amount` > 0 (bắt buộc).
- `category` bắt buộc (một trong bốn mã trên).

## GET `/transactions`

Query: `page`, `limit`, **`fromDate`**, **`toDate`** (hoặc `startDate` / `endDate`), `type` (`INCOME`/`EXPENSE` hoặc income/expense), `category`, `tripId`, `vehicleId`, `employeeId`, `customerId`, `status`.

Response `data[]`: mỗi dòng có `type`, `category`, `date`, `note`, …

## Báo cáo

| Method | Path | Query |
|--------|------|--------|
| GET | `/transactions/summary` | `fromDate`, `toDate` (optional — không gửi = toàn bộ thời gian) |
| GET | `/transactions/breakdown` | `fromDate`, `toDate` |
| GET | `/transactions/export` | `fromDate`, `toDate` → `{ buffer (base64), fileName }` |
| GET | `/transactions/vehicle/:vehicleId/summary` | `fromDate`, `toDate` |
| GET | `/transactions/employee/:employeeId/summary` | `fromDate`, `toDate` |

### `/transactions/summary`

```json
{
  "totalIncome": 0,
  "totalExpense": 0,
  "profit": 0
}
```

### `/transactions/breakdown`

```json
{
  "income": { "TRIP_PAYMENT": 0 },
  "expense": { "FUEL": 0, "REPAIR": 0, "SALARY": 0 }
}
```

(Có thể có thêm key khác nếu còn dữ liệu legacy.)

## Khác

- `GET /transactions/stats` — tương thích cũ (có `byCategory`, `netAmount`, …).
- `GET /transactions/balance` — số dư lũy kế (completed).
- `GET /transactions/:id` — chi tiết (kèm quan hệ trip/vehicle/employee/customer).
- `PATCH /transactions/:id` — cập nhật (cùng quy tắc type/category).
- `DELETE /transactions/:id` — hủy (set `status = cancelled`).

## Tích hợp nghiệp vụ

- **Thu từ khách / chuyến:** `INCOME` + `TRIP_PAYMENT` + `tripId` + `customerId` (khuyến nghị).
- **Nhiên liệu:** `EXPENSE` + `FUEL` + `vehicleId`.
- **Sửa chữa:** `EXPENSE` + `REPAIR` + `vehicleId`.
- **Lương:** `EXPENSE` + `SALARY` + `employeeId`.

---

*Cập nhật `docs/FE_TICH_HOP.md` mục Transactions với các path mới.*
