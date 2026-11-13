"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict");
(async()=>{
 const geo=await import("../src/track.mjs");
 const {canonicalCompetitionTrack}=await import("../server/track-identity.mjs");
 const monaco=JSON.parse(fs.readFileSync("tests/fixtures/monaco-slot.json","utf8"));
 const doble=JSON.parse(fs.readFileSync("tests/fixtures/doble-ovalo.json","utf8"));
 const app=fs.readFileSync("src/app.mjs","utf8");
 const match=app.match(/const CATALUNYA_SLOT_TYPES=Object\.freeze\((\[[\s\S]*?\])\);/);
 assert.ok(match,"El circuito Catalunya debe existir");
 const cat=JSON.parse(match[1]);
 const eight=geo.FIGURE_EIGHT;
 function check(name,types,raised=[],direction=1) {
   let catalog=null,competitive=null;
   const track=geo.buildTrack(types,geo.START,raised);
   try{catalog=canonicalCompetitionTrack({types,raisedParts:raised,driveDirection:direction});competitive="valid";}
   catch(e){competitive=String(e.message);}
   const report={name,parts:types.length,startFinish:types.filter(x=>x==="START350").length,
      valid:track.valid,closed:track.closed,gap:Math.round(track.gap*1000)/1000,
      crossings:track.crossings.length,bridge:track.bridge?.valid??null,
      laneChangerIndex:track.laneChangerIndex,competition:competitive,
      hash:catalog?.fingerprint?.slice(0,12)};
   console.log(JSON.stringify(report));
 }
 check("monaco-original",monaco.types,[],monaco.direction);
 check("monaco-start",monaco.types.map((id,i)=>i===monaco.types.indexOf("S350")?"START350":id),[],monaco.direction);
 check("catalunya",cat);
 check("doble-ovalo-original",doble.types,doble.bridgeParts,doble.direction);
 check("doble-ovalo-start",doble.types.map((id,i)=>i===doble.types.indexOf("S350")?"START350":id),doble.bridgeParts,doble.direction);
 check("eight-original",eight);
 check("eight-start",["START350","S175","S075",...eight.slice(1)],[9]);
})().catch(e=>{console.error(e);process.exitCode=1});
