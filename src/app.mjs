import {TABLE,TRACK_WIDTH,LANE_OFFSET,CATALOG,STARTER,buildTrack,positionAt,nearestPiece,freeStock,allowed,positionOnPiece,findLegalClosure} from "./track.mjs";
const $=id=>document.getElementById(id);
const storage=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}};
const KEY="slotrace-lab-04";
const old=(()=>{try{return JSON.parse(storage(KEY)||"null");}catch(e){return null;}})();
const initial=old?.types&&allowed(old.types)?old.types.slice():STARTER.slice();
const storedLoose=Array.isArray(old?.loose)?old.loose.filter(p=>CATALOG[p?.id]&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.h)):[];
const initialLoose=allowed([...initial,...storedLoose.map(p=>p.id)])?storedLoose:[];
const state={
  types:initial,loose:initialLoose,track:buildTrack(initial),mode:"build",selection:-1,looseSelection:-1,dragLoose:-1,
  history:[],redo:[],draft:old?.draft&&Array.isArray(old.draft.types)?old.draft:Array.isArray(old?.draft)&&allowed(old.draft)?{types:old.draft,loose:[]}:null,
  lane:0,run:false,lap:1,seconds:0,speed:0,distance:0,penalty:0,
  gas:0,buttonGas:false,keyboardGas:false,gasInput:false,
  records:old?.records&&typeof old.records==="object"?old.records:{},
  messages:[],notice:"",noticeUntil:0,rev:0,
  camera:{panX:0,panY:0,zoom:1},pointer:new Map(),pinch:null,
  dragging:null,latest:performance.now()
};
function save(){storage(KEY,JSON.stringify({types:state.types,loose:state.loose,draft:state.draft,records:state.records}));}
const stage=$("buildScreen"),race=$("raceScreen");
const editCanvas=$("editCanvas"),raceCanvas=$("raceCanvas");
const canvasCtx=new Map([[editCanvas,editCanvas.getContext("2d",{alpha:false})],[raceCanvas,raceCanvas.getContext("2d",{alpha:false})]]);
const format=n=>n.toFixed(3).replace(".",",");
const recKey=()=>state.types.join("-");
const record=()=>{const v=state.records[recKey()];return Array.isArray(v)&&v.length===2?v:[null,null];};
function toast(text){state.notice=text;state.noticeUntil=performance.now()+2600;$("toast").textContent=text;$("toast").classList.add("show");}
function setMessage(msg){$("buildStatus").textContent=msg;}
function snapshot(){return{types:state.types.slice(),loose:state.loose.map(p=>({...p}))};}
function restoreSnapshot(shot){state.types=shot.types.slice();state.loose=(shot.loose||[]).map(p=>({...p}));state.track=buildTrack(state.types);state.selection=-1;state.looseSelection=-1;resetLap();save();updateUI();}
function pushHistory(){state.history.push(snapshot());if(state.history.length>45)state.history.shift();state.redo=[];}
function changeTypes(next,msg,loose=state.loose){
 if(!allowed([...next,...loose.map(p=>p.id)])){toast("No quedan suficientes piezas en la caja.");return false;}
 const wasClosed=state.track.closed;
 pushHistory();state.types=next.slice();state.loose=loose.map(p=>({...p}));state.track=buildTrack(state.types);
 state.selection=-1;state.looseSelection=-1;state.run=false;resetLap();
 save();updateUI();
 if(!wasClosed&&state.track.closed){
   toast(state.track.intersection?"Los extremos encajan, pero hay un cruce sin puente.":
     "¡Clac! Conectores unidos con precisión.");
 }else if(msg)toast(msg);
 return true;
}
function resetLap(){state.lap=1;state.seconds=0;state.speed=0;state.distance=0;state.penalty=0;state.gas=0;state.buttonGas=false;state.keyboardGas=false;
 $("throttle").value="0";$("trigger").classList.remove("pressed");}
function undo(){if(!state.history.length){toast("No hay movimientos que deshacer.");return;}
 state.redo.push(snapshot());restoreSnapshot(state.history.pop());}
function redo(){if(!state.redo.length){toast("No hay movimientos que rehacer.");return;}
 state.history.push(snapshot());restoreSnapshot(state.redo.pop());}
