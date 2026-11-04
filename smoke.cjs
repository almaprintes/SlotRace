"use strict";
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const code = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(code, "Inline prototype script should exist");
const events = {}, nodes = {};
const nop = () => {};
const canvasContext = Object.fromEntries(
  ["setTransform","fillRect","strokeRect","beginPath","moveTo","lineTo","stroke",
   "save","restore","translate","scale","arc","fill","rotate","fillText"].map(k => [k,nop])
);
const ids = ["track","trackState","hint","pieceCount","invS","invR","invL","addS",
  "addR","addL","undo","oval","clear","lap","timer","bestL","bestR","combined",
  "activity","left","right","gasvalue","throttle","gas","start","pause","reset",
  "quickRace","driveOverlay","driveSurface","driveLap","driveTime","drivePercent",
  "driveSpeed","driveLaneText","driveMessage","drivePause","driveLane",
  "driveGas","driveExit","driveThrottle"];
const previewParent = {firstChild:null,insertBefore(node){node.parentElement=this;this.firstChild=node;}};
const driveParent = {firstChild:null,insertBefore(node){node.parentElement=this;this.firstChild=node;}};
for (const id of ids) {
  nodes[id] = {
    textContent:"", value:"0", style:{}, className:"", disabled:false,
    classList:{toggle:nop},
    addEventListener(type,fn){(events[id] ||= {})[type] = fn;},
    getBoundingClientRect(){return this.parentElement===driveParent?{width:390,height:600}:{width:800,height:480};},
    insertBefore: id==="driveSurface"?driveParent.insertBefore.bind(driveParent):undefined,
    getContext(){return canvasContext;},
    setPointerCapture:nop
  };
}
nodes.track.parentElement=previewParent;
nodes.driveOverlay.hidden=true;
const classes=new Set();
const document = {getElementById:id=>nodes[id],addEventListener:nop,hidden:false,
  body:{classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)}}};
const window = {devicePixelRatio:1,addEventListener:nop};
const data = new Map();
const localStorage = {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
let animationFrame = null;
const requestAnimationFrame = fn => {animationFrame=fn;};
const ResizeObserver = class {observe(){}};
new Function("document","window","localStorage","performance","requestAnimationFrame","ResizeObserver",code[1])(
  document,window,localStorage,{now:()=>0},requestAnimationFrame,ResizeObserver
);
const game = window.__slotraceTest;
assert.ok(game,"Expected test inspection hooks");
assert.equal(game.getState().valid,true,"Initial oval should be closed");
assert.equal(game.getState().pieces.length,8);
events.addS.click();
assert.equal(game.getState().valid,false,"Appending one straight should open the oval");
events.undo.click();
assert.equal(game.getState().valid,true,"Undo should restore the oval");

events.quickRace.click();
assert.equal(nodes.driveOverlay.hidden,false,"Game must open full-screen racing view");
assert.equal(classes.has("drive-open"),true,"Document scrolling must be disabled");
assert.equal(nodes.track.parentElement,driveParent,"Canvas must move into racing view");
assert.equal(game.getState().running,true);
events.right.click();
assert.equal(game.getState().lane,0,"Lane change must not happen during driving");
events.drivePause.click();
assert.equal(game.getState().running,false);
events.right.click();
assert.equal(game.getState().lane,1,"Lane change should work while paused");
events.left.click();
assert.equal(game.getState().lane,0);
events.drivePause.click();
assert.equal(game.getState().running,true);

let clock=0;
function driveFrames(n) {
  for(let i=0;i<n;i++){
    const s=game.getState();
    game.setGas(s.speed<205?75:0);
    clock+=16;
    assert.ok(animationFrame,"Expected animation frame callback");
    animationFrame(clock);
  }
}
driveFrames(1100);
assert.ok(game.getState().lap>1,"Expected to complete a lap in left lane");
assert.ok(game.getState().records[0]>0,"Expected stored left lap record");

events.drivePause.click();
events.driveLane.click();
events.drivePause.click();
driveFrames(1100);
assert.ok(game.getState().lap>1,"Expected to complete a lap in right lane");
const final=game.getState();
assert.ok(final.records[0]>0 && final.records[1]>0,"Expected combined record");
assert.match(nodes.combined.textContent,/s$/);

events.driveExit.click();
assert.equal(nodes.driveOverlay.hidden,true,"Exit should hide cockpit");
assert.equal(nodes.track.parentElement,previewParent,"Exit must restore original canvas");
assert.equal(game.getState().running,false,"Exit must pause racing");
events.clear.click();
assert.equal(game.getState().valid,false,"Empty table should be invalid");
assert.equal(game.getState().pieces.length,0);
events.oval.click();
assert.equal(game.getState().valid,true,"Restore oval should work");
console.log("SlotRace LAB smoke: OK (layout, full-screen cockpit, touch controls, editor, lap timing, both lanes).");
