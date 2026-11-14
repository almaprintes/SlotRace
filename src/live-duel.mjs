// Top Down RACE: SlotRace · enlace privado entre dos móviles.
// Beta técnica independiente: resultados sin homologación y sin CR.
import {cleanLiveChatText,validLiveChat,CHAT_COOLDOWN_MS,chatCooldownRemaining} from "./online-chat-ui.mjs?v=0.15.78";
import {readOnlineRejoin,persistOnlineRejoin,clearOnlineRejoin,restoredOnlinePhase,reconnectRoomFromCode,canAutoReconnectHeat} from "./online-rejoin.mjs?v=0.15.78";
import {buildOnlineResultModel,renderOnlineResultBoard} from "./online-results.mjs?v=0.15.78";
import {LIVE_TRACK,LIVE_LAPS,roomCode,laneFor,carPose,makeCar,advanceCar,lapTotal} from "./live-duel-core.mjs?v=0.15.78";
const URL="https://juukbnkjboiazqggqcyv.supabase.co";
const KEY="sb_publishable_l5cHUHrGHoFzGqmUyfQKSA_d3VjWksB";
const SDK="https://esm.sh/@supabase/supabase-js@2.119.0?target=es2022";
const $=id=>document.getElementById(id);
let api=null,account=null,room=null,role=null,channel=null,connected=false;
let peerOnline=false,phase="idle",heat=0,startAt=0,local=null,remote=null;
const embedded=new URLSearchParams(location.search).get("embedded")==="1";
let sharedTrack=null,pendingTrack=null,guestTrackReady=false;
let lastFrame=0,lastSend=0,roomPolling=false,refreshStamp=0,sequence=0,remoteSeq=0;
const scores={1:{host:null,guest:null},2:{host:null,guest:null}};
let chatSequence=0,lastPeerChatSeq=0,lastChatAt=0,lastPeerChatAt=0;
let pendingRematchCode=null,rematchRequested=false,rematchBusy=false;
let localGameActive=false,peerCanContinue=false,lastPeerStateAt=0,lastReadySentAt=0;
let reconnectTimer=null,reconnectBusy=false;
let localGameReady=false,peerGameReady=false,rejoinStartPending=false;
let autoReconnectTimer=null,lastAutoReconnectAt=0;
function readyToAutoReconnect(){
 return canAutoReconnectHeat({role,phase,connected,peerOnline,
  peerGameReady,localGameReady,guestTrackReady,sharedTrack,
  guestId:room?.guest_id,pending:rejoinStartPending});
}
function scheduleAutoReconnect(){
 if(!readyToAutoReconnect()||autoReconnectTimer!==null||
  Date.now()-lastAutoReconnectAt<4000)return;
 autoReconnectTimer=setTimeout(()=>{
  autoReconnectTimer=null;
  if(!readyToAutoReconnect())return;
  lastAutoReconnectAt=Date.now();
  void startHeat();
 },900);
}
function requestPrepareRejoin(){
 if(phase!=="paused"||!sharedTrack||!embedded||!role)return;
 notifyGame("prepareRejoin",{track:sharedTrack,role,heat,opponent:peerNick()});
}
function sendEarlierScores(){
 if(role!=="host"||heat!==2||!connected||!channel||!room||
  !Number.isFinite(scores[1].host)||!Number.isFinite(scores[1].guest))return;
 void channel.send({type:"broadcast",event:"earlier-scores",
  payload:{roomId:room.id,userId:account.id,heat:1,scores:{...scores[1]}}}).catch(()=>{});
}
const fmt=x=>(Number(x)||0).toFixed(3).replace(".",",");
const other=()=>role==="host"?"guest":"host";
function notifyGame(kind,detail={}){
 if(embedded&&window.parent!==window)
  window.parent.postMessage({kind:"slotrace:online:"+kind,...detail},location.origin);
}
function saveLiveRecovery(){
 if(!room||!role||!account||phase==="finished")return;
 persistOnlineRejoin(localStorage,{
  roomId:room.id,code:room.code,role,userId:account.id,heat,phase,
  track:sharedTrack||null,
  scores:{1:{...scores[1]},2:{...scores[2]}}
 });
}
function pauseForReconnect(reason="Conexión perdida · esperando al otro piloto"){
 if(!["racing","countdown","resume-countdown"].includes(phase))return;
 phase="paused";peerCanContinue=false;peerGameReady=false;lastReadySentAt=0;
 activateControls(false);setStatus("⏸ PISTA EN ESPERA");
 notice(reason);saveLiveRecovery();updateRoom();
 notifyGame("networkHold",{reason});
 if(connected&&channel)
  void channel.send({type:"broadcast",event:"interruption",
   payload:{roomId:room.id,userId:account.id,heat}}).catch(()=>{});
}
function announceRejoinReady(){
 if(!connected||!channel||!room||phase!=="paused"||!peerOnline)return;
 if(Date.now()-lastReadySentAt<1600)return;
 lastReadySentAt=Date.now();
 void channel.send({type:"broadcast",event:"rejoin-ready",payload:{
  roomId:room.id,userId:account.id,heat,canContinue:localGameActive,
   gameReady:localGameReady
 }}).catch(()=>{});
}
function announceTrack(){
 if(role!=="host"||!connected||!sharedTrack||!channel)return;
 void channel.send({type:"broadcast",event:"track",
  payload:{track:sharedTrack}}).catch(e=>notice("No se pudo compartir la pista: "+safeError(e),true));
}
function trackAccepted(loan){
 sharedTrack=loan;
 $("trackSharedName").textContent="Pista compartida: "+loan.name+
  " · "+loan.types.length+" piezas"+(role==="guest"?" · Prestada para esta carrera":"");
 $("trackSharedName").hidden=false;
 saveLiveRecovery();updateRoom();
 requestPrepareRejoin();
}
const myNick=()=>role==="host"?room?.host_nick:room?.guest_nick;
const peerNick=()=>role==="host"?room?.guest_nick:room?.host_nick;
function notice(msg,error=false){$("notice").textContent=msg;$("notice").classList.toggle("error",error);}
function setStatus(msg){$("liveStatus").textContent=msg;}
function activateControls(active){$("gasButton").disabled=!active;if(!active){$("gasButton").classList.remove("is-on");if(local)local.gas=0;}}
function code(){const bytes=new Uint8Array(7);crypto.getRandomValues(bytes);return roomCode(bytes);}
function safeError(error){return error?.message||String(error)||"Error de conexión";}
function roleLabel(player){return player===role?" (tú)":"";}
async function sendChat(text,kind="text"){
 const cleaned=cleanLiveChatText(text);
 if(!validLiveChat(cleaned,kind))return;
 const now=Date.now();
 const remaining=chatCooldownRemaining(lastChatAt,now);
 if(remaining){notifyGame("chatError",{message:"Espera "+Math.ceil(remaining/1000)+" segundos para enviar otro mensaje."});return;}
 if(!connected||!channel||!room?.guest_id||!account){
  notifyGame("chatError",{message:"Necesitas que ambos pilotos estén conectados."});return;
 }
 if(phase==="racing"&&kind!=="quick"){
  notifyGame("chatError",{message:"Durante la carrera utiliza las reacciones rápidas."});return;
 }
 lastChatAt=now;
 try{
  const payload={roomId:room.id,userId:account.id,seq:++chatSequence,
   text:cleaned,kind};
  const result=await channel.send({type:"broadcast",event:"chat",payload});
  if(result!=="ok")throw Error("Mensaje no confirmado por la conexión.");
  notifyGame("chatMessage",{message:{...payload,nick:myNick()||account.nick,mine:true}});
 }catch(error){notifyGame("chatError",{message:"No enviado: "+safeError(error)});}
}
function updateRoom(){
 if(!room)return;
 $("roomBox").hidden=false;$("roomCode").textContent=room.code;
 $("roomNames").textContent=(room.host_nick||"Anfitrión")+
  " VS "+(room.guest_nick||"Esperando piloto");
 $("identity").textContent="Sesión: "+account.nick+" · Pista "+room.code;
 $("copyInvite").disabled=false;
 const joined=Boolean(room.guest_id);
 $("connectionStatus").textContent=joined?
  (peerOnline?"🟢 Dos pilotos conectados":"🟡 Rival registrado. Esperando conexión en directo…"):
  "🟡 Falta el segundo piloto";
 const btn=$("startHeat");
 btn.hidden=role!=="host";
 if(role==="host"){
  const ready=joined&&connected&&peerOnline&&Boolean(sharedTrack)&&guestTrackReady&&
   ((heat===0&&room.state==="waiting")||
    (heat===1&&phase==="between"&&room.state==="heat1"&&
      local?.done&&remote?.done));
  const reconnectReady=readyToAutoReconnect();
  btn.disabled=rejoinStartPending||!(ready||reconnectReady);
  btn.textContent=rejoinStartPending?"⏳ Sincronizando manga":phase==="paused"?
    (peerCanContinue&&localGameActive?"▶ Reanudar manga":"🏁 Repetir manga interrumpida"):
    heat===0?"🏁 Empezar primera manga":
    heat===1?"🏁 Iniciar segunda manga":"Carrera finalizada";
  scheduleAutoReconnect();
 }
 const rematch=$("onlineResultRematch");
 if(rematch){
  rematch.hidden=phase!=="finished";
  rematch.disabled=rematchBusy;
  rematch.textContent=role==="host"?"🔁 Crear revancha":
   pendingRematchCode?"🔁 Aceptar revancha":
   rematchRequested?"⏳ Esperando al anfitrión":"🔁 Pedir revancha";
 }
 $("myName").textContent=(myNick()||"Tu coche")+" · Carril "+String.fromCharCode(65+laneFor(role||"host",heat||1));
 $("peerName").textContent=(peerNick()||"Rival")+" · Carril "+String.fromCharCode(65+laneFor(other(),heat||1));
}
async function checkRoom(){
 if(!api||!room||roomPolling)return;
 roomPolling=true;
 try{
  const {data,error}=await api.from("slotrace_live_rooms")
    .select("id,code,host_id,guest_id,host_nick,guest_nick,state,laps,track_id,expires_at")
    .eq("id",room.id).single();
  if(error)throw error;
  if(data){
   room=data;updateRoom();
   if(phase==="idle"&&data.state!=="waiting"&&!connected)
    notice("La carrera ya comenzó. Conecta de nuevo o crea otra pista.",true);
  }
 }catch(e){notice("No se puede comprobar la pista: "+safeError(e),true);}
 finally{roomPolling=false;}
}
function updatePresence(){
 if(!room||!channel)return;
 const wasOnline=peerOnline;
 try{
  const state=channel.presenceState();
  const members=Object.values(state).flat();
  peerOnline=members.some(item=>item?.userId&&item.userId!==account?.id);
 }catch(_){peerOnline=false;}
 if(wasOnline&&!peerOnline){
  peerGameReady=false;
  if(role==="host")guestTrackReady=false;
  pauseForReconnect("Tu compañero se ha desconectado · esperando a que vuelva.");
 }
 if(peerOnline)announceRejoinReady();
 updateRoom();
}
async function subscribe(){
 if(reconnectBusy)return;
 reconnectBusy=true;
 try{
 if(channel){try{await api.removeChannel(channel);}catch(_){ }channel=null;}
 connected=false;peerOnline=false;peerGameReady=false;
  if(role==="host")guestTrackReady=false;
  const topic="slotrace-live:"+room.id;
 channel=api.channel(topic,{config:{private:true,broadcast:{self:false,ack:true},presence:{key:account.id}}})
  .on("presence",{event:"sync"},updatePresence)
  .on("broadcast",{event:"track-request"},()=>{
   if(role==="host"){if(sharedTrack)announceTrack();else notifyGame("requestTrack");}
  })
  .on("broadcast",{event:"track"},({payload})=>{
   if(role!=="guest"||!payload?.track||
    !["idle","paused","between"].includes(phase))return;
   // Tras recargar, los dos móviles pueden suscribirse en cualquier orden.
   // El anfitrión reenvía el plano y el invitado confirma el que ya tenía.
   if(phase!=="idle"&&sharedTrack){
    void channel?.send({type:"broadcast",event:"track-ready",
     payload:{ready:true}}).catch(()=>{});
    return;
   }
   guestTrackReady=false;pendingTrack=payload.track;
   notifyGame("checkTrack",{track:payload.track});
  })
  .on("broadcast",{event:"track-ready"},({payload})=>{
   if(role!=="host")return;
   guestTrackReady=payload?.ready===true;
   updateRoom();
  })
  .on("broadcast",{event:"chat"},({payload})=>{
   if(!room||!payload||payload.roomId!==room.id||
     payload.userId!==(role==="host"?room.guest_id:room.host_id)||
     !Number.isSafeInteger(payload.seq)||payload.seq<=lastPeerChatSeq||
     !validLiveChat(payload.text,payload.kind))return;
   const now=Date.now();
   if(chatCooldownRemaining(lastPeerChatAt,now))return;
   lastPeerChatAt=now;
   lastPeerChatSeq=payload.seq;
   notifyGame("chatMessage",{message:{roomId:room.id,kind:payload.kind,
    text:cleanLiveChatText(payload.text),nick:peerNick()||"Rival",mine:false}});
  })
  .on("broadcast",{event:"start"},({payload})=>{
   if(!payload||!Number.isFinite(payload.heat)||!Number.isFinite(payload.startAt))return;
   if(payload.heat!==heat+1)return;
   if(!payload.track||!sharedTrack)return;
   prepareHeat(payload.heat,payload.startAt);
  })
  .on("broadcast",{event:"rematch-request"},({payload})=>{
   if(role!=="host"||phase!=="finished"||!payload||
    payload.roomId!==room?.id||payload.userId!==room.guest_id)return;
   notice("¡Tu compañero quiere revancha! Pulsa «Crear revancha» para preparar la pista.");
   $("onlineResultRematch").textContent="🔁 Aceptar revancha";
  })
  .on("broadcast",{event:"rematch-invite"},({payload})=>{
   if(role!=="guest"||phase!=="finished"||!payload||
    payload.roomId!==room?.id||payload.userId!==room.host_id||
    !/^[A-Z2-9]{7}$/.test(String(payload.code)))return;
   pendingRematchCode=payload.code;
   notice("¡Revancha preparada! Pulsa «Aceptar revancha» para entrar.");
   updateRoom();
   if(rematchRequested)void joinRematch(pendingRematchCode);
  })
  .on("broadcast",{event:"interruption"},({payload})=>{
   if(!room||payload?.roomId!==room.id||
     payload.userId!==(role==="host"?room.guest_id:room.host_id)||
     payload.heat!==heat)return;
   pauseForReconnect("Tu compañero necesita reconectarse. Carrera detenida.");
   announceRejoinReady();
  })
  .on("broadcast",{event:"rejoin-ready"},({payload})=>{
   if(!room||payload?.roomId!==room.id||
     payload.userId!==(role==="host"?room.guest_id:room.host_id)||
     payload.heat!==heat)return;
   if(["racing","countdown"].includes(phase))
    pauseForReconnect("El otro móvil ha vuelto a la pista. Preparando reanudación.");
   if(phase==="paused"){
    peerCanContinue=payload.canContinue===true;
    announceRejoinReady();
    updateRoom();
   }
  })
  .on("broadcast",{event:"reconnect-start"},({payload})=>{
   if(role!=="guest"||phase!=="paused"||
     payload?.roomId!==room?.id||payload.userId!==room.host_id||
     payload.heat!==heat||!Number.isFinite(payload.startAt))return;
   if(payload.restart===true)prepareHeat(heat,payload.startAt,true);
   else resumeInterruptedHeat(payload.startAt);
  })
  .on("broadcast",{event:"state"},({payload})=>{
   if(!payload||payload.heat!==heat||payload.role!==other()||
      !Number.isInteger(payload.seq)||payload.seq<=remoteSeq)return;
   remoteSeq=payload.seq;
   const d=payload.data;
   if(!d||!Number.isFinite(d.distance)||d.distance<0||
      !Number.isFinite(d.elapsed)||d.elapsed<0||
      !Number.isFinite(d.speed)||d.speed<0||d.speed>10000)return;
   if(!remote)return;
   lastPeerStateAt=Date.now();
   remote.distance=d.distance;remote.speed=d.speed;remote.elapsed=d.elapsed;
   remote.deslotFor=Number(d.deslotFor)||0;
   remote.done=Boolean(d.done);remote.lap=Math.min(LIVE_LAPS,Math.max(0,Number(d.lap)||0));
   remote.lapTimes=Array.isArray(d.lapTimes)?d.lapTimes.slice(0,LIVE_LAPS).filter(x=>Number.isFinite(x)&&x>0):[];
   if(embedded)notifyGame("remoteState",{heat,data:d});
   if(remote.done&&remote.lapTimes.length===LIVE_LAPS)
    scores[heat][other()]=lapTotal(remote.lapTimes);
   finishIfBoth();
  });
 channel.subscribe(async status=>{
  if(status==="SUBSCRIBED"){
   connected=true;
   try{await channel.track({userId:account.id,nick:account.nick});}
   catch(e){notice("No se pudo anunciar presencia: "+safeError(e),true);}
   notice(phase==="paused"?
    "Conexión recuperada. Esperando al otro piloto para continuar.":
    "Conexión privada activada. Preparados para competir.");
   notifyGame("chatReady",{roomId:room.id});
   await checkRoom();updatePresence();
   if(embedded){
    if(role==="host"){if(sharedTrack)announceTrack();else notifyGame("requestTrack");}
    else if(role==="guest"){
     if(sharedTrack)void channel.send({type:"broadcast",event:"track-ready",
      payload:{ready:true}}).catch(()=>{});
     else void channel.send({type:"broadcast",event:"track-request",payload:{}}).catch(()=>{});
    }
   }
   if(phase==="paused")announceRejoinReady();
  }else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED"){
   pauseForReconnect("Se perdió la conexión de red. Reconectando la misma pista…");
   connected=false;peerOnline=false;
   notifyGame("chatError",{message:"Sin conexión · recuperando la pista"});
   updateRoom();
   if(reconnectTimer===null)reconnectTimer=setTimeout(()=>{
    reconnectTimer=null;if(room&&!connected)void subscribe();
   },2600);
  }
 });
 }finally{reconnectBusy=false;}
}
async function enterRoom(next,playerRole){
 room=next;role=playerRole;phase="idle";heat=0;
 localGameActive=false;peerCanContinue=false;lastPeerStateAt=0;lastReadySentAt=0;
 pendingRematchCode=null;rematchRequested=false;rematchBusy=false;
 $("raceArea").hidden=true;$("finalBoard").hidden=true;
 document.documentElement.classList.remove("heat-finished");
 sharedTrack=null;pendingTrack=null;guestTrackReady=false;
 local=null;remote=null;sequence=0;remoteSeq=0;
 chatSequence=0;lastPeerChatSeq=0;lastChatAt=0;lastPeerChatAt=0;
 notifyGame("chatReset",{roomId:next.id});
 saveLiveRecovery();updateRoom();notice("Conectando canal privado…");
 await subscribe();await checkRoom();
}
async function recoverPreviousRoom(){
 const cache=readOnlineRejoin(localStorage);
 if(!cache||!account||cache.userId!==account.id)return false;
 try{
  const {data,error}=await api.from("slotrace_live_rooms")
   .select("id,code,host_id,guest_id,host_nick,guest_nick,state,laps,track_id,expires_at")
   .eq("id",cache.roomId).single();
  if(error||!data||data.code!==cache.code||
   (cache.role==="host"?data.host_id!==account.id:data.guest_id!==account.id)||
   new Date(data.expires_at).getTime()<=Date.now())throw Error("Pista caducada o no autorizada");
  const recovered=restoredOnlinePhase(cache,data.state);
  if(!recovered)throw Error("No se pudo reconstruir esta pista");
  room=data;role=cache.role;
  heat=data.state==="heat2"?2:data.state==="heat1"?1:cache.heat;
  phase=recovered;
  sharedTrack=cache.track||null;pendingTrack=null;
  guestTrackReady=false;peerCanContinue=false;localGameActive=false;
  if(Number.isFinite(cache.scores?.[1]?.host)&&Number.isFinite(cache.scores?.[1]?.guest)){
   scores[1].host=cache.scores[1].host;scores[1].guest=cache.scores[1].guest;
  }
  if(phase==="between"){
   local=makeCar(laneFor(role,heat));remote=makeCar(laneFor(other(),heat));
   local.done=true;remote.done=true;
  }else if(phase==="paused"){
   local=makeCar(laneFor(role,heat));remote=makeCar(laneFor(other(),heat));
  }
  $("raceArea").hidden=phase!=="between";
  $("finalBoard").hidden=true;
  document.documentElement.classList.remove("heat-finished");
  if(sharedTrack){
   $("trackSharedName").textContent="Pista recuperada: "+sharedTrack.name+
    " · "+sharedTrack.types.length+" piezas";
   $("trackSharedName").hidden=false;
  }
  notifyGame("chatReset",{roomId:room.id});
  if(phase==="paused")notifyGame("networkHold",{reason:"Esperando a que ambos pilotos estén conectados. Se repetirá la manga interrumpida."});
  updateRoom();
  await subscribe();await checkRoom();
  if(phase==="paused")notice("Pista recuperada. Ambos pilotos deben estar conectados para repetir la manga.");
  else notice("Tu pista anterior está disponible de nuevo.");
  saveLiveRecovery();return true;
 }catch(error){
  clearOnlineRejoin(localStorage);
  notice("No se pudo recuperar la pista anterior: "+safeError(error),true);
  return false;
 }
}
async function create(){
 try{
  if(!account)return;
  $("createRoom").disabled=true;
  let data=null,error=null;
  for(let attempt=0;attempt<3;attempt++){
   ({data,error}=await api.rpc("slotrace_live_create",{p_code:code()}));
   if(!error||!/duplicate|unique/i.test(safeError(error)))break;
  }
  if(error)throw error;
  await enterRoom(data,"host");
 }catch(e){notice("No se pudo crear la pista: "+safeError(e),true);$("createRoom").disabled=false;}
}
async function join(){
 const value=$("joinCode").value.replace(/[^A-Z2-9]/gi,"").toUpperCase();
 if(value.length!==7){notice("Introduce el código de siete caracteres.",true);return;}
 try{
  $("joinRoom").disabled=true;
  const {data,error}=await api.rpc("slotrace_live_join",{p_code:value});
  if(error)throw error;
  await enterRoom(data,"guest");
 }catch(e){notice("No se pudo entrar: "+safeError(e),true);$("joinRoom").disabled=false;}
}
async function joinRematch(nextCode){
 if(rematchBusy||!nextCode)return;
 rematchBusy=true;updateRoom();
 try{
  const {data,error}=await api.rpc("slotrace_live_join",{p_code:nextCode});
  if(error)throw error;
  await enterRoom(data,"guest");
  notice("Revancha preparada. Esperando a que arranque la primera manga.");
 }catch(e){
  rematchBusy=false;
  notice("No se pudo entrar en la revancha: "+safeError(e),true);updateRoom();
 }
}
async function requestRematch(){
 if(phase!=="finished"||rematchBusy||!connected||!channel)return;
 if(role==="guest"){
  if(pendingRematchCode){await joinRematch(pendingRematchCode);return;}
  if(rematchRequested)return;
  rematchRequested=true;updateRoom();
  try{
   const result=await channel.send({type:"broadcast",event:"rematch-request",
    payload:{roomId:room.id,userId:account.id}});
   if(result!=="ok")throw Error("No se pudo notificar al otro piloto");
   notice("Revancha solicitada. Esperando respuesta del anfitrión.");
  }catch(error){rematchRequested=false;notice(safeError(error),true);updateRoom();}
  return;
 }
 rematchBusy=true;updateRoom();
 try{
  let data=null,error=null;
  for(let attempt=0;attempt<3;attempt++){
   ({data,error}=await api.rpc("slotrace_live_create",{p_code:code()}));
   if(!error||!/duplicate|unique/i.test(safeError(error)))break;
  }
  if(error)throw error;
  const result=await channel.send({type:"broadcast",event:"rematch-invite",
   payload:{roomId:room.id,userId:account.id,code:data.code}});
  await enterRoom(data,"host");
  notice(result==="ok"?"Revancha creada y enviada al otro piloto.":
   "Revancha creada. Comparte el nuevo código con tu compañero.");
 }catch(error){rematchBusy=false;updateRoom();notice("No se pudo crear la revancha: "+safeError(error),true);}
}
function resumeInterruptedHeat(when){
 if(phase!=="paused"||!localGameActive)return;
 startAt=when;phase="resume-countdown";lastPeerStateAt=Date.now();
 setStatus("REANUDACIÓN · 3, 2, 1");
 notice("Ambos pilotos conectados. Continuamos desde la posición pausada.");
 notifyGame("networkResumeAt",{heat,startAt:when});
 saveLiveRecovery();updateRoom();
}
async function startHeat(){
 if(role==="host"&&phase==="paused"){
  if(!connected||!peerOnline||!channel||!sharedTrack||!guestTrackReady)return;
  $("startHeat").disabled=true;
  const canContinue=peerCanContinue&&localGameActive;
  const at=Date.now()+4000;
  try{
   const sent=await channel.send({type:"broadcast",event:"reconnect-start",
    payload:{roomId:room.id,userId:account.id,heat,startAt:at,
     restart:!canContinue}});
   if(sent!=="ok")throw Error("No se pudo confirmar la reconexión");
   if(canContinue)resumeInterruptedHeat(at);
   else prepareHeat(heat,at,true);
   notice(canContinue?"Ambos coches reanudan tras la cuenta atrás.":
    "Manga interrumpida reiniciada desde cero. Las anteriores se conservan.");
  }catch(e){notice(safeError(e),true);updateRoom();}
  return;
 }
 if(role!=="host"||!room||!peerOnline||!connected||!sharedTrack||!guestTrackReady||heat>=2)return;
 const next=heat+1;
 if(next===2&&(!local?.done||!remote?.done))return;
 $("startHeat").disabled=true;
 try{
  const {data,error}=await api.rpc("slotrace_live_start",{p_room:room.id,p_heat:next});
  if(error)throw error;
  room=data;
  const at=Date.now()+4000;
  const sent=await channel.send({type:"broadcast",event:"start",
   payload:{heat:next,startAt:at,track:sharedTrack}});
  if(sent!=="ok")throw Error("No se pudo enviar la salida al otro piloto");
  prepareHeat(next,at);
  notice("Salida de manga "+next+" programada para ambos móviles.");
 }catch(e){notice("No se pudo iniciar: "+safeError(e),true);await checkRoom();}
}
function prepareHeat(next,when,restart=false){
 if(embedded){
  if(!sharedTrack){notice("Falta el plano de la pista del anfitrión.",true);return;}
  notifyGame("start",{track:sharedTrack,role,heat:next,startAt:when,opponent:peerNick(),restart});
 }
 heat=next;startAt=when;phase="countdown";sequence=0;remoteSeq=0;
 lastPeerStateAt=when;localGameActive=false;peerCanContinue=false;
 scores[heat][role]=null;scores[heat][other()]=null;
 document.documentElement.classList.remove("heat-finished");
 local=makeCar(laneFor(role,heat));
 remote=makeCar(laneFor(other(),heat));
 $("raceArea").hidden=embedded;$("finalBoard").hidden=true;
 $("heatLabel").textContent="Manga "+heat+" de 2 · "+
  (heat===1?"Primera salida":"Carriles intercambiados");
 setStatus("CUENTA ATRÁS");activateControls(false);
 updateRoom();draw();saveLiveRecovery();
}
function finishIfBoth(){
 if(phase!=="racing"||!local?.done||!remote?.done)return;
 phase=heat===1?"between":"finished";
 activateControls(false);
 scores[heat][role]=lapTotal(local.lapTimes);
 scores[heat][other()]=lapTotal(remote.lapTimes);
 setStatus(heat===1?"MANGA 1 COMPLETADA":"CARRERA COMPLETADA");
 if(phase==="finished")clearOnlineRejoin(localStorage);
 else saveLiveRecovery();
 $("finalBoard").hidden=false;
 updateRoom();
 const result=buildOnlineResultModel({scores,heat,hostNick:room.host_nick,
  guestNick:room.guest_nick,trackName:sharedTrack?.name});
 renderOnlineResultBoard({target:$("scoreLines"),title:$("resultTitle"),model:result});
 if(embedded){
  $("raceArea").hidden=false;
  document.documentElement.classList.add("heat-finished");
  notifyGame("heatComplete",{heat});
 }
 if(role==="host"&&heat===1)updateRoom();
}
function updateStats(){
 if(!local)return;
 $("myTime").textContent=fmt(local.elapsed)+" s";
 $("myLap").textContent="Vuelta "+local.lap+" / "+LIVE_LAPS+
  (local.deslotFor>0?" · SALIDA DE PISTA":"");
 $("peerTime").textContent=fmt(remote?.elapsed||0)+" s";
 $("peerLap").textContent="Vuelta "+(remote?.lap||0)+" / "+LIVE_LAPS+
  (remote?.deslotFor>0?" · SALIDA DE PISTA":"");
}
function sendState(now){
 if(!connected||!channel||!local||phase!=="racing")return;
 // Al cruzar meta se transmite el estado final inmediatamente, sin esperar el
 // siguiente intervalo: el rival debe enterarse incluso si deja de moverse.
 // La PWA padre ya limita los estados a ~4,4 por segundo; el iframe
 // reenvía exactamente esa muestra, sin duplicar el limitador de red.
 const interval=local.done?600:(embedded?0:115);
 if(now-lastSend<interval&&!(local.done&&!local.finalStateSent))return;
 lastSend=now;
 if(local.done)local.finalStateSent=true;
 const data={distance:local.distance,speed:local.speed,elapsed:local.elapsed,
  lap:local.lap,lapTimes:local.lapTimes.slice(),done:local.done,deslotFor:local.deslotFor};
 void channel.send({type:"broadcast",event:"state",
  payload:{heat,role,seq:++sequence,data}}).catch(e=>notice("Error de conexión: "+safeError(e),true));
}
function draw(){
 const canvas=$("trackCanvas"),ctx=canvas.getContext("2d");
 const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;
 const dpr=Math.min(devicePixelRatio||1,2);
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
  canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));
 }
 if(!w||!h)return;
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.clearRect(0,0,w,h);ctx.fillStyle="#0b2532";ctx.fillRect(0,0,w,h);
 const pts=LIVE_TRACK.lanes.flatMap(l=>l.nodes);
 const minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x));
 const minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y));
 const scale=Math.min((w-38)/(maxX-minX+120),(h-38)/(maxY-minY+120));
 const offsetX=(w-(maxX-minX)*scale)/2-minX*scale;
 const offsetY=(h-(maxY-minY)*scale)/2-minY*scale;
 ctx.setTransform(dpr*scale,0,0,dpr*scale,offsetX*dpr,offsetY*dpr);
 for(const lane of LIVE_TRACK.lanes){
  for(const [width,color] of [[76,"#243441"],[4,"#9cbbc8"]]){
   ctx.beginPath();ctx.moveTo(lane.nodes[0].x,lane.nodes[0].y);
   for(const p of lane.nodes.slice(1))ctx.lineTo(p.x,p.y);
   ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin="round";ctx.stroke();
  }
 }
 const finish=carPose(0,0);if(finish){
  ctx.save();ctx.translate(finish.x,finish.y);ctx.rotate(finish.h);
  ctx.fillStyle="#fff";ctx.fillRect(-38,-10,76,20);ctx.restore();
 }
 const cars=room?[{id:"host",car:role==="host"?local:remote,color:"#50efd1"},
  {id:"guest",car:role==="guest"?local:remote,color:"#ffca62"}]:[];
 for(const item of cars){
  if(!item.car)continue;
  const position=carPose(laneFor(item.id,heat||1),item.car.distance);
  if(!position)continue;
  ctx.save();ctx.translate(position.x,position.y);ctx.rotate(position.h+Math.PI/2);
  if(item.car.deslotFor>0)ctx.globalAlpha=.45;
  ctx.fillStyle=item.color;ctx.strokeStyle="#001017";ctx.lineWidth=3;
  ctx.beginPath();ctx.roundRect(-19,-34,38,68,12);ctx.fill();ctx.stroke();
  ctx.fillStyle="#0c2b38";ctx.fillRect(-12,-17,24,20);
  ctx.restore();
 }
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle="#f1fbff";ctx.font="700 12px system-ui";
 ctx.fillText("🟢 "+(room?.host_nick||"Piloto 1")+"    🟠 "+(room?.guest_nick||"Piloto 2"),12,20);
}
function release(){if(local)local.gas=0;$("gasButton").classList.remove("is-on");}
function setupGas(){
 const button=$("gasButton");
 const press=e=>{if(phase!=="racing"||local?.done)return; e.preventDefault();button.setPointerCapture?.(e.pointerId);
  local.gas=Number($("powerSlider").value)/100;button.classList.add("is-on");};
 button.addEventListener("pointerdown",press);
 for(const name of ["pointerup","pointercancel","lostpointercapture"])button.addEventListener(name,release);
 window.addEventListener("blur",release);
 $("powerSlider").addEventListener("input",()=>{
  $("powerValue").textContent=$("powerSlider").value+"%";
  if(button.classList.contains("is-on")&&local)local.gas=Number($("powerSlider").value)/100;
 });
}
function frame(now){
 const dt=lastFrame?Math.min(.05,(now-lastFrame)/1000):0;
 lastFrame=now;
 if(phase==="countdown"||phase==="resume-countdown"){
  const remaining=startAt-Date.now();
  $("countdown").hidden=remaining<=0;
  $("countdown").textContent=String(Math.max(1,Math.ceil(remaining/1000)));
  if(remaining<=0){phase="racing";$("countdown").hidden=true;activateControls(true);setStatus("CARRERA EN DIRECTO");}
 }
 if(phase==="racing"&&remote&&!remote.done&&lastPeerStateAt&&
  Date.now()-Math.max(lastPeerStateAt,startAt)>4600){
  pauseForReconnect("El móvil rival ha dejado de enviar datos. Esperando reconexión.");
 }
 if(phase==="racing"&&!embedded){
  advanceCar(local,dt);
  if(local.done)activateControls(false);
  sendState(now);
  finishIfBoth();
 }
 if(!embedded){updateStats();draw();}
 requestAnimationFrame(frame);
}

