"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
(async()=>{
const {STARTER,FIGURE_EIGHT,CATALOG,CURVE_FAMILIES,TABLE,TRACK_WIDTH,LANE_OFFSET,buildTrack,allowed,freeStock,UNLIMITED_DEVELOPMENT_STOCK,positionAt,nearestPiece,findLegalClosure,positionOnPiece,START}=await import("./src/track.mjs");
const {PARTS,RADII,GEOMETRY,RECIPES}=await import("./src/pt-precision.mjs");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"src/site.css"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"src/app.mjs"),"utf8");
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
assert.equal(Object.keys(CATALOG).length,27);
assert.equal(Object.keys(PARTS).length,27);
assert.equal(Object.keys(CATALOG).filter(id=>!CATALOG[id].legacy&&(!id.includes("_")||id.endsWith("R"))).length,16);
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
assert.match(html,/DEV 0\.14\.30/);
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
for(const id of ["menuLibrary","menuGarage","menuStore","menuSettings","libraryScreen","garageScreen","storeScreen","settingsScreen","settingsSound","settingsGrid"]){
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
for(const id of ["settingsCameraGeneral","settingsCameraFollow","settingsCameraDescription"]){
 assert.match(html,new RegExp('id="'+id+'"'),"Selector de cámara "+id);
}
assert.match(css,/\.camera-mode-choices/);
assert.match(css,/\.camera-choice\[aria-pressed="true"\]/);
assert.match(app,/const FOLLOW_ZOOM=2/);
assert.match(app,/function updateFollowCamera\(dt\)/);
assert.match(app,/function resetFollowCamera\(\)/);
assert.match(app,/cameraMode:state.cameraMode/);
assert.match(css,/\.shop-blueprint-art/);
assert.match(app,/function shopBlueprintSvg\(/);
assert.match(app,/const layout=buildTrack\(types,START\)/);
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
assert.match(app,/DIAL_STEP=5/);
assert.match(app,/const g=state.keyboardGas\?1:state.gas;/);
console.log("SlotRace DEV 0.14.30 OK: 27 variantes reconocidas (una heredada), 16 huecos disponibles, cierre exacto, puente, inventario y UI.");
})().catch(e=>{console.error(e);process.exitCode=1;});
