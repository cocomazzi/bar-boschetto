from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];data=json.loads((root/'data.json').read_text(encoding='utf-8'))
def sql(v):return 'NULL' if v is None else "'"+str(v).replace("'","''")+"'"
def payload(row):return sql(json.dumps(row,ensure_ascii=False,separators=(',',':')))
lines=['-- Idempotent import of the original workbook; existing rows and family state are preserved.']
for r in data['catalogo_ingredienti']:lines.append('INSERT OR IGNORE INTO catalogo_ingredienti(ingredient_id,name_it,name_nl,payload_json) VALUES('+','.join([sql(r['ingredient_id']),sql(r['name_it']),sql(r['name_nl']),payload(r)])+');')
for r in data['ricette']:lines.append('INSERT OR IGNORE INTO ricette(recipe_id,name,category,payload_json) VALUES('+','.join([sql(r['recipe_id']),sql(r['name']),sql(r['category']),payload(r)])+');')
positions={}
for r in data['ricette_ingredienti']:
 pos=positions.get(r['recipe_id'],0);positions[r['recipe_id']]=pos+1
 lines.append('INSERT OR IGNORE INTO ricette_ingredienti(recipe_id,position,ingredient_id,payload_json) VALUES('+','.join([sql(r['recipe_id']),str(pos),sql(r['ingredient_id']),payload(r)])+');')
(root/'migrations/0002_seed.sql').write_text('\n'.join(lines)+'\n',encoding='utf-8');print('Seed generated:',len(lines)-1,'records')
