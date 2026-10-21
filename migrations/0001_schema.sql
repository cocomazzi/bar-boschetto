PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS catalogo_ingredienti (
 ingredient_id TEXT PRIMARY KEY, name_it TEXT NOT NULL, name_nl TEXT, payload_json TEXT NOT NULL CHECK(json_valid(payload_json))
);
CREATE TABLE IF NOT EXISTS ricette (
 recipe_id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, payload_json TEXT NOT NULL CHECK(json_valid(payload_json))
);
CREATE TABLE IF NOT EXISTS ricette_ingredienti (
 recipe_id TEXT NOT NULL REFERENCES ricette(recipe_id), position INTEGER NOT NULL,
 ingredient_id TEXT NOT NULL REFERENCES catalogo_ingredienti(ingredient_id), payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
 PRIMARY KEY(recipe_id, position)
);
CREATE INDEX IF NOT EXISTS idx_recipe_category ON ricette(category);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredient ON ricette_ingredienti(ingredient_id);
CREATE TABLE IF NOT EXISTS family_state (
 id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL DEFAULT 0,
 state_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(state_json)), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by TEXT
);
INSERT OR IGNORE INTO family_state(id) VALUES(1);
