"use strict";
// DEV 0.14.44: cierre flexible físico (<10 mm), tanto por defecto
// como por exceso, y continuidad visual/física sin costura final.
const assert=require("node:assert/strict");
(async()=>{
 const geo=await import("../src/track.mjs");
 const pt=await import("../src/pt-precision.mjs");
 const p=(id,r)=>id==="s"?(r===75?"S075":r===87.5?"S0875":"S"+r):
  "R"+(r/150)+"_"+(id==="22"?"225":"45")+"R";
 const recipe=(raw)=>raw.map((r,i)=>p(
   [0,1,6,11].includes(i)?"s":[2,3,4,5,12,13,14,15].includes(i)?"22":"45",r));
 const cases=[
  {label:"sobran",raw:[87.5,75,150,150,150,450,350,300,300,300,300,350,150,450,150,300],sign:-1},
  {label:"faltan",raw:[87.5,87.5,300,150,450,150,75,300,300,300,300,175,150,150,150,150],sign:1}
 ];
 assert.equal(geo.FORCE_CLOSE_MM,10);
 assert.equal(geo.closureWithinFlex(0,0,60),true);
 assert.equal(geo.closureWithinFlex(9.999,0,60),true);
 assert.equal(geo.closureWithinFlex(10,0,60),false);
 assert.equal(geo.closureWithinFlex(10.01,0,60),false);
 assert.equal(geo.closureWithinFlex(8,Math.PI/180,60),true);
 assert.equal(geo.closureWithinFlex(8,Math.PI/180+1e-5,60),false);
 assert.equal(geo.closureWithinFlex(8,0,3),false);
 for(const c of cases){
  const types=recipe(c.raw);
  assert.ok(types.every(id=>geo.CATALOG[id]),"Pieza existente: "+types);
  const path=pt.trace(types);
  const m=geo.gapAnalysis.measureGap(path.end,{x:0,y:0,h:0},geo.CATALOG);
  assert.equal(Math.sign(m.forward),c.sign,"Ambos sentidos de holgura: "+c.label);
  assert.ok(path.gap>3&&path.gap<10,"Hueco comprobable entre 3 y 10 mm");
  assert.ok(Math.abs(path.headingGap)<1e-8);
  const track=geo.buildTrack(types,{x:0,y:0,h:0});
  assert.equal(track.closed,true,"Cerrar con holgura de "+c.label);
  assert.equal(track.forcedClosure,true);
  assert.ok(Math.abs(track.gap-path.gap)<1e-6);
  assert.ok(Math.abs(track.ends.end.x)<1e-8&&Math.abs(track.ends.end.y)<1e-8);
  for(let i=1;i<track.parts.length;i++){
   const a=track.parts[i-1].end,b=track.parts[i].start;
   assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-6,
    "El flexado mantiene juntas las piezas "+i+" en "+c.label);
   assert.ok(Math.abs(Math.atan2(Math.sin(a.h-b.h),Math.cos(a.h-b.h)))<1e-8);
  }
  const begin=track.points[0],end=track.points.at(-1);
  assert.ok(Math.hypot(end.x-begin.x,end.y-begin.y)<1e-8,
   "La calzada acaba EXACTAMENTE sobre la salida");
  for(const lane of track.lanes){
   const first=lane.nodes[0],last=lane.nodes.at(-1);
   assert.ok(Math.hypot(last.x-first.x,last.y-first.y)<1e-7,
    "Ambos carriles sin grietas al completar la vuelta "+c.label);
   const nearly=geo.positionAt(lane,lane.total-.1);
   const firstPose=geo.positionAt(lane,0);
   assert.ok(Math.hypot(nearly.x-firstPose.x,nearly.y-firstPose.y)<1,
    "El coche cruza la meta sin teletransporte en el carril "+lane.side);
  }
  const rebuilt=geo.buildTrack(types,{x:0,y:0,h:0});
  assert.deepEqual(rebuilt.lanes[0].lengths,track.lanes[0].lengths,
   "El cierre flexible se regenera sin guardar geometrías deformadas");
 }
 const testLarge=geo.buildTrack(["S350","R2_45R","S350","R2_45R"]);
 assert.equal(testLarge.closed,false,"No cerrar trazados con huecos grandes");
 console.log("Cierre flexible <10 mm por defecto y exceso, orientación y carriles continuos: OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
