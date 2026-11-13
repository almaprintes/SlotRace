"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const {duelScoreboard}=await import("../src/duel-scoreboard.mjs");
 const src=fs.readFileSync("src/app.mjs","utf8");
 const start=src.indexOf("function renderDuelResults(){"),end=src.indexOf("\nfunction renderSessionSummary(){",start);
 assert.ok(start>=0&&end>start,"Renderizador de resultados real accesible");
 const section=src.slice(start,end);
 function makeNode(tag){
  const n={tagName:tag.toUpperCase(),className:"",children:[],attributes:{},_text:""};
  Object.defineProperty(n,"textContent",{get(){return this._text},
    set(v){this._text=String(v);this.children=[];}});
  n.appendChild=function(child){this.children.push(child);child.parent=this;return child};
  n.setAttribute=function(k,v){this.attributes[k]=String(v)};
  return n;
 }
 function render(playerLaps,aiLaps,targetLaps=5,phase=2){
  const nodes=new Map([["resultsStats",makeNode("div")],["resultsLaps",makeNode("div")]]);
  const $=key=>nodes.get(key);
  const document={createElement:makeNode};
  const state={sessionLaps:playerLaps,targetLaps,twoLegPhase:phase,
   selectedCar:"gripline",sessionCar:"gripline"};
  const aiTest={sessionLaps:aiLaps};
  const CAR_MODELS={gripline:{name:"Avenir Gripline"},spark:{name:"Helix Spark"}};
  const format=n=>n.toFixed(3).replace(".",",");
  const factory=new Function("$","document","duelScoreboard","state","aiTest",
    "CAR_MODELS","format",section+"\nreturn renderDuelResults;");
  factory($,document,duelScoreboard,state,aiTest,CAR_MODELS,format)();
  return nodes;
 }
 function descendant(node,tag){return [node,...node.children.flatMap(n=>descendant(n,tag))]
   .filter(n=>!tag||n.tagName===tag.toUpperCase());}
 function visible(node){return [node.textContent,...node.children.map(visible)].join(" ");}
 const p=[4.326,3.421,3.777,3.707,3.536,3.677,3.173,3.124,3.124,3.124]
  .map((seconds,i)=>({heat:i<5?1:2,number:i+1,seconds}));
 const a=[6.506,6.253,6.242,6.253,6.251,5.532,5.277,5.277,5.277,5.277]
  .map((seconds,i)=>({heat:i<5?1:2,number:i%5+1,seconds}));
 const n=render(p,a),stats=n.get("resultsStats"),laps=n.get("resultsLaps");
 assert.match(visible(stats),/HAS GANADO A LA IA/);
 assert.match(visible(stats),/34,989 s/);
 assert.match(visible(stats),/58,145 s/);
 assert.match(visible(stats),/\+23,156 s/);
 assert.equal(descendant(laps,"table").length,3,"Tabla de mangas y una por manga");
 assert.equal(descendant(laps,"tbody").length,3);
 assert.deepEqual(descendant(laps,"tbody").map(x=>x.children.length),[2,5,5]);
 assert.match(visible(laps),/\+2,832 s/);
 assert.match(visible(laps),/3,124 s/);
 assert.ok(descendant(laps).some(x=>x.className?.includes("duel-best-lap")));
 assert.equal(descendant(laps,"th").filter(x=>x.attributes.scope==="col").length,12);
 const partial=render(p.slice(0,5),a.slice(0,5),5,1);
 assert.match(visible(partial.get("resultsStats")),/Primera manga completada/);
 assert.doesNotMatch(visible(partial.get("resultsStats")),/34,989 s/);
 assert.equal(descendant(partial.get("resultsLaps"),"table").length,2);
 const css=fs.readFileSync("src/site.css","utf8");
 assert.match(css,/\.duel-score-table\{width:100%;table-layout:fixed/);
 assert.match(css,/@media\(max-width:370px\)/);
 const html=fs.readFileSync("index.html","utf8");
 assert.match(html,/id="resultsSectionTitle"/);
 assert.match(html,/id="resultsSectionHint"/);
 assert.match(html,/<details class="results-audit-details">/);
 console.log("Results UI: 4-column responsive tables, 2 legs, 10 laps, screen reader headings and visible best laps OK");
})().catch(e=>{console.error(e);process.exitCode=1;});
