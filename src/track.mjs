// SlotRace DEV 0.9.0 · Geometría modular PT-Precision: radios y rectas exactos.
// Catálogo virtual experimental; no se afirma compatibilidad física entre sistemas.
import {GEOMETRY,RADII,PARTS,RECIPES} from "./pt-precision.mjs";
import {analyzeOpenEnds,gapExplanation,measureGap,composeStraightDistance} from "./gap-analysis.mjs";
export const gapAnalysis=Object.freeze({analyzeOpenEnds,gapExplanation,measureGap,composeStraightDistance});
export const TABLE=Object.freeze({width:2200,height:1450,edge:62});
export const START=Object.freeze({x:750,y:325,h:0});
export const TRACK_WIDTH=GEOMETRY.trackWidth;
export const LANE_OFFSET=GEOMETRY.laneOffset;
export const VIRTUAL_R2_RADIUS=RADII.R2;
export const VIRTUAL_R1_RADIUS=RADII.R1;
// Guía orientativa de familias Scalextric Classic (1966/1972), no piezas intercambiables.
// Los radios indicados son exclusivamente las medidas SR-Precision del juego.
// Fuentes: https://www.phantomdrum.co.uk/scalexracer/pdf/scalextric-07-1966.pdf
//          https://slot32.de/media/files/pdf/scalex/scal-cat/scal-13-1972.pdf
export const CURVE_FAMILIES=Object.freeze({
 R1:Object.freeze({radius:RADII.R1,label:"Cerrada",classicCode:"G · PT/52",
  classicAngle:45,classicApproxMm:140}),
 R2:Object.freeze({radius:RADII.R2,label:"Estándar",classicCode:"F · PT/51",
  classicAngle:45,classicApproxMm:295}),
 R3:Object.freeze({radius:RADII.R3,label:"Abierta",classicCode:"H · PT/53",
  classicAngle:22.5,classicApproxMm:450}),
 R4:Object.freeze({radius:RADII.R4,label:"Muy abierta",classicCode:"M · PT/84",
  classicAngle:22.5,classicApproxMm:null})
});
export const CATALOG=Object.freeze(Object.fromEntries(
 Object.entries(PARTS).map(([id,s])=>[id,Object.freeze({
  name:s.name,code:s.reference,
  ...(s.kind==="straight"?{length:s.length}:{radius:s.radius,angle:s.angle}),
  stock:s.kind==="straight"?8:12,group:s.kind==="straight"?"recta":"curva",
  virtualMicroAdapter:Boolean(s.virtualMicroAdapter),
  laneChanger:Boolean(s.laneChanger),
  legacy:Boolean(s.legacy),
  radiusId:s.radiusId||null,degrees:s.degrees||0
 })])
));
export const STARTER=Object.freeze([...RECIPES.ovalR2]);
export const FIGURE_EIGHT=Object.freeze([...RECIPES.eightR2]);
export const BRIDGE_HEIGHT_MM=65;
export function hasAutomaticEightBridge(types){
 return Array.isArray(types)&&types.length===FIGURE_EIGHT.length&&
   types.every((id,i)=>id===FIGURE_EIGHT[i]);
}
const EPS=1e-7;
const SNAP_MM=3; // tolerancia del conector: no estiramos piezas.
const SNAP_RAD=Math.PI/180; // 1 grado máximo.
const BOARD_MARGIN=180; // margen virtual alrededor de la pista.

