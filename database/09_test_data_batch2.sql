-- ============================================================
-- Additional test data — batch 2. Run after 01_schema.sql, 02_seed.sql (or
-- 03_expanded_seed.sql), 06_shipments.sql, 07_package_orders.sql, and
-- 08_workflows.sql. Purely additive: does not touch or depend on existing
-- rows beyond the category/supplier/warehouse names looked up below.
--
-- This is a documentation record of a real test-data pass — every row here
-- was originally created either by direct insert (products/inventory/stock
-- movements) or through the live app APIs (package orders, shipments,
-- workflows), so quantities/statuses/relationships are exactly as they were
-- when this file was written. Two exceptions, for portability:
--   1. IDs use gen_random_uuid() instead of the original hardcoded UUIDs.
--   2. Shipment routes use a simplified 2-point straight line instead of the
--      full OSRM-generated polyline (hundreds of points) — the app always
--      computes the real route itself when a shipment is created through the
--      UI/API; these rows are only meant to exercise Shipments-module UI and
--      queries, not to be geographically precise.
--
-- Not idempotent — SKUs (SKU-NEW-9001..9012), package order numbers
-- (PKG-TEST-0001..0004), and shipment order numbers (SHP-TEST-0003..0006)
-- are fixed literals. Running this twice against the same database will
-- fail on the unique constraints; on a fresh database (or one that hasn't
-- run this file before) it inserts cleanly.
-- ============================================================

-- ------------------------------------------------------------
-- 12 additional products, spread across existing categories/suppliers
-- ------------------------------------------------------------
with new_products as (
    insert into products (name, sku, category_id, supplier_id, unit_price, minimum_stock_level, status)
    select v.name, v.sku, c.id, s.id, v.unit_price, v.minimum_stock_level, 'Active'
    from (values
        ('Wireless Barcode Scanner', 'SKU-NEW-9001', 'IT Hardware',      'TechZone Distributors',    4200.00, 10),
        ('Label Printer Thermal',    'SKU-NEW-9002', 'IT Hardware',      'TechZone Distributors',    6800.00, 8),
        ('4K Webcam',                'SKU-NEW-9003', 'Electronics',      'TechZone Distributors',    3200.00, 15),
        ('Mechanical Keyboard RGB',  'SKU-NEW-9004', 'Electronics',      'TechZone Distributors',    2800.00, 20),
        ('Ergonomic Footrest',       'SKU-NEW-9005', 'Furniture',        'Prime Furniture Co',        950.00, 25),
        ('Bookend Set Metal',        'SKU-NEW-9006', 'Furniture',        'Prime Furniture Co',        550.00, 30),
        ('Whiteboard Marker Pack',   'SKU-NEW-9007', 'Office Supplies',  'Bharat Office Mart',        180.00, 50),
        ('Sticky Flags Set',         'SKU-NEW-9008', 'Office Supplies',  'Bharat Office Mart',         90.00, 60),
        ('Bubble Wrap Roll 50m',     'SKU-NEW-9009', 'Packaging',        'EcoPack Industries',        650.00, 20),
        ('Pallet Wrap Roll',         'SKU-NEW-9010', 'Packaging',        'EcoPack Industries',        720.00, 15),
        ('Steel Angle Bracket',      'SKU-NEW-9011', 'Raw Materials',    'Metro Raw Materials',        45.00, 200),
        ('Industrial Sealant Tube',  'SKU-NEW-9012', 'Raw Materials',    'Metro Raw Materials',       310.00, 40)
    ) as v(name, sku, category_name, supplier_name, unit_price, minimum_stock_level)
    join categories c on c.name = v.category_name
    join suppliers  s on s.name = v.supplier_name
    returning id, sku
),

