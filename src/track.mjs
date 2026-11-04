// SlotRace LAB — geometría modular 2 carriles (milímetros virtuales).
// Referencias: pista de 156 mm, recta Sport 350/175 mm y curvas R2 45°.
// La compatibilidad física con fabricantes NO está certificada.
export const TABLE = Object.freeze({width:2200,height:1450,edge:62});
export const START = Object.freeze({x:750,y:325,h:0});
export const TRACK_WIDTH = 156;
export const LANE_OFFSET = 39;
// Los radios de ~370 mm (R2) y ~214 mm (R1) citados para pistas físicas
// se refieren al BORDE EXTERIOR, no al eje central del módulo de 156 mm.
// Calibración provisional de eje R2 para que 8 rectas de 350 mm y
// 5 curvas de +45° / 5 de -45° den un ocho matemáticamente exacto:
// R = 2 * L * (sqrt(2) - 1) = 289.94949366 mm.
// Esta calibración geométrica no certifica el radio de la pieza comercial.
export const VIRTUAL_R2_RADIUS=2*350*(Math.SQRT2-1);
export const VIRTUAL_R1_RADIUS=214-TRACK_WIDTH/2;
export const CATALOG = Object.freeze({
  S350:{name:"Recta larga",code:"350 mm",length:350,stock:8,group:"recta"},
  S175:{name:"Media recta",code:"175 mm",length:175,stock:4,group:"recta"},
  R2R:{name:"Curva R2 ↷",code:"45° derecha",radius:VIRTUAL_R2_RADIUS,angle:Math.PI/4,stock:12,group:"curva"},
  R2L:{name:"Curva R2 ↶",code:"45° izquierda",radius:VIRTUAL_R2_RADIUS,angle:-Math.PI/4,stock:12,group:"curva"},
  R1R:{name:"Curva R1 ↷",code:"45° cerrada",radius:VIRTUAL_R1_RADIUS,angle:Math.PI/4,stock:6,group:"curva"},
  R1L:{name:"Curva R1 ↶",code:"45° cerrada",radius:VIRTUAL_R1_RADIUS,angle:-Math.PI/4,stock:6,group:"curva"}
});
export const STARTER=Object.freeze(["S350","S350","R2R","R2R","R2R","R2R",
  "S350","S350","R2R","R2R","R2R","R2R"]);
