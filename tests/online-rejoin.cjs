"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const {ONLINE_REJOIN_KEY,ONLINE_REJOIN_TTL_MS,validOnlineRejoin,
  readOnlineRejoin,persistOnlineRejoin,clearOnlineRejoin,restoredOnlinePhase,
  reconnectRoomFromCode,canAutoReconnectHeat}=
  await import("../src/online-rejoin.mjs");
 const now=Date.now();
 const storage=new Map(),api={
  getItem:k=>storage.get(k)||null,
  setItem:(k,v)=>storage.set(k,v),
  removeItem:k=>storage.delete(k)
 };
 const sample={roomId:"d8de3f50-cfbf-402d-a1c0-88eac722ae04",
  code:"W7WAWNV",role:"guest",userId:"user-a",phase:"racing",heat:2,
  track:{name:"Mónaco Slot",types:["START350"]},
  scores:{1:{host:41.569,guest:42.575},2:{host:null,guest:null}}};
 assert.equal(persistOnlineRejoin(api,sample,now),true);
 const restored=readOnlineRejoin(api,now+500);
 assert.equal(restored.code,sample.code);
 assert.equal(restored.heat,2);
 assert.equal(restored.track.name,"Mónaco Slot");
 assert.equal(restoredOnlinePhase(restored,"heat2"),"paused",
  "Tras recargar no se inventan ni distancias ni tiempos: se repite la manga");
 assert.equal(restoredOnlinePhase({...restored,phase:"between",heat:1},"heat1"),"between",
  "Primera manga terminada se conserva para empezar segunda");
 assert.equal(restoredOnlinePhase(restored,"heat1"),"paused");
 assert.equal(validOnlineRejoin({...restored,phase:"finished"},now),false,
  "Una carrera ya terminada no se recupera como si estuviese activa");
 assert.equal(validOnlineRejoin({...restored,role:"hacker"},now),false);
 assert.equal(validOnlineRejoin({...restored,updatedAt:now-ONLINE_REJOIN_TTL_MS-1},now),false);
 assert.equal(readOnlineRejoin(api,now+ONLINE_REJOIN_TTL_MS+1),null,
  "La pista caducada no reaparece después de una hora");
 assert.equal(storage.has(ONLINE_REJOIN_KEY),false);
 persistOnlineRejoin(api,sample,now);
 clearOnlineRejoin(api);assert.equal(storage.has(ONLINE_REJOIN_KEY),false);
 const returningRoom={id:sample.roomId,code:sample.code,state:"heat2",
   host_id:"host-a",guest_id:"user-a"};
  const manual=reconnectRoomFromCode(returningRoom,"guest","user-a",null,now);
  assert.equal(manual?.phase,"paused",
   "Volver a introducir el código no puede reiniciar la manga a idle");
  assert.equal(manual?.heat,2,
   "El invitado debe recuperar manga 2 desde la pista compartida");
  assert.equal(manual?.track,null,
   "Si falta caché, hay que pedir otra vez el plano prestado");
  const cached=reconnectRoomFromCode(returningRoom,"guest","user-a",
   {...sample,version:1,updatedAt:now},now);
  assert.equal(cached?.track?.name,"Mónaco Slot");
  assert.equal(reconnectRoomFromCode(returningRoom,"guest","intruso",null,now),null);
  const ready={role:"host",phase:"paused",connected:true,peerOnline:true,
   peerGameReady:true,localGameReady:true,guestTrackReady:true,
   sharedTrack:{name:"Mónaco Slot"},guestId:"user-a",pending:false};
  assert.equal(canAutoReconnectHeat(ready),true);
  assert.equal(canAutoReconnectHeat({...ready,peerGameReady:false}),false,
   "El anfitrión NO debe arrancar antes de confirmar el motor Android");
  assert.equal(canAutoReconnectHeat({...ready,guestTrackReady:false}),false);
  assert.equal(canAutoReconnectHeat({...ready,peerOnline:false}),false);
  assert.equal(canAutoReconnectHeat({...ready,pending:true}),false);
  const live=fs.readFileSync("src/live-duel.mjs","utf8");
 const app=fs.readFileSync("src/app.mjs","utf8");
 const chat=fs.readFileSync("src/online-chat-ui.mjs","utf8");
 const css=fs.readFileSync("src/site.css","utf8");
 assert.match(live,/async function recoverPreviousRoom\(/);
  assert.match(live,/reconnectRoomFromCode\(next,playerRole/);
  assert.match(live,/scheduleAutoReconnect\(\)/);
  assert.match(live,/event:"earlier-scores"/);
  assert.match(app,/slotrace:online:prepareRejoin/);
  assert.match(app,/postToLive\("gameReady"/);
 assert.match(live,/async function subscribe\(/);
 assert.match(live,/channel\.presenceState\(\)/);
 assert.match(live,/event:"interruption"/);
 assert.match(live,/event:"rejoin-ready"/);
 assert.match(live,/event:"reconnect-start"/);
 assert.match(live,/phase==="paused"/);
 assert.match(live,/payload\.restart===true/);
 assert.match(live,/lastPeerStateAt/);
 assert.match(app,/function holdOnlineRace\(/);
 assert.match(app,/raceClock\.pause\(now,\{record:false\}\)/,
  "Se pausa el cronómetro real al detener por red");
 assert.match(app,/raceClock\.resume\(now\)/,
  "Se recupera el mismo reloj tras la cuenta atrás");
 assert.match(app,/if\(liveRace\.active&&liveRace\.hold\)/,
  "La física no avanza durante la desconexión");
 assert.match(app,/postToLive\("localHold"\)/,
  "Al cerrar la app se informa al rival");
 assert.match(app,/if\(liveRace\.active&&restart\)stopRealOnlineHeat\(\)/,
  "Si se recarga la PWA se vuelve a comenzar la manga, no toda la carrera");
 assert.match(chat,/button\.addEventListener\("pointerdown"/,
  "El segundo dedo puede abrir el chat manteniendo el primer dedo en el gas");
 assert.match(chat,/if\(kind==="quick"\)\{opened=false;unread=0;refresh\(\);\}/,
  "La bandeja se cierra en el toque de emoji");
 assert.match(css,/\.online-chat-dock\.is-racing button/);
 assert.match(css,/touch-action:none/);
 assert.ok(app.includes("readOnlineRejoin(localStorage)"));
 console.log("OK · reentrada segura, pausa bilateral, 3s, FPS, dos mangas, multitouch y emoji se cierra");
})().catch(error=>{console.error(error);process.exitCode=1});
