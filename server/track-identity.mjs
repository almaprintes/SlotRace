// Huella física competitiva de SlotRace, calculada SOLO en servidor.
// A diferencia del catálogo mundial de circuitos (reflejos/inversos podrían
// compartir identidad), una CARRERA necesita fijar también el sentido.
import {createHash} from "node:crypto";
import {START,CATALOG,buildTrack,allowed} from "../src/track.mjs";
import {FAMILY_ID} from "../src/pt-precision.mjs";
import {PHYSICS_VERSION} from "../src/physics-v4.mjs";

export const TRACK_IDENTITY_SCHEMA=1;
const finite=n=>typeof n==="number"&&Number.isFinite(n);
export function canonicalCompetitionTrack({types,raisedParts=[],driveDirection=1}={}){
 if(!Array.isArray(types)||types.length<4||types.length>200||
   !types.every(id=>typeof id==="string"&&CATALOG[id]&&!CATALOG[id].legacy)||
   types.filter(id=>id==="START350").length!==1||!allowed(types))
   throw Error("Receta competitiva inválida: piezas o SALIDA/META");
 if(!Array.isArray(raisedParts)||raisedParts.length>types.length||
   !raisedParts.every(i=>Number.isInteger(i)&&i>=0&&i<types.length)||
   new Set(raisedParts).size!==raisedParts.length)
   throw Error("Elevaciones competitivas inválidas");
 if(driveDirection!==1&&driveDirection!==-1)
   throw Error("Sentido competitivo inválido");
 // El mismo bucle no cambia por empezar a enumerar sus piezas en otro punto:
 // rotamos la receta al único START350. No modificamos circuitos del usuario.
 const start=types.indexOf("START350"),n=types.length;
 const ordered=[...types.slice(start),...types.slice(0,start)];
 const raised=raisedParts.map(i=>(i-start+n)%n).sort((a,b)=>a-b);
 const track=buildTrack(ordered,START,raised);
 if(!track.valid||!track.closed)throw Error("El circuito no es competitivo: cierre, cruces o alturas");
 const canonical={schema:TRACK_IDENTITY_SCHEMA,family:FAMILY_ID,
   types:ordered,raisedParts:raised,driveDirection,physicsVersion:PHYSICS_VERSION};
 const fingerprint=createHash("sha256").update(JSON.stringify(canonical),"utf8").digest("hex");
 return {canonical,fingerprint,track};
}
