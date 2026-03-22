# API Công nợ (Debt) — FE

Base: `{API}/api/v1` · Header `Authorization: Bearer <token>`

## Entity

| Field | Mô tả |
|-------|--------|
| `type` | `RECEIVABLE` (khách nợ) \| `PAYABLE` (nợ NCC) |
| `customerId` | Bắt buộc với RECEIVABLE |
| `supplierId` | Bắt buộc với PAYABLE |
| `tripId` | Optional — gắn chuyến (mỗi trip tối đa 1 công nợ) |
| `amount`, `paidAmount`, `remaining` | Tiền |
| `dueDate` | Hạn thanh toán |
| `status` | `UNPAID` \| `PAID` \| `OVERDUE` — tính lại khi đọc/ghi: `remaining ≤ 0` → PAID; quá hạn và còn nợ → OVERDUE |

## Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/debts` | Tạo công nợ thủ công |
| GET | `/debts` | Danh sách + filter/sort |
| GET | `/debts/:id` | Chi tiết |
| POST | `/debts/:id/pay` | Body `{ "amount": number }` — cộng vào đã thu, cap tại `amount` |
| DELETE | `/debts/:id` | Xóa bản ghi |

### GET `/debts` query

- `page`, `limit`
- `type`, `status`
- `customerId`, `supplierId`
- `startDate`, `endDate` (lọc theo `dueDate`)
- `sortBy`: `dueDate` \| `remaining` \| `createdAt`
- `sortOrder`: `ASC` \| `DESC`

### POST `/suppliers`

Tạo NCC (phục vụ PAYABLE): `{ "name", "code?", "status?" }`

### GET `/suppliers`

Danh sách NCC trong company.

## Tích hợp Trip

- **Tạo / import / sửa trip** → tự tạo hoặc **đồng bộ** khoản **RECEIVABLE** (`amount` = `revenue`, `paidAmount` = `paidAmount` trip, `dueDate` = `tripDate`).
- Thu công thêm qua `POST /debts/:id/pay` hoặc cập nhật `paidAmount` trên trip rồi PATCH trip (đồng bộ nợ).