const hypot=Math.hypot;
const norm=a=>Math.atan2(Math.sin(a),Math.cos(a));
// Inventario de desarrollo ilimitado: stock de la caja separado del
// catálogo físico. Los números stock del catálogo quedan como referencia
// del kit inicial, pero NO limitan los ensayos del constructor.
export const UNLIMITED_DEVELOPMENT_STOCK=true;
export function stockLimit(id){
 if(!CATALOG[id])return 0;
 if(CATALOG[id].laneChanger)return 1;
 return UNLIMITED_DEVELOPMENT_STOCK?Infinity:CATALOG[id].stock;
}
export function allowed(types){
 if(!Array.isArray(types))return false;
 const totals={};
 for(const id of types){
  if(!CATALOG[id])return false;
  totals[id]=(totals[id]||0)+1;
  if(totals[id]>stockLimit(id))return false;
 }
 // Sin el límite histórico de 48 piezas en modo pruebas.
 return UNLIMITED_DEVELOPMENT_STOCK||types.length<=48;
}
export function freeStock(types,id){
 const limit=stockLimit(id);
 return Number.isFinite(limit)?Math.max(0,limit-types.filter(x=>x===id).length):limit;
}
export function positionOnPiece(pose,id,t){
  const spec=CATALOG[id];if(!spec)throw new Error("Pieza desconocida: "+id);
  t=Math.max(0,Math.min(1,t));
  if(spec.length)return{x:pose.x+Math.cos(pose.h)*spec.length*t,y:pose.y+Math.sin(pose.h)*spec.length*t,h:pose.h,curve:0,radius:Infinity};
  const h=pose.h+spec.angle*t,turn=Math.sign(spec.angle),r=turn*spec.radius;
  return{x:pose.x+r*(Math.sin(h)-Math.sin(pose.h)),
    y:pose.y-r*(Math.cos(h)-Math.cos(pose.h)),h,curve:turn,radius:spec.radius};
}
function lineIntersects(a,b,c,d){
  const ax=b.x-a.x,ay=b.y-a.y,bx=d.x-c.x,by=d.y-c.y;
  const det=ax*by-ay*bx;if(Math.abs(det)<EPS)return false;
  const px=c.x-a.x,py=c.y-a.y,t=(px*by-py*bx)/det,u=(px*ay-py*ax)/det;
  // Un cruce puede coincidir exactamente con el conector de otra pieza
  // (caso típico: el centro del ocho). Incluimos extremos; las piezas
  // adyacentes ya se omiten en crossed().
  return t>=-1e-8&&t<=1+1e-8&&u>=-1e-8&&u<=1+1e-8;
}
// Identificar pares de segmentos que se cruzan y su posición. Un punto
// común entre piezas ADYACENTES no es una intersección.
function crossingCandidates(parts,closed){
 const found=[];
 for(let i=0;i<parts.length;i++)for(let j=i+2;j<parts.length;j++){
  if(closed&&i===0&&j===parts.length-1)continue;
  const a=parts[i].points,b=parts[j].points;
  for(let x=0;x<a.length-1;x++)for(let y=0;y<b.length-1;y++){
   const p=a[x],p1=a[x+1],q=b[y],q1=b[y+1];
   const ax=p1.x-p.x,ay=p1.y-p.y,bx=q1.x-q.x,by=q1.y-q.y;
   const det=ax*by-ay*bx;if(Math.abs(det)<EPS)continue;
   const rx=q.x-p.x,ry=q.y-p.y,t=(rx*by-ry*bx)/det,u=(rx*ay-ry*ax)/det;
   if(t< -1e-8||t>1+1e-8||u< -1e-8||u>1+1e-8)continue;
   const at={a:i,b:j,x:p.x+t*ax,y:p.y+t*ay,ta:(x+t)/(a.length-1),tb:(y+u)/(b.length-1)};
   if(!found.some(c=>c.a===i&&c.b===j&&hypot(c.x-at.x,c.y-at.y)<.01))
    found.push(at);
  }
 }
 return found;
}
// Perfil de altura continuo: cualquier curva puede ser una plataforma a 65 mm.
// Las rectas contiguas absorben la pendiente sin tocar las dimensiones de pista.
const MIN_TRANSITION_LENGTH_MM=350;
// Una curva amplia puede actuar como rampa si dispone de suficiente
// longitud de arco. Se mantiene intacta la geometría de los conectores.
const transitionLength=spec=>spec?.length||spec?.radius*Math.abs(spec?.angle||0)||0;
const smoothHeight=t=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
function buildElevation(parts,raisedParts,closed){
 const n=parts.length,selected=[...new Set(raisedParts)].filter(i=>
  Number.isInteger(i)&&i>=0&&i<n).sort((a,b)=>a-b);
 const chosen=new Set(selected),profiles=Array(n).fill(null),runs=[],errors=[];
 if(!selected.length)return{profiles,selected,raisedParts:[],runs,errors,valid:true};
 if(closed&&selected.length===n){
  errors.push("Falta un tramo de subida y bajada: todo el circuito está elevado.");
  runs.push(selected);
 }else for(const i of selected){
  const prev=i?i-1:closed?n-1:-1;
  if(prev>=0&&chosen.has(prev))continue;
  const run=[];let j=i;
  while(j>=0&&chosen.has(j)&&!run.includes(j)){
   run.push(j);j=j+1<n?j+1:closed?0:-1;
  }
  runs.push(run);
 }
 for(const run of runs)for(const i of run)profiles[i]={mode:"plateau"};
 for(const run of runs){
  if(!run.length)continue;
  const first=run[0],last=run[run.length-1];
  const before=first?first-1:closed?n-1:-1;
  const after=last<n-1?last+1:closed?0:-1;
  const ramp=(edge,neighbor,up)=>{
   const adjacent=neighbor>=0?CATALOG[parts[neighbor].id]:null;
   if(neighbor>=0&&!chosen.has(neighbor)&&!profiles[neighbor]&&
      transitionLength(adjacent)>=MIN_TRANSITION_LENGTH_MM){
    profiles[neighbor]={mode:up?"up":"down"};return;
   }
   // Los kits clásicos sobre rectas siguen funcionando con rampas internas.
   const own=CATALOG[parts[edge].id];
   if(transitionLength(own)>=MIN_TRANSITION_LENGTH_MM){
    profiles[edge][up?"up":"down"]=Math.min(.4,Math.max(.18,140/transitionLength(own)));
    return;
   }
   errors.push("Falta un tramo de rampa de al menos 350 mm (recto o curva amplia) para "+
    (up?"subir antes de la zona elevada.":"bajar después de la zona elevada."));
  };
  ramp(first,before,true);ramp(last,after,false);
 }
 return{profiles,selected,runs,errors,
  raisedParts:profiles.flatMap((p,i)=>p?[i]:[]),valid:errors.length===0};
}
function heightAtProfile(e,index,t=.5){
 const p=e?.profiles?.[index];if(!p)return 0;
 if(p.mode==="up")return BRIDGE_HEIGHT_MM*smoothHeight(t);
 if(p.mode==="down")return BRIDGE_HEIGHT_MM*(1-smoothHeight(t));
 let z=BRIDGE_HEIGHT_MM;
 if(p.up!=null)z=Math.min(z,BRIDGE_HEIGHT_MM*smoothHeight(t/p.up));
 if(p.down!=null)z=Math.min(z,BRIDGE_HEIGHT_MM*smoothHeight((1-t)/p.down));
 return z;
}
export function elevationAt(track,index,t=.5){
 return heightAtProfile(track?.elevation,index,t);
}
function laneData(points,side){
  const nodes=points.map(p=>({...p,x:p.x-Math.sin(p.h)*side,y:p.y+Math.cos(p.h)*side}));
  let total=0;const lengths=[0];
  for(let i=1;i<nodes.length;i++){total+=hypot(nodes[i].x-nodes[i-1].x,nodes[i].y-nodes[i-1].y);lengths.push(total);}
  return{nodes,lengths,total,side};
}
export function buildTrack(types,origin=START,raisedParts=[]){
  if(!Array.isArray(types)||types.some(t=>!CATALOG[t]))throw Error("Catálogo inválido");
  let pose={...origin},points=[{...origin,curve:0,radius:Infinity,pieceIndex:-1}],parts=[];
  for(const [index,id] of types.entries()){
    const start={...pose},spec=CATALOG[id],n=spec.length?7:20,section=[];
    for(let k=0;k<=n;k++){const p=positionOnPiece(start,id,k/n);section.push({...p,pieceIndex:index,pieceT:k/n});if(k>0)points.push({...p,pieceIndex:index,pieceT:k/n});}
    pose=section[n];parts.push({id,index,start,end:{...pose},points:section});
  }
  const gap=hypot(pose.x-origin.x,pose.y-origin.y);
  const headingGap=Math.abs(norm(pose.h-origin.h));
  const closed=types.length>=4&&gap<=SNAP_MM&&headingGap<=SNAP_RAD;
  if(closed&&parts.length){
    // El cierre se asienta sobre un único conector común; diferencias submilimétricas
    // del muestreo se eliminan sin deformar el catálogo de piezas.
    const endPoint=points[points.length-1];
    endPoint.x=origin.x;endPoint.y=origin.y;endPoint.h=origin.h;
    const lastPart=parts[parts.length-1];
    lastPart.points[lastPart.points.length-1]=endPoint;
    lastPart.end={...endPoint};
  }
  const bounds={left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity};
  for(const p of points){
    bounds.left=Math.min(bounds.left,p.x-TRACK_WIDTH/2);
    bounds.right=Math.max(bounds.right,p.x+TRACK_WIDTH/2);
    bounds.top=Math.min(bounds.top,p.y-TRACK_WIDTH/2);
    bounds.bottom=Math.max(bounds.bottom,p.y+TRACK_WIDTH/2);
  }
  // La mesa del taller se amplía si el circuito requiere más superficie.
  // No reducimos ni desplazamos el radio de las curvas para fingir un cierre.
  const board={left:0,top:0,right:TABLE.width,bottom:TABLE.height};
  if(types.length){
    board.left=Math.min(0,Math.floor((bounds.left-BOARD_MARGIN)/100)*100);
    board.top=Math.min(0,Math.floor((bounds.top-BOARD_MARGIN)/100)*100);
    board.right=Math.max(TABLE.width,Math.ceil((bounds.right+BOARD_MARGIN)/100)*100);
    board.bottom=Math.max(TABLE.height,Math.ceil((bounds.bottom+BOARD_MARGIN)/100)*100);
  }
  board.width=board.right-board.left;board.height=board.bottom-board.top;
  board.expanded=board.width>TABLE.width||board.height>TABLE.height;
  const onTable=bounds.left>=board.left+TABLE.edge&&bounds.right<=board.right-TABLE.edge&&
    bounds.top>=board.top+TABLE.edge&&bounds.bottom<=board.bottom-TABLE.edge;
  const crossings=crossingCandidates(parts,closed);
   const intersection=crossings.length>0;
   const automatic=closed&&intersection&&hasAutomaticEightBridge(types)&&!raisedParts.length;
   const elevation=buildElevation(parts,automatic?[7]:raisedParts,closed);
   const crossedLevels=crossings.map(c=>{
    const za=heightAtProfile(elevation,c.a,c.ta),zb=heightAtProfile(elevation,c.b,c.tb);
    const upper=za>=zb?c.a:c.b,lower=upper===c.a?c.b:c.a;
    return{...c,upper,lower,upperT:upper===c.a?c.ta:c.tb,
     lowerT:lower===c.a?c.ta:c.tb,clearance:Math.abs(za-zb),
     clear:Math.abs(za-zb)>=BRIDGE_HEIGHT_MM*.88};
   });
   const safeCrossings=crossedLevels.filter(c=>c.clear);
   const bridge=elevation.selected.length?{
    height:BRIDGE_HEIGHT_MM,overParts:[...new Set([
     ...elevation.selected,...safeCrossings.map(c=>c.upper)])],
    underParts:[...new Set(safeCrossings.map(c=>c.lower))],
    supports:elevation.raisedParts.slice(),ramps:true,virtual:automatic,
    crossing:safeCrossings.length?{x:safeCrossings[0].x,y:safeCrossings[0].y}:null,
    crossings:safeCrossings,
    valid:elevation.valid&&safeCrossings.length===crossings.length,
    errors:elevation.errors
   }:null;
   const lanes=[laneData(points,-LANE_OFFSET),laneData(points,LANE_OFFSET)];
 const laneChangerIndex=types.indexOf("X350");
   return{parts,types:[...types],points,lanes,laneChangerIndex,closed,onTable,intersection,crossings,bridge,elevation,
     valid:closed&&onTable&&elevation.valid&&types.filter(id=>id==="X350").length<=1&&safeCrossings.length===crossings.length,
     ends:{begin:{...origin},end:closed?{...origin}:{...pose}},
    gap,headingGap,bounds,board,
    connectorAligned:gap<=SNAP_MM&&headingGap<=SNAP_RAD,
    nearConnection:gap<=TRACK_WIDTH&&types.length>=4,
    length:lanes.reduce((acc,l)=>acc+l.total,0)/2};
}
export function positionAt(lane,distance){
  if(!lane||!lane.nodes.length)return null;
  const d=((distance%lane.total)+lane.total)%lane.total;
  let lo=0,hi=lane.lengths.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>>1;if(lane.lengths[mid]<d)lo=mid;else hi=mid;}
  const a=lane.nodes[lo],b=lane.nodes[hi],fraction=(d-lane.lengths[lo])/(lane.lengths[hi]-lane.lengths[lo]||1);
  // La tangente geométrica se interpola de forma continua. Antes se
  // tomaba atan2 del segmento poligonal, que mantenía el ángulo fijo hasta
  // la siguiente muestra y hacía "saltar" la postura del coche.
  const dh=Math.atan2(Math.sin(b.h-a.h),Math.cos(b.h-a.h));
  const h=a.h+dh*fraction;
  const turn=Math.sign(b.curve||0);
  const radius=Number.isFinite(b.radius)?
    b.radius-(lane.side||0)*turn:Infinity;
  // Sobre curvas: interpolación del arco circular de cada carril, no
  // de la cuerda de la polilínea. Posición y orientación C1 en empalmes.
  const signedRadius=turn*radius;
  const x=turn&&Number.isFinite(radius)&&Math.abs(dh)>1e-9?
    a.x+signedRadius*(Math.sin(h)-Math.sin(a.h)):
    a.x+(b.x-a.x)*fraction;
  const y=turn&&Number.isFinite(radius)&&Math.abs(dh)>1e-9?
    a.y-signedRadius*(Math.cos(h)-Math.cos(a.h)):
    a.y+(b.y-a.y)*fraction;
  return{x,y,h,
    // El tramo activo es el del extremo B del segmento muestreado.
    // Una recta nunca hereda la curva de la pieza anterior.
    curve:b.curve,radius:b.radius,
    // Necesario para saber si el coche circula bajo el puente o sobre él.
    // El tramo se asigna por el segmento de trayectoria, no por la
    // proximidad visual al cruce: dos vías superpuestas son distintas.
    pieceIndex:b.pieceIndex,pieceT:a.pieceIndex===b.pieceIndex?
      (a.pieceT||0)+((b.pieceT||0)-(a.pieceT||0))*fraction:
      (b.pieceT||0)*fraction};
}
export function carTrackLevel(track,pose){
 return elevationAt(track,pose?.pieceIndex,pose?.pieceT??.5)>=BRIDGE_HEIGHT_MM*.5?
  "upper":"lower";
}
export function nearestPiece(track,x,y){
  let best={index:-1,distance:Infinity};
  for(const part of track.parts){
    for(let j=1;j<part.points.length;j++){
      const a=part.points[j-1],b=part.points[j],dx=b.x-a.x,dy=b.y-a.y;
      const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));
      const d=hypot(x-a.x-t*dx,y-a.y-t*dy);
      if(d<best.distance)best={index:part.index,distance:d};
    }
  }
  return best;
}
// Modelo determinista de choque de dos coches simultáneos en la PT/82.
// El juego local es monoplaza por ahora; este contrato permite añadir
// un segundo coche sin inventar una regla distinta en multijugador.
export function pt82Collision(track,a,b){
 const index=track?.laneChangerIndex??-1;
 if(index<0||!a||!b||a.pieceIndex!==index||b.pieceIndex!==index)return false;
 const laneOf=r=>r.entryLane??1-r.lane; // durante X, lane ya es el destino
 if(laneOf(a)===laneOf(b)||a.penalty>0||b.penalty>0)return false;
 // 98 mm de carrocería: la ventana central de contacto cubre
 // menos de 1/3 de los 350 mm. No es un detector de "pieza ocupada".
 return Math.abs(a.pieceT-.5)<=.145&&Math.abs(b.pieceT-.5)<=.145;
}
function pt82PieceDistance(lane,index,t){
 for(let i=1;i<lane.nodes.length;i++){
  const b=lane.nodes[i];
  if(b.pieceIndex!==index)continue;
  const a=lane.nodes[i-1];
  const begin=a.pieceIndex===index?a.pieceT||0:0;
  const finish=b.pieceT??1;
  if(t<=finish+1e-8){
   const f=Math.max(0,Math.min(1,(t-begin)/Math.max(1e-9,finish-begin)));
   return lane.lengths[i-1]+f*(lane.lengths[i]-lane.lengths[i-1]);
  }
 }
 return 0;
}
export function pt82ResolveCollision(track,a,b){
 if(!pt82Collision(track,a,b))return null;
 const reset=r=>{
  const dir=r.driveDirection===-1?-1:1;
  const entering=r.entryLane??1-r.lane;
  const target=1-entering;
  const lane=track.lanes[dir===-1?1-target:target];
  // Reaparece después del cruce central, sobre su guía de destino.
  const progress=dir===1?.73:.27;
  const d=pt82PieceDistance(lane,track.laneChangerIndex,progress);
  return{...r,lane:target,pieceIndex:track.laneChangerIndex,
   pieceT:progress,distance:dir===1?d:(lane.total-d)%lane.total,
   speed:0,penalty:3,collidedPT82:true,x350Armed:false};
 };
 return[reset(a),reset(b)];
}
export function countPieces(types){
  return Object.fromEntries(Object.keys(CATALOG).map(id=>[id,types.filter(t=>t===id).length]));
}

