-- Advanced search (brand/model/year/fuel/color/kind filters, apps/api/src/search) queries
-- registry.current_registration directly -- it otherwise carries only the unique plate index,
-- so a filtered query would be a full sequential scan over its 15M+ rows.
CREATE INDEX ix_current_reg_brand_model ON registry.current_registration (brand, model);
CREATE INDEX ix_current_reg_make_year ON registry.current_registration (make_year);
CREATE INDEX ix_current_reg_fuel ON registry.current_registration (fuel);
CREATE INDEX ix_current_reg_color ON registry.current_registration (color);
CREATE INDEX ix_current_reg_kind ON registry.current_registration (kind);