-- ------------------------------------------------------------
-- Inventory for each new product at one or two warehouses (baseline levels
-- before any of the demo package orders below reserved stock against them)
-- ------------------------------------------------------------
new_inventory as (
    insert into inventory (product_id, warehouse_id, quantity_on_hand)
    select p.id, w.id, v.qty
    from (values
        ('SKU-NEW-9001', 'Main Warehouse',         45),
        ('SKU-NEW-9001', 'North Depot',             6),
        ('SKU-NEW-9002', 'Main Warehouse',         22),
        ('SKU-NEW-9003', 'East Logistics Center',  38),
        ('SKU-NEW-9003', 'South Hub',                9),
        ('SKU-NEW-9004', 'Main Warehouse',         64),
        ('SKU-NEW-9005', 'North Depot',             55),
        ('SKU-NEW-9006', 'North Depot',             71),
        ('SKU-NEW-9007', 'South Hub',              120),
        ('SKU-NEW-9008', 'South Hub',              145),
        ('SKU-NEW-9009', 'East Logistics Center',   33),
        ('SKU-NEW-9010', 'East Logistics Center',   12),
        ('SKU-NEW-9011', 'Main Warehouse',         480),
        ('SKU-NEW-9012', 'Main Warehouse',          28)
    ) as v(sku, warehouse_name, qty)
    join new_products p on p.sku = v.sku
    join warehouses    w on w.name = v.warehouse_name
    returning product_id, warehouse_id, quantity_on_hand
)

-- ------------------------------------------------------------
-- Matching "initial stock intake" movements, one per inventory row above
-- ------------------------------------------------------------
insert into stock_movements (product_id, warehouse_id, movement_type, quantity, reason, performed_by)
select product_id, warehouse_id, 'IN', quantity_on_hand, 'Initial stock intake (test data batch 2)', 'system'
from new_inventory;

-- ------------------------------------------------------------
-- 4 package orders (2 Pending, 2 Shipped — the Shipped ones are linked to
-- the shipments created below). Quantities here match what was actually
-- reserved/deducted from the inventory rows above at the time.
-- ------------------------------------------------------------
with po1 as (
    insert into package_orders (order_number, warehouse_id, status, priority, notes)
    select 'PKG-TEST-0001', w.id, 'Pending', 'Low', null
    from warehouses w where w.name = 'Main Warehouse'
    returning id
),
po2 as (
    insert into package_orders (order_number, warehouse_id, status, priority, expected_ship_date)
    select 'PKG-TEST-0002', w.id, 'Pending', 'Normal', date '2026-09-05'
    from warehouses w where w.name = 'North Depot'
    returning id
),
po3 as (
    insert into package_orders (order_number, warehouse_id, status, priority)
    select 'PKG-TEST-0003', w.id, 'Shipped', 'Normal'
    from warehouses w where w.name = 'East Logistics Center'
    returning id
),
po4 as (
    insert into package_orders (order_number, warehouse_id, status, priority, notes)
    select 'PKG-TEST-0004', w.id, 'Shipped', 'High', 'Test data - bulk office electronics order'
    from warehouses w where w.name = 'East Logistics Center'
    returning id
),

-- ------------------------------------------------------------
-- Line items for the 4 package orders above (one "tallied"/customized item
-- each in PO1 and PO4, to exercise that feature)
-- ------------------------------------------------------------
po_items as (
    insert into package_order_items (package_order_id, product_id, quantity, customization_note)
    select po1.id, p.id, 100, 'Powder-coated black' from po1, products p where p.sku = 'SKU-NEW-9011'
    union all
    select po1.id, p.id, 8, null from po1, products p where p.sku = 'SKU-NEW-9004'
    union all
    select po2.id, p.id, 15, null from po2, products p where p.sku = 'SKU-NEW-9005'
    union all
    select po3.id, p.id, 10, null from po3, products p where p.sku = 'SKU-NEW-9009'
    union all
    select po4.id, p.id, 5, 'Gift boxed' from po4, products p where p.sku = 'SKU-NEW-9003'
    returning package_order_id
),

