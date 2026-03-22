# Database Design - Hệ thống Quản lý Vận tải

## 1. Danh sách Bảng Database cho MVP

### 1.1. Bảng Quản lý Công ty (Multi-tenant)
```sql
companies
- id (PK, UUID)
- name (VARCHAR)
- code (VARCHAR, UNIQUE) -- mã công ty
- address (TEXT)
- phone (VARCHAR)
- email (VARCHAR)
- tax_code (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 1.2. Bảng Quản lý Xe
```sql
vehicles
- id (PK, UUID)
- company_id (FK -> companies.id)
- license_plate (VARCHAR) -- Biển số xe
- vehicle_type (VARCHAR) -- Loại xe (tải, container, etc.)
- brand (VARCHAR) -- Hãng xe
- model (VARCHAR) -- Model
- year (INTEGER) -- Năm sản xuất
- capacity (DECIMAL) -- Tải trọng (tấn)
- status (VARCHAR) -- active, inactive, maintenance
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 1.3. Bảng Quản lý Nhân viên
```sql
employees
- id (PK, UUID)
- company_id (FK -> companies.id)
- employee_code (VARCHAR) -- Mã nhân viên
- full_name (VARCHAR)
- phone (VARCHAR)
- email (VARCHAR)
- position (VARCHAR) -- Vị trí: lái xe, phụ xe, quản lý, etc.
- license_number (VARCHAR) -- Số bằng lái (nếu lái xe)
- license_type (VARCHAR) -- Loại bằng lái
- status (VARCHAR) -- active, inactive
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 1.4. Bảng Quản lý Khách hàng
```sql
customers
- id (PK, UUID)
- company_id (FK -> companies.id)
- customer_code (VARCHAR) -- Mã khách hàng
- name (VARCHAR)
- phone (VARCHAR)
- email (VARCHAR)
- address (TEXT)
- tax_code (VARCHAR)
- contact_person (VARCHAR) -- Người liên hệ
- status (VARCHAR) -- active, inactive
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 1.5. Bảng Quản lý Đơn hàng / Chuyến xe (Core Table)
```sql
trips
- id (PK, UUID)
- company_id (FK -> companies.id)
- trip_code (VARCHAR, UNIQUE) -- Mã chuyến (từ Excel)
- trip_date (DATE) -- Ngày chuyến
- vehicle_id (FK -> vehicles.id)
- driver_id (FK -> employees.id) -- Lái xe chính
- co_driver_id (FK -> employees.id, NULLABLE) -- Phụ xe
- customer_id (FK -> customers.id)
  
  -- Thông tin hàng hóa
- cargo_type (VARCHAR) -- Loại hàng
- cargo_weight (DECIMAL) -- Trọng lượng (tấn)
- cargo_quantity (INTEGER) -- Số lượng
  
  -- Địa chỉ chuyến
- address (TEXT) -- Địa chỉ / tuyến (một trường)
  
  -- Tài chính
- revenue (DECIMAL) -- Doanh thu
- fuel_cost (DECIMAL) -- Chi phí xăng dầu
- toll_cost (DECIMAL) -- Chi phí cầu đường
- driver_salary (DECIMAL) -- Lương lái xe
- other_costs (DECIMAL) -- Chi phí khác
- profit (DECIMAL) -- Lợi nhuận (tính toán)
  
  -- Trạng thái
- status (VARCHAR) -- pending, in_progress, completed, cancelled
- notes (TEXT) -- Ghi chú
  
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 1.6. Bảng Quản lý Thu - Chi
```sql
transactions
- id (PK, UUID)
- company_id (FK -> companies.id)
- transaction_code (VARCHAR) -- Mã giao dịch
- transaction_date (DATE)
- transaction_type (VARCHAR) -- income, expense
- category (VARCHAR) -- fuel, salary, maintenance, revenue, etc.
- amount (DECIMAL)
- description (TEXT)
- trip_id (FK -> trips.id, NULLABLE) -- Liên kết với chuyến (nếu có)
- vehicle_id (FK -> vehicles.id, NULLABLE) -- Liên kết với xe (nếu có)
- employee_id (FK -> employees.id, NULLABLE) -- Liên kết với nhân viên (nếu có)
- customer_id (FK -> customers.id, NULLABLE) -- Liên kết với khách hàng (nếu có)
- payment_method (VARCHAR) -- cash, bank_transfer, etc.
- status (VARCHAR) -- pending, completed, cancelled
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 1.7. Bảng Quản lý Người dùng (Authentication)
```sql
users
- id (PK, UUID)
- company_id (FK -> companies.id)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- full_name (VARCHAR)
- role (VARCHAR) -- admin, manager, staff
- status (VARCHAR) -- active, inactive
- last_login_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## 2. Mapping từ Excel sang Database

### Giả định cấu trúc Excel (dựa trên nghiệp vụ vận tải thông thường):

Mỗi dòng Excel thường chứa:
- **Cột A**: Ngày chuyến (trip_date)
- **Cột B**: Mã chuyến (trip_code)
- **Cột C**: Biển số xe (license_plate) → lookup vehicles
- **Cột D**: Lái xe (driver_name) → lookup employees
- **Cột E**: Phụ xe (co_driver_name) → lookup employees
- **Cột F**: Khách hàng (customer_name) → lookup customers
- **Cột G**: Địa chỉ chuyến (address)
- **Cột H**: Loại hàng (cargo_type)
- **Cột I**: Trọng lượng (cargo_weight)
- **Cột J**: Số lượng (cargo_quantity)
- **Cột K**: Doanh thu (revenue)
- **Cột L**: Chi phí xăng (fuel_cost)
- **Cột M**: Chi phí cầu đường (toll_cost)
- **Cột N**: Chi phí khác (other_costs)
- **Cột O**: Lợi nhuận (profit) — có thể tính toán
- **Cột P**: Ghi chú (notes)
- **`driver_salary`**: không nhập Excel — lấy từ `employees.base_salary` của lái xe khi import/tạo chuyến

### Quy trình Import:

1. **Parse Excel file** → Validate format
2. **Lookup/Create entities**:
   - Vehicle: Tìm theo `license_plate`, nếu không có → tạo mới
   - Employee (Driver): Tìm theo `full_name` hoặc `employee_code`, nếu không có → tạo mới
   - Employee (Co-driver): Tương tự
   - Customer: Tìm theo `name` hoặc `customer_code`, nếu không có → tạo mới
3. **Create Trip record** với tất cả thông tin
4. **Create Transaction records** (nếu cần tách riêng):
   - Income transaction từ revenue
   - Expense transactions từ các chi phí

## 3. Mối quan hệ giữa các bảng

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
vehicles (1) ──< (N) transactions (optional)
employees (1) ──< (N) transactions (optional)
customers (1) ──< (N) transactions (optional)
```

