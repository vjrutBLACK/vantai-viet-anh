# Tóm tắt Thiết kế Hệ thống Quản lý Vận tải

## 1. Danh sách Bảng Database (9 bảng chính)

| Bảng | Mục đích | Key Fields |
|------|----------|------------|
| **companies** | Multi-tenant root | id, code, name |
| **users** | Authentication | id, email, company_id |
| **vehicles** | Quản lý xe | id, company_id, license_plate |
| **employees** | Quản lý nhân viên | id, company_id, full_name, position |
| **customers** | Quản lý khách hàng | id, company_id, name |
| **trips** | **Chuyến xe (CORE)** | id, company_id, trip_code, trip_date, vehicle_id, driver_id, customer_id |
| **transactions** | Thu-chi | id, company_id, transaction_type, amount |
| **data_mappings** | Mapping Excel import | id, company_id, entity_type, source_value, target_id |
| **import_logs** | Audit trail | id, company_id, file_name, status |

## 2. Mapping Excel → Database

### Mỗi dòng Excel = 1 Trip record

| Excel Column | → | Database Table.Field |
|--------------|---|---------------------|
| Ngày chuyến | → | trips.trip_date |
| Mã chuyến | → | trips.trip_code |
| Biển số xe | → | vehicles.license_plate (lookup) |
| Lái xe | → | employees.full_name (lookup, position='lái xe') |
| Phụ xe | → | employees.full_name (lookup, position='phụ xe') |
| Khách hàng | → | customers.name (lookup) |
| Điểm đi | → | trips.origin |
| Điểm đến | → | trips.destination |
| Khoảng cách | → | trips.distance |
| Loại hàng | → | trips.cargo_type |
| Trọng lượng | → | trips.cargo_weight |
| Doanh thu | → | trips.revenue |
| Chi phí xăng | → | trips.fuel_cost |
| Chi phí cầu đường | → | trips.toll_cost |
| Lương lái xe | → | trips.driver_salary |
| Chi phí khác | → | trips.other_costs |
| Lợi nhuận | → | trips.profit (**tính toán**: revenue - costs) |
| Ghi chú | → | trips.notes |

### Quy trình Import:
1. Parse Excel → Raw data
2. **Lookup/Create** entities (vehicles, employees, customers) với fuzzy matching
3. **Create** trip record
4. **Validate** profit calculation

## 3. Mối quan hệ Bảng

```
companies (1) ──< (N) vehicles
companies (1) ──< (N) employees  
companies (1) ──< (N) customers
companies (1) ──< (N) trips
companies (1) ──< (N) transactions
companies (1) ──< (N) users

vehicles (1) ──< (N) trips
employees (1) ──< (N) trips (as driver)
employees (1) ──< (N) trips (as co_driver)
customers (1) ──< (N) trips

trips (1) ──< (N) transactions (optional)
```

**Key Points:**
- `trips` là core entity, liên kết với vehicles, employees, customers
- Tất cả bảng có `company_id` để multi-tenant isolation
- `transactions` có thể độc lập hoặc link với trips

## 4. API Endpoints MVP (Tổng cộng ~40 endpoints)

### Authentication (4)
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

### Vehicles (6)
- `GET /api/v1/vehicles` (list, filter, pagination)
- `GET /api/v1/vehicles/:id`
- `POST /api/v1/vehicles`
- `PUT /api/v1/vehicles/:id`
- `DELETE /api/v1/vehicles/:id`
- `GET /api/v1/vehicles/stats`

### Employees (6)
- `GET /api/v1/employees`
- `GET /api/v1/employees/:id`
- `POST /api/v1/employees`
- `PUT /api/v1/employees/:id`
- `DELETE /api/v1/employees/:id`
- `GET /api/v1/employees/drivers`

### Customers (5)
- `GET /api/v1/customers`
- `GET /api/v1/customers/:id`
- `POST /api/v1/customers`
- `PUT /api/v1/customers/:id`
- `DELETE /api/v1/customers/:id`

### Trips - Core (9)
- `GET /api/v1/trips` (list với filter date, vehicle, driver, customer)
- `GET /api/v1/trips/:id`
- `POST /api/v1/trips`
- `PUT /api/v1/trips/:id`
- `DELETE /api/v1/trips/:id`
- `GET /api/v1/trips/stats`
- `POST /api/v1/trips/import` ⭐
- `GET /api/v1/trips/import/:importId`
- `POST /api/v1/trips/import/validate`
- `GET /api/v1/trips/export` ⭐
- `POST /api/v1/trips/bulk-create`

### Transactions (7)
- `GET /api/v1/transactions`
- `GET /api/v1/transactions/:id`
- `POST /api/v1/transactions`
- `PUT /api/v1/transactions/:id`
- `DELETE /api/v1/transactions/:id`
- `GET /api/v1/transactions/stats`
- `GET /api/v1/transactions/balance`

### Reports (5)
- `GET /api/v1/reports/dashboard`
- `GET /api/v1/reports/vehicles`
- `GET /api/v1/reports/drivers`
- `GET /api/v1/reports/customers`
- `GET /api/v1/reports/profit-loss`

