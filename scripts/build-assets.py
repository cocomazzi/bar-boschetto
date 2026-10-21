from pathlib import Path
import hashlib,re
root=Path(__file__).resolve().parents[1]
def asset(name,text=None):
 data=text.encode('utf-8') if text is not None else (root/name).read_bytes()
 stem,ext=name.rsplit('.',1);target=stem+'.'+hashlib.sha256(data).hexdigest()[:12]+'.'+ext
 (root/target).write_bytes(data);return target
config=asset('supabase-config.js')
backend=asset('supabase-backend.js',(root/'supabase-backend.js').read_text().replace('./supabase-config.js','./'+config))
storage=asset('storage.js',(root/'storage.js').read_text().replace('./supabase-backend.js','./'+backend))
app=asset('app.js',(root/'app.js').read_text(encoding='utf-8-sig').replace('./storage.js','./'+storage))
nutrition=asset('nutrition.js',(root/'nutrition.js').read_text(encoding='utf-8-sig').replace('./storage.js','./'+storage))
bootstrap=asset('bootstrap.js',(root/'bootstrap.js').read_text(encoding='utf-8').replace('./storage.js','./'+storage).replace('./app.js','./'+app).replace('./nutrition.js','./'+nutrition))
css=asset('style.css');html=(root/'index.html').read_text(encoding='utf-8-sig')
html=re.sub(r'href="style(?:\.[a-f0-9]{12})?\.css"','href="'+css+'"',html)
html=re.sub(r'<script type="module" src="(?:app|nutrition|bootstrap)(?:\.[a-f0-9]{12})?\.js"></script>','',html)
html=html.replace('</body>','<script type="module" src="'+bootstrap+'"></script></body>');(root/'index.html').write_text(html,encoding='utf-8')
print('Assets:',storage,app,nutrition,bootstrap,css)
