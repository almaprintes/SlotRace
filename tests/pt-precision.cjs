const assert=require("node:assert/strict");
(async()=>{
 const {GEOMETRY,RADII,PARTS,SPECIALS,RECIPES,endpoint,trace}=await import("../src/pt-precision.mjs");
 assert.equal(GEOMETRY.trackWidth,150);
 assert.equal(GEOMETRY.lengthUnit,12.5);
 assert.equal(GEOMETRY.lanePitch,75);
 assert.deepEqual(Object.values(RADII),[150,300,450,600]);
 for(const id of ["R1","R2","R3"]){
  const next="R"+(Number(id[1])+1);
  assert.equal(RADII[next]-RADII[id],GEOMETRY.trackWidth,
    "Las curvas concéntricas deben tocarse sin huecos ni solapamientos");
 }
 assert.equal(PARTS.S0875.length*4,PARTS.S350.length);
 assert.equal(PARTS.S175.length*2,PARTS.S350.length);
 assert.equal(PARTS.S600.length,2*RADII.R2);
 assert.equal(PARTS.START350.length,PARTS.S350.length);
 for(const [id,p] of Object.entries(PARTS)){
  const a=endpoint({x:0,y:0,h:0},id);
  assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y)&&Number.isFinite(a.h),id);
  if(p.kind==="curve")assert.ok(p.radius>0&&p.degrees>0);
 }
 for(const radiusId of Object.keys(RADII)){
  const half=`${radiusId}_225R`, full=`${radiusId}_45R`;
  const circle=trace(Array(16).fill(half));
  assert.ok(circle.exact,`Círculo exacto ${radiusId} 22.5°: ${circle.gap}`);
  if(PARTS[full]){
   const pair=trace([half,half]);
   const single=trace([full]);
   assert.ok(Math.hypot(pair.end.x-single.end.x,pair.end.y-single.end.y)<1e-10);
   assert.ok(Math.abs(pair.end.h-single.end.h)<1e-10);
  }
 }
 for(const [name,recipe] of Object.entries(RECIPES)){
  const out=trace(recipe);
  assert.ok(out.exact,`Receta ${name} debe cerrar matemáticamente: ${JSON.stringify(out)}`);
 }
 assert.equal(PARTS.R1_90R.degrees,90);
 assert.equal(SPECIALS.X350.requiresLaneRouting,true);
 assert.equal(SPECIALS.BRIDGE.requiresElevation,true);
 assert.equal(Object.keys(PARTS).length,21);
 const straights=Object.entries(PARTS).filter(([,p])=>p.kind==="straight");
 assert.equal(straights.length,7,"Seis longitudes y la salida/meta");
 for(const [id,p] of straights){
  assert.ok(Number.isInteger(p.length/GEOMETRY.lengthUnit),id+" no usa unidades exactas");
 }
 for(const radius of Object.values(RADII))
  assert.ok(Number.isInteger(radius/GEOMETRY.lengthUnit));
 const sameDistance=[
  ["S350"],["S175","S175"],
  Array(4).fill("S0875"),["S175","S0875","S075",...Array(1).fill("S0125")]
 ];
 const baseline=trace(sameDistance[0]).end;
 for(const recipe of sameDistance){
  const end=trace(recipe).end;
  assert.ok(Math.hypot(end.x-baseline.x,end.y-baseline.y)<1e-9,
   "Las combinaciones suman exactamente 350 mm: "+recipe);
 }
 // Otro ejemplo combinando una recta larga con las medidas de los dos
 // extremos: todas las combinaciones dan el mismo avance de 600 mm.
 const others=[["S600"],["S350","S175","S075"],
  Array(8).fill("S075"),["S350","S175","S075"]];
 const ref=trace(others[0]).end;
 for(const seq of others){
  const end=trace(seq).end;
  assert.ok(Math.hypot(end.x-ref.x,end.y-ref.y)<1e-9,
   "Mismo avance nominal en diferente número de rectas: "+seq);
 }

 console.log("SR-Precision OK: 21 IDs, 6 longitudes de rectas, unidad 12,5 mm, equivalencias de tramos, radios concéntricos, óvalo y ocho exactos.");
})().catch(e=>{console.error(e);process.exitCode=1;});
