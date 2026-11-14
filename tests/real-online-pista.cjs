"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const app=fs.readFileSync("src/app.mjs","utf8");
const client=fs.readFileSync("src/live-duel.mjs","utf8");
const html=fs.readFileSync("live.html","utf8");
const a=app.indexOf("function restoreLiveTrack(){");
const b=app.indexOf("\nfunction onlineTrackPreview(",a);
assert(a>0&&b>a,"El préstamo necesita restauración de la pista original");
const original={
 types:["ORIGINAL"],origin:{x:123,y:456,h:0},bridgeParts:[3],track:{name:"original"},
 direction:-1,name:"Mi circuito",workBoard:{width:1600},sessionMode:"practice",
 targetLaps:5,selectedCar:"spark",lane:1,sessionLaps:[{seconds:5}],twoLegPhase:1
};
const state={
 types:["START350"],origin:{x:0,y:0,h:0},bridgeParts:[],track:{name:"prestada"},
 driveDirection:1,circuitName:"Pista prestada",workBoard:{width:2200},
 sessionMode:"lap_race",targetLaps:3,selectedCar:"gripline",lane:0,
 sessionLaps:[],twoLegPhase:2
};
const liveRace={backup:{...original}};
const restore=new Function("state","liveRace",app.slice(a,b)+"\nreturn restoreLiveTrack;")(state,liveRace);
restore();
for(const [property,source] of Object.entries({
 types:"types",origin:"origin",bridgeParts:"bridgeParts",track:"track",
 driveDirection:"direction",circuitName:"name",workBoard:"workBoard",
 sessionMode:"sessionMode",targetLaps:"targetLaps",selectedCar:"selectedCar",
 lane:"lane",sessionLaps:"sessionLaps",twoLegPhase:"twoLegPhase"
}))assert.deepEqual(state[property],original[source],"Debe restaurar "+property);
assert.equal(liveRace.backup,null,"No persiste el préstamo fuera de la carrera");
assert.match(app,/if\(liveRace\.active\)\{stopRealOnlineHeat\(\);return true;\}/,
 "Salir de la carrera online no debe pasar por pagos ni récords locales");
assert.match(app,/if\(msg\.kind==="slotrace:online:requestTrack"\)postToLive\("hostTrackError"/,
 "Errores de pista deben comunicarse al anfitrión");
assert.match(client,/msg\.kind==="slotrace:online:hostTrackError"/);
assert.match(client,/notifyGame\("checkTrack"/,
 "El invitado verifica el plano antes de correr");
assert.match(html,/else location\.replace\("\.\/index\.html"\)/,
 "La antigua URL no debe volver a abrir el minijuego");
console.log("OK: pista prestada reversible, salida sin CR, plano verificado y acceso solo desde SlotRace");
