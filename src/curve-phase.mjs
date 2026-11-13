// Geometry-aware curve progression, shared by PWA, AI and server referee.
// A consecutive sequence of curve modules with the same turn is ONE arc.
// Pure JavaScript: no DOM, timers or server APIs.
export function buildCurveSpanIndex(types,lane,catalog){
 if(!Array.isArray(types)||!lane?.nodes||!lane?.lengths||!(lane.total>0))
  throw Error("Invalid curve geometry");
 const n=types.length,turns=types.map(id=>Math.sign(catalog[id]?.angle||0));
 const starts=Array(n).fill(Infinity),ends=Array(n).fill(-Infinity);
 for(let j=1;j<lane.nodes.length;j++){
  const index=lane.nodes[j].pieceIndex;
  if(Number.isInteger(index)&&index>=0&&index<n){
   starts[index]=Math.min(starts[index],lane.lengths[j-1]);
   ends[index]=Math.max(ends[index],lane.lengths[j]);
  }
 }
 return turns.map((turn,i)=>{
  if(!turn)return null;
  let first=i,last=i,count=0;
  while(count++<n-1&&turns[(first+n-1)%n]===turn)
   first=(first+n-1)%n;
  count=0;
  while(count++<n-1&&turns[(last+1)%n]===turn)
   last=(last+1)%n;
  const start=starts[first],end=ends[last],total=lane.total;
  const lengthMm=(end-start+total)%total||total;
  return {start,end,lengthMm};
 });
}
export function curvePhaseForCar(pose,lane,spans,distance,direction=1){
 if(!pose?.curve||!lane?.total)return{progress:0,lengthMm:0};
 if(!Number.isInteger(pose.pieceIndex)||pose.pieceIndex<0)
  return{progress:1,lengthMm:0};
 const span=spans?.[pose.pieceIndex];
 if(!span||!Number.isFinite(span.lengthMm)||span.lengthMm<=0)
  return{progress:1,lengthMm:0};
 const total=lane.total;
 const nativeDistance=((direction===-1?-distance:distance)%total+total)%total;
 const travelled=direction===-1?
  (span.end-nativeDistance+total)%total:
  (nativeDistance-span.start+total)%total;
 return{progress:Math.max(0,Math.min(1,travelled/span.lengthMm)),lengthMm:span.lengthMm};
}