### Companies (2)
- `GET /api/v1/companies/:id`
- `PUT /api/v1/companies/:id`

## 5. Rủi ro Kỹ thuật & Giải pháp

### 🔴 Rủi ro 1: Data Inconsistency
**Vấn đề:**
- Tên xe/nhân viên/khách hàng viết khác nhau ("Nguyễn Văn A" vs "Ng Văn A")
- Format ngày tháng không nhất quán
- Số tiền có dấu phẩy/chấm khác nhau

**Giải pháp:**
- ✅ Fuzzy matching với Levenshtein distance
- ✅ Data normalization (lowercase, remove accents)
- ✅ Bảng `data_mappings` để lưu mapping
- ✅ Support nhiều format date/money

### 🔴 Rủi ro 2: Performance
**Vấn đề:**
- Import file lớn (hàng nghìn dòng) block request
- Lookup nhiều entities (vehicle, driver, customer) cho mỗi dòng

**Giải pháp:**
- ✅ Async import với job queue (Bull/BullMQ)
- ✅ Batch processing (chunk 100-500 records)
- ✅ In-memory cache khi import
- ✅ Batch lookup với IN queries

### 🔴 Rủi ro 3: Duplicate Data
**Vấn đề:**
- Cùng một chuyến xuất hiện nhiều lần
- Cùng một entity với tên khác nhau

**Giải pháp:**
- ✅ Check duplicate theo `trip_code` hoặc combination
- ✅ Deduplication logic với confidence score
- ✅ Cho phép user merge duplicates

### 🔴 Rủi ro 4: Missing Required Fields
**Vấn đề:**
- Excel thiếu thông tin bắt buộc (xe, lái xe, khách hàng)

**Giải pháp:**
- ✅ Validate trước khi import
- ✅ Báo lỗi rõ ràng với row number
- ✅ Cho phép import với status "incomplete"

### 🔴 Rủi ro 5: Excel Format Variations
**Vấn đề:**
- Nhiều version Excel (.xls vs .xlsx)
- Multiple sheets
- Merged cells, formulas

**Giải pháp:**
- ✅ Support cả .xls và .xlsx
- ✅ Cho phép chọn sheet
- ✅ Parse và unmerge cells
- ✅ Báo lỗi nếu có formulas

### 🔴 Rủi ro 6: Multi-tenant Data Leakage
**Vấn đề:**
- Import nhầm company_id
- Cross-company data access

**Giải pháp:**
- ✅ Luôn set company_id từ authenticated user
- ✅ Validate company_id trong mọi queries
- ✅ Row-level security (RLS) trong PostgreSQL

## 6. Best Practices

### Import Flow
```
1. Upload Excel → Validate format
2. Parse Excel → Raw data array
3. Normalize & Validate data
4. Lookup/Create entities (vehicles, employees, customers)
5. Create trips in transaction
6. Generate import report (success, errors, warnings)
7. Return result với summary
```

### Data Validation
- Required: trip_date, vehicle, driver, customer, revenue
- Optional: trip_code (auto-generate nếu không có)
- Business rules: revenue >= 0, costs >= 0, profit = revenue - costs

### Error Handling
- Collect tất cả errors, không dừng ở lỗi đầu tiên
- Return detailed error report với row number
- Allow partial import (skip invalid rows)
- Provide error correction suggestions

## 7. Implementation Priority

### Phase 1: Core (Week 1-2)
1. Database schema
2. Authentication
3. CRUD: vehicles, employees, customers

### Phase 2: Business Logic (Week 3-4)
1. Trips CRUD
2. Transactions CRUD
3. Basic validation

### Phase 3: Excel Integration (Week 5-6) ⭐
1. Excel parser
2. Import functionality
3. Export functionality
4. Fuzzy matching

### Phase 4: Reports (Week 7-8)
1. Basic reports
2. Dashboard
3. Testing & polish

## 8. Key Design Decisions

1. **Monolith, not Microservices**: Phù hợp với quy mô nhỏ, dễ maintain
2. **Multi-tenant với company_id**: Sẵn sàng mở rộng SaaS
3. **Excel là Source of Truth**: Đảm bảo output giống Excel
4. **Fuzzy Matching**: Xử lý inconsistency trong Excel
5. **Async Import**: Không block request khi import file lớn
6. **Profit Calculation**: Tự động tính, validate với Excel value

## Files Reference

- 📄 [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) - Chi tiết database design
- 📄 [EXCEL_MAPPING.md](./EXCEL_MAPPING.md) - Mapping Excel → Database
- 📄 [API_SPECIFICATION.md](./API_SPECIFICATION.md) - Chi tiết API endpoints
- 📄 [database/schema.sql](./database/schema.sql) - SQL schema để implement
- 📄 [README.md](./README.md) - Tổng quan project

---

**Tóm lại**: Hệ thống được thiết kế để thay thế Excel, hỗ trợ import/export, đảm bảo số liệu khớp với Excel, và sẵn sàng mở rộng SaaS.
