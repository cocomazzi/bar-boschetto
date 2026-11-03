// Demand comes from recipes/calendar/manual entries. Shopping state remembers
// checkmarks and store preferences; it never represents stock or consumption.
const own=(object,key)=>Object.hasOwn(object||{},key);
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(id);
const productId=key=>String(key).split('|')[0];
const defaultStores=[{id:'store-1',name:'Supermercato 1'},{id:'store-2',name:'Supermercato 2'}];
export function normalizeShopping(raw={},legacyChecked=[],catalog=[]){
 const state={...raw,version:2};
 state.stores=defaultStores.map(base=>{const previous=raw.stores?.find?.(s=>s.id===base.id);return {...base,name:typeof previous?.name==='string'&&previous.name.trim()?previous.name.trim().slice(0,60):base.name};});
 const validStore=id=>state.stores.some(s=>s.id===id);
 state.defaultStoreId=validStore(raw.defaultStoreId)?raw.defaultStoreId:'store-1';
 state.activeStoreId=validStore(raw.activeStoreId)?raw.activeStoreId:state.defaultStoreId;
 state.preferredStores=Object.fromEntries(Object.entries(raw.preferredStores||{}).filter(([id,store])=>validId(id)&&validStore(store)));
 state.products=Object.fromEntries(Object.entries(raw.products||{}).filter(([id,p])=>validId(id)&&p&&typeof p==='object').map(([id,p])=>[id,{...p,ingredient_id:id,ingredient_name:String(p.ingredient_name&&p.ingredient_name!==id?p.ingredient_name:catalog.find(i=>i.ingredient_id===id)?.name_it||id),checked:p.checked===true,keep:p.keep===true}]));
 state.order=[...new Set((Array.isArray(raw.order)?raw.order:[]).map(productId).filter(validId))];
 state.excluded=Array.isArray(raw.excluded)?[...raw.excluded]:[];
 // Import the old purchase flags only once. Never reapply them after an uncheck.
 if(raw.version!==2)for(const oldKey of legacyChecked){const id=productId(oldKey);if(!validId(id))continue;const item=catalog.find(i=>i.ingredient_id===id);state.products[id]={...state.products[id],ingredient_id:id,ingredient_name:state.products[id]?.ingredient_name||item?.name_it||id,checked:true,keep:true};if(!own(state.preferredStores,id))state.preferredStores[id]=state.defaultStoreId;}
 return state;
}
export function storeFor(state,id){return state.preferredStores[id]||state.defaultStoreId;}
export function reconcileShopping(state,sources){
 const next={...state,preferredStores:{...state.preferredStores},products:{...state.products}};
 for(const line of sources){const id=line.ingredient_id;if(!validId(id))continue;
  if(!own(next.preferredStores,id))next.preferredStores[id]=state.defaultStoreId;
  next.products[id]={...next.products[id],ingredient_id:id,ingredient_name:line.ingredient_name||next.products[id]?.ingredient_name||id,checked:next.products[id]?.checked===true,keep:next.products[id]?.keep===true};
 }
 return next;
}
export function setPurchased(state,id,checked){
 if(!own(state.products,id))return state;
 return {...state,products:{...state.products,[id]:{...state.products[id],checked:!!checked,keep:state.products[id].keep||!!checked}}};
}
export function moveProduct(state,id,store){
 if(!state.stores.some(s=>s.id===store))throw Error('Supermercato non valido.');
 return {...state,preferredStores:{...state.preferredStores,[id]:store}};
}
export function configureStores(state,names,defaultStoreId){
 if(!state.stores.some(s=>s.id===defaultStoreId))throw Error('Supermercato predefinito non valido.');
 const stores=state.stores.map((store,i)=>{const name=String(names[i]??'').trim();if(!name||name.length>60)throw Error('Inserisci due nomi da 1 a 60 caratteri.');return {...store,name};});
 if(stores[0].name.toLocaleLowerCase()===stores[1].name.toLocaleLowerCase())throw Error('Usa due nomi diversi per riconoscere le liste.');
 return {...state,stores,defaultStoreId};
}
function quantityNumber(value){
 if(typeof value==='number')return Number.isFinite(value)&&value>=0?value:null;
 const text=String(value??'').trim().replace(',','.');
 if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text))return null;
 const n=Number(text);return Number.isFinite(n)?n:null;
}
function amountUnit(unit){
 const original=String(unit||'').trim(),normalized=original.toLowerCase().replace(/\.$/,'');
 if(['g','gr','grammi'].includes(normalized))return {unit:'g',factor:1};
 if(normalized==='kg')return {unit:'g',factor:1000};if(normalized==='hg')return {unit:'g',factor:100};
 if(['pz','pezzo','pezzi'].includes(normalized))return {unit:'pz',factor:1};
 return {unit:original,factor:1};
}
export function shoppingRows(state,sources){
 const grouped=new Map();
 for(const line of sources){if(!validId(line.ingredient_id))continue;const id=line.ingredient_id;
  if(!grouped.has(id))grouped.set(id,{quantities:new Map(),sources:[]});
  const group=grouped.get(id),info=amountUnit(line.unit);group.sources.push(line);
  if(!group.quantities.has(info.unit))group.quantities.set(info.unit,{unit:info.unit,sum:0,numeric:false,notes:new Set()});
  const part=group.quantities.get(info.unit),number=quantityNumber(line.quantity);
  if(number!==null&&Number.isFinite(number*info.factor)&&Number.isFinite(part.sum+number*info.factor)){part.sum+=number*info.factor;part.numeric=true;}else part.notes.add(String(line.quantity??'').trim()||'q.b.');
 }
 for(const [id,override] of Object.entries(state.amountOverrides||{})){const group=grouped.get(id);if(!group)continue;const parts=[...group.quantities.values()];const current=parts.length===1&&parts[0].numeric?parts[0].sum:0;const factors={g:1,kg:1000,hg:100,mg:.001};const original=parts[0]?.unit;const factor=original===override.unit?1:factors[original]&&factors[override.unit]?factors[original]/factors[override.unit]:null;const delta=current-Number(override.baseline);if(delta!==0&&factor===null)continue;const value=Math.max(0,Number(override.quantity)+delta*(factor||1));if(Number.isFinite(value))group.quantities=new Map([[override.unit,{unit:override.unit,sum:value,numeric:true,notes:new Set()}]]);}
 const ids=new Set([...grouped.keys(),...Object.keys(state.products).filter(id=>state.products[id].checked||state.products[id].keep)]);
 return [...ids].map(id=>{const record=state.products[id]||{},group=grouped.get(id);return {ingredient_id:id,key:id,ingredient_name:record.ingredient_name||group?.sources[0]?.ingredient_name||id,checked:record.checked===true,storeId:storeFor(state,id),quantities:[...(group?.quantities.values()||[])].map(p=>({...p,notes:[...p.notes]})),sources:group?.sources||[],hasDemand:!!group};})
 .sort((a,b)=>Number(a.checked)-Number(b.checked)||(state.order.indexOf(a.key)<0?Infinity:state.order.indexOf(a.key))-(state.order.indexOf(b.key)<0?Infinity:state.order.indexOf(b.key))||a.ingredient_name.localeCompare(b.ingredient_name,'it'));
}
export function reorderProducts(state,rows,source,target){
 const a=rows.find(r=>r.key===source),b=rows.find(r=>r.key===target);
 if(!a||!b||a.storeId!==b.storeId||a.checked!==b.checked||source===target)return state;
 const order=[...new Set([...state.order,...rows.map(r=>r.key)])];
 const from=order.indexOf(source),to=order.indexOf(target);order.splice(from,1);order.splice(to,0,source);
 return {...state,order};
}
