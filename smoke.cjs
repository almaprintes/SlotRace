"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
(async()=>{
const {STARTER,FIGURE_EIGHT,CATALOG,TABLE,TRACK_WIDTH,LANE_OFFSET,buildTrack,allowed,freeStock,UNLIMITED_DEVELOPMENT_STOCK,positionAt,nearestPiece,findLegalClosure,positionOnPiece,START}=await import("./src/track.mjs");
const {PARTS,RADII,GEOMETRY,RECIPES}=await import("./src/pt-precision.mjs");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"src/site.css"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"src/app.mjs"),"utf8");
assert.equal(Object.keys(CATALOG).length,20);
assert.equal(Object.keys(PARTS).length,20);
assert.equal(Object.keys(CATALOG).filter(id=>!id.includes("_")||id.endsWith("R")).length,13);
assert.deepEqual(Object.values(RADII),[136,292,448,604]);
assert.equal(TRACK_WIDTH,156);assert.equal(LANE_OFFSET,39);
assert.equal(GEOMETRY.lanePitch,78);
assert.equal(CATALOG.S078.length,78);
assert.equal(CATALOG.S0875.length,87.5);
assert.equal(CATALOG.S175.length,175);
assert.equal(CATALOG.S350.length,350);
assert.equal(CATALOG.S584.length,584);
assert.equal(CATALOG.START350.length,350);
assert.equal(CATALOG.R2_45R.radius,292);
assert.equal(CATALOG.R1_90L.radius,136);
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
assert.match(html,/DEV 0\.9\.6/);
for(const id of ["editCanvas","raceCanvas","pieces","caseInterior","caseToggle","rotate","flip","autoClose","eight","oval","trigger","gridToggle","loadingScreen"]){
 assert.match(html,new RegExp('id="'+id+'"'),"Componente "+id);
}
assert.match(css,/\.foam-pocket/);assert.match(css,/foam-insert/);
for(const fragment of ["function paintTable(","function paintTrack(","function paintBridgeCrossing(","function snapLoose(","function foamSlotSVG(","function flipSelectedCurve(","function palette(","function simulation(","function closeExactly("]){
 assert.ok(app.includes(fragment),fragment);
}
assert.match(app,/const KEY="slotrace-lab-09"/);
assert.match(app,/splash.classList.add\("is-done"\)/);
assert.match(app,/DIAL_STEP=5/);
assert.match(app,/const g=state.keyboardGas\?1:state.gas;/);
console.log("SlotRace DEV 0.9.6 OK: 20 geometrías dirigidas, 13 huellas, cierre exacto, puente, inventario y UI.");
})().catch(e=>{console.error(e);process.exitCode=1;});
