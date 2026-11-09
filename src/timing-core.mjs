// SlotRace · matemáticas compartidas del cronómetro. No dependen de FPS ni de Date.now().
export function advanceElapsedMonotonic(elapsedMs,lastNowMs,nowMs,stallThresholdMs=500){
 if(!Number.isFinite(elapsedMs)||elapsedMs<0||!Number.isFinite(nowMs)||nowMs<0||
    !Number.isFinite(stallThresholdMs)||stallThresholdMs<0)
  throw Error("Reloj monotónico inválido");
 if(lastNowMs===null)return {elapsedMs,deltaMs:0,regression:false,frameGap:false};
 if(!Number.isFinite(lastNowMs)||lastNowMs<0)throw Error("Ancla monotónica inválida");
 const deltaMs=nowMs-lastNowMs;
 if(deltaMs<0)return {elapsedMs,deltaMs,regression:true,frameGap:false};
 return {elapsedMs:elapsedMs+deltaMs,deltaMs,regression:false,
  frameGap:deltaMs>stallThresholdMs};
}
// Distancia del coche hasta meta dentro del paso de simulación; calcula el
// instante de cruce entre dos fotogramas, NO el timestamp del final de frame.
// Devuelve tiempo transcurrido de la sesión para no cambiar de época en pausas.
export function interpolateCrossingElapsed(frameEndElapsedMs,frameDurationMs,distanceToFinish,frameTravel){
 if(![frameEndElapsedMs,frameDurationMs,distanceToFinish,frameTravel].every(Number.isFinite)||
    frameEndElapsedMs<0||frameDurationMs<0||frameTravel<=0||
    distanceToFinish<0||distanceToFinish>frameTravel+1e-6)
  throw Error("Cruce no interpolable");
 const fraction=Math.max(0,Math.min(1,distanceToFinish/frameTravel));
 return Math.max(0,frameEndElapsedMs-(1-fraction)*frameDurationMs);
}