-- ------------------------------------------------------------
-- 4 shipments — 2 linked to the "Shipped" package orders above (PO3, PO4),
-- 2 standalone (one InTransit with a customer reference, one Cancelled)
-- ------------------------------------------------------------
ship3 as (
    insert into shipments (
        order_number, origin_name, origin_lat, origin_lng,
        destination_name, destination_lat, destination_lng,
        route_geojson, distance_km, duration_minutes, status,
        estimated_arrival_at
    )
    values (
        'SHP-TEST-0003', 'Kolkata, WB', 22.5726, 88.3639,
        'Bengaluru, KA', 12.9716, 77.5946,
        '[[22.5726,88.3639],[12.9716,77.5946]]', 1849.85, 1353, 'InTransit',
        now() + interval '1353 minutes'
    )
    returning id
),
ship4 as (
    insert into shipments (
        order_number, origin_name, origin_lat, origin_lng,
        destination_name, destination_lat, destination_lng,
        route_geojson, distance_km, duration_minutes, status,
        estimated_arrival_at
    )
    values (
        'SHP-TEST-0004', 'Kolkata, WB', 22.5726, 88.3639,
        'Chennai, TN', 13.0827, 80.2707,
        '[[22.5726,88.3639],[13.0827,80.2707]]', 1671.64, 1213, 'InTransit',
        now() + interval '1213 minutes'
    )
    returning id
),
ship_standalone_intransit as (
    insert into shipments (
        order_number, reference, origin_name, origin_lat, origin_lng,
        destination_name, destination_lat, destination_lng,
        route_geojson, distance_km, duration_minutes, status,
        estimated_arrival_at
    )
    values (
        'SHP-TEST-0005', 'Customer PO-7734', 'Delhi, DL', 28.6139, 77.2090,
        'Mumbai, MH', 19.0760, 72.8777,
        '[[28.6139,77.2090],[19.0760,72.8777]]', 1343.94, 919, 'InTransit',
        now() + interval '919 minutes'
    )
    returning id
),
ship_standalone_cancelled as (
    insert into shipments (
        order_number, reference, origin_name, origin_lat, origin_lng,
        destination_name, destination_lat, destination_lng,
        route_geojson, distance_km, duration_minutes, status,
        estimated_arrival_at, cancelled_at
    )
    values (
        'SHP-TEST-0006', 'Test cancelled shipment', 'Chennai, TN', 13.0827, 80.2707,
        'Bengaluru, KA', 12.9716, 77.5946,
        '[[13.0827,80.2707],[12.9716,77.5946]]', 327.34, 248, 'Cancelled',
        now() + interval '248 minutes', now()
    )
    returning id
)

-- ------------------------------------------------------------
-- Link the two "Shipped" package orders to their shipments (both updates
-- must happen in this single statement — the CTEs above go out of scope
-- once it ends)
-- ------------------------------------------------------------
update package_orders as po
set shipment_id = links.ship_id, shipped_at = now()
from (
    select po3.id as po_id, ship3.id as ship_id from po3, ship3
    union all
    select po4.id as po_id, ship4.id as ship_id from po4, ship4
) as links(po_id, ship_id)
where po.id = links.po_id;

-- ------------------------------------------------------------
-- 2 additional workflows (an Alert already primed to breach, and a Supply
-- Chain monitor) on top of any existing ones
-- ------------------------------------------------------------
insert into workflows (type, name, status, config)
select 'Alert', 'Pallet Wrap Low Stock - East Logistics', 'Active',
    jsonb_build_object(
        'productId', p.id, 'productName', p.name,
        'warehouseId', w.id, 'warehouseName', w.name,
        'thresholdQuantity', 15, 'recipientEmail', 'warehouse-alerts@example.com'
    )
from products p, warehouses w
where p.sku = 'SKU-NEW-9010' and w.name = 'East Logistics Center';

insert into workflows (type, name, status, config)
select 'SupplyChain', 'Steel Bracket Supply Monitor', 'Active',
    jsonb_build_object(
        'productId', p.id, 'productName', p.name,
        'warehouseId', w.id, 'warehouseName', w.name,
        'thresholdQuantity', 250, 'recipientEmail', 'supply-chain@example.com'
    )
from products p, warehouses w
where p.sku = 'SKU-NEW-9011' and w.name = 'Main Warehouse';
