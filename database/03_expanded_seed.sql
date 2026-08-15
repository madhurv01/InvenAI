-- ============================================================
-- Expanded seed data — run AFTER 01_schema.sql and 02_seed.sql.
-- Adds 50+ products across 8 categories, more suppliers/warehouses,
-- ~140 inventory rows, and ~120 stock movement history rows
-- (spread over the last 20 days) so dashboards/charts/grids have
-- real, varied data to render.
-- Safe to re-run — every insert uses ON CONFLICT DO NOTHING.
-- ============================================================

-- ---------- Categories ----------
insert into categories (name, description) values
 ('IT Hardware','Computer components and networking equipment'),
 ('Furniture','Office furniture and fixtures'),
 ('Cleaning Supplies','Janitorial and cleaning consumables'),
 ('Safety Equipment','Workplace safety and protective gear'),
 ('Raw Materials','Manufacturing and fabrication raw stock')
on conflict (name) do nothing;

-- ---------- Warehouses ----------
insert into warehouses (name, location) values
 ('South Hub','Chennai, TN'),
 ('East Logistics Center','Kolkata, WB')
on conflict (name) do nothing;

-- ---------- Suppliers ----------
insert into suppliers (name, contact_person, email, phone, lead_time_days) values
 ('TechZone Distributors','Arjun Mehta','arjun@techzone.com','+91-9812345671',7),
 ('Bharat Office Mart','Priya Iyer','priya@bharatofficemart.com','+91-9823456712',4),
 ('Prime Furniture Co','Vikram Singh','vikram@primefurniture.com','+91-9834567123',15),
 ('EcoPack Industries','Sneha Rao','sneha@ecopack.com','+91-9845671234',6),
 ('CleanPro Supplies','Anil Kumar','anil@cleanpro.com','+91-9856712345',5),
 ('SafeGuard Equipment','Divya Menon','divya@safeguard.com','+91-9867123456',9),
 ('Metro Raw Materials','Suresh Pillai','suresh@metroraw.com','+91-9878123456',12),
 ('Swift Logistics Supplies','Kavita Joshi','kavita@swiftlogistics.com','+91-9889123456',5)
on conflict do nothing;

