import {TABLE,START,TRACK_WIDTH,LANE_OFFSET,CATALOG,STARTER,FIGURE_EIGHT,buildTrack,positionAt,nearestPiece,freeStock,allowed,UNLIMITED_DEVELOPMENT_STOCK,positionOnPiece,findLegalClosure,carTrackLevel} from "./track.mjs";
const $=id=>document.getElementById(id);
const storage=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}};
const KEY="slotrace-lab-09";
const old=(()=>{try{return JSON.parse(storage(KEY)||"null");}catch(e){return null;}})();
const legacy=(()=>{try{return JSON.parse(storage("slotrace-lab-04")||"null");}catch(e){return null;}})();
const oldValid=old?.types&&allowed(old.types);
const initial=oldValid?old.types.slice():FIGURE_EIGHT.slice();
// El primer inicio de DEV 0.5 conserva la construcción anterior sin
// sustituir el ocho de demostración. Nunca borramos la clave antigua.
const legacyDraft=!oldValid&&legacy?.types&&allowed(legacy.types)?
 {types:legacy.types.slice(),loose:Array.isArray(legacy.loose)?legacy.loose:[]} :null;
const storedLoose=Array.isArray(old?.loose)?old.loose.filter(p=>CATALOG[p?.id]&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.h)):[];
const initialLoose=allowed([...initial,...storedLoose.map(p=>p.id)])?storedLoose:[];
const initialOrigin=old?.origin&&[old.origin.x,old.origin.y,old.origin.h].every(Number.isFinite)?
 {...old.origin}:{...START};
const state={
  gridEnabled:old?.gridEnabled!==false,caseOpen:old?.caseOpen!==false,viewDirty:true,caseCurveDirection:old?.caseCurveDirection==="L"?"L":"R",
  types:initial,loose:initialLoose,origin:initialOrigin,track:buildTrack(initial,initialOrigin),mode:"build",selection:-1,looseSelection:-1,selectionMode:"group",selectedGroup:null,dragLoose:-1,
  history:[],redo:[],draft:old?.draft&&Array.isArray(old.draft.types)?old.draft:
 Array.isArray(old?.draft)&&allowed(old.draft)?{types:old.draft,loose:[]}:
 legacyDraft,
  lane:0,run:false,lap:1,seconds:0,speed:0,distance:0,penalty:0,
  drift:0,driftDirection:0,deslot:null,cornerDistance:0,gripDebt:0,cornerDirection:0,
  gas:0,buttonGas:false,keyboardGas:false,triggerGesture:null,clicksEnabled:old?.clicksEnabled!==false,
  records:old?.records&&typeof old.records==="object"?old.records:
 legacy?.records&&typeof legacy.records==="object"?legacy.records:{},
  messages:[],notice:"",noticeUntil:0,rev:0,
  camera:{panX:0,panY:0,zoom:1},pointer:new Map(),pinch:null,
  dragging:null,latest:performance.now()
};
const oldBoard=old?.workBoard;
const boardValid=oldBoard&&["left","top","right","bottom","width","height"].every(k=>Number.isFinite(oldBoard[k]));
state.workBoard=boardValid?{...oldBoard}:{...state.track.board};
function save(){storage(KEY,JSON.stringify({types:state.types,loose:state.loose,
 origin:state.origin,workBoard:state.workBoard,draft:state.draft,records:state.records,
 gridEnabled:state.gridEnabled,clicksEnabled:state.clicksEnabled,caseOpen:state.caseOpen,caseCurveDirection:state.caseCurveDirection}));}
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

