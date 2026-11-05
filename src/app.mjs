import {TABLE,START,TRACK_WIDTH,LANE_OFFSET,CATALOG,STARTER,FIGURE_EIGHT,buildTrack,positionAt,nearestPiece,freeStock,allowed,UNLIMITED_DEVELOPMENT_STOCK,positionOnPiece,findLegalClosure,findStraightRebalance,carTrackLevel,gapAnalysis} from "./track.mjs";
import {buildRecipe,blueprintReferenceMap,slugName} from "./blueprint.mjs";
const $=id=>document.getElementById(id);
const storage=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}};
const KEY="slotrace-lab-10";
const LIBRARY_KEY="slotrace-circuit-library-v1";
const readLibrary=()=>{try{
 const stored=JSON.parse(storage(LIBRARY_KEY)||"[]");
 return Array.isArray(stored)?stored.filter(item=>item&&typeof item.id==="string"&&
  typeof item.name==="string"&&Array.isArray(item.snapshot?.types)&&
  allowed(item.snapshot.types)).slice(0,120):[];
 }catch(e){return [];}};
const initialLibrary=readLibrary();
const old=(()=>{try{return JSON.parse(storage(KEY)||"null");}catch(e){return null;}})();
const legacy=(()=>{try{return JSON.parse(storage("slotrace-lab-04")||"null");}catch(e){return null;}})();
const oldValid=old?.types&&allowed(old.types);
const initial=oldValid?old.types.slice():FIGURE_EIGHT.slice();
const originalRaised=oldValid&&Array.isArray(old?.bridgeParts)?old.bridgeParts.filter(i=>Number.isInteger(i)&&i>=0&&i<initial.length):[];
// El primer inicio de DEV 0.5 conserva la construcción anterior sin
// sustituir el ocho de demostración. Nunca borramos la clave antigua.
const legacyDraft=!oldValid&&legacy?.types&&allowed(legacy.types)?
 {types:legacy.types.slice(),loose:Array.isArray(legacy.loose)?legacy.loose:[]} :null;
const storedLoose=Array.isArray(old?.loose)?old.loose.filter(p=>CATALOG[p?.id]&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.h)):[];
const initialLoose=allowed([...initial,...storedLoose.map(p=>p.id)])?storedLoose:[];
const initialOrigin=old?.origin&&[old.origin.x,old.origin.y,old.origin.h].every(Number.isFinite)?
 {...old.origin}:{...START};
const state={
  circuitName:typeof old?.circuitName==="string"?old.circuitName.slice(0,64):"",
  activeCircuitId:initialLibrary.some(c=>c.id===old?.activeCircuitId)?old.activeCircuitId:null,
  library:initialLibrary,sessionLaps:[],sessionName:"",
  gridEnabled:old?.gridEnabled!==false,caseOpen:old?.caseOpen!==false,viewDirty:true,caseCurveDirection:old?.caseCurveDirection==="L"?"L":"R",
  types:initial,loose:initialLoose,bridgeParts:originalRaised,origin:initialOrigin,track:buildTrack(initial,initialOrigin,originalRaised),mode:"menu",driveDirection:old?.driveDirection===-1?-1:1,newCircuitDirection:old?.driveDirection===-1?-1:1,selection:-1,looseSelection:-1,selectionMode:"group",selectedGroup:null,dragLoose:-1,
  history:[],redo:[],draft:old?.draft&&Array.isArray(old.draft.types)?old.draft:
 Array.isArray(old?.draft)&&allowed(old.draft)?{types:old.draft,loose:[]}:
 legacyDraft,
  lane:0,run:false,lap:1,seconds:0,speed:0,distance:0,penalty:0,
  drift:0,driftDirection:0,deslot:null,cornerDistance:0,gripDebt:0,cornerDirection:0,
  gas:0,buttonGas:false,keyboardGas:false,triggerGesture:null,clicksEnabled:old?.clicksEnabled!==false,
  records:old?.records&&typeof old.records==="object"?old.records:
 legacy?.records&&typeof legacy.records==="object"?legacy.records:{},
  messages:[],notice:"",noticeUntil:0,rev:0,
  camera:{panX:0,panY:0,zoom:1},pointer:new Map(),pinch:null,gapDiagnostic:null,
  dragging:null,latest:performance.now()
};
const oldBoard=old?.workBoard;
const boardValid=oldBoard&&["left","top","right","bottom","width","height"].every(k=>Number.isFinite(oldBoard[k]));
state.workBoard=boardValid?{...oldBoard}:{...state.track.board};
function save(){storage(KEY,JSON.stringify({types:state.types,loose:state.loose,bridgeParts:state.bridgeParts,
 origin:state.origin,workBoard:state.workBoard,draft:state.draft,records:state.records,
 circuitName:state.circuitName,activeCircuitId:state.activeCircuitId,
 gridEnabled:state.gridEnabled,clicksEnabled:state.clicksEnabled,caseOpen:state.caseOpen,caseCurveDirection:state.caseCurveDirection,
 driveDirection:state.driveDirection}));}
const GRID_MM=25;
const gridSnap=v=>Math.round(v/GRID_MM)*GRID_MM;
const coordinate=v=>state.gridEnabled?gridSnap(v):v;
function gridXY(x,y){return {x:coordinate(x),y:coordinate(y)};}
function extendWorkBoard(){
 const b=state.workBoard,t=state.track.board;
 // Ampliar si hace falta, pero NUNCA reducir mientras se arrastra:
 // cambiar el encuadre bajo el dedo provocaba saltos de cámara.
 b.left=Math.min(b.left,t.left);b.top=Math.min(b.top,t.top);
 b.right=Math.max(b.right,t.right);b.bottom=Math.max(b.bottom,t.bottom);
 b.width=b.right-b.left;b.height=b.bottom-b.top;
}
function resetWorkBoard(){state.workBoard={...state.track.board};}

const stage=$("buildScreen"),race=$("raceScreen"),menu=$("menuScreen"),results=$("resultsScreen");
const editCanvas=$("editCanvas"),raceCanvas=$("raceCanvas");
const canvasCtx=new Map([[editCanvas,editCanvas.getContext("2d",{alpha:false})],[raceCanvas,raceCanvas.getContext("2d",{alpha:false})]]);
const format=n=>n.toFixed(3).replace(".",",");
const recKey=()=>(state.activeCircuitId?"library-"+state.activeCircuitId+"-":"")+
 state.types.join("-")+(state.driveDirection===-1?"-reverse":"");
const record=()=>{const v=state.records[recKey()];return Array.isArray(v)&&v.length===2?v:[null,null];};
function toast(text){state.notice=text;state.noticeUntil=performance.now()+2600;$("toast").textContent=text;$("toast").classList.add("show");}
function setMessage(msg){$("buildStatus").textContent=msg;}
function snapshot(){return{types:state.types.slice(),loose:state.loose.map(p=>({...p})),bridgeParts:state.bridgeParts.slice(),origin:{...state.origin}};}
function restoreSnapshot(shot){
 state.types=shot.types.slice();state.loose=(shot.loose||[]).map(p=>({...p}));
 state.bridgeParts=(shot.bridgeParts||[]).filter(i=>Number.isInteger(i)&&i>=0&&i<state.types.length);
 state.origin=shot.origin?{...shot.origin}:{...START};
 state.track=buildTrack(state.types,state.origin,state.bridgeParts);extendWorkBoard();
 clearGapDiagnostic();
 state.selection=-1;state.looseSelection=-1;state.selectionMode="group";state.selectedGroup=null;resetLap();save();updateUI();
}

