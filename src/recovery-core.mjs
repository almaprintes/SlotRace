// Recuperación visual compartida para el jugador y la IA.
// La sanción deportiva (2,5 / 3 / 5 s) es independiente de la duración
// de las animaciones (salida y regreso). Sin acceso a DOM ni a cronómetros.
export const RECOVERY=Object.freeze({
 exitSeconds:0.65,reentrySeconds:0.8,offTrackMm:85,waitRetrySeconds:0.05
});
const clamp01=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{const t=clamp01(n);return t*t*(3-2*t);};
const angleDifference=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));

export function advanceRecovery({penalty,deslot,dt,clearToReturn=true}){
 if(!Number.isFinite(penalty)||penalty<0||!Number.isFinite(dt)||dt<0||dt>.1)
  throw Error("Recuperación: tiempo inválido");
 const left=Math.max(0,penalty-dt);
 if(!deslot)return {penalty:left,deslot:null,completed:left===0};
 if(typeof deslot!=="object"||!deslot.pose)throw Error("Recuperación: pose inválida");
 const elapsed=(Number.isFinite(deslot.elapsed)?deslot.elapsed:0)+dt;
 const previous=Number.isFinite(deslot.reentryElapsed)?deslot.reentryElapsed:0;
 // Sólo iniciar la entrada durante los últimos 0,8 s y con espacio libre.
 // Si queda bloqueada, esperar fuera y comenzar de nuevo gradualmente.
 const canReturn=clearToReturn && left<=RECOVERY.reentrySeconds;
 const reentryElapsed=canReturn?
  Math.min(RECOVERY.reentrySeconds,previous+dt):0;
 const completed=left===0&&reentryElapsed>=RECOVERY.reentrySeconds-1e-9;
 return {penalty:completed?0:Math.max(left,RECOVERY.waitRetrySeconds),
  deslot:completed?null:{...deslot,elapsed,reentryElapsed,
   waitingForSpace:!clearToReturn},
  completed};
}
export function recoveryVisualPose(target,deslot){
 if(!deslot)return target;
 if(!target||!deslot.pose)return target;
 const start=deslot.pose,sign=deslot.turn<0?-1:1;
 const out=smooth((deslot.elapsed||0)/RECOVERY.exitSeconds);
 const normalX=-Math.sin(start.h)*sign,normalY=Math.cos(start.h)*sign;
 const side=RECOVERY.offTrackMm*out;
 const parked={x:start.x+normalX*side,y:start.y+normalY*side,
  h:start.h+sign*Math.PI*2*out};
 const returnRatio=smooth((deslot.reentryElapsed||0)/RECOVERY.reentrySeconds);
 const angle=angleDifference(parked.h,target.h);
 return {...target,
  x:parked.x+(target.x-parked.x)*returnRatio,
  y:parked.y+(target.y-parked.y)*returnRatio,
  h:parked.h+angle*returnRatio,
  smoke:(1-out)*.8,
  spin:out<1?1:0};
}
