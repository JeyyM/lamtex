-- Same default social links for every branch (skips if that platform already exists for the branch).

INSERT INTO company_social_media (settings_id, platform, url, is_active)
SELECT cs.id, v.platform, v.url, v.is_active
FROM company_settings cs
CROSS JOIN (
  VALUES
    ('Facebook', 'https://facebook.com/lamtexph', TRUE),
    ('Instagram', 'https://instagram.com/lamtexph', TRUE),
    ('LinkedIn', 'https://linkedin.com/company/lamtex', TRUE),
    ('YouTube', 'https://youtube.com/@lamtexph', TRUE),
    ('X (Twitter)', 'https://x.com/lamtexph', TRUE),
    ('Website', 'https://www.lamtex.ph', TRUE)
) AS v(platform, url, is_active)
WHERE NOT EXISTS (
  SELECT 1
  FROM company_social_media sm
  WHERE sm.settings_id = cs.id AND sm.platform = v.platform
);
