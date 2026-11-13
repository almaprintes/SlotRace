// Alcances en slot analógico: el orden en la guía decide quién golpea.
// Las cifras son parámetros de jugabilidad (mm y mm/s), no normativa FISA.
export const REAR_CONTACT=Object.freeze({
 lengthMm:98,softLimit:85,hardLimit:420,followingRange:650,
 severeRearPenalty:5,severeFrontPenalty:2.5,clearanceFactor:1.55
});
export function forwardGap(from,to,total){
 if(!(total>0))return Infinity;
 return ((to-from)%total+total)%total;
}
export function rearContact({playerDistance,aiDistance,total,
 playerSpeed,aiSpeed,carLength=REAR_CONTACT.lengthMm}){
 if(!(total>carLength*3))return null;
 const aiToPlayer=forwardGap(aiDistance,playerDistance,total);
 const playerToAi=forwardGap(playerDistance,aiDistance,total);
 const aiBehind=aiToPlayer<=carLength&&aiToPlayer<playerToAi;
 const playerBehind=playerToAi<=carLength&&playerToAi<aiToPlayer;
 let rear=null,gap=0;
 if(aiBehind){rear="ai";gap=aiToPlayer;}
 else if(playerBehind){rear="player";gap=playerToAi;}
 else if(aiToPlayer===0){
  rear=aiSpeed>playerSpeed?"ai":playerSpeed>aiSpeed?"player":null;
 }
 if(!rear)return null;
 const closing=rear==="ai"?aiSpeed-playerSpeed:playerSpeed-aiSpeed;
 if(closing<=0)return null;
 const severity=closing<REAR_CONTACT.softLimit?"glance":
  closing<REAR_CONTACT.hardLimit?"bump":"severe";
 return{rear,front:rear==="ai"?"player":"ai",gap,closing,severity};
}
export function followTarget(gap,frontSpeed,desiredSpeed,{length=REAR_CONTACT.lengthMm}={}){
 if(!Number.isFinite(gap)||gap>REAR_CONTACT.followingRange)return desiredSpeed;
 const free=Math.max(0,gap-length-28);
 // A velocidad alta la IA deja hueco para frenar; nunca invade
 // voluntariamente el espacio que ocupa otro coche.
 const safe=Math.max(0,frontSpeed*.92+free*1.7);
 return Math.min(desiredSpeed,safe);
}
export function reentrySafe(ownDistance,otherDistance,total,length=REAR_CONTACT.lengthMm){
 if(!(total>0))return false;
 const ahead=forwardGap(ownDistance,otherDistance,total);
 const behind=forwardGap(otherDistance,ownDistance,total);
 return Math.min(ahead,behind)>length*REAR_CONTACT.clearanceFactor;
}


// Alcance continuo: compara lo recorrido por ambos vehículos durante todo
// el fotograma, no sólo sus posiciones FINALES. Evita atravesar al rival
// cuando el coche de atrás llega a rebasarlo entre dos fotogramas.
export function sweptRearContact({playerStart,aiStart,playerTravel,aiTravel,
 total,playerSpeed,aiSpeed,carLength=REAR_CONTACT.lengthMm}){
 if(![playerStart,aiStart,playerTravel,aiTravel,total,playerSpeed,aiSpeed,carLength]
  .every(Number.isFinite)||total<=carLength*3||playerTravel<0||aiTravel<0||
  playerTravel>=total/2||aiTravel>=total/2||carLength<=0)return null;
 const aiGap=forwardGap(aiStart,playerStart,total);
 const playerGap=forwardGap(playerStart,aiStart,total);
 // A igual distancia solo podemos decidir cuál venía por detrás usando el
 // desplazamiento relativo. No inferir posiciones de velocidad final a ciegas.
 const rear=aiGap===playerGap ?
  aiTravel>playerTravel?"ai":playerTravel>aiTravel?"player":null :
  aiGap<playerGap?"ai":"player";
 if(!rear)return null;
 const gap=rear==="ai"?aiGap:playerGap;
 const closingTravel=rear==="ai"?aiTravel-playerTravel:playerTravel-aiTravel;
 const closing=rear==="ai"?aiSpeed-playerSpeed:playerSpeed-aiSpeed;
 if(closingTravel<=0||closing<=0||gap>carLength+closingTravel)return null;
 const severity=closing<REAR_CONTACT.softLimit?"glance":
  closing<REAR_CONTACT.hardLimit?"bump":"severe";
 const fraction=Math.max(0,Math.min(1,
  (gap-carLength)/closingTravel));
 return {rear,front:rear==="ai"?"player":"ai",gap,closing,severity,fraction};
}

// Separa de nuevo los vehículos en el carril físico: incluso un roce suave
// debe impedir que el trasero ocupe o atraviese el volumen del delantero.
// No se crean vueltas ni se cambia el carril de ninguno.
export function placeRearBehind(frontDistance,total,
 carLength=REAR_CONTACT.lengthMm,clearance=2){
 if(![frontDistance,total,carLength,clearance].every(Number.isFinite)||
  total<=carLength*3||carLength<=0||clearance<0)return null;
 return ((frontDistance-carLength-clearance)%total+total)%total;
}
