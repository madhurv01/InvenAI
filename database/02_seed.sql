-- ============================================================
-- Sample seed data (optional, safe to run once after 01_schema.sql)
-- ============================================================

insert into categories (name, description) values
 ('Electronics','Electronic components and gadgets'),
 ('Office Supplies','Stationery and office consumables'),
 ('Packaging','Boxes, tapes and packaging material')
on conflict (name) do nothing;

insert into warehouses (name, location) values
 ('Main Warehouse','Bengaluru, KA'),
 ('North Depot','Delhi, DL')
on conflict (name) do nothing;

insert into suppliers (name, contact_person, email, phone, lead_time_days) values
 ('Acme Supplies Pvt Ltd','Rahul Sharma','rahul@acmesupplies.com','+91-9876543210',5),
 ('Global Parts Co','Meera Nair','meera@globalparts.com','+91-9123456780',10)
on conflict do nothing;

-- Products (referencing the categories/suppliers above via subqueries)
insert into products (name, sku, category_id, supplier_id, unit_price, minimum_stock_level, status)
select 'Wireless Mouse','SKU-EL-1001', c.id, s.id, 599.00, 20, 'Active'
from categories c, suppliers s where c.name='Electronics' and s.name='Acme Supplies Pvt Ltd'
on conflict (sku) do nothing;

insert into products (name, sku, category_id, supplier_id, unit_price, minimum_stock_level, status)
select 'USB-C Cable 1m','SKU-EL-1002', c.id, s.id, 249.00, 50, 'Active'
from categories c, suppliers s where c.name='Electronics' and s.name='Global Parts Co'
on conflict (sku) do nothing;

insert into products (name, sku, category_id, supplier_id, unit_price, minimum_stock_level, status)
select 'A4 Paper Ream','SKU-OF-2001', c.id, s.id, 320.00, 30, 'Active'
from categories c, suppliers s where c.name='Office Supplies' and s.name='Acme Supplies Pvt Ltd'
on conflict (sku) do nothing;

insert into products (name, sku, category_id, supplier_id, unit_price, minimum_stock_level, status)
select 'Corrugated Box (M)','SKU-PK-3001', c.id, s.id, 45.00, 100, 'Active'
from categories c, suppliers s where c.name='Packaging' and s.name='Global Parts Co'
on conflict (sku) do nothing;

-- Initial inventory levels (intentionally some below minimum for demo)
insert into inventory (product_id, warehouse_id, quantity_on_hand)
select p.id, w.id, v.qty
from (values
  ('SKU-EL-1001','Main Warehouse', 12),
  ('SKU-EL-1002','Main Warehouse', 80),
  ('SKU-OF-2001','North Depot',    15),
  ('SKU-PK-3001','Main Warehouse', 200)
) as v(sku, wh, qty)
join products p on p.sku = v.sku
join warehouses w on w.name = v.wh
on conflict (product_id, warehouse_id) do nothing;

-- A couple of stock movement history rows
insert into stock_movements (product_id, warehouse_id, movement_type, quantity, reason, performed_by)
select p.id, w.id, 'IN', 100, 'Initial stock load', 'system'
from products p, warehouses w where p.sku='SKU-PK-3001' and w.name='Main Warehouse';

insert into stock_movements (product_id, warehouse_id, movement_type, quantity, reason, performed_by)
select p.id, w.id, 'OUT', 20, 'Sample sales order', 'system'
from products p, warehouses w where p.sku='SKU-EL-1001' and w.name='Main Warehouse';

-- Default admin user (password: Admin@123 — bcrypt hash, CHANGE after first login)
-- Hash generated for 'Admin@123'
insert into app_users (full_name, email, password_hash, role)
values ('System Admin','admin@inventory.local','$2b$11$WTk9A46X4I/zXF95Ll/Cy.s.drYdjUSuFeX7ET5Dr5E7y7WyGvaZC','Admin')
on conflict (email) do nothing;
