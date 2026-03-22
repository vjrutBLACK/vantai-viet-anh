-- ============================================
-- Database Schema: Hệ thống Quản lý Vận tải
-- Multi-tenant, PostgreSQL
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. COMPANIES (Multi-tenant root)
-- ============================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    tax_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_companies_code ON companies(code);

-- ============================================
-- 2. USERS (Authentication)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'staff', -- admin, manager, staff
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- ============================================
-- 3. VEHICLES
-- ============================================
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    license_plate VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(50), -- tải, container, đầu kéo, etc.
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    capacity DECIMAL(10, 2), -- Tải trọng (tấn)
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive, maintenance
    maintenance_cost DECIMAL(15, 2), -- Chi phí bảo trì khi status = maintenance
    maintenance_transaction_id UUID, -- FK to transactions(id), add via migration (transactions created later)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, license_plate)
);

CREATE INDEX idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_vehicles_status ON vehicles(status);

-- ============================================
-- 4. EMPLOYEES
-- ============================================
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_code VARCHAR(50),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    position VARCHAR(50), -- lái xe, phụ xe, quản lý, kế toán, etc.
    license_number VARCHAR(50), -- Số bằng lái
    license_type VARCHAR(20), -- B2, C, D, E, etc.
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_employees_employee_code ON employees(employee_code);
CREATE INDEX idx_employees_full_name ON employees(full_name);
CREATE INDEX idx_employees_position ON employees(position);
CREATE INDEX idx_employees_status ON employees(status);

-- ============================================
-- 5. CUSTOMERS
-- ============================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    tax_code VARCHAR(50),
    contact_person VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_customer_code ON customers(customer_code);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_status ON customers(status);

-- ============================================
-- 6. TRIPS (Core Business Entity)
-- ============================================
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    trip_code VARCHAR(100),
    trip_date DATE NOT NULL,
    
    -- Foreign Keys
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    co_driver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    
    -- Cargo Information
    cargo_type VARCHAR(100),
    cargo_weight DECIMAL(10, 2),
    cargo_quantity INTEGER,
    
    -- Địa chỉ / tuyến chuyến (một trường)
    address TEXT,
    
    -- Financial
    revenue DECIMAL(15, 2) DEFAULT 0,
    fuel_cost DECIMAL(15, 2) DEFAULT 0,
    toll_cost DECIMAL(15, 2) DEFAULT 0,
    driver_salary DECIMAL(15, 2) DEFAULT 0,
    other_costs DECIMAL(15, 2) DEFAULT 0,
    profit DECIMAL(15, 2) DEFAULT 0, -- Calculated: revenue - (fuel + toll + salary + other)
    
    -- Status & Notes
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    UNIQUE(company_id, trip_code)
);

CREATE INDEX idx_trips_company_id ON trips(company_id);
CREATE INDEX idx_trips_trip_code ON trips(trip_code);
CREATE INDEX idx_trips_trip_date ON trips(trip_date);
CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_customer_id ON trips(customer_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_date_range ON trips(company_id, trip_date);

-- ============================================
-- 7. TRANSACTIONS (Thu - Chi)
-- ============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    transaction_code VARCHAR(100),
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- income, expense
    category VARCHAR(50), -- fuel, salary, maintenance, revenue, toll, other
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    
    -- Optional Foreign Keys
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Payment Info
    payment_method VARCHAR(50), -- cash, bank_transfer, etc.
    status VARCHAR(20) NOT NULL DEFAULT 'completed', -- pending, completed, cancelled
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_transactions_company_id ON transactions(company_id);
CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_trip_id ON transactions(trip_id);
CREATE INDEX idx_transactions_vehicle_id ON transactions(vehicle_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_date_range ON transactions(company_id, transaction_date);

-- ============================================
-- 8. DATA MAPPING (For Excel Import)
-- ============================================
CREATE TABLE data_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- vehicle, employee, customer
    source_value VARCHAR(255) NOT NULL, -- Value from Excel
    target_id UUID NOT NULL, -- Mapped entity ID
    confidence_score DECIMAL(3, 2) DEFAULT 1.0, -- 0.0 - 1.0
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, entity_type, source_value)
);

CREATE INDEX idx_data_mappings_company_id ON data_mappings(company_id);
CREATE INDEX idx_data_mappings_entity_type ON data_mappings(entity_type);
CREATE INDEX idx_data_mappings_source_value ON data_mappings(source_value);

-- ============================================
-- 9. IMPORT LOGS (Audit Trail)
-- ============================================
CREATE TABLE import_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    total_rows INTEGER,
    success_rows INTEGER,
    error_rows INTEGER,
    status VARCHAR(20) NOT NULL, -- processing, completed, failed
    error_message TEXT,
    imported_by UUID REFERENCES users(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_import_logs_company_id ON import_logs(company_id);
CREATE INDEX idx_import_logs_status ON import_logs(status);
CREATE INDEX idx_import_logs_started_at ON import_logs(started_at);

-- ============================================
-- 10. TRIGGERS (Auto-update updated_at)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_mappings_updated_at BEFORE UPDATE ON data_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. VIEWS (For Reporting)
-- ============================================

-- View: Trip Summary by Vehicle
CREATE OR REPLACE VIEW v_trip_summary_by_vehicle AS
SELECT 
    t.company_id,
    t.vehicle_id,
    v.license_plate,
    COUNT(t.id) as total_trips,
    SUM(t.revenue) as total_revenue,
    SUM(t.fuel_cost + t.toll_cost + t.driver_salary + t.other_costs) as total_costs,
    SUM(t.profit) as total_profit,
    MIN(t.trip_date) as first_trip_date,
    MAX(t.trip_date) as last_trip_date
FROM trips t
JOIN vehicles v ON t.vehicle_id = v.id
WHERE t.status = 'completed'
GROUP BY t.company_id, t.vehicle_id, v.license_plate;

-- View: Trip Summary by Driver
CREATE OR REPLACE VIEW v_trip_summary_by_driver AS
SELECT 
    t.company_id,
    t.driver_id,
    e.full_name as driver_name,
    COUNT(t.id) as total_trips,
    SUM(t.revenue) as total_revenue,
    SUM(t.driver_salary) as total_salary,
    SUM(t.profit) as total_profit,
    MIN(t.trip_date) as first_trip_date,
    MAX(t.trip_date) as last_trip_date
FROM trips t
JOIN employees e ON t.driver_id = e.id
WHERE t.status = 'completed'
GROUP BY t.company_id, t.driver_id, e.full_name;

-- View: Monthly Profit & Loss
CREATE OR REPLACE VIEW v_monthly_profit_loss AS
SELECT 
    company_id,
    DATE_TRUNC('month', trip_date) as month,
    COUNT(id) as total_trips,
    SUM(revenue) as total_revenue,
    SUM(fuel_cost + toll_cost + driver_salary + other_costs) as total_expenses,
    SUM(profit) as net_profit
FROM trips
WHERE status = 'completed'
GROUP BY company_id, DATE_TRUNC('month', trip_date)
ORDER BY company_id, month DESC;

-- ============================================
-- 12. ROW LEVEL SECURITY (Multi-tenant Isolation)
-- ============================================
-- Note: Enable RLS in application layer or use PostgreSQL RLS policies
-- Example policy (adjust based on your auth system):
/*
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY vehicles_company_isolation ON vehicles
    USING (company_id = current_setting('app.current_company_id')::UUID);

-- Similar policies for other tables...
*/