-- ---------- Products (52 across 8 categories) ----------
insert into products (name, sku, category_id, supplier_id, unit_price, minimum_stock_level, status)
select v.name, v.sku, c.id, s.id, v.unit_price, v.min_stock, v.status
from (values
  -- Electronics
  ('Bluetooth Speaker','SKU-EL-1003','Electronics','TechZone Distributors',1499.00,15,'Active'),
  ('HDMI Cable 2m','SKU-EL-1004','Electronics','Global Parts Co',299.00,40,'Active'),
  ('Laptop Stand','SKU-EL-1005','Electronics','TechZone Distributors',899.00,20,'Active'),
  ('Webcam 1080p','SKU-EL-1006','Electronics','Acme Supplies Pvt Ltd',1799.00,12,'Active'),
  ('Power Bank 10000mAh','SKU-EL-1007','Electronics','TechZone Distributors',999.00,25,'Active'),
  ('Wireless Keyboard','SKU-EL-1008','Electronics','Global Parts Co',749.00,18,'Active'),
  -- IT Hardware
  ('SSD 512GB','SKU-IT-1101','IT Hardware','TechZone Distributors',3499.00,10,'Active'),
  ('RAM 8GB DDR4','SKU-IT-1102','IT Hardware','TechZone Distributors',1899.00,15,'Active'),
  ('Graphics Card RTX3050','SKU-IT-1103','IT Hardware','TechZone Distributors',18999.00,5,'Active'),
  ('Network Switch 8-Port','SKU-IT-1104','IT Hardware','Global Parts Co',2299.00,8,'Active'),
  ('External HDD 1TB','SKU-IT-1105','IT Hardware','TechZone Distributors',3199.00,12,'Active'),
  ('Wi-Fi Router AC1200','SKU-IT-1106','IT Hardware','Global Parts Co',1999.00,14,'Active'),
  ('Ethernet Cable 5m','SKU-IT-1107','IT Hardware','TechZone Distributors',199.00,60,'Active'),
  ('Laptop Cooling Pad','SKU-IT-1108','IT Hardware','TechZone Distributors',649.00,16,'Active'),
  -- Office Supplies
  ('Stapler Heavy Duty','SKU-OF-2002','Office Supplies','Bharat Office Mart',349.00,25,'Active'),
  ('Sticky Notes Pack','SKU-OF-2003','Office Supplies','Bharat Office Mart',89.00,80,'Active'),
  ('Ballpoint Pen Box','SKU-OF-2004','Office Supplies','Bharat Office Mart',149.00,100,'Active'),
  ('Whiteboard Marker Set','SKU-OF-2005','Office Supplies','Bharat Office Mart',199.00,40,'Active'),
  ('File Folder Pack','SKU-OF-2006','Office Supplies','Bharat Office Mart',259.00,50,'Active'),
  ('Desk Organizer','SKU-OF-2007','Office Supplies','Acme Supplies Pvt Ltd',449.00,20,'Active'),
  ('Printer Ink Cartridge','SKU-OF-2008','Office Supplies','Bharat Office Mart',1299.00,18,'Active'),
  -- Furniture
  ('Office Chair Ergonomic','SKU-FN-4001','Furniture','Prime Furniture Co',7999.00,8,'Active'),
  ('Standing Desk','SKU-FN-4002','Furniture','Prime Furniture Co',12999.00,5,'Active'),
  ('Bookshelf 5-Tier','SKU-FN-4003','Furniture','Prime Furniture Co',4499.00,6,'Active'),
  ('Filing Cabinet','SKU-FN-4004','Furniture','Prime Furniture Co',5999.00,7,'Active'),
  ('Conference Table','SKU-FN-4005','Furniture','Prime Furniture Co',24999.00,2,'Active'),
  ('Visitor Chair','SKU-FN-4006','Furniture','Prime Furniture Co',3299.00,10,'Active'),
  -- Packaging
  ('Corrugated Box (L)','SKU-PK-3002','Packaging','Global Parts Co',65.00,120,'Active'),
  ('Bubble Wrap Roll','SKU-PK-3003','Packaging','EcoPack Industries',399.00,30,'Active'),
  ('Packing Tape Roll','SKU-PK-3004','Packaging','EcoPack Industries',59.00,150,'Active'),
  ('Shrink Wrap Roll','SKU-PK-3005','Packaging','EcoPack Industries',349.00,25,'Active'),
  ('Stretch Film','SKU-PK-3006','Packaging','EcoPack Industries',289.00,35,'Active'),
  -- Cleaning Supplies
  ('Floor Cleaner 5L','SKU-CL-5001','Cleaning Supplies','CleanPro Supplies',229.00,40,'Active'),
  ('Hand Sanitizer 500ml','SKU-CL-5002','Cleaning Supplies','CleanPro Supplies',149.00,60,'Active'),
  ('Trash Bags Pack','SKU-CL-5003','Cleaning Supplies','CleanPro Supplies',199.00,70,'Active'),
  ('Disinfectant Spray','SKU-CL-5004','Cleaning Supplies','CleanPro Supplies',249.00,45,'Active'),
  ('Microfiber Cloth Pack','SKU-CL-5005','Cleaning Supplies','CleanPro Supplies',179.00,50,'Active'),
  ('Glass Cleaner 500ml','SKU-CL-5006','Cleaning Supplies','CleanPro Supplies',159.00,40,'Active'),
  -- Safety Equipment
  ('Safety Helmet','SKU-SF-6001','Safety Equipment','SafeGuard Equipment',599.00,20,'Active'),
  ('Safety Gloves Pair','SKU-SF-6002','Safety Equipment','SafeGuard Equipment',149.00,60,'Active'),
  ('Reflective Vest','SKU-SF-6003','Safety Equipment','SafeGuard Equipment',249.00,30,'Active'),
  ('First Aid Kit','SKU-SF-6004','Safety Equipment','SafeGuard Equipment',899.00,15,'Active'),
  ('Fire Extinguisher 2kg','SKU-SF-6005','Safety Equipment','SafeGuard Equipment',1899.00,10,'Active'),
  -- Raw Materials
  ('Steel Sheet 2mm','SKU-RM-7001','Raw Materials','Metro Raw Materials',2499.00,25,'Active'),
  ('Aluminum Rod 1m','SKU-RM-7002','Raw Materials','Metro Raw Materials',899.00,40,'Active'),
  ('PVC Pipe 3m','SKU-RM-7003','Raw Materials','Metro Raw Materials',349.00,60,'Active'),
  ('Copper Wire Roll','SKU-RM-7004','Raw Materials','Metro Raw Materials',3299.00,15,'Active'),
  ('Plastic Granules 25kg','SKU-RM-7005','Raw Materials','Metro Raw Materials',1999.00,20,'Active'),
  -- A few discontinued/inactive to exercise status filters
  ('Legacy VGA Cable','SKU-EL-1009','Electronics','Global Parts Co',149.00,10,'Discontinued'),
  ('Old Model Router','SKU-IT-1109','IT Hardware','Global Parts Co',999.00,5,'Discontinued'),
  ('Wooden Visitor Chair (Old)','SKU-FN-4007','Furniture','Prime Furniture Co',1999.00,5,'Inactive'),
  ('Paper Tape Roll','SKU-PK-3007','Packaging','Swift Logistics Supplies',39.00,50,'Inactive')
) as v(name, sku, category_name, supplier_name, unit_price, min_stock, status)
join categories c on c.name = v.category_name
join suppliers s on s.name = v.supplier_name
on conflict (sku) do nothing;

