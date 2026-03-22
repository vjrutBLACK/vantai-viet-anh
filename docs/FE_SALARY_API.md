# API Báo cáo lương (Salary)

Base: `{API}/api/v1` · `Authorization: Bearer <token>`

## Công thức

- `totalTrips` = số chuyến có `driverId` = nhân viên, `tripDate` trong khoảng, `status != cancelled`
- `totalRevenue` = `SUM(trip.revenue)` các chuyến đó
- `baseSalary` = `salary_configs.baseSalary` nếu có, không thì `employees.baseSalary`
- `tripSalary` = `totalTrips × perTrip` (`perTrip` từ `salary_configs`, mặc định 0)
- `revenueBonus` = `totalRevenue × revenuePercent / 100` (`revenuePercent` mặc định 0)
- `totalSalary` = `baseSalary + tripSalary + revenueBonus`

## GET `/salaries`

**Query (bắt buộc):** `fromDate`, `toDate` (date string `YYYY-MM-DD`)

**Query (tùy chọn):**

| Param | Mô tả |
|-------|--------|
| `employeeId` | UUID — chỉ 1 nhân viên |
| `role` | `driver` \| `operator` \| `all` — `driver` = `position = 'lái xe'`, `operator` = `position = 'phụ xe'` |

Chỉ nhân viên `status = active`.

**Response:** `{ "success": true, "data": [ { employeeId, name, position, totalTrips, totalRevenue, baseSalary, tripSalary, revenueBonus, totalSalary } ] }`

## GET `/salaries/export`

Cùng query như trên. Trả về:

```json
{
  "success": true,
  "data": {
    "buffer": "<base64>",
    "fileName": "salary_<fromDate>_<toDate>.xlsx"
  }
}
```

Sheet: cột Nhân viên, Vị trí, Số chuyến, Doanh thu, Lương cứng, Lương chuyến, Thưởng doanh thu, Tổng lương.

## Cấu hình lương biến (`salary_configs`)

### GET `/salaries/config/:employeeId`

Trả về `baseSalary` (null = dùng `employee.baseSalary`), `perTrip`, `revenuePercent`, `effectiveBaseSalary`.

### PUT `/salaries/config/:employeeId`

```json
{
  "baseSalary": 8000000,
  "perTrip": 100000,
  "revenuePercent": 5
}
```

- `baseSalary: null` — xóa override, lại dùng `employees.baseSalary`
- `revenuePercent`: 5 = **5%**

## Ghi chú

- `trip.revenue` tương đương “price” trong nghiệp vụ.
- Bảng `salary_reports` (cache) **chưa** triển khai — báo cáo tính realtime (aggregation).
