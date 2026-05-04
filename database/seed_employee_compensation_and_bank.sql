-- =============================================================================
-- Seed: employee_compensation + employee_bank_details (Compensation tab)
-- =============================================================================
-- Inserts when missing. Re-run safe (NOT EXISTS).
-- Row 0 matches reference: base ₱25k, 15% Platinum, allowances, quotas, BDO.
-- =============================================================================

INSERT INTO employee_compensation (
  employee_id,
  base_salary,
  commission_rate,
  commission_tier,
  bonus_eligibility,
  monthly_quota,
  quarterly_quota,
  yearly_quota,
  allowance_transport,
  allowance_meal,
  allowance_communication,
  allowance_other,
  total_monthly_compensation
)
SELECT
  e.id,
  tpl.base_salary,
  tpl.commission_rate,
  tpl.commission_tier::commission_tier,
  tpl.bonus_eligibility,
  tpl.monthly_quota,
  tpl.quarterly_quota,
  tpl.yearly_quota,
  tpl.allowance_transport,
  tpl.allowance_meal,
  tpl.allowance_communication,
  tpl.allowance_other,
  tpl.total_monthly_compensation
FROM (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY employee_id) - 1) AS n
  FROM employees
) e
INNER JOIN (
  SELECT * FROM (VALUES
    (0, 25000::numeric, 15::numeric, 'Platinum'::text, true, 2500000::numeric, 7500000::numeric, 30000000::numeric, 3000::numeric, 2000::numeric, 1500::numeric, 1000::numeric, 32500::numeric),
    (1, 22000::numeric, 12::numeric, 'Gold'::text, true, 1800000::numeric, 5400001::numeric, 22000000::numeric, 2500::numeric, 1800::numeric, 1200::numeric, 800::numeric, 29300::numeric),
    (2, 20000::numeric, 10::numeric, 'Silver'::text, false, 1200000::numeric, 3600000::numeric, 15000000::numeric, 2000::numeric, 1500::numeric, 1000::numeric, 500::numeric, 25000::numeric),
    (3, 28000::numeric, 18::numeric, 'Platinum'::text, true, 3200000::numeric, 9600000::numeric, 38000000::numeric, 3500::numeric, 2200::numeric, 1800::numeric, 1200::numeric, 35700::numeric),
    (4, 18000::numeric, 8::numeric, 'Bronze'::text, false, 800000::numeric, 2400000::numeric, 10000000::numeric, 1500::numeric, 1200::numeric, 800::numeric, 400::numeric, 21900::numeric),
    (5, 24000::numeric, 14::numeric, 'Gold'::text, true, 2100000::numeric, 6300000::numeric, 25000000::numeric, 2800::numeric, 1900::numeric, 1300::numeric, 900::numeric, 30900::numeric),
    (6, 19000::numeric, 9::numeric, 'Silver'::text, false, 1000000::numeric, 3000000::numeric, 12000000::numeric, 1800::numeric, 1400::numeric, 900::numeric, 600::numeric, 23700::numeric),
    (7, 26000::numeric, 16::numeric, 'Platinum'::text, true, 2700000::numeric, 8100000::numeric, 32000000::numeric, 3200::numeric, 2100::numeric, 1600::numeric, 1100::numeric, 34000::numeric),
    (8, 21000::numeric, 11::numeric, 'Gold'::text, true, 1500000::numeric, 4500000::numeric, 18000000::numeric, 2200::numeric, 1600::numeric, 1100::numeric, 700::numeric, 26600::numeric),
    (9, 17000::numeric, 7::numeric, 'Bronze'::text, false, 600000::numeric, 1800000::numeric, 8000000::numeric, 1200::numeric, 1000::numeric, 700::numeric, 300::numeric, 20200::numeric),
    (10, 23000::numeric, 13::numeric, 'Gold'::text, true, 1900000::numeric, 5700000::numeric, 23000000::numeric, 2600::numeric, 1700::numeric, 1250::numeric, 850::numeric, 29400::numeric),
    (11, 20000::numeric, 10::numeric, 'Silver'::text, false, 1100000::numeric, 3300000::numeric, 13500000::numeric, 2000::numeric, 1500::numeric, 1000::numeric, 550::numeric, 25050::numeric)
  ) AS t(
    idx,
    base_salary,
    commission_rate,
    commission_tier,
    bonus_eligibility,
    monthly_quota,
    quarterly_quota,
    yearly_quota,
    allowance_transport,
    allowance_meal,
    allowance_communication,
    allowance_other,
    total_monthly_compensation
  )
) tpl ON tpl.idx = (e.n % 12)
WHERE NOT EXISTS (SELECT 1 FROM employee_compensation x WHERE x.employee_id = e.id);

INSERT INTO employee_bank_details (
  employee_id,
  bank_name,
  account_number,
  account_name,
  account_type,
  payment_frequency
)
SELECT
  e.id,
  tpl.bank_name,
  tpl.account_number,
  tpl.account_name,
  tpl.account_type::bank_account_type,
  tpl.payment_frequency::pay_frequency
FROM (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY employee_id) - 1) AS n
  FROM employees
) e
INNER JOIN (
  SELECT * FROM (VALUES
    (0, 'BDO Unibank', '1234567890', 'Maria Santos', 'Savings'::text, 'Monthly'::text),
    (1, 'BPI', '9876543210', 'Rico Dela Cruz', 'Savings'::text, 'Monthly'::text),
    (2, 'Metrobank', '5555444433', 'Jen Lopez', 'Current'::text, 'Bi-weekly'::text),
    (3, 'UnionBank', '1111222233', 'Sam Villanueva', 'Savings'::text, 'Monthly'::text),
    (4, 'Security Bank', '6666777788', 'Ben Torres', 'Savings'::text, 'Monthly'::text),
    (5, 'China Bank', '4444333322', 'Kara Fernandez', 'Savings'::text, 'Monthly'::text),
    (6, 'RCBC', '8888999900', 'Dex Ramos', 'Current'::text, 'Bi-weekly'::text),
    (7, 'Landbank', '2233344455', 'Mia Gonzales', 'Savings'::text, 'Monthly'::text),
    (8, 'PNB', '3344455566', 'Alex Bautista', 'Savings'::text, 'Monthly'::text),
    (9, 'EastWest', '7788899900', 'Pat Navarro', 'Savings'::text, 'Weekly'::text),
    (10, 'HSBC', '1122334455', 'Dan Mendoza', 'Current'::text, 'Monthly'::text),
    (11, 'BDO Unibank', '9988776655', 'Leah Castro', 'Savings'::text, 'Monthly'::text)
  ) AS t(idx, bank_name, account_number, account_name, account_type, payment_frequency)
) tpl ON tpl.idx = (e.n % 12)
WHERE NOT EXISTS (SELECT 1 FROM employee_bank_details x WHERE x.employee_id = e.id);
