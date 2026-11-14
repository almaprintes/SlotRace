"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const {duelPresentation}=await import("../src/duel-presentation.mjs");
 const player=[
  {heat:1,number:1,seconds:4.326},{heat:1,number:2,seconds:3.421},
  {heat:1,number:3,seconds:3.777},{heat:1,number:4,seconds:3.707},
  {heat:1,number:5,seconds:3.536},
  {heat:2,number:6,seconds:3.677},{heat:2,number:7,seconds:3.173},
  {heat:2,number:8,seconds:3.124},{heat:2,number:9,seconds:3.124},
  {heat:2,number:10,seconds:3.124}
 ];
 const ai=[
  {heat:1,number:1,seconds:6.506},{heat:1,number:2,seconds:6.253},
  {heat:1,number:3,seconds:6.242},{heat:1,number:4,seconds:6.253},
  {heat:1,number:5,seconds:6.251},
  {heat:2,number:1,seconds:5.532},{heat:2,number:2,seconds:5.277},
  {heat:2,number:3,seconds:5.277},{heat:2,number:4,seconds:5.277},
  {heat:2,number:5,seconds:5.277}
 ];
 const data=duelPresentation(player,ai,5,2);
 assert.equal(data.summary.completed,true);
 assert.equal(data.summary.winner,"player");
 assert.equal(data.bestPlayer,3.124);
 assert.equal(data.bestAi,5.277);
 assert.equal(data.heats.length,2);
 assert.equal(data.heats[0].rows[1].gap,2.832);
 assert.equal(data.heats[1].rows[2].gap,2.153);
 assert.equal(data.heats[1].rows[0].lap,1,"Vuelta en segunda manga vuelve a 1");
 assert.equal(data.heats[1].rows[2].playerBest,true);
 assert.equal(data.heats[1].rows[4].aiBest,true);
 const intermediate=duelPresentation(player.slice(0,5),ai.slice(0,5),5,1);
 assert.equal(intermediate.summary.completed,false);
 assert.equal(intermediate.heats.length,1);
 assert.equal(intermediate.heats[0].rows.length,5);
 const lost=duelPresentation(ai.map((x,i)=>({...x,number:x.number+(x.heat-1)*5})),player.map((x,i)=>({...x,number:x.number-(x.heat-1)*5})),5,2);
 assert.equal(lost.summary.winner,"ai");
 const tie=duelPresentation(player,player.map(x=>({...x,number:x.number-(x.heat-1)*5})),5,2);
 assert.equal(tie.summary.winner,"tie");
 assert.equal(tie.heats[0].rows[0].faster,"tie");
 const noPartial=duelPresentation(player.slice(0,5),ai.slice(0,4),5,1);
 assert.equal(noPartial.heats[0].rows[4].gap,null);
 // Ejecuta el renderizador real en un DOM mínimo, sin navegador ni datos de usuario.
 const app=fs.readFileSync("src/app.mjs","utf8");
 const a=app.indexOf("function renderDuelResults(){");
 const b=app.indexOf("\nfunction renderSessionSummary(){",a);
 assert.ok(a>0&&b>a);
 function makeNode(tag){
  const node={tag,className:"",children:[],scope:null,open:false,_text:"",};
  Object.defineProperty(node,"textContent",{
   get(){return node._text||node.children.map(child=>child.textContent).join("");},
   set(value){node._text=String(value);node.children=[];}
  });
  node.appendChild=child=>{node.children.push(child);return child;};
  return node;
 }
 const elements=Object.fromEntries(["resultsStats","resultsLaps","resultsSectionHeading","resultsSectionCaption"].map(id=>[id,makeNode("div")]));
 const document={createElement:makeNode};
 const sampleState={sessionPlayerNick:"Juanfrikazo-dev",sessionOpponentNick:"IA",sessionLaps:player,targetLaps:5,twoLegPhase:2,sessionCar:"gripline",selectedCar:"gripline"};
 const sampleAi={sessionLaps:ai};
 const draw=new Function("document","state","aiTest","CAR_MODELS","format","$","duelPresentation",
   app.slice(a,b)+"\nreturn renderDuelResults;");
 const fn=draw(document,sampleState,sampleAi,{
  gripline:{name:"Avenir Gripline"},spark:{name:"Helix Spark"}
 },s=>Number(s).toFixed(3).replace(".",","),id=>elements[id],duelPresentation);
 fn();
 const all=[];
 function collect(node){
  all.push(node);
  for(const child of node.children)collect(child);
 }
 collect(elements.resultsStats);collect(elements.resultsLaps);
 const tables=all.filter(n=>n.tag==="table");
 assert.equal(tables.length,3,"Comparativa de mangas + tabla por manga");
 assert.equal(tables.filter(n=>n.className.includes("duel-lap-table")).length,2);
 const headers=all.filter(n=>n.tag==="th");
 assert.ok(headers.some(n=>n.textContent==="Ventaja"));
 assert.ok(all.some(n=>n.textContent==="Juanfrikazo-dev +2,832 s"));
 assert.ok(all.some(n=>n.textContent==="3,124 s"&&n.className.includes("is-best")));
 assert.equal(elements.resultsSectionHeading.textContent,"Vuelta a vuelta");
 assert.equal(elements.resultsSectionCaption.textContent,"DOS MANGAS");
 // Regresión basada en las capturas reales de DEV 0.15.65:
 // los totales en pantalla DEBEN ser la suma exacta de las milésimas visibles.
 const screenPlayer=[3.529,2.791,2.791,2.791,2.791,
   3.65949,6.45649,3.266,3.124,3.12351].map((seconds,i)=>({
    heat:i<5?1:2,number:i+1,seconds
   }));
 const screenAi=[6.505,6.253,6.253,6.253,6.252,
   5.53051,5.27851,5.277,5.277,5.27749].map((seconds,i)=>({
    heat:i<5?1:2,number:i%5+1,seconds
   }));
 const screenshot=duelPresentation(screenPlayer,screenAi,5,2);
 assert.equal(screenshot.heats[0].playerTotal,14.693);
 assert.equal(screenshot.heats[0].aiTotal,31.516);
 assert.equal(screenshot.heats[0].heatGap,16.823);
 assert.equal(screenshot.heats[1].playerTotal,19.629);
 assert.equal(screenshot.heats[1].aiTotal,26.641);
 assert.equal(screenshot.heats[1].heatGap,7.012);
 assert.equal(screenshot.heats[1].rows[0].gap,1.872);
 assert.equal(screenshot.heats[1].rows[1].gap,-1.177);
 assert.equal(screenshot.heats[1].rows[4].gap,2.153);
 assert.equal(screenshot.summary.playerTotal,34.322);
 assert.equal(screenshot.summary.aiTotal,58.157);
 assert.equal(screenshot.summary.difference,23.835);
 assert.equal(screenshot.summary.playerTotal,
  screenshot.heats.reduce((n,h)=>n+h.playerTotal,0));
 sampleState.sessionLaps=screenPlayer;sampleAi.sessionLaps=screenAi;
 sampleState.twoLegPhase=2;fn();
 assert.ok(elements.resultsStats.textContent.includes("34,322 s"));
 assert.ok(elements.resultsStats.textContent.includes("58,157 s"));
 assert.ok(elements.resultsStats.textContent.includes("Juanfrikazo-dev +23,835 s"));
 assert.ok(elements.resultsStats.textContent.includes("Juanfrikazo-dev +7,012 s"));
 assert.ok(elements.resultsLaps.textContent.includes("Juanfrikazo-dev +1,872 s"));
 assert.ok(elements.resultsLaps.textContent.includes("IA +1,177 s"));
 // Una sesión intermedia no anuncia ganador ni inventa la manga pendiente.
 sampleState.sessionLaps=player.slice(0,5);sampleState.twoLegPhase=1;
 sampleAi.sessionLaps=ai.slice(0,5);
 fn();
 const interim=[];collect(elements.resultsStats);collect(elements.resultsLaps);
 assert.equal(elements.resultsStats.textContent.includes("¡VICTORIA DE"),false);
 console.log("Duel results responsive tables: 2 heats, 10 laps, winners, best laps, real DOM render, interim and missing data OK");
})().catch(err=>{console.error(err);process.exitCode=1});
