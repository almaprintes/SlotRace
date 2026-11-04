const assert=require("node:assert/strict");
(async()=>{
 const {GEOMETRY,RADII,PARTS,SPECIALS,RECIPES,endpoint,trace}=await import("../src/pt-precision.mjs");
 assert.equal(GEOMETRY.trackWidth,156);
 assert.equal(GEOMETRY.lanePitch,78);
 assert.deepEqual(Object.values(RADII),[136,292,448,604]);
 for(const id of ["R1","R2","R3"]){
  const next="R"+(Number(id[1])+1);
  assert.equal(RADII[next]-RADII[id],GEOMETRY.trackWidth,
    "Las curvas concéntricas deben tocarse sin huecos ni solapamientos");
 }
 assert.equal(PARTS.S0875.length*4,PARTS.S350.length);
 assert.equal(PARTS.S175.length*2,PARTS.S350.length);
 assert.equal(PARTS.S584.length,2*RADII.R2);
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
 assert.equal(Object.keys(PARTS).length,20);
 console.log("PT-Precision OK: 20 piezas dirigidas, radios concéntricos, equivalencias angulares, óvalo y ocho exactos.");
})().catch(e=>{console.error(e);process.exitCode=1;});
