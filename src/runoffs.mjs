// Escapatorias de frenada: hombros de asfalto verde pegados al borde real.
// Geometría inmutable por circuito/sentido, sin alterar ni física ni recetas.
import {CATALOG,TRACK_WIDTH,TABLE} from "./track.mjs?v=0.15.13";

export const RUNOFF_STYLE=Object.freeze({
 // Verde asfalto apagado: sin los bordes claros que parecían pegatinas.
 color:"#386552",lip:"#527d64",border:"#2d594b",
 R1:Object.freeze({minStraight:350,width:68,maxTurn:110}),
 R2:Object.freeze({minStraight:600,width:52,maxTurn:90}),
 // El inicio se oculta bajo el canto del plástico (radio visual ~82 mm).
 innerOffset:TRACK_WIDTH/2-5,
 sampleMm:14,clearanceMm:12,
 minVisibleWidth:17,
 leadMm:44,exitMm:52,
 rimOffset:TRACK_WIDTH/2+6
});
const EPS=1e-7;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
const specFor=part=>CATALOG[part?.id];
const partLength=part=>specFor(part)?.length||0;
const isTightCurve=part=>Boolean(specFor(part)?.angle&&
 ["R1","R2"].includes(specFor(part)?.radiusId));

function inOrder(track,i,step){
 const n=track.parts.length,next=i+step;
 return next>=0&&next<n?next:track.closed?((next%n)+n)%n:-1;
}
function precedingStraight(track,index,direction){
 let length=0,i=inOrder(track,index,-direction);
 for(let seen=0;seen<track.parts.length&&i>=0;seen++){
  const current=partLength(track.parts[i]);
  if(!current)break;
  if(track.elevation?.profiles?.[i])return 0;
  length+=current;
  if(length>=1200)break;
  i=inOrder(track,i,-direction);
 }
 return length;
}
// Los puntos ya calculados conservan la flexión distribuida del circuito.
function pointOnPart(part,t){
 const pts=part.points,n=pts.length-1,u=clamp(t)*n;
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
// No más campana simétrica: crece pronto, mantiene una meseta alrededor
// del vértice y se pierde suavemente en la salida.
function shoulderProfile(u){
 if(u<.22)return smooth(u/.22);
 if(u<.65)return 1;
 return smooth((1-u)/.35);
}
function samplesFor(track,turn,index,direction){
 const before=inOrder(track,index,-direction);
 const end=turn.sections.at(-1).index;
 const after=inOrder(track,end,direction);
 const beforePart=before>=0?track.parts[before]:null;
 const afterPart=after>=0?track.parts[after]:null;
 const lead=beforePart&&partLength(beforePart)&&!track.elevation?.profiles?.[before]?
  Math.min(RUNOFF_STYLE.leadMm,partLength(beforePart)*.22):0;
 const exit=afterPart&&partLength(afterPart)&&!track.elevation?.profiles?.[after]?
  Math.min(RUNOFF_STYLE.exitMm,partLength(afterPart)*.22):0;
 const turnLength=turn.sections.reduce((sum,section)=>sum+section.length,0);
 const total=Math.max(1,lead+turnLength+exit),out=[];
 let travelled=0;
 function append(part,from,to,length){
  if(length<=EPS)return;
  const count=Math.max(3,Math.ceil(length/RUNOFF_STYLE.sampleMm));
  for(let k=0;k<=count;k++){
   if(out.length&&k===0)continue;
   const f=k/count,p=pointOnPart(part,from+(to-from)*f);
   const progress=clamp((travelled+length*f)/total);
   out.push({...p,progress,strength:shoulderProfile(progress)});
  }
  travelled+=length;
 }
 if(lead){
  const f=lead/partLength(beforePart);
  append(beforePart,direction===1?1-f:f,direction===1?1:0,lead);
 }
 for(const section of turn.sections){
  append(section.part,direction===1?0:1,
   direction===1?section.portion:1-section.portion,section.length);
 }
 if(exit){
  const f=exit/partLength(afterPart);
  append(afterPart,direction===1?0:1,direction===1?f:1-f,exit);
 }
 // Si el arco no tiene tramo de entrada, el primer punto sigue en 0.
 return out;
}
function polygonFor(samples,side,widths){
 const inner=samples.map(p=>shifted(p,side,RUNOFF_STYLE.innerOffset));
 const outer=samples.map((p,i)=>shifted(p,side,
  RUNOFF_STYLE.innerOffset+widths[i]));
 const lip=samples.map((p,i)=>shifted(p,side,
  RUNOFF_STYLE.innerOffset+Math.min(24,widths[i])));
 return{
  points:[...inner,...outer.slice().reverse()],
  lipPoints:[...inner,...lip.slice().reverse()],
  innerEdge:inner,outerEdge:outer
 };
}
function distanceToSegmentSquared(p,a,b){
 const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy||1;
 const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/len2);
 const x=a.x+dx*t,y=a.y+dy*t;
 return(p.x-x)**2+(p.y-y)**2;
}
function occupiedSegments(track,ignored){
 const blocked=[];
 for(const part of track.parts){
  if(ignored.has(part.index))continue;
  const elevated=Boolean(track.elevation?.profiles?.[part.index]);
  const clearance=TRACK_WIDTH/2+RUNOFF_STYLE.clearanceMm+(elevated?25:0);
  for(let i=1;i<part.points.length;i++)
   blocked.push({a:part.points[i-1],b:part.points[i],
    distanceSquared:clearance*clearance});
 }
 return blocked;
}
function ignoreConnected(track,start,direction,run){
 const ignored=new Set(run.indices),end=run.sections.at(-1).index;
 const before=inOrder(track,start,-direction);
 const after=inOrder(track,end,direction);
 if(before>=0)ignored.add(before);
 if(after>=0)ignored.add(after);
 return ignored;
}
function feltBounds(board){
 if(!board||![board.left,board.top,board.right,board.bottom].every(Number.isFinite))
  return null;
 const w=board.right-board.left,h=board.bottom-board.top;
 // Mismo marco interior de 62 unidades que dibuja drawTableArtwork,
 // escalado a la mesa real del circuito.
 const ix=62*w/TABLE.width+10,iy=62*h/TABLE.height+10;
 return{left:board.left+ix,right:board.right-ix,
  top:board.top+iy,bottom:board.bottom-iy};
}
function pointFree(p,side,width,obstacles,bounds){
 const outer=RUNOFF_STYLE.innerOffset+width;
 // Todo el hombro visible debe estar libre, no solo el borde final.
 const start=RUNOFF_STYLE.rimOffset;
 if(outer<=start)return true;
 for(const fraction of [.3,.65,1]){
  const q=shifted(p,side,start+(outer-start)*fraction);
  if(bounds&&(q.x<bounds.left||q.x>bounds.right||
   q.y<bounds.top||q.y>bounds.bottom))return false;
  for(const line of obstacles)
   if(distanceToSegmentSquared(q,line.a,line.b)<line.distanceSquared)
    return false;
 }
 return true;
}
// El espacio disponible cambia a lo largo del arco. Calculamos un ancho
// por muestra, no reducimos la zona entera a un óvalo más pequeño.
function fitWidths(samples,side,desired,obstacles,bounds){
 const widths=samples.map(p=>{
  const limit=desired*p.strength;
  if(limit<=EPS)return 0;
  if(pointFree(p,side,limit,obstacles,bounds))return limit;
  let low=0,high=limit;
  for(let k=0;k<7;k++){
   const mid=(low+high)/2;
   if(pointFree(p,side,mid,obstacles,bounds))low=mid;
   else high=mid;
  }
  return low;
 });
 // Suavizado de cuello: solo recorta y nunca vuelve a invadir obstáculos.
 // El límite de crecimiento evita dientes en las barreras vecinas.
 const stepLimit=14;
 for(let i=1;i<widths.length;i++)
  widths[i]=Math.min(widths[i],widths[i-1]+stepLimit);
 for(let i=widths.length-2;i>=0;i--)
  widths[i]=Math.min(widths[i],widths[i+1]+stepLimit);
 return widths;
}
export function buildSmartRunoffs(track,direction=1,board=null){
 const runoffs=[];
 if(!track?.parts?.length)return runoffs;
 const step=direction===-1?-1:1;
 const bounds=feltBounds(board);
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
  const samples=samplesFor(track,turn,index,step);
  const obstacles=occupiedSegments(track,ignoreConnected(track,index,step,turn));
  const widths=fitWidths(samples,turn.side,rule.width,obstacles,bounds);
  const visible=widths.map(w=>Math.max(0,w-
   (RUNOFF_STYLE.rimOffset-RUNOFF_STYLE.innerOffset)));
  // Ignorar flecos diminutos: no queremos islas verdes al lado del asfalto.
  if(Math.max(...visible,0)<RUNOFF_STYLE.minVisibleWidth)continue;
  if(visible.reduce((a,b)=>a+b,0)/visible.length<5)continue;
  runoffs.push({...polygonFor(samples,turn.side,widths),
   entryIndex:index,approachMm:approach,
   direction:step,side:turn.side,width:Math.max(...widths),
   effectiveWidths:widths,pieceIndices:[...turn.indices]});
 }
 return runoffs;
}
