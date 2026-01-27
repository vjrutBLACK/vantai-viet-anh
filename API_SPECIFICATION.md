# API Specification - Hệ thống Quản lý Vận tải

## Base URL
```
/api/v1
```

## Authentication
Tất cả API (trừ auth endpoints) yêu cầu JWT token trong header:
```
Authorization: Bearer <token>
```

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { ... }
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 1. Authentication & Authorization

### POST /api/v1/auth/login
Đăng nhập

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "Nguyễn Văn A",
      "role": "admin",
      "companyId": "uuid"
    }
  }
}
```

### POST /api/v1/auth/logout
Đăng xuất

### POST /api/v1/auth/refresh
Refresh token

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### GET /api/v1/auth/me
Lấy thông tin user hiện tại

---

## 2. Companies

### GET /api/v1/companies/:id
Lấy thông tin công ty

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Công ty ABC",
    "code": "ABC001",
    "address": "123 Đường XYZ",
    "phone": "0123456789",
    "email": "contact@abc.com",
    "taxCode": "1234567890"
  }
}
```

### PUT /api/v1/companies/:id
Cập nhật thông tin công ty

**Request:**
```json
{
  "name": "Công ty ABC Updated",
  "address": "456 Đường XYZ",
  "phone": "0987654321"
}
```

---

## 3. Vehicles

### GET /api/v1/vehicles
Danh sách xe (với filter, pagination, search)

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `search` (string) - Tìm theo biển số, hãng, model
- `status` (string) - active, inactive, maintenance
- `vehicleType` (string)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "licensePlate": "29A-12345",
      "vehicleType": "tải",
      "brand": "Hyundai",
      "model": "HD370",
      "year": 2020,
      "capacity": 10.5,
      "status": "active"
    }
  ],
  "pagination": { ... }
}
```

### GET /api/v1/vehicles/:id
Chi tiết xe

### POST /api/v1/vehicles
Tạo mới xe

**Request:**
```json
{
  "licensePlate": "29A-12345",
  "vehicleType": "tải",
  "brand": "Hyundai",
  "model": "HD370",
  "year": 2020,
  "capacity": 10.5,
  "status": "active"
}
```

### PUT /api/v1/vehicles/:id
Cập nhật xe

### DELETE /api/v1/vehicles/:id
Xóa xe (soft delete)

### GET /api/v1/vehicles/stats
Thống kê xe

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 15,
    "active": 12,
    "inactive": 2,
    "maintenance": 1
  }
}
```

---

## 4. Employees

### GET /api/v1/employees
Danh sách nhân viên

**Query Parameters:**
- `page`, `limit`, `search`
- `position` (string) - lái xe, phụ xe, quản lý
- `status` (string)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "employeeCode": "NV001",
      "fullName": "Nguyễn Văn A",
      "phone": "0123456789",
      "email": "nva@example.com",
      "position": "lái xe",
      "licenseNumber": "123456789",
      "licenseType": "C",
      "status": "active"
    }
  ],
  "pagination": { ... }
}
```

### GET /api/v1/employees/:id
Chi tiết nhân viên

### POST /api/v1/employees
Tạo mới nhân viên

**Request:**
```json
{
  "employeeCode": "NV001",
  "fullName": "Nguyễn Văn A",
  "phone": "0123456789",
  "email": "nva@example.com",
  "position": "lái xe",
  "licenseNumber": "123456789",
  "licenseType": "C"
}
```

### PUT /api/v1/employees/:id
Cập nhật nhân viên

### DELETE /api/v1/employees/:id
Xóa nhân viên

### GET /api/v1/employees/drivers
Chỉ lấy danh sách lái xe

**Query Parameters:**
- `search` (string)

---

## 5. Customers

### GET /api/v1/customers
Danh sách khách hàng

**Query Parameters:**
- `page`, `limit`, `search`
- `status` (string)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "customerCode": "KH001",
      "name": "Công ty XYZ",
      "phone": "0987654321",
      "email": "contact@xyz.com",
      "address": "789 Đường ABC",
      "taxCode": "9876543210",
      "contactPerson": "Nguyễn Văn B",
      "status": "active"
    }
  ],
  "pagination": { ... }
}
```

### GET /api/v1/customers/:id
Chi tiết khách hàng

### POST /api/v1/customers
Tạo mới khách hàng

**Request:**
```json
{
  "customerCode": "KH001",
  "name": "Công ty XYZ",
  "phone": "0987654321",
  "email": "contact@xyz.com",
  "address": "789 Đường ABC",
  "taxCode": "9876543210",
  "contactPerson": "Nguyễn Văn B"
}
```

### PUT /api/v1/customers/:id
Cập nhật khách hàng

### DELETE /api/v1/customers/:id
Xóa khách hàng

---

## 6. Trips (Core)

### GET /api/v1/trips
Danh sách chuyến xe

