// Escapatorias automáticas de frenada para SlotRace.
// Solo geometría decorativa: no cambia carriles, colisiones ni recetas.
// Se genera por circuito y sentido de carrera, jamás por fotograma.
import {CATALOG,TRACK_WIDTH} from "./track.mjs";

export const RUNOFF_STYLE=Object.freeze({
 color:"#51986b",border:"#b3d89d",
 // Escapatoria tras recta: R1 >= 350 mm, R2 >= 600 mm.
 R1:Object.freeze({minStraight:350,width:92,maxTurn:110}),
 R2:Object.freeze({minStraight:600,width:72,maxTurn:90}),
 innerOffset:TRACK_WIDTH/2+2,
 sampleMm:18,
 clearanceMm:14
});
const EPS=1e-7;
const specFor=part=>CATALOG[part?.id];
const partLength=part=>specFor(part)?.length||0;
const isTightCurve=part=>Boolean(specFor(part)?.angle&&
 ["R1","R2"].includes(specFor(part)?.radiusId));

function inOrder(track,i,step){
 const n=track.parts.length;
 const next=i+step;
 return next>=0&&next<n?next:track.closed?((next%n)+n)%n:-1;
}
function precedingStraight(track,index,direction){
 let length=0,i=inOrder(track,index,-direction);
 for(let seen=0;seen<track.parts.length&&i>=0;seen++){
  const current=partLength(track.parts[i]);
  if(!current)break;
  // Una rampa o plataforma interrumpe la zona de frenada decorada.
  if(track.elevation?.profiles?.[i])return 0;
  length+=current;
  if(length>=1200)break;
  i=inOrder(track,i,-direction);
 }
 return length;
}
// Los puntos de buildTrack ya incluyen cualquier reparto de flexión.
function pointOnPart(part,t){
 const pts=part.points;
 const n=pts.length-1,u=Math.max(0,Math.min(1,t))*n;
 const i=Math.min(n-1,Math.floor(u)),f=u-i,a=pts[i],b=pts[i+1];
 return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,
  h:a.h+(b.h-a.h)*f};
}
function shifted(p,side,offset){
 return{x:p.x-Math.sin(p.h)*side*offset,
  y:p.y+Math.cos(p.h)*side*offset};
}
function collectTurn(track,index,direction,turnLimit){
 const n=track.parts.length,sections=[],indices=new Set();
 const first=specFor(track.parts[index]);
 let i=index,remaining=turnLimit*Math.PI/180;
 for(let used=0;used<n&&i>=0&&remaining>EPS;used++){
  const part=track.parts[i],spec=specFor(part);
  if(!isTightCurve(part)||Math.sign(spec.angle)!==Math.sign(first.angle))break;
  if(track.elevation?.profiles?.[i])return null;
  const span=Math.min(Math.abs(spec.angle),remaining);
  const portion=span/Math.abs(spec.angle);
  sections.push({part,index:i,span,length:span*spec.radius,portion});
  indices.add(i);
  remaining-=span;
  if(span<Math.abs(spec.angle)-EPS)break;
  i=inOrder(track,i,direction);
 }
 return sections.length?{sections,indices,side:-Math.sign(first.angle)}:null;
}
function samplesFor(turn,direction){
 const length=turn.sections.reduce((s,x)=>s+x.length,0);
 const out=[],width=turn.sections[0].part?
  RUNOFF_STYLE[specFor(turn.sections[0].part).radiusId].width:0;
 let travelled=0;
 for(const section of turn.sections){
  const count=Math.max(4,Math.ceil(section.length/RUNOFF_STYLE.sampleMm));
  for(let k=0;k<=count;k++){
   if(out.length&&k===0)continue;
   const f=k/count,partial=section.length*f;
   const t=direction===1?section.portion*f:1-section.portion*f;
   const p=pointOnPart(section.part,t);
   const progress=(travelled+partial)/length;
   // Se estrecha al comienzo y al final: forma de lágrima, no una
   // franja enorme alrededor de toda la curva.
   const strength=Math.pow(Math.max(0,Math.sin(Math.PI*progress)),.8);
   out.push({...p,progress,strength});
  }
  travelled+=section.length;
 }
 return{points:out,width};
}
function polygonFor(samples,side,width){
 const inner=samples.map(p=>shifted(p,side,RUNOFF_STYLE.innerOffset));
 const outer=samples.map(p=>shifted(p,side,
  RUNOFF_STYLE.innerOffset+width*p.strength));
 return{points:[...inner,...outer.slice().reverse()],outerEdge:outer};
}
function distanceToSegmentSquared(p,a,b){
 const dx=b.x-a.x,dy=b.y-a.y;
 const len2=dx*dx+dy*dy||1;
 const t=Math.min(1,Math.max(0,((p.x-a.x)*dx+(p.y-a.y)*dy)/len2));
 const x=a.x+dx*t,y=a.y+dy*t;
 return(p.x-x)**2+(p.y-y)**2;
}
function occupiedSegments(track,ignored){
 const blocked=[];
 for(const part of track.parts){
  if(ignored.has(part.index))continue;
  const elevated=Boolean(track.elevation?.profiles?.[part.index]);
  const clearance=TRACK_WIDTH/2+RUNOFF_STYLE.clearanceMm+(elevated?25:0);
  for(let i=1;i<part.points.length;i++){
   blocked.push({a:part.points[i-1],b:part.points[i],
    distanceSquared:clearance*clearance});
  }
 }
 return blocked;
}
function hasRoom(samples,side,width,obstacles){
 // Examinar también el centro de cada banda, no solo su contorno.
 for(const p of samples){
  for(const fraction of [.28,.65,1]){
   const q=shifted(p,side,RUNOFF_STYLE.innerOffset+
    width*p.strength*fraction);
   for(const line of obstacles)
    if(distanceToSegmentSquared(q,line.a,line.b)<line.distanceSquared)
     return false;
  }
 }
 return true;
}
function ignoreConnected(track,start,direction,run){
 const ignore=new Set(run.indices),end=run.sections.at(-1).index;
 // Los conectores de entrada/salida se tocan necesariamente con la
 // escapatoria en sus puntas. No deben provocar falsos positivos.
 const before=inOrder(track,start,-direction);
 const after=inOrder(track,end,direction);
 if(before>=0)ignore.add(before);
 if(after>=0)ignore.add(after);
 return ignore;
}