// Reparación global sin tocar la geometría de los módulos.
// El buscador antiguo sólo sustituía hasta tres piezas DEL FINAL. Para una
// separación pequeña originada mucho antes, eso no puede funcionar.
// Comprobamos una o dos sustituciones EN CUALQUIER POSICIÓN antes de intentar
// añadir piezas. Las que parecen cerrar se validan con todas las colisiones.
function findGlobalReplacements(types,{maxStates=24000,origin=START}={}){
 const ids=Object.keys(CATALOG).filter(id=>!CATALOG[id].legacy&&!CATALOG[id].laneChanger),used=countPieces(types);
 let tested=0,nearest={gap:Infinity,changes:[]};
 const base=buildTrack(types,origin);
 if(base.gap<nearest.gap)nearest={gap:base.gap,changes:[]};
 const angleOf=id=>CATALOG[id].angle||0;
 const changesAt=(at,to)=>({index:at,from:types[at],to});
 const candidate=types.slice();
 function evaluate(changes){
  if(++tested>maxStates)return null;
  let pose={...origin};
  for(const id of candidate)pose=positionOnPiece(pose,id,1);
  const heading=Math.abs(norm(pose.h-origin.h));
  if(heading>SNAP_RAD)return null;
  const gap=hypot(pose.x-origin.x,pose.y-origin.y);
  if(gap<nearest.gap-.01)nearest={gap,changes:changes.map(c=>({...c}))};
  if(gap>SNAP_MM)return null;
  const built=buildTrack(candidate,origin);
  if(!built.valid)return null;
  return{ok:true,types:candidate.slice(),replaced:changes.length,added:0,
   changes:changes.map(c=>({...c})),unchanged:false};
 }
 for(let i=0;i<types.length;i++){
  const fromI=types[i];
  if(CATALOG[fromI].laneChanger)continue;
  for(const toI of ids){
   if(toI===fromI||used[toI]>=stockLimit(toI))continue;
   candidate[i]=toI;
   const found=evaluate([changesAt(i,toI)]);
   candidate[i]=fromI;
   if(found)return {...found,searched:tested};
  }
 }
 // Los dos cambios se exploran en cualquier zona del circuito, no sólo
 // contiguos al cierre. Una comparación de ángulos evita combinaciones
 // que nunca pueden recuperar la orientación del conector.
 for(let i=0;i<types.length;i++){
  const fromI=types[i];
  if(CATALOG[fromI].laneChanger)continue;
  for(const toI of ids){
   if(toI===fromI)continue;
   if(used[toI]>=stockLimit(toI))continue;
   candidate[i]=toI;
   for(let j=i+1;j<types.length;j++){
    const fromJ=types[j];
    for(const toJ of ids){
     if(toJ===fromJ)continue;
     const available=stockLimit(toJ)-used[toJ]-(toJ===toI?1:0)
       +(toJ===fromI?1:0);
     if(available<=0)continue;
     // Un cambio de radio conserva el giro. Dos cambios opuestos
     // de sentido pueden compensarse si el rumbo final lo permite.
     const revisedHeading=norm(base.ends.end.h-origin.h+
       angleOf(toI)-angleOf(fromI)+angleOf(toJ)-angleOf(fromJ));
     if(Math.abs(revisedHeading)>SNAP_RAD)continue;
     candidate[j]=toJ;
     const found=evaluate([changesAt(i,toI),changesAt(j,toJ)]);
     candidate[j]=fromJ;
     if(found)return {...found,searched:tested};
     if(tested>=maxStates)break;
    }
    if(tested>=maxStates)break;
   }
   candidate[i]=fromI;
   if(tested>=maxStates)break;
  }
  if(tested>=maxStates)break;
 }
 return{ok:false,nearest,limited:tested>=maxStates,searched:tested};
}

