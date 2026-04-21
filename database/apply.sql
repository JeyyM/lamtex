-- ============================================================
-- apply.sql  –  Seed example specifications on raw materials
-- Run this in the Supabase SQL Editor (safe to re-run)
-- ============================================================

-- Alter default so future inserts start with an empty array
ALTER TABLE raw_materials
  ALTER COLUMN specifications SET DEFAULT '[]'::jsonb;

-- Migrate any existing {} rows to []
UPDATE raw_materials
SET specifications = '[]'::jsonb
WHERE specifications = '{}'::jsonb OR specifications IS NULL;

-- ── PVC Resin ───────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Density",          "value":"1.35–1.45 g/cm³"},
  {"label":"K-Value",          "value":"65–70"},
  {"label":"Volatile Matter",  "value":"≤ 0.3%"},
  {"label":"Apparent Density", "value":"0.45–0.55 g/mL"},
  {"label":"Particle Size",    "value":"100–160 μm"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%PVC Resin%';

-- ── HDPE Resin ──────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Density",           "value":"0.941–0.965 g/cm³"},
  {"label":"Melt Flow Index",   "value":"0.2–1.0 g/10 min"},
  {"label":"Tensile Strength",  "value":"22–31 MPa"},
  {"label":"Flexural Modulus",  "value":"1000–1550 MPa"},
  {"label":"Hardness (Shore D)","value":"60–70"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%HDPE Resin%';

-- ── PPR Resin ───────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Density",              "value":"0.90 g/cm³"},
  {"label":"Melt Flow Rate",       "value":"0.3–3.0 g/10 min"},
  {"label":"Vicat Softening Point","value":"≥ 145 °C"},
  {"label":"Tensile Strength",     "value":"≥ 25 MPa"},
  {"label":"Elongation at Break",  "value":"≥ 400%"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%PPR Resin%';

-- ── Stabilizers ─────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Type",         "value":"Lead / Ca-Zn / OBS"},
  {"label":"Appearance",   "value":"White to off-white powder"},
  {"label":"Purity",       "value":"≥ 98%"},
  {"label":"Melting Point","value":"270–290 °C"},
  {"label":"pH (1% aq.)",  "value":"7–9"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%Stabilizer%';

-- ── Plasticizers ─────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Type",                "value":"DOP / DINP / DOTP"},
  {"label":"Appearance",          "value":"Clear oily liquid"},
  {"label":"Density at 20 °C",    "value":"0.980–0.986 g/cm³"},
  {"label":"Viscosity at 25 °C",  "value":"70–90 mPa·s"},
  {"label":"Flash Point",         "value":"≥ 200 °C"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%Plasticizer%';

-- ── Lubricants ───────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Type",         "value":"Internal / External"},
  {"label":"Appearance",   "value":"White flakes / powder"},
  {"label":"Melting Point","value":"55–90 °C"},
  {"label":"Acid Value",   "value":"≤ 1 mg KOH/g"},
  {"label":"Drop Point",   "value":"60–75 °C"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%Lubricant%';

-- ── Colorants ────────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Type",           "value":"Masterbatch / Pigment"},
  {"label":"Carrier Resin",  "value":"PVC / PE / PP"},
  {"label":"Pigment Content","value":"40–60%"},
  {"label":"Heat Stability", "value":"≥ 220 °C"},
  {"label":"Lightfastness",  "value":"Grade 6–8 (ISO 105-B02)"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%Colorant%';

-- ── Additives ─────────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Type",        "value":"Impact modifier / Processing aid"},
  {"label":"Appearance",  "value":"White free-flowing powder"},
  {"label":"Bulk Density","value":"0.30–0.45 g/mL"},
  {"label":"Purity",      "value":"≥ 99%"},
  {"label":"Moisture",    "value":"≤ 0.5%"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%Additive%';

-- ── Packaging Materials ───────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Type",           "value":"Bags / Labels / Stretch film"},
  {"label":"Material",       "value":"PE / PP / Kraft"},
  {"label":"Thickness",      "value":"50–100 μm"},
  {"label":"Tensile Strength","value":"≥ 15 MPa"},
  {"label":"Print Colors",   "value":"1–4 colors"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%Packaging%';

-- ── VERIFY ────────────────────────────────────────────────────
SELECT mc.name AS category, rm.name AS material, rm.specifications
FROM raw_materials rm
JOIN material_categories mc ON mc.id = rm.category_id
ORDER BY mc.name, rm.name;
