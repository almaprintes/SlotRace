// Pruebas matemáticas deterministas: NO sustituyen las pruebas físicas en iPhone.
import {advanceElapsedMonotonic,interpolateCrossingElapsed} from "./timing-core.mjs";
function measuredCrossing(expectedMs,frames){
 let now=0,elapsed=0,warnings=0;
 for(const duration of frames){
  const before=now;now+=duration;
  const result=advanceElapsedMonotonic(elapsed,before,now);
  if(result.regression)throw Error("Reloj regresivo");
  elapsed=result.elapsedMs;
  if(result.frameGap)warnings++;
  if(before<=expectedMs&&expectedMs<=now){
   const fraction=(expectedMs-before)/duration;
   return {measuredMs:interpolateCrossingElapsed(elapsed,duration,fraction*1000,1000),
    warningCount:warnings};
  }
 }
 throw Error("Los fotogramas no alcanzan la meta");
}
function regularFrames(fps,totalMs=11000){
 const result=[],step=1000/fps;let remaining=totalMs;
 while(remaining>0){const ms=Math.min(step,remaining);result.push(ms);remaining-=ms;}
 return result;
}
function pausedElapsed(){
 let elapsed=0,last=0;
 elapsed=advanceElapsedMonotonic(elapsed,last,5000).elapsedMs;
 // Se pulsa pausa. Al reanudar, se reinicia el ancla y se EXCLUYEN 20 s.
 last=25000;
 elapsed=advanceElapsedMonotonic(elapsed,last,30000).elapsedMs;
 return elapsed;
}
export function runTimingDiagnostics(){
 const expectedMs=8432;
 const cases=[
  {label:"60 FPS",frames:regularFrames(60)},
  {label:"30 FPS",frames:regularFrames(30)},
  {label:"15 FPS",frames:regularFrames(15)},
  {label:"Congelación 1 s",frames:[...regularFrames(60,8000),1000,...regularFrames(60,3000)]},
  {label:"Congelación 3 s",frames:[...regularFrames(60,7000),3000,...regularFrames(60,1000)]}
 ];
 const results=cases.map(c=>{
  const measured=measuredCrossing(expectedMs,c.frames);
  return {label:c.label,expectedMs,measuredMs:measured.measuredMs,
   errorMs:measured.measuredMs-expectedMs,warningCount:measured.warningCount,
   passed:Math.abs(measured.measuredMs-expectedMs)<0.001};
 });
 const pauseMs=pausedElapsed();
 results.push({label:"Pausa 20 s",expectedMs:10000,measuredMs:pauseMs,
  errorMs:pauseMs-10000,warningCount:0,passed:pauseMs===10000});
 let maximumCrossingErrorMs=0;
 for(let i=0;i<1000;i++){
  // 1000 cruces con duraciones y fracciones distintas, referencia analítica.
  const duration=4+(i*37%113)*0.35, fraction=((i*7919)%997+0.5)/997;
  const frameEnd=12000+i*duration;
  const expected=frameEnd-duration*(1-fraction);
  const actual=interpolateCrossingElapsed(frameEnd,duration,fraction*2000,2000);
  maximumCrossingErrorMs=Math.max(maximumCrossingErrorMs,Math.abs(actual-expected));
 }
 results.push({label:"1.000 cruces entre fotogramas",expectedMs:0,
  measuredMs:maximumCrossingErrorMs,errorMs:maximumCrossingErrorMs,warningCount:0,
  passed:maximumCrossingErrorMs<0.001,meaning:"error máximo en milisegundos"});
 return {version:"monotonic-v3",type:"synthetic",results,
  passed:results.every(r=>r.passed),maximumCrossingErrorMs};
}