export function buildSmartRunoffs(track,direction=1){
 const runoffs=[];
 if(!track?.parts?.length)return runoffs;
 const step=direction===-1?-1:1;
 for(let index=0;index<track.parts.length;index++){
  const part=track.parts[index],spec=specFor(part);
  if(!isTightCurve(part)||track.elevation?.profiles?.[index])continue;
  const rule=RUNOFF_STYLE[spec.radiusId];
  const prev=inOrder(track,index,-step);
  if(prev<0||!partLength(track.parts[prev]))continue;
  const approach=precedingStraight(track,index,step);
  if(approach<rule.minStraight)continue;
  const turn=collectTurn(track,index,step,rule.maxTurn);
  if(!turn)continue;
  const {points,width}=samplesFor(turn,step);
  const obstacles=occupiedSegments(track,ignoreConnected(track,index,step,turn));
  // Adaptación a espacios ajustados: estrechar o eliminar, jamás pisar
  // otra vía. Las piezas del circuito tienen siempre prioridad visual.
  const chosen=[width,width*.7].find(candidate=>
   hasRoom(points,turn.side,candidate,obstacles));
  if(chosen===undefined)continue;
  runoffs.push({...polygonFor(points,turn.side,chosen),
   entryIndex:index,approachMm:approach,
   direction:step,side:turn.side,width:chosen,
   pieceIndices:[...turn.indices]});
 }
 return runoffs;
}
