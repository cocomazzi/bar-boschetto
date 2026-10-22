import {appStorage} from './storage.js';
import {getRecipeForNutrition} from './app.js';
import {NUTRIENTS,number,validPercent,normalizedSettings,calculateRecipe,unitInfo} from './recipe-nutrition-model.js';
const $=s=>document.querySelector(s),escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={kcal:'Calorie',protein:'Proteine',carbs:'Carboidrati',fat:'Grassi'};
const format=n=>n===null?'—':new Intl.NumberFormat('it-IT',{maximumFractionDigits:1}).format(n);
const read=key=>{try{return JSON.parse(appStorage.getItem(key)||'{}')}catch{return {}}};
let recipe=null,catalog=[],draft=null;
const dialog=document.createElement('dialog');dialog.id='recipe-nutrition-dialog';dialog.setAttribute('aria-labelledby','recipe-nutrition-title');
dialog.innerHTML=`<div class="section-title"><h2 id="recipe-nutrition-title">Nutrienti della ricetta</h2><button id="close-recipe-nutrition" type="button" class="delete-item" aria-label="Chiudi nutrienti ricetta">×</button></div><p id="recipe-nutrition-name"></p><p class="small">Totali dalle quantità mostrate nel ricettario, poi ripartiti tra due persone. Le percentuali si applicano all’intera ricetta, indipendentemente dal numero di porzioni indicato. Gli ingredienti restano riferiti a 100 g.</p><form id="recipe-nutrition-form"><fieldset><legend>Rapporto predefinito per le ricette</legend><div class="nutrition-share-inputs"><label>Prima persona (%)<input id="nutrition-default-share" type="number" min="0" max="100" step="any" required></label><p>Seconda persona: <output id="nutrition-default-second"></output>%</p></div><p class="small">Cambiarlo aggiorna tutte le ricette senza un rapporto specifico.</p></fieldset><fieldset><legend>Rapporto di questa ricetta</legend><label class="nutrition-override"><input id="nutrition-override-share" type="checkbox">Usa un rapporto specifico per questa ricetta</label><div class="nutrition-share-inputs"><label>Prima persona (%)<input id="nutrition-recipe-share" type="number" min="0" max="100" step="any" required disabled></label><p>Seconda persona: <output id="nutrition-recipe-second"></output>%</p></div></fieldset><div id="recipe-nutrition-results" aria-live="polite"></div><details id="nutrition-conversions"><summary>Pesi per le unità diverse dai grammi</summary><p class="small">Inserisci il peso in grammi per una unità di ciascun ingrediente. Per i liquidi usa grammi per ml. I fattori valgono anche nelle altre ricette con lo stesso ingrediente e la stessa unità. Nessuna densità viene presunta.</p><div id="nutrition-conversion-fields"></div></details><p id="recipe-nutrition-error" role="alert"></p><p id="recipe-nutrition-status" role="status" class="small"></p><div class="form-actions"><button type="button" id="cancel-recipe-nutrition">Annulla</button><button type="submit" class="primary-button">Salva rapporti e pesi</button></div></form>`;
document.body.append(dialog);
function populateConversions(){
 const records=read('boschetto-nutrition-v1'),unique=new Map();
 for(const line of recipe.ingredients){const info=unitInfo(line.unit);if(!info.mass&&info.unit){const key=JSON.stringify([line.ingredient_id,info.unit]);if(!unique.has(key))unique.set(key,{line,info});}}
 $('#nutrition-conversion-fields').innerHTML=[...unique.values()].map(({line,info})=>{
  const saved=draft.gramsPerUnit[line.ingredient_id]?.[info.unit]??'';
  const portion=info.unit==='porzione'&&number(records[line.ingredient_id]?.portion_grams)>0?` Senza un fattore specifico viene usato il peso porzione già salvato: ${format(number(records[line.ingredient_id].portion_grams))} g.`:'';
  return `<label>${escape(line.ingredient_name)} · grammi per ${escape(info.unit)}<input type="number" min="0" step="any" data-nutrition-factor data-ingredient-id="${escape(line.ingredient_id)}" data-unit="${escape(info.unit)}" value="${escape(saved)}" placeholder="Peso da indicare"><span class="small">Campo vuoto: conversione non disponibile.${escape(portion)}</span></label>`;
 }).join('')||'<p class="small">Tutte le quantità di questa ricetta sono espresse in unità di peso.</p>';
}
function readDraft(){
 const first=$('#nutrition-default-share').value,override=$('#nutrition-override-share').checked,local=$('#nutrition-recipe-share').value;
 if(!validPercent(first)||(override&&!validPercent(local)))return false;
 const next=normalizedSettings(draft);next.defaultFirstPercent=number(first);
 if(override)next.recipeFirstPercent[recipe.recipe_id]=number(local);else delete next.recipeFirstPercent[recipe.recipe_id];
 for(const input of dialog.querySelectorAll('[data-nutrition-factor]')){
  input.setCustomValidity('');const value=input.value;
  if(value!==''&&!(number(value)>0)){input.setCustomValidity('Inserisci un peso maggiore di zero oppure lascia vuoto.');return false;}
  const id=input.dataset.ingredientId,unit=input.dataset.unit;next.gramsPerUnit[id]={...(next.gramsPerUnit[id]||{})};
  if(value==='')delete next.gramsPerUnit[id][unit];else next.gramsPerUnit[id][unit]=number(value);
 }
 draft=next;return true;
}
function display(){
 $('#nutrition-recipe-share').disabled=!$('#nutrition-override-share').checked;
 if(!readDraft()){$('#recipe-nutrition-results').innerHTML='<p role="alert">Correggi percentuali o pesi per calcolare i nutrienti.</p>';$('#nutrition-default-second').value='—';$('#nutrition-recipe-second').value='—';return;}
 const result=calculateRecipe(recipe,catalog,read('boschetto-nutrition-v1'),draft);
 $('#nutrition-default-second').value=format(100-draft.defaultFirstPercent);$('#nutrition-recipe-second').value=format(result.secondPercent);
 const header=`<thead><tr><th scope="col">Nutriente</th><th scope="col">Ricetta intera</th><th scope="col">Prima persona<br>${format(result.firstPercent)}%</th><th scope="col">Seconda persona<br>${format(result.secondPercent)}%</th></tr></thead>`;
 const body=NUTRIENTS.map(f=>{const t=result.totals[f],unit=f==='kcal'?'kcal':'g';return `<tr><th scope="row">${labels[f]} (${unit})${t.complete?'':'<small>Incompleto</small>'}</th><td>${format(t.total)}</td><td>${format(t.first)}</td><td>${format(t.second)}</td></tr>${!t.complete&&t.subtotal!==null?`<tr class="nutrition-subtotal"><th scope="row">Subtotale noto · ${labels[f].toLowerCase()}</th><td>${format(t.subtotal)}</td><td>${format(t.firstSubtotal)}</td><td>${format(t.secondSubtotal)}</td></tr>`:''}`;}).join('');
 const issues=result.rows.filter(r=>r.missing.length).map(r=>{
  const why=r.issue==='quantity'?'Quantità da specificare (q.b., intervallo o valore non numerico).':r.issue==='conversion'?`Peso per ${r.unit||'unità non specificata'} da indicare.`:`Valori per 100 g mancanti: ${r.missing.map(f=>labels[f].toLowerCase()).join(', ')}.`;
  return `<li><strong>${escape(r.line.ingredient_name)}</strong>: ${escape(why)}</li>`;
 }).join('');
 $('#recipe-nutrition-results').innerHTML=`<div class="recipe-nutrition-table-wrap"><table class="recipe-nutrition-table"><caption>Totali e quote individuali${result.complete?'':' · dati incompleti'}</caption>${header}<tbody>${body}</tbody></table></div>${result.complete?'<p class="small">Le due quote sommano al totale prima dell’arrotondamento visualizzato.</p>':`<p class="nutrition-missing">Il totale completo non è disponibile per i nutrienti segnalati. I subtotali includono soltanto i contributi calcolabili e non rappresentano l’intera ricetta.</p>${issues?`<ul class="nutrition-issues">${issues}</ul>`:'<p>Aggiungi gli ingredienti per calcolare questa ricetta.</p>'}`}`;
}
async function open(id){
 recipe=getRecipeForNutrition(id);if(!recipe)return;
 $('#recipe-nutrition-error').textContent='';$('#recipe-nutrition-status').textContent='';$('#recipe-nutrition-name').textContent=recipe.name;
 draft=normalizedSettings(read('boschetto-v1').nutritionSettings);draft=structuredClone(draft);
 $('#nutrition-default-share').value=draft.defaultFirstPercent;const local=draft.recipeFirstPercent[id];
 $('#nutrition-override-share').checked=validPercent(local);$('#nutrition-recipe-share').value=validPercent(local)?number(local):draft.defaultFirstPercent;
 $('#nutrition-conversions').open=false;$('#nutrition-conversion-fields').innerHTML='';$('#recipe-nutrition-form button[type="submit"]').disabled=true;$('#recipe-nutrition-results').textContent='Caricamento nutrienti…';dialog.showModal();
 try{catalog=(await appStorage.catalog()).catalogo_ingredienti;populateConversions();display();$('#recipe-nutrition-form button[type="submit"]').disabled=false;}catch{$('#recipe-nutrition-results').textContent='Impossibile caricare il catalogo. Chiudi e riprova.';}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-recipe-nutrition]');if(b)open(b.dataset.recipeNutrition);});
$('#close-recipe-nutrition').onclick=$('#cancel-recipe-nutrition').onclick=()=>dialog.close();
$('#recipe-nutrition-form').addEventListener('input',()=>{$('#recipe-nutrition-status').textContent='Anteprima non salvata.';display();});
$('#recipe-nutrition-form').onsubmit=e=>{
 e.preventDefault();$('#recipe-nutrition-error').textContent='';
 if(!readDraft()||!e.target.reportValidity()){$('#recipe-nutrition-error').textContent='Correggi percentuali o pesi prima di salvare.';return;}
 try{const state=read('boschetto-v1');appStorage.setItem('boschetto-v1',JSON.stringify({...state,nutritionSettings:draft}));$('#recipe-nutrition-status').textContent='Rapporti e pesi salvati. Controlla lo stato di sincronizzazione in alto.';}
 catch(error){$('#recipe-nutrition-error').textContent=error.message||'Salvataggio non riuscito.';}
};
