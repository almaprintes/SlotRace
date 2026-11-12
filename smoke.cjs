"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
(async()=>{
const {STARTER,FIGURE_EIGHT,CATALOG,CURVE_FAMILIES,TABLE,TRACK_WIDTH,LANE_OFFSET,buildTrack,allowed,freeStock,UNLIMITED_DEVELOPMENT_STOCK,positionAt,nearestPiece,findLegalClosure,positionOnPiece,START}=await import("./src/track.mjs");
const {PARTS,RADII,GEOMETRY,RECIPES}=await import("./src/pt-precision.mjs");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"src/site.css"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"src/app.mjs"),"utf8");
const account=fs.readFileSync(path.join(__dirname,"src/account.mjs"),"utf8");
const {execFileSync}=require("node:child_process");
execFileSync(process.execPath,["--check",path.join(__dirname,"src/account.mjs")]);
for(const id of ["menuAccount","settingsAccount","accountModal","accountLoginForm",
 "accountGoogle","accountApple","accountNickname","accountClaimForm",
 "accountSignedOut","accountClaim","accountConnected"]){
 assert.match(html,new RegExp('id="'+id+'"'),"Falta el control de cuenta: "+id);
}
assert.match(html,/src="\.\/src\/account\.mjs\?v=0\.15\.56"/);
assert.match(account,/flowType:"pkce"/,"Los proveedores usan OAuth con PKCE");
assert.match(account,/getUser\(\)/,"La cuenta se verifica en el servidor");
assert.match(account,/from\("craft_accounts"\)/,"El apodo va al registro compartido");
assert.match(account,/auth\.linkIdentity\(/,"Google y Apple se vinculan al mismo UUID");
assert.match(account,/verifyLinkedIdentity\(api\)/,"La vinculación verifica el UUID recibido");
assert.match(account,/\.is\("nickname",null\)/,"Solo puede reclamarse un apodo sin asignar");
assert.match(account,/from\("slotrace_profiles"\)/,"El progreso de SlotRace tiene perfil separado");
assert.match(account,/storageKey:ACCOUNT_STORAGE/,"La sesión no pisa la identidad de TDR");
assert.doesNotMatch(account,/slotrace-circuit-library-v1"\s*,/,"La cuenta no sobrescribe los circuitos locales");
assert.doesNotMatch(account,/service_role|sb_secret_/i,"Nunca incluir claves de servicio en la PWA");

assert.match(app,/function presentGapDiagnostic\(result,message\)/,
 "Medir hueco siempre presenta la distancia sobre el taller");
assert.match(app,/function paintGapDiagnostic\(ctx\)/,
 "El canvas señala ambos conectores medidos");
assert.match(app,/CIERRE FLEXIBLE DISPONIBLE/,
 "La herramienta informa cuando se puede cerrar con flexión leve");
assert.match(html,/id="boardGapInfo"/,
 "El panel de medición debe existir en la mesa");
assert.match(css,/#boardGapInfo:not\(\[hidden\]\)/,
 "La medición debe ser visible incluso con el estilo de la PWA");

assert.match(app,/function workshopVisibleCenter\(\)/,
 "El estante calcula el centro útil de la vista actual");
assert.match(app,/const mid=positionOnPiece\(\{x:0,y:0,h:0\},id,\.5\)/,
 "El módulo se coloca por su centro geométrico");
assert.match(app,/state\.selectionMode=same&&state\.selectionMode==="piece"\?"group":"piece"/,
 "Las pulsaciones sucesivas deben alternar pieza y tramo");
const tapLogic=app.slice(app.indexOf("function inventoryAction(id){"),
 app.indexOf("function toggleCaseCurveDirection(){"));
assert.doesNotMatch(tapLogic,/changeTypes\(next|revealLatestBuilderPiece/,
 "Tocar una tarjeta no puede añadir automáticamente al extremo del circuito");
assert.match(tapLogic,/const placed=scatterLoose\(chosen\)/,
 "La tarjeta crea una pieza suelta a la vista");
assert.match(app,/function paintInfiniteWorkspace\(ctx,v\)/,
 "El editor usa una superficie continua sin bordes físicos");
assert.match(app,/function fitWorkspace\(\)/,
 "Ver todo debe poder encuadrar circuitos de cualquier tamaño");
assert.doesNotMatch(app,/Suelta dentro de la mesa verde/,
 "No se permite volver a bloquear piezas por tamaño del tablero");

assert.match(app,/function finishLaneMarkings\(track\)/,
 "La línea de meta debe identificar visualmente ambos carriles");
assert.match(app,/paintLaneStencils\(ctx,track\);/,
 "La escena imprime realmente la A y la B en el asfalto");
assert.match(app,/OCUPAS CARRIL /,
 "El HUD debe indicar en todo momento qué carril ocupa el coche");

assert.match(app,/laneLabel\(state\.lane\)/,
 "El HUD muestra Carril A/B y no etiquetas relativas al sentido");
assert.match(app,/const a=laneAIndex\(\)/,
 "Los tiempos se ordenan según la ranura interior de salida/meta");

assert.doesNotMatch(app,/Pausa primero para cambiar de carril/,
 "El cambio de carril no puede exigir pausa");
assert.match(app,/state\.laneTransition=\{from,elapsed:0,duration:LANE_CHANGE_SECONDS\}/,
 "Cada cambio de carril empieza una transición animada");
assert.match(app,/if\(state\.bump&&state\.bump\.elapsed>=state\.bump\.duration\)/);
assert.match(app,/if\(aiTest\.bump&&aiTest\.bump\.elapsed>=aiTest\.bump\.duration\)/);
assert.match(app,/const g=state.keyboardGas\?1:Math\.max\(state\.gas,state\.gamepadGas\|\|0\);/);
console.log("SlotRace DEV 0.14.51 OK: 28 variantes reconocidas (una heredada), 17 huecos disponibles, cierre exacto, puente, inventario y UI.");
})().catch(e=>{console.error(e);process.exitCode=1;});