### ERD Summary:
- **companies** là root entity (multi-tenant isolation)
- **trips** là core business entity, liên kết với vehicles, employees, customers
- **transactions** có thể độc lập hoặc liên kết với trips/vehicles/employees/customers
- Tất cả bảng nghiệp vụ đều có `company_id` để đảm bảo data isolation

## 4. Danh sách API Endpoints cho MVP

### 4.1. Authentication & Authorization
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
```

### 4.2. Companies
```
GET    /api/companies/:id
PUT    /api/companies/:id
```

### 4.3. Vehicles
```
GET    /api/vehicles              -- List với filter, pagination
GET    /api/vehicles/:id
POST   /api/vehicles              -- Tạo mới
PUT    /api/vehicles/:id          -- Cập nhật
DELETE /api/vehicles/:id          -- Xóa (soft delete)
GET    /api/vehicles/stats        -- Thống kê xe
```

### 4.4. Employees
```
GET    /api/employees
GET    /api/employees/:id
POST   /api/employees
PUT    /api/employees/:id
DELETE /api/employees/:id
GET    /api/employees/drivers     -- Chỉ lấy lái xe
```

### 4.5. Customers
```
GET    /api/customers
GET    /api/customers/:id
POST   /api/customers
PUT    /api/customers/:id
DELETE /api/customers/:id
```

### 4.6. Trips (Core)
```
GET    /api/trips                 -- List với filter (date range, vehicle, driver, customer)
GET    /api/trips/:id
POST   /api/trips                 -- Tạo mới
PUT    /api/trips/:id
DELETE /api/trips/:id
GET    /api/trips/stats           -- Thống kê chuyến (revenue, profit, count)
GET    /api/trips/export          -- Export Excel
POST   /api/trips/import          -- Import từ Excel
POST   /api/trips/bulk-create     -- Tạo nhiều chuyến cùng lúc
```

### 4.7. Transactions
```
GET    /api/transactions           -- List với filter (type, date range, category)
GET    /api/transactions/:id
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id
GET    /api/transactions/stats     -- Thống kê thu-chi
GET    /api/transactions/balance   -- Số dư hiện tại
```

### 4.8. Reports & Analytics
```
GET    /api/reports/dashboard      -- Tổng quan (revenue, profit, trip count)
GET    /api/reports/vehicles       -- Báo cáo theo xe
GET    /api/reports/drivers        -- Báo cáo theo lái xe
GET    /api/reports/customers      -- Báo cáo theo khách hàng
GET    /api/reports/profit-loss    -- Báo cáo lãi lỗ
```

### 4.9. Import/Export
```
POST   /api/import/excel           -- Import Excel (trips)
GET    /api/export/excel           -- Export Excel (trips, với filter)
POST   /api/import/validate        -- Validate Excel trước khi import
```

## 5. Các lưu ý Rủi ro Kỹ thuật khi dựa trên Excel

### 5.1. Rủi ro về Dữ liệu

**a) Inconsistency trong Excel:**
- Tên xe/nhân viên/khách hàng viết khác nhau (ví dụ: "Nguyễn Văn A" vs "Ng Văn A")
- Format ngày tháng không nhất quán (dd/mm/yyyy vs mm/dd/yyyy)
- Số tiền có thể có dấu phẩy, dấu chấm, hoặc không có
- Trường hợp NULL/empty cells

**Giải pháp:**
- Implement **fuzzy matching** cho tên (sử dụng Levenshtein distance)
- Normalize dữ liệu trước khi import (trim, lowercase, remove accents)
- Validate và parse ngày tháng với nhiều format
- Tạo bảng **data_mapping** để map các biến thể tên → entity chuẩn
- Cho phép user review và confirm trước khi import

**b) Duplicate Data:**
- Cùng một chuyến có thể xuất hiện nhiều lần trong Excel
- Cùng một xe/nhân viên/khách hàng với tên khác nhau

**Giải pháp:**
- Check duplicate theo `trip_code` hoặc combination (date + vehicle + driver)
- Implement **deduplication logic** với confidence score
- Cho phép user merge duplicates

**c) Missing Required Fields:**
- Excel có thể thiếu thông tin bắt buộc (xe, lái xe, khách hàng)

**Giải pháp:**
- Validate trước khi import, báo lỗi rõ ràng
- Cho phép import với status "incomplete" để bổ sung sau

### 5.2. Rủi ro về Performance

**a) Import Large Files:**
- Excel có thể có hàng nghìn dòng
- Import đồng bộ sẽ block request

**Giải pháp:**
- Implement **async import** với job queue (Bull/BullMQ)
- Chunk processing (xử lý từng batch 100-500 records)
- Progress tracking với WebSocket hoặc polling endpoint
- Background job với retry mechanism

**b) Lookup Performance:**
- Mỗi dòng Excel cần lookup nhiều entities (vehicle, driver, customer)

**Giải pháp:**
- Cache entities trong memory khi import
- Batch lookup với IN queries
- Index trên các cột lookup (license_plate, employee_code, customer_code)

### 5.3. Rủi ro về Business Logic

**a) Tính toán Profit:**
- Excel có thể tính profit = revenue - (fuel + toll + salary + other)
- Cần đảm bảo công thức giống Excel

**Giải pháp:**
- Store công thức tính toán trong config
- Validate profit sau khi import
- Cho phép override profit nếu khác với tính toán

**b) Date Range Validation:**
- Excel có thể có dữ liệu của nhiều tháng/năm
- Cần validate date range khi import

**Giải pháp:**
- Cho phép user chọn date range khi import
- Filter và validate date trong range đó

### 5.4. Rủi ro về Data Integrity

**a) Foreign Key Constraints:**
- Import có thể reference đến entities chưa tồn tại

**Giải pháp:**
- Two-phase import:
  1. Phase 1: Create/update entities (vehicles, employees, customers)
  2. Phase 2: Create trips với foreign keys
- Transaction rollback nếu có lỗi

**b) Concurrent Updates:**
- Nhiều user có thể import cùng lúc

**Giải pháp:**
- Lock mechanism cho import job
- Queue serialization
- Optimistic locking với version field

### 5.5. Rủi ro về Excel Format

**a) Multiple Excel Versions:**
- .xls (Excel 97-2003) vs .xlsx (Excel 2007+)
- Different encoding (UTF-8, Windows-1252, etc.)

**Giải pháp:**
- Support cả .xls và .xlsx
- Auto-detect encoding
- Use libraries: `xlsx`, `exceljs` cho Node.js

**b) Multiple Sheets:**
- Excel có thể có nhiều sheets (theo tháng, theo xe, etc.)

**Giải pháp:**
- Cho phép user chọn sheet để import
- Auto-detect sheet với pattern matching
- Validate header row trước khi parse

**c) Merged Cells, Formulas:**
- Excel có thể có merged cells, formulas thay vì values

**Giải pháp:**
- Parse và unmerge cells
- Evaluate formulas hoặc báo lỗi nếu có formula

### 5.6. Rủi ro về Migration Path

**a) Historical Data:**
- Cần import dữ liệu lịch sử từ nhiều file Excel

**Giải pháp:**
- Batch import với date range
- Validate không duplicate với dữ liệu đã import
- Import log để track đã import file nào

**b) Data Reconciliation:**
- Sau khi import, cần verify số liệu khớp với Excel

**Giải pháp:**
- Export lại và so sánh với Excel gốc
- Tạo report reconciliation
- Cho phép re-import với overwrite mode

### 5.7. Rủi ro về Multi-tenant

**a) Data Leakage:**
- Import có thể nhầm company_id

**Giải pháp:**
- Luôn set company_id từ authenticated user
- Validate company_id trong mọi queries
- Row-level security (RLS) trong PostgreSQL

**b) Resource Isolation:**
- Import của company này không được ảnh hưởng company khác

**Giải pháp:**
- Separate queues per company (optional)
- Rate limiting per company
- Resource quotas

## 6. Best Practices Implementation

### 6.1. Import Flow
```
1. Upload Excel file
2. Validate file format & structure
3. Parse Excel → Raw data array
4. Validate & normalize data
5. Lookup/Create entities (vehicles, employees, customers)
6. Create trips in transaction
7. Generate import report (success, errors, warnings)
8. Return import result với summary
```

### 6.2. Data Validation Rules
- Required fields: trip_date, vehicle, driver, customer
- Date format: multiple formats supported
- Number format: handle comma, dot, space
- String normalization: trim, lowercase, remove accents
- Duplicate detection: by trip_code or unique combination

### 6.3. Error Handling
- Collect all errors, không dừng ở lỗi đầu tiên
- Return detailed error report với row number
- Allow partial import (skip invalid rows)
- Provide error correction suggestions

### 6.4. Audit Trail
- Log mọi import operation
- Track who imported what, when
- Version control cho imported data
- Rollback capability (soft delete)
