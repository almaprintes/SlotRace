"use strict";
const assert=require("node:assert/strict");
(async()=>{
 const {runTimingDiagnostics}=await import("../src/timing-lab.mjs");
 const {advanceElapsedMonotonic,interpolateCrossingElapsed}=await import("../src/timing-core.mjs");
 const report=runTimingDiagnostics();
 assert.equal(report.results.length,7);
 assert.equal(report.passed,true,JSON.stringify(report.results));
 assert.ok(report.results[3].warningCount>0,"Un bloqueo de 1 s requiere revisión");
 assert.ok(report.results[4].warningCount>0,"Un bloqueo de 3 s requiere revisión");
 assert.equal(advanceElapsedMonotonic(500,100,99).regression,true);
 assert.equal(advanceElapsedMonotonic(500,100,700).frameGap,true);
 assert.equal(interpolateCrossingElapsed(10000,40,50,100),9980);
 assert.throws(()=>interpolateCrossingElapsed(10000,40,150,100));
 const fs=require("node:fs");
 const app=fs.readFileSync(require("node:path").join(__dirname,"../src/app.mjs"),"utf8");
 assert.match(app,/advanceElapsedMonotonic\(/,"El reloj visible debe usar el mismo núcleo");
 assert.match(app,/interpolateCrossingElapsed\(/,"Meta interpolada obligatoria");
 assert.match(app,/completeLap\(raceClock\.crossingElapsedMs\(/,"Cruce real ligado al paso por meta");
 assert.match(app,/next\.deltaMs>50\.5/,"Un frame con tiempo físico perdido invalida récords");
 assert.match(app,/const valid=state\.x350Crossings===1[^\n]*state\.lapEligible/,
  "También el cruce de dos carriles debe respetar la validez de la vuelta");
 console.log("SlotRace timing LAB OK: 7 grupos, 1000 cruces, 60/30/15 FPS, 1/3 s bloqueo, pausas");
})().catch(e=>{console.error(e);process.exitCode=1});
