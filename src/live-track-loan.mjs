// Una pista compartida no transfiere piezas ni desbloquea colecciones.
// El invitado la utiliza exclusivamente dentro de la competición activa.
import {CATALOG,buildTrack,START} from "./track.mjs?v=0.15.72";
const MIN=4,MAX=320;
const finite=n=>typeof n==="number"&&Number.isFinite(n);
function clean(recipe){
 if(!recipe||typeof recipe!=="object"||!Array.isArray(recipe.types)||
    recipe.types.length<MIN||recipe.types.length>MAX)throw Error("Plano online inválido");
 if(recipe.types.some(t=>typeof t!=="string"||!Object.hasOwn(CATALOG,t)))
  throw Error("La pista incluye piezas desconocidas");
 if(recipe.types.filter(t=>t==="START350").length!==1)
  throw Error("Cada pista online necesita una sola salida/meta");
 const origin=recipe.origin||START;
 if(!finite(origin.x)||!finite(origin.y)||!finite(origin.h)||
  Math.abs(origin.x)>1e6||Math.abs(origin.y)>1e6||Math.abs(origin.h)>100)
  throw Error("Posición del plano inválida");
 if(!Array.isArray(recipe.raisedParts||[])||(recipe.raisedParts||[]).length>MAX)
  throw Error("Elevaciones de pista inválidas");
 const raisedParts=[...new Set(recipe.raisedParts||[])];
 if(raisedParts.some(i=>!Number.isInteger(i)||i<0||i>=recipe.types.length))
  throw Error("Índice de soporte inválido");
 const direction=recipe.direction===-1?-1:recipe.direction===1?1:null;
 if(!direction)throw Error("Sentido de carrera inválido");
 const types=recipe.types.slice();
 const track=buildTrack(types,{x:origin.x,y:origin.y,h:origin.h},raisedParts);
 if(!track.valid||!track.closed)throw Error("El circuito no está cerrado o es incompatible");
 // El prototipo de carrera en directo aún no dispone de árbitro de PT82.
 // El anfitrión debe elegir una pista convencional para esta fase.
 if(track.laneChangerIndex>=0)throw Error("La PT82 requiere árbitro de colisiones online; elige otra pista");
 return {types,origin:{x:origin.x,y:origin.y,h:origin.h},
  raisedParts,direction,name:String(recipe.name||"Pista de slot").slice(0,64),
  track};
}
export function prepareSlotTrackLoan(recipe){
 const r=clean(recipe);
 // Nunca se serializa inventario, saldo, récord, autoría ni progresión.
 return {schema:1,permission:"race-only",types:r.types,
  origin:r.origin,raisedParts:r.raisedParts,direction:r.direction,name:r.name};
}
export function openSlotTrackLoan(payload){
 if(payload?.schema!==1||payload.permission!=="race-only")
  throw Error("Se necesita un permiso temporal de competición");
 const r=clean(payload);
 return {permission:"race-only",borrowed:true,types:r.types,
  origin:r.origin,raisedParts:r.raisedParts,direction:r.direction,
  name:r.name,track:r.track};
}
