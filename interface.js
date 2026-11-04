import {scrollSpeed} from './drag-scroll.js';
import {showPage,movePlanned,moveShop,reorderShop,shopEditor,saveShopEditor} from './app.js';
const $=s=>document.querySelector(s);
const settings=document.createElement('dialog');settings.id='settings-dialog';settings.innerHTML='<h2>Impostazioni</h2><h3>Backup e trasferimento</h3><div class="sync-actions"></div><h3>Supermercati</h3><div id="settings-stores"></div><button type="button" id="close-settings">Chiudi</button>';document.body.append(settings);
for(const id of ['sync-backup','sync-upload','sync-import','sync-file'])settings.querySelector('.sync-actions').append($('#'+id));
$('#settings-stores').append($('#shopping-store-settings'));$('#shopping-store-settings').open=true;
$('#open-settings').onclick=()=>settings.showModal();$('#close-settings').onclick=()=>settings.close();
const manual=$('.manual-add');manual.querySelector('summary').innerHTML='<span id="manual-plus" role="button" aria-label="Aggiungi alla spesa">+</span>';manual.addEventListener('toggle',()=>{if(manual.open)$('#manual-name').focus()});
const options=document.createElement('details');options.className='manual-options';options.innerHTML='<summary aria-label="Opzioni aggiunta manuale">⚙</summary>';const form=$('#manual-form');for(const id of ['manual-quantity','manual-unit','manual-store']){const label=$('#'+id).closest('label');options.append(label)}form.insertBefore(options,form.querySelector('button[type=submit]'));
manual.querySelector('summary').innerHTML='<span class="manual-add-symbol">+</span><span>Aggiungi un prodotto</span>';
for(const dialog of document.querySelectorAll('dialog')){let backdrop=false;dialog.addEventListener('pointerdown',e=>{const r=dialog.getBoundingClientRect();backdrop=e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)});dialog.addEventListener('click',e=>{if(backdrop&&e.target===dialog)dialog.close();backdrop=false})}
function navigate(){const hash=location.hash.slice(1);const page=hash==='ricettario'?'recipes':hash==='calendario'?'calendar':'categories';showPage(page);$('#recipes').removeAttribute('aria-labelledby');$('#recipes').setAttribute('aria-label',page==='recipes'?'Ricettario':'Categorie');for(const [id,value] of [['nav-categories','categories'],['nav-recipes','recipes'],['nav-calendar','calendar']]){$('#'+id).toggleAttribute('aria-current',page===value);}}
window.addEventListener('hashchange',navigate);navigate();
$('#week-days').addEventListener('dragstart',e=>{if(e.target.closest('button'))return;const card=e.target.closest('[data-plan-id]');if(card)e.dataTransfer.setData('application/x-boschetto-plan',JSON.stringify({id:card.dataset.planId,day:card.dataset.planDay}));});
for(const [type,fn] of [['dragover',e=>{if(e.target.closest('[data-store-tab]'))e.preventDefault()}],['drop',e=>{const target=e.target.closest('[data-store-tab]'),id=e.dataTransfer.getData('application/x-boschetto-shopping');if(target&&id){e.preventDefault();moveShop(id,target.dataset.storeTab)}}]])$('#shopping-store-tabs').addEventListener(type,fn);
let drag=null,frame=null;
let lastFrame=0;
function tick(time){if(!drag)return;const panel=drag.shop?$('#shopping-drawer'):document.scrollingElement;const rect=drag.shop?panel.getBoundingClientRect():{top:0,bottom:innerHeight};const viewport=window.visualViewport;const top=Math.max(rect.top,viewport?.offsetTop||0),bottom=Math.min(rect.bottom,(viewport?.offsetTop||0)+(viewport?.height||innerHeight));const delta=lastFrame?Math.min(40,time-lastFrame):16;lastFrame=time;panel.scrollTop+=scrollSpeed(drag.y,top,bottom)*delta/1000;highlight(document.elementFromPoint(drag.x,Math.max(top+1,Math.min(bottom-1,drag.y)))?.closest('[data-store-tab]'));frame=requestAnimationFrame(tick)}
let pending=null;
document.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||e.target.closest('button,input,select,label,a'))return;const row=e.target.closest('[data-shop-key],[data-plan-id]');if(!row)return;pending={x:e.clientX,y:e.clientY,timer:setTimeout(()=>{drag={row,shop:!!row.dataset.shopKey,x:e.clientX,y:e.clientY,pointer:e.pointerId};row.setPointerCapture(e.pointerId);row.classList.add('touch-dragging');lastFrame=0;frame=requestAnimationFrame(tick);pending=null},420)}});
function highlight(target){for(const tab of document.querySelectorAll('[data-store-tab]'))tab.classList.toggle('drop-store',tab===target);}
document.addEventListener('dragover',e=>highlight(e.target.closest('[data-store-tab]')));document.addEventListener('dragend',()=>highlight(null));document.addEventListener('drop',()=>highlight(null));
document.addEventListener('pointermove',e=>{if(pending&&Math.hypot(e.clientX-pending.x,e.clientY-pending.y)>8){clearTimeout(pending.timer);pending=null}if(!drag)return;drag.x=e.clientX;drag.y=e.clientY;highlight(document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-store-tab]'));e.preventDefault()},{passive:false});
function finish(e){if(pending){clearTimeout(pending.timer);pending=null}highlight(null);if(!drag)return;const current=drag;drag=null;cancelAnimationFrame(frame);current.row.classList.remove('touch-dragging');if(e.type==='pointercancel')return;const target=document.elementFromPoint(e.clientX,e.clientY);if(current.shop){const store=target?.closest('[data-store-tab]');if(store)moveShop(current.row.dataset.shopKey,store.dataset.storeTab);else{const row=target?.closest('[data-shop-key]');if(row&&row!==current.row){reorderShop(current.row.dataset.shopKey,row.dataset.shopKey);}}}else{const day=target?.closest('[data-day]');if(day)movePlanned(current.row.dataset.planDay,current.row.dataset.planId,day.dataset.day)}}
document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',finish);
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(console.error);

// Prevent the browser from taking over an already activated long-press drag.
document.addEventListener('touchmove',e=>{if(!drag)return;const touch=e.touches[0];if(touch){drag.x=touch.clientX;drag.y=touch.clientY}e.preventDefault()},{passive:false,capture:true});
document.addEventListener('contextmenu',e=>{if(e.target.closest('[data-shop-key],[data-plan-id]'))e.preventDefault()});

const notes=$('.notes-editor'),expand=$('#expand-notes');
function expandNotes(on){notes.classList.toggle('is-expanded',on);expand.setAttribute('aria-expanded',String(on));expand.setAttribute('aria-label',on?'Riduci note e procedimento':'Espandi note e procedimento');$('#new-notes').focus()}
expand.onclick=()=>expandNotes(!notes.classList.contains('is-expanded'));
$('#recipe-dialog').addEventListener('close',()=>{notes.classList.remove('is-expanded');expand.setAttribute('aria-expanded','false')});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&notes.classList.contains('is-expanded')){e.preventDefault();e.stopImmediatePropagation();expandNotes(false)}},true);