function addLoose(id,x,y,h=0){
 if(!allowed([...state.types,...state.loose.map(p=>p.id),id])){toast("Esa pieza ya no está disponible.");return false;}
 pushHistory();state.loose.push({id,x:Math.max(190,Math.min(TABLE.width-240,x)),y:Math.max(210,Math.min(TABLE.height-250,y)),h});
 state.selection=-1;state.looseSelection=state.loose.length-1;save();updateUI();toast("Pieza colocada en la mesa. Arrástrala hasta el conector amarillo.");return true;
}
function snapLoose(index){
 if(state.track.closed||index<0||index>=state.loose.length)return false;
 const piece=state.loose[index],end=state.track.ends.end;
 if(Math.hypot(piece.x-end.x,piece.y-end.y)>175)return false;
 pushHistory();state.loose.splice(index,1);state.types.push(piece.id);state.track=buildTrack(state.types);
 state.looseSelection=-1;state.dragLoose=-1;state.selection=-1;save();updateUI();
 toast("¡Clac! Pieza encajada magnéticamente.");return true;
}
function inventoryAction(id){
 if(!CATALOG[id])return;
 const selected=state.selection,looseIndex=state.looseSelection;
 if(looseIndex>=0){
  if(state.loose[looseIndex].id===id){toast("Ya tienes esa pieza en la mesa.");return;}
  const next=state.loose.map(p=>({...p}));next[looseIndex].id=id;
  if(!allowed([...state.types,...next.map(p=>p.id)])){toast("No quedan piezas de ese tipo.");return;}
  pushHistory();state.loose=next;save();updateUI();toast("Pieza suelta sustituida.");return;
 }
 if(selected>=0){
  if(state.types[selected]===id){toast("Ya tienes esa pieza seleccionada.");return;}
  const next=state.types.slice();next[selected]=id;changeTypes(next,"Tramo sustituido y conectado a sus vecinos.");return;
 }
 if(state.track.closed){
  addLoose(id,430+state.loose.length*190,1240,0);return;
 }
 const next=state.types.slice();next.push(id);
 changeTypes(next,"Pieza enganchada al extremo amarillo.");
}
function closeExactly(){
 if(state.track.closed){
   toast(state.track.intersection?"Los extremos ya conectan, pero hay un cruce sin puente.":"Este circuito ya está cerrado.");return;
 }
 if(state.loose.length){toast("Recoge o encaja primero las piezas sueltas.");return;}
 if(state.types.length<2){toast("Coloca primero varias piezas.");return;}
 $("autoClose").disabled=true;$("autoClose").textContent="Buscando…";
 requestAnimationFrame(()=>{
   try{
    const result=findLegalClosure(state.types,{maxReplace:3,maxAdd:5,maxStates:90000});
    if(result.ok){
     if(result.unchanged)toast("El circuito ya estaba cerrado exactamente.");
     else changeTypes(result.types,"Cierre calculado: "+result.replaced+" pieza(s) cambiada(s), "+result.added+" añadida(s). Puedes deshacer.");
    }else toast(result.reason||"No hay cierre exacto con esas piezas.");
   }catch(e){toast("No fue posible calcular el cierre. Tu pista sigue intacta.");}
   finally{$("autoClose").textContent="Cerrar exacto";updateUI();}
 });
}
function removeSelected(){
 if(state.looseSelection>=0){
  pushHistory();state.loose.splice(state.looseSelection,1);state.looseSelection=-1;
  save();updateUI();toast("Pieza suelta devuelta a la caja.");return;
 }
 if(state.selection<0){toast("Toca un tramo sobre la mesa para seleccionarlo.");return;}
 const next=state.types.slice();next.splice(state.selection,1);
 changeTypes(next,"Tramo retirado. Puedes continuar montando.");
}
function rotateLoose(){
 if(state.looseSelection<0){toast("Selecciona una pieza suelta de la mesa para girarla.");return;}
 pushHistory();state.loose[state.looseSelection].h+=Math.PI/4;
 save();updateUI();toast("Pieza girada 45°.");
}
function recoverDraft(){
 if(!state.draft)return;
 const d=state.draft;state.draft=null;
 changeTypes(d.types||[], "Construcción anterior recuperada.",d.loose||[]);
}
function play(){
 if(!state.track.valid){
  state.draft=snapshot();
  state.types=STARTER.slice();state.loose=[];state.track=buildTrack(state.types);state.selection=-1;state.looseSelection=-1;
  save();
 }
 state.run=true;state.penalty=0;state.gas=0;state.buttonGas=false;state.keyboardGas=false;state.speed=0;
 state.mode="race";state.latest=performance.now();updateUI();resize();
 toast("¡Pista lista! Suelta el gatillo antes de las curvas.");
}
function back(){state.run=false;state.gas=0;state.buttonGas=false;state.keyboardGas=false;state.mode="build";updateUI();resize();}
function pause(){state.run=!state.run;state.gas=0;state.buttonGas=false;state.keyboardGas=false;
 $("throttle").value="0";state.latest=performance.now();updateUI();
 toast(state.run?"¡Volvemos a correr!":"Carrera en pausa.");}