// Dos diagonales de 4 rectas de 350 mm. El cruce cae entre la
// segunda y tercera pieza de cada diagonal, no en salida/meta.
export const FIGURE_EIGHT=Object.freeze([
 ...Array(4).fill("S350"),...Array(5).fill("R2R"),
 ...Array(4).fill("S350"),...Array(5).fill("R2L")
]);
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
export function allowed(types){
  const totals={};
  for(const id of types){if(!CATALOG[id])return false;totals[id]=(totals[id]||0)+1;if(totals[id]>CATALOG[id].stock)return false;}
  return types.length<=48;
}
export function freeStock(types,id){return Math.max(0,(CATALOG[id]?.stock||0)-types.filter(x=>x===id).length);}
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
function crossed(parts,closed){
  for(let i=0;i<parts.length;i++){
    for(let j=i+2;j<parts.length;j++){
      // Sólo omitimos el empalme entre el primer y último módulo si de verdad cerró.
      // Los cruces de una pista abierta también cuentan.
      if(closed&&i===0&&j===parts.length-1)continue;
      const a=parts[i].points,b=parts[j].points;
      for(let x=0;x<a.length-1;x++)for(let y=0;y<b.length-1;y++){
        if(lineIntersects(a[x],a[x+1],b[y],b[y+1]))return true;
      }
    }
  }
  return false;
}
function laneData(points,side){
  const nodes=points.map(p=>({...p,x:p.x-Math.sin(p.h)*side,y:p.y+Math.cos(p.h)*side}));
  let total=0;const lengths=[0];
  for(let i=1;i<nodes.length;i++){total+=hypot(nodes[i].x-nodes[i-1].x,nodes[i].y-nodes[i-1].y);lengths.push(total);}
  return{nodes,lengths,total};
}
export function buildTrack(types,origin=START){
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
  const intersection=crossed(parts,closed);
  // El ocho homologado de prueba tiene puente automático sobre la
  // segunda diagonal y soportes a ambos extremos. Nunca validamos
  // otros cruces planos por mera cercanía visual.
  const bridge=closed&&intersection&&hasAutomaticEightBridge(types)?
   {height:BRIDGE_HEIGHT_MM,overParts:[9,10,11,12],
    underParts:[0,1,2,3],supports:[9,12],virtual:true}:null;
  const lanes=[laneData(points,-LANE_OFFSET),laneData(points,LANE_OFFSET)];
  return{parts,types:[...types],points,lanes,closed,onTable,intersection,bridge,
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
function findGlobalReplacements(types,{maxStates=24000}={}){
 const ids=Object.keys(CATALOG),used=countPieces(types);
 let tested=0,nearest={gap:Infinity,changes:[]};
 const base=buildTrack(types);
 if(base.gap<nearest.gap)nearest={gap:base.gap,changes:[]};
 const angleOf=id=>CATALOG[id].angle||0;
 const changesAt=(at,to)=>({index:at,from:types[at],to});
 const candidate=types.slice();
 function evaluate(changes){
  if(++tested>maxStates)return null;
  let pose={...START};
  for(const id of candidate)pose=positionOnPiece(pose,id,1);
  const heading=Math.abs(norm(pose.h-START.h));
  if(heading>SNAP_RAD)return null;
  const gap=hypot(pose.x-START.x,pose.y-START.y);
  if(gap<nearest.gap-.01)nearest={gap,changes:changes.map(c=>({...c}))};
  if(gap>SNAP_MM)return null;
  const built=buildTrack(candidate);
  if(!built.valid)return null;
  return{ok:true,types:candidate.slice(),replaced:changes.length,added:0,
   changes:changes.map(c=>({...c})),unchanged:false};
 }
 for(let i=0;i<types.length;i++){
  const fromI=types[i];
  for(const toI of ids){
   if(toI===fromI||used[toI]>=CATALOG[toI].stock)continue;
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
   if(used[toI]>=CATALOG[toI].stock)continue;
   candidate[i]=toI;
   for(let j=i+1;j<types.length;j++){
    const fromJ=types[j];
    for(const toJ of ids){
     if(toJ===fromJ)continue;
     const available=CATALOG[toJ].stock-used[toJ]-(toJ===toI?1:0)
       +(toJ===fromI?1:0);
     if(available<=0)continue;
     // Un cambio de radio conserva el giro. Dos cambios opuestos
     // de sentido pueden compensarse si el rumbo final lo permite.
     const revisedHeading=norm(base.ends.end.h-START.h+
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
export function findLegalClosure(types,{maxReplace=3,maxAdd=5,maxStates=120000}={}){
  if(!allowed(types))return{ok:false,reason:"Inventario no válido"};
  const current=buildTrack(types);
  if(current.valid)return{ok:true,types:[...types],replaced:0,added:0,unchanged:true};
  // Primera oportunidad: reemplazos precisos lejos del último conector.
  // Importante para pistas largas con error acumulado de decenas de mm.
  const global=findGlobalReplacements(types,{maxStates:24000});
  if(global.ok)return global;
  const ids=Object.keys(CATALOG),target=START;
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
      const origin=buildTrack(prefix).ends.end;
      const proposed=[];
      function recurse(pose,remaining){
        if(++visits>maxStates)return null;
        if(remaining===0){
          const gap=hypot(pose.x-target.x,pose.y-target.y);
          const headingGap=Math.abs(norm(pose.h-target.h));
          if(gap>SNAP_MM||headingGap>SNAP_RAD)return null;
          const guess=[...prefix,...proposed];
          if(guess.length<4)return null;
          const built=buildTrack(guess);
          return built.valid?{ok:true,types:guess,replaced:replace,added:inserted,unchanged:false}:null;
        }
        if(hypot(pose.x-target.x,pose.y-target.y)>remaining*380+SNAP_MM)return null;
        for(const id of ids){
          if((counts[id]||0)>=CATALOG[id].stock)continue;
          counts[id]=(counts[id]||0)+1;proposed.push(id);
          const next=positionOnPiece(pose,id,1);
          const found=recurse(next,remaining-1);
          proposed.pop();counts[id]--;
          if(found)return found;
          if(visits>maxStates)return null;
        }
        return null;
      }
      const result=recurse(origin,inserted);
      if(result)return result;
      if(visits>maxStates)return{ok:false,reason:"La búsqueda del cierre agotó sus combinaciones; no se ha deformado ninguna pieza.",limited:true,global};
    }
  }
  return{ok:false,reason:current.intersection?
    "Hay un cruce plano: el juego no puede cerrarlo como circuito válido sin puente.":
    "No se encontró un cierre exacto cambiando hasta dos piezas en cualquier punto ni añadiendo hasta cinco piezas al final. Hace falta modificar más el trazado.",
    global};
}