window.addEventListener("message",event=>{
 if(!embedded||event.origin!==location.origin||event.source!==window.parent)return;
 const msg=event.data;
 if(!msg||typeof msg.kind!=="string")return;
 if(msg.kind==="slotrace:online:chatSend"&&embedded){
  void sendChat(msg.text,msg.chatKind);
 }else if(msg.kind==="slotrace:online:localHold"){
  pauseForReconnect("Tu móvil ha interrumpido la carrera. Esperando la conexión de ambos.");
 }else if(msg.kind==="slotrace:online:trackError"){
  notice("No se puede compartir tu pista: "+(msg.error||"revisa su cierre y meta"),true);
 }else if(msg.kind==="slotrace:online:hostTrackError"&&role==="host"){
  sharedTrack=null;guestTrackReady=false;
  notice("No se puede compartir esta pista: "+(msg.error||"circuito inválido")+
   ". Vuelve a Competir, elige un circuito cerrado y crea una pista de slot.",true);
  updateRoom();
 }else if(msg.kind==="slotrace:online:hostTrack"&&role==="host"&&msg.track){
  trackAccepted(msg.track);
  announceTrack();
 }else if(msg.kind==="slotrace:online:trackChecked"&&role==="guest"){
  if(msg.ready){
   const track=sharedTrack||pendingTrack;
   if(track)trackAccepted(track);
   guestTrackReady=true;
   notice("Pista prestada lista. No necesitas comprar las piezas.");
   void channel?.send({type:"broadcast",event:"track-ready",
    payload:{ready:true}}).catch(()=>{});
  }else{
   notice("No se puede correr en esa pista: "+(msg.error||"plano inválido"),true);
  }
 }else if(msg.kind==="slotrace:online:localState"&&embedded&&local){
  if((phase==="countdown"||phase==="resume-countdown")&&Date.now()>=startAt)phase="racing";
  if(phase!=="racing")return;
  const d=msg.data;
  if(!d||!Number.isFinite(d.distance)||!Number.isFinite(d.elapsed))return;
  localGameActive=true;
  local.distance=d.distance;local.speed=d.speed;local.elapsed=d.elapsed;
  local.lap=d.lap;local.deslotFor=d.deslotFor;
  local.lapTimes=Array.isArray(d.lapTimes)?d.lapTimes.slice(0,LIVE_LAPS):[];
  local.done=Boolean(d.done);local.rearSlip=d.rearSlip;local.car=d.car;
  sendState(performance.now());finishIfBoth();
 }
});

