// SlotRace LAB — geometría modular 2 carriles (milímetros virtuales).
// Referencias: pista de 156 mm, recta Sport 350/175 mm y curvas R2 45°.
// La compatibilidad física con fabricantes NO está certificada.
export const TABLE = Object.freeze({width:2200,height:1450,edge:62});
export const START = Object.freeze({x:380,y:325,h:0});
export const TRACK_WIDTH = 156;
export const LANE_OFFSET = 39;
export const CATALOG = Object.freeze({
  S350:{name:"Recta larga",code:"350 mm",length:350,stock:8,group:"recta"},
  S175:{name:"Media recta",code:"175 mm",length:175,stock:4,group:"recta"},
  R2R:{name:"Curva R2 ↷",code:"45° derecha",radius:370,angle:Math.PI/4,stock:12,group:"curva"},
  R2L:{name:"Curva R2 ↶",code:"45° izquierda",radius:370,angle:-Math.PI/4,stock:12,group:"curva"},
  R1R:{name:"Curva R1 ↷",code:"45° cerrada",radius:214,angle:Math.PI/4,stock:6,group:"curva"},
  R1L:{name:"Curva R1 ↶",code:"45° cerrada",radius:214,angle:-Math.PI/4,stock:6,group:"curva"}
});
export const STARTER=Object.freeze(["S350","S350","R2R","R2R","R2R","R2R",
  "S350","S350","R2R","R2R","R2R","R2R"]);
const EPS=1e-7;
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
  return t>.002&&t<.998&&u>.002&&u<.998;
}
function crossed(parts,closed){
  for(let i=0;i<parts.length;i++){
    for(let j=i+2;j<parts.length;j++){
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
  const closed=types.length>=4&&gap<0.35&&headingGap<.005;
  const bounds={left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity};
  for(const p of points){
    bounds.left=Math.min(bounds.left,p.x-TRACK_WIDTH/2);
    bounds.right=Math.max(bounds.right,p.x+TRACK_WIDTH/2);
    bounds.top=Math.min(bounds.top,p.y-TRACK_WIDTH/2);
    bounds.bottom=Math.max(bounds.bottom,p.y+TRACK_WIDTH/2);
  }
  const onTable=bounds.left>=TABLE.edge&&bounds.right<=TABLE.width-TABLE.edge&&
    bounds.top>=TABLE.edge&&bounds.bottom<=TABLE.height-TABLE.edge;
  const intersection=closed&&crossed(parts,closed);
  const lanes=[laneData(points,-LANE_OFFSET),laneData(points,LANE_OFFSET)];
  return{parts,types:[...types],points,lanes,closed,onTable,intersection,
    valid:closed&&onTable&&!intersection,ends:{begin:{...origin},end:{...pose}},gap,headingGap,bounds,
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
    curve:b.curve||a.curve,radius:b.radius===Infinity?a.radius:b.radius};
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