// Ajuste por DIFERENCIAS de longitudes reales: 87,5 - 75 = 12,5 mm.
// Nunca introduce una pieza de 12,5 mm: sustituye como máximo dos
// rectas ya presentes y valida el cierre completo antes de aceptarlo.
// Sólo sirve cuando los vectores de desplazamiento de las sustituciones
// corrigen exactamente la separación. No fuerza ángulos ni conectores.
export function findStraightRebalance(types,{
 origin=START,raisedParts=[],maxChanges=2
}={}){
 if(!allowed(types)||types.length<4)return{ok:false,reason:"Tramo insuficiente"};
 const base=buildTrack(types,origin,raisedParts);
 if(base.valid)return{ok:true,types:[...types],unchanged:true,replaced:0,added:0};
 if(base.headingGap>1e-8)
  return{ok:false,reason:"Las rectas no pueden corregir una diferencia de ángulo"};
 const dx=origin.x-base.ends.end.x,dy=origin.y-base.ends.end.y;
 if(hypot(dx,dy)<1e-6)
  return{ok:false,reason:"La separación no es longitudinal; revisa el cruce o el puente"};
 const ids=Object.keys(CATALOG).filter(id=>!CATALOG[id].legacy&&id!=="START350"&&!CATALOG[id].laneChanger&&CATALOG[id].length);
 const options=[];
 for(const part of base.parts){
  const initial=CATALOG[part.id];
  if(!initial?.length||part.id==="START350"||initial.laneChanger)continue;
  for(const to of ids){
   if(to===part.id)continue;
   const delta=CATALOG[to].length-initial.length;
   options.push({index:part.index,from:part.id,to,delta,
    dx:Math.cos(part.start.h)*delta,dy:Math.sin(part.start.h)*delta});
  }
 }
 const matches=(x,y)=>hypot(dx-x,dy-y)<1e-6;
 const evaluate=changes=>{
  const next=[...types];
  for(const c of changes)next[c.index]=c.to;
  const built=buildTrack(next,origin,raisedParts);
  return built.valid?{
   ok:true,types:next,replaced:changes.length,added:0,
   changes:changes.map(({index,from,to,delta})=>({index,from,to,delta})),
   unchanged:false,rebalanced:true
  }:null;
 };
 if(maxChanges>=1)for(const a of options)
  if(matches(a.dx,a.dy)){
   const result=evaluate([a]);if(result)return result;
  }
 if(maxChanges>=2)for(let i=0;i<options.length;i++){
  const a=options[i];
  for(let j=i+1;j<options.length;j++){
   const b=options[j];
   if(a.index===b.index||!matches(a.dx+b.dx,a.dy+b.dy))continue;
   const result=evaluate([a,b]);if(result)return result;
  }
 }
 return{ok:false,reason:"No hay sustitución exacta de una o dos rectas que cierre el trazado"};
}
// Busca un cierre utilizando sólo módulos que existan realmente en el inventario.
// Prioriza conservar la mayor parte posible del circuito; comprueba cruces antes
// de proponer un resultado. No crea piezas de transición deformadas.
export function findLegalClosure(types,{maxReplace=3,maxAdd=5,maxStates=120000,origin=START,raisedParts=[]}={}){
  if(!allowed(types))return{ok:false,reason:"Inventario no válido"};
  const current=buildTrack(types,origin,raisedParts);
  if(current.valid)return{ok:true,types:[...types],replaced:0,added:0,unchanged:true};
  // Antes de añadir módulos o explorar cambios arbitrarios, probar
  // compensaciones matemáticas entre rectas de tamaño comercial.
  const balanced=findStraightRebalance(types,{origin,raisedParts});
  if(balanced.ok)return balanced;
  // Caso proporcional: los conectores se enfrentan, no tienen desfase
  // lateral ni angular, y el avance exacto se expresa en unidades de 12,5.
  // En ese caso la solución más corta sale por programación dinámica,
  // evitando una búsqueda combinatoria innecesaria.
  if(types.length>=3){
   const gap=measureGap(current.ends.end,origin,CATALOG);
   if(gap.problem==="composition"&&gap.exact){
    const fill=composeStraightDistance(gap.forward,CATALOG,GEOMETRY.lengthUnit);
    if(fill&&fill.count<=maxAdd){
     const next=[...types,...fill.ids];
     if(buildTrack(next,origin).valid)
      return{ok:true,types:next,replaced:0,added:fill.count,
       unchanged:false,modular:true};
    }
   }
  }
  // Primero intentar añadir UNA pieza al extremo: conserva intacto el montaje.
  // Evita sustituir dos tramos cuando sólo faltaba la última curva.
  for(const id of Object.keys(CATALOG).filter(id=>!CATALOG[id].legacy&&!CATALOG[id].laneChanger)){
   const candidate=[...types,id];
   if(!allowed(candidate))continue;
   if(buildTrack(candidate,origin).valid)
    return{ok:true,types:candidate,replaced:0,added:1,unchanged:false};
  }
  // Si no basta una adición, buscar sustituciones en cualquier punto.
  const global=findGlobalReplacements(types,{maxStates:24000,origin});
  if(global.ok)return global;
  const ids=Object.keys(CATALOG).filter(id=>!CATALOG[id].legacy&&!CATALOG[id].laneChanger),target=origin;
  let visits=0;
  // Cuanto menos se edita, antes se evalúa. Así no se rehace el circuito arbitrariamente.
  for(let cost=1;cost<=maxReplace+maxAdd;cost++){
    for(let replace=0;replace<=Math.min(maxReplace,cost,types.length);replace++){
      const add=cost; // costes: quitar un tramo + añadir otros
      const inserted=cost-replace;
      if(inserted>maxAdd||inserted<1)continue;
      const prefix=types.slice(0,types.length-replace);
      const counts={};
      for(const id of prefix)counts[id]=(counts[id]||0)+1;
      const startingPose=buildTrack(prefix,origin).ends.end;
      const proposed=[];
      function recurse(pose,remaining){
        if(++visits>maxStates)return null;
        if(remaining===0){
          const gap=hypot(pose.x-target.x,pose.y-target.y);
          const headingGap=Math.abs(norm(pose.h-target.h));
          if(gap>SNAP_MM||headingGap>SNAP_RAD)return null;
          const guess=[...prefix,...proposed];
          if(guess.length<4)return null;
          const built=buildTrack(guess,origin);
          return built.valid?{ok:true,types:guess,replaced:replace,added:inserted,unchanged:false}:null;
        }
        if(hypot(pose.x-target.x,pose.y-target.y)>remaining*600+SNAP_MM)return null;
        for(const id of ids){
          if((counts[id]||0)>=stockLimit(id))continue;
          counts[id]=(counts[id]||0)+1;proposed.push(id);
          const next=positionOnPiece(pose,id,1);
          const found=recurse(next,remaining-1);
          proposed.pop();counts[id]--;
          if(found)return found;
          if(visits>maxStates)return null;
        }
        return null;
      }
      const result=recurse(startingPose,inserted);
      if(result)return result;
      if(visits>maxStates)return{ok:false,reason:"La búsqueda del cierre agotó sus combinaciones; no se ha deformado ninguna pieza.",limited:true,global};
    }
  }
  return{ok:false,reason:current.intersection?
    "Hay un cruce plano: el juego no puede cerrarlo como circuito válido sin puente.":
    "No se encontró un cierre exacto cambiando hasta dos piezas en cualquier punto ni añadiendo hasta cinco piezas al final. Hace falta modificar más el trazado.",
    global};
}