async function init(){
 setupGas();requestAnimationFrame(frame);
 $("createRoom").addEventListener("click",create);
 $("joinRoom").addEventListener("click",join);
 $("startHeat").addEventListener("click",startHeat);
 $("onlineResultRematch").addEventListener("click",()=>{void requestRematch();});
 $("onlineResultChat").addEventListener("click",()=>notifyGame("openChat"));
 $("onlineResultBack").addEventListener("click",()=>notifyGame("goBack"));
 $("copyInvite").addEventListener("click",async()=>{
  if(!room?.code)return;
  try{
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(room.code);
   else if(navigator.share)await navigator.share({title:"Pista de slot",text:"Código para unirte desde SlotRace → Competir: "+room.code});
   else throw Error("Dile este código a tu compañero: "+room.code);
   notice("Código listo: "+room.code+" · Tu compañero lo escribe dentro de SlotRace.");
  }catch(e){
   notice("Comparte este código: "+room.code+". "+safeError(e));
  }
 });
 const prefill=new URLSearchParams(location.search).get("room");
 if(prefill)$("joinCode").value=prefill.slice(0,7).toUpperCase();
 try{
  const sdk=await import(SDK);
  api=sdk.createClient(URL,KEY,{auth:{storageKey:"craftstudio-slotrace-auth-v1",
   flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{user},error}=await api.auth.getUser();
  if(error||!user||user.is_anonymous)throw Error("Inicia sesión en SlotRace con tu cuenta de CraftRace Studio.");
  const {data:profile,error:lookup}=await api.from("craft_accounts")
   .select("nickname").eq("user_id",user.id).maybeSingle();
  if(lookup)throw lookup;
  if(!profile?.nickname)throw Error("Debes elegir tu nick en Mi cuenta antes de competir online.");
  account={id:user.id,nick:profile.nickname};
  $("identity").textContent="Conectado: "+account.nick;
  $("createRoom").disabled=false;$("joinRoom").disabled=false;
  notice("Cuenta lista. Crea una pista o introduce el código recibido.");
  await recoverPreviousRoom();
 }catch(e){
  $("identity").textContent="No hay una cuenta verificada en este navegador.";
  notice(safeError(e)+" Vuelve al juego para identificarte.",true);
 }
 setInterval(()=>{if(room)void checkRoom();},1700);
 document.addEventListener("visibilitychange",()=>{
  if(document.hidden&&["racing","countdown","resume-countdown"].includes(phase)){
   release();pauseForReconnect("Pista en espera: uno de los pilotos ha cambiado de pantalla.");
  }
 });
 window.addEventListener("pagehide",()=>{saveLiveRecovery();});

}
init();
