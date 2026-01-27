# Hệ thống Quản lý Vận tải - Transportation Management System

## Tổng quan

Hệ thống quản lý vận tải cho doanh nghiệp nhỏ (10-20 xe, 1-50 nhân viên), được thiết kế để:
- Thay thế quy trình quản lý bằng Excel hiện tại
- Hỗ trợ import dữ liệu từ Excel
- Thiết kế multi-tenant để mở rộng SaaS sau này
- Đảm bảo số liệu output giống với Excel (source of truth)

## Kiến trúc

- **Backend**: Node.js (NestJS hoặc Express)
- **Database**: PostgreSQL
- **Architecture**: Monolith, Multi-tenant
- **Deployment**: TBD (có thể Docker, VPS, hoặc Cloud)

## Cấu trúc Project

```
vantaiAnhViet/
├── README.md                    # File này
├── DATABASE_DESIGN.md           # Thiết kế database chi tiết
├── EXCEL_MAPPING.md             # Mapping từ Excel sang Database
├── API_SPECIFICATION.md         # Chi tiết API endpoints
├── database/
│   └── schema.sql              # SQL schema để tạo database
├── src/                        # Source code (sẽ implement sau)
│   ├── modules/
│   │   ├── auth/
│   │   ├── companies/
│   │   ├── vehicles/
│   │   ├── employees/
│   │   ├── customers/
│   │   ├── trips/
│   │   ├── transactions/
│   │   └── reports/
│   └── common/
└── docs/                       # Tài liệu bổ sung
```

## Phạm vi MVP

### ✅ Có trong MVP
- Quản lý xe (vehicles)
- Quản lý nhân viên (employees)
- Quản lý khách hàng (customers)
- Quản lý đơn hàng/chuyến xe (trips) - **Core feature**
- Quản lý thu-chi cơ bản (transactions)
- Import/Export Excel
- Authentication & Authorization
- Multi-tenant support

### ❌ Không có trong MVP
- Dashboard nâng cao (chỉ có báo cáo cơ bản)
- Mobile app
- Real-time tracking
- Advanced analytics
- Notification system
- Document management

## Database Schema

Xem chi tiết trong [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)

### Core Tables
1. **companies** - Multi-tenant root
2. **users** - Authentication
3. **vehicles** - Quản lý xe
4. **employees** - Quản lý nhân viên
5. **customers** - Quản lý khách hàng
6. **trips** - Chuyến xe (core business entity)
7. **transactions** - Thu-chi
8. **data_mappings** - Mapping cho Excel import
9. **import_logs** - Audit trail cho import

## API Endpoints

Xem chi tiết trong [API_SPECIFICATION.md](./API_SPECIFICATION.md)

### Main Endpoints
- `/api/v1/auth/*` - Authentication
- `/api/v1/vehicles/*` - Quản lý xe
- `/api/v1/employees/*` - Quản lý nhân viên
- `/api/v1/customers/*` - Quản lý khách hàng
- `/api/v1/trips/*` - Quản lý chuyến xe (core)
- `/api/v1/transactions/*` - Quản lý thu-chi
- `/api/v1/reports/*` - Báo cáo

## Excel Import/Export

### Import Flow
1. Upload Excel file (.xls, .xlsx)
2. Validate file format & structure
3. Parse Excel → Raw data
4. Normalize & validate data
5. Lookup/Create entities (vehicles, employees, customers)
6. Create trips in transaction
7. Return import report

### Export Flow
1. Filter trips theo criteria (date range, vehicle, driver, etc.)
2. Generate Excel file với format giống input
3. Download file

Xem chi tiết trong [EXCEL_MAPPING.md](./EXCEL_MAPPING.md)

## Rủi ro Kỹ thuật

### 1. Data Inconsistency
- Tên xe/nhân viên/khách hàng viết khác nhau
- Format ngày tháng không nhất quán
- Số tiền có nhiều format

**Giải pháp**: Fuzzy matching, data normalization, data_mappings table

### 2. Performance
- Import file lớn (hàng nghìn dòng)
- Lookup nhiều entities

**Giải pháp**: Async import với job queue, batch processing, caching

### 3. Data Integrity
- Duplicate trips
- Missing required fields
- Foreign key constraints

**Giải pháp**: Validation, deduplication, two-phase import

Xem chi tiết trong [DATABASE_DESIGN.md](./DATABASE_DESIGN.md#5-các-lưu-ý-rủi-ro-kỹ-thuật-khi-dựa-trên-excel)

## Multi-tenant Architecture

### Isolation Strategy
- **Row-level isolation**: Tất cả bảng có `company_id`
- **Application-level**: Filter `company_id` trong mọi query
- **Database-level** (optional): PostgreSQL Row Level Security (RLS)

### Best Practices
- Luôn set `company_id` từ authenticated user
- Validate `company_id` trong mọi queries
- Không cho phép cross-company data access

## Development Roadmap

### Phase 1: Setup & Core (Week 1-2)
- [ ] Setup project structure (NestJS/Express)
- [ ] Database schema implementation
- [ ] Authentication module
- [ ] Basic CRUD cho vehicles, employees, customers

### Phase 2: Core Business Logic (Week 3-4)
- [ ] Trips CRUD
- [ ] Transactions CRUD
- [ ] Basic validation & business rules

### Phase 3: Excel Integration (Week 5-6)
- [ ] Excel parser
- [ ] Import functionality
- [ ] Export functionality
- [ ] Data mapping & fuzzy matching

### Phase 4: Reports & Polish (Week 7-8)
- [ ] Basic reports
- [ ] Dashboard
- [ ] Error handling & logging
- [ ] Testing & bug fixes

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Yarn

### Installation

```bash
# Install dependencies
yarn install

# Setup database
psql -U postgres -f database/schema.sql

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run migrations (if using ORM)
yarn migration:run

# Start development server
yarn start:dev
```

## Testing Excel Import

1. Chuẩn bị file Excel mẫu với format đúng
2. Gọi API `POST /api/v1/trips/import/validate` để validate
3. Nếu valid, gọi `POST /api/v1/trips/import` để import
4. Check status với `GET /api/v1/trips/import/:importId`
5. Verify data trong database

## Notes

- **Excel là Source of Truth**: Đảm bảo output giống Excel
- **Backward Compatible**: Có thể export lại Excel từ database
- **Data Reconciliation**: Có thể so sánh số liệu giữa Excel và database

## Contact & Support

Để được hỗ trợ hoặc đóng góp, vui lòng liên hệ team phát triển.

---

**Version**: 1.0.0  
**Last Updated**: 2025-01-26