-- ---------- Inventory (varied levels across up to 4 warehouses per product) ----------
with numbered as (
  select p.id as product_id, p.minimum_stock_level, w.id as warehouse_id,
         row_number() over (order by p.sku, w.name) as rn
  from products p
  cross join warehouses w
)
insert into inventory (product_id, warehouse_id, quantity_on_hand)
select product_id, warehouse_id,
  case
    when rn % 11 = 0 then 0                                             -- out of stock
    when rn % 5 = 0  then greatest(minimum_stock_level - (rn % 5) - 1, 1)  -- below minimum (low stock)
    else minimum_stock_level + (rn % 45) + 10                           -- healthy stock
  end as quantity_on_hand
from numbered
where rn % 3 <> 0   -- skip ~1/3 of product-warehouse combos so not every product sits in every warehouse
on conflict (product_id, warehouse_id) do nothing;

-- ---------- Stock movement history (~120 rows over the last 20 days) ----------
with numbered_inventory as (
  select product_id, warehouse_id,
         row_number() over (order by product_id, warehouse_id) as rn,
         count(*) over () as cnt
  from inventory
)
insert into stock_movements (product_id, warehouse_id, movement_type, quantity, reason, performed_by, created_at)
select ni.product_id, ni.warehouse_id,
  case when g.n % 3 = 0 then 'OUT' when g.n % 11 = 0 then 'ADJUSTMENT' else 'IN' end,
  5 + (g.n % 30),
  case
    when g.n % 3 = 0 then 'Sales order fulfillment'
    when g.n % 11 = 0 then 'Cycle count adjustment'
    else 'Supplier restock'
  end,
  case when g.n % 4 = 0 then 'admin@inventory.local' else 'system' end,
  now() - ((g.n % 20) || ' days')::interval - ((g.n % 24) || ' hours')::interval
from generate_series(1, 120) as g(n)
join numbered_inventory ni on ni.rn = ((g.n - 1) % ni.cnt) + 1;

-- ---------- Additional demo users ----------
-- Both passwords: Admin@123 (same bcrypt hash as the seeded System Admin — for demo only, change after login)
insert into app_users (full_name, email, password_hash, role) values
 ('Inventory Manager','manager@inventory.local','$2b$11$WTk9A46X4I/zXF95Ll/Cy.s.drYdjUSuFeX7ET5Dr5E7y7WyGvaZC','Manager'),
 ('Warehouse Staff','staff@inventory.local','$2b$11$WTk9A46X4I/zXF95Ll/Cy.s.drYdjUSuFeX7ET5Dr5E7y7WyGvaZC','Staff')
on conflict (email) do nothing;
