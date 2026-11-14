// Restauración de pistas online tras perder la conexión o reiniciar el navegador.
// Se guardan SOLO identificadores, plano y resultados; nunca mensajes de chat.
// No se guarda una posición de carrera para que nadie reaparezca con tiempo falso:
// tras recargar se repite la manga interrumpida, conservando las anteriores.
export const ONLINE_REJOIN_KEY="slotrace-online-rejoin-v1";
export const ONLINE_REJOIN_TTL_MS=60*60*1000;
export function validOnlineRejoin(record,now=Date.now()){
 return !!(record&&record.version===1&&typeof record.roomId==="string"&&
  /^[0-9a-f-]{36}$/i.test(record.roomId)&&
  /^[A-HJ-NP-Z2-9]{7}$/.test(record.code||"")&&
  ["host","guest"].includes(record.role)&&
  ["idle","countdown","racing","paused","between"].includes(record.phase)&&
  Number.isInteger(record.heat)&&record.heat>=0&&record.heat<=2&&
  Number.isFinite(record.updatedAt)&&
  record.updatedAt<=now+60000&&now-record.updatedAt<ONLINE_REJOIN_TTL_MS);
}
export function readOnlineRejoin(storage,now=Date.now()){
 try{
  const raw=storage?.getItem(ONLINE_REJOIN_KEY);
  if(!raw)return null;
  const data=JSON.parse(raw);
  if(validOnlineRejoin(data,now))return data;
  storage?.removeItem(ONLINE_REJOIN_KEY);
 }catch(_){}
 return null;
}
export function persistOnlineRejoin(storage,data,now=Date.now()){
 try{
  const record={...data,version:1,updatedAt:now};
  if(!validOnlineRejoin(record,now))return false;
  storage?.setItem(ONLINE_REJOIN_KEY,JSON.stringify(record));
  return true;
 }catch(_){return false;}
}
export function clearOnlineRejoin(storage){
 try{storage?.removeItem(ONLINE_REJOIN_KEY);}catch(_){}
}
// Volver con el mismo código conserva la manga, sin inventar tiempos ni posiciones.
export function reconnectRoomFromCode(room,role,userId,cache,now=Date.now()){
 if(!room||!["host","guest"].includes(role)||room[role+"_id"]!==userId||
  !["heat1","heat2"].includes(room.state))return null;
 const previous=validOnlineRejoin(cache,now)&&cache.roomId===room.id&&
  cache.code===room.code&&cache.userId===userId&&cache.role===role?cache:null;
 return {heat:room.state==="heat2"?2:1,phase:"paused",
  track:previous?.track||null,scores:previous?.scores||null};
}
// No enviar una nueva salida hasta confirmar AMBOS motores y la pista.
export function canAutoReconnectHeat({role,phase,connected,peerOnline,
 peerGameReady,localGameReady,guestTrackReady,sharedTrack,guestId,pending}={}){
 return role==="host"&&phase==="paused"&&connected===true&&
  peerOnline===true&&peerGameReady===true&&localGameReady===true&&
  guestTrackReady===true&&Boolean(sharedTrack)&&Boolean(guestId)&&pending!==true;
}
export function restoredOnlinePhase(record,dbState){
 if(!validOnlineRejoin(record))return null;
 if(dbState==="waiting")return "idle";
 if(dbState==="heat1"||dbState==="heat2"){
  const dbHeat=dbState==="heat1"?1:2;
  if(record.heat!==dbHeat)return "paused";
  if(record.phase==="between"&&dbHeat===1&&
   Number.isFinite(record.scores?.[1]?.host)&&
   Number.isFinite(record.scores?.[1]?.guest))return "between";
  // Una página recargada no puede afirmar que conserva física ni reloj.
  return "paused";
 }
 return null;
}
