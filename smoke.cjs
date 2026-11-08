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
assert.match(html,/src="\.\/src\/account\.mjs\?v=0\.15\.4"/);
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
assert.match(app,/if\(!state\.lapEligible\|\|state\.laneTransition\)/,
 "Las vueltas que combinan carriles no producen récords");
assert.match(app,/const p=displayDrivingPose\(\)/,
 "La cámara debe seguir el movimiento interpolado del coche");

const groundBase=app.slice(app.indexOf("function paintGroundTrack("),
 app.indexOf("// Rayos X:"));
assert.match(groundBase,/paintContinuousTrack\(ctx,track,editing\)/,
 "El suelo y las rampas deben compartir una base visual continua");
const builderPainter=app.slice(app.indexOf("function paintContinuousTrack("),
 app.indexOf("const elevatedDeckCache"));
assert.match(builderPainter,/transitionStarts=track\.bridge\?/,
 "En el taller se omiten solo las costuras geométricas de suelo/rampa");
assert.match(builderPainter,/!transitionStarts\?\.has\(part\.index\)\)paintSeam/,
 "Los otros módulos conservan sus juntas");
const sceneBody=app.slice(app.indexOf("function renderScene("),
 app.indexOf("function screenToWorld("));
assert.doesNotMatch(sceneBody,/paintElevationJoins\(/,
 "No permitir un parche de conectores por encima del puente");
assert.doesNotMatch(sceneBody,/paintBridgeRampProfile\(ctx,part,track\)/,
 "Los indicadores de rampa no pueden interrumpir los raíles de la pista ensamblada");
const selectionPainter=app.slice(app.indexOf("function paintBridgeSelection("),
 app.indexOf("function renderScene("));
assert.doesNotMatch(selectionPainter,/TRACK_WIDTH\s*\+\s*28/,
 "La selección del puente no debe rellenar el asfalto de amarillo");
assert.match(selectionPainter,/strokePath\(ctx,translated\(points,offset\)/,
 "La selección del puente solo subraya los dos bordes");
const raisedPainter=app.slice(app.indexOf("function elevatedDeckRuns("),
 app.indexOf("function paintOpaqueRibbon("));
assert.doesNotMatch(raisedPainter,/paintPoints|paintOffsets|smoothEnd/,
 "No se prolongan las capas elevadas sobre las piezas a ras de suelo");
assert.match(raisedPainter,/return\{indices,points,offsets:/,
 "El camino elevado conserva exactamente el trazado de sus módulos");
const crossingClip=app.slice(app.indexOf("function crossingClipPolygons("),
 app.indexOf("function paintElevatedDeck("));
assert.match(crossingClip,/track\.bridge\?\.crossings/,
 "La oclusión utiliza únicamente cruces geométricos verificados");
assert.match(crossingClip,/groundDeckRuns\(track\)/,
 "La máscara superior debe cubrir toda la huella de la pista inferior");
assert.match(crossingClip,/profileLower/,
 "Las rampas también pueden pasar por debajo de otro tramo elevado");
assert.doesNotMatch(crossingClip,/40\/length|margin=Math\.min|Math\.min\(\.24/,
 "No volver a truncar el recorte 40 mm antes de un conector");
const elevatedPainter=app.slice(app.indexOf("function paintElevatedDeck("),
 app.indexOf("// Reglas de oclusión por INTERSECCIÓN"));
assert.match(elevatedPainter,/ctx\.clip\(\)/,
 "La segunda capa opaca siempre debe recortarse al cruce real");
assert.doesNotMatch(elevatedPainter,/paintOpaqueRibbon\(ctx,paintPoints,paintOffsets\)/,
 "Prohibido repintar rampas y curva de suelo con extremos solapados");

assert.equal(Object.keys(CATALOG).length,28);
assert.equal(Object.keys(PARTS).length,28);
assert.equal(Object.keys(CATALOG).filter(id=>!CATALOG[id].legacy&&(!id.includes("_")||id.endsWith("R"))).length,17);
assert.equal(CATALOG.S0125.legacy,true,"Existing saved 12.5mm circuits remain readable");
assert.deepEqual(Object.values(RADII),[150,300,450,600]);
const familyIds=["R1","R2","R3","R4"];
const historic=["G · PT/52","F · PT/51","H · PT/53","M · PT/84"];
for(const [i,id] of familyIds.entries()){
 assert.equal(CURVE_FAMILIES[id].radius,RADII[id],"Radio SR estable: "+id);
 assert.equal(CURVE_FAMILIES[id].classicCode,historic[i],"Código Classic orientativo");
 if(i)assert.equal(RADII[id]-RADII[familyIds[i-1]],TRACK_WIDTH,
  "Los arcos y cuatro radios conservan paso modular: "+id);
 const anglePieces=id==="R1"?["R1_90R"]:id==="R2"?
  ["R2_45R","R2_45R"]:Array(4).fill(id+"_225R");
 const arc=buildTrack(anglePieces,START),last=arc.ends.end;
 assert.ok(Math.abs(last.x-START.x-RADII[id])<1e-6,"90° termina en radio correcto");
 assert.ok(Math.abs(last.y-START.y-RADII[id])<1e-6);
 assert.ok(Math.abs(last.h-Math.PI/2)<1e-9,"90° exactos");
}
assert.equal(CURVE_FAMILIES.R4.classicApproxMm,null,
 "El radio exacto de la PT/84 histórica no se da por certificado");
assert.equal(TRACK_WIDTH,150);assert.equal(LANE_OFFSET,37.5);
assert.equal(GEOMETRY.lanePitch,75);
assert.equal(CATALOG.S075.length,75);
assert.equal(CATALOG.S0875.length,87.5);
assert.equal(CATALOG.S175.length,175);
assert.equal(CATALOG.S350.length,350);
assert.equal(CATALOG.S600.length,600);
assert.equal(CATALOG.START350.length,350);
assert.equal(CATALOG.X350.length,350);
assert.equal(CATALOG.X350.laneChanger,true);
assert.equal(freeStock(["X350"],"X350"),0);
assert.equal(allowed(["X350","X350"]),false);
assert.equal(CATALOG.R2_45R.radius,300);
assert.equal(CATALOG.R1_90L.radius,150);
for(const [id,radius] of [["R2_90R",300],["R3_90R",450],["R4_90R",600]]){
 assert.equal(CATALOG[id].radius,radius);
 assert.equal(CATALOG[id.slice(0,-1)+"L"].angle,-Math.PI/2);
 const part=buildTrack([id],START);
 assert.equal(part.parts.length,1,"Una curva de 90° es una sola pieza");
 assert.ok(Math.abs(part.ends.end.x-START.x-radius)<1e-6);
 assert.ok(Math.abs(part.ends.end.y-START.y-radius)<1e-6);
}
for(const id of Object.keys(CATALOG)){
 assert.ok(CATALOG[id].length>0||CATALOG[id].radius>0,"Geometría definida: "+id);
 const end=positionOnPiece(START,id,1);
 assert.ok([end.x,end.y,end.h].every(Number.isFinite),"Transformación finita: "+id);
}
for(const id of ["R1","R2","R3","R4"]){
 const right=id+"_225R",left=id+"_225L";
 const r=positionOnPiece(START,right,1),l=positionOnPiece(START,left,1);
 assert.ok(Math.abs(r.x-l.x)<1e-8);
 assert.ok(Math.abs(r.y+l.y-START.y*2)<1e-8);
 assert.ok(Math.abs(r.h+l.h)<1e-8);
 const full=buildTrack(Array(16).fill(right));
 assert.equal(full.closed,true,"Círculo "+id);
 assert.ok(full.gap<1e-6,"Cierre exacto "+id);
}
const oval=buildTrack(STARTER),eight=buildTrack(FIGURE_EIGHT);
assert.equal(oval.parts.length,12);
assert.equal(oval.closed,true);assert.equal(oval.valid,true);
assert.equal(oval.intersection,false);
assert.ok(oval.length>3000&&oval.length<5000);
assert.deepEqual(STARTER,RECIPES.ovalR2);
assert.deepEqual(FIGURE_EIGHT,RECIPES.eightR2);
assert.equal(eight.parts.length,14);
assert.equal(eight.closed,true);assert.equal(eight.valid,true);
assert.equal(eight.intersection,true);assert.ok(eight.gap<1e-6);
assert.deepEqual(eight.bridge.overParts,[7]);assert.deepEqual(eight.bridge.underParts,[0]);
assert.equal(eight.bridge.height,65);assert.equal(eight.onTable,true);
const flat=buildTrack([...FIGURE_EIGHT.slice(1),FIGURE_EIGHT[0]]);
assert.equal(flat.bridge,null,"No crear puentes en trazados no homologados");
const almost=buildTrack(STARTER.slice(0,-1));
assert.equal(almost.closed,false);
const solved=findLegalClosure(STARTER.slice(0,-1));
assert.equal(solved.ok,true);assert.equal(solved.replaced,0);
assert.equal(solved.added,1);assert.deepEqual(solved.types,STARTER);
assert.ok(buildTrack(solved.types).valid);
const surplus=buildTrack([...STARTER,"S175"]);
assert.equal(surplus.closed,false);assert.ok(surplus.gap>=170);
assert.ok(!buildTrack([]).valid);
assert.equal(allowed(Array(80).fill("R4_225L")),true);
assert.equal(allowed(["S350","NO_EXISTE"]),false);
assert.equal(UNLIMITED_DEVELOPMENT_STOCK,true);
assert.equal(freeStock(Array(80).fill("R2_45R"),"R2_45R"),Infinity);
assert.equal(freeStock([],"NO_EXISTE"),0);
const p=positionAt(oval.lanes[0],oval.lanes[0].total/2);
assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
assert.equal(nearestPiece(oval,oval.parts[0].points[3].x,oval.parts[0].points[3].y).index,0);
assert.ok(oval.lanes[0].total>oval.lanes[1].total);
assert.match(html,/DEV 0\.15\.4/);
for(const id of ["editCanvas","raceCanvas","pieces","caseInterior","caseToggle","rotate","rotateCCW","builderSelectionTools","bridgeDock","flip","measureGap","gapInfo","autoClose","eight","oval","trigger","gridToggle","loadingScreen"]){
 assert.match(html,new RegExp('id="'+id+'"'),"Componente "+id);
}
assert.match(css,/\.foam-pocket/);assert.match(css,/foam-insert/);
assert.match(html,/class="screen builder-screen builder-workbench"/,
 "Taller centrado en la mesa, no en páginas de caja");
assert.match(css,/\.builder-workbench \.builder-scroll[\s\S]*?overflow:hidden!important/,
 "La mesa evita el scroll vertical general");
assert.match(html,/Girar selección 22,5 grados en sentido antihorario/,
 "Giro antihorario accesible");
assert.match(html,/Girar selección 22,5 grados en sentido horario/,
 "Giro horario accesible");
for(const id of ["menuLibrary","menuGarage","menuStore","menuSettings","libraryScreen","garageScreen","storeScreen","settingsScreen","settingsSound","settingsMotor","settingsGrid"]){
 assert.match(html,new RegExp('id="'+id+'"'),"Pantalla comercial "+id);
}
assert.match(css,/\.hub-screen/);
 for(const id of ["builderScroll","caseStraights","caseCurves","caseSpecial","caseBridges","casePrev","caseNext","casePageInfo","moveGroup"]){
  assert.match(html,new RegExp('id="'+id+'"'),"Nueva interfaz de montaje "+id);
 }
 assert.match(css,/\.builder-scroll/);
 assert.match(css,/\.case-category-tab/);
 assert.match(css,/\.pocket-qty-controls/);
 assert.match(html,/id="caseMountGuide"/);
assert.match(html,/<div class="right">[\s\S]*?id="templateToggle"/,
 "La imagen es un botón principal, no está escondida en Más");
for(const id of ["pieceShelfBack","pieceShelfForward","pieceShelfArrows"])
 assert.match(html,new RegExp('id="'+id+'"'),"Navegación directa del estante "+id);
assert.match(css,/\.builder-workbench #pieceCase \.foam-pocket[\s\S]*?touch-action:pan-x!important/,
 "Las tarjetas permiten scroll horizontal nativo en iPhone");
 for(const id of ["templateToggle","templatePanel","templateLoad","templateFile","templateOpacity","templateScale","templateRotate","templateFit","templateMove","templateVisibility","templateExport"])assert.match(html,new RegExp('id="'+id+'"'),"Plantilla de referencia "+id);
 assert.match(css,/\.builder-workbench \.template-panel/);
 assert.match(css,/\.case-mount-guide/);
assert.match(css,/\.result-row\.is-best-left/);
assert.match(css,/\.result-row\.is-best-right/);
assert.match(css,/\.session-best-label/);
for(const id of ["circuitDeleteDialog","deleteCircuitName","deleteCircuitConfirm","deleteCircuitCancel"]){
 assert.match(html,new RegExp('id="'+id+'"'),"Eliminar de Mis circuitos "+id);
}
assert.match(css,/\.library-swipe/);
assert.match(app,/function selectSavedCircuit\(id\)/,"Tocar el nombre selecciona sin navegación");
assert.match(app,/loadSavedCircuit\(id,\{stayInLibrary=false\}=\{\}\)/);
assert.match(css,/\.library-swipe\.is-selected \.library-entry/);
assert.match(css,/\.library-name\[aria-pressed="true"\]/);
assert.match(css,/\.library-delete/);
assert.match(css,/\.circuit-delete-overlay\[hidden\]/);
for(const id of ["libraryDraftRecovery","libraryRecoverDraft","libraryTabCircuits","libraryTabRecords","libraryRecordsPanel","libraryRecordsList"]){
 assert.match(html,new RegExp('id="'+id+'"'),"Secciones y rescate de Mis circuitos "+id);
}
assert.doesNotMatch(html,/id="libraryVersionRecovery"/,"Historial recuperado ya no se muestra");
assert.doesNotMatch(html,/id="libraryRestoreVersion"/,"No aparece recuperar versión");
for(const id of ["shopProducts","shopFeatured","shopCollectionSummary","shopTabBoxes","shopTabPacks",
 "shopTabCircuits","shopTabCars","shopProductModal","shopModalTitle","shopModalPrimary","shopOwnedList"]){
 assert.match(html,new RegExp('id="'+id+'"'),"Tienda comercial "+id);
}
assert.match(css,/\.shop-box-visual/);
assert.match(css,/\.shop-products-boxes/);
assert.match(css,/\.shop-real-blueprint/);
for(const id of ["settingsCameraGeneral","settingsCameraFollow","settingsCameraCustom",
 "settingsCameraCustomPanel","settingsCameraZoom","settingsCameraZoomValue","settingsCameraDescription"]){
 assert.match(html,new RegExp('id="'+id+'"'),"Selector de cámara "+id);
}
assert.match(css,/\.camera-mode-choices/);
assert.match(css,/\.camera-choice\[aria-pressed="true"\]/);
assert.match(app,/const FOLLOW_ZOOM=2/);
assert.match(app,/id:"plan-catalunya"/,"Catalunya sustituye al Sprint urbano de tienda");
assert.match(app,/const LOCAL_CREATOR="Juanfrikazo-dev"/);
assert.match(app,/function circuitCreator\(\)/);
assert.match(app,/creator:circuitCreator\(\)/,
 "La receta JSON lleva su creador");
assert.match(app,/const creatorText="CREADOR: "/,
 "El nombre del creador aparece en el PNG");
assert.doesNotMatch(app,/id:"plan-urban"/);
assert.match(app,/const CATALUNYA_SLOT_TYPES=Object\.freeze\(/);
assert.match(app,/shopBlueprintSvg\(product\.types,product\.name,product\.origin\|\|START\)/);
assert.match(app,/FOLLOW_CUSTOM_MAX_ZOOM=30/);
assert.match(app,/function setFollowZoom\(value\)/);
assert.match(css,/\.camera-zoom-panel\[hidden\]/);
assert.match(app,/function updateFollowCamera\(dt\)/);
assert.match(app,/function updateChronometer\(\)/,"El reloj refresca la lectura con cada fotograma");
assert.match(app,/function drawTableArtwork\(ctx,b\)/,"La madera y el fieltro se prerenderizan");
assert.match(app,/const strokeGeometryCache=new WeakMap\(\)/,"La geometría no se regenera cada fotograma");
assert.match(app,/const FOLLOW_CUSTOM_RESPONSE=10/);
assert.match(app,/function cachedTrackOffset\(track,offset\)/);
assert.match(app,/function resetFollowCamera\(\)/);
assert.match(app,/cameraMode:state.cameraMode/);
assert.match(css,/\.shop-blueprint-art/);
assert.match(app,/function shopBlueprintSvg\(/);
assert.match(app,/const frame=\{x:x\+13,y:353/,
 "El área del plano comienza debajo del nombre");
assert.match(app,/const radii=\[21,18,15,12\]/,
 "Identificadores adaptativos en curvas muy juntas");
assert.match(app,/titleLines:nameLines/,
 "El nombre completo se exporta a una o dos líneas");
assert.match(app,/const layout=buildTrack\(types,origin\)/);
assert.match(app,/shop-blueprint-bridge/);
for(const id of ["garageChooseGripline","garageChooseSpark","garageCarGripline",
 "garageCarSpark","raceCarName","garageStatusSpark"]){
 assert.match(html,new RegExp('id="'+id+'"'),"Selección de coches "+id);
}
assert.ok(fs.existsSync(path.join(__dirname,"assets/cars/helix_spark.webp")),
 "Sprite cenital original de Spark empaquetado en el juego");
assert.match(app,/assets\/cars\/helix_spark\.webp/);
assert.match(app,/selectedCar:old\?\.selectedCar/);
assert.match(app,/function selectCar\(id\)/);
assert.match(app,/helix-spark/);
assert.match(css,/\.shop-bottom-nav/);
for(const id of ["mainNavigation","navMenu","navBuild","navLibrary","navGarage","navStore","mastSettings"]){
 assert.match(html,new RegExp('id="'+id+'"'),"Navegación global "+id);
}
assert.match(css,/\.home-screen \.home-scroll/,"La portada adapta altura sin desplazamiento");
assert.match(css,/\.home-screen \.home-actions/,"La portada usa rejilla de accesos");
assert.match(css,/overflow:hidden!important/);
assert.match(css,/\.main-navigation/);
assert.match(css,/\.hub-screen \.hub-back\{display:none!important/,"Evita accesos repetidos");
assert.match(css,/\.shop-screen \.shop-bottom-nav\{display:none!important/,"Tienda sin una segunda barra");
assert.match(html,/<html lang="es">/);
assert.match(html,/ACELERADOR/);
assert.match(html,/ACELERAR/);
assert.match(app,/setLabel\("play","Jugar"\)/);
assert.match(app,/Clics desactivados/);
assert.match(app,/const SHOP_PRODUCTS=/);
assert.match(app,/function shopInstallPlan\(/);
assert.match(css,/\.home-hero-photo/);assert.match(css,/\.combined-best/);
assert.match(html,/slotrace-duelo-curva\.avif/);
assert.doesNotMatch(html,/class="hero-slot-track"/,"La portada no dibuja otra pista sobre la foto");
assert.match(html,/avenir_gripline_threequarter\.webp/);
assert.match(html,/helix_spark_threequarter\.webp/);
for(const fragment of ["function paintTable(","function paintTrack(","function paintBridgeCrossing(","function snapLoose(","function foamSlotSVG(","function flipSelectedCurve(","function palette(","function simulation(","function closeExactly("]){
 assert.ok(app.includes(fragment),fragment);
}
assert.match(app,/const KEY="slotrace-lab-10"/);
assert.match(app,/splash.classList.add\("is-done"\)/);
assert.match(app,/DIAL_STEP=1/,"La rueda usa incrementos de 1%");
assert.match(app,/DIAL_PX_PER_CLICK=1\.4/,"140 px cubren el recorrido 0–100%");
assert.match(app,/DIAL_SOUND_INTERVAL=5/,"Sonidos cada cinco puntos porcentuales");
assert.ok(app.includes('MOTOR_AUDIO_URL="./assets/audio/slotrace-motor-loop.mp3"'));
assert.ok(app.includes("source.loop=true"));
const motorAsset=fs.readFileSync(path.join(__dirname,"assets/audio/slotrace-motor-loop.mp3"));
assert.ok(motorAsset.length>50000&&motorAsset.length<1000000);
assert.equal(motorAsset.subarray(0,3).toString(),"ID3");
assert.match(app,/const g=state.keyboardGas\?1:state.gas;/);
console.log("SlotRace DEV 0.14.51 OK: 28 variantes reconocidas (una heredada), 17 huecos disponibles, cierre exacto, puente, inventario y UI.");
})().catch(e=>{console.error(e);process.exitCode=1;});
