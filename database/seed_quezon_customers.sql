-- =============================================================================
-- Seed: Quezon (QZN) demo customers with sales agent assignment
--
-- Inserts customers for branch QZN. Each row has assigned_agent_id set to an
-- active employee on that branch with role Sales Agent (round-robin by
-- employee_id, same idea as assign_customers_to_valid_sales_agents.sql).
--
-- Map: map_lat / map_lng are set to inland Metro Manila (NCR) coordinates so
-- Google Maps pins sit on dry land while the branch remains Quezon for sales routing.
--
-- Requires:
--   • branch QZN (seed_quezon_branch_employees.sql) with at least one active
--     Sales Agent on that branch
--
-- Re-runnable:
--   • Deletes rows where email ends with @cust-qzn-seed.lamtex, then re-inserts.
-- =============================================================================

DO $$
DECLARE
  b_id uuid;
  n_agents integer;
BEGIN
  SELECT id INTO b_id FROM branches WHERE code = 'QZN' LIMIT 1;
  IF b_id IS NULL THEN
    RAISE EXCEPTION 'seed_quezon_customers: branch QZN not found (run seed_quezon_branch_employees.sql)';
  END IF;

  SELECT COUNT(*)::integer INTO n_agents
  FROM employees
  WHERE branch_id = b_id
    AND role = 'Sales Agent'
    AND status = 'active';

  IF n_agents < 1 THEN
    RAISE EXCEPTION 'seed_quezon_customers: need at least one active Sales Agent on branch QZN';
  END IF;

  DELETE FROM customers WHERE email LIKE '%@cust-qzn-seed.lamtex';

  WITH agents AS (
    SELECT id,
           row_number() OVER (ORDER BY employee_id) AS rn
    FROM employees
    WHERE branch_id = b_id
      AND role = 'Sales Agent'
      AND status = 'active'
  ),
  agent_total AS (
    SELECT COUNT(*)::integer AS total FROM agents
  ),
  rows AS (
    SELECT *
    FROM (VALUES
      (1,
       'Lucena Prime Builders Supply',
       'Hardware Store'::customer_type,
       'Office'::client_type,
       'Ana Reyes',
       '+63 2 8820 0101',
       'lucena-prime-builders@cust-qzn-seed.lamtex',
       'Legaspi Street, Legaspi Village',
       'Makati',
       '1229',
       'NET 30',
       850000.00,
       DATE '2023-04-12',
       14.5547290::numeric,
       121.0244450::numeric),
      (2,
       'Tayabas Ridge Construction Corp.',
       'Construction Company'::customer_type,
       'Office'::client_type,
       'Ramon Villanueva',
       '+63 2 8820 0102',
       'tayabas-ridge-construction@cust-qzn-seed.lamtex',
       'Katipunan Avenue, Loyola Heights',
       'Quezon City',
       '1108',
       'NET 45',
       1200000.00,
       DATE '2022-11-03',
       14.6537120::numeric,
       121.0742280::numeric),
      (3,
       'Sariaya Metalworks & Glass',
       'Contractor'::customer_type,
       'Personal'::client_type,
       'Jojo Mendoza',
       '+63 2 8820 0103',
       'sariaya-metalworks-glass@cust-qzn-seed.lamtex',
       'Recto Avenue, Santa Cruz',
       'Manila',
       '1014',
       'COD',
       350000.00,
       DATE '2024-01-20',
       14.6003220::numeric,
       121.0150210::numeric),
      (4,
       'Infanta Coastal Trading',
       'Distributor'::customer_type,
       'Office'::client_type,
       'Liza Fernandez',
       '+63 2 8820 0104',
       'infanta-coastal-trading@cust-qzn-seed.lamtex',
       'Ortigas Avenue, San Antonio',
       'Pasig',
       '1605',
       'NET 30',
       2000000.00,
       DATE '2021-08-15',
       14.5856430::numeric,
       121.0679190::numeric),
      (5,
       'Candelaria HDPE & Fittings Depot',
       'Hardware Store'::customer_type,
       'Office'::client_type,
       'Eric Santos',
       '+63 2 8820 0105',
       'candelaria-hdpe-depot@cust-qzn-seed.lamtex',
       'Shaw Boulevard, Pleasant Hills',
       'Mandaluyong',
       '1552',
       'NET 15',
       620000.00,
       DATE '2023-09-01',
       14.5812340::numeric,
       121.0450120::numeric),
      (6,
       'Pagbilao Site Development Inc.',
       'Construction Company'::customer_type,
       'Office'::client_type,
       'Dennis Cruz',
       '+63 2 8820 0106',
       'pagbilao-site-dev@cust-qzn-seed.lamtex',
       'J. P. Rizal Street, Santo Niño',
       'Marikina',
       '1800',
       'NET 45',
       980000.00,
       DATE '2022-05-18',
       14.6507120::numeric,
       121.1028760::numeric),
      (7,
       'Polillo Island Gen. Merchandise',
       'Distributor'::customer_type,
       'Personal'::client_type,
       'Marife Dalisay',
       '+63 2 8820 0107',
       'polillo-gen-merch@cust-qzn-seed.lamtex',
       'Alabang–Zapote Road, Pamplona Uno',
       'Las Piñas',
       '1740',
       'NET 30',
       480000.00,
       DATE '2024-06-07',
       14.4499120::numeric,
       120.9828870::numeric),
      (8,
       'Atimonan Bay Contractors',
       'Contractor'::customer_type,
       'Office'::client_type,
       'Benjie Tolentino',
       '+63 2 8820 0108',
       'atimonan-bay-contractors@cust-qzn-seed.lamtex',
       'Commerce Avenue, Ayala Alabang',
       'Muntinlupa',
       '1780',
       'NET 30',
       720000.00,
       DATE '2023-02-28',
       14.4177150::numeric,
       121.0411180::numeric),
      (9,
       'Mauban Rural Hardware Cooperative',
       'Hardware Store'::customer_type,
       'Office'::client_type,
       'Corazon Bautista',
       '+63 2 8820 0109',
       'mauban-rural-hardware@cust-qzn-seed.lamtex',
       'MacArthur Highway, Karuhatan',
       'Valenzuela',
       '1441',
       'NET 15',
       410000.00,
       DATE '2024-03-11',
       14.7004120::numeric,
       120.9822340::numeric),
      (10,
       'Calauag North Builders Group',
       'Construction Company'::customer_type,
       'Personal'::client_type,
       'Miguel Roxas',
       '+63 2 8820 0110',
       'calauag-north-builders@cust-qzn-seed.lamtex',
       'Samuel Road, Grace Park East',
       'Caloocan',
       '1403',
       'NET 45',
       550000.00,
       DATE '2022-12-09',
       14.6578120::numeric,
       121.0087650::numeric),
      (11,
       'Real–Infanta Pipe & Tools Wholesale',
       'Distributor'::customer_type,
       'Office'::client_type,
       'Sheryl Ramos',
       '+63 2 8820 0111',
       'real-infanta-pipe-wholesale@cust-qzn-seed.lamtex',
       'Dr. A. Santos Avenue, San Antonio',
       'Parañaque',
       '1709',
       'NET 30',
       1350000.00,
       DATE '2021-10-22',
       14.4793120::numeric,
       121.0189340::numeric),
      (12,
       'Lucena South Welding & Fabrication',
       'Contractor'::customer_type,
       'Personal'::client_type,
       'Jun-Jun Abad',
       '+63 2 8820 0112',
       'lucena-south-welding@cust-qzn-seed.lamtex',
       '32nd Street, Bonifacio Global City',
       'Taguig',
       '1634',
       'COD',
       280000.00,
       DATE '2024-08-30',
       14.5532180::numeric,
       121.0481560::numeric)
    ) AS t(
      seq,
      cname,
      ctype,
      cltype,
      contact_person,
      phone,
      em,
      addr,
      city,
      postal,
      pay_terms,
      credit_limit,
      acct_since,
      mlat,
      mlng
    )
  )
  INSERT INTO customers (
    name,
    type,
    client_type,
    status,
    contact_person,
    phone,
    email,
    address,
    city,
    province,
    postal_code,
    map_lat,
    map_lng,
    payment_terms,
    credit_limit,
    available_credit,
    branch_id,
    assigned_agent_id,
    account_since,
    tags
  )
  SELECT
    r.cname,
    r.ctype,
    r.cltype::client_type,
    'Active'::customer_status,
    r.contact_person,
    r.phone,
    r.em,
    r.addr,
    r.city,
    'Metro Manila',
    r.postal,
    r.mlat,
    r.mlng,
    r.pay_terms,
    r.credit_limit,
    r.credit_limit,
    b_id,
    a.id,
    r.acct_since,
    ARRAY['quezon-seed']::text[]
  FROM rows r
  CROSS JOIN agent_total at
  JOIN agents a ON a.rn = ((r.seq - 1) % at.total) + 1;

  RAISE NOTICE 'seed_quezon_customers: inserted % demo customers for QZN (% Sales Agent(s))',
    (SELECT COUNT(*) FROM customers WHERE email LIKE '%@cust-qzn-seed.lamtex'),
    n_agents;
END $$;
