import {advanceElapsedMonotonic} from "./timing-core.mjs";
// SlotRace · reloj y actas locales para futuras competiciones.
// Ingeniería original; no contiene código de YATSS ni de SlotForge.
// NO acredita tiempos oficiales: las marcas del cliente son verificables solo
// como datos locales hasta contar con validación autoritativa en servidor.
export const TIMING_SCHEMA=1;
export const TIMING_MODES=Object.freeze(["practice","qualifying","lap_race","time_race"]);
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const nonNegative=n=>finite(n)&&n>=0;
function requireTime(value){if(!nonNegative(value))throw Error("Marca monotónica inválida");return value;}
const copy=s=>({...s,laps:s.laps.map(x=>({...x})),flags:s.flags.map(x=>({...x})),crossings:s.crossings.map(x=>({...x}))});
export function createTimingSession({sessionId,eventId=null,driverId,circuitId,physicsVersion,mode="practice",targetLaps=null,durationMs=null,minLapMs=0,stallThresholdMs=500}){
 if(!sessionId||!driverId||!circuitId||!physicsVersion||!TIMING_MODES.includes(mode))throw Error("Identidad o modo de carrera inválido");
 if(!nonNegative(minLapMs)||!nonNegative(stallThresholdMs))throw Error("Umbrales inválidos");
 if(mode==="lap_race"&&(!Number.isInteger(targetLaps)||targetLaps<1))throw Error("Número de vueltas inválido");
 if(mode==="time_race"&&(!finite(durationMs)||durationMs<=0))throw Error("Duración inválida");
 return{schema:TIMING_SCHEMA,sessionId,eventId,driverId,circuitId,physicsVersion,
  mode,targetLaps,durationMs,minLapMs,stallThresholdMs,source:"local-unverified",
  status:"ready",elapsedMs:0,lastNowMs:null,lapStartElapsedMs:0,needsReferenceCrossing:false,
  laps:[],flags:[],crossings:[],revision:0};
}
function changed(s){s.revision++;return s;}
export function advanceTiming(session,nowMs){
 const now=requireTime(nowMs),s=copy(session);
 if(s.status!=="running")return s;
 if(s.lastNowMs===null){s.lastNowMs=now;return changed(s);}
 const next=advanceElapsedMonotonic(s.elapsedMs,s.lastNowMs,now,s.stallThresholdMs);
 if(next.regression){
  s.flags.push({type:"clock-regression",atElapsedMs:s.elapsedMs,deltaMs:next.deltaMs});
  s.status="paused";s.lastNowMs=null;return changed(s);
 }
 s.elapsedMs=next.elapsedMs;s.lastNowMs=now;
 if(next.frameGap)s.flags.push({type:"frame-gap",atElapsedMs:s.elapsedMs,deltaMs:next.deltaMs});
 return changed(s);
}
export function startTiming(session,nowMs){
 const now=requireTime(nowMs);
 if(!["ready","paused"].includes(session.status))throw Error("Esta tanda no admite salida");
 const s=copy(session);s.status="running";s.lastNowMs=now;
 if(session.status==="ready")s.lapStartElapsedMs=0;
 return changed(s);
}
export function pauseTiming(session,nowMs){
 const s=advanceTiming(session,nowMs);
 if(s.status!=="running")return s;
 s.status="paused";s.lastNowMs=null;return changed(s);
}
export function recoverTiming(saved){
 if(!saved||saved.schema!==TIMING_SCHEMA||!Array.isArray(saved.laps)||!Array.isArray(saved.crossings)||!Array.isArray(saved.flags))
  throw Error("Acta incompatible: conservar el archivo original");
 const s=copy(saved);
 // Tras reiniciar la aplicación performance.now() ya no comparte época.
 // Reiniciar el ancla, no restaurar el tiempo desde Date.now().
 if(s.status==="running"||s.status==="paused"){
  s.status="paused";s.needsReferenceCrossing=true;
 }
 s.lastNowMs=null;return changed(s);
}
export function recordFinishCrossing(session,nowMs,{lane,checkpointsOk=true,eligible=true}={}){
 let s=advanceTiming(session,nowMs);
 if(s.status!=="running")throw Error("No se puede cronometrar una tanda detenida");
 if(!Number.isInteger(lane)||lane<0||lane>1)throw Error("Carril inválido");
 const lapMs=s.elapsedMs-s.lapStartElapsedMs;
 let reason=null;
 if(s.needsReferenceCrossing)reason="recovery-reference";
 else if(!checkpointsOk)reason="missing-checkpoint";
 else if(!eligible)reason="ineligible";
 else if(lapMs<s.minLapMs)reason="below-minimum-physical-time";
 const number=s.crossings.length+1;
 const crossing={number,lane,elapsedMs:s.elapsedMs,lapMs:Math.max(0,lapMs),accepted:!reason,reason};
 s.crossings.push(crossing);
 if(reason){
  if(reason!=="recovery-reference")s.flags.push({type:reason,crossing:number});
 }else{
  s.laps.push({number:s.laps.length+1,crossing:number,lane,lapMs,finishElapsedMs:s.elapsedMs});
 }
 s.needsReferenceCrossing=false;
 s.lapStartElapsedMs=s.elapsedMs;
 return changed(s);
}
export function finishTiming(session,nowMs){
 const s=session.status==="running"?advanceTiming(session,nowMs):copy(session);
 if(!["running","paused"].includes(s.status))throw Error("Tanda no iniciada");
 s.status="finished";s.lastNowMs=null;
 return changed(s);
}
export function evaluateTiming(session){
 const valid=session.laps;
 const bestMs=valid.length?Math.min(...valid.map(l=>l.lapMs)):null;
 const lastMs=valid.length?valid.at(-1).finishElapsedMs:null;
 const complete=session.mode==="lap_race"?
  valid.length>=session.targetLaps:
  session.mode==="time_race"?
   session.elapsedMs>=session.durationMs:session.status==="finished";
 return{sessionId:session.sessionId,driverId:session.driverId,mode:session.mode,
  validLaps:valid.length,bestMs,lastFinishElapsedMs:lastMs,elapsedMs:session.elapsedMs,
  complete,reviewRequired:session.flags.length>0||session.needsReferenceCrossing,
  validation:"local-unverified"};
}
export function rankEventSessions(sessions,mode){
 if(!TIMING_MODES.includes(mode))throw Error("Modo inválido");
 const scores=sessions.map(evaluateTiming);
 if(scores.some(s=>s.mode!==mode))throw Error("No mezclar modalidades");
 const byQualifying=mode==="qualifying"||mode==="practice";
 const metric=s=>byQualifying?(s.bestMs??Infinity):(s.lastFinishElapsedMs??Infinity);
 scores.sort((a,b)=>{
  if(!byQualifying&&a.validLaps!==b.validLaps)return b.validLaps-a.validLaps;
  return metric(a)-metric(b)||a.driverId.localeCompare(b.driverId);
 });
 let lastKey=null,lastRank=0;
 return scores.map((s,i)=>{
  const key=byQualifying?String(metric(s)):`${s.validLaps}:${metric(s)}`;
  if(key!==lastKey)lastRank=i+1;
  lastKey=key;return{...s,position:lastRank};
 });
}
