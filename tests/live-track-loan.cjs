"use strict";
const assert=require("node:assert/strict");
(async()=>{
 const {prepareSlotTrackLoan,openSlotTrackLoan}=await import("../src/live-track-loan.mjs");
 const {STARTER,START}=await import("../src/track.mjs");
 const host={types:["START350",...STARTER.slice(1)],origin:START,
  raisedParts:[],direction:1,name:"Óvalo de Juanfrikazo",
  inventory:[],credits:0,records:{"record":"secret"},creator:"Host"};
 // Deliberadamente: el INVITADO no posee ninguna de estas piezas.
 const loan=prepareSlotTrackLoan(host);
 assert.equal(loan.permission,"race-only");assert(!("inventory" in loan));
 assert(!("credits" in loan));assert(!("records" in loan));
 assert(!("creator" in loan));assert.equal(loan.name,host.name);
 const guestCollection={types:[],pieces:[],records:{},credits:12,library:[]};
 const before=JSON.stringify(guestCollection);
 const guest=openSlotTrackLoan(loan);
 assert.equal(guest.borrowed,true);assert.equal(guest.track.valid,true);
 assert.equal(guest.types.length,host.types.length);
 assert.equal(JSON.stringify(guestCollection),before,"No cambia el inventario del invitado");
 assert.throws(()=>openSlotTrackLoan({...loan,types:["START350","NO_EXISTE"]}),/inválido|desconocidas/);
 assert.throws(()=>openSlotTrackLoan({...loan,permission:"permanent"}),/temporal/);
 assert.throws(()=>openSlotTrackLoan({...loan,types:loan.types.filter(t=>t!=="START350")}),/salida|inválido/);
 assert.equal("saved" in guest,false);
 console.log("OK: pista online prestada sin piezas ni guardado, rechaza planos inválidos y PT82 no arbitrada");
})().catch(e=>{console.error(e);process.exitCode=1});