const stage=$("buildScreen"),race=$("raceScreen");
const editCanvas=$("editCanvas"),raceCanvas=$("raceCanvas");
const canvasCtx=new Map([[editCanvas,editCanvas.getContext("2d",{alpha:false})],[raceCanvas,raceCanvas.getContext("2d",{alpha:false})]]);
const format=n=>n.toFixed(3).replace(".",",");
const recKey=()=>state.types.join("-");
const record=()=>{const v=state.records[recKey()];return Array.isArray(v)&&v.length===2?v:[null,null];};
function toast(text){state.notice=text;state.noticeUntil=performance.now()+2600;$("toast").textContent=text;$("toast").classList.add("show");}
function setMessage(msg){$("buildStatus").textContent=msg;}
function snapshot(){return{types:state.types.slice(),loose:state.loose.map(p=>({...p})),origin:{...state.origin}};}
function restoreSnapshot(shot){
 state.types=shot.types.slice();state.loose=(shot.loose||[]).map(p=>({...p}));
 state.origin=shot.origin?{...shot.origin}:{...START};
 state.track=buildTrack(state.types,state.origin);extendWorkBoard();
 state.selection=-1;state.looseSelection=-1;state.selectionMode="group";state.selectedGroup=null;resetLap();save();updateUI();
}
function pushHistory(){state.history.push(snapshot());if(state.history.length>45)state.history.shift();state.redo=[];}
function changeTypes(next,msg,loose=state.loose,newOrigin=state.origin){
 if(!allowed([...next,...loose.map(p=>p.id)])){toast("La construcción contiene piezas desconocidas.");return false;}
 const wasClosed=state.track.closed;
 pushHistory();state.types=next.slice();state.loose=loose.map(p=>({...p}));state.origin={...newOrigin};state.track=buildTrack(state.types,state.origin);extendWorkBoard();
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
 let best=null;
 for(const target of targets)for(const [side,from,to] of [
  ["append",moving.start,target.end],["prepend",moving.end,target.start]]){
  const gap=connectorDistance(from,to),rotation=angleDiff(to.h,from.h);
  if(gap>distance||Math.abs(rotation)>SNAP_ROTATION_RAD)continue;
  const score=gap+Math.abs(rotation)*22;
  if(!best||score<best.score)best={...target,side,from,to,gap,rotation,score};
 }
 return best;
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
 transformLoose(source.indices,magnet.from,magnet.to);
 const moved=source.indices.map(i=>({...state.loose[i]}));
 if(magnet.kind==="main"){
  if(magnet.side==="append")state.types.push(...moved.map(p=>p.id));
  else{state.types.unshift(...moved.map(p=>p.id));state.origin={x:moved[0].x,y:moved[0].y,h:moved[0].h};}
  for(const i of [...source.indices].sort((a,b)=>b-a))state.loose.splice(i,1);
  state.track=buildTrack(state.types,state.origin);extendWorkBoard();
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
 }
 state.dragLoose=-1;save();updateUI();
 toast("¡Clac! Piezas acopladas: ya puedes moverlas como un tramo.");
 return true;
}
function detachConnected(index,{history=true}={}){
 if(index<0||index>=state.types.length)return -1;
 if(history)pushHistory();
 const pieces=state.track.parts.slice(index).map(part=>({id:part.id,x:part.start.x,y:part.start.y,h:part.start.h}));
 const first=state.loose.length;
 state.types=state.types.slice(0,index);
 if(pieces.length>1){
  const key=newMagnetGroup();
  for(let k=1;k<pieces.length;k++){pieces[k].magnetGroup=key;pieces[k].magnetOrder=k-1;}
 }
 state.loose.push(...pieces);
 state.track=buildTrack(state.types,state.origin);extendWorkBoard();
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
 for(const i of [...group.indices].sort((a,b)=>b-a))state.loose.splice(i,1);
 state.track=buildTrack(state.types,state.origin);extendWorkBoard();
 state.selectedGroup="main";state.selectionMode="group";state.selection=0;state.looseSelection=-1;
 save();updateUI();toast("¡Tramo fijado! Puedes seguir ampliándolo.");return true;
}
function startSelectedPiece(){
 if(state.looseSelection<0)return;
 if(!state.types.length){promoteLooseGroup(state.looseSelection);return;}
 if(!snapLoose(state.looseSelection,{history:true}))
  toast("Acerca un conector a otro para unir los tramos.");
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
function closeExactly(){
 if(state.track.closed){
   toast(state.track.intersection?"Los extremos ya conectan, pero hay un cruce sin puente.":"Este circuito ya está cerrado.");return;
 }
 if(state.loose.length){toast("Recoge o encaja primero las piezas sueltas.");return;}
 if(state.types.length<2){toast("Coloca primero varias piezas.");return;}
 $("autoClose").disabled=true;$("autoClose").textContent="Buscando…";
 requestAnimationFrame(()=>{
   try{
    const result=findLegalClosure(state.types,{maxReplace:3,maxAdd:5,maxStates:90000,origin:state.origin});
    if(result.ok){
     if(result.unchanged)toast("El circuito ya estaba cerrado exactamente.");
     else changeTypes(result.types,"Cierre calculado: "+result.replaced+" pieza(s) cambiada(s), "+result.added+" añadida(s). Puedes deshacer.");
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
 changeTypes(d.types||[], "Construcción anterior recuperada.",d.loose||[],d.origin||START);
}
function play(){
 state.triggerGesture=null;
 if(!state.track.valid){
  state.draft=snapshot();
  state.types=STARTER.slice();state.loose=[];state.origin={...START};state.track=buildTrack(state.types,state.origin);resetWorkBoard();state.selection=-1;state.looseSelection=-1;
  save();
 }
 state.run=true;state.penalty=0;state.deslot=null;state.drift=0;state.driftDirection=0;state.cornerDistance=0;state.gripDebt=0;state.cornerDirection=0;state.gas=0;state.buttonGas=false;state.keyboardGas=false;state.speed=0;
 state.mode="race";state.latest=performance.now();updateUI();resize();
 toast("¡Pista lista! Suelta el gatillo antes de las curvas.");
}
function back(){state.run=false;state.gas=0;state.buttonGas=false;state.keyboardGas=false;state.triggerGesture=null;state.mode="build";updateUI();resize();}
function pause(){state.run=!state.run;state.gas=0;state.buttonGas=false;state.keyboardGas=false;state.triggerGesture=null;
 $("trigger").classList.remove("pressed");state.latest=performance.now();updateUI();
 toast(state.run?"¡Volvemos a correr!":"Carrera en pausa.");}
function switchLane(){if(state.run){toast("Pausa primero para cambiar de carril.");return;}state.lane=1-state.lane;resetLap();updateUI();toast("Carril "+(state.lane===0?"izquierdo":"derecho")+" · nueva tanda.");}
function completeLap(){
 if(state.seconds<.05)return;
 const v=record(),sec=state.seconds;
 if(v[state.lane]===null||v[state.lane]===undefined||sec<v[state.lane]){
  v[state.lane]=sec;state.records[recKey()]=v;save();toast("¡Récord personal "+(state.lane===0?"izquierda":"derecha")+"! "+format(sec)+" s");
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
 const lane=state.track.lanes[state.lane],p=positionAt(lane,state.distance);
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
 const pose=positionAt(state.track.lanes[state.lane],state.distance);
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
 stage.hidden=state.mode!=="build";race.hidden=state.mode!=="race";
 const t=state.track;
 const degrees=t.headingGap*180/Math.PI;
 const status=t.bridge?"OCHO CON PUENTE · "+(t.length/1000).toFixed(2)+" m":
 t.valid?"CERRADO EXACTO · "+(t.length/1000).toFixed(2)+" m":
  !t.types.length?(state.loose.length?state.loose.length+" PIEZAS SUELTAS · INICIA LA CADENA":"MESA VACÍA · COLOCA PIEZAS"): t.closed?"CONECTADO · CRUCE SIN PUENTE":
  "ABIERTO · "+Math.round(t.gap)+" mm · "+Math.round(degrees)+"°";
 const notice=t.bridge?"PUENTE ELEVADO 65 MM · CRUCE PROTEGIDO":
 t.intersection?"Cruce al mismo nivel: necesita puente":
  !t.onTable?"El circuito rebasa la mesa":t.closed?"Conectores alineados matemáticamente":
  t.types.length?"Desfase: "+Math.round(t.gap)+" mm y "+Math.round(degrees)+"°":state.loose.length+" piezas sueltas · toca una y pulsa Iniciar";
 $("stateChip").textContent=t.bridge?"✓ OCHO CON PUENTE":
 t.valid?"✓ CERRADO PERFECTO":t.closed?"⚠ CERRADO CON CRUCE":"○ EXTREMOS ABIERTOS";
 $("stateDetails").textContent=t.valid?t.types.length+" piezas · "+(t.length/1000).toFixed(2)+" m":notice;
 $("buildStatus").textContent=status;
 $("gridToggle").textContent=state.gridEnabled?"▦ 25 mm":"▦";
 $("gridToggle").setAttribute("aria-pressed",String(state.gridEnabled));
 $("buildStatus").classList.toggle("good",t.valid);
 $("buildStatus").classList.toggle("warn",!t.valid);
 $("play").textContent=t.valid?"🏁 Correr":"🏁 Probar óvalo";
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
 $("autoClose").disabled=state.types.length<2||state.track.closed||state.loose.length>0;
 $("undo").disabled=!state.history.length;
 $("redo").disabled=!state.redo.length;
 const used=state.types.length+state.loose.length;
 const total=Object.values(CATALOG).reduce((sum,spec)=>sum+spec.stock,0);
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
 $("tableCaption").textContent=state.looseSelection>=0?"PIEZA SUELTA · arrástrala al conector amarillo":
 state.selection>=0?"TRAMO SELECCIONADO · toca otra pieza para sustituirlo":
 state.dragging?"SUELTA LA PIEZA SOBRE EL TAPETE":"ARRASTRA UNA PIEZA DESDE ⠿ · PELLIZCA PARA ZOOM";
 updateHud();
}
// Un alojamiento por geometría; izquierda/derecha comparten el mismo molde.
const pocketNames={
 S078:"RECTA 78",S0875:"RECTA 87,5",S175:"RECTA 175",S350:"RECTA 350",
 S584:"RECTA 584",START350:"SALIDA / META",
 R1_225R:"R1 · 22,5°",R1_45R:"R1 · 45°",R1_90R:"R1 · 90°",
 R2_225R:"R2 · 22,5°",R2_45R:"R2 · 45°",
 R3_225R:"R3 · 22,5°",R4_225R:"R4 · 22,5°"
};
const pocketIds=Object.keys(CATALOG).filter(id=>!id.includes("_")||id.endsWith("R"));
function foamSlotSVG(id){
 const spec=CATALOG[id],n=spec.length?2:20;
 const pts=Array.from({length:n+1},(_,i)=>positionOnPiece({x:0,y:0,h:0},id,i/n));
 const minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x));
 const minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y));
 const scale=Math.min(.31,80/Math.max(1,maxX-minX),40/Math.max(1,maxY-minY));
 const tx=(120-(maxX-minX)*scale)/2,ty=(80-(maxY-minY)*scale)/2;
 const xy=p=>[(tx+(p.x-minX)*scale).toFixed(2),(ty+(p.y-minY)*scale).toFixed(2)];
 const path=points=>points.map((p,i)=>{const [x,y]=xy(p);return(i?"L":"M")+x+" "+y;}).join(" ");
 const main=path(pts);
 const slot=off=>path(pts.map(p=>({x:p.x-Math.sin(p.h)*off,
   y:p.y+Math.cos(p.h)*off,h:p.h})));
 const width=TRACK_WIDTH*scale;
 return '<svg viewBox="0 0 120 80" focusable="false" aria-hidden="true">'+
  '<path class="foam-cutout-shadow" d="'+main+'" stroke-width="'+(width+13).toFixed(1)+'"/>'+
  '<path class="foam-cutout" d="'+main+'" stroke-width="'+(width+8).toFixed(1)+'"/>'+
  '<g class="mini-slot-piece">'+
   '<path class="mini-slot-stack" transform="translate(0 3)" d="'+main+'" stroke-width="'+(width+4).toFixed(1)+'"/>'+
   '<path class="mini-slot-rim" d="'+main+'" stroke-width="'+(width+3).toFixed(1)+'"/>'+
   '<path class="mini-slot-deck" d="'+main+'" stroke-width="'+(width-2).toFixed(1)+'"/>'+
   '<path class="mini-slot-rail" d="'+slot(-LANE_OFFSET)+'" stroke-width="2"/>'+
   '<path class="mini-slot-rail" d="'+slot(LANE_OFFSET)+'" stroke-width="2"/>'+
   '<path class="mini-slot-guide" d="'+slot(-LANE_OFFSET)+'" stroke-width=".8"/>'+
   '<path class="mini-slot-guide" d="'+slot(LANE_OFFSET)+'" stroke-width=".8"/>'+
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
    '<span class="pocket-caption"><strong>'+pocketNames[id]+'</strong><small>'+spec.code+'</small></span>';
  let suppressNextClick=false;
  // Un toque saca una pieza; el teclado también puede activarla.
  pocket.addEventListener("click",e=>{
   // Ratón y teclado siguen funcionando como alternativa al tacto.
   // El evento click sintético tras pointerup no debe consumir dos piezas.
   if(suppressNextClick&&e?.detail!==0){suppressNextClick=false;return;}
   inventoryAction(id);
  });
  // No hace falta localizar una lengüeta diminuta: se puede coger la
  // pieza desde cualquier punto de su propio hueco troquelado.
  pocket.addEventListener("pointerdown",e=>{
   if(state.dragging||freeStock([...state.types,...state.loose.map(p=>p.id)],id)<1)return;
   e.preventDefault?.();
   suppressNextClick=false;
   state.dragging={id,pointerId:e.pointerId,x:e.clientX,y:e.clientY,
    originX:e.clientX,originY:e.clientY,active:false};
   try{pocket.setPointerCapture(e.pointerId);}catch(err){}
   state.viewDirty=true;
  });
  pocket.addEventListener("pointermove",e=>{
   const d=state.dragging;
   if(!d||d.id!==id||d.pointerId!==e.pointerId)return;
   d.x=e.clientX;d.y=e.clientY;
   if(Math.hypot(d.x-d.originX,d.y-d.originY)>9)d.active=true;
   state.viewDirty=true;
  });
  pocket.addEventListener("pointerup",e=>{
   const d=state.dragging;
   if(!d||d.id!==id||d.pointerId!==e.pointerId)return;
   state.dragging=null;state.viewDirty=true;
   // Un toque corto se resuelve directamente en pointerup; Safari
   // no siempre envía el click sintético al capturar el puntero.
   // Si lo envía, se suprime para no extraer dos piezas de una vez.
   suppressNextClick=true;
   if(!d.active){inventoryAction(id);return;}
   const rect=editCanvas.getBoundingClientRect();
   if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom){
    toast("Suelta la pieza en el tapete. No se ha gastado ninguna.");return;
   }
   const pt=screenToWorld(e),b=state.workBoard;
   if(pt.x<b.left+85||pt.x>b.right-85||pt.y<b.top+85||pt.y>b.bottom-85){
    toast("Suelta dentro de la mesa verde.");return;
   }
   // La pieza sale del maletín, permanece suelta o encaja si toca un
   // conector. Nunca se desplazan las piezas que ya están colocadas.
   if(!addLoose(id,pt.x,pt.y))return;
   snapLoose(state.loose.length-1,{history:false});
  });
  pocket.addEventListener("pointercancel",e=>{
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
 strokePath(ctx,path,"#0c1518",TRACK_WIDTH+19);ctx.restore();
 strokePath(ctx,path,"#65747a",TRACK_WIDTH+12);
 strokePath(ctx,path,"#1e282d",TRACK_WIDTH+5);
 strokePath(ctx,path,"#343e44",TRACK_WIDTH-4);
 strokePath(ctx,path,"#283139",TRACK_WIDTH-31);
 for(const laneOffset of [-LANE_OFFSET,LANE_OFFSET]){
  const line=translated(path,laneOffset);
  strokePath(ctx,line,"#101418",11);
  strokePath(ctx,translated(path,laneOffset-7.6),"#94a5ac",2.2);
  strokePath(ctx,translated(path,laneOffset+7.6),"#a2b4bc",2.2);
  strokePath(ctx,line,"#080c0e",5);
 }
 for(const edge of [-72,72])strokePath(ctx,translated(path,edge),"#65787e",2.5);
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
function paintBridgeCrossing(ctx,track){
 if(!track.bridge)return;
 const elevated=track.parts[track.bridge.overParts[0]];
 const middle=positionOnPiece(elevated.start,elevated.id,.5),angle=middle.h;
 const halfLength=185,halfWidth=(TRACK_WIDTH+13)/2;
 ctx.save();ctx.translate(middle.x,middle.y);ctx.rotate(angle);
 // Los soportes están fuera de la intersección, sin invadir las ranuras.
 for(const x of [-halfLength-33,halfLength+33]){
  ctx.save();ctx.shadowColor="#0009";ctx.shadowBlur=12;
  ctx.fillStyle="#566d75";roundRect(ctx,x-15,-101,30,202,7);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle="#becfcf";ctx.fillRect(x-4,-92,8,184);
  ctx.restore();
 }
 ctx.beginPath();roundRect(ctx,-halfLength,-halfWidth,halfLength*2,halfWidth*2,13);ctx.clip();
 ctx.rotate(-angle);ctx.translate(-middle.x,-middle.y);
 const upper=track.bridge.overParts.flatMap((index,i)=>i?track.parts[index].points.slice(1):track.parts[index].points);
 ctx.save();ctx.shadowColor="#000b";ctx.shadowBlur=16;ctx.shadowOffsetY=10;
 strokePath(ctx,upper,"#10181c",TRACK_WIDTH+23);ctx.restore();
 strokePath(ctx,upper,"#728187",TRACK_WIDTH+13);
 strokePath(ctx,upper,"#1d282e",TRACK_WIDTH+4);
 strokePath(ctx,upper,"#36424a",TRACK_WIDTH-7);
 strokePath(ctx,upper,"#28343a",TRACK_WIDTH-35);
 for(const laneOffset of [-LANE_OFFSET,LANE_OFFSET]){
  const line=translated(upper,laneOffset);
  strokePath(ctx,line,"#0a1014",10);
  strokePath(ctx,translated(upper,laneOffset-7.6),"#aabdc0",2.1);
  strokePath(ctx,translated(upper,laneOffset+7.6),"#aabdc0",2.1);
  strokePath(ctx,line,"#050c0e",5);
 }
 for(const edge of [-72,72])strokePath(ctx,translated(upper,edge),"#8a9a9e",2.6);
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
function paintCar(ctx,at,lane,paused=false){
 if(!at)return;
 const color=lane===0?"#55eecf":"#ffc267";
 const visual=visualCarPose(at);
 ctx.save();ctx.translate(visual.x,visual.y);ctx.rotate(visual.h);
 if(visual.smoke>.03){
  // Estelas breves de las ruedas posteriores, sin imágenes ni partículas
  // persistentes que penalicen el rendimiento en el iPhone.
  ctx.save();
  ctx.globalAlpha=Math.min(.45,.38*visual.smoke);
  for(let i=0;i<3;i++){
   const x=-83-i*23,y=(i-1)*20;
   ctx.beginPath();ctx.ellipse(x,y,9+i*6,4+i*4,.2,0,Math.PI*2);
   ctx.fillStyle="#d9e7e0";ctx.fill();
  }
  if(visual.spin){
   ctx.strokeStyle="#def0e2";ctx.lineWidth=3;
   ctx.beginPath();ctx.arc(0,0,104,visual.h,visual.h+Math.PI*.9);ctx.stroke();
  }
  ctx.restore();
 }
 ctx.shadowColor="#000a";ctx.shadowBlur=17;ctx.shadowOffsetY=9;
 ctx.fillStyle="#0b1013";roundRect(ctx,-77,-32,154,64,16);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 for(const x of [-53,49])for(const y of [-33,25]){
  ctx.fillStyle="#0c1215";roundRect(ctx,x,y,32,10,4);ctx.fill();
  ctx.fillStyle="#69787b";ctx.fillRect(x+4,y+4,23,2);
 }
 const paint=ctx.createLinearGradient(0,-30,0,30);
 paint.addColorStop(0,"#e2fff2");paint.addColorStop(.2,color);paint.addColorStop(.8,lane===0?"#159380":"#ad681d");paint.addColorStop(1,"#062125");
 ctx.fillStyle=paint;roundRect(ctx,-70,-27,140,54,19);ctx.fill();
 ctx.fillStyle="#111d23";roundRect(ctx,-8,-23,49,46,11);ctx.fill();
 ctx.fillStyle="#416972";roundRect(ctx,11,-19,22,38,6);ctx.fill();
 ctx.fillStyle="#faf9ee";ctx.fillRect(-47,-24,54,6);ctx.fillRect(-47,18,54,6);
 ctx.fillStyle="#fffef1";ctx.fillRect(58,-20,7,11);ctx.fillRect(58,9,7,11);
 ctx.fillStyle="#b41d27";ctx.fillRect(-65,-19,5,12);ctx.fillRect(-65,7,5,12);
 ctx.fillStyle="#092b30";ctx.font="bold 21px sans-serif";ctx.textAlign="center";ctx.fillText("7",-38,8);
 ctx.restore();
}
function loosePart(piece,index){
 const n=CATALOG[piece.id].length?7:20;
 const pose={x:piece.x,y:piece.y,h:piece.h};
 const points=Array.from({length:n+1},(_,k)=>positionOnPiece(pose,piece.id,k/n));
 return{id:piece.id,index,start:pose,end:points[points.length-1],points};
}
function paintLoose(ctx){
 for(const [index,p] of state.loose.entries()){
  const part=loosePart(p,index);
  ctx.save();ctx.shadowColor="#0009";ctx.shadowBlur=20;ctx.shadowOffsetY=13;
  strokePath(ctx,part.points,"#10181a",TRACK_WIDTH+22);ctx.restore();
  strokePath(ctx,part.points,"#728184",TRACK_WIDTH+12);
  strokePath(ctx,part.points,"#2a353a",TRACK_WIDTH+2);
  strokePath(ctx,part.points,"#38434a",TRACK_WIDTH-13);
  for(const off of [-LANE_OFFSET,LANE_OFFSET]){
   strokePath(ctx,translated(part.points,off),"#071015",10);
   strokePath(ctx,translated(part.points,off-7),"#a0afb3",2);
   strokePath(ctx,translated(part.points,off+7),"#a0afb3",2);
  }
  paintSeam(ctx,part.start);
  const selected=state.mode==="build"&&state.looseSelection>=0&&
   (state.selectionMode==="piece"?index===state.looseSelection:
    looseGroupKey(index)===state.selectedGroup);
  if(selected){
   ctx.save();ctx.globalAlpha=state.selectionMode==="group"?.22:.43;
   strokePath(ctx,part.points,state.selectionMode==="group"?"#6effdf":"#f4d06c",TRACK_WIDTH+25);
   ctx.restore();
  }
  if(state.mode==="build"&&state.looseSelection===index){
   const magnet=bestMagnet(index);
   if(magnet){
    ctx.save();ctx.lineWidth=7;ctx.strokeStyle="#84f6c0";ctx.setLineDash([20,12]);
    ctx.beginPath();ctx.moveTo(magnet.from.x,magnet.from.y);
    ctx.lineTo(magnet.to.x,magnet.to.y);ctx.stroke();
    ctx.setLineDash([]);ctx.restore();
   }
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
 const p=positionAt(track.lanes[state.lane],mode==="race"?state.distance:0);
 const carAbove=hasBridge&&carTrackLevel(track,p)==="upper";
 // Dibujar el circuito completo como un solo tramo continuo evita
 // bandas que se comen otras piezas en las uniones.
 paintContinuousTrack(ctx,track,mode==="build");
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
let dragOrigin=null;
function canvasPointerDown(e){
 if(state.mode!=="build")return;
 editCanvas.setPointerCapture(e.pointerId);
 const point=screenToWorld(e),single=state.pointer.size===0;
 const loose=single?nearestLoose(point.x,point.y):{index:-1,distance:Infinity};
 const looseIndex=loose.distance<TRACK_WIDTH*.55?loose.index:-1;
 const hit=looseIndex<0&&single?nearestPiece(state.track,point.x,point.y):{index:-1,distance:Infinity};
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
 if(state.pointer.size===2){
  const p=[...state.pointer.values()],dx=p[0].x-p[1].x,dy=p[0].y-p[1].y;
  state.pinch={distance:Math.hypot(dx,dy),zoom:state.camera.zoom};
 }
}
function canvasPointerMove(e){
 const p=state.pointer.get(e.pointerId);if(!p)return;
 const oldX=p.x,oldY=p.y;p.x=e.clientX;p.y=e.clientY;
 const distance=Math.hypot(p.x-p.originX,p.y-p.originY);
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
  state.track=buildTrack(state.types,state.origin);
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
 state.pointer.delete(e.pointerId);if(state.pointer.size<2)state.pinch=null;
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
 $("play").addEventListener("click",play);
 $("back").addEventListener("click",back);
 $("pause").addEventListener("click",pause);
 $("lane").addEventListener("click",switchLane);
 $("oval").addEventListener("click",()=>{changeTypes(STARTER.slice(),"Óvalo de prueba montado; las piezas sueltas vuelven a la caja.",[],START);resetWorkBoard();save();state.camera={panX:0,panY:0,zoom:1};});
 $("eight").addEventListener("click",()=>{
   changeTypes(FIGURE_EIGHT.slice(),"¡Ocho exacto! Dos rectas 584 y doce curvas de 45°, puente elevado.",[],START);resetWorkBoard();save();
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
  if(e.code==="Escape"&&state.mode==="race"){back();return;}
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
 }else renderScene(raceCanvas,"race");
 if(!state._hudTime||now-state._hudTime>100){state._hudTime=now;updateHud();}
 if(state.noticeUntil&&now>state.noticeUntil){$("toast").classList.remove("show");state.noticeUntil=0;}
 requestAnimationFrame(loop);
}
palette();initEvents();updateUI();resize();requestAnimationFrame(loop);
window.slotraceLab={version:"DEV 0.9.0",state,buildTrack,STARTER,FIGURE_EIGHT,CATALOG,openRace:play,back,undo,redo,changeTypes,
 puzzle:{detachConnected,startSelectedPiece,scatterLoose,snapLoose,flipSelectedCurve,toggleCaseCurveDirection,screenToWorld,canvasPointerDown,canvasPointerMove,canvasPointerEnd,
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
