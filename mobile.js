import {assignDay,movePlanned,mobileMenuDates} from './app.js';
import {scrollSpeed} from './drag-scroll.js';

const $=s=>document.querySelector(s);
const mobile=matchMedia('(max-width: 760px)');
const nav=document.createElement('nav');
nav.className='mobile-nav';nav.setAttribute('aria-label','Navigazione mobile');
nav.innerHTML='<a href="#categorie" data-mobile-page="recipes"><span aria-hidden="true">⌕</span>Ricette</a><a href="#calendario" data-mobile-page="calendar"><span aria-hidden="true">▦</span>Menù <small id="mobile-menu-count"></small></a><button type="button" id="mobile-shopping"><span aria-hidden="true">☷</span>Spesa</button>';
document.body.append(nav);

const menuActions=document.createElement('div');menuActions.className='mobile-only menu-actions';
menuActions.innerHTML='<p>Trascina dalla maniglia ⠿ per cambiare giorno, oppure usa “Sposta in…”.</p><button type="button" class="primary-button" id="menu-shopping">Vai alla lista della spesa</button><p class="small">Gli ingredienti del menù sono già inclusi nella spesa.</p>';
$('#calendario').append(menuActions);

let recipeScroll=0;
nav.addEventListener('click',e=>{const link=e.target.closest('a');if(!link)return;if(link.dataset.mobilePage==='calendar'){if(document.body.dataset.page!=='calendar')recipeScroll=scrollY;else scrollTo(0,0)}else if(document.body.dataset.page==='calendar')requestAnimationFrame(()=>scrollTo(0,recipeScroll))});
function openShopping(){ $('#open-shopping').click();updateNav() }
$('#mobile-shopping').onclick=openShopping;$('#menu-shopping').onclick=openShopping;
const drawer=$('#shopping-drawer');
drawer.addEventListener('close',()=>{updateNav();if(mobile.matches)$('#mobile-shopping').focus()});
function updateNav(){
 const menu=document.body.dataset.page==='calendar',shopping=drawer.open;
 for(const link of nav.querySelectorAll('a')){
  const active=!shopping&&(link.dataset.mobilePage==='calendar'?menu:!menu);
  if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 }
 $('#mobile-shopping').setAttribute('aria-expanded',String(shopping));
 const count=mobileMenuDates().reduce((sum,day)=>sum+day.count,0);$('#mobile-menu-count').textContent=count||'';
 if(mobile.matches)$('#week-title').textContent='Il menù della settimana';
 else $('#week-title').textContent='La settimana a tavola';
}
window.addEventListener('hashchange',()=>{updateNav();if(mobile.matches&&document.body.dataset.page==='calendar')requestAnimationFrame(()=>scrollTo(0,0))});
mobile.addEventListener('change',()=>window.dispatchEvent(new HashChangeEvent('hashchange')));
new MutationObserver(updateNav).observe($('#week-days'),{childList:true});
updateNav();

