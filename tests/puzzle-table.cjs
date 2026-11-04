"use strict";
// Comportamiento de mesa-puzzle. Ejecutar con node tests/puzzle-table.cjs.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
 const geo=await import("../src/track.mjs");
 const source=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8")
  .replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?/,"");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 function node(id){
  return{id,children:[],listeners:{},dataset:{},style:{},textContent:"",innerHTML:"",disabled:false,hidden:false,
   width:390,height:600,clientWidth:390,value:"0",
   classList:{add(){},remove(){},toggle(){},contains(){return false}},
   setAttribute(){},setPointerCapture(){},appendChild(n){this.children.push(n);},
   addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)},
   getBoundingClientRect(){return{left:0,top:0,width:390,height:600,right:390,bottom:600}},
   querySelectorAll(){return this.children},
   querySelector(sel){
    if(sel===".qty")return this.qty??=node("qty");
    if(sel===".grip")return this.grip??=node("grip");
    return null;
   }};
 }
 const elements=new Map(ids.map(id=>[id,node(id)]));
 const ctx=new Proxy({}, {get(_,k){return k==="createLinearGradient"?()=>({addColorStop(){}}):()=>{}},
  set(obj,k,v){obj[k]=v;return true;}});
 for(const id of ["editCanvas","raceCanvas"])elements.get(id).getContext=()=>ctx;
 const document={getElementById:id=>elements.get(id),createElement:()=>node("card"),
  addEventListener(){},hidden:false};
 const window={devicePixelRatio:1,innerWidth:390,innerHeight:844,
  matchMedia:()=>({matches:true}),addEventListener(){},setTimeout:fn=>fn()};
 const saved=new Map(),localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
 const callbacks=[];const requestAnimationFrame=fn=>callbacks.push(fn);
 const keys=Object.keys(geo),values=keys.map(k=>geo[k]);
 new Function(...keys,"document","window","localStorage","performance","requestAnimationFrame","ResizeObserver",source)(
  ...values,document,window,localStorage,{now:()=>0},requestAnimationFrame,class{observe(){}}
 );
 const game=window.slotraceLab,st=game.state;
 assert.equal(game.version,"DEV 0.7.0");
 assert.equal(st.track.parts.length,18);
 assert.equal(st.track.valid,true);
 assert.ok(elements.has("joinPiece"),"Visible join control exists");

 // Gesto real: tocar una pieza conectada y arrastrar >7 px.
 const before=st.track.parts.map(p=>({id:p.id,start:{...p.start}}));
 const target=st.track.parts[2].points[3],b=st.workBoard;
 const scale=Math.min((390-16)/b.height,(600-16)/b.width);
 const toScreen=p=>({clientX:195-scale*(p.y-(b.top+b.bottom)/2),
    clientY:300+scale*(p.x-(b.left+b.right)/2)});
 const pos=toScreen(target);
 function event(x,y,pointerId=5){return{pointerId,clientX:x,clientY:y,preventDefault(){}};}
 game.puzzle.canvasPointerDown(event(pos.clientX,pos.clientY));
 game.puzzle.canvasPointerMove(event(pos.clientX+44,pos.clientY+25));
 game.puzzle.canvasPointerEnd(event(pos.clientX+44,pos.clientY+25));
 assert.equal(st.types.length,2,"The track is split at the moved piece");
 assert.equal(st.loose.length,16,"The moved piece and all following pieces remain on the table");
 for(let k=1;k<st.loose.length;k++){
  const expected=before[k+2].start,actual=st.loose[k];
  assert.equal(actual.x,expected.x,"Unmoved piece X cannot jump");
  assert.equal(actual.y,expected.y,"Unmoved piece Y cannot jump");
  assert.equal(actual.h,expected.h,"Unmoved piece direction cannot change");
 }
 assert.ok(st.loose[0].x!==before[2].start.x||st.loose[0].y!==before[2].start.y,
  "Dragged piece actually moves");
 assert.equal(st.workBoard.left,b.left);
 assert.equal(st.workBoard.right,b.right);
 const separated=st.loose.map(p=>({...p}));
 game.undo();
 assert.deepEqual(st.types,geo.FIGURE_EIGHT,"Undo restores original circuit");
 assert.equal(st.loose.length,0,"Undo removes the detached fragments");
 game.redo();
 assert.equal(st.types.length,2,"Redo restores the split");
 assert.deepEqual(st.loose,separated,"Redo restores physical piece positions");

 // A pile of scattered pieces can be placed freely and remains independent.
 game.changeTypes([],"Mesa vacía",[],geo.START);
 assert.equal(st.types.length,0);
 game.puzzle.scatterLoose("S350");
 game.puzzle.scatterLoose("R2R");
 game.puzzle.scatterLoose("S175");
 assert.equal(st.types.length,0,"Catalog tapping does NOT auto-connect");
 assert.equal(st.loose.length,3,"Multiple independent pieces can coexist");
 const positions=st.loose.map(p=>({...p}));
 assert.notDeepEqual([positions[0].x,positions[0].y],[positions[1].x,positions[1].y],
  "Different pieces should be scattered rather than stacked");
 assert.notDeepEqual([positions[1].x,positions[1].y],[positions[2].x,positions[2].y]);
 assert.equal(elements.get("joinPiece").disabled,false);
 st.looseSelection=0;
 game.puzzle.startSelectedPiece();
 assert.equal(st.types.length,1,"Player explicitly starts chain");
 assert.equal(st.loose.length,2);
 assert.equal(st.origin.x,positions[0].x);
 assert.equal(st.origin.y,positions[0].y);
 const end=st.track.ends.end;
 st.loose[0].x=end.x+15;st.loose[0].y=end.y+12;st.loose[0].h=end.h;
 st.looseSelection=0;
 game.puzzle.startSelectedPiece();
 assert.deepEqual(st.types,["S350","R2R"],"Only an intentionally joined piece snaps");
 assert.equal(st.loose.length,1,"Third scattered piece remains where it was");
 // También se pueden conectar piezas por el comienzo, como en un puzzle.
 game.puzzle.scatterLoose("S175");
 const prepend=st.loose.length-1,prior=st.track.parts.map(x=>({...x.start}));
 const newH=st.origin.h;
 const idealStart={x:st.origin.x-175*Math.cos(newH),
                   y:st.origin.y-175*Math.sin(newH),h:newH};
 st.loose[prepend].x=idealStart.x+5;
 st.loose[prepend].y=idealStart.y+5;
 st.loose[prepend].h=newH;
 st.looseSelection=prepend;
 game.puzzle.startSelectedPiece();
 assert.deepEqual(st.types,["S175","S350","R2R"],"Join at first connector prepends a piece");
 for(let i=0;i<prior.length;i++){
  assert.ok(Math.hypot(st.track.parts[i+1].start.x-prior[i].x,
                      st.track.parts[i+1].start.y-prior[i].y)<1e-6,
    "Prepending cannot move original assembled pieces");
 }
 const stored=JSON.parse(saved.get("slotrace-lab-05"));
 assert.ok(Math.abs(stored.origin.x-idealStart.x)<1e-5,"Prepending updates and persists world anchor");
 assert.equal(stored.loose.length,1,"Loose pieces persist to local storage");
 assert.ok(stored.workBoard,"Visible tabletop bounds persist");
 console.log("SlotRace DEV 0.7.0 puzzle table: touch-drag, unchanged neighbours, multi-piece scattering, join, undo/redo and save — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