function switchLane(){if(state.run){toast("Pausa primero para cambiar de carril.");return;}state.lane=1-state.lane;resetLap();updateUI();toast("Carril "+(state.lane===0?"izquierdo":"derecho")+" · nueva tanda.");}
function completeLap(){
 if(state.seconds<.05)return;
 const v=record(),sec=state.seconds;
 if(v[state.lane]===null||v[state.lane]===undefined||sec<v[state.lane]){
  v[state.lane]=sec;state.records[recKey()]=v;save();toast("¡Récord personal "+(state.lane===0?"izquierda":"derecha")+"! "+format(sec)+" s");
 }else toast("Vuelta "+state.lap+" · "+format(sec)+" s");
 state.seconds=0;state.lap++;
}
function simulation(dt){
 if(!state.run||!state.track.valid)return;
 state.seconds+=dt;
 if(state.penalty>0){state.penalty=Math.max(0,state.penalty-dt);return;}
 const g=state.buttonGas||state.keyboardGas?1:state.gas;
 state.speed=Math.min(1300,Math.max(0,state.speed+(g*940-(1-g)*725-45)*dt));
 const lane=state.track.lanes[state.lane],p=positionAt(lane,state.distance);
 if(p?.curve){
  const r=Math.max(130,p.radius+(state.lane?LANE_OFFSET:-LANE_OFFSET)*p.curve);
  const safe=610*Math.sqrt(r/370);
  if(state.speed>safe*1.10){
   state.speed=0;state.penalty=3;toast("¡Fuera de pista! +3 segundos de inmovilización.");return;
  }
 }
 state.distance+=state.speed*dt;
 if(state.distance>=lane.total){state.distance%=lane.total;completeLap();}
}
function setTrigger(on){state.buttonGas=on;$("trigger").classList.toggle("pressed",on);updateHud();}
function updateHud(){
 $("lap").textContent=state.lap;
 $("lapTime").textContent=format(state.seconds);
 $("power").textContent=Math.round(state.buttonGas||state.keyboardGas?100:state.gas*100)+"%";
 $("speed").textContent=Math.round(state.speed/10)+" cm/s";
 const v=record();
 $("bestLeft").textContent=v[0]===null?"—":format(v[0])+" s";
 $("bestRight").textContent=v[1]===null?"—":format(v[1])+" s";
 $("combined").textContent=v[0]!==null&&v[1]!==null?format(v[0]+v[1])+" s":"—";
 $("raceHint").textContent=state.penalty>0?"FUERA DE PISTA · "+state.penalty.toFixed(1)+" s":state.run?"Levanta el dedo al entrar en la curva":"EN PAUSA";
 $("pause").textContent=state.run?"⏸ Pausar":"▶ Seguir";
 $("lane").disabled=state.run;
 $("trigger").disabled=!state.run;
}
function updateUI(){
 stage.hidden=state.mode!=="build";race.hidden=state.mode!=="race";
 const t=state.track;
 const degrees=t.headingGap*180/Math.PI;
 const status=t.valid?"CERRADO EXACTO · "+(t.length/1000).toFixed(2)+" m":
  !t.types.length?"MESA VACÍA · COLOCA PIEZAS":t.closed?"CONECTADO · CRUCE SIN PUENTE":
  "ABIERTO · "+Math.round(t.gap)+" mm · "+Math.round(degrees)+"°";
 const notice=t.intersection?"Cruce al mismo nivel: necesita puente":
  !t.onTable?"El circuito rebasa la mesa":t.closed?"Conectores alineados matemáticamente":
  t.types.length?"Desfase: "+Math.round(t.gap)+" mm y "+Math.round(degrees)+"°":"La caja está lista";
 $("stateChip").textContent=t.valid?"✓ CERRADO PERFECTO":t.closed?"⚠ CERRADO CON CRUCE":"○ EXTREMOS ABIERTOS";
 $("stateDetails").textContent=t.valid?t.types.length+" piezas · "+(t.length/1000).toFixed(2)+" m":notice;
 $("buildStatus").textContent=status;
 $("buildStatus").classList.toggle("good",t.valid);
 $("buildStatus").classList.toggle("warn",!t.valid);
 $("play").textContent=t.valid?"🏁 Correr":"🏁 Probar óvalo";
 $("restore").hidden=!state.draft;
 $("selected").textContent=state.looseSelection>=0?"SUELTA · "+CATALOG[state.loose[state.looseSelection].id].name:
 state.selection<0?"TOCA UNA PIEZA O ARRÁSTRALA A LA MESA":
  "TRAMO "+(state.selection+1)+" · "+CATALOG[state.types[state.selection]].name;
 $("remove").disabled=state.selection<0&&state.looseSelection<0;
 $("rotate").disabled=state.looseSelection<0;
 $("autoClose").disabled=state.types.length<2||state.track.closed||state.loose.length>0;
 $("undo").disabled=!state.history.length;
 $("redo").disabled=!state.redo.length;
 const cards=$("pieces").querySelectorAll("[data-piece]");
 for(const el of cards){
  const id=el.dataset.piece,free=freeStock([...state.types,...state.loose.map(p=>p.id)],id)+(state.selection>=0&&state.types[state.selection]===id?1:0)+(state.looseSelection>=0&&state.loose[state.looseSelection].id===id?1:0);
  el.querySelector(".qty").textContent="×"+free;
  el.disabled=free===0;
  el.classList.toggle("selected",(state.selection>=0&&state.types[state.selection]===id)||(state.looseSelection>=0&&state.loose[state.looseSelection].id===id));
 }
 $("tableCaption").textContent=state.looseSelection>=0?"PIEZA SUELTA · arrástrala al conector amarillo":
 state.selection>=0?"TRAMO SELECCIONADO · toca otra pieza para sustituirlo":
 state.dragging?"SUELTA LA PIEZA SOBRE EL TAPETE":"ARRASTRA UNA PIEZA DESDE ⠿ · PELLIZCA PARA ZOOM";
 updateHud();
}
const paletteIcons={S350:"━",S175:"─",R2R:"↷",R2L:"↶",R1R:"⤷",R1L:"⤶"};
function palette(){
 const list=$("pieces");
 for(const [id,spec] of Object.entries(CATALOG)){
  const b=document.createElement("button");b.type="button";b.className="piece-card";b.dataset.piece=id;
  b.setAttribute("aria-label",spec.name+", "+spec.code);
  b.innerHTML='<span class="qty">×0</span><span class="pictogram" aria-hidden="true">'+paletteIcons[id]+'</span><strong>'+spec.name+'</strong><small>'+spec.code+'</small><span class="grip" title="Arrastrar pieza a la mesa" aria-hidden="true">⠿</span>';
  b.addEventListener("click",()=>inventoryAction(id));
  const grip=b.querySelector(".grip");
  grip.addEventListener("click",e=>e.stopPropagation());
  grip.addEventListener("pointerdown",e=>{
   e.preventDefault();e.stopPropagation();
   if(freeStock([...state.types,...state.loose.map(p=>p.id)],id)<1){toast("No quedan piezas.");return;}
   state.dragging={id,x:e.clientX,y:e.clientY,originX:e.clientX,originY:e.clientY,active:false};
   grip.setPointerCapture(e.pointerId);updateUI();
  });
  grip.addEventListener("pointermove",e=>{
   if(!state.dragging||state.dragging.id!==id)return;
   state.dragging.x=e.clientX;state.dragging.y=e.clientY;
   if(Math.hypot(e.clientX-state.dragging.originX,e.clientY-state.dragging.originY)>9)state.dragging.active=true;
  });
  const drop=e=>{
   if(!state.dragging||state.dragging.id!==id)return;
   const d=state.dragging;state.dragging=null;updateUI();
   if(!d.active){inventoryAction(id);return;}
   const rect=editCanvas.getBoundingClientRect();
   if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom){
    toast("Suelta la pieza dentro de la mesa.");return;
   }
   const p=screenToWorld(e);
   if(p.x<85||p.x>TABLE.width-85||p.y<85||p.y>TABLE.height-85){toast("Suelta dentro del tapete verde.");return;}
   const end=state.track.ends.end;
   if(!state.track.closed&&Math.hypot(p.x-end.x,p.y-end.y)<175){
    changeTypes([...state.types,id],"¡Clac! Pieza encajada magnéticamente.");return;
   }
   addLoose(id,p.x,p.y);
  };
  grip.addEventListener("pointerup",drop);
  grip.addEventListener("pointercancel",()=>{state.dragging=null;updateUI();});
  list.appendChild(b);
 }
}
function roundRect(ctx,x,y,w,h,r){
 r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);
 ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function strokePath(ctx,points,color,width){
 if(!points.length)return;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
 for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="butt";ctx.lineJoin="round";ctx.stroke();
}
function translated(points,off){return points.map(p=>({x:p.x-Math.sin(p.h)*off,y:p.y+Math.cos(p.h)*off}));}
function paintTable(ctx){
 ctx.save();
 // La mesa debe cubrir la geometría sin mover ni deformar los conectores.
 const b=state.track.board;
 ctx.translate(b.left,b.top);
 ctx.scale(b.width/TABLE.width,b.height/TABLE.height);
 ctx.save();ctx.shadowColor="#000000a0";ctx.shadowBlur=70;ctx.shadowOffsetY=22;
 const wood=ctx.createLinearGradient(0,0,TABLE.width,TABLE.height);
 wood.addColorStop(0,"#ad7443");wood.addColorStop(.45,"#6b4327");wood.addColorStop(1,"#a96c3c");
 roundRect(ctx,8,8,TABLE.width-16,TABLE.height-16,80);ctx.fillStyle=wood;ctx.fill();ctx.restore();
 ctx.save();roundRect(ctx,8,8,TABLE.width-16,TABLE.height-16,80);ctx.clip();
 for(let i=0;i<74;i++){
  const y=(i*43)%TABLE.height;ctx.beginPath();ctx.moveTo(0,y);
  for(let x=0;x<=TABLE.width;x+=65)ctx.lineTo(x,y+4*Math.sin(i*.73+x*.009));
  ctx.strokeStyle=i%3===0?"#e2ab6e":"#472917";ctx.globalAlpha=i%3===0?.13:.18;ctx.lineWidth=i%5===0?5:2;ctx.stroke();
 }
 ctx.globalAlpha=1;ctx.restore();
 ctx.lineWidth=15;ctx.strokeStyle="#e4bc7e";roundRect(ctx,18,18,TABLE.width-36,TABLE.height-36,73);ctx.stroke();
 ctx.strokeStyle="#42271b";ctx.lineWidth=7;roundRect(ctx,50,50,TABLE.width-100,TABLE.height-100,48);ctx.stroke();
 ctx.shadowColor="#061e19b0";ctx.shadowBlur=23;ctx.shadowOffsetY=8;
 const felt=ctx.createLinearGradient(0,60,TABLE.width,TABLE.height-60);
 felt.addColorStop(0,"#2d765c");felt.addColorStop(.55,"#245a48");felt.addColorStop(1,"#143c36");
 roundRect(ctx,62,62,TABLE.width-124,TABLE.height-124,38);ctx.fillStyle=felt;ctx.fill();
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 ctx.save();roundRect(ctx,62,62,TABLE.width-124,TABLE.height-124,38);ctx.clip();
 ctx.strokeStyle="#c6edd2";ctx.globalAlpha=.038;ctx.lineWidth=1.4;
 for(let x=62;x<TABLE.width-62;x+=100){ctx.beginPath();ctx.moveTo(x,62);ctx.lineTo(x,TABLE.height-62);ctx.stroke();}
 for(let y=62;y<TABLE.height-62;y+=100){ctx.beginPath();ctx.moveTo(62,y);ctx.lineTo(TABLE.width-62,y);ctx.stroke();}
 ctx.globalAlpha=.055;for(let i=0;i<1000;i++){
  const x=70+((i*7919)%2060),y=72+((i*5171)%1295);ctx.fillStyle=i%2?"#c0f5ce":"#05180c";ctx.fillRect(x,y,2.4,2.4);
 }ctx.globalAlpha=1;ctx.restore();
 ctx.font="bold 40px system-ui";ctx.fillStyle="#b5e3c1";ctx.globalAlpha=.38;ctx.textAlign="center";
 ctx.fillText("SLOTRACE  •  CRAFT RACE STUDIO",TABLE.width/2,166);ctx.globalAlpha=1;
 ctx.font="24px system-ui";ctx.fillStyle="#b9d6a7";ctx.globalAlpha=.47;ctx.fillText("MESA DE MONTAJE  ·  "+Math.round(b.width/10)+" × "+Math.round(b.height/10)+" CM",TABLE.width/2,TABLE.height-119);ctx.globalAlpha=1;
 for(const corner of [[76,76],[TABLE.width-76,76],[76,TABLE.height-76],[TABLE.width-76,TABLE.height-76]]){
  ctx.fillStyle="#503725";ctx.beginPath();ctx.arc(corner[0],corner[1],17,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#d4b57b";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(corner[0]-8,corner[1]);ctx.lineTo(corner[0]+8,corner[1]);ctx.stroke();
 }
 ctx.restore();
}
function paintSeam(ctx,p){
 const h=p.h,x=p.x,y=p.y,nx=-Math.sin(h),ny=Math.cos(h);
 ctx.save();ctx.lineWidth=4;ctx.strokeStyle="#0c1217";
 ctx.beginPath();ctx.moveTo(x-nx*76,y-ny*76);ctx.lineTo(x+nx*76,y+ny*76);ctx.stroke();
 ctx.lineWidth=3;ctx.strokeStyle="#768287";
 for(const side of [-67,67]){
  const px=x+nx*side,py=y+ny*side;
  ctx.fillStyle="#71808a";ctx.beginPath();ctx.arc(px,py,4.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#172029";ctx.beginPath();ctx.arc(px,py,1.8,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function paintTrack(ctx,track,editing){
 if(!track.parts.length)return;
 for(const part of track.parts){
  ctx.save();ctx.shadowColor="#0009";ctx.shadowBlur=18;ctx.shadowOffsetY=14;
  strokePath(ctx,part.points,"#0c1419",TRACK_WIDTH+20);ctx.restore();
  strokePath(ctx,part.points,"#637176",TRACK_WIDTH+14);
  strokePath(ctx,part.points,"#1e272d",TRACK_WIDTH+5);
  strokePath(ctx,part.points,"#313940",TRACK_WIDTH-5);
  strokePath(ctx,part.points,"#3b444b",TRACK_WIDTH-28);
  strokePath(ctx,part.points,"#252e34",TRACK_WIDTH-36);
  for(const laneOffset of [-LANE_OFFSET,LANE_OFFSET]){
   const path=translated(part.points,laneOffset);
   strokePath(ctx,path,"#101418",11);
   strokePath(ctx,translated(part.points,laneOffset-7.6),"#8c9ba1",2.2);
   strokePath(ctx,translated(part.points,laneOffset+7.6),"#a1b1b8",2.2);
   strokePath(ctx,path,"#070b0e",5.2);
  }
  for(const edge of [-72,72])strokePath(ctx,translated(part.points,edge),"#707d82",2.5);
  paintSeam(ctx,part.start);
  if(editing&&part.index===state.selection){
   strokePath(ctx,part.points,"#77ffe6",TRACK_WIDTH+22);
   strokePath(ctx,part.points,"#14383d",TRACK_WIDTH+15);
   // Paint a translucent outline outside, retain the real track surface above by alpha compositing.
   ctx.globalAlpha=.20;strokePath(ctx,part.points,"#36ffd6",TRACK_WIDTH+8);ctx.globalAlpha=1;
  }
 }
 if(track.closed){
  const p=track.parts[0].start,nx=-Math.sin(p.h),ny=Math.cos(p.h),dx=Math.cos(p.h),dy=Math.sin(p.h);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.h);
  for(let k=-2;k<=2;k++)for(let j=0;j<8;j++){
   ctx.fillStyle=(k+j)%2?"#fff6e8":"#171a1c";ctx.fillRect(k*7,-TRACK_WIDTH/2+j*(TRACK_WIDTH/8),7,TRACK_WIDTH/8);
  }
  ctx.restore();
 }
 if(!track.closed&&editing){
  const start=track.ends.begin,end=track.ends.end;
  for(const [p,color] of [[start,"#67eff1"],[end,"#ffc66b"]]){
   ctx.save();ctx.shadowBlur=25;ctx.shadowColor=color;ctx.fillStyle=color;
   ctx.beginPath();ctx.arc(p.x,p.y,19,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
   ctx.fillStyle="#132129";ctx.beginPath();ctx.arc(p.x,p.y,10,0,Math.PI*2);ctx.fill();ctx.restore();
  }
 }
}
function paintCar(ctx,at,lane,paused=false){
 if(!at)return;
 const color=lane===0?"#55eecf":"#ffc267";
 ctx.save();ctx.translate(at.x,at.y);ctx.rotate(at.h);
 ctx.shadowColor="#000a";ctx.shadowBlur=17;ctx.shadowOffsetY=9;
 ctx.fillStyle="#0b1013";roundRect(ctx,-77,-32,154,64,16);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 for(const x of [-53,49])for(const y of [-33,25]){
  ctx.fillStyle="#0c1215";roundRect(ctx,x,y,32,10,4);ctx.fill();
  ctx.fillStyle="#69787b";ctx.fillRect(x+4,y+4,23,2);
 }
 const paint=ctx.createLinearGradient(0,-30,0,30);
 paint.addColorStop(0,"#e2fff2");paint.addColorStop(.2,color);paint.addColorStop(.8,lane===0?"#159380":"#ad681d");paint.addColorStop(1,"#062125");
 ctx.fillStyle=paint;roundRect(ctx,-70,-27,140,54,19);ctx.fill();
 ctx.fillStyle="#111d23";roundRect(ctx,-8,-23,49,46,11);ctx.fill();
 ctx.fillStyle="#416972";roundRect(ctx,11,-19,22,38,6);ctx.fill();
 ctx.fillStyle="#faf9ee";ctx.fillRect(-47,-24,54,6);ctx.fillRect(-47,18,54,6);
 ctx.fillStyle="#fffef1";ctx.fillRect(58,-20,7,11);ctx.fillRect(58,9,7,11);
 ctx.fillStyle="#b41d27";ctx.fillRect(-65,-19,5,12);ctx.fillRect(-65,7,5,12);
 ctx.fillStyle="#092b30";ctx.font="bold 21px sans-serif";ctx.textAlign="center";ctx.fillText("7",-38,8);
 ctx.restore();
}
function loosePart(piece,index){
 const n=CATALOG[piece.id].length?7:20;
 const pose={x:piece.x,y:piece.y,h:piece.h};
 const points=Array.from({length:n+1},(_,k)=>positionOnPiece(pose,piece.id,k/n));
 return{id:piece.id,index,start:pose,end:points[points.length-1],points};
}
function paintLoose(ctx){
 for(const [index,p] of state.loose.entries()){
  const part=loosePart(p,index);
  ctx.save();ctx.shadowColor="#0009";ctx.shadowBlur=20;ctx.shadowOffsetY=13;
  strokePath(ctx,part.points,"#10181a",TRACK_WIDTH+22);ctx.restore();
  strokePath(ctx,part.points,"#728184",TRACK_WIDTH+12);
  strokePath(ctx,part.points,"#2a353a",TRACK_WIDTH+2);
  strokePath(ctx,part.points,"#38434a",TRACK_WIDTH-13);
  for(const off of [-LANE_OFFSET,LANE_OFFSET]){
   strokePath(ctx,translated(part.points,off),"#071015",10);
   strokePath(ctx,translated(part.points,off-7),"#a0afb3",2);
   strokePath(ctx,translated(part.points,off+7),"#a0afb3",2);
  }
  paintSeam(ctx,part.start);
  if(state.mode==="build"&&index===state.looseSelection){
   ctx.save();ctx.globalAlpha=.45;strokePath(ctx,part.points,"#f4d06c",TRACK_WIDTH+25);ctx.restore();
  }
  if(state.mode==="build"&&!state.track.closed){
   const end=state.track.ends.end;
   if(Math.hypot(p.x-end.x,p.y-end.y)<175){
    ctx.save();ctx.lineWidth=9;ctx.strokeStyle="#84f6c0";ctx.setLineDash([20,12]);
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.setLineDash([]);ctx.restore();
   }
  }
 }
 if(state.dragging?.active&&state.mode==="build"){
  const d=state.dragging,rect=editCanvas.getBoundingClientRect();
  const w=worldFromPointer(makeView(editCanvas,"build"),d.x-rect.left,d.y-rect.top);
  if(w.x>=0&&w.x<=TABLE.width&&w.y>=0&&w.y<=TABLE.height){
   const end=state.track.ends.end,snap=!state.track.closed&&Math.hypot(w.x-end.x,w.y-end.y)<175;
   const pose=snap?{x:end.x,y:end.y,h:end.h}:{x:w.x,y:w.y,h:0};
   const spec=CATALOG[d.id],n=spec.length?7:20;
   const points=Array.from({length:n+1},(_,k)=>positionOnPiece(pose,d.id,k/n));
   ctx.save();ctx.globalAlpha=.63;
   strokePath(ctx,points,snap?"#66ffe0":"#ffcc7c",TRACK_WIDTH+22);
   strokePath(ctx,points,"#25313b",TRACK_WIDTH);
   for(const off of [-LANE_OFFSET,LANE_OFFSET])strokePath(ctx,translated(points,off),"#081017",9);
   ctx.restore();
  }
 }
}
function nearestLoose(x,y){
 let best={index:-1,distance:Infinity};
 for(let i=0;i<state.loose.length;i++){
  const part=loosePart(state.loose[i],i);
  const hit=nearestPiece({parts:[part]},x,y);
  if(hit.distance<best.distance)best={index:i,distance:hit.distance};
 }
 return best;
}
function paintGhost(ctx,track){
 if(!track.parts.length||track.closed||state.mode!=="build")return;
 const e=track.ends.end;
 ctx.save();ctx.globalAlpha=.38;ctx.strokeStyle="#ffe29b";ctx.lineWidth=8;
 ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+Math.cos(e.h)*67,e.y+Math.sin(e.h)*67);ctx.stroke();
 ctx.restore();
}
function resize(){
 for(const canvas of [editCanvas,raceCanvas]){
  if(!canvas.parentElement)return;
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)continue;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 }
}
function makeView(canvas,mode){
 const dpr=Math.min(2,window.devicePixelRatio||1);
 const w=canvas.width/dpr,h=canvas.height/dpr;
 const portrait=h>w*1.1,angle=portrait?Math.PI/2:0;
 const target=mode==="build"?state.track.board:
  {left:state.track.bounds.left-160,right:state.track.bounds.right+160,
   top:state.track.bounds.top-160,bottom:state.track.bounds.bottom+160};
 const cx=(target.left+target.right)/2,cy=(target.top+target.bottom)/2;
 const bw=target.right-target.left,bh=target.bottom-target.top;
 const width=portrait?bh:bw,height=portrait?bw:bh;
 const base=Math.max(.01,Math.min((w-16)/width,(h-16)/height));
 const zoom=mode==="build"?state.camera.zoom:1;
 const scale=base*zoom;
 const panX=mode==="build"?state.camera.panX:0,panY=mode==="build"?state.camera.panY:0;
 return{w,h,angle,scale,cx,cy,panX,panY,dpr};
}
function transform(ctx,v){
 ctx.translate(v.w/2+v.panX,v.h/2+v.panY);ctx.rotate(v.angle);ctx.scale(v.scale,v.scale);ctx.translate(-v.cx,-v.cy);
}
function worldFromPointer(v,screenX,screenY){
 let x=(screenX-v.w/2-v.panX)/v.scale,y=(screenY-v.h/2-v.panY)/v.scale;
 const c=Math.cos(v.angle),s=Math.sin(v.angle);
 return{x:v.cx+c*x+s*y,y:v.cy-s*x+c*y};
}
function renderScene(canvas,mode){
 if(!canvas.width||!canvas.height)return;
 const ctx=canvasCtx.get(canvas),v=makeView(canvas,mode);
 ctx.setTransform(v.dpr,0,0,v.dpr,0,0);
 ctx.fillStyle="#0a141b";ctx.fillRect(0,0,v.w,v.h);
 ctx.save();transform(ctx,v);
 paintTable(ctx);paintTrack(ctx,state.track,mode==="build");paintLoose(ctx);
 paintGhost(ctx,state.track);
 const p=positionAt(state.track.lanes[state.lane],mode==="race"?state.distance:0);
 if(state.track.valid)paintCar(ctx,p,state.lane);
 ctx.restore();
}
function screenToWorld(e){
 const rect=editCanvas.getBoundingClientRect(),v=makeView(editCanvas,"build");
 return worldFromPointer(v,e.clientX-rect.left,e.clientY-rect.top);
}
let dragOrigin=null;
function canvasPointerDown(e){
 if(state.mode!=="build")return;
 editCanvas.setPointerCapture(e.pointerId);
 const onTable=screenToWorld(e),near=state.pointer.size===0?nearestLoose(onTable.x,onTable.y):{index:-1};
 const looseIndex=near.index>=0&&near.distance<TRACK_WIDTH*.55?near.index:-1;
 state.pointer.set(e.pointerId,{x:e.clientX,y:e.clientY,originX:e.clientX,originY:e.clientY,looseIndex,dragged:false});
 if(looseIndex>=0){state.looseSelection=looseIndex;state.selection=-1;state.dragLoose=looseIndex;updateUI();}
 if(state.pointer.size===2){
  const p=[...state.pointer.values()],dx=p[0].x-p[1].x,dy=p[0].y-p[1].y;
  state.pinch={distance:Math.hypot(dx,dy),zoom:state.camera.zoom};
 }
}
function canvasPointerMove(e){
 const p=state.pointer.get(e.pointerId);if(!p)return;
 const oldX=p.x,oldY=p.y;p.x=e.clientX;p.y=e.clientY;
 if(state.pointer.size===1&&p.looseIndex>=0){
  if(Math.hypot(p.x-p.originX,p.y-p.originY)<5)return;
  if(!p.dragged){pushHistory();p.dragged=true;}
  const from=screenToWorld({clientX:oldX,clientY:oldY}),to=screenToWorld(e);
  const piece=state.loose[p.looseIndex];if(!piece)return;
  piece.x=Math.max(140,Math.min(TABLE.width-140,piece.x+to.x-from.x));
  piece.y=Math.max(140,Math.min(TABLE.height-140,piece.y+to.y-from.y));
  return;
 }
 if(state.pointer.size>=2&&state.pinch){
  const list=[...state.pointer.values()],a=list[0],b=list[1];
  const dist=Math.hypot(a.x-b.x,a.y-b.y);
  state.camera.zoom=Math.max(.65,Math.min(4,state.pinch.zoom*dist/Math.max(1,state.pinch.distance)));
  state.camera.panX+=(e.clientX-oldX)/2;state.camera.panY+=(e.clientY-oldY)/2;
 }else{state.camera.panX+=e.clientX-oldX;state.camera.panY+=e.clientY-oldY;}
}
function canvasPointerEnd(e){
 const p=state.pointer.get(e.pointerId);if(!p)return;
 state.pointer.delete(e.pointerId);if(state.pointer.size<2)state.pinch=null;
 if(p.looseIndex>=0){
  if(p.dragged){if(!snapLoose(p.looseIndex)){save();updateUI();}}
  state.dragLoose=-1;return;
 }
 if(state.pointer.size===0&&Math.hypot(p.x-p.originX,p.y-p.originY)<10){
  const pt=screenToWorld(e),hit=nearestPiece(state.track,pt.x,pt.y);
  state.selection=hit.index>=0&&hit.distance<TRACK_WIDTH*.58?hit.index:-1;
  state.looseSelection=-1;
  updateUI();
 }
}
function initEvents(){
 $("play").addEventListener("click",play);
 $("back").addEventListener("click",back);
 $("pause").addEventListener("click",pause);
 $("lane").addEventListener("click",switchLane);
 $("oval").addEventListener("click",()=>{changeTypes(STARTER.slice(),"Óvalo de prueba montado; las piezas sueltas vuelven a la caja.",[]);state.camera={panX:0,panY:0,zoom:1};});
 $("clear").addEventListener("click",()=>changeTypes([],"Mesa vacía: arrastra o toca piezas de la caja.",[]));
 $("undo").addEventListener("click",undo);$("redo").addEventListener("click",redo);
 $("remove").addEventListener("click",removeSelected);$("restore").addEventListener("click",recoverDraft);
 $("rotate").addEventListener("click",rotateLoose);
 $("autoClose").addEventListener("click",closeExactly);
 $("zoomIn").addEventListener("click",()=>{state.camera.zoom=Math.min(4,state.camera.zoom*1.25);});
 $("zoomOut").addEventListener("click",()=>{state.camera.zoom=Math.max(.65,state.camera.zoom/1.25);});
 $("zoomFit").addEventListener("click",()=>{state.camera={panX:0,panY:0,zoom:1};});
 for(const type of ["pointerdown","pointermove","pointerup","pointercancel","lostpointercapture"]){
  editCanvas.addEventListener(type,e=>{
   if(type==="pointerdown")canvasPointerDown(e);
   else if(type==="pointermove")canvasPointerMove(e);
   else canvasPointerEnd(e);
  });
 }
 editCanvas.addEventListener("wheel",e=>{
  if(state.mode!=="build")return;e.preventDefault();
  state.camera.zoom=Math.max(.65,Math.min(4,state.camera.zoom*(e.deltaY>0?.9:1.1)));
 },{passive:false});
 const trigger=$("trigger");
 trigger.addEventListener("pointerdown",e=>{if(!state.run)return;setTrigger(true);try{trigger.setPointerCapture(e.pointerId);}catch(err){};});
 for(const name of ["pointerup","pointercancel","lostpointercapture"])trigger.addEventListener(name,()=>setTrigger(false));
 const throttle=$("throttle");
 throttle.addEventListener("input",e=>{state.gas=Number(e.target.value)/100;updateHud();});
 const release=()=>{state.gas=0;throttle.value="0";updateHud();};
 for(const name of ["pointerup","pointercancel","lostpointercapture","change"])throttle.addEventListener(name,release);
 window.addEventListener("keydown",e=>{
  if(e.code==="Escape"&&state.mode==="race"){back();return;}
  if(state.mode==="race"&&(e.code==="Space"||e.code==="ArrowUp")&&e.target.tagName!=="INPUT"){e.preventDefault();state.keyboardGas=true;}
  if(state.mode==="race"&&e.code==="KeyP"){pause();}
 });
 window.addEventListener("keyup",e=>{if(e.code==="Space"||e.code==="ArrowUp")state.keyboardGas=false;});
 const pauseBackground=()=>{state.buttonGas=false;state.keyboardGas=false;state.gas=0;throttle.value="0";if(state.mode==="race")state.run=false;updateHud();};
 window.addEventListener("blur",pauseBackground);
 document.addEventListener("visibilitychange",()=>{if(document.hidden)pauseBackground();});
 window.addEventListener("resize",resize);
 if(typeof ResizeObserver!=="undefined"){
  new ResizeObserver(resize).observe($("tableSpace"));
  new ResizeObserver(resize).observe($("raceSpace"));
 }
}
function loop(now){
 const dt=Math.max(0,Math.min(.05,(now-state.latest)/1000));state.latest=now;
 simulation(dt);resize();
 if(state.mode==="build")renderScene(editCanvas,"build");else renderScene(raceCanvas,"race");
 if(!state._hudTime||now-state._hudTime>100){state._hudTime=now;updateHud();}
 if(state.noticeUntil&&now>state.noticeUntil){$("toast").classList.remove("show");state.noticeUntil=0;}
 requestAnimationFrame(loop);
}
palette();initEvents();updateUI();resize();requestAnimationFrame(loop);
window.slotraceLab={state,buildTrack,STARTER,CATALOG,openRace:play,back,undo,redo,changeTypes};