/* Inventario de recetas local, compatible con una futura cuenta y catálogo. */
function saveLibrary(){storage(LIBRARY_KEY,JSON.stringify(state.library));}
function circuitLabel(){return state.circuitName.trim()||"Circuito sin nombre";}
function saveCircuit(){
 const field=state.mode==="build"?$("workCircuitName"):$("circuitName");
 const name=String(field.value||state.circuitName).trim().replace(/\s+/g," ").slice(0,64);
 if(!name){toast("Ponle nombre al circuito antes de guardarlo.");return false;}
 if(!state.types.length&&!state.loose.length){toast("Añade al menos una pieza.");return false;}
 let item=state.library.find(c=>c.id===state.activeCircuitId);
 if(!item&&state.library.length>=120){toast("Inventario completo (120 circuitos).");return false;}
 const previous=record();
 if(!item){
  item={id:"sr-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),
   createdAt:new Date().toISOString()};
  state.library.unshift(item);
 }
 state.circuitName=name;state.activeCircuitId=item.id;
 item.name=name;item.direction=state.driveDirection;item.snapshot=snapshot();
 item.updatedAt=new Date().toISOString();
 if(!state.records[recKey()]&&previous.some(v=>v!==null))state.records[recKey()]=previous.slice();
 saveLibrary();save();updateUI();toast("Guardado en Mis circuitos: «"+name+"».");return true;
}
function loadSavedCircuit(id){
 const item=state.library.find(c=>c.id===id);
 if(!item||!allowed(item.snapshot.types))return false;
 if(state.types.length||state.loose.length)state.draft={...snapshot(),
  name:state.circuitName,direction:state.driveDirection,activeId:state.activeCircuitId};
 state.circuitName=item.name;state.activeCircuitId=id;
 state.driveDirection=item.direction===-1?-1:1;
 state.newCircuitDirection=state.driveDirection;
 restoreSnapshot(item.snapshot);resetWorkBoard();
 state.camera={panX:0,panY:0,zoom:1};state.sessionLaps=[];
 save();openWorkshop();toast("Circuito recuperado: «"+item.name+"».");return true;
}
function renderLibrary(){
 const list=$("circuitLibrary");list.innerHTML="";
 $("libraryCount").textContent=state.library.length+" guardados";
 if(!state.library.length){
  const empty=document.createElement("p");empty.className="library-empty";
  empty.textContent="Todavía no hay circuitos guardados.";
  list.appendChild(empty);return;
 }
 for(const item of state.library){
  const row=document.createElement("div");row.className="library-entry";
  const info=document.createElement("div");info.className="library-info";
  const name=document.createElement("strong");name.textContent=item.name;
  const detail=document.createElement("small");
  detail.textContent=item.snapshot.types.length+" piezas · "+
   (item.direction===-1?"Antihorario":"Horario")+
   (item.id===state.activeCircuitId?" · EN MESA":"");
  info.appendChild(name);info.appendChild(detail);
  const button=document.createElement("button");button.className="mini";
  button.type="button";button.textContent="Abrir";
  button.addEventListener("click",()=>loadSavedCircuit(item.id));
  row.appendChild(info);row.appendChild(button);list.appendChild(row);
 }
}
function circuitPackage(){
 const recipe=blueprintData();
 return{format:"slotrace-recipe",version:1,geometry:"SR-PRECISION",
  name:circuitLabel(),direction:state.driveDirection,types:state.types.slice(),
  origin:{...state.origin},bridgeParts:state.bridgeParts.slice(),
  loose:state.loose.map(p=>({...p})),
  items:recipe.items.map(({id,name,count})=>({id,name,count})),
  exportedAt:new Date().toISOString()};
}
async function exportRecipe(){
 if(!state.types.length&&!state.loose.length){toast("No hay piezas para exportar.");return false;}
 const filename="slotrace-receta-"+slugName(circuitLabel())+".json";
 const blob=new Blob([JSON.stringify(circuitPackage(),null,2)],{type:"application/json"});
 if(typeof navigator!=="undefined"&&typeof navigator.share==="function"&&typeof File==="function"){
  const file=new File([blob],filename,{type:"application/json"});
  if(typeof navigator.canShare!=="function"||navigator.canShare({files:[file]})){
   try{await navigator.share({files:[file],title:"Receta "+circuitLabel()});return true;}
   catch(e){if(e?.name==="AbortError")return false;}
  }
 }
 const link=document.createElement("a"),url=URL.createObjectURL(blob);
 link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
 if(typeof window.setTimeout==="function")window.setTimeout(()=>URL.revokeObjectURL(url),60000);
 toast("Receta exportada.");return true;
}
async function importRecipe(file){
 if(!file||file.size>250000){toast("La receta es demasiado grande.");return false;}
 let data;
 try{data=JSON.parse(await file.text());}catch(e){toast("No se pudo leer la receta.");return false;}
 if(data?.format!=="slotrace-recipe"||data.version!==1||
  !Array.isArray(data.types)||data.types.length>200||
  !Array.isArray(data.loose)||data.loose.length>200||
  !allowed([...data.types,...data.loose.map(p=>p?.id)])||
  !data.origin||![data.origin.x,data.origin.y,data.origin.h].every(Number.isFinite)||
  !data.loose.every(p=>p&&[p.x,p.y,p.h].every(Number.isFinite))||
  !Array.isArray(data.bridgeParts)||
  !data.bridgeParts.every(i=>Number.isInteger(i)&&i>=0&&i<data.types.length)||
  (!data.types.length&&!data.loose.length)){
  toast("Receta inválida o incompatible con SR-PRECISION.");return false;
 }
 if(state.library.length>=120){toast("Inventario completo (120 circuitos).");return false;}
 const item={id:"sr-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),
  name:String(data.name||"Circuito importado").trim().slice(0,64)||"Circuito importado",
  direction:data.direction===-1?-1:1,
  snapshot:{types:data.types.slice(),loose:data.loose.map(p=>({...p})),
   bridgeParts:data.bridgeParts.slice(),origin:{...data.origin}},
  createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 state.library.unshift(item);saveLibrary();loadSavedCircuit(item.id);
 toast("Receta adquirida para Mis circuitos: «"+item.name+"».");return true;
}
function clearGapDiagnostic(){
 state.gapDiagnostic=null;
 $("gapInfo").hidden=true;
}
function pushHistory(){
 clearGapDiagnostic();
 state.history.push(snapshot());if(state.history.length>45)state.history.shift();state.redo=[];
}
function changeTypes(next,msg,loose=state.loose,newOrigin=state.origin,{preserveBridge=false}={}){
 if(!allowed([...next,...loose.map(p=>p.id)])){toast("La construcción contiene piezas desconocidas.");return false;}
 const wasClosed=state.track.closed;
 pushHistory();
 const sameGeometry=next.length===state.types.length&&next.every((id,i)=>id===state.types[i]);
 state.types=next.slice();state.loose=loose.map(p=>({...p}));state.origin={...newOrigin};
 if(!sameGeometry&&!preserveBridge)state.bridgeParts=[];
 state.track=buildTrack(state.types,state.origin,state.bridgeParts);extendWorkBoard();
 state.selection=-1;state.looseSelection=-1;state.selectionMode="group";state.selectedGroup=null;state.run=false;resetLap();
 save();updateUI();
 if(!wasClosed&&state.track.closed){
   toast(state.track.intersection?"Los extremos encajan, pero hay un cruce sin puente.":
     "¡Clac! Conectores unidos con precisión.");
 }else if(msg)toast(msg);
 return true;
}
function resetLap(){state.lap=1;state.seconds=0;state.speed=0;state.distance=0;state.penalty=0;state.gas=0;state.drift=0;state.driftDirection=0;state.deslot=null;state.cornerDistance=0;state.gripDebt=0;state.cornerDirection=0;state.buttonGas=false;state.keyboardGas=false;
 state.triggerGesture=null;$("trigger").classList.remove("pressed");}
function undo(){if(!state.history.length){toast("No hay movimientos que deshacer.");return;}
 state.redo.push(snapshot());restoreSnapshot(state.history.pop());}
function redo(){if(!state.redo.length){toast("No hay movimientos que rehacer.");return;}
 state.history.push(snapshot());restoreSnapshot(state.redo.pop());}
function addLoose(id,x,y,h=0){
 if(!allowed([...state.types,...state.loose.map(p=>p.id),id])){toast("Ese tipo de pieza no existe en el catálogo.");return false;}
 const b=state.workBoard,point=gridXY(
  Math.max(b.left+145,Math.min(b.right-225,x)),
  Math.max(b.top+155,Math.min(b.bottom-220,y))
 );
 pushHistory();state.loose.push({id,x:point.x,y:point.y,h});
 state.selection=-1;state.looseSelection=state.loose.length-1;state.selectionMode="piece";state.selectedGroup=looseGroupKey(state.looseSelection);save();updateUI();toast("Pieza suelta. Muévela libremente; conéctala cuando quieras.");return true;
}

/* DEV 0.8.0 · imanes entre cualquier par de grupos o piezas sueltas. */
const SNAP_DISTANCE_MM=135, SNAP_ROTATION_RAD=Math.PI/2+1e-5;
// Una pieza individual se puede girar libremente al acercar conectores.
// Los tramos de varias piezas conservan el límite de giro para evitar
// giros bruscos que desplacen un montaje grande contra otras piezas.
const SINGLE_SNAP_ROTATION_RAD=Math.PI+1e-5;
let magnetSerial=1+Math.max(0,...state.loose.map(p=>{const m=/^magnet-(\d+)$/.exec(p.magnetGroup||"");return m?+m[1]:0;}));
const newMagnetGroup=()=> "magnet-"+magnetSerial++;
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const connectorDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function looseMembers(index){
 const p=state.loose[index];if(!p)return[];
 if(!p.magnetGroup)return[index];
 return state.loose.map((piece,i)=>({piece,i}))
  .filter(v=>v.piece.magnetGroup===p.magnetGroup)
  .sort((a,b)=>(a.piece.magnetOrder||0)-(b.piece.magnetOrder||0))
  .map(v=>v.i);
}
function looseGroup(index){
 const indices=looseMembers(index);if(!indices.length)return null;
 const parts=indices.map(i=>state.loose[i]);
 const start={x:parts[0].x,y:parts[0].y,h:parts[0].h};
 const end=positionOnPiece(parts.at(-1),parts.at(-1).id,1);
 return{indices,parts,start,end,key:parts[0].magnetGroup||"single-"+indices[0]};
}
function looseGroupKey(index){return state.loose[index]?.magnetGroup||"single-"+index;}
function reversedPartId(id){
 const spec=CATALOG[id];
 if(!spec)return null;
 if(spec.length)return id; // Una recta es simétrica respecto a sus extremos.
 if(id.endsWith("R"))return CATALOG[id.slice(0,-1)+"L"]?id.slice(0,-1)+"L":null;
 if(id.endsWith("L"))return CATALOG[id.slice(0,-1)+"R"]?id.slice(0,-1)+"R":null;
 return null;
}
// Validación doble: unir un extremo sólo cierra un circuito si el
// extremo contrario también coincide. No confundir piezas que se rozan
// con un lazo matemáticamente conectado.
function loopFromLooseGroup(index){
 const group=looseGroup(index);
 if(!group||group.indices.length<4)return null;
 for(let k=1;k<group.parts.length;k++){
  const prev=group.parts[k-1],cur=group.parts[k];
  const end=positionOnPiece(prev,prev.id,1);
  if(connectorDistance(end,cur)>1e-5||
     Math.abs(angleDiff(end.h,cur.h))>1e-7)return null;
 }
 const raised=group.parts.flatMap((p,i)=>p.raised?[i]:[]);
 const track=buildTrack(group.parts.map(p=>p.id),group.start,raised);
 return{group,track};
}
function closeLooseLoop(index,{history=true}={}){
 if(state.types.length)return false;
 const candidate=loopFromLooseGroup(index);
 if(!candidate?.track.closed)return false;
 if(history)pushHistory();
 const {group,track}=candidate;
 state.types=group.parts.map(p=>p.id);
 state.bridgeParts=group.parts.flatMap((p,i)=>p.raised?[i]:[]);
 state.origin={...group.start};
 for(const i of [...group.indices].sort((a,b)=>b-a))state.loose.splice(i,1);
 state.track=buildTrack(state.types,state.origin,state.bridgeParts);
 extendWorkBoard();
 state.selectedGroup="main";state.selectionMode="group";
 state.selection=0;state.looseSelection=-1;state.dragLoose=-1;
 save();updateUI();
 toast(track.valid?
  "¡Clac doble! Los dos extremos encajan: circuito cerrado.":
  "Extremos unidos, pero falta resolver el cruce o la posición del puente.");
 return true;
}
function wouldCloseOnJoin(moving,target,side,reversed){
 if(target.kind!=="loose"||state.types.length)return false;
 const t=looseGroup(target.index);
 if(!t||moving.indices.length+t.indices.length<4)return false;
 const movingIds=moving.parts.map(p=>p.id);
 if(reversed&&movingIds.length===1)movingIds[0]=reversedPartId(movingIds[0]);
 const joined=side==="append"?
  [...t.parts.map(p=>p.id),...movingIds]:
  [...movingIds,...t.parts.map(p=>p.id)];
 return buildTrack(joined,START).closed;
}
function bestMagnet(index,{distance=SNAP_DISTANCE_MM}={}){
 const moving=looseGroup(index);if(!moving)return null;
 const excluded=new Set(moving.indices),targets=[];
 if(state.types.length&&!state.track.closed)targets.push({kind:"main",start:state.origin,end:state.track.ends.end});
 const seen=new Set();
 for(let i=0;i<state.loose.length;i++){
  if(excluded.has(i))continue;
  const group=looseGroup(i);if(!group||seen.has(group.key))continue;
  seen.add(group.key);targets.push({kind:"loose",index:i,start:group.start,end:group.end});
 }
 // Los dos extremos son equivalentes físicamente en una pieza sola.
 // Antes sólo probábamos inicio→final y final→inicio. Quedaban sin opción
 // de acoplamiento las combinaciones inicio→inicio y final→final.
 const canReverse=moving.indices.length===1&&Boolean(reversedPartId(moving.parts[0].id));
 const hReverseStart=moving.end.h+Math.PI,hReverseEnd=moving.start.h+Math.PI;
 const reversedStart={...moving.end,h:hReverseStart};
 const reversedEnd={...moving.start,h:hReverseEnd};
 const maxAngle=moving.indices.length===1?SINGLE_SNAP_ROTATION_RAD:SNAP_ROTATION_RAD;
 let best=null;
 for(const target of targets){
  const candidates=[
   {side:"append",from:moving.start,to:target.end,reversed:false},
   {side:"prepend",from:moving.end,to:target.start,reversed:false}
  ];
  if(canReverse)candidates.push(
   {side:"append",from:reversedStart,to:target.end,reversed:true},
   {side:"prepend",from:reversedEnd,to:target.start,reversed:true}
  );
  for(const candidate of candidates){
   const {from,to}=candidate,gap=connectorDistance(from,to),
    rotation=angleDiff(to.h,from.h);
   if(gap>distance||Math.abs(rotation)>maxAngle)continue;
   // Favorecer conectores próximos y cambios mínimos de orientación,
   // pero nunca bloquear un empalme válido sólo por girar 180°.
   const closesLoop=wouldCloseOnJoin(moving,target,candidate.side,candidate.reversed);
   // Si la pieza encaja por ambos extremos, esa posición tiene prioridad
   // frente a una unión aislada más cercana que dejaría el otro abierto.
   const score=gap+Math.abs(rotation)*22-(closesLoop?400:0);
   if(!best||score<best.score)
    best={...target,...candidate,gap,rotation,score,closesLoop};
  }
 }
 return best;
}
function reverseLooseSingle(index){
 const piece=state.loose[index],reversedId=reversedPartId(piece.id);
 if(!reversedId)return false;
 const end=positionOnPiece(piece,piece.id,1);
 piece.x=end.x;piece.y=end.y;piece.h=end.h+Math.PI;
 piece.id=reversedId;
 return true;
}
function transformLoose(indices,from,to){
 const angle=angleDiff(to.h,from.h),c=Math.cos(angle),sn=Math.sin(angle);
 for(const i of indices){
  const p=state.loose[i],dx=p.x-from.x,dy=p.y-from.y;
  p.x=to.x+c*dx-sn*dy;p.y=to.y+sn*dx+c*dy;p.h+=angle;
 }
}
function snapLoose(index,{force=false,history=true}={}){
 const source=looseGroup(index);if(!source)return false;
 const magnet=bestMagnet(index,{distance:force?SNAP_DISTANCE_MM*1.5:SNAP_DISTANCE_MM});
 if(!magnet)return false;
 if(history)pushHistory();
 else clearGapDiagnostic();
 if(magnet.reversed)reverseLooseSingle(source.indices[0]);
 transformLoose(source.indices,magnet.from,magnet.to);
 const moved=source.indices.map(i=>({...state.loose[i]}));
 if(magnet.kind==="main"){
  if(magnet.side==="append"){
   const offset=state.types.length;
   state.types.push(...moved.map(p=>p.id));
   for(const [k,p] of moved.entries())if(p.raised)state.bridgeParts.push(offset+k);
  }else{
   state.bridgeParts=state.bridgeParts.map(i=>i+moved.length);
   state.types.unshift(...moved.map(p=>p.id));
   for(const [k,p] of moved.entries())if(p.raised)state.bridgeParts.push(k);
   state.origin={x:moved[0].x,y:moved[0].y,h:moved[0].h};
  }
  for(const i of [...source.indices].sort((a,b)=>b-a))state.loose.splice(i,1);
  state.track=buildTrack(state.types,state.origin,state.bridgeParts);extendWorkBoard();
  state.selectedGroup="main";state.selectionMode="group";state.selection=0;state.looseSelection=-1;
 }else{
  const target=looseGroup(magnet.index);
  const combined=magnet.side==="append"?[...target.indices,...source.indices]:
   [...source.indices,...target.indices];
  const groupId=target.parts[0].magnetGroup||newMagnetGroup();
  for(const [order,i] of combined.entries()){
   state.loose[i].magnetGroup=groupId;state.loose[i].magnetOrder=order;
  }
  state.selectedGroup=groupId;state.selectionMode="group";state.looseSelection=combined[0];state.selection=-1;
  // Tras la primera unión, comprobar también la conexión restante.
  // Si se ha completado un circuito cerrado, convertir el grupo a pista
  // jugable sin esperar a que el usuario pulse Iniciar.
  if(closeLooseLoop(combined[0],{history:false}))return true;
 }
 state.dragLoose=-1;save();updateUI();
 toast(state.track.valid?"¡Clac doble! Circuito cerrado. Puedes correr.":
  "¡Clac! Un extremo conectado; revisa el otro para cerrar.");
 return true;
}
function detachConnected(index,{history=true}={}){
 if(index<0||index>=state.types.length)return -1;
 if(history)pushHistory();
 const pieces=state.track.parts.slice(index).map(part=>({
  id:part.id,x:part.start.x,y:part.start.y,h:part.start.h,
  ...(state.bridgeParts.includes(part.index)?{raised:true}:{})
 }));
 state.bridgeParts=state.bridgeParts.filter(i=>i<index);
 const first=state.loose.length;
 state.types=state.types.slice(0,index);
 if(pieces.length>1){
  const key=newMagnetGroup();
  for(let k=1;k<pieces.length;k++){pieces[k].magnetGroup=key;pieces[k].magnetOrder=k-1;}
 }
 state.loose.push(...pieces);
 state.track=buildTrack(state.types,state.origin,state.bridgeParts);extendWorkBoard();
 state.selection=-1;state.looseSelection=first;state.selectionMode="piece";state.selectedGroup="single-"+first;
 state.run=false;save();updateUI();return first;
}
function detachLooseMember(index){
 const members=looseMembers(index);if(members.length<=1)return;
 const position=members.indexOf(index),original=state.loose[index].magnetGroup;
 const before=members.slice(0,position),after=members.slice(position+1);
 delete state.loose[index].magnetGroup;delete state.loose[index].magnetOrder;
 for(const [order,i] of before.entries()){
  if(before.length===1){delete state.loose[i].magnetGroup;delete state.loose[i].magnetOrder;}
  else{state.loose[i].magnetGroup=original;state.loose[i].magnetOrder=order;}
 }
 const suffixId=newMagnetGroup();
 for(const [order,i] of after.entries()){
  if(after.length===1){delete state.loose[i].magnetGroup;delete state.loose[i].magnetOrder;}
  else{state.loose[i].magnetGroup=suffixId;state.loose[i].magnetOrder=order;}
 }
}
function promoteLooseGroup(index){
 const group=looseGroup(index);if(!group||state.types.length)return false;
 pushHistory();state.origin={...group.start};state.types=group.parts.map(p=>p.id);
 state.bridgeParts=group.parts.flatMap((p,i)=>p.raised?[i]:[]);
 for(const i of [...group.indices].sort((a,b)=>b-a))state.loose.splice(i,1);
 state.track=buildTrack(state.types,state.origin,state.bridgeParts);extendWorkBoard();
 state.selectedGroup="main";state.selectionMode="group";state.selection=0;state.looseSelection=-1;
 save();updateUI();toast("¡Tramo fijado! Puedes seguir ampliándolo.");return true;
}
function startSelectedPiece(){
 if(state.looseSelection<0)return;
 if(!state.types.length){promoteLooseGroup(state.looseSelection);return;}
 if(!snapLoose(state.looseSelection,{history:true}))
  toast("Acerca un conector a otro para unir los tramos.");
}
// Accesorio elevación: un kit incluye dos apoyos y rampas de 65 mm.
// No altera la posición 2D ni crea un módulo de pista falso.
function installBridgeKit(){
 const looseIndex=state.looseSelection,mainIndex=state.selection;
 const isLoose=looseIndex>=0;
 const id=isLoose?state.loose[looseIndex]?.id:state.types[mainIndex];
 const spec=CATALOG[id];
 if(!spec){toast("Selecciona una recta y después toca Kit puente.");return false;}
 if(!spec.length||spec.length<350){
  toast("Para instalar rampas necesitas una recta de 350 o 600 mm.");return false;
 }
 pushHistory();
 let enabled;
 if(isLoose){
  enabled=!state.loose[looseIndex].raised;
  if(enabled)state.loose[looseIndex].raised=true;
  else delete state.loose[looseIndex].raised;
 }else{
  enabled=!state.bridgeParts.includes(mainIndex);
  if(enabled)state.bridgeParts=[mainIndex];
  else state.bridgeParts=state.bridgeParts.filter(i=>i!==mainIndex);
 }
 state.track=buildTrack(state.types,state.origin,state.bridgeParts);
 save();updateUI();
 toast(enabled?"Kit instalado: dos apoyos y rampas de 65 mm.":"Kit retirado de la recta.");
 return true;
}
function selectByTap(kind,index){
 const key=kind==="main"?"main":looseGroupKey(index);
 const length=kind==="main"?state.types.length:looseMembers(index).length;
 const same=state.selectedGroup===key;
 state.selectionMode=length<=1?"piece":same&&state.selectionMode==="group"?"piece":"group";
 state.selectedGroup=key;
 state.selection=kind==="main"?index:-1;state.looseSelection=kind==="main"?-1:index;
 updateUI();
}
function scatterLoose(id){
 // Cada toque de la caja añade una pieza nueva, sin reordenar las demás.
 const b=state.workBoard;
 const n=state.loose.length;
 const cols=Math.max(2,Math.floor((b.width-300)/400));
 const x=b.left+180+(n%cols)*400;
 const y=b.top+195+(Math.floor(n/cols)%4)*270;
 return addLoose(id,x,y,0);
}
const pocketPartId=id=>id.includes("_")&&id.endsWith("R")?id.slice(0,-1)+state.caseCurveDirection:id;
function inventoryAction(id){
 const chosen=pocketPartId(id);
 if(!CATALOG[chosen])return;
 scatterLoose(chosen);
}
function toggleCaseCurveDirection(){
 state.caseCurveDirection=state.caseCurveDirection==="R"?"L":"R";
 save();updateUI();
 toast(state.caseCurveDirection==="R"?"Caja: curvas a la derecha.":"Caja: curvas a la izquierda.");
}
function flipSelectedCurve(){
 let id=null;
 if(state.looseSelection>=0)id=state.loose[state.looseSelection]?.id;
 else if(state.selectionMode==="piece"&&state.selection>=0)id=state.types[state.selection];
 if(!id||!id.includes("_")||!/[RL]$/.test(id)){
  toast("Selecciona una curva de la mesa para voltearla.");
  return;
 }
 const opposite=id.slice(0,-1)+(id.endsWith("R")?"L":"R");
 if(state.looseSelection>=0){
  pushHistory();detachLooseMember(state.looseSelection);
  state.loose[state.looseSelection].id=opposite;
  save();updateUI();toast("Curva suelta invertida. Encájala en sentido contrario.");
 }else{
  const next=state.types.slice();next[state.selection]=opposite;
  changeTypes(next,"Curva del circuito invertida: revisa los conectores.");
 }
}
function openGroups(){
 const groups=[];
 if(state.types.length&&!state.track.closed)
  groups.push({key:"main",count:state.types.length,start:{...state.origin},end:{...state.track.ends.end},index:null});
 const seen=new Set();
 for(let i=0;i<state.loose.length;i++){
  const group=looseGroup(i);
  if(!group||seen.has(group.key))continue;
  seen.add(group.key);
  groups.push({key:group.key,count:group.indices.length,start:group.start,end:group.end,index:i});
 }
 return groups;
}
function measureOpenGap(){
 const groups=openGroups(),selected=state.looseSelection>=0?looseGroupKey(state.looseSelection):
  state.selection>=0?"main":null;
 let possible=gapAnalysis.analyzeOpenEnds(groups,CATALOG,{selectedKey:selected,maxDistance:800});
 if(!possible.length&&selected)
  possible=gapAnalysis.analyzeOpenEnds(groups,CATALOG,{maxDistance:800});
 // Priorizar el hueco del MISMO tramo: únicamente ese par de extremos
 // puede convertir una cadena abierta en circuito cerrado. Las distancias
 // entre dos tramos sueltos son puntos de montaje, no cierres.
 const sameGroup=p=>p.fromKey===p.toKey&&groups.some(g=>g.key===p.fromKey&&g.count>=4);
 const self=possible.filter(sameGroup);
 const result=self[0]||possible[0]||null;
 let message=gapAnalysis.gapExplanation(result);
 let balance=null;
 if(result?.fromKey===result?.toKey){
  const section=groups.find(g=>g.key===result.fromKey);
  const pieceTypes=section?.index!=null?
   looseGroup(section.index)?.parts.map(part=>part.id):
   section?.key==="main"?state.types:null;
  if(pieceTypes?.length>=4){
   const origin=section.start;
   const raised=section.index!=null?
    looseGroup(section.index).parts.flatMap((part,i)=>part.raised?[i]:[]):state.bridgeParts;
   balance=findStraightRebalance(pieceTypes,{origin,raisedParts:raised});
  }
 }
 if(result){
  if(result.fromKey!==result.toKey){
   message="UNIÓN ENTRE DOS TRAMOS · "+message+
    " Esta distancia conecta un extremo con otro, pero NO garantiza cerrar el circuito.";
  }else if(result.problem==="touching"){
   const group=groups.find(g=>g.key===result.fromKey);
   const candidate=group?.index!=null?loopFromLooseGroup(group.index):null;
   message=candidate?.track.closed?
    "LOS DOS EXTREMOS COINCIDEN · Pulsa Cerrar exacto para convertir el tramo unido en circuito.":
    "Los conectores están muy próximos, pero comprueba su orientación y que todas las piezas estén acopladas.";
  }else{
   message="HUECO DEL MISMO TRAMO · "+message;
  }
  if(balance?.ok&&!balance.unchanged&&!result?.combination){
   const edits=balance.changes.map(change=>
    CATALOG[change.from].length.toLocaleString("es-ES")+" → "+CATALOG[change.to].length.toLocaleString("es-ES")+" mm").join(" + ");
   message="CIERRE POR COMPENSACIÓN · Sustituir "+edits+
    ". Sin pieza de 12,5 mm ni deformaciones. Pulsa Cerrar exacto.";
  }
 }
 state.gapDiagnostic=result?{...result,message}:null;
 $("gapInfo").textContent=message;$("gapInfo").hidden=false;
 state.viewDirty=true;
 toast(result?"Distancia y orientación comprobadas.":"No hay dos extremos cercanos para medir.");
 return result;
}
function closeExactly(){
 if(state.track.closed){
  toast(state.track.intersection&&!state.track.bridge?
   "Los extremos coinciden, pero falta el kit del puente.":"Este circuito ya está cerrado.");
  return;
 }
 // Si el montaje aún vive como grupo magnético suelto, primero comprobar
 // sus DOS conectores. Antes este botón se deshabilitaba siempre.
 if(state.loose.length){
  if(state.types.length){
   toast("Hay tramos sin encajar. Une primero esas piezas al circuito iniciado.");
   return;
  }
  const groups=openGroups();
  for(const group of groups){
   if(group.index==null||group.count<4)continue;
   if(closeLooseLoop(group.index,{history:true}))return;
  }
  // El jugador puede pedir el cierre con piezas modulares sin añadirlas
  // manualmente, siempre que ambos extremos estén exactamente alineados.
  if(groups.length===1&&groups[0].count>=4){
   const group=looseGroup(groups[0].index);
   const fit=gapAnalysis.measureGap(group.end,group.start,CATALOG);
   const original=group.parts.map(part=>part.id);
   const raised=group.parts.flatMap((part,i)=>part.raised?[i]:[]);
   const added=fit.exact?fit.combination?.ids:null;
   if(added?.length&&added.length<=5){
    const types=[...group.parts.map(p=>p.id),...added];
    const raised=group.parts.flatMap((p,i)=>p.raised?[i]:[]);
    const built=buildTrack(types,group.start,raised);
    if(built.valid){
     pushHistory();
     state.types=types;state.origin={...group.start};state.bridgeParts=raised;
     state.loose=[];state.track=built;extendWorkBoard();
     state.selectedGroup="main";state.selectionMode="group";
     state.selection=0;state.looseSelection=-1;save();updateUI();
     toast("¡Circuito cerrado! Añadidas "+added.length+
      " pieza(s) de ajuste, sin cambiar ninguna medida.");
     return;
    }
   }
   const balanced=findStraightRebalance(original,{origin:group.start,raisedParts:raised});
   if(balanced.ok&&!balanced.unchanged){
    pushHistory();
    state.types=balanced.types;state.origin={...group.start};state.bridgeParts=raised;
    state.loose=[];state.track=buildTrack(state.types,state.origin,state.bridgeParts);
    extendWorkBoard();state.selectedGroup="main";state.selectionMode="group";
    state.selection=0;state.looseSelection=-1;save();updateUI();
    toast("Cerrado compensando rectas: "+balanced.changes.map(c=>
     CATALOG[c.from].length.toLocaleString("es-ES")+" → "+CATALOG[c.to].length.toLocaleString("es-ES")+" mm").join(" + ")+".");
    return;
   }
   const detail=gapAnalysis.gapExplanation(fit);
   $("gapInfo").textContent="No se puede cerrar todavía: "+detail;
   $("gapInfo").hidden=false;
   toast("Los dos conectores aún no permiten un cierre válido.");
   return;
  }
  toast("Tienes "+groups.length+" tramos separados. Encaja los dos extremos de cada unión antes de cerrar.");
  measureOpenGap();
  return;
 }
 if(state.types.length<2){toast("Coloca primero varias piezas.");return;}
 $("autoClose").disabled=true;$("autoClose").textContent="Buscando…";
 requestAnimationFrame(()=>{
  try{
   const result=findLegalClosure(state.types,{maxReplace:3,maxAdd:5,maxStates:90000,origin:state.origin,raisedParts:state.bridgeParts});
   if(result.ok){
    if(result.unchanged)toast("El circuito ya estaba cerrado exactamente.");
    else changeTypes(result.types,result.rebalanced?
     "¡Cierre proporcional! Rectas reajustadas sin introducir pieza de 12,5 mm.":
     "Cierre calculado: "+result.replaced+
     " pieza(s) cambiada(s), "+result.added+" añadida(s). Puedes deshacer.",
     state.loose,state.origin,{preserveBridge:Boolean(result.rebalanced)});
   }else toast(result.reason||"No hay cierre exacto con esas piezas.");
  }catch(e){toast("No fue posible calcular el cierre. Tu pista sigue intacta.");}
  finally{$("autoClose").textContent="Cerrar exacto";updateUI();}
 });
}
function removeSelected(){
 if(state.selectionMode!=="piece"){toast("Toca otra vez la pieza concreta que quieres quitar.");return;}
 if(state.looseSelection>=0){
  pushHistory();detachLooseMember(state.looseSelection);
  state.loose.splice(state.looseSelection,1);state.looseSelection=-1;
  state.selectedGroup=null;
  save();updateUI();toast("Pieza suelta devuelta a la caja.");return;
 }
 if(state.selection<0){toast("Toca un tramo sobre la mesa para seleccionarlo.");return;}
 const i=detachConnected(state.selection);
 if(i>=0){state.loose.splice(i,1);state.looseSelection=-1;state.selectedGroup=null;save();updateUI();
 toast("Pieza devuelta a la caja. Las otras se quedan sobre la mesa.");}
}
function rotateLoose(){
 if(state.looseSelection<0){toast("Selecciona una pieza de la mesa para girarla.");return;}
 pushHistory();
 if(state.selectionMode==="piece")detachLooseMember(state.looseSelection);
 const indices=state.selectionMode==="group"?looseMembers(state.looseSelection):[state.looseSelection];
 const angle=Math.PI/8,c=Math.cos(angle),sn=Math.sin(angle);
 const anchor=state.loose[indices[0]],x=anchor.x,y=anchor.y;
 for(const i of indices){
  const p=state.loose[i],dx=p.x-x,dy=p.y-y;
  p.x=x+c*dx-sn*dy;p.y=y+sn*dx+c*dy;p.h+=angle;
 }
 save();updateUI();toast(indices.length>1?"Tramo completo girado 22,5°.":"Pieza girada 22,5°.");
}
function recoverDraft(){
 if(!state.draft)return;
 const d=state.draft;state.draft=null;
 state.circuitName=d.name||"";state.activeCircuitId=d.activeId||null;
 state.driveDirection=d.direction===-1?-1:1;
 changeTypes(d.types||[], "Construcción anterior recuperada.",d.loose||[],d.origin||START);
}
// Una pieza de SlotRace se recorre en sentido horario o antihorario.
// No invertimos las piezas físicas: invertimos trayectoria, ángulo y
// signo de curva, y cambiamos la lateralidad de los dos carriles.
const drivingLaneIndex=()=>state.driveDirection===-1?1-state.lane:state.lane;
function drivingPose(distance=state.distance){
 const lane=state.track.lanes[drivingLaneIndex()];
 const p=positionAt(lane,state.driveDirection===-1?-distance:distance);
 return !p||state.driveDirection===1?p:{...p,h:p.h+Math.PI,curve:-(p.curve||0)};
}
function openWorkshop(){
 state.run=false;state.gas=0;state.keyboardGas=false;state.mode="build";
 updateUI();resize();
}
function showMenu(){
 state.run=false;state.gas=0;state.buttonGas=false;
 state.keyboardGas=false;state.triggerGesture=null;state.mode="menu";
 state.newCircuitDirection=state.driveDirection;
 updateUI();resize();
}
function setNewCircuitDirection(direction){
 state.newCircuitDirection=direction===-1?-1:1;updateUI();
}
function changeDriveDirection(direction){
 state.driveDirection=direction===-1?-1:1;
 state.newCircuitDirection=state.driveDirection;
 resetLap();state.distance=0;
 save();updateUI();
 toast("Sentido de conducción: "+(state.driveDirection===1?"horario.":"antihorario."));
}
function createNewCircuit(){
 const hadPieces=state.types.length||state.loose.length;
 if(hadPieces)state.draft={...snapshot(),name:state.circuitName,
  direction:state.driveDirection,activeId:state.activeCircuitId};
 state.circuitName="";state.activeCircuitId=null;state.sessionLaps=[];
 state.driveDirection=state.newCircuitDirection;
 changeTypes([],"Nuevo circuito · elige las piezas en el maletín.",[],START);
 resetWorkBoard();state.camera={panX:0,panY:0,zoom:1};
 save();openWorkshop();
}
function menuRace(){
 if(!state.track.valid){
  openWorkshop();toast("Cierra primero el circuito para poder competir.");
  return false;
 }
 play();return true;
}
function play(){
 state.triggerGesture=null;
 if(!state.track.valid){
  toast("El circuito todavía no está cerrado. Termina el montaje en el taller.");
  return false;
 }
 resetLap();state.sessionLaps=[];state.sessionName=circuitLabel();
 state.run=true;state.penalty=0;state.deslot=null;state.drift=0;state.driftDirection=0;state.cornerDistance=0;state.gripDebt=0;state.cornerDirection=0;state.gas=0;state.buttonGas=false;state.keyboardGas=false;state.speed=0;
 state.mode="race";state.latest=performance.now();updateUI();resize();
 toast("¡Avenir Gripline en pista! Sentido "+(state.driveDirection===1?"horario.":"antihorario."));
 return true;
}

function endSession(target="menu"){
 state.run=false;state.gas=0;state.buttonGas=false;state.keyboardGas=false;state.triggerGesture=null;
 if(!state.sessionLaps.length){
  if(target==="build")openWorkshop();else showMenu();
  return false;
 }
 state.mode="results";renderSessionSummary();updateUI();resize();return true;
}
function renderSessionSummary(){
 $("resultsCircuit").textContent=state.sessionName+" · "+
  (state.driveDirection===1?"Horario":"Antihorario")+
  " · "+state.sessionLaps.length+" vueltas completas";
 const best=[0,1].map(lane=>state.sessionLaps.filter(l=>l.lane===lane)
  .reduce((min,l)=>Math.min(min,l.seconds),Infinity));
 $("resultsStats").textContent="MEJOR IZQUIERDA: "+(Number.isFinite(best[0])?format(best[0])+" s":"—")+
  "    ·    MEJOR DERECHA: "+(Number.isFinite(best[1])?format(best[1])+" s":"—");
 const list=$("resultsLaps");list.innerHTML="";
 for(const lap of state.sessionLaps){
  const row=document.createElement("div");row.className="result-row";
  const label=document.createElement("span");
  label.textContent="Vuelta "+lap.number+" · carril "+(lap.lane===0?"izquierdo":"derecho");
  const value=document.createElement("strong");value.textContent=format(lap.seconds)+" s";
  const diff=document.createElement("small");
  diff.textContent=lap.previous===null?"Primera vuelta de este carril":
   (lap.seconds<=lap.previous?"Mejora ":"Retrocede ")+
   format(Math.abs(lap.seconds-lap.previous))+" s";
  if(lap.record)diff.textContent+=" · RÉCORD PERSONAL";
  row.appendChild(label);row.appendChild(value);row.appendChild(diff);
  list.appendChild(row);
 }
}
function back(){endSession("build");}
function pause(){state.run=!state.run;state.gas=0;state.buttonGas=false;state.keyboardGas=false;state.triggerGesture=null;
 $("trigger").classList.remove("pressed");state.latest=performance.now();updateUI();
 toast(state.run?"¡Volvemos a correr!":"Carrera en pausa.");}
function switchLane(){if(state.run){toast("Pausa primero para cambiar de carril.");return;}state.lane=1-state.lane;resetLap();updateUI();toast("Carril "+(state.lane===0?"izquierdo":"derecho")+" · nueva tanda.");}
function completeLap(){
 if(state.seconds<.05)return;
 const v=record(),sec=state.seconds;
 const previous=[...state.sessionLaps].reverse().find(l=>l.lane===state.lane)?.seconds??null;
 const isRecord=v[state.lane]==null||sec<v[state.lane];
 state.sessionLaps.push({number:state.sessionLaps.length+1,lane:state.lane,
  seconds:sec,previous,record:isRecord});
 if(isRecord){
  v[state.lane]=sec;state.records[recKey()]=v;save();
  toast("¡Récord personal "+(state.lane===0?"izquierda":"derecha")+"! "+format(sec)+" s");
 }else toast("Vuelta "+state.lap+" · "+format(sec)+" s");
 state.seconds=0;state.lap++;
}
// Ajustes del prototipo: más velocidad, mayor margen en curvas y aviso
// visual de pérdida de adherencia antes de llegar al trompo.
const DRIVE=Object.freeze({
 maxSpeed:1250,topSpeed:1150,curveBase:690,derailMultiplier:1.20,
 driftStartsAt:.72,driftMaxAngle:.23,driftMaxOffset:12,
 // A un 70% de gas y velocidad estabilizada, el coche necesita
 // recorrer aprox. una curva de 45° antes de perder la ranura.
 stressReferenceExcess:.045,stressDistance:185,minCurveDistance:65,
 gripRecoveryPerSec:1.25
});
function curveLimit(p,lane){
 if(!p||!p.curve)return Infinity;
 // Los puntos de carril se generan desplazando el eje a su normal:
 // lane 0 = -LANE_OFFSET; lane 1 = +LANE_OFFSET.
 // En una curva derecha (+1), el carril 1 es INTERIOR (radio menor),
 // el 0 EXTERIOR; en una izquierda (-1) ocurre lo contrario.
 // Antes se SUMABA ese desplazamiento y se invertía el agarre.
 const lateralOffset=lane===0?-LANE_OFFSET:LANE_OFFSET;
 const radius=Math.max(70,p.radius-lateralOffset*p.curve);
 return DRIVE.curveBase*Math.sqrt(radius/CATALOG.R2_45R.radius)*DRIVE.derailMultiplier;
}
function simulation(dt){
 if(!state.run||!state.track.valid)return;
 state.seconds+=dt; // la penalización forma parte del tiempo de vuelta
 if(state.penalty>0){
  state.penalty=Math.max(0,state.penalty-dt);
  if(state.deslot)state.deslot.elapsed=Math.min(3,state.deslot.elapsed+dt);
  if(state.penalty===0){state.deslot=null;state.drift=0;}
  return;
 }
 const g=state.keyboardGas?1:state.gas;
 const targetSpeed=g*DRIVE.topSpeed;
 const response=g>0?2.25:2.9;
 state.speed=Math.max(0,Math.min(DRIVE.maxSpeed,
  state.speed+(targetSpeed-state.speed)*(1-Math.exp(-response*dt))
 ));
 const lane=state.track.lanes[drivingLaneIndex()],p=drivingPose();
 const limit=curveLimit(p,state.lane);
 const ratio=Number.isFinite(limit)?state.speed/limit:0;
 const travel=state.speed*dt;
 if(p?.curve){
  // Las curvas de 45° contiguas son UNA MISMA curva a estos efectos.
  // Así no reiniciamos artificialmente el agarre en cada junta.
  if(state.cornerDirection!==p.curve){
   state.cornerDirection=p.curve;state.cornerDistance=0;state.gripDebt=0;
  }
  state.cornerDistance+=travel;
  // La adherencia no se pierde al atravesar la arista inicial.
  // El exceso de velocidad acumula desplazamiento lateral gradualmente;
  // bajar el gas permite recuperar agarre incluso dentro de la curva.
  if(ratio>1){
   const excess=(ratio-1)/DRIVE.stressReferenceExcess;
   state.gripDebt+=Math.pow(excess,1.15)*travel/DRIVE.stressDistance;
  }else{
   state.gripDebt=Math.max(0,state.gripDebt-DRIVE.gripRecoveryPerSec*dt);
  }
 }else{
  // Es una RECTA real: no aplicamos la fuerza de curva anterior.
  state.cornerDistance=0;state.cornerDirection=0;
  state.gripDebt=Math.max(0,state.gripDebt-DRIVE.gripRecoveryPerSec*3*dt);
 }
 if(p?.curve&&state.cornerDistance>=DRIVE.minCurveDistance&&state.gripDebt>=1){
  state.speed=0;state.penalty=3;
  state.drift=0;state.gripDebt=0;
  // El circuito y la distancia permanecen intactos. Solo animamos
  // la salida lateral y el giro, y lo devolvemos al mismo punto.
  state.deslot={pose:{...p},elapsed:0,turn:p.curve||1};
  toast("¡Trompo! Fuera de pista · +3 s.");return;
 }
 const desired= p?.curve?
  Math.max(0,Math.min(1,(ratio-DRIVE.driftStartsAt)/(1-DRIVE.driftStartsAt))):0;
 // Entrada y salida suaves del derrape: no salta al cruzar un empalme.
 state.drift+=(desired-state.drift)*(1-Math.exp(-9*dt));
 state.driftDirection=state.drift>.002?(p?.curve||state.driftDirection):0;
 state.distance+=state.speed*dt;
 if(state.distance>=lane.total){state.distance%=lane.total;completeLap();}
}
// Rueda de sintonización táctil: 20 muescas de 5% y sonido direccional.
// El audio es generado localmente con Web Audio, sin archivos externos.
const DIAL_STEP=5;
const DIAL_PX_PER_CLICK=7;
let dialAudioContext=null;
function initDialAudio(){
 if(!state.clicksEnabled)return;
 const AudioClass=window.AudioContext||window.webkitAudioContext;
 if(!AudioClass)return; // algunos navegadores de prueba no tienen salida de audio
 try{
  if(!dialAudioContext)dialAudioContext=new AudioClass();
  if(dialAudioContext.state==="suspended"){
   const resume=dialAudioContext.resume();
   if(resume&&typeof resume.catch==="function")resume.catch(()=>{});
  }
 }catch(err){dialAudioContext=null;}
}
function dialSound(direction,count){
 if(!state.clicksEnabled)return;
 initDialAudio();
 const ctx=dialAudioContext;
 if(!ctx||ctx.state==="closed")return;
 const freq=direction>0?1260:670; // subir: agudo; bajar: grave
 const time=ctx.currentTime||0;
 const steps=Math.min(20,Math.abs(count));
 for(let i=0;i<steps;i++){
  try{
   const at=time+i*.019;
   const osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type="triangle";
   osc.frequency.setValueAtTime(freq,at);
   osc.frequency.exponentialRampToValueAtTime(freq*.73,at+.012);
   gain.gain.setValueAtTime(.0001,at);
   gain.gain.exponentialRampToValueAtTime(.05,at+.0015);
   gain.gain.exponentialRampToValueAtTime(.0001,at+.016);
   osc.connect(gain);gain.connect(ctx.destination);
   osc.start(at);osc.stop(at+.018);
  }catch(err){break;}
 }
}
function updateTriggerDisplay(){
 const percent=Math.round((state.keyboardGas?1:state.gas)*100);
 $("triggerFill").style.height=percent+"%";
 $("triggerValue").textContent=percent+"%";
 $("trigger").setAttribute("data-power",String(percent));
 $("trigger").classList.toggle("pressed",Boolean(state.triggerGesture));
 $("clickSound").textContent=state.clicksEnabled?"🔊 CLIC":"🔇 MUDO";
 $("clickSound").setAttribute("aria-pressed",String(state.clicksEnabled));
}
function setProgressGas(value){
 state.gas=Math.max(0,Math.min(1,value));
 updateTriggerDisplay();
 updateHud();
}
function setDialSteps(steps){
 const from=Math.round(state.gas*100/DIAL_STEP);
 const to=Math.max(0,Math.min(20,from+steps));
 const actual=to-from;
 if(!actual)return;
 state.gas=to*DIAL_STEP/100;
 dialSound(Math.sign(actual),actual);
 updateTriggerDisplay();
 updateHud();
}
function stopProgressGas(){
 if(!state.triggerGesture&&state.gas===0)return;
 state.triggerGesture=null;
 state.gas=0;
 updateTriggerDisplay();
 updateHud();
}
function triggerPointerDown(e){
 if(!state.run||state.triggerGesture)return;
 e.preventDefault?.();
 state.triggerGesture={id:e.pointerId,lastY:e.clientY,carry:0};
 state.gas=0;updateTriggerDisplay();updateHud();
 // En Safari iOS el AudioContext debe activarse durante un gesto real.
 initDialAudio();
 try{$("trigger").setPointerCapture(e.pointerId);}catch(err){}
}
function triggerPointerMove(e){
 const gesture=state.triggerGesture;
 if(!state.run||!gesture||e.pointerId!==gesture.id)return;
 e.preventDefault?.();
 const delta=gesture.lastY-e.clientY;
 gesture.lastY=e.clientY;
 gesture.carry+=delta;
 const steps=Math.trunc(gesture.carry/DIAL_PX_PER_CLICK);
 if(!steps)return;
 gesture.carry-=steps*DIAL_PX_PER_CLICK;
 setDialSteps(steps);
}
function triggerPointerEnd(e){
 if(!state.triggerGesture||e.pointerId!==state.triggerGesture.id)return;
 stopProgressGas();
}
function updateHud(){
 $("lap").textContent=state.lap;
 $("lapTime").textContent=format(state.seconds);
 $("power").textContent=Math.round(state.keyboardGas?100:state.gas*100)+"%";
 $("speed").textContent=Math.round(state.speed/10)+" cm/s";
 const v=record();
 $("bestLeft").textContent=v[0]===null?"—":format(v[0])+" s";
 $("bestRight").textContent=v[1]===null?"—":format(v[1])+" s";
 $("combined").textContent=v[0]!==null&&v[1]!==null?format(v[0]+v[1])+" s":"—";
 const pose=drivingPose();
 const isBelow=Boolean(state.track.bridge)&&carTrackLevel(state.track,pose)==="lower";
 const underCrossing=isBelow&&pose&&Boolean(state.track.bridge)&&
   Math.hypot(pose.x-positionOnPiece(state.track.parts[0].start,state.track.parts[0].id,.5).x,
     pose.y-positionOnPiece(state.track.parts[0].start,state.track.parts[0].id,.5).y)<165;
 $("raceHint").textContent=state.penalty>0?"TROMPO · REGRESO A PISTA EN "+state.penalty.toFixed(1)+" s":
   !state.run?"EN PAUSA":
   underCrossing?"COCHE PASANDO POR DEBAJO DEL PUENTE":
   state.drift>.18?"DERRAPE CONTROLADO · MANTÉN EL GAS":
   "Busca el límite sin pasarte en las curvas";
 $("pause").textContent=state.run?"⏸ Pausar":"▶ Seguir";
 $("lane").disabled=state.run;
 $("trigger").disabled=!state.run;
 updateTriggerDisplay();
}
function updateUI(){
 state.viewDirty=true;
 menu.hidden=state.mode!=="menu";
 stage.hidden=state.mode!=="build";race.hidden=state.mode!=="race";
 results.hidden=state.mode!=="results";
 for(const id of ["circuitName","workCircuitName"])
  if(document.activeElement!==$(id))$(id).value=state.circuitName;
 renderLibrary();
 $("goHome").hidden=state.mode==="menu";
 $("menuRace").disabled=!state.track.valid;
 $("menuRaceDetail").textContent=state.track.valid?
  state.types.length+" piezas · "+(state.track.length/1000).toFixed(2)+" m · "+(state.driveDirection===1?"Horario":"Antihorario"):
  "Termina el circuito en el taller para poder competir";
 for(const [id,direction] of [["menuClockwise",1],["menuCounter",-1]])
  $(id).setAttribute("aria-pressed",String(state.newCircuitDirection===direction));
 $("workDirection").textContent=state.driveDirection===1?"↻ Conducción: horario":"↺ Conducción: antihorario";

 const t=state.track;
 const looseKit=state.loose.some(p=>p.raised);
 const degrees=t.headingGap*180/Math.PI;
 const status=t.bridge&&t.valid?"CIRCUITO CON PUENTE · "+(t.length/1000).toFixed(2)+" m":
 t.valid?"CERRADO EXACTO · "+(t.length/1000).toFixed(2)+" m":
 t.bridge?"PUENTE COLOCADO · CIRCUITO AÚN ABIERTO":
 !t.types.length?(state.loose.length?
  (looseKit?"KIT PUENTE EN MESA · ":"")+state.loose.length+" PIEZAS SUELTAS":
  "MESA VACÍA · COLOCA PIEZAS"):
 t.closed?"CONECTADO · CRUCE SIN PUENTE":
 "ABIERTO · "+Math.round(t.gap)+" mm · "+Math.round(degrees)+"°";
 const notice=t.bridge?(t.valid?"PUENTE ELEVADO 65 MM · CRUCE PROTEGIDO":
  "Kit instalado. Falta unir extremos y cerrar el circuito para correr."):
 t.intersection?"Cruce al mismo nivel: necesita puente":
 !t.onTable?"El circuito rebasa la mesa":t.closed?"Conectores alineados matemáticamente":
 t.types.length?"Desfase: "+Math.round(t.gap)+" mm y "+Math.round(degrees)+"°":
 looseKit?"Kit unido a la recta; el tramo sigue suelto hasta acoplarlo.":
 state.loose.length+" piezas sueltas · toca una y pulsa Iniciar";
 $("stateChip").textContent=t.bridge&&t.valid?"✓ PUENTE ELEVADO":
 t.bridge||looseKit?"◉ PUENTE EN MONTAJE":
 t.valid?"✓ CERRADO PERFECTO":t.closed?"⚠ CERRADO CON CRUCE":"○ EXTREMOS ABIERTOS";
 $("stateDetails").textContent=t.valid?t.types.length+" piezas · "+(t.length/1000).toFixed(2)+" m":notice;
 $("buildStatus").textContent=status;
 $("gridToggle").textContent=state.gridEnabled?"▦ 25 mm":"▦";
 $("gridToggle").setAttribute("aria-pressed",String(state.gridEnabled));
 $("buildStatus").classList.toggle("good",t.valid);
 $("buildStatus").classList.toggle("warn",!t.valid);
 $("play").textContent="🏁 Correr";
 $("play").disabled=!t.valid;
 $("restore").hidden=!state.draft;
 $("pieceCase").classList.toggle("case-open",state.caseOpen);
 $("caseInterior").hidden=!state.caseOpen;
 $("caseClosed").hidden=state.caseOpen;
 $("caseToggle").textContent=state.caseOpen?"▴ Cerrar caja":"▾ Abrir caja";
 $("caseToggle").setAttribute("aria-expanded",String(state.caseOpen));
 const selectedLength=state.selectedGroup==="main"?state.types.length:
  state.looseSelection>=0?looseMembers(state.looseSelection).length:0;
 $("selected").textContent=state.selectedGroup==null?
  "TOCA UNA VEZ: TRAMO · OTRA VEZ: PIEZA":
  state.selectionMode==="group"?
   "TRAMO UNIDO · "+selectedLength+" PIEZAS · ARRASTRA PARA MOVERLO":
  state.looseSelection>=0?
   "PIEZA · "+CATALOG[state.loose[state.looseSelection].id].name+" · ARRASTRA PARA SEPARAR":
   "PIEZA "+(state.selection+1)+" · "+CATALOG[state.types[state.selection]].name;
 $("remove").disabled=state.selectionMode!=="piece"||
  (state.selection<0&&state.looseSelection<0);
 $("rotate").disabled=state.looseSelection<0;
 $("curveDirection").textContent=state.caseCurveDirection==="R"?"↷ Caja: derecha":"↶ Caja: izquierda";
 $("curveDirection").setAttribute("aria-pressed",String(state.caseCurveDirection==="L"));
 $("flip").textContent="⇄ Voltear curva";
 const selectedCurve=state.looseSelection>=0?state.loose[state.looseSelection]?.id:
  state.selectionMode==="piece"&&state.selection>=0?state.types[state.selection]:null;
 $("flip").disabled=!selectedCurve||!selectedCurve.includes("_");
 $("joinPiece").disabled=state.looseSelection<0;
 $("joinPiece").textContent=state.types.length?"⠿ Encajar":"⠿ Iniciar";
 $("autoClose").disabled=state.track.closed||(state.types.length<2&&state.loose.length<2);
 $("measureGap").disabled=state.types.length===0&&state.loose.length<2;
 $("undo").disabled=!state.history.length;
 $("redo").disabled=!state.redo.length;
 const used=state.types.length+state.loose.length;
 const total=Object.values(CATALOG).reduce((sum,spec)=>sum+spec.stock,0);
 const kitOn=state.looseSelection>=0?Boolean(state.loose[state.looseSelection]?.raised):
  state.selection>=0&&state.bridgeParts.includes(state.selection);
 $("bridgeKit").setAttribute("aria-pressed",String(Boolean(kitOn)));
 $("bridgeKit").querySelector(".bridge-kit-cta").textContent=kitOn?"− RETIRAR":"⠿ COLOCAR";
 if(kitOn&&state.looseSelection>=0){
  const members=looseMembers(state.looseSelection);
  $("selected").textContent=members.length>1?
   "KIT FIJADO A LA RECTA · TRAMO MAGNÉTICO DE "+members.length+" PIEZAS":
   "KIT FIJADO A LA RECTA · PIEZA AÚN SUELTA";
 }
 $("caseCount").textContent=UNLIMITED_DEVELOPMENT_STOCK?
  "∞ piezas disponibles · "+used+" en la mesa":
  (total-used)+" de "+total+" piezas en sus huecos";
 const cards=$("pieces").querySelectorAll("[data-piece]");
 for(const el of cards){
  const id=el.dataset.piece,chosen=pocketPartId(id),free=freeStock([...state.types,...state.loose.map(p=>p.id)],chosen);
  const unlimited=free===Infinity;
  el.querySelector(".qty").textContent=unlimited?"∞":"×"+free;
  el.setAttribute("aria-label",CATALOG[chosen].name+" · "+(unlimited?"piezas ilimitadas":free+" disponibles")+". Toca para sacar o arrastra a la mesa.");
  el.disabled=free===0;
  el.classList.toggle("empty",free===0);
  el.classList.toggle("selected",(state.selection>=0&&state.types[state.selection]===chosen)||(state.looseSelection>=0&&state.loose[state.looseSelection].id===chosen));
 }
 $("tableCaption").textContent=state.pinch?.mode==="rotate"?
  "GIRANDO · SALTOS EXACTOS DE 22,5°":
 state.looseSelection>=0?"DOS DEDOS: GIRAR 22,5° · ARRASTRA PARA ACOPLAR":
 state.selection>=0?"DOS DEDOS: GIRAR 22,5° · TOCA DOS VECES: PIEZA":
 state.dragging?"SUELTA LA PIEZA SOBRE EL TAPETE":
 "SOBRE PIEZA: DOS DEDOS GIRAN 22,5° · FONDO: ZOOM";
 updateHud();
}
// Un alojamiento por geometría; izquierda/derecha comparten el mismo molde.
const pocketNames={
 S075:"RECTA 75",S0875:"RECTA 87,5",
 S175:"RECTA 175",S350:"RECTA 350",S600:"RECTA 600",
 START350:"SALIDA / META",
 R1_225R:"R1 · 22,5°",R1_45R:"R1 · 45°",R1_90R:"R1 · 90°",
 R2_225R:"R2 · 22,5°",R2_45R:"R2 · 45°",
 R3_225R:"R3 · 22,5°",R4_225R:"R4 · 22,5°"
};
const pocketIds=Object.keys(CATALOG).filter(id=>!CATALOG[id].legacy&&(!id.includes("_")||id.endsWith("R")));
// Fuente de color común entre la pista de la mesa y las miniaturas de la caja.
const PIECE_LOOK=Object.freeze({
 shadow:"#0c1518",outer:"#65747a",rim:"#1e282d",deck:"#343e44",
 inner:"#283139",groove:"#101418",metalA:"#94a5ac",metalB:"#a2b4bc",
 guide:"#080c0e",edge:"#65787e",seam:"#0c1217"
});
function foamSlotSVG(id){
 const spec=CATALOG[id],n=spec.length?2:28;
 const pts=Array.from({length:n+1},(_,i)=>positionOnPiece({x:0,y:0,h:0},id,i/n));
 // El marco incluye el ancho REAL del módulo. Las rectas cortas dejan de
 // aparecer como píldoras redondeadas: llevan cantos perpendiculares.
 const half=(TRACK_WIDTH+24)/2;
 const corners=pts.flatMap(p=>[-half,half].map(d=>({
  x:p.x-Math.sin(p.h)*d,y:p.y+Math.cos(p.h)*d
 })));
 const minX=Math.min(...corners.map(p=>p.x)),maxX=Math.max(...corners.map(p=>p.x));
 const minY=Math.min(...corners.map(p=>p.y)),maxY=Math.max(...corners.map(p=>p.y));
 const scale=Math.min(107/Math.max(1,maxX-minX),68/Math.max(1,maxY-minY));
 const tx=(120-(maxX-minX)*scale)/2,ty=(80-(maxY-minY)*scale)/2;
 const xy=p=>[(tx+(p.x-minX)*scale).toFixed(2),(ty+(p.y-minY)*scale).toFixed(2)];
 const path=arr=>arr.map((p,i)=>{const [x,y]=xy(p);return(i?"L":"M")+x+" "+y;}).join(" ");
 const translated=off=>pts.map(p=>({x:p.x-Math.sin(p.h)*off,y:p.y+Math.cos(p.h)*off}));
 const main=path(pts),width=n=>(n*scale).toFixed(2);
 const stroke=(klass,shape,size,color,other="")=>
  '<path class="'+klass+'" d="'+shape+'" fill="none" stroke="'+color+'" stroke-width="'+width(size)+'" stroke-linecap="butt" stroke-linejoin="round" '+other+'/>';
 const layer=(klass,size,color)=>stroke(klass,main,size,color);
 const line=(off,klass,size,color)=>stroke(klass,path(translated(off)),size,color);
 const seam=p=>stroke("mini-slot-seam",path([-TRACK_WIDTH/2,TRACK_WIDTH/2].map(off=>({
  x:p.x-Math.sin(p.h)*off,y:p.y+Math.cos(p.h)*off
 }))),3,PIECE_LOOK.seam);
 return '<svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid meet" focusable="false" aria-hidden="true">'+
  '<g class="foam-cutout-shape">'+
   layer("foam-cutout-shadow",TRACK_WIDTH+23,"#e1e3df")+
   layer("foam-cutout",TRACK_WIDTH+18,"#56615e")+
  '</g><g class="mini-slot-piece">'+
   stroke("mini-slot-stack",main,TRACK_WIDTH+19,PIECE_LOOK.shadow,'transform="translate(0 2)"')+
   layer("mini-slot-outer",TRACK_WIDTH+12,PIECE_LOOK.outer)+
   layer("mini-slot-rim",TRACK_WIDTH+5,PIECE_LOOK.rim)+
   layer("mini-slot-deck",TRACK_WIDTH-4,PIECE_LOOK.deck)+
   layer("mini-slot-inner",TRACK_WIDTH-31,PIECE_LOOK.inner)+
   line(-LANE_OFFSET,"mini-slot-groove",11,PIECE_LOOK.groove)+
   line(LANE_OFFSET,"mini-slot-groove",11,PIECE_LOOK.groove)+
   line(-LANE_OFFSET-7.6,"mini-slot-rail",2.2,PIECE_LOOK.metalA)+
   line(-LANE_OFFSET+7.6,"mini-slot-rail",2.2,PIECE_LOOK.metalB)+
   line(LANE_OFFSET-7.6,"mini-slot-rail",2.2,PIECE_LOOK.metalA)+
   line(LANE_OFFSET+7.6,"mini-slot-rail",2.2,PIECE_LOOK.metalB)+
   line(-LANE_OFFSET,"mini-slot-guide",5,PIECE_LOOK.guide)+
   line(LANE_OFFSET,"mini-slot-guide",5,PIECE_LOOK.guide)+
   line(-72,"mini-slot-edge",2.5,PIECE_LOOK.edge)+
   line(72,"mini-slot-edge",2.5,PIECE_LOOK.edge)+
   seam(pts[0])+seam(pts[pts.length-1])+
  '</g></svg>';
}
function palette(){
 const list=$("pieces");
 for(const id of pocketIds){
  const spec=CATALOG[id];
  const pocket=document.createElement("button");
  pocket.type="button";pocket.className="foam-pocket";pocket.dataset.piece=id;
  pocket.dataset.kind=spec.group;
  pocket.setAttribute("aria-label",spec.name+" · "+spec.code);
  pocket.innerHTML='<span class="qty">×0</span>'+
    '<span class="foam-well">'+foamSlotSVG(id)+'</span>'+
     '<span class="foam-drag-grip" data-drag-handle="true" aria-hidden="true">⠿</span>'+
    '<span class="pocket-caption"><strong>'+pocketNames[id]+'</strong><small>'+spec.code+'</small></span>';
  const grip=pocket.querySelector(".foam-drag-grip");
  let suppressNextClick=false,tapPointer=null;
  // El maletín se desplaza sobre el cuerpo del hueco y se arrastra desde
  // el asa: la captura táctil vive en el ASA, nunca en el botón desplazable.
  pocket.addEventListener("click",e=>{
   if(e.target===grip||grip.contains?.(e.target))return;
   if(suppressNextClick&&e?.detail!==0){suppressNextClick=false;return;}
   suppressNextClick=false;inventoryAction(id);
  });
  pocket.addEventListener("pointerdown",e=>{
   if(e.target===grip)return;
   tapPointer=e.pointerType==="mouse"?null:
    {pointerId:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
   suppressNextClick=false;
  });
  pocket.addEventListener("pointermove",e=>{
   if(tapPointer?.pointerId===e.pointerId&&
      Math.hypot(e.clientX-tapPointer.x,e.clientY-tapPointer.y)>9)tapPointer.moved=true;
  });
  pocket.addEventListener("pointerup",e=>{
   if(tapPointer?.pointerId!==e.pointerId)return;
   const moved=tapPointer.moved||
    Math.hypot(e.clientX-tapPointer.x,e.clientY-tapPointer.y)>9;
   tapPointer=null;suppressNextClick=true;
   if(!moved)inventoryAction(id);
  });
  pocket.addEventListener("pointercancel",e=>{
   if(tapPointer?.pointerId===e.pointerId){tapPointer=null;suppressNextClick=true;}
  });
  grip.addEventListener("click",e=>{e.preventDefault?.();e.stopPropagation?.();});
  grip.addEventListener("pointerdown",e=>{
   e.preventDefault?.();e.stopPropagation?.();
   if(state.dragging||freeStock([...state.types,...state.loose.map(p=>p.id)],pocketPartId(id))<1)return;
   tapPointer=null;suppressNextClick=true;
   state.dragging={id,pointerId:e.pointerId,x:e.clientX,y:e.clientY,
    originX:e.clientX,originY:e.clientY,active:false};
   try{grip.setPointerCapture(e.pointerId);}catch(err){}
   state.viewDirty=true;
  });
  grip.addEventListener("pointermove",e=>{
   const d=state.dragging;
   if(!d||d.id!==id||d.pointerId!==e.pointerId)return;
   e.preventDefault?.();e.stopPropagation?.();
   d.x=e.clientX;d.y=e.clientY;
   if(Math.hypot(d.x-d.originX,d.y-d.originY)>9)d.active=true;
   state.viewDirty=true;
  });
  grip.addEventListener("pointerup",e=>{
   const d=state.dragging;
   if(!d||d.id!==id||d.pointerId!==e.pointerId)return;
   e.preventDefault?.();e.stopPropagation?.();
   state.dragging=null;state.viewDirty=true;suppressNextClick=true;
   if(!d.active)return;
   const rect=editCanvas.getBoundingClientRect();
   if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom){
    toast("Suelta la pieza en el tapete. No se ha gastado ninguna.");return;
   }
   const pt=screenToWorld(e),b=state.workBoard;
   if(pt.x<b.left+85||pt.x>b.right-85||pt.y<b.top+85||pt.y>b.bottom-85){
    toast("Suelta dentro de la mesa verde.");return;
   }
   if(!addLoose(pocketPartId(id),pt.x,pt.y))return;
   snapLoose(state.loose.length-1,{history:false});
  });
  grip.addEventListener("pointercancel",e=>{
   if(state.dragging?.id===id&&state.dragging.pointerId===e.pointerId){
    state.dragging=null;state.viewDirty=true;
   }
  });
  list.appendChild(pocket);
 }
}
function roundRect(ctx,x,y,w,h,r){
 r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);
 ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function strokePath(ctx,points,color,width){
 if(!points.length)return;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
 for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="butt";ctx.lineJoin="round";ctx.stroke();
}
function translated(points,off){return points.map(p=>({x:p.x-Math.sin(p.h)*off,y:p.y+Math.cos(p.h)*off}));}
function paintGrid(ctx){
 if(!state.gridEnabled)return;
 const b=state.workBoard,edge=65;
 ctx.save();ctx.beginPath();
 ctx.rect(b.left+edge,b.top+edge,b.width-edge*2,b.height-edge*2);ctx.clip();
 for(const direction of ["x","y"]){
   const from=direction==="x"?b.left+edge:b.top+edge;
   const to=direction==="x"?b.right-edge:b.bottom-edge;
   for(let coordinate=Math.ceil(from/GRID_MM)*GRID_MM;coordinate<=to;coordinate+=GRID_MM){
     const major=Math.round(coordinate)%100===0;
     ctx.beginPath();
     if(direction==="x"){ctx.moveTo(coordinate,b.top+edge);ctx.lineTo(coordinate,b.bottom-edge);}
     else{ctx.moveTo(b.left+edge,coordinate);ctx.lineTo(b.right-edge,coordinate);}
     ctx.strokeStyle=major?"#d5ffde":"#bdedc4";
     ctx.globalAlpha=major?.23:.085;
     ctx.lineWidth=major?2.2:1;
     ctx.stroke();
   }
 }
 ctx.globalAlpha=.62;ctx.fillStyle="#e9ffdc";ctx.font="bold 15px system-ui";ctx.textAlign="left";
 for(let x=Math.ceil((b.left+150)/500)*500;x<b.right-150;x+=500){
  ctx.fillText(x+" mm",x+5,b.top+111);
 }
 ctx.restore();
}
function paintTable(ctx){
 ctx.save();
 // La mesa debe cubrir la geometría sin mover ni deformar los conectores.
 const b=state.workBoard;
 ctx.translate(b.left,b.top);
 ctx.scale(b.width/TABLE.width,b.height/TABLE.height);
 ctx.save();ctx.shadowColor="#000000a0";ctx.shadowBlur=70;ctx.shadowOffsetY=22;
 const wood=ctx.createLinearGradient(0,0,TABLE.width,TABLE.height);
 wood.addColorStop(0,"#ad7443");wood.addColorStop(.45,"#6b4327");wood.addColorStop(1,"#a96c3c");
 roundRect(ctx,8,8,TABLE.width-16,TABLE.height-16,80);ctx.fillStyle=wood;ctx.fill();ctx.restore();
 ctx.save();roundRect(ctx,8,8,TABLE.width-16,TABLE.height-16,80);ctx.clip();
 for(let i=0;i<74;i++){
  const y=(i*43)%TABLE.height;ctx.beginPath();ctx.moveTo(0,y);
  for(let x=0;x<=TABLE.width;x+=65)ctx.lineTo(x,y+4*Math.sin(i*.73+x*.009));
  ctx.strokeStyle=i%3===0?"#e2ab6e":"#472917";ctx.globalAlpha=i%3===0?.13:.18;ctx.lineWidth=i%5===0?5:2;ctx.stroke();
 }
 ctx.globalAlpha=1;ctx.restore();
 ctx.lineWidth=15;ctx.strokeStyle="#e4bc7e";roundRect(ctx,18,18,TABLE.width-36,TABLE.height-36,73);ctx.stroke();
 ctx.strokeStyle="#42271b";ctx.lineWidth=7;roundRect(ctx,50,50,TABLE.width-100,TABLE.height-100,48);ctx.stroke();
 ctx.shadowColor="#061e19b0";ctx.shadowBlur=23;ctx.shadowOffsetY=8;
 const felt=ctx.createLinearGradient(0,60,TABLE.width,TABLE.height-60);
 felt.addColorStop(0,"#2d765c");felt.addColorStop(.55,"#245a48");felt.addColorStop(1,"#143c36");
 roundRect(ctx,62,62,TABLE.width-124,TABLE.height-124,38);ctx.fillStyle=felt;ctx.fill();
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 ctx.save();roundRect(ctx,62,62,TABLE.width-124,TABLE.height-124,38);ctx.clip();
 ctx.strokeStyle="#c6edd2";ctx.globalAlpha=.038;ctx.lineWidth=1.4;
 for(let x=62;x<TABLE.width-62;x+=100){ctx.beginPath();ctx.moveTo(x,62);ctx.lineTo(x,TABLE.height-62);ctx.stroke();}
 for(let y=62;y<TABLE.height-62;y+=100){ctx.beginPath();ctx.moveTo(62,y);ctx.lineTo(TABLE.width-62,y);ctx.stroke();}
 ctx.globalAlpha=.055;for(let i=0;i<1000;i++){
  const x=70+((i*7919)%2060),y=72+((i*5171)%1295);ctx.fillStyle=i%2?"#c0f5ce":"#05180c";ctx.fillRect(x,y,2.4,2.4);
 }ctx.globalAlpha=1;ctx.restore();
 ctx.font="bold 40px system-ui";ctx.fillStyle="#b5e3c1";ctx.globalAlpha=.38;ctx.textAlign="center";
 ctx.fillText("SLOTRACE  •  CRAFT RACE STUDIO",TABLE.width/2,166);ctx.globalAlpha=1;
 ctx.font="24px system-ui";ctx.fillStyle="#b9d6a7";ctx.globalAlpha=.47;ctx.fillText("MESA DE MONTAJE  ·  "+Math.round(b.width/10)+" × "+Math.round(b.height/10)+" CM",TABLE.width/2,TABLE.height-119);ctx.globalAlpha=1;
 for(const corner of [[76,76],[TABLE.width-76,76],[76,TABLE.height-76],[TABLE.width-76,TABLE.height-76]]){
  ctx.fillStyle="#503725";ctx.beginPath();ctx.arc(corner[0],corner[1],17,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#d4b57b";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(corner[0]-8,corner[1]);ctx.lineTo(corner[0]+8,corner[1]);ctx.stroke();
 }
 ctx.restore();
}
function paintSeam(ctx,p){
 const h=p.h,x=p.x,y=p.y,nx=-Math.sin(h),ny=Math.cos(h);
 ctx.save();ctx.lineWidth=4;ctx.strokeStyle="#0c1217";
 ctx.beginPath();ctx.moveTo(x-nx*76,y-ny*76);ctx.lineTo(x+nx*76,y+ny*76);ctx.stroke();
 ctx.lineWidth=3;ctx.strokeStyle="#768287";
 for(const side of [-67,67]){
  const px=x+nx*side,py=y+ny*side;
  ctx.fillStyle="#71808a";ctx.beginPath();ctx.arc(px,py,4.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#172029";ctx.beginPath();ctx.arc(px,py,1.8,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
// Accesorio elevador PT: dos apoyos y dos rampas de 65 mm.
// Una recta elevada mantiene las medidas de pista originales.
// El kit va DEBAJO de la pista: no sustituye la pieza por una placa.
// Se dibuja antes del asfalto, de modo que los dos carriles siguen siendo
// exactamente los de la recta que ha elegido el constructor.
function paintSupportKit(ctx,part){
 const spec=CATALOG[part.id];if(!spec?.length||spec.length<350)return;
 for(const t of [.24,.76]){
  const p=positionOnPiece(part.start,part.id,t);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.h);
  ctx.shadowColor="#000a";ctx.shadowBlur=18;ctx.shadowOffsetY=11;
  ctx.fillStyle="#384e55";ctx.fillRect(-17,-97,34,194);
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  for(const side of [-1,1]){
   const y=side*88;
   ctx.fillStyle="#8ba3aa";ctx.fillRect(-19,y-13,38,26);
   ctx.fillStyle="#c4d7d6";ctx.fillRect(-13,y-11,26,7);
   ctx.fillStyle="#253a40";ctx.fillRect(-23,y+side*13,46,7);
  }
  ctx.restore();
 }
}
// Discretas marcas de rampa a los lados de la vía. Nunca cubren ranuras
// ni colocan una segunda superficie rectangular sobre el tramo.
function paintBridgeRampProfile(ctx,part){
 const spec=CATALOG[part.id];if(!spec?.length||spec.length<350)return;
 ctx.save();
 for(const span of [[.02,.23],[.77,.98]]){
  const points=Array.from({length:6},(_,i)=>
   positionOnPiece(part.start,part.id,span[0]+(span[1]-span[0])*i/5));
  ctx.globalAlpha=.28;
  for(const off of [-75,75])strokePath(ctx,translated(points,off),"#b6ccd1",3);
  ctx.globalAlpha=.13;
  for(const off of [-69,69])strokePath(ctx,translated(points,off),"#f2f7e7",2);
 }
 ctx.restore();
}
function paintBridgePillars(ctx,track){
 if(!track.bridge)return;
 const section=track.parts[track.bridge.overParts[0]];
 for(const fraction of [.2,.8]){
  const p=section.points[Math.round((section.points.length-1)*fraction)];
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.h);
  ctx.shadowColor="#000a";ctx.shadowBlur=25;ctx.shadowOffsetY=12;
  ctx.fillStyle="#5d6f76";ctx.fillRect(-15,-106,30,212);
  ctx.fillStyle="#b9c8cb";ctx.fillRect(-7,-99,14,198);
  ctx.restore();
 }
}
// Dibujo continuo por todo el circuito: elimina costuras gruesas y bordes
// superpuestos donde una recta enlaza con otra o entra en una curva.
function paintContinuousTrack(ctx,track,editing){
 if(!track.parts.length)return;
 const path=track.points;
 ctx.save();ctx.shadowColor="#0009";ctx.shadowBlur=15;ctx.shadowOffsetY=10;
 strokePath(ctx,path,PIECE_LOOK.shadow,TRACK_WIDTH+19);ctx.restore();
 strokePath(ctx,path,PIECE_LOOK.outer,TRACK_WIDTH+12);
 strokePath(ctx,path,PIECE_LOOK.rim,TRACK_WIDTH+5);
 strokePath(ctx,path,PIECE_LOOK.deck,TRACK_WIDTH-4);
 strokePath(ctx,path,PIECE_LOOK.inner,TRACK_WIDTH-31);
 for(const laneOffset of [-LANE_OFFSET,LANE_OFFSET]){
  const line=translated(path,laneOffset);
  strokePath(ctx,line,PIECE_LOOK.groove,11);
  strokePath(ctx,translated(path,laneOffset-7.6),PIECE_LOOK.metalA,2.2);
  strokePath(ctx,translated(path,laneOffset+7.6),PIECE_LOOK.metalB,2.2);
  strokePath(ctx,line,PIECE_LOOK.guide,5);
 }
 for(const edge of [-72,72])strokePath(ctx,translated(path,edge),PIECE_LOOK.edge,2.5);
 for(const part of track.parts)paintSeam(ctx,part.start);
 if(editing&&state.selectedGroup==="main"&&state.selection>=0){
  ctx.save();ctx.globalAlpha=state.selectionMode==="group"?.20:.42;
  strokePath(ctx,state.selectionMode==="group"?path:track.parts[state.selection].points,
   state.selectionMode==="group"?"#74ffe0":"#ffd070",TRACK_WIDTH+17);
  ctx.restore();
 }
 if(track.closed){
  const p=track.parts[0].start;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.h);
  for(let k=-2;k<=2;k++)for(let j=0;j<8;j++){
   ctx.fillStyle=(k+j)%2?"#fff6e8":"#171a1c";
   ctx.fillRect(k*7,-TRACK_WIDTH/2+j*TRACK_WIDTH/8,7,TRACK_WIDTH/8);
  }
  ctx.restore();
 }else if(editing){
  for(const [p,color] of [[track.ends.begin,"#67eff1"],[track.ends.end,"#ffc66b"]]){
   ctx.save();ctx.shadowBlur=15;ctx.shadowColor=color;ctx.fillStyle=color;
   ctx.beginPath();ctx.arc(p.x,p.y,14,0,Math.PI*2);ctx.fill();ctx.restore();
  }
 }
}
// Overlay SOLO sobre la abertura real del cruce. En las anteriores
// versiones toda la diagonal superior se repintaba encima del coche,
// por lo que éste quedaba parcialmente oculto también cerca de curvas.
// La capa superior tapa la inferior SOLO en la zona del cruce.
// La superficie, las ranuras y los biseles usan los mismos materiales
// que el resto de la pista, para eliminar la placa de color diferente.
function paintBridgeCrossing(ctx,track){
 if(!track.bridge)return;
 const elevated=track.parts[track.bridge.overParts[0]];
 if(!elevated)return;
 const lower=track.parts[track.bridge.underParts?.[0]];
 const middle=track.bridge.crossing||positionOnPiece(elevated.start,elevated.id,.5);
 const angle=elevated.start.h;
 const underAngle=lower?.start?.h??angle+Math.PI/2;
 const theta=Math.abs(Math.sin(angle-underAngle));
 const halfLength=Math.min(210,Math.max(103,Math.ceil((TRACK_WIDTH/2+16)/Math.max(.55,theta))));
 const halfWidth=(TRACK_WIDTH+17)/2;
 ctx.save();ctx.translate(middle.x,middle.y);ctx.rotate(angle);
 // El puente del ejemplo tiene apoyos automáticos. Los kits manuales
 // ya dibujaron sus apoyos bajo la recta antes de pintar la pista.
 if(track.bridge.virtual){
  for(const x of [-halfLength-32,halfLength+32]){
   ctx.save();ctx.shadowColor="#0008";ctx.shadowBlur=11;
   ctx.fillStyle="#52666e";roundRect(ctx,x-14,-101,28,202,7);ctx.fill();
   ctx.shadowBlur=0;ctx.fillStyle="#bdcfd0";ctx.fillRect(x-4,-93,8,186);
   ctx.restore();
  }
 }
 ctx.beginPath();roundRect(ctx,-halfLength,-halfWidth,halfLength*2,halfWidth*2,9);ctx.clip();
 ctx.rotate(-angle);ctx.translate(-middle.x,-middle.y);
 const upper=track.bridge.overParts.flatMap((index,i)=>
  i?track.parts[index].points.slice(1):track.parts[index].points);
 ctx.save();ctx.shadowColor="#0009";ctx.shadowBlur=14;ctx.shadowOffsetY=9;
 strokePath(ctx,upper,PIECE_LOOK.shadow,TRACK_WIDTH+19);ctx.restore();
 strokePath(ctx,upper,PIECE_LOOK.outer,TRACK_WIDTH+12);
 strokePath(ctx,upper,PIECE_LOOK.rim,TRACK_WIDTH+5);
 strokePath(ctx,upper,PIECE_LOOK.deck,TRACK_WIDTH-4);
 strokePath(ctx,upper,PIECE_LOOK.inner,TRACK_WIDTH-31);
 for(const off of [-LANE_OFFSET,LANE_OFFSET]){
  strokePath(ctx,translated(upper,off),PIECE_LOOK.groove,11);
  strokePath(ctx,translated(upper,off-7.6),PIECE_LOOK.metalA,2.2);
  strokePath(ctx,translated(upper,off+7.6),PIECE_LOOK.metalB,2.2);
  strokePath(ctx,translated(upper,off),PIECE_LOOK.guide,5);
 }
 for(const off of [-72,72])strokePath(ctx,translated(upper,off),PIECE_LOOK.edge,2.5);
 ctx.restore();
}
function paintTrack(ctx,track,editing,layer="all"){
 if(!track.parts.length)return;
 const elevated=track.bridge?track.bridge.overParts:[];
 // La vía inferior y la superior se dibujan en PASADAS DISTINTAS,
 // para poder situar un coche debajo del puente sin pintarlo encima.
 const ordered=layer==="ground"?
  track.parts.filter(p=>!elevated.includes(p.index)):
  layer==="overpass"?
  track.parts.filter(p=>elevated.includes(p.index)):
  elevated.length?
   [...track.parts.filter(p=>!elevated.includes(p.index)),...track.parts.filter(p=>elevated.includes(p.index))]:
   track.parts;
 for(const part of ordered){
  if(track.bridge&&part.index===elevated[0])paintBridgePillars(ctx,track);
  if(elevated.includes(part.index)){
   // La banda superior pasa por delante del cruce inferior y proyecta
   // sombra propia. El nivel real de altura se incorporará a las físicas después.
   ctx.save();ctx.shadowColor="#000c";ctx.shadowBlur=27;ctx.shadowOffsetY=18;
   strokePath(ctx,part.points,"#11171b",TRACK_WIDTH+28);
   ctx.restore();
  }
  ctx.save();ctx.shadowColor="#0009";ctx.shadowBlur=18;ctx.shadowOffsetY=14;
  strokePath(ctx,part.points,"#0c1419",TRACK_WIDTH+20);ctx.restore();
  strokePath(ctx,part.points,"#637176",TRACK_WIDTH+14);
  strokePath(ctx,part.points,"#1e272d",TRACK_WIDTH+5);
  strokePath(ctx,part.points,"#313940",TRACK_WIDTH-5);
  strokePath(ctx,part.points,"#3b444b",TRACK_WIDTH-28);
  strokePath(ctx,part.points,"#252e34",TRACK_WIDTH-36);
  for(const laneOffset of [-LANE_OFFSET,LANE_OFFSET]){
   const path=translated(part.points,laneOffset);
   strokePath(ctx,path,"#101418",11);
   strokePath(ctx,translated(part.points,laneOffset-7.6),"#8c9ba1",2.2);
   strokePath(ctx,translated(part.points,laneOffset+7.6),"#a1b1b8",2.2);
   strokePath(ctx,path,"#070b0e",5.2);
  }
  for(const edge of [-72,72])strokePath(ctx,translated(part.points,edge),"#707d82",2.5);
  paintSeam(ctx,part.start);
  if(track.bridge&&elevated.includes(part.index)){
   ctx.save();ctx.globalAlpha=.7;
   for(const side of [-71,71])strokePath(ctx,translated(part.points,side),"#d6e0d3",3);
   ctx.restore();
  }
  if(editing&&part.index===state.selection){
   strokePath(ctx,part.points,"#77ffe6",TRACK_WIDTH+22);
   strokePath(ctx,part.points,"#14383d",TRACK_WIDTH+15);
   // Paint a translucent outline outside, retain the real track surface above by alpha compositing.
   ctx.globalAlpha=.20;strokePath(ctx,part.points,"#36ffd6",TRACK_WIDTH+8);ctx.globalAlpha=1;
  }
 }
 if(track.closed&&layer!=="overpass"){
  const p=track.parts[0].start,nx=-Math.sin(p.h),ny=Math.cos(p.h),dx=Math.cos(p.h),dy=Math.sin(p.h);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.h);
  for(let k=-2;k<=2;k++)for(let j=0;j<8;j++){
   ctx.fillStyle=(k+j)%2?"#fff6e8":"#171a1c";ctx.fillRect(k*7,-TRACK_WIDTH/2+j*(TRACK_WIDTH/8),7,TRACK_WIDTH/8);
  }
  ctx.restore();
 }
 if(layer!=="overpass"&&!track.closed&&editing){
  const start=track.ends.begin,end=track.ends.end;
  for(const [p,color] of [[start,"#67eff1"],[end,"#ffc66b"]]){
   ctx.save();ctx.shadowBlur=25;ctx.shadowColor=color;ctx.fillStyle=color;
   ctx.beginPath();ctx.arc(p.x,p.y,19,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
   ctx.fillStyle="#132129";ctx.beginPath();ctx.arc(p.x,p.y,10,0,Math.PI*2);ctx.fill();ctx.restore();
  }
 }
}
// Deslizamiento visual sin alterar la ranura física ni el cronómetro.
// Para un trompo de 3 segundos, el coche se aparta, gira y vuelve a su
// posición original: la vuelta sigue siendo válida.
function visualCarPose(at){
 if(state.mode!=="race")return {...at,smoke:0,spin:0};
 if(state.deslot){
  const d=state.deslot,t=d.elapsed;
  const side=d.turn||1;
  const out=t<.7?t/.7:t<1.75?1:Math.max(0,(3-t)/1.25);
  const turn=t<1.4?Math.PI*4*(t/1.4):Math.PI*4;
  const normalX=-Math.sin(at.h),normalY=Math.cos(at.h);
  return{...at,
   x:at.x-side*normalX*85*out,
   y:at.y-side*normalY*85*out,
   h:at.h+side*turn,
   smoke:Math.max(0,1-t/2.5),spin:1};
 }
 const d=state.drift||0,side=state.driftDirection||0;
 const normalX=-Math.sin(at.h),normalY=Math.cos(at.h);
 return{...at,
  x:at.x-side*normalX*DRIVE.driftMaxOffset*d,
  y:at.y-side*normalY*DRIVE.driftMaxOffset*d,
  h:at.h+side*DRIVE.driftMaxAngle*d,
  smoke:d,spin:0};
}
// La piel cenital ORIGINAL del Avenir Gripline viene del repositorio
// Top Down RACE. Se pinta como una imagen real, no como un coche dibujado
// con rectángulos. Silueta de 98 mm frente a los 154 mm anteriores.
const GRIPLINE_SPRITE_URL="./assets/cars/avenir_gripline.webp";
const GRIPLINE_LENGTH_MM=98;
const GRIPLINE_WIDTH_MM=49;
const griplineImage=typeof Image==="function"?new Image():null;
if(griplineImage){
 griplineImage.onload=()=>{state.viewDirty=true;};
 griplineImage.onerror=()=>{state.viewDirty=true;};
 griplineImage.src=GRIPLINE_SPRITE_URL;
}
function paintCar(ctx,at,lane,paused=false){
 if(!at)return;
 const visual=visualCarPose(at);
 ctx.save();ctx.translate(visual.x,visual.y);ctx.rotate(visual.h);
 if(visual.smoke>.03){
  ctx.save();ctx.globalAlpha=Math.min(.42,.36*visual.smoke);
  for(let i=0;i<3;i++){
   ctx.beginPath();ctx.ellipse(-51-i*13,(i-1)*15,5+i*4,3+i*2,.2,0,Math.PI*2);
   ctx.fillStyle="#d9e7e0";ctx.fill();
  }
  if(visual.spin){
   ctx.strokeStyle="#def0e2";ctx.lineWidth=2;
   ctx.beginPath();ctx.arc(0,0,71,visual.h,visual.h+Math.PI*.9);ctx.stroke();
  }
  ctx.restore();
 }
 ctx.shadowColor="#000a";ctx.shadowBlur=11;ctx.shadowOffsetY=6;
 if(griplineImage&&griplineImage.complete&&griplineImage.naturalWidth>0){
  // El frontal de la imagen apunta hacia ARRIBA; la pista h=0
  // apunta hacia la DERECHA. Sumamos 90° para mantener rumbo.
  ctx.rotate(Math.PI/2);
  ctx.drawImage(griplineImage,-GRIPLINE_WIDTH_MM/2,-GRIPLINE_LENGTH_MM/2,
   GRIPLINE_WIDTH_MM,GRIPLINE_LENGTH_MM);
 }else{
  // Sólo durante la carga o fallo del fichero: indicador discreto
  // para que el coche jamás desaparezca de una carrera.
  ctx.fillStyle="#f8faff";roundRect(ctx,-49,-21,98,42,13);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle="#187ac0";
  ctx.fillRect(-27,-8,52,16);
 }
 ctx.restore();
}
function loosePart(piece,index){
 const n=CATALOG[piece.id].length?7:20;
 const pose={x:piece.x,y:piece.y,h:piece.h};
 const points=Array.from({length:n+1},(_,k)=>positionOnPiece(pose,piece.id,k/n));
 return{id:piece.id,index,start:pose,end:points[points.length-1],points,raised:Boolean(piece.raised)};
}
// Una unión magnética se dibuja como UNA superficie continua. La sombra,
// los cantos y las juntas de conector sólo aparecen en el perímetro del
// tramo, no en las piezas interiores que ya quedaron encajadas.
function loosePaintGroups(){
 const groups=[],seen=new Set();
 for(let i=0;i<state.loose.length;i++){
  if(seen.has(i))continue;
  const indices=looseMembers(i);
  for(const j of indices)seen.add(j);
  const parts=indices.map(j=>loosePart(state.loose[j],j));
  const points=parts.flatMap((part,k)=>k?part.points.slice(1):part.points);
  groups.push({key:looseGroupKey(i),indices,parts,points});
 }
 return groups;
}
// Dibujo de puentes en trazados todavía sin homologar. Una recta suelta
// puede cruzar otra pieza o un tramo magnético, aunque aún no se haya
// pulsado Iniciar. La intersección no equivale a conexión magnética.
function crossingOnLooseParts(upper,lower){
 const a=upper.points,b=lower.points;
 for(let i=1;i<a.length;i++)for(let j=1;j<b.length;j++){
  const p=a[i-1],q=b[j-1],dx=a[i].x-p.x,dy=a[i].y-p.y,
   ex=b[j].x-q.x,ey=b[j].y-q.y;
  const det=dx*ey-dy*ex;if(Math.abs(det)<1e-8)continue;
  const rx=q.x-p.x,ry=q.y-p.y;
  const t=(rx*ey-ry*ex)/det,u=(rx*dy-ry*dx)/det;
  if(t<0||t>1||u<0||u>1)continue;
  const x=p.x+t*dx,y=p.y+t*dy;
  const span=CATALOG[upper.id]?.length||0;
  const progress=(x-upper.start.x)*Math.cos(upper.start.h)+
   (y-upper.start.y)*Math.sin(upper.start.h);
  // El cruce debe dejar 90 mm disponibles para cada rampa.
  if(progress<90||progress>span-90)return null;
  return{x,y};
 }
 return null;
}
function looseOverpasses(groups=loosePaintGroups()){
 const out=[],parts=groups.flatMap(group=>group.parts.map((part,i)=>({
  ...part,key:group.key,order:i
 })));
 for(const upper of parts){
  if(!upper.raised)continue;
  for(const lower of parts){
   if(upper.index===lower.index)continue;
   // Uniones adyacentes del mismo tramo no son cruces.
   if(upper.key===lower.key&&Math.abs(upper.order-lower.order)<=1)continue;
   const crossing=crossingOnLooseParts(upper,lower);
   if(!crossing)continue;
   // Un solo paso a distinto nivel por pieza para este kit experimental.
   if(out.some(x=>x.upper.index===upper.index))continue;
   out.push({upper,lower,crossing});
  }
 }
 return out;
}
function paintLooseOverpasses(ctx,groups){
 for(const {upper,lower,crossing} of looseOverpasses(groups)){
  paintBridgeCrossing(ctx,{parts:[upper,lower],bridge:{
   overParts:[0],underParts:[1],crossing,virtual:false,height:65
  }});
 }
}
function paintLoose(ctx){
 const groups=loosePaintGroups();
 // Los soportes se sitúan bajo TODAS las piezas, no sólo bajo el tramo
 // que lleva el kit. Así nunca quedan sobre la vía inferior del cruce.
 for(const group of groups)for(const part of group.parts)
  if(part.raised)paintSupportKit(ctx,part);
 for(const group of groups){
  const {points,parts,indices}=group;
  if(!points.length)continue;
  ctx.save();ctx.shadowColor="#0009";ctx.shadowBlur=18;ctx.shadowOffsetY=12;
  strokePath(ctx,points,PIECE_LOOK.shadow,TRACK_WIDTH+19);
  ctx.restore();
  strokePath(ctx,points,PIECE_LOOK.outer,TRACK_WIDTH+12);
  strokePath(ctx,points,PIECE_LOOK.rim,TRACK_WIDTH+5);
  strokePath(ctx,points,PIECE_LOOK.deck,TRACK_WIDTH-4);
  strokePath(ctx,points,PIECE_LOOK.inner,TRACK_WIDTH-31);
  for(const off of [-LANE_OFFSET,LANE_OFFSET]){
   strokePath(ctx,translated(points,off),PIECE_LOOK.groove,11);
   strokePath(ctx,translated(points,off-7.6),PIECE_LOOK.metalA,2.2);
   strokePath(ctx,translated(points,off+7.6),PIECE_LOOK.metalB,2.2);
   strokePath(ctx,translated(points,off),PIECE_LOOK.guide,5);
  }
  for(const edge of [-72,72])strokePath(ctx,translated(points,edge),PIECE_LOOK.edge,2.5);
  // Sólo los conectores exteriores: nunca dibujar una falsa separación
  // oscura entre dos módulos magnéticamente unidos.
  paintSeam(ctx,parts[0].start);
  paintSeam(ctx,parts[parts.length-1].end);
  for(const part of parts)if(part.raised)paintBridgeRampProfile(ctx,part);
  if(state.mode==="build"&&state.looseSelection>=0){
   if(state.selectionMode==="group"&&group.key===state.selectedGroup){
    ctx.save();ctx.globalAlpha=.22;
    strokePath(ctx,points,"#6effdf",TRACK_WIDTH+25);ctx.restore();
   }else if(state.selectionMode==="piece"&&indices.includes(state.looseSelection)){
    const part=parts[indices.indexOf(state.looseSelection)];
    ctx.save();ctx.globalAlpha=.43;
    strokePath(ctx,part.points,"#f4d06c",TRACK_WIDTH+25);ctx.restore();
   }
  }
 }
 paintLooseOverpasses(ctx,groups);
 if(state.mode==="build"&&state.looseSelection>=0){
  const magnet=bestMagnet(state.looseSelection);
  if(magnet){
   ctx.save();ctx.lineWidth=7;ctx.strokeStyle="#84f6c0";ctx.setLineDash([20,12]);
   ctx.beginPath();ctx.moveTo(magnet.from.x,magnet.from.y);
   ctx.lineTo(magnet.to.x,magnet.to.y);ctx.stroke();
   ctx.setLineDash([]);ctx.restore();
  }
 }
 if(state.dragging?.active&&state.mode==="build"){
  const d=state.dragging,rect=editCanvas.getBoundingClientRect();
  const w=worldFromPointer(makeView(editCanvas,"build"),d.x-rect.left,d.y-rect.top);
  const b=state.workBoard;
  if(w.x>=b.left&&w.x<=b.right&&w.y>=b.top&&w.y<=b.bottom){
   const end=state.track.ends.end,snap=!state.track.closed&&state.types.length>0&&Math.hypot(w.x-end.x,w.y-end.y)<SNAP_DISTANCE_MM;
   const snapped=gridXY(w.x,w.y);
   const pose=snap?{x:end.x,y:end.y,h:end.h}:{x:snapped.x,y:snapped.y,h:0};
   const spec=CATALOG[d.id],n=spec.length?7:20;
   const points=Array.from({length:n+1},(_,k)=>positionOnPiece(pose,d.id,k/n));
   ctx.save();ctx.globalAlpha=.63;
   strokePath(ctx,points,snap?"#66ffe0":"#ffcc7c",TRACK_WIDTH+22);
   strokePath(ctx,points,"#25313b",TRACK_WIDTH);
   for(const off of [-LANE_OFFSET,LANE_OFFSET])strokePath(ctx,translated(points,off),"#081017",9);
   ctx.restore();
  }
 }
}
function nearestLoose(x,y){
 let best={index:-1,distance:Infinity};
 for(let i=0;i<state.loose.length;i++){
  const part=loosePart(state.loose[i],i);
  const hit=nearestPiece({parts:[part]},x,y);
  if(hit.distance<best.distance)best={index:i,distance:hit.distance};
 }
 return best;
}
function paintGhost(ctx,track){
 if(!track.parts.length||track.closed||state.mode!=="build")return;
 const e=track.ends.end;
 ctx.save();ctx.globalAlpha=.38;ctx.strokeStyle="#ffe29b";ctx.lineWidth=8;
 ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+Math.cos(e.h)*67,e.y+Math.sin(e.h)*67);ctx.stroke();
 ctx.restore();
}
// Exportación PNG autocontenida. La receta viaja DENTRO de la imagen
// (no en un archivo secundario), con números de montaje y elevaciones.
function blueprintData(){
 const recipe=buildRecipe(state.types,CATALOG,state.bridgeParts,state.loose,state.driveDirection);
 // Los kits son accesorios de montaje, no modifican la geometría
 // longitudinal de las rectas. Aun así deben aparecer en la receta.
 const kitCount=Math.max(recipe.bridgeCount,Number(Boolean(state.track.bridge)));
 if(kitCount){
  recipe.bridgeCount=kitCount;
  recipe.items.push({id:"BRIDGE_KIT",name:"Kit puente 65 mm · soportes y rampas",
   count:kitCount,length:0,accessory:true});
 }
 return recipe;
}
// El plano usa su propio estilo de impresión: toda la pista es blanca
// y todas las juntas entre piezas son negras. No altera el color de la
// mesa, la caja de piezas ni la representación de la carrera.
const BLUEPRINT_TRACK=Object.freeze({
 outline:"#10171a",paper:"#ffffff",lane:"#333b40",
 rail:"#9da8ad",seam:"#080c0f",supports:"#aab8bd"
});
function paintBlueprintRibbon(ctx,points){
 if(points.length<2)return;
 ctx.save();ctx.lineCap="butt";ctx.lineJoin="round";
 // Contorno fino y negro, con un único tablero blanco continuo.
 strokePath(ctx,points,BLUEPRINT_TRACK.outline,TRACK_WIDTH+8);
 strokePath(ctx,points,BLUEPRINT_TRACK.paper,TRACK_WIDTH);
 // Dos ranuras de guía contrastadas, manteniendo la zona blanca.
 for(const laneOffset of [-LANE_OFFSET,LANE_OFFSET]){
  strokePath(ctx,translated(points,laneOffset),BLUEPRINT_TRACK.lane,4.4);
  for(const side of [-7.6,7.6])
   strokePath(ctx,translated(points,laneOffset+side),BLUEPRINT_TRACK.rail,2);
 }
 ctx.restore();
}
function paintBlueprintSeam(ctx,p){
 const nx=-Math.sin(p.h),ny=Math.cos(p.h);
 ctx.save();ctx.strokeStyle=BLUEPRINT_TRACK.seam;ctx.lineWidth=5;
 ctx.lineCap="butt";
 ctx.beginPath();
 ctx.moveTo(p.x-nx*(TRACK_WIDTH/2-2),p.y-ny*(TRACK_WIDTH/2-2));
 ctx.lineTo(p.x+nx*(TRACK_WIDTH/2-2),p.y+ny*(TRACK_WIDTH/2-2));
 ctx.stroke();
 // Pequeños conectores visibles a cada lado, sin sombreado negro que
 // convierta los módulos en objetos visualmente separados.
 ctx.fillStyle=BLUEPRINT_TRACK.seam;
 for(const off of [-TRACK_WIDTH/2+7,TRACK_WIDTH/2-7]){
  ctx.beginPath();ctx.arc(p.x+nx*off,p.y+ny*off,4.2,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function paintBlueprintSupports(ctx,part){
 if(!part||!(CATALOG[part.id]?.length>=350))return;
 for(const t of [.24,.76]){
  const p=positionOnPiece(part.start,part.id,t);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.h);
  ctx.fillStyle=BLUEPRINT_TRACK.supports;
  ctx.strokeStyle=BLUEPRINT_TRACK.outline;ctx.lineWidth=3;
  ctx.fillRect(-14,-99,28,198);
  ctx.strokeRect(-14,-99,28,198);
  ctx.restore();
 }
}
function paintBlueprintOverpass(ctx,track){
 if(!track.bridge)return;
 const upper=track.parts[track.bridge.overParts[0]];
 if(!upper)return;
 const lower=track.parts[track.bridge.underParts?.[0]];
 const center=track.bridge.crossing||positionOnPiece(upper.start,upper.id,.5);
 const angle=upper.start.h;
 const slope=Math.abs(Math.sin(angle-(lower?.start?.h??angle+Math.PI/2)));
 const halfLength=Math.min(210,Math.max(103,
  Math.ceil((TRACK_WIDTH/2+16)/Math.max(.55,slope))));
 ctx.save();ctx.translate(center.x,center.y);ctx.rotate(angle);
 ctx.beginPath();ctx.rect(-halfLength,-(TRACK_WIDTH+12)/2,
  halfLength*2,TRACK_WIDTH+12);ctx.clip();
 ctx.rotate(-angle);ctx.translate(-center.x,-center.y);
 const pts=track.bridge.overParts.flatMap((index,i)=>
  i?track.parts[index].points.slice(1):track.parts[index].points);
 paintBlueprintRibbon(ctx,pts);
 for(const partIndex of track.bridge.overParts){
  const part=track.parts[partIndex];
  if(part)paintBlueprintSeam(ctx,part.start);
 }
 ctx.restore();
}
function paintBlueprintTrack(ctx,track){
 const groups=loosePaintGroups();
 // Los soportes se dibujan primero para no tapar nunca los carriles.
 const raised=new Set([
  ...state.bridgeParts,
  ...(track.bridge?.overParts||[])
 ]);
 for(const index of raised)paintBlueprintSupports(ctx,track.parts[index]);
 for(const group of groups)for(const part of group.parts)
  if(part.raised)paintBlueprintSupports(ctx,part);
 if(track.parts.length){
  paintBlueprintRibbon(ctx,track.points);
  for(const part of track.parts)paintBlueprintSeam(ctx,part.start);
  if(!track.closed)paintBlueprintSeam(ctx,track.ends.end);
  paintBlueprintOverpass(ctx,track);
 }
 // También exporta un montaje sin iniciar; cada costura del grupo
 // es visible en negro, incluso si las piezas están imantadas.
 for(const group of groups){
  if(!group.points.length)continue;
  paintBlueprintRibbon(ctx,group.points);
  for(const part of group.parts)paintBlueprintSeam(ctx,part.start);
  paintBlueprintSeam(ctx,group.parts[group.parts.length-1].end);
 }
 for(const {upper,lower,crossing} of looseOverpasses(groups))
  paintBlueprintOverpass(ctx,{parts:[upper,lower],bridge:{
   overParts:[0],underParts:[1],crossing
  }});
}
// Identificación visual por TIPO, no por posición: todas las curvas R1
// 90° derechas llevan la misma letra. El círculo mantiene su tamaño en
// píxeles exportados independientemente del zoom del plano.
function paintBlueprintIdentifiers(ctx,track,groups,refs,scale){
 const pieces=[...track.parts,...groups.flatMap(group=>group.parts)];
 const markers=[];
 const crossing=track.bridge?.crossing;
 const underParts=new Set(track.bridge?.underParts||[]);
 for(const part of pieces){
  const code=refs.get(part.id);
  if(!code)continue;
  let sample=.5;
  // La letra de un tramo INFERIOR no debe aparecer encima del tramo
  // superior justo en el cruce. Desplazarla dentro de su propia pieza.
  if(crossing&&track.parts[part.index]===part&&underParts.has(part.index)){
   const mid=positionOnPiece(part.start,part.id,.5);
   if(Math.hypot(mid.x-crossing.x,mid.y-crossing.y)<TRACK_WIDTH){
    const a=positionOnPiece(part.start,part.id,.28);
    const b=positionOnPiece(part.start,part.id,.72);
    sample=Math.hypot(a.x-crossing.x,a.y-crossing.y)>
     Math.hypot(b.x-crossing.x,b.y-crossing.y)?.28:.72;
   }
  }
  const point=positionOnPiece(part.start,part.id,sample);
  ctx.save();ctx.translate(point.x,point.y);
  ctx.scale(1/scale,1/scale);
  ctx.beginPath();ctx.arc(0,0,21,0,Math.PI*2);
  ctx.fillStyle="#102d36";ctx.fill();
  ctx.strokeStyle="#e9fffa";ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle="#ffffff";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font=code.length>1?"900 17px system-ui,sans-serif":
   "900 23px system-ui,sans-serif";
  ctx.fillText(code,0,1);
  ctx.restore();
  markers.push({id:part.id,code,x:point.x,y:point.y});
 }
 return markers;
}
function drawBlueprint(ctx,recipe,{width=1500}={}){
 const rows=Math.max(1,Math.ceil(recipe.items.length/2));
 const refs=blueprintReferenceMap(recipe.items);
 const x=Math.round(width*.045),bodyWidth=width-2*x;
 const headingY=74;
 const frame={x:x+13,y:216,width:bodyWidth-26,height:Math.round(width*.79)};
 const metricsY=frame.y+frame.height+42;
 const recipeHeadingY=metricsY+170;
 const recipeRowY=recipeHeadingY+33;
 const h=Math.ceil(recipeRowY+rows*59+104);
 ctx.canvas.width=width;ctx.canvas.height=h;
 ctx.fillStyle="#091921";ctx.fillRect(0,0,width,h);
 // Cabecera técnica, sin elementos propios del HUD de carrera.
 ctx.fillStyle="#48e4c1";ctx.fillRect(x,headingY,15,105);
 ctx.fillStyle="#f5fffb";ctx.font="900 76px system-ui,sans-serif";
 ctx.textAlign="left";ctx.fillText("SLOTRACE",x+36,headingY+59);
 ctx.fillStyle="#7adccc";ctx.font="800 24px system-ui,sans-serif";
 ctx.fillText("CRAFT RACE STUDIO · PLANO DE CIRCUITO",x+36,headingY+100);
 ctx.fillStyle="#effff7";ctx.font="800 33px system-ui,sans-serif";
 ctx.fillText(circuitLabel().slice(0,45),x+36,headingY+151);
 ctx.textAlign="right";ctx.fillStyle="#c1f1e7";ctx.font="900 27px system-ui,sans-serif";
 ctx.fillText(recipe.direction===1?"↻ SENTIDO HORARIO":"↺ SENTIDO ANTIHORARIO",
  width-x,headingY+51);
 ctx.fillStyle="#a1b9bc";ctx.font="600 22px system-ui,sans-serif";
 ctx.fillText("SR-PRECISION · ESCALA PROPORCIONAL",width-x,headingY+87);
 ctx.textAlign="left";
 ctx.strokeStyle="#57958c";ctx.lineWidth=2;
 ctx.strokeRect(x,frame.y-13,bodyWidth,frame.height+26);
 ctx.fillStyle="#17433b";ctx.fillRect(frame.x,frame.y,frame.width,frame.height);
 const groups=loosePaintGroups();
 const pts=[...state.track.parts.flatMap(p=>p.points),...groups.flatMap(g=>g.points)];
 const bounds=pts.length?{
  minX:Math.min(...pts.map(p=>p.x))-92,maxX:Math.max(...pts.map(p=>p.x))+92,
  minY:Math.min(...pts.map(p=>p.y))-92,maxY:Math.max(...pts.map(p=>p.y))+92
 }:{minX:0,maxX:TABLE.width,minY:0,maxY:TABLE.height};
 const actualW=Math.max(100,bounds.maxX-bounds.minX);
 const actualH=Math.max(100,bounds.maxY-bounds.minY);
 const scale=Math.min((frame.width-35)/actualW,(frame.height-35)/actualH);
 const cx=(bounds.minX+bounds.maxX)/2,cy=(bounds.minY+bounds.maxY)/2;
 ctx.save();ctx.beginPath();ctx.rect(frame.x,frame.y,frame.width,frame.height);ctx.clip();
 ctx.strokeStyle="#ffffff0c";ctx.lineWidth=1;
 for(let i=0;i<frame.width;i+=42){
  ctx.beginPath();ctx.moveTo(frame.x+i,frame.y);
  ctx.lineTo(frame.x+i,frame.y+frame.height);ctx.stroke();
 }
 for(let i=0;i<frame.height;i+=42){
  ctx.beginPath();ctx.moveTo(frame.x,frame.y+i);
  ctx.lineTo(frame.x+frame.width,frame.y+i);ctx.stroke();
 }
 ctx.translate(frame.x+frame.width/2,frame.y+frame.height/2);
 ctx.scale(scale,scale);ctx.translate(-cx,-cy);
 paintBlueprintTrack(ctx,state.track);
 // Las letras se dibujan encima de las vías, después de los cruces, para
 // que sean legibles tanto en rectas como en curvas y en el puente.
 const markers=paintBlueprintIdentifiers(ctx,state.track,groups,refs,scale);
 ctx.restore();
 // La sección de métricas se conserva debajo del plano ampliado.
 ctx.fillStyle="#102c35";ctx.fillRect(x,metricsY,bodyWidth,104);
 const length=(state.track.parts.length?state.track.length:recipe.nominalLength)/1000;
 const status=state.track.valid?"CIRCUITO CERRADO":
  state.loose.length?"MONTAJE EN PROGRESO":"EXTREMOS ABIERTOS";
 const metrics=[
  [String(recipe.pieces),"PIEZAS"],
  [length.toFixed(2)+" m","LONGITUD DE CARRERA"],
  [String(recipe.bridgeCount||Number(Boolean(state.track.bridge))),"KITS ELEVACIÓN"],
  [status,"ESTADO"]
 ];
 const col=bodyWidth/4;
 for(const [i,metric] of metrics.entries()){
  const px=x+21+i*col;
  ctx.fillStyle="#effff8";
  ctx.font=i===3?"800 23px system-ui,sans-serif":"900 34px system-ui,sans-serif";
  ctx.fillText(metric[0],px,metricsY+49);
  ctx.fillStyle="#85bbb4";ctx.font="750 16px system-ui,sans-serif";
  ctx.fillText(metric[1],px,metricsY+79);
 }
 ctx.fillStyle="#59e3c6";ctx.font="900 32px system-ui,sans-serif";
 ctx.fillText("RECETA DE PIEZAS",x,recipeHeadingY);
 ctx.textAlign="right";ctx.fillStyle="#8dbdb4";
 ctx.font="650 18px system-ui,sans-serif";
 ctx.fillText("LETRA EN PISTA = TIPO DE PIEZA",width-x,recipeHeadingY);
 ctx.textAlign="left";
 // Sólo la receta agrupada; el orden de montaje ya no forma parte del PNG.
 for(const [i,item] of recipe.items.entries()){
  const row=i>>1,side=i%2,rx=x+side*(bodyWidth/2),ry=recipeRowY+row*59;
  ctx.fillStyle=row%2?"#112831":"#172f37";
  ctx.fillRect(rx,ry,bodyWidth/2-10,51);
  const reference=refs.get(item.id);
  if(reference){
   ctx.fillStyle="#54ecc7";ctx.font="950 26px system-ui,sans-serif";
   ctx.fillText(reference,rx+12,ry+34);
  }
  ctx.fillStyle="#edfff7";ctx.font="750 22px system-ui,sans-serif";
  ctx.fillText(item.name,rx+(reference?56:13),ry+33);
  ctx.textAlign="right";ctx.fillStyle="#5aefca";
  ctx.font="900 26px system-ui,sans-serif";
  ctx.fillText("×"+item.count,rx+bodyWidth/2-31,ry+34);
  ctx.textAlign="left";
 }
 ctx.fillStyle="#779ba3";ctx.font="650 18px system-ui,sans-serif";
 ctx.fillText("SLOTRACE · Receta integrada · Medidas nominales en mm · Generado localmente",
  x,h-47);
 ctx.textAlign="right";ctx.fillText("TOP DOWN RACE: SLOTRACE",width-x,h-47);
 ctx.textAlign="left";
 return {width,height:h,recipe,bounds,scale,frame,
  markers,references:Object.fromEntries(refs),
  blueprintStyle:"white-track-black-seams"};
}
async function exportBlueprint(){
 const recipe=blueprintData();
 if(!recipe.pieces){toast("Construye al menos una pieza para exportar el plano.");return false;}
 const canvas=document.createElement("canvas");
 if(!canvas||typeof canvas.getContext!=="function"){toast("No se pudo preparar el plano.");return false;}
 const ctx=canvas.getContext("2d",{alpha:false});
 if(!ctx){toast("No hay soporte de dibujo para exportar.");return false;}
 drawBlueprint(ctx,recipe);
 const blob=await new Promise(resolve=>canvas.toBlob?canvas.toBlob(resolve,"image/png"):resolve(null));
 if(!blob){toast("No se pudo generar el PNG. Prueba en Safari.");return false;}
 const filename="slotrace-"+slugName(circuitLabel())+
  "-"+(state.driveDirection===1?"horario":"antihorario")+".png";
 const canShare=typeof navigator!=="undefined"&&typeof navigator.share==="function"&&
  typeof File==="function";
 if(canShare){
  const file=new File([blob],filename,{type:"image/png"});
  if(typeof navigator.canShare!=="function"||navigator.canShare({files:[file]})){
   try{
    await navigator.share({files:[file],title:"Plano SlotRace",text:"Plano con receta de piezas"});
    return true;
   }catch(e){
    if(e?.name==="AbortError")return false; // Compartir cancelado
   }
  }
 }
 // Safari normal y navegadores sin Web Share: descarga estándar.
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=filename;a.rel="noopener";
 document.body.appendChild(a);a.click();a.remove();
 if(typeof window.setTimeout==="function")
  window.setTimeout(()=>URL.revokeObjectURL(url),60000);
 toast("Plano PNG generado con la receta adherida.");
 return true;
}

function resize(){
 // iPhone Safari ajusta el viewport varias veces al girar o esconder barras.
 // Sólo cambiamos el backing buffer cuando cambia realmente el tamaño.
 let changed=false;
 const dpr=Math.min(2,window.devicePixelRatio||1);
 for(const canvas of [editCanvas,raceCanvas]){
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)continue;
  const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){
   canvas.width=w;canvas.height=h;changed=true;
  }
 }
 if(changed)state.viewDirty=true;
}
let resizeQueued=false;
function scheduleResize(){
 if(resizeQueued)return;
 resizeQueued=true;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  resizeQueued=false;resize();
 }));
}
function makeView(canvas,mode){
 const dpr=Math.min(2,window.devicePixelRatio||1);
 const w=canvas.width/dpr,h=canvas.height/dpr;
 const portrait=typeof window.matchMedia==="function"?
  window.matchMedia("(orientation: portrait)").matches:
  (Number.isFinite(window.innerWidth)&&Number.isFinite(window.innerHeight)?
   window.innerHeight>window.innerWidth:h>w*1.1);
 const angle=portrait?Math.PI/2:0;
 const target=mode==="build"?state.workBoard:
  {left:state.track.bounds.left-160,right:state.track.bounds.right+160,
   top:state.track.bounds.top-160,bottom:state.track.bounds.bottom+160};
 const cx=(target.left+target.right)/2,cy=(target.top+target.bottom)/2;
 const bw=target.right-target.left,bh=target.bottom-target.top;
 const width=portrait?bh:bw,height=portrait?bw:bh;
 const base=Math.max(.01,Math.min((w-16)/width,(h-16)/height));
 const zoom=mode==="build"?state.camera.zoom:1;
 const scale=base*zoom;
 const panX=mode==="build"?state.camera.panX:0,panY=mode==="build"?state.camera.panY:0;
 return{w,h,angle,scale,cx,cy,panX,panY,dpr};
}
function transform(ctx,v){
 ctx.translate(v.w/2+v.panX,v.h/2+v.panY);ctx.rotate(v.angle);ctx.scale(v.scale,v.scale);ctx.translate(-v.cx,-v.cy);
}
function worldFromPointer(v,screenX,screenY){
 let x=(screenX-v.w/2-v.panX)/v.scale,y=(screenY-v.h/2-v.panY)/v.scale;
 const c=Math.cos(v.angle),s=Math.sin(v.angle);
 return{x:v.cx+c*x+s*y,y:v.cy-s*x+c*y};
}
function renderScene(canvas,mode){
 if(!canvas.width||!canvas.height)return;
 const ctx=canvasCtx.get(canvas),v=makeView(canvas,mode);
 ctx.setTransform(v.dpr,0,0,v.dpr,0,0);
 ctx.fillStyle="#0a141b";ctx.fillRect(0,0,v.w,v.h);
 ctx.save();transform(ctx,v);
 paintTable(ctx);paintGrid(ctx);
 const track=state.track,hasBridge=Boolean(track.bridge);
 const p=drivingPose(mode==="race"?state.distance:0);
 const carAbove=hasBridge&&carTrackLevel(track,p)==="upper";
 // Las patas van bajo la pista. No dibujar una placa sobre el asfalto.
 for(const index of state.bridgeParts){
  const part=track.parts[index];if(part)paintSupportKit(ctx,part);
 }
 // Dibujo continuo: los carriles de los módulos acoplados nunca se cortan.
 paintContinuousTrack(ctx,track,mode==="build");
 for(const index of state.bridgeParts){
  const part=track.parts[index];if(part)paintBridgeRampProfile(ctx,part);
 }
 if(hasBridge){
  // El coche inferior sólo pasa tras la MÁSCARA PEQUEÑA del cruce;
  // el resto de la diagonal no puede ocultarlo.
  if(track.valid&&!carAbove)paintCar(ctx,p,state.lane);
  paintBridgeCrossing(ctx,track);
  if(track.valid&&carAbove)paintCar(ctx,p,state.lane);
 }else if(track.valid)paintCar(ctx,p,state.lane);
 paintLoose(ctx);
 paintGhost(ctx,track);
 ctx.restore();
}
function screenToWorld(e){
 const rect=editCanvas.getBoundingClientRect(),v=makeView(editCanvas,"build");
 return worldFromPointer(v,e.clientX-rect.left,e.clientY-rect.top);
}
// Rotación táctil discreta: cada salto corresponde exactamente a 22,5°.
// La posición base se conserva durante todo el gesto para no acumular error.
const TOUCH_ROTATION_STEP=Math.PI/8;
const rotatePoint=(p,c,s,center)=>({
 x:center.x+(p.x-center.x)*c-(p.y-center.y)*s,
 y:center.y+(p.x-center.x)*s+(p.y-center.y)*c
});
function startTwoFingerGesture(){
 const pair=[...state.pointer.values()];
 if(pair.length!==2)return;
 const dx=pair[1].x-pair[0].x,dy=pair[1].y-pair[0].y;
 const bearing=Math.atan2(dy,dx);
 const hit=pair.find(p=>p.looseIndex>=0||p.trackIndex>=0);
 const dragging=pair.some(p=>p.dragged);
 // Si un dedo ya estaba arrastrando, el gesto no cancela ni pierde
 // ese movimiento: sólo el nuevo dedo queda consumido por el pellizco.
 if(dragging){
  for(const p of pair)if(!p.dragged)p.consumed=true;
  state.pinch={mode:"camera",distance:Math.hypot(dx,dy),zoom:state.camera.zoom};
  return;
 }
 // Ambos dedos sobre zona libre: mantener pinch-to-zoom + desplazamiento.
 for(const p of pair)p.consumed=true;
 if(!hit){
  state.pinch={mode:"camera",distance:Math.hypot(dx,dy),zoom:state.camera.zoom};
  return;
 }
 const target=hit.looseIndex>=0?"loose":"main";
 const index=target==="loose"?hit.looseIndex:hit.trackIndex;
 const key=target==="loose"?looseGroupKey(index):"main";
 const single=state.selectedGroup===key&&state.selectionMode==="piece"&&
  (target==="loose"?state.looseSelection===index:state.selection===index);
 state.pinch={mode:"rotate",bearing,travel:0,steps:0,started:false,
  target,index,single};
}
function rotateGestureToSteps(g,steps){
 if(!Number.isInteger(steps)||steps===g.steps)return;
 if(!g.started){
  pushHistory(); // Un solo punto de deshacer por todo el gesto.
  if(g.target==="main"&&g.single){
   const moved=detachConnected(g.index,{history:false});
   if(moved<0)return;
   if(looseMembers(moved).length>1)detachLooseMember(moved);
   g.target="loose";g.index=moved;
  }else if(g.target==="loose"&&g.single){
   detachLooseMember(g.index);
  }
  if(g.target==="main"){
   const b=state.track.bounds;
   g.pivot={x:(b.left+b.right)/2,y:(b.top+b.bottom)/2};
   g.originalOrigin={...state.origin};
   state.selectedGroup="main";state.selectionMode="group";
   state.selection=g.index;state.looseSelection=-1;
  }else{
   g.indices=g.single?[g.index]:looseMembers(g.index);
   g.originalPieces=g.indices.map(i=>({i,...state.loose[i]}));
   const pts=g.indices.flatMap(i=>loosePart(state.loose[i],i).points);
   g.pivot={x:(Math.min(...pts.map(p=>p.x))+Math.max(...pts.map(p=>p.x)))/2,
    y:(Math.min(...pts.map(p=>p.y))+Math.max(...pts.map(p=>p.y)))/2};
   state.selectedGroup=looseGroupKey(g.index);
   state.selectionMode=g.single?"piece":"group";
   state.looseSelection=g.index;state.selection=-1;
  }
  g.started=true;
 }
 const angle=steps*TOUCH_ROTATION_STEP,c=Math.cos(angle),sn=Math.sin(angle);
 if(g.target==="main"){
  const p=rotatePoint(g.originalOrigin,c,sn,g.pivot);
  state.origin={x:p.x,y:p.y,h:g.originalOrigin.h+angle};
  state.track=buildTrack(state.types,state.origin,state.bridgeParts);
 }else for(const original of g.originalPieces){
  const p=rotatePoint(original,c,sn,g.pivot),item=state.loose[original.i];
  if(!item)continue;
  item.x=p.x;item.y=p.y;item.h=original.h+angle;
 }
 g.steps=steps;
 $("tableCaption").textContent="GIRANDO "+(steps*22.5).toLocaleString("es-ES")+
  "° · PASOS EXACTOS DE 22,5°";
 state.viewDirty=true;
}
function moveTwoFingerRotation(g){
 const pair=[...state.pointer.values()];
 if(pair.length!==2)return;
 const bearing=Math.atan2(pair[1].y-pair[0].y,pair[1].x-pair[0].x);
 g.travel+=angleDiff(bearing,g.bearing);
 g.bearing=bearing;
 const steps=Math.round(g.travel/TOUCH_ROTATION_STEP);
 rotateGestureToSteps(g,steps);
}
let dragOrigin=null;
function canvasPointerDown(e){
 if(state.mode!=="build")return;
 editCanvas.setPointerCapture(e.pointerId);
 const point=screenToWorld(e);
 // Ambos dedos pueden comenzar sobre cualquier tramo: si el primero
 // cae en el tapete y el segundo en la pieza, también admite giro.
 const loose=nearestLoose(point.x,point.y);
 const looseIndex=loose.distance<TRACK_WIDTH*.55?loose.index:-1;
 const hit=looseIndex<0?nearestPiece(state.track,point.x,point.y):{index:-1,distance:Infinity};
 const trackIndex=hit.distance<TRACK_WIDTH*.55?hit.index:-1;
 const key=trackIndex>=0?"main":looseIndex>=0?looseGroupKey(looseIndex):null;
 // Primer toque selecciona el tramo; el siguiente toque selecciona la
 // pieza concreta. Un arrastre respeta el modo de selección vigente.
 const samePiece=trackIndex>=0?state.selection===trackIndex:state.looseSelection===looseIndex;
 const dragMode=key&&key===state.selectedGroup&&state.selectionMode==="piece"&&samePiece?"piece":"group";
 state.pointer.set(e.pointerId,{
  x:e.clientX,y:e.clientY,originX:e.clientX,originY:e.clientY,
  originWorld:point,looseIndex,trackIndex,dragMode,dragged:false,
  pieceStart:looseIndex>=0?{...state.loose[looseIndex]}:null
 });
 if(state.pointer.size===2)startTwoFingerGesture();
}
function canvasPointerMove(e){
 const p=state.pointer.get(e.pointerId);if(!p)return;
 const oldX=p.x,oldY=p.y;p.x=e.clientX;p.y=e.clientY;
 const distance=Math.hypot(p.x-p.originX,p.y-p.originY);
 if(state.pointer.size>=2&&state.pinch?.mode==="rotate"){
  moveTwoFingerRotation(state.pinch);return;
 }
 // Tras acabar un gesto de dos dedos, el dedo restante nunca activa
 // accidentalmente el arrastre normal ni cambia la selección.
 if(p.consumed&&state.pointer.size<2)return;
 if(state.pointer.size===1&&p.trackIndex>=0&&distance>=7){
  if(!p.dragged){
   if(p.dragMode==="piece"){
    const looseIndex=detachConnected(p.trackIndex,{history:true});
    if(looseIndex>=0){
     p.looseIndex=looseIndex;p.trackIndex=-1;p.pieceStart={...state.loose[looseIndex]};
     p.dragged=true;p.dragMode="piece";
    }
   }else{
    pushHistory();p.dragged=true;p.moveMain=true;
    p.startOrigin={...state.origin};
    state.selectedGroup="main";state.selectionMode="group";state.selection=p.trackIndex;
    state.looseSelection=-1;
   }
  }
 }
 if(state.pointer.size===1&&p.moveMain){
  const to=screenToWorld(e),b=state.workBoard;
  state.origin={
   x:Math.max(b.left+90,Math.min(b.right-90,coordinate(p.startOrigin.x+to.x-p.originWorld.x))),
   y:Math.max(b.top+90,Math.min(b.bottom-90,coordinate(p.startOrigin.y+to.y-p.originWorld.y))),
   h:p.startOrigin.h
  };
  state.track=buildTrack(state.types,state.origin,state.bridgeParts);
  state.viewDirty=true;return;
 }
 if(state.pointer.size===1&&p.looseIndex>=0){
  if(distance<7&&!p.dragged)return;
  if(!p.dragged){
   pushHistory();p.dragged=true;
   if(p.dragMode==="piece"&&looseMembers(p.looseIndex).length>1)
    detachLooseMember(p.looseIndex);
   p.memberIndices=p.dragMode==="group"?looseMembers(p.looseIndex):[p.looseIndex];
   p.memberPositions=p.memberIndices.map(i=>({i,x:state.loose[i].x,y:state.loose[i].y}));
   state.selectionMode=p.dragMode;state.selectedGroup=looseGroupKey(p.looseIndex);
   state.looseSelection=p.looseIndex;state.selection=-1;
  }
  if(!p.memberPositions){
   p.memberIndices=[p.looseIndex];
   p.memberPositions=[{i:p.looseIndex,x:p.pieceStart.x,y:p.pieceStart.y}];
  }
  const to=screenToWorld(e),b=state.workBoard;
  const pivot=p.memberPositions.find(v=>v.i===p.looseIndex)||p.memberPositions[0];
  const x=Math.max(b.left+140,Math.min(b.right-140,coordinate(pivot.x+to.x-p.originWorld.x)));
  const y=Math.max(b.top+140,Math.min(b.bottom-140,coordinate(pivot.y+to.y-p.originWorld.y)));
  for(const original of p.memberPositions){
   const piece=state.loose[original.i];if(!piece)continue;
   piece.x=original.x+x-pivot.x;piece.y=original.y+y-pivot.y;
  }
  state.viewDirty=true;return;
 }
 if(state.pointer.size>=2&&state.pinch){
  const list=[...state.pointer.values()],a=list[0],b=list[1];
  const dist=Math.hypot(a.x-b.x,a.y-b.y);
  state.camera.zoom=Math.max(.65,Math.min(4,state.pinch.zoom*dist/Math.max(1,state.pinch.distance)));
  state.camera.panX+=(e.clientX-oldX)/2;state.camera.panY+=(e.clientY-oldY)/2;
 }else{
  state.camera.panX+=e.clientX-oldX;state.camera.panY+=e.clientY-oldY;
 }
 state.viewDirty=true;
}
function canvasPointerEnd(e){
 const p=state.pointer.get(e.pointerId);if(!p)return;
 state.pointer.delete(e.pointerId);
 if(state.pointer.size<2&&state.pinch){
  const g=state.pinch;state.pinch=null;
  if(g.mode==="rotate"&&g.started){
   if(g.target==="main")extendWorkBoard();
   save();updateUI();
   toast("Tramo girado "+(g.steps*22.5).toLocaleString("es-ES")+"° · pasos exactos de 22,5°");
  }
 }
 if(p.consumed)return;
 if(p.dragged){
  if(p.looseIndex>=0&&!snapLoose(p.looseIndex,{history:false})){
   save();updateUI();
  }
  if(p.moveMain){extendWorkBoard();save();updateUI();}
  state.dragLoose=-1;
  return;
 }
 if(state.pointer.size===0&&Math.hypot(p.x-p.originX,p.y-p.originY)<10){
  if(p.looseIndex>=0)selectByTap("loose",p.looseIndex);
  else if(p.trackIndex>=0)selectByTap("main",p.trackIndex);
  else{state.selectedGroup=null;state.selection=-1;state.looseSelection=-1;updateUI();}
 }
}
function initEvents(){

 $("menuRecipe").addEventListener("click",exportRecipe);
 $("menuSaveCircuit").addEventListener("click",saveCircuit);
 $("workSaveCircuit").addEventListener("click",saveCircuit);
 $("importCircuitFile").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(file)await importRecipe(file);
  e.target.value="";
 });
 $("resultsBack").addEventListener("click",openWorkshop);
 $("resultsHome").addEventListener("click",showMenu);
 $("resultsAgain").addEventListener("click",play);
 $("menuExport").addEventListener("click",exportBlueprint);
 $("exportBlueprint").addEventListener("click",exportBlueprint);
  $("menuContinue").addEventListener("click",openWorkshop);
 $("menuRace").addEventListener("click",menuRace);
 $("menuNew").addEventListener("click",createNewCircuit);
 $("menuClockwise").addEventListener("click",()=>setNewCircuitDirection(1));
 $("menuCounter").addEventListener("click",()=>setNewCircuitDirection(-1));
 $("goHome").addEventListener("click",()=>state.mode==="race"?endSession("menu"):showMenu());
 $("raceHome").addEventListener("click",()=>endSession("menu"));
 $("workDirection").addEventListener("click",()=>changeDriveDirection(-state.driveDirection));
  $("play").addEventListener("click",play);
 $("back").addEventListener("click",back);
 $("pause").addEventListener("click",pause);
 $("lane").addEventListener("click",switchLane);
 $("oval").addEventListener("click",()=>{changeTypes(STARTER.slice(),"Óvalo de prueba montado; las piezas sueltas vuelven a la caja.",[],START);resetWorkBoard();save();state.camera={panX:0,panY:0,zoom:1};});
 $("eight").addEventListener("click",()=>{
   changeTypes(FIGURE_EIGHT.slice(),"¡Ocho exacto! Dos rectas 600 y doce curvas de 45°, puente elevado.",[],START);resetWorkBoard();save();
   state.camera={panX:0,panY:0,zoom:1};
   save();
 });
 $("clear").addEventListener("click",()=>{
  changeTypes([],"Mesa vacía: coloca y mueve las piezas como un puzzle.",[],START);
  resetWorkBoard();save();updateUI();
 });
 $("undo").addEventListener("click",undo);$("redo").addEventListener("click",redo);
 $("remove").addEventListener("click",removeSelected);$("restore").addEventListener("click",recoverDraft);
 $("rotate").addEventListener("click",rotateLoose);
 $("flip").addEventListener("click",flipSelectedCurve);
 $("curveDirection").addEventListener("click",toggleCaseCurveDirection);
 $("bridgeKit").addEventListener("click",installBridgeKit);
 $("measureGap").addEventListener("click",measureOpenGap);
 $("caseToggle").addEventListener("click",()=>{
  state.caseOpen=!state.caseOpen;
  save();updateUI();scheduleResize();
 });
 $("joinPiece").addEventListener("click",startSelectedPiece);
 $("gridToggle").addEventListener("click",()=>{
  state.gridEnabled=!state.gridEnabled;save();updateUI();
  toast(state.gridEnabled?"Retícula de 25 mm activada.":"Retícula desactivada.");
 });
 $("autoClose").addEventListener("click",closeExactly);
 $("zoomIn").addEventListener("click",()=>{state.camera.zoom=Math.min(4,state.camera.zoom*1.25);state.viewDirty=true;});
 $("zoomOut").addEventListener("click",()=>{state.camera.zoom=Math.max(.65,state.camera.zoom/1.25);state.viewDirty=true;});
 $("zoomFit").addEventListener("click",()=>{state.camera={panX:0,panY:0,zoom:1};state.viewDirty=true;});
 for(const type of ["pointerdown","pointermove","pointerup","pointercancel","lostpointercapture"]){
  editCanvas.addEventListener(type,e=>{
   if(type==="pointerdown")canvasPointerDown(e);
   else if(type==="pointermove")canvasPointerMove(e);
   else canvasPointerEnd(e);
  });
 }
 editCanvas.addEventListener("wheel",e=>{
  if(state.mode!=="build")return;e.preventDefault();
  state.camera.zoom=Math.max(.65,Math.min(4,state.camera.zoom*(e.deltaY>0?.9:1.1)));
  state.viewDirty=true;
 },{passive:false});
 $("clickSound").addEventListener("click",()=>{
  state.clicksEnabled=!state.clicksEnabled;
  if(state.clicksEnabled)initDialAudio();
  save();updateTriggerDisplay();
 });
 const trigger=$("trigger");
 trigger.addEventListener("pointerdown",triggerPointerDown);
 trigger.addEventListener("pointermove",triggerPointerMove);
 for(const name of ["pointerup","pointercancel","lostpointercapture"])trigger.addEventListener(name,triggerPointerEnd);
 window.addEventListener("keydown",e=>{
  if(e.code==="Escape"&&state.mode!=="menu"){
   if(state.mode==="race")endSession("menu");else showMenu();return;
  }
  if(state.mode==="race"&&(e.code==="Space"||e.code==="ArrowUp")&&e.target.tagName!=="INPUT"){e.preventDefault();state.keyboardGas=true;}
  if(state.mode==="race"&&e.code==="KeyP"){pause();}
 });
 window.addEventListener("keyup",e=>{if(e.code==="Space"||e.code==="ArrowUp")state.keyboardGas=false;});
 const pauseBackground=()=>{state.buttonGas=false;state.keyboardGas=false;state.gas=0;state.triggerGesture=null;if(state.mode==="race")state.run=false;updateHud();};
 window.addEventListener("blur",pauseBackground);
 document.addEventListener("visibilitychange",()=>{if(document.hidden)pauseBackground();});
 window.addEventListener("resize",scheduleResize);
 if(window.visualViewport)window.visualViewport.addEventListener("resize",scheduleResize);
 if(typeof ResizeObserver!=="undefined"){
  new ResizeObserver(scheduleResize).observe($("tableSpace"));
  new ResizeObserver(scheduleResize).observe($("raceSpace"));
 }
}
function loop(now){
 const dt=Math.max(0,Math.min(.05,(now-state.latest)/1000));state.latest=now;
 simulation(dt);
 if(state.mode==="build"){
  if(state.viewDirty){renderScene(editCanvas,"build");state.viewDirty=false;}
 }else if(state.mode==="race")renderScene(raceCanvas,"race");
 if(!state._hudTime||now-state._hudTime>100){state._hudTime=now;updateHud();}
 if(state.noticeUntil&&now>state.noticeUntil){$("toast").classList.remove("show");state.noticeUntil=0;}
 requestAnimationFrame(loop);
}
palette();initEvents();updateUI();resize();requestAnimationFrame(loop);
window.slotraceLab={version:"DEV 0.11.0",state,buildTrack,STARTER,FIGURE_EIGHT,CATALOG,openRace:play,back,endSession,completeLap,saveCircuit,loadSavedCircuit,exportRecipe,importRecipe,circuitPackage,showMenu,openWorkshop,createNewCircuit,changeDriveDirection,drivingPose,blueprintData,drawBlueprint,exportBlueprint,undo,redo,changeTypes,
puzzle:{measureOpenGap,openGroups,loopFromLooseGroup,closeLooseLoop,closeExactly,detachConnected,startSelectedPiece,scatterLoose,snapLoose,loosePaintGroups,looseOverpasses,paintLoose,installBridgeKit,paintSupportKit,paintBridgeRampProfile,rotateGestureToSteps,flipSelectedCurve,toggleCaseCurveDirection,screenToWorld,canvasPointerDown,canvasPointerMove,canvasPointerEnd,
 looseMembers,looseGroup,bestMagnet,selectByTap,promoteLooseGroup,detachLooseMember},
 physics:{DRIVE,curveLimit,visualCarPose,simulationStep:simulation}};
// La pantalla de carga sólo se oculta después de que la mesa y sus piezas
// hayan superado la inicialización y se haya pintado el primer fotograma.
requestAnimationFrame(()=>{
 const splash=$("loadingScreen");
 if(!splash)return;
 window.setTimeout(()=>{
  splash.classList.add("is-done");
  window.setTimeout(()=>{splash.hidden=true;},280);
 },550);
});