**Query Parameters:**
- `page`, `limit`
- `startDate` (date) - YYYY-MM-DD
- `endDate` (date) - YYYY-MM-DD
- `vehicleId` (uuid)
- `driverId` (uuid)
- `customerId` (uuid)
- `status` (string) - pending, in_progress, completed, cancelled
- `search` (string) - Tìm theo mã chuyến, điểm đi, điểm đến

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tripCode": "CH001",
      "tripDate": "2025-07-15",
      "vehicle": {
        "id": "uuid",
        "licensePlate": "29A-12345"
      },
      "driver": {
        "id": "uuid",
        "fullName": "Nguyễn Văn A"
      },
      "coDriver": {
        "id": "uuid",
        "fullName": "Trần Văn B"
      },
      "customer": {
        "id": "uuid",
        "name": "Công ty XYZ"
      },
      "cargoType": "Gạo",
      "cargoWeight": 8.5,
      "cargoQuantity": 1,
      "origin": "Hà Nội",
      "destination": "Hồ Chí Minh",
      "distance": 1700,
      "revenue": 15000000,
      "fuelCost": 3000000,
      "tollCost": 500000,
      "driverSalary": 2000000,
      "otherCosts": 500000,
      "profit": 9000000,
      "status": "completed",
      "notes": "Giao hàng đúng hạn"
    }
  ],
  "pagination": { ... }
}
```

### GET /api/v1/trips/:id
Chi tiết chuyến xe

### POST /api/v1/trips
Tạo mới chuyến xe

**Request:**
```json
{
  "tripCode": "CH001",
  "tripDate": "2025-07-15",
  "vehicleId": "uuid",
  "driverId": "uuid",
  "coDriverId": "uuid", // optional
  "customerId": "uuid",
  "cargoType": "Gạo",
  "cargoWeight": 8.5,
  "cargoQuantity": 1,
  "origin": "Hà Nội",
  "destination": "Hồ Chí Minh",
  "distance": 1700,
  "revenue": 15000000,
  "fuelCost": 3000000,
  "tollCost": 500000,
  "driverSalary": 2000000,
  "otherCosts": 500000,
  "notes": "Giao hàng đúng hạn"
}
```

**Note:** `profit` sẽ được tính tự động: `revenue - (fuelCost + tollCost + driverSalary + otherCosts)`

### PUT /api/v1/trips/:id
Cập nhật chuyến xe

### DELETE /api/v1/trips/:id
Xóa chuyến xe (soft delete)

### GET /api/v1/trips/stats
Thống kê chuyến xe

**Query Parameters:**
- `startDate` (date)
- `endDate` (date)
- `vehicleId` (uuid) - optional
- `driverId` (uuid) - optional
- `customerId` (uuid) - optional

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTrips": 150,
    "completedTrips": 145,
    "totalRevenue": 2250000000,
    "totalCosts": 1350000000,
    "totalProfit": 900000000,
    "averageProfitPerTrip": 6000000
  }
}
```

### POST /api/v1/trips/import
Import chuyến từ Excel

**Request:** (multipart/form-data)
- `file` (file) - Excel file (.xls, .xlsx)
- `sheetName` (string, optional) - Tên sheet, nếu không có sẽ dùng sheet đầu tiên
- `startRow` (number, optional, default: 2) - Dòng bắt đầu (bỏ qua header)
- `overwrite` (boolean, optional, default: false) - Ghi đè nếu trùng mã chuyến

**Response:**
```json
{
  "success": true,
  "data": {
    "importId": "uuid",
    "status": "processing", // processing, completed, failed
    "totalRows": 100,
    "message": "Import đã được đưa vào queue"
  }
}
```

**Note:** Import chạy async, dùng endpoint `/api/v1/trips/import/:importId` để check status

### GET /api/v1/trips/import/:importId
Kiểm tra trạng thái import

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "totalRows": 100,
    "successRows": 95,
    "errorRows": 5,
    "errors": [
      {
        "row": 10,
        "message": "Thiếu thông tin lái xe"
      }
    ],
    "startedAt": "2025-01-26T10:00:00Z",
    "completedAt": "2025-01-26T10:05:00Z"
  }
}
```

### POST /api/v1/trips/import/validate
Validate Excel trước khi import

**Request:** (multipart/form-data)
- `file` (file)
- `sheetName` (string, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "totalRows": 100,
    "errors": [],
    "warnings": [
      {
        "row": 5,
        "message": "Không tìm thấy xe với biển số '29A-99999', sẽ tạo mới"
      }
    ],
    "preview": [
      // First 5 rows preview
    ]
  }
}
```

### GET /api/v1/trips/export
Export chuyến ra Excel

**Query Parameters:**
- `startDate` (date)
- `endDate` (date)
- `vehicleId` (uuid) - optional
- `driverId` (uuid) - optional
- `customerId` (uuid) - optional
- `status` (string) - optional
- `format` (string, default: "xlsx") - xlsx, xls

**Response:** Excel file download

### POST /api/v1/trips/bulk-create
Tạo nhiều chuyến cùng lúc

**Request:**
```json
{
  "trips": [
    {
      "tripCode": "CH001",
      "tripDate": "2025-07-15",
      // ... other fields
    },
    {
      "tripCode": "CH002",
      // ...
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "success": 8,
    "failed": 2,
    "errors": [
      {
        "index": 1,
        "message": "Validation error"
      }
    ]
  }
}
```

