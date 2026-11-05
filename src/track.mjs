// SlotRace DEV 0.9.0 · Geometría modular PT-Precision: radios y rectas exactos.
// Catálogo virtual experimental; no se afirma compatibilidad física entre sistemas.
import {GEOMETRY,RADII,PARTS,RECIPES} from "./pt-precision.mjs";
import {analyzeOpenEnds,gapExplanation} from "./gap-analysis.mjs";
export const gapAnalysis=Object.freeze({analyzeOpenEnds,gapExplanation});
export const TABLE=Object.freeze({width:2200,height:1450,edge:62});
export const START=Object.freeze({x:750,y:325,h:0});
export const TRACK_WIDTH=GEOMETRY.trackWidth;
export const LANE_OFFSET=GEOMETRY.laneOffset;
export const VIRTUAL_R2_RADIUS=RADII.R2;
export const VIRTUAL_R1_RADIUS=RADII.R1;
export const CATALOG=Object.freeze(Object.fromEntries(
 Object.entries(PARTS).map(([id,s])=>[id,Object.freeze({
  name:s.name,code:s.reference,
  ...(s.kind==="straight"?{length:s.length}:{radius:s.radius,angle:s.angle}),
  stock:s.kind==="straight"?8:12,group:s.kind==="straight"?"recta":"curva",
  virtualMicroAdapter:Boolean(s.virtualMicroAdapter),
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
   const at={a:i,b:j,x:p.x+t*ax,y:p.y+t*ay};
   if(!found.some(c=>c.a===i&&c.b===j&&hypot(c.x-at.x,c.y-at.y)<.01))
    found.push(at);
  }
 }
 return found;
}
// La elevación debe verse durante el montaje aunque aún no se haya cerrado
// el circuito; cerrar el trazado sigue siendo requisito independiente para correr.
function manualBridge(parts,crossings,raisedParts,closed){
 if(!crossings.length)return null;
 const raised=[...new Set(raisedParts)].filter(i=>Number.isInteger(i)&&i>=0&&i<parts.length);
 if(raised.length!==1)return null; // Un tramo elevado por kit en esta fase.
 const index=raised[0],piece=parts[index],spec=CATALOG[piece.id];
 if(!spec?.length||spec.length<350)return null;
 const matches=crossings.filter(c=>c.a===index||c.b===index);
 if(matches.length!==crossings.length||matches.length!==1)return null;
 const c=matches[0],at=positionOnPiece(piece.start,piece.id,0);
 const progress=(c.x-at.x)*Math.cos(at.h)+(c.y-at.y)*Math.sin(at.h);
 // Las rampas y los soportes requieren un tramo recto suficiente a cada lado.
 if(progress<90||progress>spec.length-90)return null;
 return{height:BRIDGE_HEIGHT_MM,overParts:[index],
  underParts:[c.a===index?c.b:c.a],supports:[index],virtual:false,
  crossing:{x:c.x,y:c.y},ramps:true};
}
function laneData(points,side){
  const nodes=points.map(p=>({...p,x:p.x-Math.sin(p.h)*side,y:p.y+Math.cos(p.h)*side}));
  let total=0;const lengths=[0];
  for(let i=1;i<nodes.length;i++){total+=hypot(nodes[i].x-nodes[i-1].x,nodes[i].y-nodes[i-1].y);lengths.push(total);}
  return{nodes,lengths,total};
}
export function buildTrack(types,origin=START,raisedParts=[]){
  if(!Array.isArray(types)||types.some(t=>!CATALOG[t]))throw Error("Catálogo inválido");
  let pose={...origin},points=[{...origin,curve:0,radius:Infinity,pieceIndex:-1}],parts=[];
  for(const [index,id] of types.entries()){
    const start={...pose},spec=CATALOG[id],n=spec.length?7:20,section=[];
    for(let k=0;k<=n;k++){const p=positionOnPiece(start,id,k/n);section.push({...p,pieceIndex:index});if(k>0)points.push({...p,pieceIndex:index});}
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
  // Puente inicial incluido en la receta o kit de elevación colocado
  // sobre una recta suficientemente larga. Sin soporte, cruce no validado.
  const automatic=closed&&intersection&&hasAutomaticEightBridge(types);
  // Si el jugador instala un kit, tiene prioridad sobre el puente de demo.
  const manual=manualBridge(parts,crossings,raisedParts,closed);
  const bridge=manual||(automatic?
   {height:BRIDGE_HEIGHT_MM,overParts:[7],underParts:[0],supports:[7],
    crossing:{x:crossings[0].x,y:crossings[0].y},ramps:true,virtual:true}:null);
  const lanes=[laneData(points,-LANE_OFFSET),laneData(points,LANE_OFFSET)];
  return{parts,types:[...types],points,lanes,closed,onTable,intersection,crossings,bridge,
    valid:closed&&onTable&&(!intersection||Boolean(bridge)),
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
  const dx=b.x-a.x,dy=b.y-a.y;
  return{x:a.x+dx*fraction,y:a.y+dy*fraction,h:Math.atan2(dy,dx),
    // El tramo activo es el del extremo B del segmento muestreado.
    // Antes se heredaba la curva del extremo A al entrar en una recta
    // (b.curve || a.curve), produciendo salidas "dentro" de una recta.
    curve:b.curve,radius:b.radius,
    // Necesario para saber si el coche circula bajo el puente o sobre él.
    // El tramo se asigna por el segmento de trayectoria, no por la
    // proximidad visual al cruce: dos vías superpuestas son distintas.
    pieceIndex:b.pieceIndex};
}
export function carTrackLevel(track,pose){
 // El nivel se determina por la pieza del recorrido, no por las coordenadas
 // X/Y: en el cruce ambos carriles pueden ocupar la misma proyección.
 return track?.bridge?.overParts?.includes(pose?.pieceIndex)?"upper":"lower";
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
export function countPieces(types){
  return Object.fromEntries(Object.keys(CATALOG).map(id=>[id,types.filter(t=>t===id).length]));
}

// Reparación global sin tocar la geometría de los módulos.
// El buscador antiguo sólo sustituía hasta tres piezas DEL FINAL. Para una
// separación pequeña originada mucho antes, eso no puede funcionar.
// Comprobamos una o dos sustituciones EN CUALQUIER POSICIÓN antes de intentar
// añadir piezas. Las que parecen cerrar se validan con todas las colisiones.
function findGlobalReplacements(types,{maxStates=24000,origin=START}={}){
 const ids=Object.keys(CATALOG),used=countPieces(types);
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

// Busca un cierre utilizando sólo módulos que existan realmente en el inventario.
// Prioriza conservar la mayor parte posible del circuito; comprueba cruces antes
// de proponer un resultado. No crea piezas de transición deformadas.
export function findLegalClosure(types,{maxReplace=3,maxAdd=5,maxStates=120000,origin=START}={}){
  if(!allowed(types))return{ok:false,reason:"Inventario no válido"};
  const current=buildTrack(types,origin);
  if(current.valid)return{ok:true,types:[...types],replaced:0,added:0,unchanged:true};
  // Primero intentar añadir UNA pieza al extremo: conserva intacto el montaje.
  // Evita sustituir dos tramos cuando sólo faltaba la última curva.
  for(const id of Object.keys(CATALOG)){
   const candidate=[...types,id];
   if(!allowed(candidate))continue;
   if(buildTrack(candidate,origin).valid)
    return{ok:true,types:candidate,replaced:0,added:1,unchanged:false};
  }
  // Si no basta una adición, buscar sustituciones en cualquier punto.
  const global=findGlobalReplacements(types,{maxStates:24000,origin});
  if(global.ok)return global;
  const ids=Object.keys(CATALOG),target=origin;
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
        if(hypot(pose.x-target.x,pose.y-target.y)>remaining*584+SNAP_MM)return null;
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
