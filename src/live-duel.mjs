// Top Down RACE: SlotRace · enlace privado entre dos móviles.
// Beta técnica independiente: resultados sin homologación y sin CR.
import {LIVE_TRACK,LIVE_LAPS,roomCode,laneFor,carPose,makeCar,advanceCar,lapTotal} from "./live-duel-core.mjs?v=0.15.70";
const URL="https://juukbnkjboiazqggqcyv.supabase.co";
const KEY="sb_publishable_l5cHUHrGHoFzGqmUyfQKSA_d3VjWksB";
const SDK="https://esm.sh/@supabase/supabase-js@2.119.0?target=es2022";
const $=id=>document.getElementById(id);
let api=null,account=null,room=null,role=null,channel=null,connected=false;
let peerOnline=false,phase="idle",heat=0,startAt=0,local=null,remote=null;
let lastFrame=0,lastSend=0,roomPolling=false,refreshStamp=0,sequence=0,remoteSeq=0;
const scores={1:{host:null,guest:null},2:{host:null,guest:null}};
const fmt=x=>(Number(x)||0).toFixed(3).replace(".",",");
const other=()=>role==="host"?"guest":"host";
const myNick=()=>role==="host"?room?.host_nick:room?.guest_nick;
const peerNick=()=>role==="host"?room?.guest_nick:room?.host_nick;
function notice(msg,error=false){$("notice").textContent=msg;$("notice").classList.toggle("error",error);}
function setStatus(msg){$("liveStatus").textContent=msg;}
function activateControls(active){$("gasButton").disabled=!active;if(!active){$("gasButton").classList.remove("is-on");if(local)local.gas=0;}}
function code(){const bytes=new Uint8Array(7);crypto.getRandomValues(bytes);return roomCode(bytes);}
function safeError(error){return error?.message||String(error)||"Error de conexión";}
function roleLabel(player){return player===role?" (tú)":"";}
function updateRoom(){
 if(!room)return;
 $("roomBox").hidden=false;$("roomCode").textContent=room.code;
 $("roomNames").textContent=(room.host_nick||"Anfitrión")+
  " VS "+(room.guest_nick||"Esperando piloto");
 $("identity").textContent="Sesión: "+account.nick+" · Sala "+room.code;
 $("copyInvite").disabled=false;
 const joined=Boolean(room.guest_id);
 $("connectionStatus").textContent=joined?
  (peerOnline?"🟢 Dos pilotos conectados":"🟡 Rival registrado. Esperando conexión en directo…"):
  "🟡 Falta el segundo piloto";
 const btn=$("startHeat");
 btn.hidden=role!=="host";
 if(role==="host"){
  const ready=joined&&connected&&peerOnline&&
   ((heat===0&&room.state==="waiting")||
    (heat===1&&phase==="between"&&room.state==="heat1"&&
      local?.done&&remote?.done));
  btn.disabled=!ready;
  btn.textContent=heat===0?"🏁 Empezar primera manga":
    heat===1?"🏁 Iniciar segunda manga":"Carrera finalizada";
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
    notice("El duelo ya comenzó. Conecta de nuevo o crea una sala nueva.",true);
  }
 }catch(e){notice("No se puede comprobar la sala: "+safeError(e),true);}
 finally{roomPolling=false;}
}
function updatePresence(){
 if(!room||!channel)return;
 try{
  const state=channel.presenceState();
  const members=Object.values(state).flat();
  peerOnline=members.some(item=>item?.userId&&item.userId!==account?.id);
 }catch(_){peerOnline=false;}
 updateRoom();
}
async function subscribe(){
 if(channel){await api.removeChannel(channel);channel=null;}
 connected=false;peerOnline=false;
 const topic="slotrace-live:"+room.id;
 channel=api.channel(topic,{config:{private:true,broadcast:{self:false,ack:true},presence:{key:account.id}}})
  .on("presence",{event:"sync"},updatePresence)
  .on("broadcast",{event:"start"},({payload})=>{
   if(!payload||!Number.isFinite(payload.heat)||!Number.isFinite(payload.startAt))return;
   if(payload.heat!==heat+1)return;
   prepareHeat(payload.heat,payload.startAt);
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
   remote.distance=d.distance;remote.speed=d.speed;remote.elapsed=d.elapsed;
   remote.deslotFor=Number(d.deslotFor)||0;
   remote.done=Boolean(d.done);remote.lap=Math.min(LIVE_LAPS,Math.max(0,Number(d.lap)||0));
   remote.lapTimes=Array.isArray(d.lapTimes)?d.lapTimes.slice(0,LIVE_LAPS).filter(x=>Number.isFinite(x)&&x>0):[];
   if(remote.done&&remote.lapTimes.length===LIVE_LAPS)
    scores[heat][other()]=lapTotal(remote.lapTimes);
   finishIfBoth();
  });
 channel.subscribe(async status=>{
  if(status==="SUBSCRIBED"){
   connected=true;
   try{await channel.track({userId:account.id,nick:account.nick});}
   catch(e){notice("No se pudo anunciar presencia: "+safeError(e),true);}
   notice("Conexión privada activada. Preparados para competir.");
   await checkRoom();updatePresence();
  }else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"){
   connected=false;peerOnline=false;activateControls(false);
   notice("Se perdió el canal online. Recarga para volver a conectarte.",true);
   updateRoom();
  }
 });
}
async function enterRoom(next,playerRole){
 room=next;role=playerRole;phase="idle";heat=0;
 local=null;remote=null;sequence=0;remoteSeq=0;
 updateRoom();notice("Conectando canal privado…");
 await subscribe();await checkRoom();
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
 }catch(e){notice("No se pudo crear la sala: "+safeError(e),true);$("createRoom").disabled=false;}
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
async function startHeat(){
 if(role!=="host"||!room||!peerOnline||!connected||heat>=2)return;
 const next=heat+1;
 if(next===2&&(!local?.done||!remote?.done))return;
 $("startHeat").disabled=true;
 try{
  const {data,error}=await api.rpc("slotrace_live_start",{p_room:room.id,p_heat:next});
  if(error)throw error;
  room=data;
  const at=Date.now()+4000;
  const sent=await channel.send({type:"broadcast",event:"start",
   payload:{heat:next,startAt:at}});
  if(sent!=="ok")throw Error("No se pudo enviar la salida al otro piloto");
  prepareHeat(next,at);
  notice("Salida de manga "+next+" programada para ambos móviles.");
 }catch(e){notice("No se pudo iniciar: "+safeError(e),true);await checkRoom();}
}
function prepareHeat(next,when){
 heat=next;startAt=when;phase="countdown";sequence=0;remoteSeq=0;
 local=makeCar(laneFor(role,heat));
 remote=makeCar(laneFor(other(),heat));
 $("raceArea").hidden=false;$("finalBoard").hidden=true;
 $("heatLabel").textContent="Manga "+heat+" de 2 · "+
  (heat===1?"Primera salida":"Carriles intercambiados");
 setStatus("CUENTA ATRÁS");activateControls(false);
 updateRoom();draw();
}
function finishIfBoth(){
 if(phase!=="racing"||!local?.done||!remote?.done)return;
 phase=heat===1?"between":"finished";
 activateControls(false);
 scores[heat][role]=lapTotal(local.lapTimes);
 scores[heat][other()]=lapTotal(remote.lapTimes);
 setStatus(heat===1?"MANGA 1 COMPLETADA":"DUELO COMPLETADO");
 $("finalBoard").hidden=false;
 if(heat===1){
  $("resultTitle").textContent="Manga 1 completada · Cambio de carriles";
 }else{
  const mine=scores[1][role]+scores[2][role];
  const theirs=scores[1][other()]+scores[2][other()];
  const winner=Math.abs(mine-theirs)<.001?"Empate":
    mine<theirs?"Gana "+myNick():"Gana "+peerNick();
  $("resultTitle").textContent="🏆 "+winner;
 }
 const lines=[];
 for(let i=1;i<=heat;i++){
  const a=scores[i].host,b=scores[i].guest;
  lines.push("<div class='scoreline'><span>Manga "+i+"</span><strong>"+
   (a===null?"—":fmt(a)+"s")+"</strong><strong>"+(b===null?"—":fmt(b)+"s")+"</strong></div>");
 }
 if(heat===2){
  const host=scores[1].host+scores[2].host;
  const guest=scores[1].guest+scores[2].guest;
  lines.push("<div class='scoreline'><span>TOTAL</span><strong>"+fmt(host)+"s</strong><strong>"+fmt(guest)+"s</strong></div>");
 }
 $("scoreLines").innerHTML="<small>"+room.host_nick+" / "+room.guest_nick+"</small>"+lines.join("");
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
 const interval=local.done?600:115;
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
 if(phase==="countdown"){
  const remaining=startAt-Date.now();
  $("countdown").hidden=remaining<=0;
  $("countdown").textContent=String(Math.max(1,Math.ceil(remaining/1000)));
  if(remaining<=0){phase="racing";$("countdown").hidden=true;activateControls(true);setStatus("CARRERA EN DIRECTO");}
 }
 if(phase==="racing"){
  advanceCar(local,dt);
  if(local.done)activateControls(false);
  sendState(now);
  finishIfBoth();
 }
 updateStats();draw();requestAnimationFrame(frame);
}
async function init(){
 setupGas();requestAnimationFrame(frame);
 $("createRoom").addEventListener("click",create);
 $("joinRoom").addEventListener("click",join);
 $("startHeat").addEventListener("click",startHeat);
 $("copyInvite").addEventListener("click",async()=>{
  const link=new URL(location.pathname,location.origin);
  link.searchParams.set("room",room.code);
  try{
   if(navigator.share)await navigator.share({title:"Duelo SlotRace",url:link.toString()});
   else if(navigator.clipboard)await navigator.clipboard.writeText(link.toString());
   else throw Error("Copia manualmente el código de sala");
   notice("Invitación preparada para tu rival.");
  }catch(e){notice(safeError(e),true);}
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
  notice("Cuenta lista. Crea una sala o introduce el código recibido.");
 }catch(e){
  $("identity").textContent="No hay una cuenta verificada en este navegador.";
  notice(safeError(e)+" Vuelve al juego para identificarte.",true);
 }
 setInterval(()=>{if(room)void checkRoom();},1700);
 document.addEventListener("visibilitychange",()=>{
  if(document.hidden&&phase==="racing"){release();notice("Has cambiado de pantalla durante la carrera; cronometraje no homologado.",true);}
 });
}
init();
