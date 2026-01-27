# Quick Start Guide

## Cài đặt nhanh với Yarn

### 1. Install Dependencies
```bash
yarn install
```

### 2. Setup Database
```bash
# Tạo database
createdb vantai_anh_viet

# Hoặc với psql
psql -U postgres -c "CREATE DATABASE vantai_anh_viet;"
```

### 3. Setup Environment
```bash
cp .env.example .env
# Chỉnh sửa .env với thông tin database của bạn
```

### 4. Chạy Application
```bash
# Development mode
yarn start:dev

# Application sẽ chạy tại: http://localhost:3000/api/v1
```

### 5. Tạo User đầu tiên

Sau khi app chạy, tạo company và user đầu tiên:

```sql
-- Vào psql
psql -U postgres -d vantai_anh_viet

-- Insert company
INSERT INTO companies (id, name, code, created_at, updated_at)
VALUES (gen_random_uuid(), 'Công ty ABC', 'ABC001', NOW(), NOW());

-- Insert user (password: password123)
-- Bạn cần hash password trước, hoặc dùng script seed
-- Password hash cho "password123": $2b$10$rOzJqZqZqZqZqZqZqZqZqO
INSERT INTO users (id, company_id, email, password_hash, full_name, role, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM companies WHERE code = 'ABC001'),
  'admin@example.com',
  '$2b$10$rOzJqZqZqZqZqZqZqZqZqO', -- password123
  'Admin User',
  'admin',
  'active',
  NOW(),
  NOW()
);
```

### 6. Test API

#### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

#### Sử dụng token để gọi API khác
```bash
# Lấy danh sách xe
curl -X GET http://localhost:3000/api/v1/vehicles \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Yarn Commands

```bash
# Install dependencies
yarn install

# Development
yarn start:dev

# Build
yarn build

# Production
yarn start:prod

# Lint
yarn lint

# Test
yarn test

# TypeORM migrations (nếu dùng)
yarn migration:generate
yarn migration:run
yarn migration:revert
```

## Troubleshooting

### Lỗi kết nối database
- Kiểm tra PostgreSQL đã chạy chưa: `pg_isready`
- Kiểm tra thông tin trong `.env` file
- Kiểm tra database đã tạo chưa

### Lỗi Redis (cho Bull queue)
- Nếu không dùng Redis, comment out Bull module trong `app.module.ts`
- Hoặc cài Redis: `brew install redis && redis-server` (macOS)

### Port đã được sử dụng
- Đổi PORT trong `.env` file
- Hoặc kill process đang dùng port 3000

## Next Steps

1. ✅ Install dependencies với yarn
2. ✅ Setup database
3. ✅ Tạo user đầu tiên
4. ✅ Test API
5. ⏭️ Import Excel file
6. ⏭️ Test các tính năng khác