---

## 7. Transactions

### GET /api/v1/transactions
Danh sách giao dịch thu-chi

**Query Parameters:**
- `page`, `limit`
- `startDate` (date)
- `endDate` (date)
- `type` (string) - income, expense
- `category` (string) - fuel, salary, maintenance, revenue, toll, other
- `tripId` (uuid) - optional
- `vehicleId` (uuid) - optional
- `employeeId` (uuid) - optional
- `customerId` (uuid) - optional
- `status` (string)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "transactionCode": "GD001",
      "transactionDate": "2025-07-15",
      "transactionType": "income",
      "category": "revenue",
      "amount": 15000000,
      "description": "Thu tiền chuyến CH001",
      "trip": {
        "id": "uuid",
        "tripCode": "CH001"
      },
      "paymentMethod": "cash",
      "status": "completed"
    }
  ],
  "pagination": { ... }
}
```

### GET /api/v1/transactions/:id
Chi tiết giao dịch

### POST /api/v1/transactions
Tạo mới giao dịch

**Request:**
```json
{
  "transactionCode": "GD001",
  "transactionDate": "2025-07-15",
  "transactionType": "income",
  "category": "revenue",
  "amount": 15000000,
  "description": "Thu tiền chuyến CH001",
  "tripId": "uuid", // optional
  "vehicleId": "uuid", // optional
  "employeeId": "uuid", // optional
  "customerId": "uuid", // optional
  "paymentMethod": "cash",
  "status": "completed"
}
```

### PUT /api/v1/transactions/:id
Cập nhật giao dịch

### DELETE /api/v1/transactions/:id
Xóa giao dịch

### GET /api/v1/transactions/stats
Thống kê thu-chi

**Query Parameters:**
- `startDate` (date)
- `endDate` (date)
- `groupBy` (string, optional) - day, week, month, category

**Response:**
```json
{
  "success": true,
  "data": {
    "totalIncome": 2250000000,
    "totalExpense": 1350000000,
    "netAmount": 900000000,
    "byCategory": {
      "revenue": 2250000000,
      "fuel": 450000000,
      "salary": 300000000,
      "toll": 150000000,
      "other": 450000000
    }
  }
}
```

### GET /api/v1/transactions/balance
Số dư hiện tại

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 500000000,
    "lastUpdated": "2025-01-26T10:00:00Z"
  }
}
```

---

## 8. Reports & Analytics

### GET /api/v1/reports/dashboard
Tổng quan dashboard

**Query Parameters:**
- `startDate` (date, optional) - Default: đầu tháng hiện tại
- `endDate` (date, optional) - Default: hôm nay

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTrips": 150,
      "completedTrips": 145,
      "totalRevenue": 2250000000,
      "totalProfit": 900000000,
      "activeVehicles": 12,
      "activeDrivers": 8
    },
    "recentTrips": [ ... ],
    "topVehicles": [
      {
        "vehicleId": "uuid",
        "licensePlate": "29A-12345",
        "totalTrips": 25,
        "totalRevenue": 375000000,
        "totalProfit": 150000000
      }
    ],
    "topDrivers": [ ... ],
    "topCustomers": [ ... ]
  }
}
```

### GET /api/v1/reports/vehicles
Báo cáo theo xe

**Query Parameters:**
- `startDate` (date)
- `endDate` (date)
- `vehicleId` (uuid, optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "vehicleId": "uuid",
      "licensePlate": "29A-12345",
      "totalTrips": 25,
      "totalRevenue": 375000000,
      "totalCosts": 225000000,
      "totalProfit": 150000000,
      "averageProfitPerTrip": 6000000,
      "utilizationRate": 0.83 // 25 trips / 30 days
    }
  ]
}
```

### GET /api/v1/reports/drivers
Báo cáo theo lái xe

**Query Parameters:**
- `startDate` (date)
- `endDate` (date)
- `driverId` (uuid, optional)

### GET /api/v1/reports/customers
Báo cáo theo khách hàng

**Query Parameters:**
- `startDate` (date)
- `endDate` (date)
- `customerId` (uuid, optional)

### GET /api/v1/reports/profit-loss
Báo cáo lãi lỗ

**Query Parameters:**
- `startDate` (date)
- `endDate` (date)
- `groupBy` (string) - day, week, month

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "period": "2025-07",
      "totalRevenue": 2250000000,
      "totalExpenses": 1350000000,
      "netProfit": 900000000,
      "profitMargin": 0.40
    }
  ]
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Chưa đăng nhập hoặc token hết hạn |
| `FORBIDDEN` | 403 | Không có quyền truy cập |
| `NOT_FOUND` | 404 | Không tìm thấy resource |
| `VALIDATION_ERROR` | 400 | Dữ liệu không hợp lệ |
| `DUPLICATE_ERROR` | 409 | Dữ liệu trùng lặp |
| `INTERNAL_ERROR` | 500 | Lỗi server |
| `IMPORT_ERROR` | 422 | Lỗi khi import Excel |
| `COMPANY_MISMATCH` | 403 | Truy cập dữ liệu của company khác |