const picker=document.createElement('dialog');picker.id='menu-day-picker';picker.setAttribute('aria-labelledby','menu-day-title');
picker.innerHTML='<div class="section-title"><h2 id="menu-day-title">Scegli un giorno</h2><button type="button" class="delete-item" id="close-menu-day" aria-label="Chiudi scelta giorno">×</button></div><p id="menu-day-recipe"></p><div class="menu-picker-week"><button type="button" id="menu-previous">‹ Settimana prima</button><button type="button" id="menu-next">Settimana dopo ›</button></div><div id="menu-day-options"></div><p id="menu-day-status" role="status"></p>';
document.body.append(picker);
let selection=null,returnFocus=null;
const notice=document.createElement('div');notice.className='mobile-only mobile-notice';notice.hidden=true;notice.setAttribute('role','status');document.body.append(notice);
let noticeTimer;
function notify(text,undo){
 clearTimeout(noticeTimer);notice.replaceChildren(document.createTextNode(text));notice.hidden=false;
 if(undo){const button=document.createElement('button');button.type='button';button.textContent='Annulla';button.onclick=()=>{if(undo()){notice.textContent='Spostamento annullato';noticeTimer=setTimeout(()=>{notice.hidden=true},3000)}};notice.append(button)}
 noticeTimer=setTimeout(()=>{notice.hidden=true},7000);
}
function moveInMenu(from,id,to){
 if(!movePlanned(from,id,to))return false;
 if(from!==to)notify('Ricetta spostata',()=>movePlanned(to,id,from));
 return true;
}
function renderDays(){
 const dates=mobileMenuDates();$('#menu-day-options').replaceChildren(...dates.map(day=>{
  const b=document.createElement('button');b.type='button';b.dataset.assignMenu=day.key;b.disabled=selection?.from===day.key;
  b.textContent=day.label+' · '+(day.count?day.count+(day.count===1?' ricetta':' ricette'):'Libero')+(b.disabled?' · Giorno attuale':'');return b;
 }));
}
function chooseDay(button){
 const card=button.closest('[data-plan-id]');
 selection=card?{from:card.dataset.planDay,id:card.dataset.planId}:{recipe:button.dataset.addMenu};
 returnFocus=button;$('#menu-day-title').textContent=card?'Sposta la ricetta':'Aggiungi al menù';
 $('#menu-day-recipe').textContent=card?card.querySelector('strong').textContent:button.closest('article').querySelector('.recipe-name').textContent;
 $('#menu-day-status').textContent='';renderDays();picker.showModal();
}
let suppressHandleClick=false;
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-add-menu],[data-move-plan],.plan-handle');if(!button||!mobile.matches)return;
 if(!suppressHandleClick)chooseDay(button);
});
$('#close-menu-day').onclick=()=>picker.close();
picker.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();else $('#mobile-menu-count').closest('a').focus()});
for(const [id,target] of [['#menu-previous','#previous-week'],['#menu-next','#next-week']])$(id).onclick=()=>{$(target).click();renderDays()};
$('#menu-day-options').onclick=e=>{
 const button=e.target.closest('[data-assign-menu]');if(!button)return;
 if(selection.recipe){if(!assignDay(button.dataset.assignMenu,selection.recipe)){$('#menu-day-status').textContent='Impossibile aggiungere la ricetta. Verifica l’accesso e riprova.';return}notify('Aggiunta a '+mobileMenuDates().find(day=>day.key===button.dataset.assignMenu).label)}
 else if(!moveInMenu(selection.from,selection.id,button.dataset.assignMenu)){$('#menu-day-status').textContent='Spostamento non riuscito. Riprova.';return}
 picker.close();
};

// A dedicated handle reserves touch movement for dragging; the rest scrolls normally.
let dragging=null,frame=0,lastTime=0;
function highlightDay(x,y){
 const day=document.elementFromPoint(x,y)?.closest('[data-day]');
 for(const d of $('#week-days').children)d.classList.toggle('drag-over',d===day);
 return day;
}
function tick(time){
 if(!dragging)return;
 if(!dragging.moved){frame=requestAnimationFrame(tick);return}
 const top=document.querySelector('header').getBoundingClientRect().bottom;
 const bottom=nav.getBoundingClientRect().top;
 const elapsed=lastTime?Math.min(40,time-lastTime):16;lastTime=time;
 document.scrollingElement.scrollTop+=scrollSpeed(dragging.y,top,bottom)*elapsed/1000;
 highlightDay(dragging.x,dragging.y);frame=requestAnimationFrame(tick);
}
document.addEventListener('pointerdown',e=>{
 const handle=e.target.closest('.plan-handle');if(!handle||!mobile.matches||e.button!==0)return;
 e.preventDefault();e.stopImmediatePropagation();
 const card=handle.closest('[data-plan-id]');
 dragging={handle,card,from:card.dataset.planDay,id:card.dataset.planId,pointer:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};
 handle.setPointerCapture(e.pointerId);card.classList.add('touch-dragging');lastTime=0;frame=requestAnimationFrame(tick);
},true);
document.addEventListener('pointermove',e=>{
 if(!dragging||dragging.pointer!==e.pointerId)return;
 dragging.x=e.clientX;dragging.y=e.clientY;dragging.moved ||= Math.hypot(e.clientX-dragging.startX,e.clientY-dragging.startY)>8;
 highlightDay(e.clientX,e.clientY);e.preventDefault();
},{passive:false});
function finishDrag(e){
 if(!dragging||dragging.pointer!==e.pointerId)return;
 const current=dragging;dragging=null;cancelAnimationFrame(frame);
 const day=highlightDay(e.clientX,e.clientY);for(const d of $('#week-days').children)d.classList.remove('drag-over');
 current.card.classList.remove('touch-dragging');
 if(current.handle.hasPointerCapture(e.pointerId))current.handle.releasePointerCapture(e.pointerId);
 suppressHandleClick=true;setTimeout(()=>{suppressHandleClick=false},0);
 if(e.type!=='pointercancel'&&current.moved&&day){
  if(moveInMenu(current.from,current.id,day.dataset.day)){
   $('#calendar-status').textContent='Ricetta spostata. La lista della spesa è aggiornata.';
   document.querySelector(`[data-plan-id="${CSS.escape(current.id)}"] .plan-handle`)?.focus({preventScroll:true});
  }
 }else if(e.type!=='pointercancel'&&!current.moved)chooseDay(current.handle);
}
document.addEventListener('pointerup',finishDrag);document.addEventListener('pointercancel',finishDrag);
