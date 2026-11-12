// Búsqueda geométrica bidireccional de cierre por conectores (mm/radianes).
// Busca piezas reales desde ambos extremos; sólo propone una solución cuando
// buildTrack confirma el cierre, la altura y los cruces.
// No compra nada ni cambia la pista durante el cálculo.
const PI8=Math.PI/8,TAU=Math.PI*2,CELL=10;
const turn=a=>Math.atan2(Math.sin(a),Math.cos(a));
const head=(p,origin)=>((Math.round(turn(p.h-origin.h)/PI8)%16)+16)%16;
const key=(h,x,y)=>h+"|"+x+"|"+y;
const cell=p=>[Math.floor(p.x/CELL),Math.floor(p.y/CELL)];
function reversePiece(p,id,catalog){
 const spec=catalog[id],h=p.h-(spec.angle||0);
 if(spec.length)return{x:p.x-Math.cos(h)*spec.length,y:p.y-Math.sin(h)*spec.length,h};
 const r=spec.radius*Math.sign(spec.angle);
 return{x:p.x-r*(Math.sin(p.h)-Math.sin(h)),
  y:p.y+r*(Math.cos(p.h)-Math.cos(h)),h};
}
function nextPiece(p,id,catalog){
 const spec=catalog[id];
 if(spec.length)return{x:p.x+Math.cos(p.h)*spec.length,
  y:p.y+Math.sin(p.h)*spec.length,h:p.h};
 const h=p.h+spec.angle,r=spec.radius*Math.sign(spec.angle);
 return{x:p.x+r*(Math.sin(h)-Math.sin(p.h)),
  y:p.y-r*(Math.cos(h)-Math.cos(p.h)),h};
}
function layersAt(pose,ids,depth,catalog,backward,origin,stats){
 const levels=[[{pose,seq:[],finish:0}]];
 for(let n=1;n<=depth;n++){
  const out=[];
  for(const old of levels[n-1]){
   for(const id of ids){
    const next=backward?reversePiece(old.pose,id,catalog):nextPiece(old.pose,id,catalog);
    out.push({pose:next,seq:[...old.seq,id],finish:old.finish+(id==="START350"?1:0)});
    stats.generated++;
   }
  }
  levels.push(out);
 }
 return levels;
}
function collectKeys(layer,origin){
 const map=new Map();
 for(const state of layer){
  const [x,y]=cell(state.pose),k=key(head(state.pose,origin),x,y);
  if(!map.has(k))map.set(k,[]);
  map.get(k).push(state);
 }
 return map;
}
function validateCandidate(types,origin,raised,build){
 const first=build(types,origin,raised);
 if(first.valid)return{geometry:first,raisedParts:raised};
 // Si el obstáculo es exclusivamente una intersección sin altura,
 // probar elevar una de las dos piezas cruzadas, sin deformarlas.
 if(!first.closed||!first.crossings?.length||raised.length||
  first.crossings.length>2)return null;
 const indices=[...new Set(first.crossings.flatMap(c=>[c.a,c.b]))];
 for(const index of indices){
  const attempt=build(types,origin,[index]);
  if(attempt.valid)return{geometry:attempt,raisedParts:[index]};
 }
 return null;
}
function getPieceIds(catalog,seed,available,prices){
 const existingFinish=seed.includes("START350");
 return Object.keys(catalog)
  .filter(id=>!catalog[id].legacy&&!catalog[id].laneChanger&&
   (!existingFinish||id!=="START350"))
  .sort((a,b)=>{
   const as=available===null?0:(available[a]>0?0:1);
   const bs=available===null?0:(available[b]>0?0:1);
   return as-bs||(prices[a]??999)-(prices[b]??999)||a.localeCompare(b);
  });
}
function checkOne(prefix,suffix,origin,raisedParts,build,accept,stats){
 const next=[...prefix,...suffix];
 if(next.filter(x=>x==="START350").length!==1)return null;
 if(next.length<4||!accept(next))return null;
 if(stats.checked++>=1200)return null;
 const valid=validateCandidate(next,origin,raisedParts,build);
 if(!valid)return null;
 return{ok:true,types:next,geometry:valid.geometry,
  raisedParts:valid.raisedParts};
}
// Reemplazar a lo sumo 3 piezas del extremo de la construcción; el resto
// permanece intacto. Hasta 6 piezas añadidas se exploran con MITM (3 + 3).
export function findBidirectionalClosure(types,{
 origin,raisedParts=[],build,catalog,available=null,prices={},
 accept=()=>true,maxAppend=6,maxTailReplace=3,maxGenerated=250000
}={}){
 if(!Array.isArray(types)||types.length<4||!origin||!catalog||!build)
  return{ok:false,reason:"No hay suficientes conectores para calcular el cierre."};
 const stats={generated:0,checked:0,limited:false};
 const ids=getPieceIds(catalog,types,available,prices);
 const reverse=layersAt(origin,ids,Math.min(3,Math.ceil(maxAppend/2)),
  catalog,true,origin,stats);
 const revMaps=reverse.map(layer=>collectKeys(layer,origin));
 for(let replace=0;replace<=Math.min(maxTailReplace,types.length-4);replace++){
  const prefix=types.slice(0,types.length-replace);
  if(prefix.some(id=>id==="X350")!==types.some(id=>id==="X350"))continue;
  const track=build(prefix,origin,[]);
  const start=track.ends.end;
  const forward=layersAt(start,ids,Math.min(3,Math.floor(maxAppend/2)),
   catalog,false,origin,stats);
  for(let count=0;count<=maxAppend;count++){
   const nF=Math.floor(count/2),nB=count-nF;
   if(nF>=forward.length||nB>=reverse.length)continue;
   const map=revMaps[nB];
   for(const from of forward[nF]){
    const [cx,cy]=cell(from.pose),angle=head(from.pose,origin);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
     const toStates=map.get(key(angle,cx+dx,cy+dy));
     if(!toStates)continue;
     for(const to of toStates){
      if(Math.hypot(from.pose.x-to.pose.x,from.pose.y-to.pose.y)>=10||
       Math.abs(turn(from.pose.h-to.pose.h))>Math.PI/180)continue;
      const suffix=[...from.seq,...to.seq.slice().reverse()];
      const result=checkOne(prefix,suffix,origin,
       raisedParts,build,accept,stats);
      if(result)return{...result,replaced:replace,added:count,
       diagnostics:{generated:stats.generated,checked:stats.checked,method:"bidirectional"}};
      if(stats.checked>=1200){stats.limited=true;break;}
     }
     if(stats.limited)break;
    }
    if(stats.limited)break;
   }
   if(stats.limited)break;
  }
  if(stats.limited||stats.generated>=maxGenerated)break;
 }
 return{ok:false,limited:stats.limited||stats.generated>=maxGenerated,
  reason:"Sin cierre válido en la búsqueda bidireccional. Puede ser necesario modificar más piezas o la altura del cruce.",
  diagnostics:{...stats,method:"bidirectional"}};
}
