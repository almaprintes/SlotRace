import {TABLE,START,TRACK_WIDTH,LANE_OFFSET,CATALOG,CURVE_FAMILIES,STARTER,FIGURE_EIGHT,buildTrack,positionAt,nearestPiece,freeStock,allowed,UNLIMITED_DEVELOPMENT_STOCK,positionOnPiece,findLegalClosure,findStraightRebalance,carTrackLevel,elevationAt,gapAnalysis,laneAIndexAtFinish} from "./track.mjs";
import {buildRecipe,blueprintReferenceMap,slugName} from "./blueprint.mjs";
import {buildCurveKerbs,selectCurveKerbs,KERB_STYLE} from "./kerbs.mjs";
import {buildSmartRunoffs,RUNOFF_STYLE} from "./runoffs.mjs";
const $=id=>document.getElementById(id);
const storage=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}};
const KEY="slotrace-lab-10";
const LIBRARY_KEY="slotrace-circuit-library-v1";
const LIBRARY_REVISIONS_KEY="slotrace-circuit-versions-v1";
const SHOP_OWNED_KEY="slotrace-shop-owned-v1";
const SHOP_DEFAULT_OWNED=Object.freeze(["box-basic","car-gripline"]);
const TABLE_THEMES=Object.freeze({
 wine:Object.freeze({
  label:"Vino oscuro + oro",surface:["#502331","#341b2a","#200f1b"],
  grid:"#d8b77f",majorAlpha:.19,minorAlpha:.075,
  felt:["#532637","#3a1b2b","#25121f"],
  textureLight:"#d8b77f",textureDark:"#170a12",
  writing:"#dfbe8d",writingAlpha:.25
 }),
 cyan:Object.freeze({
  label:"Cian profundo + oro",surface:["#17677d","#10465c","#092b3e"],
  grid:"#edca90",majorAlpha:.20,minorAlpha:.075,
  felt:["#17647a","#10485d","#092c3d"],
  textureLight:"#c2e6df",textureDark:"#061b2a",
  writing:"#f2d7a8",writingAlpha:.25
 })
});
const currentTableTheme=()=>TABLE_THEMES[state.tableTheme]||TABLE_THEMES.wine;
// Receta original compartida de Catalunya Slot (60 piezas, 18,89 m).
// Conservar orden, posición y orientación: corresponden al plano del usuario.
const CATALUNYA_SLOT_TYPES=Object.freeze(["R3_225L","R4_225L","S600","S075","S350","S350","START350","S350","S350","S350","S350","S350","R2_45L","R2_45L","S350","S350","R2_45L","S350","S350","R2_90L","R2_90L","S350","S350","R1_90R","R1_90R","S175","S350","S350","S350","R2_90L","S350","S350","S350","R1_45R","S175","S350","R2_45R","S350","S350","R1_45R","R1_90R","S350","S350","S350","R2_90L","R2_90L","S350","S350","S350","S350","R2_45L","S350","S350","R2_90L","S350","S350","S350","R2_225R","R1_225L","S075"]);
const CATALUNYA_SLOT_ORIGIN=Object.freeze({x:-774.9121317783404,y:-621.1758796080073,h:Math.PI/2});
const SHOP_PRODUCTS=Object.freeze([
 {id:"box-basic",kind:"boxes",name:"Caja básica SR-Precision",short:"SR-PRECISION",
  kicker:"SET DE INICIACIÓN",tag:"TU CAJA",car:"gripline",
  subtitle:"La primera caja de tu colección",detail:"Un set inicial con el Avenir Gripline y el trazado ovalado SR-Precision.",
  pieces:{S350:4,R2_45R:8},plans:["plan-oval"],cars:["car-gripline"],
  highlights:["Avenir Gripline","12 piezas","Plano Óvalo SR"],art:"red"},
 {id:"box-rally",kind:"boxes",name:"Open Rally Box",short:"OPEN RALLY",
  kicker:"EDICIÓN ESPECIAL",tag:"NOVEDAD",car:"spark",
  subtitle:"Curvas, cruce y un nuevo coche",detail:"Caja temática con Helix Spark, un trazado en ocho y un kit de puente virtual.",
  pieces:{S600:2,R2_45R:6,R2_45L:6},plans:["plan-eight"],cars:["car-spark"],
  highlights:["Helix Spark","14 piezas","Ocho con puente"],art:"scarlet"},
 {id:"pack-curves",kind:"packs",name:"Pack de curvas",short:"CURVAS R2",
  kicker:"AMPLIACIÓN DE PISTAS",tag:"PACK",car:null,
  subtitle:"Más posibilidades de trazado",detail:"Ocho curvas R2 de 45° para nuevas configuraciones.",
  pieces:{R2_45R:4,R2_45L:4},highlights:["8 curvas R2","Derecha e izquierda"],art:"curve"},
 {id:"pack-bridge",kind:"packs",name:"Pack puente 65 mm",short:"KIT PUENTE",
  kicker:"AMPLIACIÓN TÉCNICA",tag:"PACK",car:null,
  subtitle:"Cruces a distinto nivel",detail:"Kit visual de elevación de 65 mm con soportes y rampas. Se monta desde la pestaña Puentes.",
  bridge:true,pieces:{},highlights:["65 mm","Soportes + rampas"],art:"bridge"},
 {id:"pack-speed",kind:"packs",name:"Pack de rectas",short:"VELOCIDAD",
  kicker:"AMPLIACIÓN DE PISTAS",tag:"PACK",car:null,
  subtitle:"Rectas largas para acelerar",detail:"Cuatro rectas de 350 mm y dos rectas de puente de 600 mm.",
  pieces:{S350:4,S600:2},highlights:["6 rectas","350 y 600 mm"],art:"straight"},
 {id:"plan-oval",kind:"circuits",name:"Óvalo SR-Precision",short:"ÓVALO SR",
  kicker:"PLANO OFICIAL",tag:"RECETA REAL",car:null,
  subtitle:"El circuito para empezar",detail:"Trazado ovalado de doce piezas, validado con el motor geométrico del juego.",
  types:STARTER,highlights:["12 piezas","2 carriles","Cierre validado"],art:"oval"},
 {id:"plan-eight",kind:"circuits",name:"Ocho con puente",short:"OCHO SR",
  kicker:"PLANO OFICIAL",tag:"RECETA REAL",car:null,
  subtitle:"Un cruce elevado con dos lóbulos",detail:"Un ocho de catorce piezas con puente automático, validado por la geometría de SlotRace.",
  types:FIGURE_EIGHT,highlights:["14 piezas","Puente 65 mm","Cierre validado"],art:"eight"},
 {id:"plan-catalunya",kind:"circuits",name:"Catalunya Slot",short:"CATALUNYA SLOT",
  kicker:"PLANO REAL",tag:"RECETA ORIGINAL",car:null,creator:"Juanfrikazo-dev",
  subtitle:"Gran trazado de 60 piezas · 18,89 m",detail:"Circuito Catalunya Slot de 60 piezas y 18,89 metros, sentido horario. Receta real aportada por su constructor, sin elevaciones.",
  types:CATALUNYA_SLOT_TYPES,origin:CATALUNYA_SLOT_ORIGIN,direction:1,
  highlights:["60 piezas","18,89 m","Horario"],art:"catalunya"},
 {id:"car-gripline",kind:"cars",name:"Avenir Gripline",short:"GRIPLINE",
  kicker:"COCHE DE INICIO",tag:"JUGABLE",car:"gripline",
  subtitle:"Tu coche de competición",detail:"Vehículo inicial de SlotRace, disponible en la pista desde el principio.",
  highlights:["Disponible para correr","Coche incluido en tu caja"],art:"car"},
 {id:"car-spark",kind:"cars",name:"Helix Spark",short:"HELIX SPARK",
  kicker:"COCHE DE COLECCIÓN",tag:"YA JUGABLE",car:"spark",
  subtitle:"El deportivo que estabas esperando",detail:"Helix Spark ya puede seleccionarse en el Garaje y conducirse en tus circuitos. Comparte las mismas físicas y el mismo mando que Gripline durante las pruebas.",
  highlights:["Conducción disponible","Sprite cenital original"],art:"car"}
]);
const SHOP_CATEGORIES=Object.freeze({
 boxes:{title:"Cajas completas",button:"shopTabBoxes"},
 packs:{title:"Packs de piezas",button:"shopTabPacks"},
 circuits:{title:"Planos de circuitos",button:"shopTabCircuits"},
 cars:{title:"Coches de colección",button:"shopTabCars"}
});
const shopProduct=id=>SHOP_PRODUCTS.find(p=>p.id===id)||null;
function readShopOwned(){
 try{
  const saved=JSON.parse(storage(SHOP_OWNED_KEY)||"[]");
  return Array.from(new Set([...SHOP_DEFAULT_OWNED,...(Array.isArray(saved)?saved:[])]))
   .filter(id=>Boolean(shopProduct(id)));
 }catch(e){return SHOP_DEFAULT_OWNED.slice();}
}
const normalCircuitName=name=>String(name||"").trim().replace(/\s+/g," ").toLocaleLowerCase();
// El nombre de autor pertenece a la receta y se conserva al compartirla.
// Migración limitada a los dos circuitos creados anteriormente por el usuario.
const LOCAL_CREATOR="Juanfrikazo-dev";
const cleanCreator=value=>typeof value==="string"?value.trim().slice(0,48):"";
const creatorForLegacyCircuit=name=>["mónaco slot","monaco slot","catalunya slot"]
 .includes(normalCircuitName(name))?LOCAL_CREATOR:"";
const newCircuitId=()=> "sr-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
function readCircuitRevisions(){
 try{
  const items=JSON.parse(storage(LIBRARY_REVISIONS_KEY)||"[]");
  return Array.isArray(items)?items.filter(item=>
   item&&typeof item.name==="string"&&Array.isArray(item.snapshot?.types)
   &&allowed(item.snapshot.types)).slice(0,30):[];
 }catch(e){return [];}
}
const readLibrary=()=>{try{
 const stored=JSON.parse(storage(LIBRARY_KEY)||"[]");
 return Array.isArray(stored)?stored.filter(item=>item&&typeof item.id==="string"&&
  typeof item.name==="string"&&Array.isArray(item.snapshot?.types)&&
  allowed(item.snapshot.types)).slice(0,120):[];
 }catch(e){return [];}};
const initialLibrary=readLibrary();
const old=(()=>{try{return JSON.parse(storage(KEY)||"null");}catch(e){return null;}})();
const legacy=(()=>{try{return JSON.parse(storage("slotrace-lab-04")||"null");}catch(e){return null;}})();
const oldValid=old?.types&&allowed(old.types);
const initial=oldValid?old.types.slice():FIGURE_EIGHT.slice();
const originalRaised=oldValid&&Array.isArray(old?.bridgeParts)?old.bridgeParts.filter(i=>Number.isInteger(i)&&i>=0&&i<initial.length):[];
// El primer inicio de DEV 0.5 conserva la construcción anterior sin
// sustituir el ocho de demostración. Nunca borramos la clave antigua.
const legacyDraft=!oldValid&&legacy?.types&&allowed(legacy.types)?
 {types:legacy.types.slice(),loose:Array.isArray(legacy.loose)?legacy.loose:[]} :null;
const storedLoose=Array.isArray(old?.loose)?old.loose.filter(p=>CATALOG[p?.id]&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.h)):[];
const initialLoose=allowed([...initial,...storedLoose.map(p=>p.id)])?storedLoose:[];
const initialOrigin=old?.origin&&[old.origin.x,old.origin.y,old.origin.h].every(Number.isFinite)?
 {...old.origin}:{...START};
const REFERENCE_DB="slotrace-reference-images-v1";
const REFERENCE_PREFIX="slotrace-reference-image-";
const refClamp=(v,min,max)=>Math.min(max,Math.max(min,v));
function validReference(ref){
 if(!ref||typeof ref.id!=="string"||!/^ref-[a-zA-Z0-9-]{6,60}$/.test(ref.id))return null;
 const x=Number(ref.x),y=Number(ref.y),width=Number(ref.width),height=Number(ref.height);
 if(![x,y,width,height].every(Number.isFinite)||width<=0||height<=0)return null;
 return{id:ref.id,x,y,width:refClamp(width,10,10000),height:refClamp(height,10,10000),
  scale:refClamp(Number(ref.scale)||1,.1,20),
  angle:Number.isFinite(ref.angle)?refClamp(ref.angle,-Math.PI,Math.PI):0,
  opacity:refClamp(Number.isFinite(ref.opacity)?ref.opacity:.30,0,.8),
  visible:ref.visible!==false,locked:ref.locked!==false};
}
const state={
  circuitName:typeof old?.circuitName==="string"?old.circuitName.slice(0,64):"",
  circuitCreator:typeof old?.circuitCreator==="string"?cleanCreator(old.circuitCreator):
   cleanCreator(initialLibrary.find(c=>c.id===old?.activeCircuitId)?.creator)||
   creatorForLegacyCircuit(old?.circuitName),
  reference:validReference(old?.reference),referenceImage:null,
  templatePanelOpen:false,templateIncludeInExport:false,templateLoading:false,
  activeCircuitId:initialLibrary.some(c=>c.id===old?.activeCircuitId)?old.activeCircuitId:null,
  library:initialLibrary,libraryTab:"circuits",sessionLaps:[],sessionName:"",caseCategory:"straight",casePage:0,
  shopOwned:readShopOwned(),shopCategory:"boxes",shopSelectedId:null,shopCollectionExpanded:false,
  selectedCar:old?.selectedCar==="spark"?"spark":"gripline",sessionCar:"gripline",
  cameraMode:["general","follow","custom"].includes(old?.cameraMode)?old.cameraMode:"general",
  followZoom:Number.isFinite(Number(old?.followZoom))?
   Math.max(2,Math.min(30,Math.round(Number(old.followZoom)*2)/2)):5,
  followCamera:{x:0,y:0,lookX:0,lookY:0,ready:false,settle:0},
  tableTheme:Object.hasOwn(TABLE_THEMES,old?.tableTheme)?old.tableTheme:"wine",
  gridEnabled:old?.gridEnabled!==false,xRayEnabled:old?.xRayEnabled===true,caseOpen:old?.caseOpen!==false,viewDirty:true,caseCurveDirection:old?.caseCurveDirection==="L"?"L":"R",
  types:initial,loose:initialLoose,bridgeParts:originalRaised,origin:initialOrigin,track:buildTrack(initial,initialOrigin,originalRaised),mode:"menu",driveDirection:old?.driveDirection===-1?-1:1,newCircuitDirection:old?.driveDirection===-1?-1:1,selection:-1,looseSelection:-1,selectionMode:"group",selectedGroup:null,dragLoose:-1,
  history:[],redo:[],draft:old?.draft&&Array.isArray(old.draft.types)?old.draft:
 Array.isArray(old?.draft)&&allowed(old.draft)?{types:old.draft,loose:[]}:
 legacyDraft,
  lane:0,laneTransition:null,lapEligible:true,x350Armed:true,x350Crossings:0,x350FirstLap:null,run:false,raceStarted:false,lap:1,seconds:0,speed:0,distance:0,penalty:0,
  drift:0,driftDirection:0,rearSlip:0,rearSlipVelocity:0,rearStress:0,deslot:null,cornerDistance:0,gripDebt:0,cornerDirection:0,
  gas:0,buttonGas:false,keyboardGas:false,triggerGesture:null,clicksEnabled:old?.clicksEnabled!==false,motorEnabled:old?.motorEnabled!==false,
  records:old?.records&&typeof old.records==="object"?old.records:
 legacy?.records&&typeof legacy.records==="object"?legacy.records:{},
  messages:[],notice:"",noticeUntil:0,rev:0,
  camera:{panX:0,panY:0,zoom:1},pointer:new Map(),pinch:null,gapDiagnostic:null,bridgeRangeStart:null,lastTapHit:null,
  dragging:null,latest:performance.now()
};
const oldBoard=old?.workBoard;
const boardValid=oldBoard&&["left","top","right","bottom","width","height"].every(k=>Number.isFinite(oldBoard[k]));
state.workBoard=boardValid?{...oldBoard}:{...state.track.board};
state.initialAutoFitNeeded=state.track.board.expanded;
function save(){storage(KEY,JSON.stringify({types:state.types,loose:state.loose,bridgeParts:state.bridgeParts,
 origin:state.origin,workBoard:state.workBoard,draft:state.draft,records:state.records,
 reference:state.reference,
 circuitName:state.circuitName,circuitCreator:state.circuitCreator,
 activeCircuitId:state.activeCircuitId,
 tableTheme:state.tableTheme,
 gridEnabled:state.gridEnabled,xRayEnabled:state.xRayEnabled,clicksEnabled:state.clicksEnabled,motorEnabled:state.motorEnabled,caseOpen:state.caseOpen,caseCurveDirection:state.caseCurveDirection,
 driveDirection:state.driveDirection,selectedCar:state.selectedCar,cameraMode:state.cameraMode,followZoom:state.followZoom}));}
const GRID_MM=25;
const gridSnap=v=>Math.round(v/GRID_MM)*GRID_MM;
const coordinate=v=>state.gridEnabled?gridSnap(v):v;
function gridXY(x,y){return {x:coordinate(x),y:coordinate(y)};}
function extendWorkBoard(){
 const b=state.workBoard,t=state.track.board;
 // Crece sin limitar las coordenadas. El rectángulo es informativo.
 b.left=Math.min(b.left,t.left);b.top=Math.min(b.top,t.top);
 b.right=Math.max(b.right,t.right);b.bottom=Math.max(b.bottom,t.bottom);
 for(const piece of state.loose){
  const spec=CATALOG[piece.id];if(!spec)continue;
  const reach=Math.max(TRACK_WIDTH,spec.length||spec.radius*Math.abs(spec.angle))+200;
  b.left=Math.min(b.left,piece.x-reach);b.top=Math.min(b.top,piece.y-reach);
  b.right=Math.max(b.right,piece.x+reach);b.bottom=Math.max(b.bottom,piece.y+reach);
 }
 b.width=b.right-b.left;b.height=b.bottom-b.top;
 b.expanded=b.width>TABLE.width||b.height>TABLE.height;
}
function resetWorkBoard(){state.workBoard={...state.track.board};}
extendWorkBoard();

const stage=$("buildScreen"),race=$("raceScreen"),menu=$("menuScreen"),results=$("resultsScreen");
const hubScreens={
 library:$("libraryScreen"),garage:$("garageScreen"),store:$("storeScreen"),settings:$("settingsScreen")
};
const editCanvas=$("editCanvas"),raceCanvas=$("raceCanvas");
const canvasCtx=new Map([[editCanvas,editCanvas.getContext("2d",{alpha:false})],[raceCanvas,raceCanvas.getContext("2d",{alpha:false})]]);
const format=n=>n.toFixed(3).replace(".",",");
// La lectura del reloj se refresca en cada fotograma; el HUD completo,
// más costoso, conserva su frecuencia reducida de 10 actualizaciones/s.
function updateChronometer(){
 const text=format(state.seconds),field=$("lapTime");
 if(field.textContent!==text)field.textContent=text;
}
// Los récords históricos de Gripline conservan su clave original.
 // Spark utiliza un sufijo propio para no mezclar coches distintos.
const recKey=()=>(state.activeCircuitId?"library-"+state.activeCircuitId+"-":"")+
 state.types.join("-")+(state.driveDirection===-1?"-reverse":"")+
  "-rear-physics-v4"+(state.selectedCar==="spark"?"-helix-spark":"");
const record=()=>{const v=state.records[recKey()];return Array.isArray(v)&&v.length===2?v:[null,null];};
 // La etiqueta depende de la ranura INTERIOR en meta y no de izquierda/derecha.
 // Los índices numéricos de los récords originales permanecen inalterados.
 const laneAIndex=(types=state.types,direction=state.driveDirection)=>
  laneAIndexAtFinish(types,direction);
 const laneLabel=(logical,types=state.types,direction=state.driveDirection)=>
  logical===laneAIndex(types,direction)?"Carril A":"Carril B";
 const laneLetter=(logical,types=state.types,direction=state.driveDirection)=>
  logical===laneAIndex(types,direction)?"A":"B";

function toast(text){state.notice=text;state.noticeUntil=performance.now()+2600;$("toast").textContent=text;$("toast").classList.add("show");}
// La fotografía es un recurso del jugador, nunca parte de las físicas.
// Se guarda en IndexedDB para no agotar localStorage con fotos; fallback
// controlado a localStorage si IndexedDB no está disponible en la PWA.
function referenceFallback(mode,id,data){
 const key=REFERENCE_PREFIX+id;
 if(mode==="put"){localStorage.setItem(key,data);return true;}
 return localStorage.getItem(key);
}
function referenceStorage(mode,id,data){
 return new Promise((resolve,reject)=>{
  const fallback=()=>{
   try{resolve(referenceFallback(mode,id,data));}catch(err){reject(err);}
  };
  if(typeof indexedDB==="undefined"){fallback();return;}
  let req;
  try{req=indexedDB.open(REFERENCE_DB,1);}catch(err){fallback();return;}
  req.onupgradeneeded=()=>{
   if(!req.result.objectStoreNames.contains("images"))
    req.result.createObjectStore("images");
  };
  req.onerror=fallback;
  req.onsuccess=()=>{
   const db=req.result;
   try{
    const tx=db.transaction("images",mode==="put"?"readwrite":"readonly");
    const store=tx.objectStore("images");
    const op=mode==="put"?store.put(data,id):store.get(id);
    let output=null;
    op.onsuccess=()=>{output=mode==="put"?true:(op.result||null);};
    tx.oncomplete=()=>{
     db.close();
     if(mode==="get"&&!output){fallback();return;}
     resolve(output);
    };
    tx.onerror=()=>{db.close();fallback();};
    tx.onabort=()=>{db.close();fallback();};
   }catch(err){db.close();fallback();}
  };
 });
}
function decodeReferenceImage(data){
 return new Promise((resolve,reject)=>{
  if(typeof Image!=="function"){reject(new Error("Imagen no soportada"));return;}
  const img=new Image();
  img.onload=()=>{
   if((img.naturalWidth||img.width)>0&&(img.naturalHeight||img.height)>0)resolve(img);
   else reject(new Error("Imagen vacía"));
  };
  img.onerror=()=>reject(new Error("Imagen no compatible"));
  img.src=data;
 });
}
async function loadReferenceForState(){
 const id=state.reference?.id;
 state.referenceImage=null;
 state.viewDirty=true;
 if(!id)return false;
 try{
  const data=await referenceStorage("get",id);
  if(!data){if(state.reference?.id===id)toast("La plantilla no está almacenada en este dispositivo.");return false;}
  const img=await decodeReferenceImage(data);
  if(state.reference?.id!==id)return false; // Circuito cambiado durante la carga.
  state.referenceImage=img;state.viewDirty=true;
  updateTemplateUI();return true;
 }catch(e){
  if(state.reference?.id===id)toast("No se pudo recuperar la imagen de referencia.");
  return false;
 }
}
function updateTemplateUI(){
 const r=state.reference,exists=!!r;
 $("templatePanel").hidden=!state.templatePanelOpen;
 $("templateToggle").setAttribute("aria-expanded",String(state.templatePanelOpen));
 $("templateMove").disabled=!exists;
 $("templateVisibility").disabled=!exists;
 $("templateFit").disabled=!exists;
 $("templateRemove").disabled=!exists;
 $("templateExport").disabled=!exists;
 for(const key of ["templateOpacity","templateScale","templateRotate"])
  $(key).disabled=!exists;
 $("templateOpacity").value=String(Math.round((r?.opacity??.3)*100));
 $("templateOpacityValue").textContent=Math.round((r?.opacity??.3)*100)+" % visible";
 $("templateScale").value=String(Math.round((r?.scale??1)*100));
 $("templateScaleValue").textContent=Math.round((r?.scale??1)*100)+" %";
 $("templateRotate").value=String(Math.round((r?.angle??0)*180/Math.PI));
 $("templateRotateValue").textContent=Math.round((r?.angle??0)*180/Math.PI)+"°";
 $("templateMove").textContent=r&&!r.locked?"✓ Bloquear posición":"Mover imagen";
 $("templateMove").setAttribute("aria-pressed",String(Boolean(r&&!r.locked)));
 $("templateVisibility").textContent=r&&!r.visible?"Mostrar":"Ocultar";
 $("templateVisibility").setAttribute("aria-pressed",String(Boolean(r?.visible)));
 $("templateExport").checked=state.templateIncludeInExport;
 $("templateStatus").textContent=state.templateLoading?"Preparando imagen…":
  !r?"No hay imagen cargada.":"Imagen "+(r.visible?"visible":"oculta")+
  " · "+(r.locked?"bloqueada":"arrastra sobre la mesa para moverla");
}
function openTemplatePanel(open=!state.templatePanelOpen){
 state.templatePanelOpen=Boolean(open);updateTemplateUI();
}
function templateFit(){
 const r=state.reference;if(!r)return false;
 pushHistory();
 r.scale=refClamp(state.workBoard.width*.85/r.width,.1,20);
 r.x=(state.workBoard.left+state.workBoard.right)/2;
 r.y=(state.workBoard.top+state.workBoard.bottom)/2;
 r.angle=0;r.visible=true;
 save();updateUI();toast("Plantilla centrada. Puedes ampliarla hasta un 2000 %.");return true;
}
function templateSet(prop,value){
 const r=state.reference;if(!r)return false;
 if(prop==="opacity")r.opacity=refClamp(Number(value)/100,0,.8);
 else if(prop==="scale")r.scale=refClamp(Number(value)/100,.1,20);
 else if(prop==="angle")r.angle=refClamp(Number(value),-180,180)*Math.PI/180;
 else return false;
 state.viewDirty=true;updateTemplateUI();return true;
}
function templateToggleMove(){
 if(!state.reference)return false;
 state.reference.locked=!state.reference.locked;
 save();updateTemplateUI();
 toast(state.reference.locked?"Plantilla bloqueada: ya puedes montar encima.":
  "Arrastra la imagen sobre la mesa. Después pulsa «Bloquear posición».");
 return true;
}
function templateToggleVisibility(){
 if(!state.reference)return false;
 state.reference.visible=!state.reference.visible;
 save();state.viewDirty=true;updateTemplateUI();return true;
}
function templateRemove(){
 if(!state.reference)return false;
 pushHistory();
 state.reference=null;state.referenceImage=null;state.templateIncludeInExport=false;
 save();updateUI();toast("Plantilla quitada. Puedes recuperarla con Deshacer.");return true;
}
async function templateLoadFile(file){
 if(!file)return false;
 if(!file.type?.startsWith("image/")||file.size>20*1024*1024){
  toast("Selecciona una imagen de hasta 20 MB.");return false;
 }
 state.templateLoading=true;updateTemplateUI();
 try{
  const raw=await new Promise((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(reader.result);
   reader.onerror=()=>reject(new Error("Lectura de archivo"));
   reader.readAsDataURL(file);
  });
  const img=await decodeReferenceImage(raw);
  const nw=img.naturalWidth||img.width,nh=img.naturalHeight||img.height;
  const factor=Math.min(1,1600/Math.max(nw,nh));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(nw*factor));
  canvas.height=Math.max(1,Math.round(nh*factor));
  const ctx=canvas.getContext("2d");
  if(!ctx||typeof canvas.toDataURL!=="function")throw new Error("Compresión no disponible");
  ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL("image/jpeg",.78);
  if(!data.startsWith("data:image/")||data.length>4_000_000)
   throw new Error("Imagen demasiado grande tras comprimir");
  const id="ref-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);
  await referenceStorage("put",id,data);
  const picture=await decodeReferenceImage(data);
  pushHistory();
  const width=state.workBoard.width*.85;
  state.reference={id,x:(state.workBoard.left+state.workBoard.right)/2,
   y:(state.workBoard.top+state.workBoard.bottom)/2,
   width,height:width*nh/nw,scale:1,angle:0,opacity:.30,visible:true,locked:true};
  state.referenceImage=picture;state.templateIncludeInExport=false;
  save();updateUI();toast("Plantilla añadida debajo de la pista.");return true;
 }catch(e){
  toast("No se pudo cargar o guardar esa imagen. Prueba con JPG o PNG.");
  return false;
 }finally{state.templateLoading=false;updateTemplateUI();}
}
function paintReference(ctx){
 const r=state.reference,img=state.referenceImage;
 if(!r||!img||!r.visible||r.opacity<=0)return;
 ctx.save();
 ctx.translate(r.x,r.y);ctx.rotate(r.angle);
 ctx.globalAlpha=r.opacity;
 ctx.drawImage(img,-r.width*r.scale/2,-r.height*r.scale/2,
  r.width*r.scale,r.height*r.scale);
 ctx.restore();
}
function setMessage(msg){$("buildStatus").textContent=msg;}
function snapshot(){return{types:state.types.slice(),loose:state.loose.map(p=>({...p})),
 bridgeParts:state.bridgeParts.slice(),origin:{...state.origin},
 reference:state.reference?{...state.reference}:null};}
function restoreSnapshot(shot){
 state.types=shot.types.slice();state.loose=(shot.loose||[]).map(p=>({...p}));
 state.bridgeParts=(shot.bridgeParts||[]).filter(i=>Number.isInteger(i)&&i>=0&&i<state.types.length);
 state.origin=shot.origin?{...shot.origin}:{...START};
 state.reference=validReference(shot.reference);
 state.referenceImage=null;state.templateIncludeInExport=false;
 loadReferenceForState();
 state.track=buildTrack(state.types,state.origin,state.bridgeParts);extendWorkBoard();
 clearGapDiagnostic();
 state.selection=-1;state.looseSelection=-1;state.selectionMode="group";state.selectedGroup=null;resetLap();save();updateUI();
}

/* Inventario de recetas local, compatible con una futura cuenta y catálogo. */
function saveLibrary(){
 try{localStorage.setItem(LIBRARY_KEY,JSON.stringify(state.library));return true;}
 catch(e){toast("No se ha podido guardar la colección. No cierres la PWA.");return false;}
}
function safelyWriteLibrary(items){
 try{localStorage.setItem(LIBRARY_KEY,JSON.stringify(items));return true;}
 catch(e){toast("Error de almacenamiento. No se ha sustituido ningún circuito.");return false;}
}
function circuitLabel(){return state.circuitName.trim()||"Circuito sin nombre";}
function circuitCreator(){
 const item=state.library.find(c=>c.id===state.activeCircuitId);
 // Una autoría explícita, incluso vacía, tiene prioridad. La migración
 // por nombre solo sirve a los planos antiguos, que carecen del campo.
 if(typeof state.circuitCreator==="string"&&state.circuitCreator.trim())
  return cleanCreator(state.circuitCreator);
 if(item&&typeof item.creator==="string")return cleanCreator(item.creator);
 return creatorForLegacyCircuit(state.circuitName);
}
function archiveCircuitRevision(item){
 const revision={id:newCircuitId(),sourceId:item.id,name:item.name,
  creator:cleanCreator(item.creator)||creatorForLegacyCircuit(item.name),
  direction:item.direction,
  snapshot:JSON.parse(JSON.stringify(item.snapshot)),savedAt:new Date().toISOString()};
 const next=[revision,...readCircuitRevisions()].slice(0,30);
 try{localStorage.setItem(LIBRARY_REVISIONS_KEY,JSON.stringify(next));return true;}
 catch(e){toast("Sin espacio para copia de seguridad. Guardado cancelado.");return false;}
}
function snapshotOfDraft(d){
 if(!d||!Array.isArray(d.types)||!allowed([...d.types,...(d.loose||[]).map(p=>p.id)]))return null;
 if(!d.types.length&&!(d.loose||[]).length)return null;
 return{types:d.types.slice(),loose:(d.loose||[]).map(p=>({...p})),
  bridgeParts:(d.bridgeParts||[]).slice(),origin:{...(d.origin||START)},
  reference:validReference(d.reference)};
}
function recoverableDraft(){
 const d=state.draft;
 return d&&typeof d.name==="string"&&d.name.trim()&&snapshotOfDraft(d)
  &&!state.library.some(c=>normalCircuitName(c.name)===normalCircuitName(d.name))?d:null;
}
function protectOrphanDraft(){
 const d=recoverableDraft();if(!d)return;
 const shot=snapshotOfDraft(d),key="draft:"+normalCircuitName(d.name);
 const revisions=readCircuitRevisions();
 if(revisions.some(v=>v.sourceId===key&&JSON.stringify(v.snapshot)===JSON.stringify(shot)))return;
 const entry={id:newCircuitId(),sourceId:key,name:d.name.trim().slice(0,64),
  creator:cleanCreator(d.creator)||creatorForLegacyCircuit(d.name),
  direction:d.direction===-1?-1:1,snapshot:shot,savedAt:new Date().toISOString()};
 try{localStorage.setItem(LIBRARY_REVISIONS_KEY,JSON.stringify([entry,...revisions].slice(0,30)));}
 catch(e){/* Nunca borrar ni modificar el borrador original por un fallo de espacio. */}
}
function addRecoveredCircuit(name,shot,direction,creator=""){
 if(state.library.length>=120){toast("Inventario completo: no cabe el circuito recuperado.");return false;}
 if(!shot||!allowed([...shot.types,...shot.loose.map(p=>p.id)]))return false;
 const date=new Date().toISOString();
 const item={id:newCircuitId(),name,createdAt:date,updatedAt:date,
  creator:cleanCreator(creator)||creatorForLegacyCircuit(name),
  direction:direction===-1?-1:1,snapshot:shot};
 const next=[item,...state.library];
 if(!safelyWriteLibrary(next))return false;
 state.library=next;
 save();updateUI();toast("«"+name+"» recuperado como circuito independiente.");
 return true;
}
function recoverDraftToLibrary(){
 const d=recoverableDraft();
 if(!d){toast("No hay un borrador anterior recuperable.");return false;}
 const shot=snapshotOfDraft(d);
 if(!addRecoveredCircuit(String(d.name).trim().slice(0,64),shot,d.direction,d.creator))return false;
 // Mantener el circuito actual sobre la mesa y la recuperación en el inventario.
 state.draft=null;save();updateUI();return true;
}
function restoreLastCircuitRevision(){
 const versions=readCircuitRevisions();
 if(!versions.length){toast("No hay versiones guardadas todavía.");return false;}
 const last=versions[0];
 const name=state.library.some(item=>normalCircuitName(item.name)===normalCircuitName(last.name))?
  (last.name.slice(0,48)+" (recuperado)") :last.name;
 if(!addRecoveredCircuit(name,last.snapshot,last.direction,last.creator))return false;
 // Consumir la revisión recuperada para no duplicarla accidentalmente.
 try{localStorage.setItem(LIBRARY_REVISIONS_KEY,JSON.stringify(versions.slice(1)));}
 catch(e){/* Conservamos la copia si no es posible actualizar el historial. */}
 updateUI();return true;
}
function saveCircuit(){
 const field=state.mode==="build"?$("workCircuitName"):$("circuitName");
 const name=String(field.value||state.circuitName).trim().replace(/\s+/g," ").slice(0,64);
 if(!name){toast("Ponle nombre al circuito antes de guardarlo.");return false;}
 if(!state.types.length&&!state.loose.length){toast("Añade al menos una pieza.");return false;}
 const active=state.library.find(c=>c.id===state.activeCircuitId);
 const changedName=!!active&&normalCircuitName(name)!==normalCircuitName(active.name);
 // Un nombre diferente significa OTRO circuito. Nunca renombrar o machacar
 // la receta original a través del botón Guardar.
 const create=!active||changedName;
 if(create&&state.library.length>=120){toast("Inventario completo (120 circuitos).");return false;}
 if(state.library.some(c=>normalCircuitName(c.name)===normalCircuitName(name)
   &&(create||c.id!==active.id))){
  toast("Ya existe un circuito llamado «"+name+"». Abre ese circuito para editarlo.");
  return false;
 }
 const currentSnapshot=snapshot();
 const now=new Date().toISOString();
 const oldRecord=!active?record():null;
 const item=create?{id:newCircuitId(),createdAt:now}:active;
 const nextItem={...item,name,direction:state.driveDirection,
  creator:circuitCreator()||creatorForLegacyCircuit(name),
  snapshot:currentSnapshot,updatedAt:now};
 if(!create&&JSON.stringify({s:item.snapshot,d:item.direction})!==
  JSON.stringify({s:nextItem.snapshot,d:nextItem.direction})){
  if(!archiveCircuitRevision(item))return false;
 }
 const next=create?[nextItem,...state.library]:
  state.library.map(c=>c.id===item.id?nextItem:c);
 if(!safelyWriteLibrary(next))return false;
 state.library=next;
 state.circuitName=name;state.activeCircuitId=nextItem.id;
 state.circuitCreator=nextItem.creator;
 if(create&&oldRecord?.some(v=>v!==null)&&!state.records[recKey()])
  state.records[recKey()]=oldRecord.slice();
 save();updateUI();
 toast(changedName?"«"+name+"» creado. «"+active.name+"» sigue guardado.":
  "Guardado en Mis circuitos: «"+name+"».");
 return true;
}
function loadSavedCircuit(id,{stayInLibrary=false}={}){
 const item=state.library.find(c=>c.id===id);
 if(!item||!allowed(item.snapshot.types))return false;
 if(state.types.length||state.loose.length)state.draft={...snapshot(),
  name:state.circuitName,creator:circuitCreator(),
  direction:state.driveDirection,activeId:state.activeCircuitId};
 state.circuitName=item.name;state.activeCircuitId=id;
 state.circuitCreator=typeof item.creator==="string"?cleanCreator(item.creator):
  creatorForLegacyCircuit(item.name);
 state.driveDirection=item.direction===-1?-1:1;
 state.newCircuitDirection=state.driveDirection;
 restoreSnapshot(item.snapshot);resetWorkBoard();
 state.camera={panX:0,panY:0,zoom:1};state.sessionLaps=[];
 state.initialAutoFitNeeded=state.track.board.expanded;
 save();
 if(stayInLibrary){
  // Elegir por el nombre carga las piezas y actualiza «EN MESA», pero
  // mantiene abierta la colección. El botón Abrir sigue yendo al taller.
  updateUI();
  toast("Seleccionado en la mesa: «"+item.name+"».");
 }else{
  openWorkshop();
  toast("Circuito recuperado: «"+item.name+"».");
 }
 return true;
}
function selectSavedCircuit(id){
 const item=state.library.find(c=>c.id===id);
 if(!item)return false;
 // Tocar de nuevo el nombre del circuito que ya está en mesa no debe
 // sobrescribir una edición que aún no se haya guardado.
 if(id===state.activeCircuitId){
  updateUI();toast("«"+item.name+"» ya está seleccionado.");return true;
 }
 return loadSavedCircuit(id,{stayInLibrary:true});
}
// Las fichas se eliminan por ID, nunca por nombre: dos diseños pueden
// compartir un nombre tras una recuperación y deben ser independientes.
let openSwipeCircuitId=null;
let openSwipeFront=null;
let openSwipeDeleteButton=null;
let pendingDeleteCircuitId=null;
let deleteFocusReturn=null;
const SWIPE_REVEAL=100;
function requestCircuitDeletion(id){
 const item=state.library.find(c=>c.id===id);
 if(!item)return false;
 pendingDeleteCircuitId=id;
 deleteFocusReturn=document.activeElement;
 $("deleteCircuitName").textContent="«"+item.name+"»";
 $("deleteCircuitNote").textContent=item.id===state.activeCircuitId?
  "Se quitará de la colección. El circuito que tienes en la mesa quedará sin guardar.":
  "Se eliminarán su ficha y sus mejores tiempos guardados. Los demás circuitos no cambiarán.";
 $("circuitDeleteDialog").hidden=false;
 $("deleteCircuitCancel").focus?.();
 return true;
}
function cancelCircuitDeletion(){
 pendingDeleteCircuitId=null;
 $("circuitDeleteDialog").hidden=true;
 deleteFocusReturn?.focus?.();deleteFocusReturn=null;
}
function confirmCircuitDeletion(){
 const id=pendingDeleteCircuitId;
 if(!id)return false;
 const item=state.library.find(c=>c.id===id);
 if(!item){cancelCircuitDeletion();return false;}
 const remaining=state.library.filter(c=>c.id!==id);
 // Guardar en el almacenamiento ANTES de cambiar memoria o récords.
 if(!safelyWriteLibrary(remaining))return false;
 state.library=remaining;
 // No borrar los récords de ningún otro circuito, aunque compartan nombre.
 const prefix="library-"+id+"-";
 for(const key of Object.keys(state.records))if(key.startsWith(prefix))delete state.records[key];
 if(state.activeCircuitId===id)state.activeCircuitId=null;
 if(state.draft?.activeId===id)state.draft=null;
 // Quitar del historial únicamente las revisiones de esa identidad.
 const revisions=readCircuitRevisions();
 try{localStorage.setItem(LIBRARY_REVISIONS_KEY,
  JSON.stringify(revisions.filter(v=>v.sourceId!==id)));}
 catch(e){/* El circuito ya fue eliminado del inventario; conservamos la copia si falla. */}
 openSwipeCircuitId=null;openSwipeFront=null;openSwipeDeleteButton=null;
 cancelCircuitDeletion();
 save();updateUI();
 toast("«"+item.name+"» eliminado de Mis circuitos.");
 return true;
}
// Las variantes de físicas, coche, sentido y geometría son récords
// independientes. Nunca tomar mínimos de dos versiones distintas.
function savedCircuitRecords(item){
 const prefix="library-"+item.id+"-";
 const currentShape=item.snapshot.types.join("-");
 const variants=[];
 for(const [key,values] of Object.entries(state.records)){
  if(!key.startsWith(prefix)||!Array.isArray(values)||values.length!==2)continue;
  const times=values.map(value=>typeof value==="number"&&
   Number.isFinite(value)&&value>0?value:null);
  if(times.every(value=>value===null))continue;
  let signature=key.slice(prefix.length);
  const car=signature.endsWith("-helix-spark")?"spark":"gripline";
  if(car==="spark")signature=signature.slice(0,-"-helix-spark".length);
  const match=signature.match(/-rear-physics-v(\d+)$/);
  const physics=match?Number(match[1]):0;
  if(match)signature=signature.slice(0,-match[0].length);
  const reverse=signature.endsWith("-reverse");
  if(reverse)signature=signature.slice(0,-"-reverse".length);
  const currentGeometry=signature===currentShape;
  const keyTypes=signature.split("-");
  const variantTypes=keyTypes.every(id=>CATALOG[id])?keyTypes:item.snapshot.types;
  variants.push({key,car,reverse,physics,currentGeometry,types:variantTypes,times,
   combined:times.every(value=>value!==null)?times[0]+times[1]:null});
 }
 variants.sort((a,b)=>Number(b.currentGeometry)-Number(a.currentGeometry)||
  Number(b.physics===4)-Number(a.physics===4)||
  b.physics-a.physics||a.car.localeCompare(b.car)||
  Number(a.reverse)-Number(b.reverse));
 return variants;
}
function libraryText(tag,className,value){
 const node=document.createElement(tag);
 if(className)node.className=className;
 node.textContent=value;
 return node;
}
function renderLibraryRecords(){
 const list=$("libraryRecordsList");
 list.innerHTML="";
 let populated=0,variantTotal=0;
 for(const item of state.library){
  const entries=savedCircuitRecords(item);
  if(entries.length){populated++;variantTotal+=entries.length;}
  const card=document.createElement("article");
  card.className="library-record-card";
  const heading=document.createElement("div");
  heading.className="library-record-card-head";
  const info=document.createElement("div");
  info.className="library-record-card-title";
  info.appendChild(libraryText("h3","",item.name));
  info.appendChild(libraryText("small","",entries.length?
   entries.length+" registro"+(entries.length===1?"":"s"):"Sin tiempos registrados"));
  const open=document.createElement("button");
  open.type="button";open.className="mini";
  open.textContent="Abrir";open.setAttribute("aria-label","Abrir circuito "+item.name);
  open.addEventListener("click",()=>loadSavedCircuit(item.id));
  heading.appendChild(info);heading.appendChild(open);card.appendChild(heading);
  if(!entries.length){
   card.appendChild(libraryText("p","library-record-empty",
    "Todavía no has registrado vueltas en este circuito."));
  }
  for(const entry of entries){
   const panel=document.createElement("div");
   panel.className="library-record-variant"+
    (entry.physics===4&&entry.currentGeometry?" is-current":"");
   const name=entry.car==="spark"?"Helix Spark":"Avenir Gripline";
   const direction=entry.reverse?"Antihorario":"Horario";
   const generation=entry.physics===4?"Físicas actuales (v4)":
    entry.physics?"Físicas v"+entry.physics+" · histórico":"Físicas originales · histórico";
   panel.appendChild(libraryText("div","library-record-variant-title",
    name+" · "+direction));
   panel.appendChild(libraryText("small","library-record-variant-meta",
    generation+(entry.currentGeometry?"":" · Trazado anterior")));
   const times=document.createElement("div");
   times.className="library-record-times";
   const innerIndex=laneAIndex(entry.types,entry.reverse?-1:1);
   for(const [index,label] of ["Carril A","Carril B"].entries()){
    const recordIndex=index===0?innerIndex:1-innerIndex;
    const tile=document.createElement("div");
    tile.className="library-record-time "+(index===0?"lane-left":"lane-right");
    tile.appendChild(libraryText("small","",label));
    tile.appendChild(libraryText("strong","",
     entry.times[recordIndex]===null?"—":format(entry.times[recordIndex])+" s"));
    times.appendChild(tile);
   }
   const combined=document.createElement("div");
   combined.className="library-record-time is-combined";
   combined.appendChild(libraryText("small","","Combinado"));
   combined.appendChild(libraryText("strong","",
    entry.combined===null?"—":format(entry.combined)+" s"));
   times.appendChild(combined);panel.appendChild(times);card.appendChild(panel);
  }
  list.appendChild(card);
 }
 if(!state.library.length){
  list.appendChild(libraryText("p","library-record-empty",
   "Guarda un circuito y completa una vuelta para empezar tu colección de récords."));
 }
 $("libraryRecordsCount").textContent=populated+" de "+state.library.length+
  " con tiempos · "+variantTotal+" registros";
}
function updateLibraryTabs(){
 const showing=state.libraryTab==="records";
 $("libraryCircuitsPanel").hidden=showing;
 $("libraryRecordsPanel").hidden=!showing;
 for(const [id,active] of [["libraryTabCircuits",!showing],["libraryTabRecords",showing]]){
  const button=$(id);button.classList.toggle("is-active",active);
  button.setAttribute("aria-selected",String(active));
  button.tabIndex=active?0:-1;
 }
 if(showing)renderLibraryRecords();
}
function setLibraryTab(tab){
 if(tab!=="circuits"&&tab!=="records")return false;
 state.libraryTab=tab;
 updateLibraryTabs();
 return true;
}
function renderLibrary(){
 const list=$("circuitLibrary");list.innerHTML="";
 openSwipeFront=null;openSwipeDeleteButton=null;
 $("libraryCount").textContent=state.library.length+" guardados";
 if(!state.library.length){
  const empty=document.createElement("p");empty.className="library-empty";
  empty.textContent="Todavía no hay circuitos guardados.";
  list.appendChild(empty);return;
 }
 for(const item of state.library){
  const shell=document.createElement("div");shell.className="library-swipe"+
   (item.id===state.activeCircuitId?" is-selected":"");
  const deleteButton=document.createElement("button");
  deleteButton.type="button";deleteButton.className="library-delete";
  deleteButton.setAttribute("aria-label","Eliminar circuito "+item.name);
  deleteButton.innerHTML='<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18m-2 0-1 15H6L5 6m3 0V4h8v2M10 10v7m4-7v7"/></svg><span>Eliminar</span>';
  const row=document.createElement("div");row.className="library-entry";
  row.tabIndex=0;
  row.setAttribute("role","group");
  row.setAttribute("aria-label","Circuito "+item.name+". Desliza a la izquierda para mostrar Eliminar");
  const info=document.createElement("div");info.className="library-info";
  const name=document.createElement("button");
  name.type="button";name.className="library-name";name.textContent=item.name;
  name.setAttribute("aria-label","Seleccionar "+item.name+" sin salir de Mis circuitos");
  name.setAttribute("aria-pressed",String(item.id===state.activeCircuitId));
  const detail=document.createElement("small");
  detail.textContent=item.snapshot.types.length+" piezas · "+
   (item.direction===-1?"Antihorario":"Horario")+
   (item.id===state.activeCircuitId?" · EN MESA":"");
  info.appendChild(name);info.appendChild(detail);
  const button=document.createElement("button");button.className="mini";
  button.type="button";button.textContent="Abrir";
  let lastSwipeAt=-Infinity;
  name.addEventListener("click",()=>{
   // No interpretar como selección un toque que terminó en deslizamiento.
   if(performance.now()-lastSwipeAt<400)return;
   openSwipeCircuitId=null;openSwipeFront=null;openSwipeDeleteButton=null;
   selectSavedCircuit(item.id);
  });
  button.addEventListener("click",()=>{
   // iOS puede disparar click al levantar el dedo tras un gesto horizontal.
   if(performance.now()-lastSwipeAt<400)return;
   openSwipeCircuitId=null;openSwipeFront=null;openSwipeDeleteButton=null;
   loadSavedCircuit(item.id);
  });
  row.appendChild(info);row.appendChild(button);
  shell.appendChild(deleteButton);shell.appendChild(row);list.appendChild(shell);
  const setOpen=(open)=>{
   if(open&&openSwipeFront&&openSwipeFront!==row){
    openSwipeFront.style.transform="translateX(0px)";
    openSwipeDeleteButton.disabled=true;
    openSwipeDeleteButton.tabIndex=-1;
    openSwipeDeleteButton.setAttribute("aria-hidden","true");
   }
   if(open){openSwipeCircuitId=item.id;openSwipeFront=row;openSwipeDeleteButton=deleteButton;}
   else if(openSwipeCircuitId===item.id){
    openSwipeCircuitId=null;openSwipeFront=null;openSwipeDeleteButton=null;
   }
   row.style.transition="transform .19s ease";
   row.style.transform=open?"translateX(-"+SWIPE_REVEAL+"px)":"translateX(0px)";
   deleteButton.disabled=!open;
   deleteButton.tabIndex=open?0:-1;
   deleteButton.setAttribute("aria-hidden",String(!open));
   row.setAttribute("aria-expanded",String(open));
  };
  setOpen(openSwipeCircuitId===item.id);
  deleteButton.addEventListener("click",()=>requestCircuitDeletion(item.id));
  let pointer=null;
  row.addEventListener("pointerdown",e=>{
   if(e.pointerType==="mouse"&&e.button!==0)return;
   pointer={id:e.pointerId,x:e.clientX,y:e.clientY,
    startOpen:openSwipeCircuitId===item.id,dragging:false};
  });
  row.addEventListener("pointermove",e=>{
   if(!pointer||e.pointerId!==pointer.id)return;
   const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
   if(!pointer.dragging){
    if(Math.abs(dy)>14&&Math.abs(dy)>Math.abs(dx)) {pointer=null;return;}
    if(Math.abs(dx)<11||Math.abs(dx)<Math.abs(dy)*1.15)return;
    pointer.dragging=true;
    row.setPointerCapture?.(e.pointerId);
   }
   e.preventDefault?.();
   const offset=Math.max(-SWIPE_REVEAL,Math.min(0,(pointer.startOpen?-SWIPE_REVEAL:0)+dx));
   row.style.transition="none";
   row.style.transform="translateX("+offset+"px)";
  },{passive:false});
  row.addEventListener("pointerup",e=>{
   if(!pointer||e.pointerId!==pointer.id)return;
   const {x,startOpen,dragging}=pointer;pointer=null;
   if(!dragging)return;
   e.preventDefault?.();
   lastSwipeAt=performance.now();
   const dx=e.clientX-x;
   setOpen(startOpen?dx<45:dx< -43);
  });
  row.addEventListener("pointercancel",()=>{
   const wasOpen=pointer?.startOpen??(openSwipeCircuitId===item.id);
   pointer=null;setOpen(wasOpen);
  });
  row.addEventListener("keydown",e=>{
   if(e.key==="ArrowLeft"){e.preventDefault();setOpen(true);}
   if(e.key==="ArrowRight"||e.key==="Escape"){e.preventDefault();setOpen(false);}
   if((e.key==="Delete"||e.key==="Backspace")&&openSwipeCircuitId===item.id){
    e.preventDefault();requestCircuitDeletion(item.id);
   }
  });
 }
}
function circuitPackage(){
 const recipe=blueprintData();
 return{format:"slotrace-recipe",version:1,geometry:"SR-PRECISION",
  name:circuitLabel(),creator:circuitCreator(),
  direction:state.driveDirection,types:state.types.slice(),
  origin:{...state.origin},bridgeParts:state.bridgeParts.slice(),
  loose:state.loose.map(p=>({...p})),
  // La foto es una ayuda local. No incorporar IDs de IndexedDB a recetas
  // compartidas: esos archivos no existen en otros dispositivos.
  items:recipe.items.map(({id,name,count})=>({id,name,count})),
  exportedAt:new Date().toISOString()};
}
async function exportRecipe(){
 if(!state.types.length&&!state.loose.length){toast("No hay piezas para exportar.");return false;}
 const filename="slotrace-receta-"+slugName(circuitLabel())+".json";
 const blob=new Blob([JSON.stringify(circuitPackage(),null,2)],{type:"application/json"});
 if(typeof navigator!=="undefined"&&typeof navigator.share==="function"&&typeof File==="function"){
  const file=new File([blob],filename,{type:"application/json"});
  if(typeof navigator.canShare!=="function"||navigator.canShare({files:[file]})){
   try{await navigator.share({files:[file],title:"Receta "+circuitLabel()});return true;}
   catch(e){if(e?.name==="AbortError")return false;}
  }
 }
 const link=document.createElement("a"),url=URL.createObjectURL(blob);
 link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
 if(typeof window.setTimeout==="function")window.setTimeout(()=>URL.revokeObjectURL(url),60000);
 toast("Receta exportada.");return true;
}
async function importRecipe(file){
 if(!file||file.size>250000){toast("La receta es demasiado grande.");return false;}
 let data;
 try{data=JSON.parse(await file.text());}catch(e){toast("No se pudo leer la receta.");return false;}
 if(data?.format!=="slotrace-recipe"||data.version!==1||
  !Array.isArray(data.types)||data.types.length>200||
  !Array.isArray(data.loose)||data.loose.length>200||
  !allowed([...data.types,...data.loose.map(p=>p?.id)])||
  !data.origin||![data.origin.x,data.origin.y,data.origin.h].every(Number.isFinite)||
  !data.loose.every(p=>p&&[p.x,p.y,p.h].every(Number.isFinite))||
  !Array.isArray(data.bridgeParts)||
  !data.bridgeParts.every(i=>Number.isInteger(i)&&i>=0&&i<data.types.length)||
  (!data.types.length&&!data.loose.length)){
  toast("Receta inválida o incompatible con SR-PRECISION.");return false;
 }
 if(state.library.length>=120){toast("Inventario completo (120 circuitos).");return false;}
 const item={id:"sr-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),
  name:String(data.name||"Circuito importado").trim().slice(0,64)||"Circuito importado",
  creator:typeof data.creator==="string"?cleanCreator(data.creator):
   creatorForLegacyCircuit(data.name),
  direction:data.direction===-1?-1:1,
  snapshot:{types:data.types.slice(),loose:data.loose.map(p=>({...p})),
   bridgeParts:data.bridgeParts.slice(),origin:{...data.origin}},
  createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 const next=[item,...state.library];
 if(!safelyWriteLibrary(next))return false;
 state.library=next;loadSavedCircuit(item.id);
 toast("Receta adquirida para Mis circuitos: «"+item.name+"».");return true;
}
function clearGapDiagnostic(){
 state.gapDiagnostic=null;
 $("gapInfo").hidden=true;
 $("boardGapInfo").hidden=true;
}
function pushHistory(){
 clearGapDiagnostic();
 state.history.push(snapshot());if(state.history.length>45)state.history.shift();state.redo=[];
}
function changeTypes(next,msg,loose=state.loose,newOrigin=state.origin,{preserveBridge=false}={}){
 if(!allowed([...next,...loose.map(p=>p.id)])){toast("Solo se admite una PT/82 por circuito; revisa el inventario.");return false;}
 const wasClosed=state.track.closed;
 pushHistory();
 const sameGeometry=next.length===state.types.length&&next.every((id,i)=>id===state.types[i]);
 // Añadir rectas o curvas al FINAL no debe deshacer las elevaciones ya
 // colocadas sobre las piezas anteriores, ni mover su índice guardado.
 const stablePrefix=next.slice(0,Math.min(next.length,state.types.length))
  .every((id,i)=>id===state.types[i]);
 state.bridgeRangeStart=null;state.lastTapHit=null;
 state.types=next.slice();state.loose=loose.map(p=>({...p}));state.origin={...newOrigin};
 if(!sameGeometry&&!preserveBridge)
  state.bridgeParts=stablePrefix?state.bridgeParts.filter(i=>i<next.length):[];
 state.track=buildTrack(state.types,state.origin,state.bridgeParts);extendWorkBoard();
 state.selection=-1;state.looseSelection=-1;state.selectionMode="group";state.selectedGroup=null;state.run=false;resetLap();
 save();updateUI();
 if(!wasClosed&&state.track.closed){
   toast(state.track.intersection?"Los extremos encajan, pero hay un cruce sin puente.":
     "¡Clac! Conectores unidos con precisión.");
 }else if(msg)toast(msg);
 return true;
}
function resetLap(){state.lap=1;state.seconds=0;state.raceStarted=false;state.speed=0;state.distance=0;state.penalty=0;state.gas=0;state.drift=0;state.driftDirection=0;state.deslot=null;state.cornerDistance=0;state.gripDebt=0;state.rearSlip=0;state.rearSlipVelocity=0;state.rearStress=0;state.cornerDirection=0;state.buttonGas=false;state.keyboardGas=false;state.laneTransition=null;state.lapEligible=true;state.x350Armed=true;state.x350Crossings=0;state.x350FirstLap=null;
 state.triggerGesture=null;$("trigger").classList.remove("pressed");}
function undo(){if(!state.history.length){toast("No hay movimientos que deshacer.");return;}
 state.redo.push(snapshot());restoreSnapshot(state.history.pop());}
function redo(){if(!state.redo.length){toast("No hay movimientos que rehacer.");return;}
 state.history.push(snapshot());restoreSnapshot(state.redo.pop());}
function addLoose(id,x,y,h=0){
 if(!allowed([...state.types,...state.loose.map(p=>p.id),id])){toast("Solo puedes utilizar una PT/82 por circuito.");return false;}
 if(!Number.isFinite(x)||!Number.isFinite(y))return false;
 const point=gridXY(x,y);
 pushHistory();state.loose.push({id,x:point.x,y:point.y,h});
 extendWorkBoard();
 state.selection=-1;state.looseSelection=state.loose.length-1;state.selectionMode="piece";state.selectedGroup=looseGroupKey(state.looseSelection);save();updateUI();toast("Pieza suelta. Muévela libremente; conéctala cuando quieras.");return true;
}

/* DEV 0.8.0 · imanes entre cualquier par de grupos o piezas sueltas. */
const SNAP_DISTANCE_MM=135, SNAP_ROTATION_RAD=Math.PI/2+1e-5;
// Una pieza individual se puede girar libremente al acercar conectores.
// Los tramos de varias piezas conservan el límite de giro para evitar
// giros bruscos que desplacen un montaje grande contra otras piezas.
const SINGLE_SNAP_ROTATION_RAD=Math.PI+1e-5;
let magnetSerial=1+Math.max(0,...state.loose.map(p=>{const m=/^magnet-(\d+)$/.exec(p.magnetGroup||"");return m?+m[1]:0;}));
const newMagnetGroup=()=> "magnet-"+magnetSerial++;
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const connectorDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function looseMembers(index){
 const p=state.loose[index];if(!p)return[];
 if(!p.magnetGroup)return[index];
 return state.loose.map((piece,i)=>({piece,i}))
  .filter(v=>v.piece.magnetGroup===p.magnetGroup)
  .sort((a,b)=>(a.piece.magnetOrder||0)-(b.piece.magnetOrder||0))
  .map(v=>v.i);
}
function looseGroup(index){
 const indices=looseMembers(index);if(!indices.length)return null;
 const parts=indices.map(i=>state.loose[i]);
 const start={x:parts[0].x,y:parts[0].y,h:parts[0].h};
 const end=positionOnPiece(parts.at(-1),parts.at(-1).id,1);
 return{indices,parts,start,end,key:parts[0].magnetGroup||"single-"+indices[0]};
}
function looseGroupKey(index){return state.loose[index]?.magnetGroup||"single-"+index;}
function reversedPartId(id){
 const spec=CATALOG[id];
 if(!spec)return null;
 if(spec.length)return id; // Una recta es simétrica respecto a sus extremos.
 if(id.endsWith("R"))return CATALOG[id.slice(0,-1)+"L"]?id.slice(0,-1)+"L":null;
 if(id.endsWith("L"))return CATALOG[id.slice(0,-1)+"R"]?id.slice(0,-1)+"R":null;
 return null;
}
// Validación doble: unir un extremo sólo cierra un circuito si el
// extremo contrario también coincide. No confundir piezas que se rozan
// con un lazo matemáticamente conectado.
function loopFromLooseGroup(index){
 const group=looseGroup(index);
 if(!group||group.indices.length<4)return null;
 for(let k=1;k<group.parts.length;k++){
  const prev=group.parts[k-1],cur=group.parts[k];
  const end=positionOnPiece(prev,prev.id,1);
  if(connectorDistance(end,cur)>1e-5||
     Math.abs(angleDiff(end.h,cur.h))>1e-7)return null;
 }
 const raised=group.parts.flatMap((p,i)=>p.raised?[i]:[]);
 const track=buildTrack(group.parts.map(p=>p.id),group.start,raised);
 return{group,track};
}
function closeLooseLoop(index,{history=true}={}){
 if(state.types.length)return false;
 const candidate=loopFromLooseGroup(index);
 if(!candidate?.track.closed)return false;
 if(history)pushHistory();
 const {group,track}=candidate;
 state.types=group.parts.map(p=>p.id);
 state.bridgeParts=group.parts.flatMap((p,i)=>p.raised?[i]:[]);
 state.origin={...group.start};
 for(const i of [...group.indices].sort((a,b)=>b-a))state.loose.splice(i,1);
 state.track=buildTrack(state.types,state.origin,state.bridgeParts);
 extendWorkBoard();
 state.selectedGroup="main";state.selectionMode="group";
 state.selection=0;state.looseSelection=-1;state.dragLoose=-1;
 save();updateUI();
 toast(track.valid?
  (track.forcedClosure?
   "¡Cierre flexible! Ajustados "+track.gap.toFixed(1)+" mm en todo el circuito.":
   "¡Clac doble! Los dos extremos encajan: circuito cerrado."):
  "Extremos unidos, pero falta resolver el cruce o la posición del puente.");
 return true;
}
function wouldCloseOnJoin(moving,target,side,reversed){
 if(target.kind!=="loose"||state.types.length)return false;
 const t=looseGroup(target.index);
 if(!t||moving.indices.length+t.indices.length<4)return false;
 const movingIds=moving.parts.map(p=>p.id);
 if(reversed&&movingIds.length===1)movingIds[0]=reversedPartId(movingIds[0]);
 const joined=side==="append"?
  [...t.parts.map(p=>p.id),...movingIds]:
  [...movingIds,...t.parts.map(p=>p.id)];
 return buildTrack(joined,START).closed;
}
function bestMagnet(index,{distance=SNAP_DISTANCE_MM}={}){
 const moving=looseGroup(index);if(!moving)return null;
 const excluded=new Set(moving.indices),targets=[];
 if(state.types.length&&!state.track.closed)targets.push({kind:"main",start:state.origin,end:state.track.ends.end});
 const seen=new Set();
 for(let i=0;i<state.loose.length;i++){
  if(excluded.has(i))continue;
  const group=looseGroup(i);if(!group||seen.has(group.key))continue;
  seen.add(group.key);targets.push({kind:"loose",index:i,start:group.start,end:group.end});
 }
 // Los dos extremos son equivalentes físicamente en una pieza sola.
 // Antes sólo probábamos inicio→final y final→inicio. Quedaban sin opción
 // de acoplamiento las combinaciones inicio→inicio y final→final.
 const canReverse=moving.parts.every(part=>Boolean(reversedPartId(part.id)));
 const hReverseStart=moving.end.h+Math.PI,hReverseEnd=moving.start.h+Math.PI;
 const reversedStart={...moving.end,h:hReverseStart};
 const reversedEnd={...moving.start,h:hReverseEnd};
 // Los grupos rígidos pueden girar hasta 180° al conectar los extremos.
 const maxAngle=SINGLE_SNAP_ROTATION_RAD;
 let best=null;
 for(const target of targets){
  const candidates=[
   {side:"append",from:moving.start,to:target.end,reversed:false},
   {side:"prepend",from:moving.end,to:target.start,reversed:false}
  ];
  if(canReverse)candidates.push(
   {side:"append",from:reversedStart,to:target.end,reversed:true},
   {side:"prepend",from:reversedEnd,to:target.start,reversed:true}
  );
  for(const candidate of candidates){
   const {from,to}=candidate,gap=connectorDistance(from,to),
    rotation=angleDiff(to.h,from.h);
   if(gap>distance||Math.abs(rotation)>maxAngle)continue;
   // Favorecer conectores próximos y cambios mínimos de orientación,
   // pero nunca bloquear un empalme válido sólo por girar 180°.
   const closesLoop=wouldCloseOnJoin(moving,target,candidate.side,candidate.reversed);
   // Si la pieza encaja por ambos extremos, esa posición tiene prioridad
   // frente a una unión aislada más cercana que dejaría el otro abierto.
   const score=gap+Math.abs(rotation)*22-(closesLoop?400:0);
   if(!best||score<best.score)
    best={...target,...candidate,gap,rotation,score,closesLoop};
  }
 }
 return best;
}
function reverseLooseGroup(group){
 const originals=group.parts.map(p=>({...p}));
 if(!originals.every(p=>reversedPartId(p.id)))return false;
 const reversed=originals.slice().reverse();
 for(const [order,index] of group.indices.entries()){
  const source=reversed[order],piece=state.loose[index];
  const end=positionOnPiece(source,source.id,1);
  piece.id=reversedPartId(source.id);
  piece.x=end.x;piece.y=end.y;piece.h=end.h+Math.PI;
  if(source.raised)piece.raised=true;else delete piece.raised;
  if(group.indices.length>1){piece.magnetGroup=group.key;piece.magnetOrder=order;}
 }
 return true;
}
function transformLoose(indices,from,to){
 const angle=angleDiff(to.h,from.h),c=Math.cos(angle),sn=Math.sin(angle);
 for(const i of indices){
  const p=state.loose[i],dx=p.x-from.x,dy=p.y-from.y;
  p.x=to.x+c*dx-sn*dy;p.y=to.y+sn*dx+c*dy;p.h+=angle;
 }
}
function snapLoose(index,{force=false,history=true}={}){
 const source=looseGroup(index);if(!source)return false;
 const magnet=bestMagnet(index,{distance:force?SNAP_DISTANCE_MM*1.5:SNAP_DISTANCE_MM});
 if(!magnet)return false;
 if(history)pushHistory();
 else clearGapDiagnostic();
 if(magnet.reversed&&!reverseLooseGroup(source))return false;
 transformLoose(source.indices,magnet.from,magnet.to);
 const moved=source.indices.map(i=>({...state.loose[i]}));
 if(magnet.kind==="main"){
  if(magnet.side==="append"){
   const offset=state.types.length;
   state.types.push(...moved.map(p=>p.id));
   for(const [k,p] of moved.entries())if(p.raised)state.bridgeParts.push(offset+k);
  }else{
   state.bridgeParts=state.bridgeParts.map(i=>i+moved.length);
   state.types.unshift(...moved.map(p=>p.id));
   for(const [k,p] of moved.entries())if(p.raised)state.bridgeParts.push(k);
   state.origin={x:moved[0].x,y:moved[0].y,h:moved[0].h};
  }
  for(const i of [...source.indices].sort((a,b)=>b-a))state.loose.splice(i,1);
  state.track=buildTrack(state.types,state.origin,state.bridgeParts);extendWorkBoard();
  state.selectedGroup="main";state.selectionMode="group";state.selection=0;state.looseSelection=-1;
 }else{
  const target=looseGroup(magnet.index);
  const combined=magnet.side==="append"?[...target.indices,...source.indices]:
   [...source.indices,...target.indices];
  const groupId=target.parts[0].magnetGroup||newMagnetGroup();
  for(const [order,i] of combined.entries()){
   state.loose[i].magnetGroup=groupId;state.loose[i].magnetOrder=order;
  }
  state.selectedGroup=groupId;state.selectionMode="group";state.looseSelection=combined[0];state.selection=-1;
  // Tras la primera unión, comprobar también la conexión restante.
  // Si se ha completado un circuito cerrado, convertir el grupo a pista
  // jugable sin esperar a que el usuario pulse Iniciar.
  if(closeLooseLoop(combined[0],{history:false}))return true;
 }
 state.dragLoose=-1;save();updateUI();
 toast(state.track.valid?"¡Clac doble! Circuito cerrado. Puedes correr.":
  "¡Clac! Un extremo conectado; revisa el otro para cerrar.");
 return true;
}
function detachConnected(index,{history=true}={}){
 if(index<0||index>=state.types.length)return -1;
 if(history)pushHistory();
 const pieces=state.track.parts.slice(index).map(part=>({
  id:part.id,x:part.start.x,y:part.start.y,h:part.start.h,
  ...(state.bridgeParts.includes(part.index)?{raised:true}:{})
 }));
 state.bridgeParts=state.bridgeParts.filter(i=>i<index);
 const first=state.loose.length;
 state.types=state.types.slice(0,index);
 let detachedKey=null;
 if(pieces.length>1){
  detachedKey=newMagnetGroup();
  for(let k=0;k<pieces.length;k++){
   pieces[k].magnetGroup=detachedKey;pieces[k].magnetOrder=k;
  }
 }
 state.loose.push(...pieces);
 state.track=buildTrack(state.types,state.origin,state.bridgeParts);extendWorkBoard();
 state.selection=-1;state.looseSelection=first;state.selectionMode=detachedKey?"group":"piece";
 state.selectedGroup=detachedKey||"single-"+first;
 state.run=false;save();updateUI();return first;
}
function detachLooseMember(index){
 const members=looseMembers(index);if(members.length<=1)return;
 const position=members.indexOf(index),original=state.loose[index].magnetGroup;
 const before=members.slice(0,position),after=members.slice(position+1);
 delete state.loose[index].magnetGroup;delete state.loose[index].magnetOrder;
 for(const [order,i] of before.entries()){
  if(before.length===1){delete state.loose[i].magnetGroup;delete state.loose[i].magnetOrder;}
  else{state.loose[i].magnetGroup=original;state.loose[i].magnetOrder=order;}
 }
 const suffixId=newMagnetGroup();
 for(const [order,i] of after.entries()){
  if(after.length===1){delete state.loose[i].magnetGroup;delete state.loose[i].magnetOrder;}
  else{state.loose[i].magnetGroup=suffixId;state.loose[i].magnetOrder=order;}
 }
}
function promoteLooseGroup(index){
 const group=looseGroup(index);if(!group||state.types.length)return false;
 pushHistory();state.origin={...group.start};state.types=group.parts.map(p=>p.id);
 state.bridgeParts=group.parts.flatMap((p,i)=>p.raised?[i]:[]);
 for(const i of [...group.indices].sort((a,b)=>b-a))state.loose.splice(i,1);
 state.track=buildTrack(state.types,state.origin,state.bridgeParts);extendWorkBoard();
 state.selectedGroup="main";state.selectionMode="group";state.selection=0;state.looseSelection=-1;
 save();updateUI();toast("¡Tramo fijado! Puedes seguir ampliándolo.");return true;
}
function startSelectedPiece(){
 if(state.looseSelection<0)return;
 if(!state.types.length){promoteLooseGroup(state.looseSelection);return;}
 if(!snapLoose(state.looseSelection,{history:true}))
  toast("Acerca un conector a otro para unir los tramos.");
}
// Cualquier pieza puede formar parte de una plataforma elevada.
// Los segmentos adyacentes realizan las rampas automáticamente.
function installBridgeKit(){
 const looseIndex=state.looseSelection,mainIndex=state.selection;
 const isLoose=looseIndex>=0;
 const id=isLoose?state.loose[looseIndex]?.id:state.types[mainIndex];
 if(!CATALOG[id]){
  toast("Selecciona una recta o curva y toca Elevar.");return false;
 }
 pushHistory();
 let enabled;
 if(isLoose){
  enabled=!state.loose[looseIndex].raised;
  if(enabled)state.loose[looseIndex].raised=true;
  else delete state.loose[looseIndex].raised;
 }else{
  enabled=!state.bridgeParts.includes(mainIndex);
  state.bridgeParts=enabled?
   [...new Set([...state.bridgeParts,mainIndex])].sort((a,b)=>a-b):
   state.bridgeParts.filter(i=>i!==mainIndex);
 }
 state.track=buildTrack(state.types,state.origin,state.bridgeParts);
 save();updateUI();
 const issue=state.track.elevation?.errors?.[0];
 toast(!enabled?"Elevación retirada de esta pieza.":
  issue||"Elevación de 65 mm. Las rectas contiguas forman las rampas.");
 return true;
}
// Evita buscar con el dedo la pieza exacta bajo un cruce.
function selectBridgeRelative(direction){
 const n=state.types.length;
 if(!n){toast("Coloca primero piezas.");return false;}
 const index=state.selection>=0?state.selection:direction>0?-1:0;
 selectByTap("main",(index+direction+n)%n);
 state.lastTapHit=null;return true;
}
function bridgeRangeIndices(start,end){
 const n=state.types.length;if(!n||start<0||end<0||start>=n||end>=n)return[];
 if(state.track.closed){
  const out=[];let i=start;
  for(let j=0;j<n;j++){out.push(i);if(i===end)return out;i=(i+1)%n;}
  return[];
 }
 return Array.from({length:Math.abs(end-start)+1},(_,i)=>Math.min(start,end)+i);
}
function markBridgeRangeStart(){
 if(state.selection<0||state.selection>=state.types.length){
  toast("Selecciona la primera pieza con Anterior / Siguiente.");return false;
 }
 state.bridgeRangeStart=state.selection;updateUI();
 toast("Inicio: pieza "+(state.selection+1)+". Ahora selecciona el final.");return true;
}
function applyBridgeRange(lower=false){
 const end=state.selection;
 if(end<0||end>=state.types.length){
  toast("Selecciona primero una pieza con Anterior / Siguiente.");return false;
 }
 let indices=[];
 if(state.bridgeRangeStart!=null){
  indices=bridgeRangeIndices(state.bridgeRangeStart,end);
 }else if(lower){
  indices=state.track.elevation?.runs?.find(run=>run.includes(end))||[];
 }else{
  toast("Marca Inicio y después elige Final y elevar.");return false;
 }
 if(!indices.length){toast("No existe un tramo elevado para bajar en esa pieza.");return false;}
 const nextSet=new Set(state.bridgeParts);
 for(const i of indices){if(lower)nextSet.delete(i);else nextSet.add(i);}
 const next=[...nextSet].sort((a,b)=>a-b);
 const built=buildTrack(state.types,state.origin,next);
 pushHistory();state.bridgeParts=next;state.track=built;state.bridgeRangeStart=null;
 save();updateUI();
 const issue=built.elevation?.errors?.[0]||
  (built.closed&&!built.valid?"Revisa la separación de los cruces.":null);
 toast((lower?"Bajadas ":"Elevadas ")+indices.length+" piezas. "+
  (issue||"Rampas de transición calculadas."));
 return true;
}
function selectMainAtCrossing(x,y){
 const hits=state.track.parts.map(part=>{
  const hit=nearestPiece({parts:[part]},x,y);
  return{index:part.index,distance:hit.distance,height:elevationAt(state.track,part.index,.5)};
 }).filter(hit=>hit.distance<TRACK_WIDTH*.42);
 hits.sort((a,b)=>b.height-a.height||a.distance-b.distance);
 return hits;
}
function selectByTap(kind,index){
 // Al tocar otra pieza, elegirla sola. Al tocar la MISMA, alternar
 // individual ↔ tramo magnético completo, tantas veces como se quiera.
 const key=kind==="main"?"main":looseGroupKey(index);
 const same=key===state.selectedGroup&&
  (kind==="main"?state.selection===index:state.looseSelection===index);
 state.selectionMode=same&&state.selectionMode==="piece"?"group":"piece";
 state.selectedGroup=key;
 state.selection=kind==="main"?index:-1;
 state.looseSelection=kind==="main"?-1:index;
 updateUI();
}
// En móvil la caja tapa parte inferior del canvas y la barra superior
// tapa la parte alta: situar el centro dentro del área realmente útil.
function workshopVisibleCenter(){
 const v=makeView(editCanvas,"build"),wide=v.w>680;
 const left=Math.min(40,v.w*.1);
 const right=wide?v.w-Math.min(220,v.w*.25):v.w-left;
 const top=Math.min(110,v.h*.22);
 const bottom=v.h-Math.min(wide?105:245,v.h*(wide?.18:.36));
 return worldFromPointer(v,
  right>left?(left+right)/2:v.w/2,
  bottom>top?(top+bottom)/2:v.h/2);
}
function scatterLoose(id){
 // Centrar la GEOMETRÍA de la nueva pieza, no su conector inicial.
 const c=workshopVisibleCenter();
 const mid=positionOnPiece({x:0,y:0,h:0},id,.5);
 return addLoose(id,c.x-mid.x,c.y-mid.y,0);
}
// Piezas independientes de 90°: radio constante, una superficie y dos conectores.
// Los antiguos trazados compuestos siguen siendo válidos sin migraciones.
const CURVE_90_PRESETS=Object.freeze({});
const pocketPartId=id=>id.includes("_")&&id.endsWith("R")?id.slice(0,-1)+state.caseCurveDirection:id;
const shelfParts=id=>[pocketPartId(id)];
const presetLabel=id=>id.slice(0,2)+" · 90°";
// Tocar la caja monta por orden en el conector libre final.
 // El arrastre desde el asa sigue creando una pieza libre en el tapete.
let lastCaseAppend=null;
function inventoryAction(id){
 const chosen=pocketPartId(id);
 if(!CATALOG[chosen])return false;
 if(freeStock([...state.types,...state.loose.map(p=>p.id)],chosen)<=0){
  toast("No quedan piezas de este tipo (PT/82: máximo una).");return false;
 }
 // Tocar una tarjeta crea una pieza suelta delante del jugador. Unirla
 // al circuito requiere acercarla al imán o pulsar «Iniciar/Encajar».
 lastCaseAppend=null;
 const placed=scatterLoose(chosen);
 if(placed)toast("Pieza en el centro · arrástrala hasta el conector.");
 return placed;
}
function toggleCaseCurveDirection(){
 state.caseCurveDirection=state.caseCurveDirection==="R"?"L":"R";
 save();updateUI();
 toast(state.caseCurveDirection==="R"?"Caja: curvas a la derecha.":"Caja: curvas a la izquierda.");
}
function flipSelectedCurve(){
 let id=null;
 if(state.looseSelection>=0)id=state.loose[state.looseSelection]?.id;
 else if(state.selectionMode==="piece"&&state.selection>=0)id=state.types[state.selection];
 if(!id||!id.includes("_")||!/[RL]$/.test(id)){
  toast("Selecciona una curva de la mesa para voltearla.");
  return;
 }
 const opposite=id.slice(0,-1)+(id.endsWith("R")?"L":"R");
 if(state.looseSelection>=0){
  pushHistory();detachLooseMember(state.looseSelection);
  state.loose[state.looseSelection].id=opposite;
  save();updateUI();toast("Curva suelta invertida. Encájala en sentido contrario.");
 }else{
  const next=state.types.slice();next[state.selection]=opposite;
  changeTypes(next,"Curva del circuito invertida: revisa los conectores.");
 }
}
function openGroups(){
 const groups=[];
 if(state.types.length&&!state.track.closed)
  groups.push({key:"main",count:state.types.length,start:{...state.origin},end:{...state.track.ends.end},index:null});
 const seen=new Set();
 for(let i=0;i<state.loose.length;i++){
  const group=looseGroup(i);
  if(!group||seen.has(group.key))continue;
  seen.add(group.key);
  groups.push({key:group.key,count:group.indices.length,start:group.start,end:group.end,index:i});
 }
 return groups;
}
// La medición se calcula siempre entre conectores REALES: aunque estén
// a kilómetros de distancia, nunca debe devolver "sin resultado" por
// el antiguo filtro de 800 mm.
function nearestOpenGap(groups,selected){
 const self=groups.filter(g=>g.count>=4).map(g=>({
  ...gapAnalysis.measureGap(g.end,g.start,CATALOG),
  fromKey:g.key,toKey:g.key
 })).sort((a,b)=>a.distance-b.distance);
 const others=gapAnalysis.analyzeOpenEnds(groups,CATALOG,{
  selectedKey:selected,maxDistance:Infinity});
 const selfSelected=self.find(p=>p.fromKey===selected);
 const nearSelf=self.find(p=>p.distance<=1000);
 return selfSelected||nearSelf||others[0]||self[0]||null;
}
function presentGapDiagnostic(result,message){
 const old=$("gapInfo"),overlay=$("boardGapInfo");
 old.textContent=message;old.hidden=false;
 if(!result){
  overlay.textContent=message;overlay.hidden=false;
  overlay.dataset.status="missing";return;
 }
 const m=result.measured;
 const fmt=n=>Number(n).toLocaleString("es-ES",{maximumFractionDigits:1});
 const close=m.distance<10&&m.angle<=1;
 const forced=close&&m.distance>3;
 const status=forced?"CIERRE FLEXIBLE DISPONIBLE · PULSA CERRAR":
  close?"ALINEADO · PULSA CERRAR":
  m.angle>1?"GIRO EXCESIVO · ALINEA LOS CONECTORES":
  "DISTANCIA EXCESIVA · ACERCA LOS EXTREMOS";
 const name=result.fromKey===result.toKey?"MISMO TRAMO":"ENTRE TRAMOS";
 overlay.textContent="HUECO "+fmt(m.distance)+" mm · LATERAL "+
  fmt(m.lateral)+" mm · ÁNGULO "+fmt(m.angle)+"° · "+
  name+" · "+status+" (MÁX. <10 mm / 1°)";
 overlay.dataset.status=forced?"flex":close?"ok":"open";
 overlay.hidden=false;
}
function measureOpenGap(){
 const groups=openGroups(),selected=state.looseSelection>=0?
  looseGroupKey(state.looseSelection):state.selection>=0?"main":null;
 const result=nearestOpenGap(groups,selected);
 let message=gapAnalysis.gapExplanation(result);
 let balance=null;
 if(result?.fromKey===result?.toKey){
  const section=groups.find(g=>g.key===result.fromKey);
  const pieceTypes=section?.index!=null?
   looseGroup(section.index)?.parts.map(part=>part.id):
   section?.key==="main"?state.types:null;
  if(pieceTypes?.length>=4){
   const raised=section.index!=null?
    looseGroup(section.index).parts.flatMap((part,i)=>part.raised?[i]:[]):state.bridgeParts;
   balance=findStraightRebalance(pieceTypes,{origin:section.start,raisedParts:raised});
  }
 }
 if(result){
  if(result.fromKey!==result.toKey)
   message="UNIÓN ENTRE DOS TRAMOS · "+message+
    " Esta distancia conecta un extremo con otro, pero NO garantiza cerrar el circuito.";
  else if(result.problem==="touching")
   message="Conectores próximos: "+result.measured.distance+
    " mm · "+result.measured.angle+"°. "+
    "Se permite cerrar con ligera flexión si faltan menos de 10 mm y el giro no supera 1°.";
  else message="HUECO DEL MISMO TRAMO · "+message;
  if(balance?.ok&&!balance.unchanged&&!result?.combination){
   message="CIERRE POR COMPENSACIÓN · "+balance.changes.map(c=>
    CATALOG[c.from].length.toLocaleString("es-ES")+" → "+
    CATALOG[c.to].length.toLocaleString("es-ES")+" mm").join(" + ")+
    ". Pulsa Cerrar para aplicar el ajuste válido.";
  }
  if(result.distance>3&&result.distance<10&&result.headingDegrees<=1)
   message+=" Cierre flexible permitido: el ajuste se reparte por el trazado.";
 }
 state.gapDiagnostic=result?{...result,message}:null;
 presentGapDiagnostic(result,message);
 state.viewDirty=true;
 toast(result?"Medición visible sobre la mesa.":"Aún no hay extremos para medir.");
 return result;
}
function closeExactly(){
 if(state.track.closed){
  if(!state.track.valid){
   const issue=state.track.elevation?.errors?.[0]||
    (state.track.intersection?"Cruce sin separación vertical suficiente. En Puentes, eleva el tramo superior completo.":
     "Conectores cerrados, pero el montaje todavía no es válido.");
   $("gapInfo").textContent=issue;$("gapInfo").hidden=false;
   if(state.track.bridge||state.track.intersection)chooseCaseCategory("bridge");
   toast(issue);return false;
  }
  toast(state.track.forcedClosure?
   "¡Cierre flexible validado! La tensión se distribuye por las piezas.":
   "¡Circuito cerrado y verificado! Ya puedes jugar.");return true;
 }
 // Si el montaje aún vive como grupo magnético suelto, primero comprobar
 // sus DOS conectores. Antes este botón se deshabilitaba siempre.
 if(state.loose.length){
  if(state.types.length){
   toast("Hay tramos sin encajar. Une primero esas piezas al circuito iniciado.");
   return;
  }
  const groups=openGroups();
  for(const group of groups){
   if(group.index==null||group.count<4)continue;
   if(closeLooseLoop(group.index,{history:true}))return;
  }
  // El jugador puede cerrar si los conectores quedan a menos de 10 mm
  // y dentro de 1°: la pequeña tensión se reparte por el trazado.
  if(groups.length===1&&groups[0].count>=4){
   const group=looseGroup(groups[0].index);
   const fit=gapAnalysis.measureGap(group.end,group.start,CATALOG);
   const original=group.parts.map(part=>part.id);
   const raised=group.parts.flatMap((part,i)=>part.raised?[i]:[]);
   const added=fit.exact?fit.combination?.ids:null;
   if(added?.length&&added.length<=5){
    const types=[...group.parts.map(p=>p.id),...added];
    const raised=group.parts.flatMap((p,i)=>p.raised?[i]:[]);
    const built=buildTrack(types,group.start,raised);
    if(built.valid){
     pushHistory();
     state.types=types;state.origin={...group.start};state.bridgeParts=raised;
     state.loose=[];state.track=built;extendWorkBoard();
     state.selectedGroup="main";state.selectionMode="group";
     state.selection=0;state.looseSelection=-1;save();updateUI();
     toast("¡Circuito cerrado! Añadidas "+added.length+
      " pieza(s) de ajuste, sin cambiar ninguna medida.");
     return;
    }
   }
   const balanced=findStraightRebalance(original,{origin:group.start,raisedParts:raised});
   if(balanced.ok&&!balanced.unchanged){
    pushHistory();
    state.types=balanced.types;state.origin={...group.start};state.bridgeParts=raised;
    state.loose=[];state.track=buildTrack(state.types,state.origin,state.bridgeParts);
    extendWorkBoard();state.selectedGroup="main";state.selectionMode="group";
    state.selection=0;state.looseSelection=-1;save();updateUI();
    toast("Cerrado compensando rectas: "+balanced.changes.map(c=>
     CATALOG[c.from].length.toLocaleString("es-ES")+" → "+CATALOG[c.to].length.toLocaleString("es-ES")+" mm").join(" + ")+".");
    return;
   }
   measureOpenGap();
   toast("El cierre necesita un encaje real: revisa milímetros y ángulo sobre la pista.");
   return;
  }
  toast("Tienes "+groups.length+" tramos separados. Encaja sus extremos antes de cerrar.");
  measureOpenGap();
  return;
 }
 if(state.types.length<2){toast("Coloca primero varias piezas.");return;}
 $("autoClose").disabled=true;$("autoClose").textContent="Buscando…";
 requestAnimationFrame(()=>{
  try{
   const result=findLegalClosure(state.types,{maxReplace:3,maxAdd:5,maxStates:90000,origin:state.origin,raisedParts:state.bridgeParts});
   if(result.ok){
    if(result.unchanged)toast("El circuito ya estaba cerrado exactamente.");
    else changeTypes(result.types,result.rebalanced?
     "¡Cierre proporcional! Rectas reajustadas sin introducir pieza de 12,5 mm.":
     "Cierre calculado: "+result.replaced+
     " pieza(s) cambiada(s), "+result.added+" añadida(s). Puedes deshacer.",
     state.loose,state.origin,{preserveBridge:Boolean(result.rebalanced)});
   }else toast(result.reason||"No hay cierre exacto con esas piezas.");
  }catch(e){toast("No fue posible calcular el cierre. Tu pista sigue intacta.");}
  finally{updateUI();}
 });
}
function removeSelected(){
 if(state.selectionMode!=="piece"){toast("Toca otra vez la pieza concreta que quieres quitar.");return;}
 if(state.looseSelection>=0){
  pushHistory();detachLooseMember(state.looseSelection);
  state.loose.splice(state.looseSelection,1);state.looseSelection=-1;
  state.selectedGroup=null;
  save();updateUI();toast("Pieza suelta devuelta a la caja.");return;
 }
 if(state.selection<0){toast("Toca un tramo sobre la mesa para seleccionarlo.");return;}
 const i=detachConnected(state.selection);
 if(i>=0){state.loose.splice(i,1);state.looseSelection=-1;state.selectedGroup=null;save();updateUI();
 toast("Pieza devuelta a la caja. Las otras se quedan sobre la mesa.");}
}
function rotateSelection(direction){
 if(direction!==1&&direction!==-1)return false;
 const onLoose=state.looseSelection>=0;
 const index=onLoose?state.looseSelection:state.selection;
 if(index<0){
  toast("Toca primero una pieza de la pista. Después pulsa ↶ o ↷.");
  return false;
 }
 // Usar el mismo motor de giro matemático que los gestos antiguos,
 // conservando centro, conexiones, rejilla y un único paso de deshacer.
 const g={target:onLoose?"loose":"main",index,
  single:state.selectionMode!=="group",steps:0,started:false};
 rotateGestureToSteps(g,direction);
 if(!g.started)return false;
 if(g.target==="main")extendWorkBoard();
 save();updateUI();
 toast((g.single?"Pieza":"Tramo")+" girado 22,5° "+
  (direction===1?"en sentido horario.":"en sentido antihorario."));
 return true;
}
function rotateLoose(){return rotateSelection(1);}
function recoverDraft(){
 if(!state.draft)return;
 const d=state.draft;state.draft=null;
 state.circuitName=d.name||"";state.activeCircuitId=d.activeId||null;
 state.driveDirection=d.direction===-1?-1:1;
 changeTypes(d.types||[], "Construcción anterior recuperada.",d.loose||[],d.origin||START);
}
// Una pieza de SlotRace se recorre en sentido horario o antihorario.
// No invertimos las piezas físicas: invertimos trayectoria, ángulo y
// signo de curva, y cambiamos la lateralidad de los dos carriles.
const drivingLaneIndex=()=>state.driveDirection===-1?1-state.lane:state.lane;
function drivingPose(distance=state.distance){
 const lane=state.track.lanes[drivingLaneIndex()];
 const p=positionAt(lane,state.driveDirection===-1?-distance:distance);
 return !p||state.driveDirection===1?p:{...p,h:p.h+Math.PI,curve:-(p.curve||0)};
}
// Dos carriles tienen longitudes diferentes. Cambiar conservando los
// milímetros acumulados teletransportaba el coche hacia otra curva.
// Se mantiene la pieza y el progreso longitudinal real de la guía.
function laneDistanceAtPiece(lane,index,progress){
 const t=Math.max(0,Math.min(1,progress||0));
 for(let i=1;i<lane.nodes.length;i++){
  const b=lane.nodes[i];if(b.pieceIndex!==index)continue;
  const a=lane.nodes[i-1],from=a.pieceIndex===index?(a.pieceT||0):0;
  const to=b.pieceT??1;
  if(t<=to+1e-9){
   const f=Math.max(0,Math.min(1,(t-from)/Math.max(1e-9,to-from)));
   return lane.lengths[i-1]+(lane.lengths[i]-lane.lengths[i-1])*f;
  }
 }
 return 0;
}
function poseOnDrivingLane(logicalLane,index,progress){
 const lane=state.track.lanes[state.driveDirection===-1?1-logicalLane:logicalLane];
 const distance=laneDistanceAtPiece(lane,index,progress);
 const p=positionAt(lane,distance);
 return !p||state.driveDirection===1?p:{...p,h:p.h+Math.PI,curve:-(p.curve||0)};
}
// La simulación física utiliza el carril elegido desde la pulsación;
// solo el sprite y la cámara interpolan suavemente el desplazamiento.
const LANE_CHANGE_SECONDS=.48;
const smoothLaneStep=t=>{const u=Math.max(0,Math.min(1,t));return u*u*(3-2*u);};
function displayDrivingPose(){
 const target=drivingPose(),change=state.laneTransition;
 if(!target||!change)return target;
 const from=poseOnDrivingLane(change.from,target.pieceIndex,target.pieceT);
 if(!from)return target;
 const physical=change.physical&&target.pieceIndex===change.pieceIndex;
 if(change.physical&&!physical)return target;
 const t=state.driveDirection===-1?1-(target.pieceT||0):(target.pieceT||0);
 const mix=physical?switchEase(Math.max(0,Math.min(1,t))):
  smoothLaneStep(change.elapsed/change.duration);
 const dh=Math.atan2(Math.sin(target.h-from.h),Math.cos(target.h-from.h));
 const lateral=(target.x-from.x)*(-Math.sin(target.h))+
  (target.y-from.y)*Math.cos(target.h);
 const heading=physical?target.h+Math.atan2(lateral*6*t*(1-t)/350,1):from.h+dh*mix;
 return{...target,x:from.x+(target.x-from.x)*mix,
  y:from.y+(target.y-from.y)*mix,h:heading};
}
function advanceLaneTransition(dt){
 const change=state.laneTransition;
 if(!change||state.mode!=="race")return;
 if(change.physical){
  const pose=drivingPose();
  if(pose?.pieceIndex!==change.pieceIndex)state.laneTransition=null;
  return;
 }
 change.elapsed=Math.min(change.duration,change.elapsed+Math.max(0,dt));
 if(change.elapsed>=change.duration)state.laneTransition=null;
}
function openWorkshop(){
 state.run=false;state.gas=0;state.keyboardGas=false;state.mode="build";
 // El estante de piezas siempre permanece abierto y anclado a la mesa.
 state.caseOpen=true;
 updateUI();resize();
 if(state.initialAutoFitNeeded){
  state.initialAutoFitNeeded=false;fitWorkspace();
 }
}
function showHub(which){
 if(!hubScreens[which])return false;
 state.run=false;state.gas=0;state.buttonGas=false;
 state.keyboardGas=false;state.triggerGesture=null;
 state.mode=which;
 updateUI();return true;
}
function showMenu(){
 state.run=false;state.gas=0;state.buttonGas=false;
 state.keyboardGas=false;state.triggerGesture=null;state.mode="menu";
 state.newCircuitDirection=state.driveDirection;
 updateUI();resize();
}
function setNewCircuitDirection(direction){
 state.newCircuitDirection=direction===-1?-1:1;updateUI();
}
function changeDriveDirection(direction){
 state.driveDirection=direction===-1?-1:1;
 state.newCircuitDirection=state.driveDirection;
 resetLap();state.distance=0;
 save();updateUI();
 toast("Sentido de conducción: "+(state.driveDirection===1?"horario.":"antihorario."));
}
function createNewCircuit(){
 const hadPieces=state.types.length||state.loose.length;
 if(hadPieces)state.draft={...snapshot(),name:state.circuitName,
  creator:circuitCreator(),direction:state.driveDirection,
  activeId:state.activeCircuitId};
 state.circuitName="";state.circuitCreator="";state.activeCircuitId=null;
 state.sessionLaps=[];
 state.reference=null;state.referenceImage=null;state.templateIncludeInExport=false;
 state.driveDirection=state.newCircuitDirection;
 changeTypes([],"Nuevo circuito · elige las piezas en el maletín.",[],START);
 resetWorkBoard();state.camera={panX:0,panY:0,zoom:1};
 save();openWorkshop();
}
const CAR_MODELS=Object.freeze({
 gripline:{name:"Avenir Gripline",id:"car-gripline"},
 spark:{name:"Helix Spark",id:"car-spark"}
});
function selectCar(id){
 if(!CAR_MODELS[id])return false;
 const item=CAR_MODELS[id];
 if(!shopOwned(item.id)){
  const next=[...state.shopOwned,item.id];
  try{localStorage.setItem(SHOP_OWNED_KEY,JSON.stringify(next));}
  catch(e){toast("No se ha podido guardar el coche en tu colección.");return false;}
  state.shopOwned=next;
 }
 state.selectedCar=id;
 save();updateUI();toast(item.name+" seleccionado para la próxima carrera.");
 return true;
}
function menuRace(){
 if(!state.track.valid){
  openWorkshop();toast("Cierra primero el circuito para poder competir.");
  return false;
 }
 play();return true;
}
function play(){
 state.triggerGesture=null;
 if(!state.track.valid){
  toast("El circuito todavía no está cerrado. Termina el montaje en el taller.");
  return false;
 }
 resetLap();state.sessionLaps=[];state.sessionName=circuitLabel();
 if(state.track.laneChangerIndex>=0)state.lane=laneAIndex();
 state.sessionCar=state.selectedCar;
 state.run=true;state.penalty=0;state.deslot=null;state.drift=0;state.driftDirection=0;state.rearSlip=0;state.rearSlipVelocity=0;state.rearStress=0;state.cornerDistance=0;state.gripDebt=0;state.cornerDirection=0;state.gas=0;state.buttonGas=false;state.keyboardGas=false;state.speed=0;
 state.mode="race";state.latest=performance.now();primeMotorAudio();updateUI();resize();
 resetFollowCamera();
 toast("¡"+CAR_MODELS[state.selectedCar].name+" listo! Acelera para iniciar el cronómetro.");
 return true;
}

function endSession(target="menu"){
 state.run=false;state.gas=0;state.buttonGas=false;state.keyboardGas=false;state.triggerGesture=null;
 if(!state.sessionLaps.length){
  if(target==="build")openWorkshop();else showMenu();
  return false;
 }
 state.mode="results";renderSessionSummary();updateUI();resize();return true;
}
function renderSessionSummary(){
 $("resultsCircuit").textContent=state.sessionName+" · "+
  CAR_MODELS[state.sessionCar||state.selectedCar].name+" · "+
  (state.driveDirection===1?"Horario":"Antihorario")+
  " · "+(state.track.laneChangerIndex>=0?
   state.sessionLaps.length*2:state.sessionLaps.length)+" vueltas completas";
 if(state.track.laneChangerIndex>=0){
  const pairs=state.sessionLaps.filter(l=>l.changeover);
  const bestPair=pairs.reduce((best,l)=>Math.min(best,l.seconds),Infinity);
  const scores=$("resultsStats");scores.textContent="";
  const metric=document.createElement("div");metric.className="result-metric combined-best";
  const label=document.createElement("span");label.textContent="Mejor doble vuelta PT/82";
  const value=document.createElement("strong");
  value.textContent=Number.isFinite(bestPair)?format(bestPair)+" s":"—";
  metric.appendChild(label);metric.appendChild(value);scores.appendChild(metric);
  const list=$("resultsLaps");list.innerHTML="";
  for(const pair of pairs){
   const row=document.createElement("div");row.className="result-row"+(pair.record?" is-best-left":"");
   const title=document.createElement("span");title.textContent="Vueltas "+(pair.number-1)+" y "+pair.number;
   const time=document.createElement("strong");time.textContent=format(pair.seconds)+" s";
   const detail=document.createElement("small");
   detail.textContent=format(pair.first)+" + "+format(pair.second)+" s · salida Carril A · PT/82";
   row.appendChild(title);row.appendChild(time);row.appendChild(detail);list.appendChild(row);
  }
  return;
 }
 const best=[0,1].map(lane=>state.sessionLaps.filter(l=>l.lane===lane)
  .reduce((min,l)=>Math.min(min,l.seconds),Infinity));
 const a=laneAIndex(),b=1-a;
 const scores=$("resultsStats");
 scores.textContent="";
 const lanes=document.createElement("div");lanes.className="results-lane-metrics";
 function metric(parent,title,value,cssClass){
  const tile=document.createElement("div");tile.className=cssClass;
  const label=document.createElement("span");label.textContent=title;
  const time=document.createElement("strong");time.textContent=value;
  tile.appendChild(label);tile.appendChild(time);parent.appendChild(tile);
  return tile;
 }
 metric(lanes,"Mejor Carril A",Number.isFinite(best[a])?format(best[a])+" s":"—","result-metric lane-left");
 metric(lanes,"Mejor Carril B",Number.isFinite(best[b])?format(best[b])+" s":"—","result-metric lane-right");
 scores.appendChild(lanes);
 const combined=best.every(Number.isFinite)?format(best[0]+best[1])+" s":"—";
 metric(scores,"Mejor combinado",combined,"combined-best");
 const list=$("resultsLaps");list.innerHTML="";
 for(const lap of state.sessionLaps){
  // El color señala la vuelta más rápida de CADA carril en ESTA sesión,
  // no el récord histórico (que puede corresponder a otra sesión).
  const bestOfLane=Number.isFinite(best[lap.lane])&&
   Math.abs(lap.seconds-best[lap.lane])<0.0005;
  const row=document.createElement("div");
  row.className="result-row"+(bestOfLane?
   (lap.lane===a?" is-best-left":" is-best-right"):"");
  const label=document.createElement("span");
  label.textContent="Vuelta "+lap.number+" · "+laneLabel(lap.lane);
  const value=document.createElement("strong");value.textContent=format(lap.seconds)+" s";
  const diff=document.createElement("small");
  diff.className=lap.previous===null?"is-initial":lap.seconds<=lap.previous?"is-gain":"is-loss";
  diff.textContent=lap.previous===null?"Primera vuelta de este carril":
   (lap.seconds<=lap.previous?"Mejora ":"Retrocede ")+
   format(Math.abs(lap.seconds-lap.previous))+" s";
  if(lap.record)diff.textContent+=" · RÉCORD PERSONAL";
  if(bestOfLane){
   const marker=document.createElement("b");
   marker.className="session-best-label";
   marker.textContent="MEJOR DEL CARRIL";
   diff.appendChild(marker);
  }
  row.appendChild(label);row.appendChild(value);row.appendChild(diff);
  list.appendChild(row);
 }
}
function back(){endSession("build");}
function pause(){state.run=!state.run;state.gas=0;state.buttonGas=false;state.keyboardGas=false;state.triggerGesture=null;
 $("trigger").classList.remove("pressed");state.latest=performance.now();if(state.run)primeMotorAudio();updateUI();
 toast(state.run?"¡Volvemos a correr!":"Carrera en pausa.");}
function switchLane(){
 if(state.track.laneChangerIndex>=0)return false;
 if(state.mode!=="race"||!state.track.valid)return false;
 if(state.laneTransition)return false;
 if(state.penalty>0){toast("Espera a recuperar el coche antes de cambiar de carril.");return false;}
 const current=drivingPose();if(!current)return false;
 const from=state.lane,to=1-from;
 const nextLane=state.track.lanes[state.driveDirection===-1?1-to:to];
 const position=laneDistanceAtPiece(nextLane,current.pieceIndex,current.pieceT);
 state.distance=state.driveDirection===-1?
  (nextLane.total-position)%nextLane.total:position;
 state.lane=to;
 state.laneTransition={from,elapsed:0,duration:LANE_CHANGE_SECONDS};
 if(state.raceStarted)state.lapEligible=false;
 state.followCamera.settle=.85;
 updateHud();
 toast("Cambio suave al "+laneLabel(to)+
  (state.raceStarted?" · vuelta sin récord.":"."));
 return true;
}
function completeLap(){
 if(state.seconds<.05)return;
 if(state.track.laneChangerIndex>=0){
  const seconds=state.seconds;
  const valid=state.x350Crossings===1&&!state.laneTransition?.duration;
  if(state.x350FirstLap===null){
   state.x350FirstLap=valid?seconds:null;
   state.seconds=0;state.lap++;state.x350Crossings=0;
   toast(valid?"Primera vuelta PT/82 registrada · queda otra.":"Primera vuelta sin cambio válido.");
   return;
  }
  const first=state.x350FirstLap,total=first+seconds;
  if(first!==null&&valid&&state.lane===laneAIndex()){
   // v2 inicia siempre en el interior; no mezclar tiempos históricos B→A.
   const key=recKey()+"-pt82-pair-v2";
   const prior=typeof state.records[key]==="number"?state.records[key]:null;
   const best=prior===null||total<prior;
   state.sessionLaps.push({number:state.lap,lane:laneAIndex(),seconds:total,
    first,second:seconds,changeover:true,previous:prior,record:best});
   if(best){state.records[key]=total;save();}
   toast((best?"¡Récord PT/82! ":"Dos vueltas PT/82 · ")+format(total)+" s");
  }else toast("Dos vueltas no homologadas: revisa el cruce.");
  state.x350FirstLap=null;state.x350Crossings=0;state.seconds=0;state.lap++;
  return;
 }

 // La vuelta que ha combinado dos carriles no genera un récord oficial.
 // La carrera no se reinicia: al cruzar meta comienza otro parcial válido.
 if(!state.lapEligible||state.laneTransition){
  state.seconds=0;state.lap++;
  state.lapEligible=!state.laneTransition;
  toast("Vuelta mixta sin récord · siguiente vuelta válida.");
  return;
 }
 const v=record(),sec=state.seconds;
 const previous=[...state.sessionLaps].reverse().find(l=>l.lane===state.lane)?.seconds??null;
 const isRecord=v[state.lane]==null||sec<v[state.lane];
 state.sessionLaps.push({number:state.sessionLaps.length+1,lane:state.lane,
  seconds:sec,previous,record:isRecord});
 if(isRecord){
  v[state.lane]=sec;state.records[recKey()]=v;save();
  toast("¡Récord personal "+laneLabel(state.lane)+"! "+format(sec)+" s");
 }else toast("Vuelta "+state.lap+" · "+format(sec)+" s");
 state.seconds=0;state.lap++;
}
// Modelo de slot simplificado: masa trasera que desliza lateralmente,
// neumáticos con fuerza de agarre y amortiguación, guía delantera retenida.
// Parámetros experimentales; no son medidas de coches reales.
const DRIVE=Object.freeze({
 maxSpeed:1250,topSpeed:1150,gravity:9.81,
 lateralElasticity:.085, // Derrape visible sin penalizar de más al 95 %.
 fullThrottleSlipAt:.975, // El 100% sostenido no es seguro en curvas largas.
 fullThrottleLoad:90,minCurveDistance:65
});
// Ficha por vehículo, preparada para futuras diferencias de comportamiento.
const VEHICLE_DYNAMICS=Object.freeze({
 gripline:Object.freeze({rearMassKg:.045,gripG:.97,springNPerM:3.6,
  damperNsPerM:.70,straightSpringNPerM:30,straightDamperNsPerM:.50,
  wheelbaseMM:65,guideYawLimit:.245}),
 spark:Object.freeze({rearMassKg:.045,gripG:.97,springNPerM:3.6,
  damperNsPerM:.70,straightSpringNPerM:30,straightDamperNsPerM:.50,
  wheelbaseMM:65,guideYawLimit:.245})
});
const carDynamics=()=>VEHICLE_DYNAMICS[state.selectedCar]||VEHICLE_DYNAMICS.gripline;
function curveRadius(p,lane){
 if(!p||!p.curve)return Infinity;
 const offset=lane===0?-LANE_OFFSET:LANE_OFFSET;
 return Math.max(70,p.radius-offset*p.curve);
}
function cornerForces(p,lane,speed=state.speed){
 const car=carDynamics(),radiusMm=curveRadius(p,lane);
 const lateralAcceleration=Number.isFinite(radiusMm)?
  Math.max(0,speed*speed/radiusMm/1000):0; // m/s² (velocidad en mm/s)
 const gripAcceleration=car.gripG*DRIVE.gravity;
 return{radiusMm,lateralAcceleration,gripAcceleration,
  inertialForceN:car.rearMassKg*lateralAcceleration,
  gripForceN:car.rearMassKg*gripAcceleration};
}
// Referencia del inicio de inestabilidad de la trasera: cuenta tanto la
// adherencia centrípeta real como la pérdida de estabilidad de la guía a
// velocidad extrema. No es un umbral de salida instantáneo.
function curveLimit(p,lane){
 const radius=curveRadius(p,lane);
 return Number.isFinite(radius)?Math.min(
  Math.sqrt(carDynamics().gripG*DRIVE.gravity*1000*radius),
  DRIVE.fullThrottleSlipAt*DRIVE.topSpeed):Infinity;
}
const CURVE_SPAN_CACHE=new WeakMap();
// Detectar el arco completo de piezas curvas consecutivas del mismo sentido.
// Una unión entre dos módulos curvos NO reinicia la progresión del esfuerzo.
function curvePhase(p,lane,distance=state.distance){
 if(!p?.curve||!lane?.total)return{progress:0,lengthMm:0};
 if(!Number.isInteger(p.pieceIndex)||p.pieceIndex<0)
  return{progress:1,lengthMm:0}; // Uso directo en pruebas de fuerza.
 let spans=CURVE_SPAN_CACHE.get(lane);
 if(!spans){
  const types=state.track.types,n=types.length;
  const turns=types.map(id=>Math.sign(CATALOG[id]?.angle||0));
  const starts=Array(n).fill(Infinity),ends=Array(n).fill(-Infinity);
  for(let j=1;j<lane.nodes.length;j++){
   const id=lane.nodes[j].pieceIndex;
   if(id>=0&&id<n){
    starts[id]=Math.min(starts[id],lane.lengths[j-1]);
    ends[id]=Math.max(ends[id],lane.lengths[j]);
   }
  }
  spans=turns.map((turn,i)=>{
   if(!turn)return null;
   let first=i,last=i,count=0;
   while(count++<n-1&&turns[(first+n-1)%n]===turn)
    first=(first+n-1)%n;
   count=0;
   while(count++<n-1&&turns[(last+1)%n]===turn)
    last=(last+1)%n;
   const start=starts[first],end=ends[last],total=lane.total;
   const lengthMm=(end-start+total)%total||total;
   return{start,end,lengthMm};
  });
  CURVE_SPAN_CACHE.set(lane,spans);
 }
 const span=spans[p.pieceIndex];
 if(!span)return{progress:0,lengthMm:0};
 const total=lane.total;
 const nativeDistance=((state.driveDirection===-1?-distance:distance)%total+total)%total;
 const traveled=state.driveDirection===-1?
  (span.end-nativeDistance+total)%total:
  (nativeDistance-span.start+total)%total;
 return{progress:Math.max(0,Math.min(1,traveled/span.lengthMm)),lengthMm:span.lengthMm};
}
// Los neumáticos no desarrollan todo el esfuerzo lateral en la primera
// junta: la carga efectiva crece y alcanza su máximo pasada media curva.
function curveStressEnvelope(progress){
 const t=Math.max(0,Math.min(1,(progress-.08)/.62));
 return .08+.92*t*t*(3-2*t);
}
function advanceRearDynamics(p,lane,dt){
 const car=carDynamics(),forces=cornerForces(p,lane);
 const count=Math.max(1,Math.ceil(Math.max(0,dt)/(1/120)));
 const step=Math.max(0,dt)/count,turn=p?.curve||0;
 const phase=curvePhase(p,state.track.lanes[drivingLaneIndex()]);
 const envelope=turn?curveStressEnvelope(phase.progress):0;
 const excess=Math.max(0,forces.lateralAcceleration-forces.gripAcceleration);
 const elastic=DRIVE.lateralElasticity*Math.min(forces.lateralAcceleration,forces.gripAcceleration);
 // A toda velocidad el coche pierde reserva de estabilidad de la guía,
 // también en curvas amplias. El efecto tarda en crecer por el arco.
 // No sustituye a v²/r ni elimina la diferencia entre los dos carriles.
 const guideExcess=Math.max(0,state.speed/DRIVE.topSpeed-
  DRIVE.fullThrottleSlipAt)*DRIVE.fullThrottleLoad*envelope;
 const effectiveExcess=excess*envelope+guideExcess;
 const outwardForce=turn*car.rearMassKg*
  (effectiveExcess+elastic*(.25+.75*envelope));
 state.rearStress=effectiveExcess;
 // La curva conserva un muelle suave y amortiguación estable. En recta
 // aumentamos la rigidez y acompañamos la amortiguación: la trasera
 // atraviesa el centro y llega al contraderrape del ~50 % en ~0.12 s,
 // frente a ~0.25 s antes. Latigazo rápido SIN teletransporte, y
 // sin reiniciar ni posición ni velocidad al cambiar de pieza.
 const springRate=turn?car.springNPerM:car.straightSpringNPerM;
 const dampingRate=turn?car.damperNsPerM:car.straightDamperNsPerM;
 for(let i=0;i<count;i++){
  const spring=springRate*state.rearSlip/1000;
  const damper=dampingRate*state.rearSlipVelocity/1000;
  const acceleration=(outwardForce-spring-damper)/car.rearMassKg*1000;
  state.rearSlipVelocity+=acceleration*step;
  state.rearSlip+=state.rearSlipVelocity*step;
  if(!turn&&Math.abs(state.rearSlip)<.025&&
     Math.abs(state.rearSlipVelocity)<.3){
   state.rearSlip=0;state.rearSlipVelocity=0;
  }
 }
 const limitMm=car.wheelbaseMM*Math.tan(car.guideYawLimit);
 state.drift=Math.min(1,Math.abs(state.rearSlip)/limitMm);
 state.driftDirection=Math.abs(state.rearSlip)>.1?Math.sign(state.rearSlip):0;
 state.gripDebt=state.drift;
 return{...forces,phase:phase.progress,stressEnvelope:envelope,
  effectiveExcess,slipMm:state.rearSlip,
  slipVelocityMmS:state.rearSlipVelocity,
  yawRad:Math.atan2(state.rearSlip,car.wheelbaseMM),
  limitMm,deslot:Math.abs(state.rearSlip)>=limitMm};
}
function simulation(dt){
 if(!state.run||!state.track.valid)return;
 const g=state.keyboardGas?1:state.gas;
 // Salida sin semáforo: no cronometrar espera, ni pulsar el gatillo al 0%.
 // El primer gas real abre la salida una sola vez por tanda/carril.
 if(!state.raceStarted){
  if(g<=0)return;
  state.raceStarted=true;
 }
 state.seconds+=dt; // después de arrancar, también cuenta soltar gas o penalizaciones
 if(state.penalty>0){
  state.penalty=Math.max(0,state.penalty-dt);
  if(state.deslot)state.deslot.elapsed=Math.min(3,state.deslot.elapsed+dt);
  if(state.penalty===0){state.deslot=null;state.drift=0;}
  return;
 }
 const targetSpeed=g*DRIVE.topSpeed;
 const response=g>0?2.25:2.9;
 state.speed=Math.max(0,Math.min(DRIVE.maxSpeed,
  state.speed+(targetSpeed-state.speed)*(1-Math.exp(-response*dt))
 ));
 const lane=state.track.lanes[drivingLaneIndex()],p=drivingPose();
 const travel=state.speed*dt;
 if(p?.curve){
  if(state.cornerDirection!==p.curve){
   state.cornerDirection=p.curve;state.cornerDistance=0;
  }
  state.cornerDistance+=travel;
 }else{state.cornerDistance=0;state.cornerDirection=0;}
 // La masa trasera acumula inercia lateral y puede recuperar tracción.
 const rear=advanceRearDynamics(p,state.lane,dt);
 if(p?.curve&&rear.phase>=.50&&
  state.cornerDistance>=DRIVE.minCurveDistance&&rear.deslot){
  state.speed=0;state.penalty=3;
  state.drift=0;state.gripDebt=0;state.rearSlip=0;state.rearSlipVelocity=0;state.rearStress=0;
  state.deslot={pose:{...p},elapsed:0,turn:p.curve||1};
  toast("¡Desencarrilado! La trasera perdió el agarre · +3 s.");return;
 }
 // Una PT/82 conmuta en el conector de entrada; el recorrido visible en
 // la X usa el progreso de la pieza y no la duración de una animación.
 if(state.track.laneChangerIndex>=0){
  const idx=state.track.laneChangerIndex;
  const entry=laneDistanceAtPiece(lane,idx,state.driveDirection===1?0:1);
  const entryDrive=state.driveDirection===1?entry:(lane.total-entry)%lane.total;
  const remaining=(entryDrive-state.distance+lane.total)%lane.total;
  if(state.x350Armed&&remaining<=travel+1e-8){
   const target=1-state.lane;
   const nextLane=state.track.lanes[state.driveDirection===-1?1-target:target];
   const nextEntry=laneDistanceAtPiece(nextLane,idx,state.driveDirection===1?0:1);
   const driveEntry=state.driveDirection===1?nextEntry:(nextLane.total-nextEntry)%nextLane.total;
   state.laneTransition={from:state.lane,pieceIndex:idx,physical:true};
   state.lane=target;state.x350Armed=false;state.x350Crossings++;
   const beyond=Math.max(0,travel-remaining);
   state.distance=(driveEntry+beyond)%nextLane.total;
   if(driveEntry+beyond>=nextLane.total)completeLap();
   // La PT/82 conmuta físicamente de ranura en este mismo paso de
   // simulación: el HUD debe anunciar el carril destino sin retraso.
   updateHud();
  }else{
   state.distance+=travel;
   if(state.distance>=lane.total){state.distance%=lane.total;completeLap();}
  }
  if(drivingPose()?.pieceIndex!==idx)state.x350Armed=true;
 }else{
  state.distance+=travel;
  if(state.distance>=lane.total){state.distance%=lane.total;completeLap();}
 }
}

// Sonido auténtico de Scalextric: sin síntesis y sin cambiar las revoluciones.
const MOTOR_AUDIO_URL="./assets/audio/slotrace-motor-loop.mp3";
let motorCtx=null,motorGain=null,motorSource=null,motorLoading=null,motorFailed=false,motorLastSync=-Infinity;
function primeMotorAudio(){
 if(!state.motorEnabled||motorFailed)return;
 const AudioClass=window.AudioContext||window.webkitAudioContext;
 if(!AudioClass||typeof fetch!=="function")return;
 try{
  if(!motorCtx){
   motorCtx=new AudioClass();
   motorGain=motorCtx.createGain();
   motorGain.gain.value=0;
   motorGain.connect(motorCtx.destination);
  }
  if(motorCtx.state==="suspended"){
   const resumed=motorCtx.resume();
   if(resumed&&typeof resumed.catch==="function")resumed.catch(()=>{});
  }
  if(motorLoading||motorSource)return;
  motorLoading=fetch(MOTOR_AUDIO_URL,{cache:"force-cache"})
   .then(response=>{if(!response.ok)throw new Error("Motor HTTP "+response.status);return response.arrayBuffer();})
   .then(bytes=>motorCtx.decodeAudioData(bytes))
   .then(buffer=>{
    const source=motorCtx.createBufferSource();
    source.buffer=buffer;
    source.loop=true;
    source.connect(motorGain);
    source.start();
    motorSource=source;
   })
   .catch(()=>{motorFailed=true;motorLoading=null;});
 }catch(err){motorFailed=true;}
}
function syncMotorAudio(now=performance.now(),force=false){
 if(!motorSource||!motorGain||!motorCtx||motorCtx.state!=="running")return;
 if(!force&&now-motorLastSync<70)return;
 motorLastSync=now;
 const moving=state.motorEnabled&&state.mode==="race"&&state.run&&state.raceStarted
  &&state.penalty<=0&&state.speed>25;
 // Sólo cambia suavemente el volumen según el movimiento.
 const volume=moving?Math.min(.57,.04+.48*Math.min(1,state.speed/850)):0;
 const gain=motorGain.gain,time=motorCtx.currentTime;
 gain.cancelScheduledValues(time);
 gain.setTargetAtTime(volume,time,moving?.12:.055);
}
// Rueda de sintonización táctil: 20 muescas de 5% y sonido direccional.
// El audio es generado localmente con Web Audio, sin archivos externos.
const DIAL_STEP=5;
const DIAL_PX_PER_CLICK=7;
let dialAudioContext=null;
function initDialAudio(){
 if(!state.clicksEnabled)return;
 const AudioClass=window.AudioContext||window.webkitAudioContext;
 if(!AudioClass)return; // algunos navegadores de prueba no tienen salida de audio
 try{
  if(!dialAudioContext)dialAudioContext=new AudioClass();
  if(dialAudioContext.state==="suspended"){
   const resume=dialAudioContext.resume();
   if(resume&&typeof resume.catch==="function")resume.catch(()=>{});
  }
 }catch(err){dialAudioContext=null;}
}
function dialSound(direction,count){
 if(!state.clicksEnabled)return;
 initDialAudio();
 const ctx=dialAudioContext;
 if(!ctx||ctx.state==="closed")return;
 const freq=direction>0?1260:670; // subir: agudo; bajar: grave
 const time=ctx.currentTime||0;
 const steps=Math.min(20,Math.abs(count));
 for(let i=0;i<steps;i++){
  try{
   const at=time+i*.019;
   const osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type="triangle";
   osc.frequency.setValueAtTime(freq,at);
   osc.frequency.exponentialRampToValueAtTime(freq*.73,at+.012);
   gain.gain.setValueAtTime(.0001,at);
   gain.gain.exponentialRampToValueAtTime(.05,at+.0015);
   gain.gain.exponentialRampToValueAtTime(.0001,at+.016);
   osc.connect(gain);gain.connect(ctx.destination);
   osc.start(at);osc.stop(at+.018);
  }catch(err){break;}
 }
}
function updateTriggerDisplay(){
 const percent=Math.round((state.keyboardGas?1:state.gas)*100);
 $("triggerFill").style.height=percent+"%";
 $("triggerValue").textContent=percent+"%";
 $("trigger").setAttribute("data-power",String(percent));
 $("trigger").classList.toggle("pressed",Boolean(state.triggerGesture));
 $("clickSound").textContent=state.clicksEnabled?"🔊 Clics activados":"🔇 Clics desactivados";
 $("clickSound").setAttribute("aria-pressed",String(state.clicksEnabled));
}
function setProgressGas(value){
 state.gas=Math.max(0,Math.min(1,value));
 updateTriggerDisplay();
 updateHud();
}
function setDialSteps(steps){
 const from=Math.round(state.gas*100/DIAL_STEP);
 const to=Math.max(0,Math.min(20,from+steps));
 const actual=to-from;
 if(!actual)return;
 state.gas=to*DIAL_STEP/100;
 dialSound(Math.sign(actual),actual);
 updateTriggerDisplay();
 updateHud();
}
function stopProgressGas(){
 if(!state.triggerGesture&&state.gas===0)return;
 state.triggerGesture=null;
 state.gas=0;
 updateTriggerDisplay();
 updateHud();
}
function triggerPointerDown(e){
 if(!state.run||state.triggerGesture)return;
 e.preventDefault?.();
 state.triggerGesture={id:e.pointerId,lastY:e.clientY,carry:0};
 state.gas=0;updateTriggerDisplay();updateHud();
 // En Safari iOS el AudioContext debe activarse durante un gesto real.
 initDialAudio();
 primeMotorAudio();
 try{$("trigger").setPointerCapture(e.pointerId);}catch(err){}
}
function triggerPointerMove(e){
 const gesture=state.triggerGesture;
 if(!state.run||!gesture||e.pointerId!==gesture.id)return;
 e.preventDefault?.();
 const delta=gesture.lastY-e.clientY;
 gesture.lastY=e.clientY;
 gesture.carry+=delta;
 const steps=Math.trunc(gesture.carry/DIAL_PX_PER_CLICK);
 if(!steps)return;
 gesture.carry-=steps*DIAL_PX_PER_CLICK;
 setDialSteps(steps);
}
function triggerPointerEnd(e){
 if(!state.triggerGesture||e.pointerId!==state.triggerGesture.id)return;
 stopProgressGas();
}
function updateHud(){
 $("lap").textContent=state.lap;
 $("lapTime").textContent=format(state.seconds);
 $("power").textContent=Math.round(state.keyboardGas?100:state.gas*100)+"%";
 $("speed").textContent=Math.round(state.speed/10)+" cm/s";
 const v=record(),a=laneAIndex();
 const laneBadge=$("laneIndicator"),letter=laneLetter(state.lane);
 const badgeLabel="OCUPAS CARRIL "+letter;
 if(laneBadge.textContent!==badgeLabel)laneBadge.textContent=badgeLabel;
 laneBadge.classList.toggle("lane-a",letter==="A");
 laneBadge.classList.toggle("lane-b",letter==="B");
 $("bestLeftLabel").textContent=state.track.laneChangerIndex>=0?"VUELTA 1":"CARRIL A";
 $("bestRightLabel").textContent=state.track.laneChangerIndex>=0?"PRUEBA":"CARRIL B";
 if(state.track.laneChangerIndex>=0){
  $("bestLeft").textContent=state.x350FirstLap===null?"—":format(state.x350FirstLap)+" s";
  $("bestRight").textContent="2 vueltas";
  const best=state.records[recKey()+"-pt82-pair-v2"];
  $("combined").textContent=typeof best==="number"?format(best)+" s":"—";
 }else{
  $("bestLeft").textContent=v[a]===null?"—":format(v[a])+" s";
  $("bestRight").textContent=v[1-a]===null?"—":format(v[1-a])+" s";
  $("combined").textContent=v[0]!==null&&v[1]!==null?format(v[0]+v[1])+" s":"—";
 }
 const pose=drivingPose();
 const isBelow=Boolean(state.track.bridge)&&carTrackLevel(state.track,pose)==="lower";
 const underCrossing=isBelow&&pose&&Boolean(state.track.bridge)&&
   Math.hypot(pose.x-positionOnPiece(state.track.parts[0].start,state.track.parts[0].id,.5).x,
     pose.y-positionOnPiece(state.track.parts[0].start,state.track.parts[0].id,.5).y)<165;
 $("raceHint").textContent=state.penalty>0?"TROMPO · REGRESO A PISTA EN "+state.penalty.toFixed(1)+" s":
   state.track.laneChangerIndex>=0&&state.laneTransition?"PT/82 · CAMBIO AUTOMÁTICO":
   state.track.laneChangerIndex>=0?"PT/82 · "+laneLabel(state.lane).toUpperCase()+" · DOS VUELTAS":
   state.laneTransition?"CAMBIANDO DE CARRIL · TRANSICIÓN SUAVE":
   !state.run?"EN PAUSA":
   !state.lapEligible?"VUELTA MIXTA · SIN RÉCORD":
   !state.raceStarted?"ESPERANDO SALIDA · ACELERA PARA COMENZAR":
   underCrossing?"COCHE PASANDO POR DEBAJO DEL PUENTE":
   state.drift>.18?"DERRAPE CONTROLADO · MANTÉN EL GAS":
   laneLabel(state.lane)+" · Busca el límite sin pasarte en las curvas";
 $("pause").textContent=state.run?"⏸ Pausar":"▶ Seguir";
 $("lane").hidden=state.track.laneChangerIndex>=0;
 $("lane").disabled=state.track.laneChangerIndex>=0||
  Boolean(state.laneTransition)||state.penalty>0;
 $("lane").textContent=state.laneTransition?"⇄ Cambiando…":"⇄ "+laneLabel(1-state.lane);
 $("lane").setAttribute("aria-label","Cambiar de "+laneLabel(state.lane)+
  " a "+laneLabel(1-state.lane));
 $("trigger").disabled=!state.run;
 updateTriggerDisplay();
}

const CASE_PAGE_SIZE=99; // Todo el tipo elegido se desplaza en un único estante lateral.
const CASE_TABS={straight:"caseStraights",curve:"caseCurves",special:"caseSpecial",bridge:"caseBridges"};
const pieceCategory=id=>["START350","X350"].includes(id)?"special":id.startsWith("R")?"curve":"straight";
function chooseCaseCategory(category){
 if(!CASE_TABS[category])return false;
 state.caseCategory=category;state.casePage=0;
 // La imagen es una referencia de fondo: en Puentes, bloquear su arrastre
 // automáticamente para que no capture los toques de selección del trazado.
 if(category==="bridge"&&state.reference&&!state.reference.locked){
  state.reference.locked=true;save();
 }
 if(!state.caseOpen){state.caseOpen=true;save();}
 updateUI();scheduleResize();return true;
}
function changeCasePage(direction){
 const total=pocketIds.filter(id=>pieceCategory(id)===state.caseCategory).length;
 const pages=Math.max(1,Math.ceil(total/CASE_PAGE_SIZE));
 state.casePage=Math.min(pages-1,Math.max(0,state.casePage+direction));
 updateUI();
}
function scrollPieceShelf(direction){
 if(direction!==1&&direction!==-1)return false;
 const shelf=$("pieces");
 if(!shelf||shelf.hidden)return false;
 // Las flechas complementan el scroll nativo con inercia.
 // En iPhone, horizontal; en pantallas anchas, vertical.
 const horizontal=window.innerWidth<700;
 const extent=horizontal?(shelf.clientWidth||320):(shelf.clientHeight||350);
 const amount=Math.max(120,Math.round(extent*.72))*direction;
 if(typeof shelf.scrollBy==="function"){
  shelf.scrollBy(horizontal?{left:amount,behavior:"smooth"}:{top:amount,behavior:"smooth"});
 }else if(horizontal){
  shelf.scrollLeft=(shelf.scrollLeft||0)+amount;
 }else{
  shelf.scrollTop=(shelf.scrollTop||0)+amount;
 }
 return true;
}
function renderCasePages(){
 for(const [name,id] of Object.entries(CASE_TABS)){
  const tab=$(id);
  tab.classList.toggle("is-current",name===state.caseCategory);
  tab.setAttribute("aria-pressed",String(name===state.caseCategory));
 }
 const filtered=pocketIds.filter(id=>pieceCategory(id)===state.caseCategory);
 state.casePage=0;
 $("casePageInfo").textContent="1 / 1";
 $("casePrev").disabled=true;$("caseNext").disabled=true;
 $("casePagination").hidden=true;
 // El botón de elevar está también en Más; «Puentes» lo enseña directamente
 // en el mismo estante en lugar de obligar a abrir la caja grande.
 $("bridgeKit").hidden=false;
 $("bridgeDock").hidden=state.caseCategory!=="bridge";
 $("bridgePanel").hidden=state.caseCategory!=="bridge";
 $("pieces").hidden=state.caseCategory==="bridge";
 $("pieceShelfArrows").hidden=state.caseCategory==="bridge";
 const visible=new Set(filtered);
 for(const pocket of $("pieces").children)pocket.hidden=!visible.has(pocket.dataset.piece);
}
function removeLooseFromCase(id){
 const chosen=pocketPartId(id);
 if(lastCaseAppend?.pocketId===id&&lastCaseAppend.count===state.types.length&&
    lastCaseAppend.history===state.history.length&&state.types.at(-1)===chosen){
  lastCaseAppend=null;undo();toast("Última pieza devuelta al estante.");return true;
 }
 const latest=state.loose.findLastIndex(p=>p.id===chosen);
 const index=state.looseSelection>=0&&state.loose[state.looseSelection]?.id===chosen?
  state.looseSelection:latest;
 if(index<0){toast("No hay piezas sueltas de ese tipo para devolver.");return false;}
 pushHistory();detachLooseMember(index);
 state.loose.splice(index,1);state.looseSelection=-1;state.selection=-1;
 state.selectedGroup=null;state.selectionMode="group";
 save();updateUI();toast("Pieza suelta devuelta al estante.");return true;
}
function activateGroupMove(){
 if(!state.selectedGroup){toast("Toca primero el tramo que quieres mover.");return false;}
 state.selectionMode="group";updateUI();
 toast("Tramo seleccionado: arrástralo sobre la mesa.");return true;
}
function setLabel(id,value){
 const el=$(id),label=el.querySelector(".tool-label");
 if(label)label.textContent=value;
 else el.textContent=value;
}

/* Tienda DEV. Los derechos de adquisición se guardan separados de los
   circuitos y récords; el constructor mantiene stock ilimitado. */
const shopCarImage=car=>car==="spark"?
 "./assets/cars/helix_spark_threequarter.webp":"./assets/cars/avenir_gripline_threequarter.webp";
const shopOwned=id=>{
 if(state.shopOwned.includes(id))return true;
 return SHOP_PRODUCTS.some(p=>p.kind==="boxes"&&state.shopOwned.includes(p.id)&&
  ((p.plans||[]).includes(id)||(p.cars||[]).includes(id)));
};
function shopPiecesText(product){
 return Object.entries(product.pieces||{}).map(([id,qty])=>
  qty+" × "+(CATALOG[id]?.name||id)+" ("+(CATALOG[id]?.code||id)+")");
}
function shopTrackSymbol(kind){
 const eight=kind==="eight",curve=kind==="curve",bridge=kind==="bridge";
 return '<svg viewBox="0 0 250 110" class="shop-mini-track" aria-hidden="true">'+
  '<path d="'+(eight?'M26 52 C42 1 91 2 120 51 C147 109 203 105 224 52 C203 -4 149 0 120 51 C92 106 43 105 26 52':
   curve?'M13 97 C13 30 67 12 133 12 H232':
   bridge?'M12 90 L65 90 Q88 90 95 64 L151 27 Q166 16 180 23 L235 57':
   kind==="straight"?'M12 55 H238':kind==="urban"?'M12 90 C110 100 24 4 140 18 S241 64 200 96':
   'M25 58 V40 Q25 12 55 12 H193 Q225 12 225 40 V70 Q225 98 193 98 H55 Q25 98 25 70 Z')+
  '" fill="none" stroke="#1b2931" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>'+
  '<path d="'+(eight?'M26 52 C42 1 91 2 120 51 C147 109 203 105 224 52 C203 -4 149 0 120 51 C92 106 43 105 26 52':
   curve?'M13 97 C13 30 67 12 133 12 H232':
   bridge?'M12 90 L65 90 Q88 90 95 64 L151 27 Q166 16 180 23 L235 57':
   kind==="straight"?'M12 55 H238':kind==="urban"?'M12 90 C110 100 24 4 140 18 S241 64 200 96':
   'M25 58 V40 Q25 12 55 12 H193 Q225 12 225 40 V70 Q225 98 193 98 H55 Q25 98 25 70 Z')+
  '" fill="none" stroke="#667582" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'+
  '<path d="M18 56h36" stroke="#e42043" stroke-width="6" stroke-linecap="round"/>'+
  '</svg>';
}

// Planos oficiales dibujados desde las piezas y conexiones REALES del motor.
const shopBlueprintCache=new Map();
function shopBlueprintSvg(types,name="circuito",origin=START){
 if(!types?.length)return "";
 const key=name+"::"+types.join("|")+"::"+[origin.x,origin.y,origin.h].join(",");
 if(shopBlueprintCache.has(key))return shopBlueprintCache.get(key);
 const layout=buildTrack(types,origin);
 const fmt=n=>Number(n.toFixed(2));
 const path=pts=>"M "+pts.map(p=>fmt(p.x)+" "+fmt(p.y)).join(" L ");
 const center=path(layout.points),width=TRACK_WIDTH;
 const {left,right,top,bottom}=layout.bounds;
 const pad=Math.max(80,width*.63);
 const [x,y,w,h]=[left-pad,top-pad,Math.max(1,right-left+pad*2),Math.max(1,bottom-top+pad*2)].map(fmt);
 const paint=(d,color,thick,attr="")=>'<path d="'+d+'" fill="none" stroke="'+color+
  '" stroke-width="'+thick+'" stroke-linecap="round" stroke-linejoin="round" '+attr+'/>';
 const surface=d=>paint(d,"#23313d",width+12)+paint(d,"#8797a6",width+4)+paint(d,"#f3f6f9",width-3);
 const lanes=layout.lanes.map(l=>paint(path(l.nodes),"#1d2933",6)+paint(path(l.nodes),"#aab4be",1.3)).join("");
 const seams=layout.parts.slice(1).map(part=>{
  const p=part.start,half=width/2,dx=Math.sin(p.h)*half,dy=Math.cos(p.h)*half;
  return '<line x1="'+fmt(p.x-dx)+'" y1="'+fmt(p.y+dy)+
   '" x2="'+fmt(p.x+dx)+'" y2="'+fmt(p.y-dy)+
   '" stroke="#314151" stroke-width="3.5" stroke-linecap="round"/>';
 }).join("");
 const crossing=(layout.bridge?.overParts||[]).map(i=>{
  const part=layout.parts[i];if(!part)return "";
  const d=path(part.points);
  return '<g class="shop-blueprint-bridge">'+paint(d,"#102231",width+30,'opacity=".3"')+
   surface(d)+layout.lanes.map((lane,ln)=>{
    const side=ln===0?-LANE_OFFSET:LANE_OFFSET;
    return paint(path(part.points.map(p=>({
      x:p.x-Math.sin(p.h)*side,y:p.y+Math.cos(p.h)*side
    }))),"#1c2b38",6);
   }).join("")+'</g>';
 }).join("");
 const p=layout.parts[0]?.start||START;
 const flag=Array.from({length:6},(_,i)=>
  '<rect x="-12" y="'+fmt(-width/2+i*width/6)+'" width="24" height="'+
  fmt(width/6)+'" fill="'+(i%2?"#fff":"#142333")+'"/>').join("");
 const svg='<svg class="shop-real-blueprint shop-mini-track" viewBox="'+[x,y,w,h].join(" ")+
  '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Plano real de '+name+
  ': '+types.length+' piezas; '+(layout.valid?"circuito válido":"en construcción")+'">'+
  paint(center,"#1e2b37",width+21,'opacity=".15"')+
  surface(center)+lanes+seams+crossing+
  '<g transform="translate('+fmt(p.x)+' '+fmt(p.y)+') rotate('+fmt(p.h*180/Math.PI)+')">'+flag+'</g></svg>';
 shopBlueprintCache.set(key,svg);
 return svg;
}

function shopArtwork(product){
 const car=product.car?'<img loading="lazy" src="'+shopCarImage(product.car)+
  '" alt="'+product.name+'" class="shop-car-image">':"";
 if(product.kind==="boxes")return '<div class="shop-box-visual shop-art-'+product.art+'">'+
  '<div class="shop-box-spine"></div><div class="shop-box-top"></div>'+
  '<div class="shop-box-face"><span class="shop-box-logo">Slot<span>Race</span> LAB ▨</span>'+
  '<span class="shop-box-name">'+product.short+'</span>'+
  '<span class="shop-box-sub">COLECCIÓN DE CIRCUITOS</span>'+car+
  '<div class="shop-box-track">'+shopBlueprintSvg(shopProduct(product.plans?.[0])?.types,product.short)+'</div>'+
  '<span class="shop-box-foot">PISTAS · COCHES · PLANOS</span></div></div>';
 if(product.kind==="cars")return '<div class="shop-car-visual">'+car+'</div>';
 if(product.kind==="circuits"){
  if(product.types)return '<div class="shop-blueprint-art'+
   (product.id==="plan-catalunya"?" is-catalunya":"")+'">'+
   shopBlueprintSvg(product.types,product.name,product.origin||START)+
   '<span class="shop-plan-caption">'+product.types.length+' PIEZAS · PLANO REAL</span></div>';
  return '<div class="shop-blueprint-pending" aria-label="Plano pendiente de diseño">'+
   '<span class="shop-pending-icon" aria-hidden="true">⌁</span>'+
   '<strong>Plano en diseño</strong><small>Receta pendiente</small></div>';
 }
 return '<div class="shop-simple-art shop-simple-'+product.art+'">'+shopTrackSymbol(product.art)+
  '<span>SR-PRECISION</span></div>';
}
function shopCardMarkup(product,compact=false){
 const owned=shopOwned(product.id),soon=Boolean(product.soon);
 const badge=soon?"PRÓXIMAMENTE":owned?"EN TU COLECCIÓN":product.tag;
 const button=soon?"Ver avance":owned?"Ver contenido":compact?"Ver ficha":"Añadir gratis";
 return '<article class="shop-card '+(product.kind==="boxes"?"shop-card-box ":"shop-card-small ")+
  (compact?"is-compact ":"")+'" data-kind="'+product.kind+'">'+
  '<div class="shop-card-art">'+shopArtwork(product)+'</div>'+
  '<div class="shop-card-text"><span class="shop-card-eyebrow">'+product.kicker+'</span>'+
  '<h3>'+product.name+'</h3><p>'+product.subtitle+'</p>'+
  '<div class="shop-highlights">'+product.highlights.map(x=>'<span>'+x+'</span>').join("")+'</div>'+
  '</div><div class="shop-card-action"><span class="shop-card-price">'+
  (owned?"✓ EN COLECCIÓN":soon?"EN DESARROLLO":"GRATIS · DEV")+'</span>'+
  '<button type="button" data-shop-product="'+product.id+'" aria-label="Ver '+product.name+'">'+
  button+' <span aria-hidden="true">›</span></button></div></article>';
}
function shopSelectCategory(kind){
 if(!SHOP_CATEGORIES[kind])return false;
 state.shopCategory=kind;renderShop();
 $("shopScroll").scrollTo?.({top:0,behavior:"smooth"});
 return true;
}
function renderShop(){
 if(state.mode!=="store")return;
 const category=state.shopCategory;
 for(const [key,meta] of Object.entries(SHOP_CATEGORIES)){
  const tab=$(meta.button),active=key===category;
  tab.setAttribute("aria-pressed",String(active));
  tab.classList.toggle("is-active",active);
 }
 const products=SHOP_PRODUCTS.filter(p=>p.kind===category);
 $("shopCategoryTitle").textContent=SHOP_CATEGORIES[category].title;
 $("shopCategoryCount").textContent=products.length+" productos";
 $("shopProducts").className="shop-products "+(category==="boxes"?"shop-products-boxes":"shop-products-grid");
 $("shopProducts").innerHTML=products.map(p=>shopCardMarkup(p)).join("");
 $("shopFeaturedSection").hidden=category!=="boxes";
 if(category==="boxes")$("shopFeatured").innerHTML=["pack-curves","pack-bridge","plan-catalunya"]
  .map(id=>shopCardMarkup(shopProduct(id),true)).join("");
 const owned=SHOP_PRODUCTS.filter(p=>shopOwned(p.id));
 $("shopCollectionSummary").textContent=owned.length+" productos disponibles · "+
  "La caja básica y sus contenidos están incluidos desde el inicio.";
 $("shopOwnedList").hidden=!state.shopCollectionExpanded;
 $("shopShowCollection").textContent=state.shopCollectionExpanded?
  "Ocultar colección ‹":"Ver colección ›";
 if(state.shopCollectionExpanded)$("shopOwnedList").innerHTML=owned.map(p=>
  '<button type="button" data-shop-product="'+p.id+'"><strong>'+p.name+
  '</strong><span>Ver ›</span></button>').join("");
}
function shopOpenProduct(id){
 const product=shopProduct(id);if(!product)return false;
 state.shopSelectedId=id;
 const owned=shopOwned(id),soon=Boolean(product.soon);
 $("shopModalTitle").textContent=product.name;
 const includes=(product.plans||[]).map(planId=>{
  const plan=shopProduct(planId);
  return '<button type="button" data-shop-plan="'+planId+'">'+
   '▤ '+plan.name+' <span>Ver plano ›</span></button>';
 }).join("");
 const pieces=shopPiecesText(product);
 const groups=pieces.length?'<h3>Piezas incluidas</h3><ul>'+pieces.map(x=>'<li>'+x+'</li>').join("")+'</ul>':"";
 $("shopModalContent").innerHTML=
  '<div class="shop-modal-art">'+shopArtwork(product)+'</div>'+
  '<span class="shop-eyebrow">'+product.kicker+'</span>'+
  '<h2>'+product.name+'</h2><p>'+product.detail+'</p>'+
  (product.creator?'<p class="shop-creator">CREADOR: '+product.creator+'</p>':"")+
  '<div class="shop-modal-tags">'+product.highlights.map(x=>'<span>'+x+'</span>').join("")+'</div>'+
  groups+(product.bridge?'<p class="shop-bridge-note">Incluye kit puente 65 mm.</p>':"")+
  (includes?'<h3>Planos incluidos</h3><div class="shop-modal-plans">'+includes+'</div>':"")+
  (product.types?'<p class="shop-bridge-note">Receta comprobada: '+product.types.length+
   ' piezas. Puedes guardarla y montarla desde Mis circuitos.</p>':"")+
  '<p class="shop-modal-honesty">Modo pruebas: sin cargos ni compras reales. Las piezas físicas continúan en modo ilimitado.</p>';
 $("shopModalPrimary").disabled=soon;
 $("shopModalPrimary").textContent=soon?"Próximamente":!owned?
  "Añadir gratis a mi colección":product.kind==="circuits"?
  "Guardar plano y montar":product.kind==="boxes"?
  "Ver planos de la caja":product.kind==="cars"&&product.id==="car-gripline"?
  "Elegir y jugar":"Ver mi colección";
 $("shopProductModal").hidden=false;
 $("shopModalClose").focus?.();
 return true;
}
function shopCloseProduct(){
 $("shopProductModal").hidden=true;
 state.shopSelectedId=null;
 return true;
}
function shopAcquire(id){
 const product=shopProduct(id);
 if(!product||product.soon)return false;
 if(shopOwned(id)){renderShop();return true;}
 const next=[...state.shopOwned,id];
 try{localStorage.setItem(SHOP_OWNED_KEY,JSON.stringify(next));}
 catch(e){toast("No se ha podido guardar esta adquisición local.");return false;}
 state.shopOwned=next;
 renderShop();shopOpenProduct(id);
 toast(product.name+" añadido a tu colección de pruebas.");
 return true;
}
function shopInstallPlan(id){
 const product=shopProduct(id);
 if(!product||product.kind!=="circuits"||!product.types||!shopOwned(id)){
  toast("Primero adquiere el plano o una caja que lo incluya.");return false;
 }
 // Si la receta ya está guardada por el jugador (por importación o edición),
 // reutilizarla sin crear duplicados ni sobrescribir su circuito personal.
 const direction=product.direction===-1?-1:1;
 const existing=state.library.find(c=>c.shopPlanId===id||
  (normalCircuitName(c.name)===normalCircuitName(product.name)&&
   (c.direction===-1?-1:1)===direction&&
   c.snapshot.types.join("|")===product.types.join("|")&&
   !(c.snapshot.loose||[]).length));
 if(existing){shopCloseProduct();return loadSavedCircuit(existing.id);}
 const origin=product.origin||START;
 const geometry=buildTrack(product.types,origin);
 if(!geometry.valid){toast("Este plano no ha superado la validación geométrica.");return false;}
 if(state.library.length>=120){toast("Inventario de circuitos completo.");return false;}
 const now=new Date().toISOString();
 const item={id:newCircuitId(),shopPlanId:id,name:product.name,direction,
  creator:cleanCreator(product.creator),
  snapshot:{types:product.types.slice(),loose:[],bridgeParts:[],origin:{...origin}},
  createdAt:now,updatedAt:now};
 const next=[item,...state.library];
 if(!safelyWriteLibrary(next))return false;
 state.library=next;
 shopCloseProduct();return loadSavedCircuit(item.id);
}
function shopPrimaryAction(){
 const id=state.shopSelectedId,product=shopProduct(id);
 if(!product||product.soon)return false;
 if(!shopOwned(id))return shopAcquire(id);
 if(product.kind==="circuits")return shopInstallPlan(id);
 if(product.kind==="boxes"){shopCloseProduct();return shopSelectCategory("circuits");}
 if(id==="car-gripline"||id==="car-spark"){
  shopCloseProduct();if(!selectCar(id==="car-spark"?"spark":"gripline"))return false;
  return menuRace();
 }
 shopCloseProduct();state.shopCollectionExpanded=true;renderShop();return true;
}

function updateUI(){
 state.viewDirty=true;
 syncMotorAudio(performance.now(),true);
 menu.hidden=state.mode!=="menu";
 stage.hidden=state.mode!=="build";race.hidden=state.mode!=="race";
 results.hidden=state.mode!=="results";
 for(const [name,screen] of Object.entries(hubScreens))screen.hidden=state.mode!==name;
 // Barra global única: misma ubicación y mismos accesos en todas las secciones.
 const showMainNavigation=!["race","results"].includes(state.mode);
 $("mainNavigation").hidden=!showMainNavigation;
 for(const [id,mode] of [
  ["navMenu","menu"],["navBuild","build"],["navLibrary","library"],
  ["navGarage","garage"],["navStore","store"]]){
  const element=$(id),active=state.mode===mode;
  element.classList.toggle("is-active",active);
  element.setAttribute("aria-current",active?"page":"false");
 }
 $("mastSettings").classList.toggle("is-active",state.mode==="settings");
 $("mastSettings").setAttribute("aria-label",state.mode==="settings"?"Ajustes abiertos":"Abrir Ajustes");
 if(state.mode==="store")renderShop();
 $("garageRace").disabled=!state.track.valid;
 $("garageRace").textContent="🏁 Jugar con "+CAR_MODELS[state.selectedCar].name;
 $("garageCarGripline").classList.toggle("garage-selected",state.selectedCar==="gripline");
 $("garageCarSpark").classList.toggle("garage-selected",state.selectedCar==="spark");
 $("garageChooseGripline").textContent=state.selectedCar==="gripline"?"✓ Seleccionado":"Elegir Gripline";
 $("garageChooseSpark").textContent=state.selectedCar==="spark"?"✓ Seleccionado":"Elegir Spark";
 $("garageChooseGripline").setAttribute("aria-pressed",String(state.selectedCar==="gripline"));
 $("garageChooseSpark").setAttribute("aria-pressed",String(state.selectedCar==="spark"));
 $("garageStatusGripline").textContent=state.selectedCar==="gripline"?"COCHE SELECCIONADO":"DISPONIBLE";
 $("garageStatusSpark").textContent=state.selectedCar==="spark"?"COCHE SELECCIONADO":"DISPONIBLE";
 $("raceCarName").textContent=CAR_MODELS[state.selectedCar].name;
 $("settingsSound").textContent=state.clicksEnabled?"Activado":"Desactivado";
 $("settingsSound").setAttribute("aria-pressed",String(state.clicksEnabled));
 $("settingsMotor").textContent=state.motorEnabled?"Activado":"Desactivado";
 $("settingsMotor").setAttribute("aria-pressed",String(state.motorEnabled));
 $("settingsGrid").textContent=state.gridEnabled?"Activada":"Desactivada";
 for(const [id,theme] of [["settingsTableWine","wine"],["settingsTableCyan","cyan"]]){
  const button=$(id),active=state.tableTheme===theme;
  button.classList.toggle("is-active",active);
  button.setAttribute("aria-pressed",String(active));
 }
 $("settingsXRay").textContent=state.xRayEnabled?"Activado":"Desactivado";
 $("settingsXRay").setAttribute("aria-pressed",String(state.xRayEnabled));
 for(const [id,mode] of [
  ["settingsCameraGeneral","general"],["settingsCameraFollow","follow"],["settingsCameraCustom","custom"]]){
  const button=$(id),active=state.cameraMode===mode;
  button.classList.toggle("is-active",active);
  button.setAttribute("aria-pressed",String(active));
 }
 $("settingsCameraCustomPanel").hidden=state.cameraMode!=="custom";
 $("settingsCameraZoom").value=String(state.followZoom);
 $("settingsCameraZoomValue").textContent=state.followZoom+"×";
 $("settingsCameraDescription").textContent=state.cameraMode==="custom"?
  "Seguimiento suave con aumento a medida ("+state.followZoom+"×). La orientación y la altura permanecen fijas.":
  state.cameraMode==="follow"?
   "Zoom fijo de 2×. Deja más pista por delante y sigue el coche suavemente, sin girar ni cambiar la altura.":
   "Se muestra todo el circuito sin mover la cámara.";
 $("settingsGrid").setAttribute("aria-pressed",String(state.gridEnabled));
 for(const id of ["circuitName","workCircuitName"])
  if(document.activeElement!==$(id))$(id).value=state.circuitName;
 renderLibrary();
 updateLibraryTabs();
 const orphan=recoverableDraft();
 updateTemplateUI();
 $("libraryDraftRecovery").hidden=!orphan;
 $("libraryRecoverDraft").textContent=orphan?"Recuperar «"+orphan.name+"»":"Recuperar borrador anterior";
 $("goHome").hidden=state.mode==="menu";
 $("menuRace").disabled=!state.track.valid;
 $("menuRaceDetail").textContent=state.track.valid?
  state.types.length+" piezas · "+(state.track.length/1000).toFixed(2)+" m · "+(state.driveDirection===1?"Horario":"Antihorario"):
  "Termina el circuito en el taller para poder competir";
 for(const [id,direction] of [["menuClockwise",1],["menuCounter",-1]])
  $(id).setAttribute("aria-pressed",String(state.newCircuitDirection===direction));
 setLabel("workDirection",state.driveDirection===1?"Horario":"Antihorario");

 const t=state.track;
 const looseKit=state.loose.some(p=>p.raised);
 const degrees=t.headingGap*180/Math.PI;
 const connectorInfo=t.types.length?" · "+Math.round(t.gap)+" mm / "+Math.round(degrees)+"°":"";
 const status=t.valid?
  (t.bridge?"CIRCUITO CON PUENTE":"CIRCUITO CERRADO")+" · "+(t.length/1000).toFixed(2)+" m":
  t.closed?"EXTREMOS CERRADOS · REVISAR PUENTE":
  t.types.length?(t.bridge?"PUENTE EN MONTAJE · EXTREMOS ABIERTOS":"EXTREMOS ABIERTOS")+connectorInfo:
  state.loose.length?state.loose.length+" PIEZAS SUELTAS":"MESA VACÍA · COLOCA PIEZAS";
 const issue=(t.types.filter(id=>id==="X350").length>1?
  "Solo se admite una PT/82 por circuito.":null)||t.elevation?.errors?.[0]||
  (t.intersection&&t.bridge&&!t.bridge.valid?"El cruce no tiene suficiente altura libre.":
   t.intersection&&!t.bridge?"Cruce al mismo nivel: necesita puente.":null);
 const help=issue||
  (t.valid?"Conectores y altura verificados.":
   t.types.length?"Desfase: "+Math.round(t.gap)+" mm y "+Math.round(degrees)+"°.":
   state.loose.length+" piezas sin acoplar.");
 $("stateChip").textContent=t.valid?(t.bridge?"✓ PUENTE VÁLIDO":"✓ CERRADO EXACTO"):
  issue?"⚠ REVISAR PUENTE":t.closed?"⚠ REVISAR CRUCE":"○ EXTREMOS ABIERTOS";
 $("stateDetails").textContent=t.valid?
  t.types.length+" piezas · "+(t.length/1000).toFixed(2)+" m":
  help+(t.types.length&&!t.closed?" · Hueco "+Math.round(t.gap)+" mm / "+Math.round(degrees)+"°":"");
 $("buildStatus").textContent=status;
 $("gridToggle").textContent=state.gridEnabled?"▦ 25 mm":"▦";
 $("gridToggle").setAttribute("aria-pressed",String(state.gridEnabled));
 $("buildStatus").classList.toggle("good",t.valid);
 $("buildStatus").classList.toggle("warn",!t.valid);
 setLabel("play","Jugar");
 $("play").disabled=!t.valid;
 $("restore").hidden=!state.draft;
 $("pieceCase").classList.toggle("case-open",state.caseOpen);
 $("caseInterior").hidden=!state.caseOpen;
 $("caseClosed").hidden=state.caseOpen;
 setLabel("caseToggle",state.caseOpen?"Cerrar caja":"Abrir caja");
 $("caseToggle").setAttribute("aria-expanded",String(state.caseOpen));
 const selectedLength=state.selectedGroup==="main"?state.types.length:
  state.looseSelection>=0?looseMembers(state.looseSelection).length:0;
 $("selected").textContent=state.selectedGroup==null?
  "TOCA LA PIEZA · OTRO TOQUE SELECCIONA EL TRAMO COMPLETO":
  state.selectionMode==="group"?
   "TRAMO COMPLETO · "+selectedLength+" PIEZAS · MOVER O GIRAR":
  state.looseSelection>=0?
   "SELECCIONADA: "+CATALOG[state.loose[state.looseSelection].id].name:
   "SELECCIONADA: PIEZA "+(state.selection+1)+" · "+CATALOG[state.types[state.selection]].name;
 $("remove").disabled=state.selectionMode!=="piece"||
  (state.selection<0&&state.looseSelection<0);
 $("rotate").disabled=state.looseSelection<0&&state.selection<0;
 $("rotateCCW").disabled=$("rotate").disabled;
 $("curveDirection").textContent=state.caseCurveDirection==="R"?"↷ Caja: derecha":"↶ Caja: izquierda";
 $("curveDirection").setAttribute("aria-pressed",String(state.caseCurveDirection==="L"));
 $("flip").textContent="⇄ Voltear curva";
 const selectedCurve=state.looseSelection>=0?state.loose[state.looseSelection]?.id:
  state.selectionMode==="piece"&&state.selection>=0?state.types[state.selection]:null;
 $("flip").disabled=!selectedCurve||!selectedCurve.includes("_");
 $("joinPiece").disabled=state.looseSelection<0;
 setLabel("joinPiece",state.types.length?"Encajar":"Iniciar montaje");
 $("moveGroup").disabled=!state.selectedGroup;
 $("autoClose").disabled=state.track.valid||
  (state.types.length<2&&state.loose.length<2);
 $("autoClose").textContent=state.track.valid?"✓ Cerrado":
  state.track.closed?"⚠ Revisar":"✦ Cerrar";
 $("measureGap").disabled=state.types.length===0&&state.loose.length<2;
 $("undo").disabled=!state.history.length;
 $("redo").disabled=!state.redo.length;
 const used=state.types.length+state.loose.length;
 const total=Object.values(CATALOG).reduce((sum,spec)=>sum+spec.stock,0);
 const kitOn=state.looseSelection>=0?Boolean(state.loose[state.looseSelection]?.raised):
  state.selection>=0&&state.bridgeParts.includes(state.selection);
 if(state.bridgeRangeStart!=null&&state.bridgeRangeStart>=state.types.length)
  state.bridgeRangeStart=null;
 const bridgeSelected=state.selection>=0&&state.selection<state.types.length;
 $("bridgePieceLabel").textContent=bridgeSelected?
  "Pieza "+(state.selection+1)+"/"+state.types.length:
  state.types.length?"Elige pieza":"Sin pista";
 $("bridgePrev").disabled=!state.types.length;
 $("bridgeNext").disabled=!state.types.length;
 $("bridgeRangeStart").disabled=!bridgeSelected;
 $("bridgeRangeEnd").disabled=!bridgeSelected||state.bridgeRangeStart==null;
 $("bridgeRangeClear").disabled=!bridgeSelected||!state.bridgeParts.length;
 $("bridgeRangeHint").textContent=state.bridgeRangeStart!=null?
  "Inicio "+(state.bridgeRangeStart+1)+" marcado · elige Final y elevar.":
  "◀ ▶ eligen una pieza sin tocar los cruces. Marca inicio y final.";
 $("bridgeDock").textContent=bridgeSelected?
  (kitOn?"↓ Bajar esta pieza":"↑ Elevar solo esta pieza · 65 mm"):
  "↑ Selecciona una pieza";
 $("bridgeDock").disabled=!bridgeSelected;
 $("bridgeKit").setAttribute("aria-pressed",String(Boolean(kitOn)));
 $("bridgeKit").querySelector(".bridge-kit-cta").textContent=kitOn?"− RETIRAR":"⠿ COLOCAR";
 if(kitOn&&state.looseSelection>=0){
  const members=looseMembers(state.looseSelection);
  $("selected").textContent=members.length>1?
   "ELEVACIÓN MARCADA · TRAMO MAGNÉTICO DE "+members.length+" PIEZAS":
   "ELEVACIÓN MARCADA · PIEZA AÚN SUELTA";
 }
 $("caseCount").textContent=UNLIMITED_DEVELOPMENT_STOCK?
  "∞ piezas disponibles · "+used+" en la mesa":
  (total-used)+" de "+total+" piezas en sus huecos";
 const cards=$("pieces").querySelectorAll("[data-piece]");
 for(const el of cards){
  const id=el.dataset.piece,parts=shelfParts(id),chosen=pocketPartId(id);
  const inventory=[...state.types,...state.loose.map(p=>p.id)];
  const free=Math.min(...parts.map(part=>freeStock(inventory,part)));
  const unlimited=free===Infinity;
  el.querySelector(".qty").textContent=unlimited?"∞":"×"+free;
  const badge=el.querySelector(".pocket-stock");
  if(badge)badge.textContent=CATALOG[chosen].laneChanger?"MÁX. 1":"∞";
  const shelfName=CURVE_90_PRESETS[id]?
   "Curva "+presetLabel(id)+" · conjunto de "+parts.length+" piezas":CATALOG[chosen].name;
  el.setAttribute("aria-label",shelfName+" · "+(unlimited?"disponible sin límite":free+" disponibles")+
   (state.track.closed?". Toca para colocar suelta.":". Toca para encajar en orden.")+
   " Arrastra desde el asa para colocarla libremente."+
   (CURVE_FAMILIES[id.slice(0,2)]?
    " Radio virtual SR "+CURVE_FAMILIES[id.slice(0,2)].radius+" mm, "+CURVE_FAMILIES[id.slice(0,2)].label+
    ". Familia histórica orientativa "+CURVE_FAMILIES[id.slice(0,2)].classicCode+
    "; no son dimensiones comerciales certificadas.":""));
  el.disabled=free===0;
  el.classList.toggle("empty",free===0);
  const minus=el.querySelector(".pocket-minus"),plus=el.querySelector(".pocket-plus");
  if(minus)minus.disabled=!(CURVE_90_PRESETS[id]?
   matchingPresetLoose(id).length:state.loose.some(p=>p.id===chosen))&&
   !(lastCaseAppend?.pocketId===id&&lastCaseAppend.count===state.types.length&&
     lastCaseAppend.history===state.history.length);
  if(plus)plus.disabled=free===0;
  el.classList.toggle("selected",CURVE_90_PRESETS[id]?
   (lastCaseAppend?.pocketId===id&&lastCaseAppend.count===state.types.length):
   ((state.selection>=0&&state.types[state.selection]===chosen)||
    (state.looseSelection>=0&&state.loose[state.looseSelection].id===chosen)));
 }
 renderCasePages();
 $("caseMountGuide").textContent=state.caseCategory==="bridge"?
  "TOCA PARA COLOCAR EN EL CENTRO · CONECTA CON IMANES · PUENTES POR TRAMO":
  "TOCA PARA COLOCAR EN EL CENTRO · ARRASTRA PARA ENCAJAR";
 $("tableCaption").textContent=state.dragging?"SUELTA LA PIEZA SOBRE LA MESA":
 state.selectionMode==="group"&&state.selectedGroup?"TRAMO · ARRASTRA PARA MOVER TODO":
 state.looseSelection>=0||state.selection>=0?
  "PIEZA SELECCIONADA · ↶ Y ↷ PARA GIRAR":"MESA SIN LÍMITES · DESLIZA PARA MOVER · ⌗ VER TODO";
 updateHud();
}
// Un alojamiento por geometría; izquierda/derecha comparten el mismo molde.
const pocketNames={
 S075:"RECTA 75",S0875:"RECTA 87,5",
 S175:"RECTA 175",S350:"RECTA 350",S600:"RECTA 600",
 START350:"SALIDA / META",X350:"CAMBIO PT/82",
 R1_225R:"R1 · 22,5°",R1_45R:"R1 · 45°",R1_90R:"R1 · 90°",
 R2_225R:"R2 · 22,5°",R2_45R:"R2 · 45°",
 R3_225R:"R3 · 22,5°",R4_225R:"R4 · 22,5°",
 R2_90R:"R2 · 90°",R3_90R:"R3 · 90°",R4_90R:"R4 · 90°"
};
// Agrupar todos los ángulos del MISMO radio. El atajo de 90° ya no
// se pierde al final del scroll táctil; va junto a sus módulos.
const pocketIds=[
 ...Object.keys(CATALOG).filter(id=>!CATALOG[id].legacy&&(!id.includes("_")||id.endsWith("R"))),
 ...Object.keys(CURVE_90_PRESETS)
].sort((a,b)=>{
 const ra=CURVE_FAMILIES[a.slice(0,2)],rb=CURVE_FAMILIES[b.slice(0,2)];
 if(!ra&&!rb)return 0;
 if(!ra)return -1;if(!rb)return 1;
 const byRadius=ra.radius-rb.radius;
 if(byRadius)return byRadius;
 const degrees=id=>id.includes("_225")?22.5:id.includes("_45")?45:90;
 return degrees(a)-degrees(b);
});
// Fuente de color común entre la pista de la mesa y las miniaturas de la caja.
const PIECE_LOOK=Object.freeze({
 shadow:"#0c1518",outer:"#65747a",rim:"#1e282d",deck:"#343e44",
 inner:"#283139",groove:"#101418",metalA:"#94a5ac",metalB:"#a2b4bc",
 guide:"#080c0e",edge:"#65787e",seam:"#0c1217"
});
// Guías cruzadas sin romper los conectores de una recta de 350 mm.
function switchEase(t){return t*t*(3-2*t);}
function xSwitchPoints(part,offset,count=32){
 return Array.from({length:count+1},(_,i)=>{
  const t=i/count,p=positionOnPiece(part.start,part.id,t);
  const side=offset*(1-2*switchEase(t));
  return{x:p.x-Math.sin(p.h)*side,y:p.y+Math.cos(p.h)*side,h:p.h};
 });
}
function paintX350(ctx,track){
 const index=track.laneChangerIndex;if(index<0)return;
 const part=track.parts[index];if(!part)return;
 ctx.save();
 // Borrar solo los carriles rectos de esta pieza. El asfalto y los
 // cantos exteriores siguen siendo una superficie continua.
 strokePath(ctx,part.points,PIECE_LOOK.inner,TRACK_WIDTH-31);
 for(const off of [-LANE_OFFSET,LANE_OFFSET]){
  strokePath(ctx,xSwitchPoints(part,off),PIECE_LOOK.groove,11);
  strokePath(ctx,xSwitchPoints(part,off-7.6),PIECE_LOOK.metalA,2.2);
  strokePath(ctx,xSwitchPoints(part,off+7.6),PIECE_LOOK.metalB,2.2);
  strokePath(ctx,xSwitchPoints(part,off),PIECE_LOOK.guide,5);
 }
 ctx.restore();
}
function foamSlotSVG(id){
 const preset=CURVE_90_PRESETS[id],spec=CATALOG[id]||CATALOG[preset?.[0]],n=spec.length?2:28;
 const pts=Array.from({length:n+1},(_,i)=>{
  if(!preset)return positionOnPiece({x:0,y:0,h:0},id,i/n);
  const r=spec.radius,h=Math.PI/2*i/n;
  return{x:r*Math.sin(h),y:r*(1-Math.cos(h)),h};
 });
 // El marco incluye el ancho REAL del módulo. Las rectas cortas dejan de
 // aparecer como píldoras redondeadas: llevan cantos perpendiculares.
 const half=(TRACK_WIDTH+24)/2;
 const corners=pts.flatMap(p=>[-half,half].map(d=>({
  x:p.x-Math.sin(p.h)*d,y:p.y+Math.cos(p.h)*d
 })));
 const minX=Math.min(...corners.map(p=>p.x)),maxX=Math.max(...corners.map(p=>p.x));
 const minY=Math.min(...corners.map(p=>p.y)),maxY=Math.max(...corners.map(p=>p.y));
 const scale=Math.min(107/Math.max(1,maxX-minX),68/Math.max(1,maxY-minY));
 const tx=(120-(maxX-minX)*scale)/2,ty=(80-(maxY-minY)*scale)/2;
 const xy=p=>[(tx+(p.x-minX)*scale).toFixed(2),(ty+(p.y-minY)*scale).toFixed(2)];
 const path=arr=>arr.map((p,i)=>{const [x,y]=xy(p);return(i?"L":"M")+x+" "+y;}).join(" ");
 const translated=off=>pts.map(p=>({x:p.x-Math.sin(p.h)*off,y:p.y+Math.cos(p.h)*off}));
 const main=path(pts),width=n=>(n*scale).toFixed(2);
 const stroke=(klass,shape,size,color,other="")=>
  '<path class="'+klass+'" d="'+shape+'" fill="none" stroke="'+color+'" stroke-width="'+width(size)+'" stroke-linecap="butt" stroke-linejoin="round" '+other+'/>';
 const layer=(klass,size,color)=>stroke(klass,main,size,color);
 const line=(off,klass,size,color)=>stroke(klass,
  path(spec.laneChanger?xSwitchPoints({start:{x:0,y:0,h:0},id},off):translated(off)),size,color);
 const seam=p=>stroke("mini-slot-seam",path([-TRACK_WIDTH/2,TRACK_WIDTH/2].map(off=>({
  x:p.x-Math.sin(p.h)*off,y:p.y+Math.cos(p.h)*off
 }))),3,PIECE_LOOK.seam);
 return '<svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid meet" focusable="false" aria-hidden="true">'+
  '<g class="foam-cutout-shape">'+
   layer("foam-cutout-shadow",TRACK_WIDTH+23,"#e1e3df")+
   layer("foam-cutout",TRACK_WIDTH+18,"#56615e")+
  '</g><g class="mini-slot-piece">'+
   stroke("mini-slot-stack",main,TRACK_WIDTH+19,PIECE_LOOK.shadow,'transform="translate(0 2)"')+
   layer("mini-slot-outer",TRACK_WIDTH+12,PIECE_LOOK.outer)+
   layer("mini-slot-rim",TRACK_WIDTH+5,PIECE_LOOK.rim)+
   layer("mini-slot-deck",TRACK_WIDTH-4,PIECE_LOOK.deck)+
   layer("mini-slot-inner",TRACK_WIDTH-31,PIECE_LOOK.inner)+
   line(-LANE_OFFSET,"mini-slot-groove",11,PIECE_LOOK.groove)+
   line(LANE_OFFSET,"mini-slot-groove",11,PIECE_LOOK.groove)+
   line(-LANE_OFFSET-7.6,"mini-slot-rail",2.2,PIECE_LOOK.metalA)+
   line(-LANE_OFFSET+7.6,"mini-slot-rail",2.2,PIECE_LOOK.metalB)+
   line(LANE_OFFSET-7.6,"mini-slot-rail",2.2,PIECE_LOOK.metalA)+
   line(LANE_OFFSET+7.6,"mini-slot-rail",2.2,PIECE_LOOK.metalB)+
   line(-LANE_OFFSET,"mini-slot-guide",5,PIECE_LOOK.guide)+
   line(LANE_OFFSET,"mini-slot-guide",5,PIECE_LOOK.guide)+
   line(-72,"mini-slot-edge",2.5,PIECE_LOOK.edge)+
   line(72,"mini-slot-edge",2.5,PIECE_LOOK.edge)+
   seam(pts[0])+seam(pts[pts.length-1])+
  '</g></svg>';
}
function palette(){
 const list=$("pieces");
 for(const id of pocketIds){
  const spec=CATALOG[id];
  const pocket=document.createElement("div");
  pocket.className="foam-pocket";pocket.dataset.piece=id;
  pocket.setAttribute("role","button");
  pocket.tabIndex=0;
  pocket.dataset.kind=spec.group;
  const family=CURVE_FAMILIES[id.slice(0,2)];
  const familyHint=family?family.radius+" mm · "+family.label.toUpperCase():spec.code;
  pocket.setAttribute("aria-label",spec.name+" · "+familyHint);
  if(family)pocket.setAttribute("title",
   "Radio SR virtual "+family.radius+" mm · "+family.label+
   " · referencia histórica orientativa "+family.classicCode+
   " (no reproduce medidas comerciales)");
  pocket.innerHTML='<span class="qty">×0</span>'+
    '<span class="foam-well">'+foamSlotSVG(id)+'</span>'+
     '<span class="foam-drag-grip" data-drag-handle="true" aria-hidden="true">⠿</span>'+
    '<span class="pocket-caption"><strong>'+pocketNames[id]+'</strong><small>'+familyHint+'</small></span>'+
    '<div class="pocket-qty-controls">'+
     '<button type="button" class="pocket-minus" aria-label="Devolver una pieza suelta '+pocketNames[id]+'">−</button>'+
     '<span class="pocket-stock" aria-label="Inventario ilimitado">∞</span>'+
     '<button type="button" class="pocket-plus" aria-label="Acoplar una pieza '+pocketNames[id]+' al final del circuito">+</button>'+
    '</div>';
  const grip=pocket.querySelector(".foam-drag-grip");
  const minus=pocket.querySelector(".pocket-minus");
  const plus=pocket.querySelector(".pocket-plus");
  if(minus)minus.addEventListener("click",e=>{e.stopPropagation();removeLooseFromCase(id);});
  if(plus)plus.addEventListener("click",e=>{e.stopPropagation();inventoryAction(id);});
  let suppressNextClick=false,tapPointer=null;
  // El maletín se desplaza sobre el cuerpo del hueco y se arrastra desde
  // el asa: la captura táctil vive en el ASA, nunca en el botón desplazable.
  pocket.addEventListener("click",e=>{
   if(e.target===grip||grip.contains?.(e.target)||e.target?.closest?.(".pocket-qty-controls"))return;
   // Safari puede generar click tras cancelar un scroll. Ese click nunca
   // debe colocar una pieza, aunque detail venga a cero.
   if(suppressNextClick){suppressNextClick=false;return;}
   inventoryAction(id);
  });
  pocket.addEventListener("keydown",e=>{
   if(e.key==="Enter"||e.key===" "){
    e.preventDefault?.();inventoryAction(id);
   }
  });
  pocket.addEventListener("pointerdown",e=>{
   if(e.target===grip||e.target?.closest?.(".pocket-qty-controls"))return;
   tapPointer=e.pointerType==="mouse"?null:
    {pointerId:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
   suppressNextClick=false;
  });
  pocket.addEventListener("pointermove",e=>{
   if(tapPointer?.pointerId===e.pointerId&&
      Math.hypot(e.clientX-tapPointer.x,e.clientY-tapPointer.y)>9)tapPointer.moved=true;
  });
  pocket.addEventListener("pointerup",e=>{
   if(e.target?.closest?.(".pocket-qty-controls")||tapPointer?.pointerId!==e.pointerId)return;
   const moved=tapPointer.moved||
    Math.hypot(e.clientX-tapPointer.x,e.clientY-tapPointer.y)>9;
   tapPointer=null;suppressNextClick=true;
   if(!moved)inventoryAction(id);
  });
  pocket.addEventListener("pointercancel",e=>{
   if(tapPointer?.pointerId===e.pointerId){tapPointer=null;suppressNextClick=true;}
  });
  grip.addEventListener("click",e=>{e.preventDefault?.();e.stopPropagation?.();});
  grip.addEventListener("pointerdown",e=>{
   e.preventDefault?.();e.stopPropagation?.();
   if(state.dragging||shelfParts(id).some(part=>
      freeStock([...state.types,...state.loose.map(p=>p.id)],part)<1))return;
   tapPointer=null;suppressNextClick=true;
   state.dragging={id,pointerId:e.pointerId,x:e.clientX,y:e.clientY,
    originX:e.clientX,originY:e.clientY,active:false};
   try{grip.setPointerCapture(e.pointerId);}catch(err){}
   state.viewDirty=true;
  });
  grip.addEventListener("pointermove",e=>{
   const d=state.dragging;
   if(!d||d.id!==id||d.pointerId!==e.pointerId)return;
   e.preventDefault?.();e.stopPropagation?.();
   d.x=e.clientX;d.y=e.clientY;
   if(Math.hypot(d.x-d.originX,d.y-d.originY)>9)d.active=true;
   state.viewDirty=true;
  });
  grip.addEventListener("pointerup",e=>{
   const d=state.dragging;
   if(!d||d.id!==id||d.pointerId!==e.pointerId)return;
   e.preventDefault?.();e.stopPropagation?.();
   state.dragging=null;state.viewDirty=true;suppressNextClick=true;
   if(!d.active)return;
   const rect=editCanvas.getBoundingClientRect();
   if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom){
    toast("Suelta la pieza en el tapete. No se ha gastado ninguna.");return;
   }
   const pt=screenToWorld(e);
   // Cualquier coordenada del área visible admite una pieza.
   if(CURVE_90_PRESETS[id]){
    if(!placeCurvePresetLoose(id,pt.x,pt.y))return;
   }else{
    if(!addLoose(pocketPartId(id),pt.x,pt.y))return;
   }
   snapLoose(state.loose.length-1,{history:false});
  });
  grip.addEventListener("pointercancel",e=>{
   if(state.dragging?.id===id&&state.dragging.pointerId===e.pointerId){
    state.dragging=null;state.viewDirty=true;
   }
  });
  list.appendChild(pocket);
 }
}
function roundRect(ctx,x,y,w,h,r){
 r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);
 ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
// Canvas2D tiene que reconstruir los segmentos al trazar cada fotograma.
// Path2D permite conservar el contorno estático, también a zoom 5×.
const strokeGeometryCache=new WeakMap();
function strokePath(ctx,points,color,width){
 if(!points.length)return;
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="butt";ctx.lineJoin="round";
 if(typeof Path2D==="function"){
  let path=strokeGeometryCache.get(points);
  if(!path){
   path=new Path2D();path.moveTo(points[0].x,points[0].y);
   for(let i=1;i<points.length;i++)path.lineTo(points[i].x,points[i].y);
   strokeGeometryCache.set(points,path);
  }
  ctx.stroke(path);
 }else{
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
  ctx.stroke();
 }
}
function translated(points,off){return points.map(p=>({x:p.x-Math.sin(p.h)*off,y:p.y+Math.cos(p.h)*off}));}
// La pista montada es estática durante la carrera. Reutilizar los puntos
// desplazados de los raíles evita miles de objetos y pausas de GC a 5×.
const trackOffsetCache=new WeakMap();
function cachedTrackOffset(track,offset){
 let entry=trackOffsetCache.get(track);
 if(!entry||entry.points!==track.points){
  entry={points:track.points,offsets:new Map()};
  trackOffsetCache.set(track,entry);
 }
 if(!entry.offsets.has(offset))
  entry.offsets.set(offset,translated(track.points,offset));
 return entry.offsets.get(offset);
}
// Un Path2D rojo y otro blanco por circuito. Se calculan al cambiar
// las piezas, no a cada fotograma de la carrera ni al mover la cámara.
const trackKerbCache=new WeakMap();
function compileKerbs(geometry){
 const compiled={};
 for(const color of ["red","white"]){
  const polygons=geometry[color]||[];
  if(typeof Path2D==="function"){
   const path=new Path2D();
   for(const stripe of polygons){
    const [first,...rest]=stripe.points;
    path.moveTo(first.x,first.y);
    for(const point of rest)path.lineTo(point.x,point.y);
    path.closePath();
   }
   compiled[color]=path;
  }else compiled[color]=polygons;
 }
 return compiled;
}
function paintKerbPaths(ctx,paths){
 ctx.save();ctx.globalAlpha=1;ctx.shadowBlur=0;
 ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
 for(const color of ["red","white"]){
  ctx.fillStyle=KERB_STYLE[color];
  const entry=paths[color];
  if(typeof Path2D==="function"){ctx.fill(entry);continue;}
  for(const stripe of entry){
   const [first,...rest]=stripe.points;
   ctx.beginPath();ctx.moveTo(first.x,first.y);
   for(const point of rest)ctx.lineTo(point.x,point.y);
   ctx.closePath();ctx.fill();
  }
 }
 ctx.restore();
}
function paintTrackKerbs(ctx,track,layer="all"){
 // Los harnesses de física cargan app.mjs sin imports ni renderer real.
 if(typeof buildCurveKerbs!=="function")return;
 let cached=trackKerbCache.get(track);
 if(!cached){
  const geometry=buildCurveKerbs(track.parts);
  const elevated=new Set((track.elevation?.profiles||[])
   .flatMap((profile,i)=>profile?[i]:[]));
  cached={all:compileKerbs(geometry),
   upper:compileKerbs(selectCurveKerbs(geometry,elevated))};
  trackKerbCache.set(track,cached);
 }
 paintKerbPaths(ctx,cached[layer]);
}
function paintLooseKerbs(ctx,parts){
 if(typeof buildCurveKerbs!=="function")return;
 paintKerbPaths(ctx,compileKerbs(buildCurveKerbs(parts)));
}
// Dos vistas de escapatorias por circuito (horario/antihorario).
// Se compilan una sola vez: los fotogramas solo rellenan trazados estáticos.
const runoffGeometryCache=new WeakMap();
function paintSmartRunoffs(ctx,track,direction){
 // Los harnesses de física cargan app.mjs sin importar los gráficos.
 if(typeof buildSmartRunoffs!=="function")return;
 const dir=direction===-1?-1:1;
 const board=state.mode==="race"?state.workBoard:null;
 const boardKey=board?[board.left,board.top,board.right,board.bottom].join(":"):"workshop";
 let cached=runoffGeometryCache.get(track);
 if(!cached||cached.boardKey!==boardKey){
  cached={boardKey,runs:new Map()};runoffGeometryCache.set(track,cached);
 }
 if(!cached.runs.has(dir)){
  const zones=buildSmartRunoffs(track,dir,board);
  const fill=typeof Path2D==="function"?new Path2D():null;
  const lip=typeof Path2D==="function"?new Path2D():null;
  const rim=typeof Path2D==="function"?new Path2D():null;
  if(fill&&lip&&rim){
   function appendPolygon(path,points){
    const [a,...rest]=points;path.moveTo(a.x,a.y);
    for(const p of rest)path.lineTo(p.x,p.y);
    path.closePath();
   }
   for(const zone of zones){
    appendPolygon(fill,zone.points);
    appendPolygon(lip,zone.lipPoints);
    const [edge,...more]=zone.outerEdge;
    rim.moveTo(edge.x,edge.y);
    for(const p of more)rim.lineTo(p.x,p.y);
   }
  }
  cached.runs.set(dir,{zones,fill,lip,rim});
 }
 const {zones,fill,lip,rim}=cached.runs.get(dir);
 if(!zones.length)return;
 ctx.save();
 ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
 ctx.globalAlpha=1;ctx.fillStyle=RUNOFF_STYLE.color;
 if(fill){
  ctx.fill(fill);
  // Borde interior con asfalto verde algo más claro: funde visualmente
  // el piano con la escapatoria sin crear un contorno pegajoso.
  ctx.globalAlpha=.48;ctx.fillStyle=RUNOFF_STYLE.lip;
  ctx.fill(lip);
  // El exterior apenas se marca, sin halo ni sombra de pegatina.
  ctx.globalAlpha=.23;ctx.strokeStyle=RUNOFF_STYLE.border;
  ctx.lineWidth=1.7;ctx.lineCap="round";ctx.lineJoin="round";
  ctx.stroke(rim);
 }else{
  function fillPolygon(points,color,alpha){
   const [a,...rest]=points;
   ctx.beginPath();ctx.moveTo(a.x,a.y);
   for(const p of rest)ctx.lineTo(p.x,p.y);
   ctx.closePath();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.fill();
  }
  for(const zone of zones){
   fillPolygon(zone.points,RUNOFF_STYLE.color,1);
   fillPolygon(zone.lipPoints,RUNOFF_STYLE.lip,.48);
   ctx.beginPath();
   const [a,...rest]=zone.outerEdge;
   ctx.moveTo(a.x,a.y);
   for(const p of rest)ctx.lineTo(p.x,p.y);
   ctx.globalAlpha=.23;ctx.strokeStyle=RUNOFF_STYLE.border;
   ctx.lineWidth=1.7;ctx.lineCap="round";ctx.lineJoin="round";
   ctx.stroke();
  }
 }
 ctx.restore();
}
// Las coordenadas del tapete virtual no tienen bordes físicos.
function visibleWorldBounds(v,padding=0){
 const pts=[[0,0],[v.w,0],[0,v.h],[v.w,v.h]].map(([x,y])=>worldFromPointer(v,x,y));
 const left=Math.min(...pts.map(p=>p.x))-padding,right=Math.max(...pts.map(p=>p.x))+padding;
 const top=Math.min(...pts.map(p=>p.y))-padding,bottom=Math.max(...pts.map(p=>p.y))+padding;
 return{left,right,top,bottom,width:right-left,height:bottom-top};
}
function paintInfiniteWorkspace(ctx,v){
 const b=visibleWorldBounds(v,100/Math.max(v.scale,.000001));
 const theme=currentTableTheme();
 const gradient=ctx.createLinearGradient(b.left,b.top,b.right,b.bottom);
 gradient.addColorStop(0,theme.surface[0]);gradient.addColorStop(.55,theme.surface[1]);
 gradient.addColorStop(1,theme.surface[2]);
 ctx.fillStyle=gradient;ctx.fillRect(b.left,b.top,b.width,b.height);
}
function paintGrid(ctx,v,mode="build"){
 if(!state.gridEnabled)return;
 const r=visibleWorldBounds(v,30/Math.max(v.scale,.000001));
 const b=mode==="build"?r:{
  left:Math.max(r.left,state.workBoard.left+65),
  top:Math.max(r.top,state.workBoard.top+65),
  right:Math.min(r.right,state.workBoard.right-65),
  bottom:Math.min(r.bottom,state.workBoard.bottom-65)};
 if(b.right<=b.left||b.bottom<=b.top)return;
 // Resolución adaptable al zoom: máximo unas decenas de líneas por eje.
 const spacing=GRID_MM*2**Math.ceil(Math.log2(Math.max(1,12/Math.max(v.scale*GRID_MM,.000001))));
 ctx.save();ctx.beginPath();ctx.rect(b.left,b.top,b.right-b.left,b.bottom-b.top);ctx.clip();
 for(let x=Math.ceil(b.left/spacing)*spacing;x<=b.right;x+=spacing){
  const major=Math.abs(x/100-Math.round(x/100))<1e-8;
  ctx.beginPath();ctx.moveTo(x,b.top);ctx.lineTo(x,b.bottom);
  const theme=currentTableTheme();
  ctx.strokeStyle=theme.grid;ctx.globalAlpha=major?theme.majorAlpha:theme.minorAlpha;
  ctx.lineWidth=major?2.2:1;ctx.stroke();
 }
 for(let y=Math.ceil(b.top/spacing)*spacing;y<=b.bottom;y+=spacing){
  const major=Math.abs(y/100-Math.round(y/100))<1e-8;
  ctx.beginPath();ctx.moveTo(b.left,y);ctx.lineTo(b.right,y);
  const theme=currentTableTheme();
  ctx.strokeStyle=theme.grid;ctx.globalAlpha=major?theme.majorAlpha:theme.minorAlpha;
  ctx.lineWidth=major?2.2:1;ctx.stroke();
 }
 ctx.restore();
}
// El dibujo de madera/fieltro incluye 1000 puntitos decorativos y sombras.
// Es inmutable: generar la textura UNA vez evita hacerlo cada fotograma.
let tableArtworkTexture=null,tableArtworkSize="";
function drawTableArtwork(ctx,b){
 const theme=currentTableTheme();
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
 felt.addColorStop(0,theme.felt[0]);felt.addColorStop(.55,theme.felt[1]);
 felt.addColorStop(1,theme.felt[2]);
 roundRect(ctx,62,62,TABLE.width-124,TABLE.height-124,38);ctx.fillStyle=felt;ctx.fill();
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 ctx.save();roundRect(ctx,62,62,TABLE.width-124,TABLE.height-124,38);ctx.clip();
 ctx.strokeStyle=theme.grid;ctx.globalAlpha=.095;ctx.lineWidth=1.4;
 for(let x=62;x<TABLE.width-62;x+=100){ctx.beginPath();ctx.moveTo(x,62);ctx.lineTo(x,TABLE.height-62);ctx.stroke();}
 for(let y=62;y<TABLE.height-62;y+=100){ctx.beginPath();ctx.moveTo(62,y);ctx.lineTo(TABLE.width-62,y);ctx.stroke();}
 ctx.globalAlpha=.055;for(let i=0;i<1000;i++){
  const x=70+((i*7919)%2060),y=72+((i*5171)%1295);ctx.fillStyle=i%2?theme.textureLight:theme.textureDark;ctx.fillRect(x,y,2.4,2.4);
 }ctx.globalAlpha=1;ctx.restore();
 ctx.font="bold 40px system-ui";ctx.fillStyle=theme.writing;ctx.globalAlpha=theme.writingAlpha;ctx.textAlign="center";
 ctx.fillText("SLOTRACE  •  CRAFT RACE STUDIO",TABLE.width/2,166);ctx.globalAlpha=1;
 ctx.font="24px system-ui";ctx.fillStyle=theme.writing;ctx.globalAlpha=theme.writingAlpha;ctx.fillText("MESA DE MONTAJE  ·  "+Math.round(b.width/10)+" × "+Math.round(b.height/10)+" CM",TABLE.width/2,TABLE.height-119);ctx.globalAlpha=1;
 for(const corner of [[76,76],[TABLE.width-76,76],[76,TABLE.height-76],[TABLE.width-76,TABLE.height-76]]){
  ctx.fillStyle="#503725";ctx.beginPath();ctx.arc(corner[0],corner[1],17,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#d4b57b";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(corner[0]-8,corner[1]);ctx.lineTo(corner[0]+8,corner[1]);ctx.stroke();
 }
}
function setTableTheme(theme){
 if(!Object.hasOwn(TABLE_THEMES,theme)||state.tableTheme===theme)return;
 state.tableTheme=theme;tableArtworkTexture=null;tableArtworkSize="";
 state.viewDirty=true;save();updateUI();
 toast("Tapete: "+TABLE_THEMES[theme].label);
}
function paintTable(ctx,v,mode){
 if(mode==="build"){paintInfiniteWorkspace(ctx,v);return;}
 const b=state.workBoard;
 ctx.save();
 ctx.translate(b.left,b.top);
 ctx.scale(b.width/TABLE.width,b.height/TABLE.height);
 // El rótulo de medidas también debe cambiar al abrir otro circuito.
 const key=Math.round(b.width)+"×"+Math.round(b.height)+"·"+state.tableTheme;
 if(key!==tableArtworkSize){tableArtworkTexture=null;tableArtworkSize=key;}
 if(!tableArtworkTexture&&typeof document.createElement==="function"){
  try{
   const canvas=document.createElement("canvas");
   const textureScale=.75;
   canvas.width=Math.ceil(TABLE.width*textureScale);
   canvas.height=Math.ceil(TABLE.height*textureScale);
   const paint=canvas.getContext?.("2d",{alpha:true});
   if(paint){
    paint.setTransform(textureScale,0,0,textureScale,0,0);
    drawTableArtwork(paint,b);
    tableArtworkTexture=canvas;
   }
  }catch(error){tableArtworkTexture=null;}
 }
 if(tableArtworkTexture)ctx.drawImage(tableArtworkTexture,0,0,TABLE.width,TABLE.height);
 else drawTableArtwork(ctx,b);
 ctx.restore();
}
function paintSeam(ctx,p){
 const h=p.h,x=p.x,y=p.y,nx=-Math.sin(h),ny=Math.cos(h);
 ctx.save();ctx.globalAlpha=.38;ctx.lineWidth=1.7;ctx.strokeStyle="#0c1217";
 ctx.beginPath();ctx.moveTo(x-nx*75,y-ny*75);ctx.lineTo(x+nx*75,y+ny*75);ctx.stroke();
 for(const side of [-67,67]){
  const px=x+nx*side,py=y+ny*side;
  ctx.fillStyle="#8c9ca0";ctx.beginPath();ctx.arc(px,py,2.7,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#1c2930";ctx.beginPath();ctx.arc(px,py,1.15,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
// Apoyos bajo cualquier geometría, también arcos. La altura
// procede del perfil longitudinal, no del tipo de pieza.
function paintSupportKit(ctx,part,track=null){
 const spec=CATALOG[part.id];if(!spec)return;
 const samples=spec.length?[.21,.5,.79]:[.12,.36,.64,.88];
 for(const t of samples){
  const z=track?elevationAt(track,part.index,t):65;
  if(z<12)continue;
  const p=positionOnPiece(part.start,part.id,t),level=z/65;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.h);
  ctx.shadowColor="#000a";ctx.shadowBlur=14+level*9;
  ctx.shadowOffsetY=7+level*7;
  ctx.fillStyle="#384e55";ctx.fillRect(-11,-97,22,194);
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  for(const side of [-1,1]){
   const y=side*88;
   ctx.fillStyle="#8ba3aa";ctx.fillRect(-14,y-11,28,22);
   ctx.fillStyle="#c4d7d6";ctx.fillRect(-10,y-8,20,6);
   ctx.fillStyle="#253a40";ctx.fillRect(-17,y+side*9,34,6);
  }
  ctx.restore();
 }
}
// Las marcas de transición se pintan sobre la recta que sube o baja,
// no sobre las curvas que mantienen la plataforma horizontal.
function paintBridgeRampProfile(ctx,part,track=null){
 const profile=track?.elevation?.profiles?.[part.index];
 const spec=CATALOG[part.id];if(!spec)return;
 let spans=[];
 if(!profile){
  if(!track&&spec.length>=350)spans=[[.02,.23],[.77,.98]];
 }else if(profile.mode==="up"||profile.mode==="down"){
  // Las guías de pendiente son informativas: no deben terminar justo
  // junto a una costura suelo/rampa ni parecer raíles truncados.
  spans=[[.08,.92]];
 }
 else{
  if(profile.up!=null)spans.push([.02,profile.up]);
  if(profile.down!=null)spans.push([1-profile.down,.98]);
 }
 if(!spans.length)return;
 ctx.save();
 for(const [begin,end] of spans){
  const points=Array.from({length:9},(_,i)=>
   positionOnPiece(part.start,part.id,begin+(end-begin)*i/8));
  ctx.globalAlpha=.28;
  for(const off of [-75,75])strokePath(ctx,translated(points,off),"#b6ccd1",3);
  ctx.globalAlpha=.13;
  for(const off of [-69,69])strokePath(ctx,translated(points,off),"#f2f7e7",2);
 }
 ctx.restore();
}
function paintBridgePillars(ctx,track){
 if(!track.bridge)return;
 const section=track.parts[track.bridge.overParts[0]];
 for(const fraction of [.2,.8]){
  const p=section.points[Math.round((section.points.length-1)*fraction)];
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.h);
  ctx.shadowColor="#000a";ctx.shadowBlur=25;ctx.shadowOffsetY=12;
  ctx.fillStyle="#5d6f76";ctx.fillRect(-15,-106,30,212);
  ctx.fillStyle="#b9c8cb";ctx.fillRect(-7,-99,14,198);
  ctx.restore();
 }
}
// Dibujo continuo por todo el circuito: elimina costuras gruesas y bordes
// superpuestos donde una recta enlaza con otra o entra en una curva.
function paintContinuousTrack(ctx,track,editing){
 if(!track.parts.length)return;
 const path=track.points;
 ctx.save();ctx.shadowColor="#0009";ctx.shadowBlur=15;ctx.shadowOffsetY=10;
 strokePath(ctx,path,PIECE_LOOK.shadow,TRACK_WIDTH+19);ctx.restore();
 strokePath(ctx,path,PIECE_LOOK.outer,TRACK_WIDTH+12);
 strokePath(ctx,path,PIECE_LOOK.rim,TRACK_WIDTH+5);
 strokePath(ctx,path,PIECE_LOOK.deck,TRACK_WIDTH-4);
 strokePath(ctx,path,PIECE_LOOK.inner,TRACK_WIDTH-31);
 for(const laneOffset of [-LANE_OFFSET,LANE_OFFSET]){
  const line=cachedTrackOffset(track,laneOffset);
  strokePath(ctx,line,PIECE_LOOK.groove,11);
  strokePath(ctx,cachedTrackOffset(track,laneOffset-7.6),PIECE_LOOK.metalA,2.2);
  strokePath(ctx,cachedTrackOffset(track,laneOffset+7.6),PIECE_LOOK.metalB,2.2);
  strokePath(ctx,line,PIECE_LOOK.guide,5);
 }
 for(const edge of [-72,72])strokePath(ctx,cachedTrackOffset(track,edge),PIECE_LOOK.edge,2.5);
 paintTrackKerbs(ctx,track);
 paintX350(ctx,track);
 // En el taller conservamos las juntas ordinarias de módulos.
 // En las fronteras suelo/rampa, en cambio, la pista y los dos carriles
 // son una sola superficie: dibujar paintSeam allí crea una raya negra
 // transversal y remaches falsos que aparentan cortes y fugas de nivel.
 // El conector se determina geométricamente; también sirve si el cierre
 // de un circuito queda entre el último módulo y el índice cero.
 if(editing){
  const transitionStarts=track.bridge?
   new Set(elevationJoins(track).map(join=>join.to)):null;
  for(const part of track.parts){
   if(!transitionStarts?.has(part.index))paintSeam(ctx,part.start);
  }
 }
 if(editing&&state.selectedGroup==="main"&&state.selection>=0){
  ctx.save();ctx.globalAlpha=state.selectionMode==="group"?.20:.42;
  strokePath(ctx,state.selectionMode==="group"?path:track.parts[state.selection].points,
   state.selectionMode==="group"?"#74ffe0":"#ffd070",TRACK_WIDTH+17);
  ctx.restore();
 }
 if(track.closed){
  const p=track.parts[0].start;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.h);
  for(let k=-2;k<=2;k++)for(let j=0;j<8;j++){
   ctx.fillStyle=(k+j)%2?"#fff6e8":"#171a1c";
   ctx.fillRect(k*7,-TRACK_WIDTH/2+j*TRACK_WIDTH/8,7,TRACK_WIDTH/8);
  }
  ctx.restore();
 }else if(editing){
  for(const [p,color] of [[track.ends.begin,"#67eff1"],[track.ends.end,"#ffc66b"]]){
   ctx.save();ctx.shadowBlur=15;ctx.shadowColor=color;ctx.fillStyle=color;
   ctx.beginPath();ctx.arc(p.x,p.y,14,0,Math.PI*2);ctx.fill();ctx.restore();
  }
 }
}
// Repintamos localmente cada cruce superior usando la tangente de su
// pieza, incluso si es una curva. Los coches inferiores quedan tapados.
// Puente compacto: los tramos elevados se repintan DESPUÉS del coche de
// abajo. Una sola banda por tramo (también alrededor de la meta) evita
// costuras internas, huecos en curvas y máscaras demasiado cortas.
const elevatedDeckCache=new WeakMap();
function elevatedDeckRuns(track){
 const cached=elevatedDeckCache.get(track);if(cached)return cached;
 const profiles=track.elevation?.profiles||[];
 const active=track.parts.map((part,i)=>Boolean(profiles[i]));
 const runs=[];let run=[];
 for(let i=0;i<active.length;i++){
  if(active[i])run.push(i);
  else if(run.length){runs.push(run);run=[];}
 }
 if(run.length)runs.push(run);
 // Un circuito cerrado puede cruzar su índice cero dentro del puente:
 // juntar última y primera sección sin dibujar una junta ficticia.
 if(track.closed&&runs.length>1&&active[0]&&active.at(-1)){
  runs[0]=[...runs.at(-1),...runs[0]];
  runs.pop();
 }
 const deck=runs.map(indices=>{
  const points=indices.flatMap((index,i)=>track.parts[index].points.slice(i?1:0));
  return{indices,points,offsets:Object.fromEntries(
   [-LANE_OFFSET,LANE_OFFSET,-LANE_OFFSET-7.6,-LANE_OFFSET+7.6,
    LANE_OFFSET-7.6,LANE_OFFSET+7.6,-72,72]
    .map(off=>[off,translated(points,off)]))};
 }).filter(run=>run.points.length>1);
 elevatedDeckCache.set(track,deck);
 return deck;
}
// Mismo asfalto y carriles en toda capa: sin costuras ni doble sombra.
function paintOpaqueRibbon(ctx,points,offsets=null){
 ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
 ctx.shadowColor="transparent";ctx.shadowBlur=0;
 ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
 ctx.lineCap="butt";ctx.lineJoin="round";
 strokePath(ctx,points,PIECE_LOOK.outer,TRACK_WIDTH+14);
 strokePath(ctx,points,PIECE_LOOK.rim,TRACK_WIDTH+5);
 strokePath(ctx,points,PIECE_LOOK.deck,TRACK_WIDTH-4);
 strokePath(ctx,points,PIECE_LOOK.inner,TRACK_WIDTH-31);
 const shifted=off=>offsets?.[off]||translated(points,off);
 for(const off of [-LANE_OFFSET,LANE_OFFSET]){
  strokePath(ctx,shifted(off),PIECE_LOOK.groove,11);
  strokePath(ctx,shifted(off-7.6),PIECE_LOOK.metalA,2.2);
  strokePath(ctx,shifted(off+7.6),PIECE_LOOK.metalB,2.2);
  strokePath(ctx,shifted(off),PIECE_LOOK.guide,5);
 }
 for(const edge of [-72,72])strokePath(ctx,shifted(edge),PIECE_LOOK.edge,2.5);
 ctx.restore();
}
// Arquitectura de dos pisos: la pasada de suelo EXCLUYE únicamente las
// piezas cuya altura pertenece a una plataforma/rampa. No se perforan
// rectángulos de recorte: cada pieza sigue dibujada exactamente UNA vez.
const groundDeckCache=new WeakMap();
function groundDeckRuns(track){
 const cached=groundDeckCache.get(track);if(cached)return cached;
 const profiles=track.elevation?.profiles||[];
 const active=track.parts.map((_,i)=>!profiles[i]);
 const chunks=[];let chunk=[];
 for(let i=0;i<active.length;i++){
  if(active[i])chunk.push(i);
  else if(chunk.length){chunks.push(chunk);chunk=[];}
 }
 if(chunk.length)chunks.push(chunk);
 if(track.closed&&chunks.length>1&&active[0]&&active.at(-1)){
  chunks[0]=[...chunks.at(-1),...chunks[0]];
  chunks.pop();
 }
 const runs=chunks.map(indices=>{
  const points=indices.flatMap((index,i)=>track.parts[index].points.slice(i?1:0));
  return{indices,points};
 }).filter(run=>run.points.length>1);
 groundDeckCache.set(track,runs);return runs;
}
function paintFinishLine(ctx,track){
 if(!track.closed||!track.parts.length)return;
 const p=track.parts[0].start;
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.h);
 for(let k=-2;k<=2;k++)for(let j=0;j<8;j++){
  ctx.fillStyle=(k+j)%2?"#fff6e8":"#171a1c";
  ctx.fillRect(k*7,-TRACK_WIDTH/2+j*TRACK_WIDTH/8,7,TRACK_WIDTH/8);
 }
 ctx.restore();
}
// Marcas impresas junto a las ranuras, no sobre sus guías metálicas.
// La etiqueta procede de la posición FÍSICA en salida/meta; no gira
// con el sentido de conducción ni altera ningún tiempo de vuelta.
function finishLaneMarkings(track){
 if(!track?.closed||!track.parts?.length)return [];
 const first=track.parts[0],spec=CATALOG[first.id];
 const length=spec.length||spec.radius*Math.abs(spec.angle);
 const pose=positionOnPiece(first.start,first.id,Math.min(.56,70/length));
 const inner=laneAIndex(track.types,1);
 const side=Math.min(TRACK_WIDTH/2-14,LANE_OFFSET+23);
 return[0,1].map(physicalLane=>{
  const offset=physicalLane===0?-side:side;
  return{letter:physicalLane===inner?"A":"B",physicalLane,
   x:pose.x-Math.sin(pose.h)*offset,
   y:pose.y+Math.cos(pose.h)*offset,h:pose.h};
 });
}
function paintLaneStencils(ctx,track){
 const markings=finishLaneMarkings(track);
 for(const mark of markings){
  const a=mark.letter==="A";
  ctx.save();ctx.translate(mark.x,mark.y);ctx.rotate(mark.h);
  // Pequeña impresión circular de fábrica, completamente dentro del
  // borde exterior; no colorear el asfalto ni tapar el carril.
  ctx.beginPath();ctx.arc(0,0,11.5,0,Math.PI*2);
  ctx.fillStyle=a?"#155a76":"#7d2d50";ctx.fill();
  ctx.lineWidth=1.7;ctx.strokeStyle=a?"#81e4ff":"#ff9dc0";ctx.stroke();
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font="900 17px system-ui,-apple-system,sans-serif";
  ctx.fillStyle="#fff";ctx.fillText(mark.letter,0,.5);
  ctx.restore();
 }
}
function paintGroundTrack(ctx,track,editing){
 // Base continua: suelo, rampas y curvas comparten la misma superficie.
 // Separar los niveles en pasadas creaba terminaciones transversales.
 // Después se superpone únicamente la cubierta elevada para la oclusión.
 paintContinuousTrack(ctx,track,editing);
}
// Rayos X: solo mostrar lo que queda realmente tapado por una cubierta.
// La máscara usa el CONTORNO de cada plataforma completa, no pequeños
// rectángulos de cruce ni agujeros que puedan destruir las curvas inferiores.
const xRayClipCache=new WeakMap();
function xRayDeckPolygons(track){
 const cached=xRayClipCache.get(track);if(cached)return cached;
 const polygons=elevatedDeckRuns(track).map(run=>{
  const left=translated(run.points,TRACK_WIDTH/2-2);
  const right=translated(run.points,-TRACK_WIDTH/2+2).reverse();
  return[...left,...right];
 }).filter(polygon=>polygon.length>=4);
 xRayClipCache.set(track,polygons);return polygons;
}
function clipXRayDeck(ctx,track){
 const polygons=xRayDeckPolygons(track);if(!polygons.length)return false;
 ctx.beginPath();
 for(const polygon of polygons){
  ctx.moveTo(polygon[0].x,polygon[0].y);
  for(let i=1;i<polygon.length;i++)ctx.lineTo(polygon[i].x,polygon[i].y);
  ctx.closePath();
 }
 ctx.clip();
 return true;
}
// Contorno de deportivo cenital, con morro afinado, pasos de rueda,
// hombros traseros y alerón. No se usa el rectángulo de colisión del coche.
function traceXRayCarBody(ctx){
 ctx.beginPath();
 ctx.moveTo(48,-9);
 ctx.quadraticCurveTo(51,0,48,9);          // morro
 ctx.lineTo(41,15);
 ctx.quadraticCurveTo(37,21,27,22);       // aleta delantera
 ctx.quadraticCurveTo(22,25,17,24);
 ctx.lineTo(-23,24);
 ctx.quadraticCurveTo(-32,26,-38,23);     // aleta trasera
 ctx.lineTo(-43,21);
 ctx.quadraticCurveTo(-47,19,-47,14);     // parachoques trasero
 ctx.lineTo(-47,-14);
 ctx.quadraticCurveTo(-47,-19,-43,-21);
 ctx.lineTo(-38,-23);
 ctx.quadraticCurveTo(-32,-26,-23,-24);
 ctx.lineTo(17,-24);
 ctx.quadraticCurveTo(22,-25,27,-22);
 ctx.quadraticCurveTo(37,-21,41,-15);
 ctx.closePath();
}
function paintXRaySilhouette(ctx,at){
 if(!at)return;
 const visual=visualCarPose(at);
 ctx.save();ctx.translate(visual.x,visual.y);ctx.rotate(visual.h);
 ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
 ctx.lineJoin="round";ctx.lineCap="round";
 traceXRayCarBody(ctx);
 // El tenue relleno conserva la forma completa incluso con mucho asfalto
 // superpuesto, sin mostrar el sprite opaco del coche ni sus ventanillas.
 ctx.globalAlpha=.11;ctx.fillStyle="#5df5ea";ctx.fill();
 ctx.setLineDash([10,5]);
 ctx.globalAlpha=.35;ctx.lineWidth=7;ctx.strokeStyle="#052b34";ctx.stroke();
 ctx.shadowColor="#53f6e8";ctx.shadowBlur=7;
 ctx.globalAlpha=.95;ctx.lineWidth=2.7;ctx.strokeStyle="#a8fff2";ctx.stroke();
 ctx.shadowBlur=0;ctx.setLineDash([]);
 // Un pequeño trazo de alerón da lectura de coche de carreras, no de caja.
 ctx.beginPath();ctx.moveTo(-46,-23);ctx.lineTo(-46,23);
 ctx.globalAlpha=.52;ctx.lineWidth=2;ctx.strokeStyle="#a8fff2";ctx.stroke();
 ctx.restore();
}
// Guardar las guías de los carriles por trazado: en túneles largos
// evita recalcular los offsets a 60 FPS en Safari.
const xRayGroundCache=new WeakMap();
function xRayGroundGuides(track){
 const cached=xRayGroundCache.get(track);if(cached)return cached;
 const guides=groundDeckRuns(track).map(run=>({
  center:run.points,
  rails:[translated(run.points,-LANE_OFFSET),translated(run.points,LANE_OFFSET)]
 }));
 xRayGroundCache.set(track,guides);
 return guides;
}
function strokeXRayLine(ctx,points,color,width){
 if(points.length<2)return;
 ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
 for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
 ctx.strokeStyle=color;ctx.lineWidth=width;
 ctx.lineCap="round";ctx.lineJoin="round";ctx.stroke();
}
function paintXRayOverlay(ctx,track,hiddenCar=null){
 if(!state.xRayEnabled||!track.bridge)return false;
 const guides=xRayGroundGuides(track);
 if(!guides.length)return false;
 ctx.save();
 if(!clipXRayDeck(ctx,track)){ctx.restore();return false;}
 ctx.globalCompositeOperation="source-over";
 ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
 // Guías holográficas: trazos redondeados, finos y con brillo ligero.
 // Solo quedan visibles donde existe asfalto bajo una cubierta superior.
 ctx.setLineDash([23,17]);
 for(const guide of guides){
  for(const rail of guide.rails){
   ctx.globalAlpha=.27;
   strokeXRayLine(ctx,rail,"#06323e",7);
   ctx.globalAlpha=.78;
   ctx.shadowColor="#5df5ea";ctx.shadowBlur=5;
   strokeXRayLine(ctx,rail,"#8cece8",2.6);
   ctx.shadowBlur=0;
  }
  // Línea central más discreta para ayudar a leer túneles largos.
  ctx.globalAlpha=.25;
  strokeXRayLine(ctx,guide.center,"#3eafc1",1.4);
 }
 ctx.setLineDash([]);ctx.globalAlpha=1;
 if(hiddenCar)paintXRaySilhouette(ctx,hiddenCar);
 ctx.restore();
 return true;
}
// Unión visual continua de suelo ↔ rampa. Sus dos pasadas opacas tienen
// terminaciones rectas; la antialiasing produce una línea transversal en
// cada límite. La zona del conector se redibuja con UN MISMO trazado,
// sin tapa ni junta, pero sin modificar las piezas ni su geometría.
const elevationJoinCache=new WeakMap();
function elevationJoins(track){
 const cached=elevationJoinCache.get(track);if(cached)return cached;
 const profiles=track.elevation?.profiles||[];
 const parts=track.parts||[],count=parts.length,joins=[];
 if(track.bridge&&count>1){
  const limit=track.closed?count:count-1;
  for(let i=0;i<limit;i++){
   const next=(i+1)%count;
   if(Boolean(profiles[i])===Boolean(profiles[next]))continue;
   const before=parts[i],after=parts[next];
   // Solo soldar conectores realmente acoplados, nunca tramos próximos
   // en la mesa ni pistas que se cruzan a diferentes alturas.
   if(Math.hypot(before.end.x-after.start.x,before.end.y-after.start.y)>.1)continue;
   const pos=before.end;
   joins.push({from:i,to:next,x:pos.x,y:pos.y,h:pos.h,
    points:[...before.points,...after.points.slice(1)]});
  }
 }
 elevationJoinCache.set(track,joins);
 return joins;
}
// El circuito ya se dibuja COMPLETO en la pasada base. Repintar todo
// el puente introducía una segunda capa justo en el conector de las
// curvas de suelo, agravado al prolongarla 52 mm en DEV 0.14.50.
// Solo hay que repintar en cruces reales de vías NO ADYACENTES:
// es donde la vía superior debe ocultar al coche y a los raíles inferiores.
const crossingClipCache=new WeakMap();
function crossingClipPolygons(track){
 const cached=crossingClipCache.get(track);if(cached)return cached;
 const crossings=track.bridge?.crossings||[];
 if(!crossings.length){crossingClipCache.set(track,[]);return [];}
 // El fallo de DEV 0.14.50 venía de recortar la pista inferior a
 // intervalos alrededor del CRUCE DE EJES. Dos carreteras de 150 mm
 // se solapan mucho antes/después de que crucen sus ejes, y algunos
 // cruces están justo en el CONECTOR (t=0 o t=1). A ello se sumaba
 // un recorte artificial de 40 mm en el inicio/fin de una rampa.
 // La máscara correcta es toda la huella de las pistas INFERIORES:
 // así no hay discontinuidades ni siquiera en curvas coincidentes.
 const half=TRACK_WIDTH/2+18;
 const polygonFor=points=>{
  if(points.length<2)return null;
  const left=translated(points,half);
  const right=translated(points,-half).reverse();
  return[...left,...right];
 };
 // Cada tramo continuo de suelo usa una sola huella, sin tapas
 // independientes en los conectores. En trazados cerrados también
 // funciona cuando el tramo atraviesa el índice 0.
 const polygons=groundDeckRuns(track)
  .map(run=>polygonFor(run.points)).filter(Boolean);
 // Una rampa también puede ser la vía INFERIOR de otro cruce:
 // p. ej. el conector de la recta que sube bajo otra pista a 65 mm.
 // No podemos excluirla por tener perfil de elevación.
 const profileLower=new Set(crossings.map(c=>c.lower)
  .filter(i=>track.elevation?.profiles?.[i]));
 for(const index of profileLower){
  const part=track.parts[index];
  if(part){
   const poly=polygonFor(part.points);
   if(poly)polygons.push(poly);
  }
 }
 crossingClipCache.set(track,polygons);
 return polygons;
}
function paintElevatedDeck(ctx,track){
 if(!track.bridge||!track.elevation?.raisedParts?.length)return;
 const polygons=crossingClipPolygons(track);
 if(!polygons.length)return;
 ctx.save();
 ctx.beginPath();
 for(const polygon of polygons){
  ctx.moveTo(polygon[0].x,polygon[0].y);
  for(let i=1;i<polygon.length;i++)ctx.lineTo(polygon[i].x,polygon[i].y);
  ctx.closePath();
 }
 ctx.clip();
 for(const {points,offsets} of elevatedDeckRuns(track))
  paintOpaqueRibbon(ctx,points,offsets);
 // Los pianos superiores se repintan solo en el clip de cruces reales.
 paintTrackKerbs(ctx,track,"upper");
 ctx.restore();
 // La línea de meta de una sección elevada se mantiene arriba también
 // si coincide con un cruce; la pista base ya la pinta en otros puntos.
 if(track.elevation.profiles?.[0])paintFinishLine(ctx,track);
}
// Reglas de oclusión por INTERSECCIÓN. Una pasada de cada tramo elevado
// no garantiza que todos los cruces del Doble Ocho queden tapados.
// El clip limita el repintado al cruce real y utiliza la geometría
// continua del arco superior, no un rectángulo dibujado como pista.
// Antes de trazar los carriles inferiores, reservar las zonas tapadas
// por cada puente. No se trata de repintar un defecto: esas líneas
// inferiores jamás llegan al lienzo en el área de una intersección.
function paintVerifiedCrossings(ctx,track){
 const crossings=track.bridge?.crossings||[];
 if(!crossings.length)return;
 const runs=elevatedDeckRuns(track);
 for(const cross of crossings){
  const upper=track.parts[cross.upper];
  if(!upper)continue;
  const run=runs.find(item=>item.indices.includes(cross.upper));
  if(!run)continue;
  const p=positionOnPiece(upper.start,upper.id,cross.upperT??.5);
  const under=track.parts[cross.lower];
  const q=under?positionOnPiece(under.start,under.id,cross.lowerT??.5):null;
  const sinCross=q?Math.abs(Math.sin(p.h-q.h)):1;
  const halfLength=Math.min(TRACK_WIDTH*3,
   Math.max(TRACK_WIDTH,TRACK_WIDTH/(2*Math.max(.28,sinCross))+TRACK_WIDTH*.40));
  ctx.save();
  ctx.translate(cross.x,cross.y);ctx.rotate(p.h);
  ctx.beginPath();
  ctx.rect(-halfLength,-TRACK_WIDTH/2-10,halfLength*2,TRACK_WIDTH+20);
  ctx.clip();
  ctx.rotate(-p.h);ctx.translate(-cross.x,-cross.y);
  paintOpaqueRibbon(ctx,run.points,run.offsets);
  ctx.restore();
 }
}
function paintBridgeCrossing(ctx,track){
 if(!track.bridge)return;
 const crossings=track.bridge.crossings?.length?track.bridge.crossings:
  track.bridge.crossing?[{
   ...track.bridge.crossing,upper:track.bridge.overParts[0],
   lower:track.bridge.underParts?.[0],upperT:.5,lowerT:.5
  }]:[];
 for(const cross of crossings){
  const elevated=track.parts[cross.upper],lower=track.parts[cross.lower];
  if(!elevated)continue;
  const middle={x:cross.x,y:cross.y};
  const angle=positionOnPiece(elevated.start,elevated.id,cross.upperT??.5).h;
  const underAngle=lower?
   positionOnPiece(lower.start,lower.id,cross.lowerT??.5).h:angle+Math.PI/2;
  const theta=Math.abs(Math.sin(angle-underAngle));
  const halfLength=Math.min(210,Math.max(103,
   Math.ceil((TRACK_WIDTH/2+16)/Math.max(.55,theta))));
  const halfWidth=(TRACK_WIDTH+17)/2;
  ctx.save();ctx.translate(middle.x,middle.y);ctx.rotate(angle);
  if(track.bridge.virtual){
   for(const x of [-halfLength-32,halfLength+32]){
    ctx.save();ctx.shadowColor="#0008";ctx.shadowBlur=11;
    ctx.fillStyle="#52666e";roundRect(ctx,x-14,-101,28,202,7);ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle="#bdcfd0";ctx.fillRect(x-4,-93,8,186);
    ctx.restore();
   }
  }
  ctx.beginPath();roundRect(ctx,-halfLength,-halfWidth,halfLength*2,halfWidth*2,9);ctx.clip();
  ctx.rotate(-angle);ctx.translate(-middle.x,-middle.y);
  const upper=elevated.points;
  ctx.save();ctx.shadowColor="#0009";ctx.shadowBlur=14;ctx.shadowOffsetY=9;
  strokePath(ctx,upper,PIECE_LOOK.shadow,TRACK_WIDTH+19);ctx.restore();
  strokePath(ctx,upper,PIECE_LOOK.outer,TRACK_WIDTH+12);
  strokePath(ctx,upper,PIECE_LOOK.rim,TRACK_WIDTH+5);
  strokePath(ctx,upper,PIECE_LOOK.deck,TRACK_WIDTH-4);
  strokePath(ctx,upper,PIECE_LOOK.inner,TRACK_WIDTH-31);
  for(const off of [-LANE_OFFSET,LANE_OFFSET]){
   strokePath(ctx,translated(upper,off),PIECE_LOOK.groove,11);
   strokePath(ctx,translated(upper,off-7.6),PIECE_LOOK.metalA,2.2);
   strokePath(ctx,translated(upper,off+7.6),PIECE_LOOK.metalB,2.2);
   strokePath(ctx,translated(upper,off),PIECE_LOOK.guide,5);
  }
  for(const off of [-72,72])strokePath(ctx,translated(upper,off),PIECE_LOOK.edge,2.5);
  paintLooseKerbs(ctx,[elevated]);
  ctx.restore();
 }
}
function paintTrack(ctx,track,editing,layer="all"){
 if(!track.parts.length)return;
 const elevated=track.bridge?track.bridge.overParts:[];
 // La vía inferior y la superior se dibujan en PASADAS DISTINTAS,
 // para poder situar un coche debajo del puente sin pintarlo encima.
 const ordered=layer==="ground"?
  track.parts.filter(p=>!elevated.includes(p.index)):
  layer==="overpass"?
  track.parts.filter(p=>elevated.includes(p.index)):
  elevated.length?
   [...track.parts.filter(p=>!elevated.includes(p.index)),...track.parts.filter(p=>elevated.includes(p.index))]:
   track.parts;
 for(const part of ordered){
  if(track.bridge&&part.index===elevated[0])paintBridgePillars(ctx,track);
  if(elevated.includes(part.index)){
   // La banda superior pasa por delante del cruce inferior y proyecta
   // sombra propia. El nivel real de altura se incorporará a las físicas después.
   ctx.save();ctx.shadowColor="#000c";ctx.shadowBlur=27;ctx.shadowOffsetY=18;
   strokePath(ctx,part.points,"#11171b",TRACK_WIDTH+28);
   ctx.restore();
  }
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
  if(track.bridge&&elevated.includes(part.index)){
   ctx.save();ctx.globalAlpha=.7;
   for(const side of [-71,71])strokePath(ctx,translated(part.points,side),"#d6e0d3",3);
   ctx.restore();
  }
  if(editing&&part.index===state.selection){
   strokePath(ctx,part.points,"#77ffe6",TRACK_WIDTH+22);
   strokePath(ctx,part.points,"#14383d",TRACK_WIDTH+15);
   // Paint a translucent outline outside, retain the real track surface above by alpha compositing.
   ctx.globalAlpha=.20;strokePath(ctx,part.points,"#36ffd6",TRACK_WIDTH+8);ctx.globalAlpha=1;
  }
 }
 if(track.closed&&layer!=="overpass"){
  const p=track.parts[0].start,nx=-Math.sin(p.h),ny=Math.cos(p.h),dx=Math.cos(p.h),dy=Math.sin(p.h);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.h);
  for(let k=-2;k<=2;k++)for(let j=0;j<8;j++){
   ctx.fillStyle=(k+j)%2?"#fff6e8":"#171a1c";ctx.fillRect(k*7,-TRACK_WIDTH/2+j*(TRACK_WIDTH/8),7,TRACK_WIDTH/8);
  }
  ctx.restore();
 }
 if(layer!=="overpass"&&!track.closed&&editing){
  const start=track.ends.begin,end=track.ends.end;
  for(const [p,color] of [[start,"#67eff1"],[end,"#ffc66b"]]){
   ctx.save();ctx.shadowBlur=25;ctx.shadowColor=color;ctx.fillStyle=color;
   ctx.beginPath();ctx.arc(p.x,p.y,19,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
   ctx.fillStyle="#132129";ctx.beginPath();ctx.arc(p.x,p.y,10,0,Math.PI*2);ctx.fill();ctx.restore();
  }
 }
}
// Deslizamiento visual sin alterar la ranura física ni el cronómetro.
// Para un trompo de 3 segundos, el coche se aparta, gira y vuelve a su
// posición original: la vuelta sigue siendo válida.
function visualCarPose(at){
 if(state.mode!=="race")return {...at,smoke:0,spin:0};
 if(state.deslot){
  const d=state.deslot,t=d.elapsed;
  const side=d.turn||1;
  const out=t<.7?t/.7:t<1.75?1:Math.max(0,(3-t)/1.25);
  const turn=t<1.4?Math.PI*4*(t/1.4):Math.PI*4;
  const normalX=-Math.sin(at.h),normalY=Math.cos(at.h);
  return{...at,
   x:at.x-side*normalX*85*out,
   y:at.y-side*normalY*85*out,
   h:at.h+side*turn,
   smoke:Math.max(0,1-t/2.5),spin:1};
 }
 const slip=state.rearSlip||0,car=carDynamics();
 // El coche gira alrededor de su guía delantera, sin sacarla de la ranura.
 // Amplificación exclusivamente VISUAL: la cola se abre aproximadamente
 // el doble, conservando exactamente el mismo deslizamiento físico.
 // atan2 asegura una evolución continua al pasar de curva a recta.
 const yaw=Math.atan2(slip,car.wheelbaseMM)*2.4;
 const frontOffset=CAR_LENGTH_MM*.40;
 const heading=at.h+yaw;
 return{...at,
  x:at.x+frontOffset*(Math.cos(at.h)-Math.cos(heading)),
  y:at.y+frontOffset*(Math.sin(at.h)-Math.sin(heading)),
  h:heading,
  smoke:Math.min(1,Math.abs(slip)/(car.wheelbaseMM*Math.tan(car.guideYawLimit))),
  spin:0};
}
// Sprites cenitales originales de Top Down RACE: misma escala y físicas.
// El modelo elegido sólo cambia la apariencia y el récord por coche.
const CAR_LENGTH_MM=98,CAR_WIDTH_MM=49;
const CAR_SKINS=Object.freeze({
 gripline:"./assets/cars/avenir_gripline.webp",
 spark:"./assets/cars/helix_spark.webp"
});
const carImages={};
for(const [key,url] of Object.entries(CAR_SKINS)){
 const img=typeof Image==="function"?new Image():null;
 if(img){
  img.onload=()=>{state.viewDirty=true;};
  img.onerror=()=>{state.viewDirty=true;};
  img.src=url;
 }
 carImages[key]=img;
}
function paintCar(ctx,at,lane,paused=false){
 if(!at)return;
 const visual=visualCarPose(at);
 ctx.save();ctx.translate(visual.x,visual.y);ctx.rotate(visual.h);
 if(visual.smoke>.03){
  ctx.save();ctx.globalAlpha=Math.min(.42,.36*visual.smoke);
  for(let i=0;i<3;i++){
   ctx.beginPath();ctx.ellipse(-51-i*13,(i-1)*15,5+i*4,3+i*2,.2,0,Math.PI*2);
   ctx.fillStyle="#d9e7e0";ctx.fill();
  }
  if(visual.spin){
   ctx.strokeStyle="#def0e2";ctx.lineWidth=2;
   ctx.beginPath();ctx.arc(0,0,71,visual.h,visual.h+Math.PI*.9);ctx.stroke();
  }
  ctx.restore();
 }
 ctx.shadowColor="#000a";ctx.shadowBlur=11;ctx.shadowOffsetY=6;
 const current=carImages[state.selectedCar]||carImages.gripline;
 if(current&&current.complete&&current.naturalWidth>0){
  // En ambos sprites la parte delantera mira hacia arriba.
  ctx.rotate(Math.PI/2);
  ctx.drawImage(current,-CAR_WIDTH_MM/2,-CAR_LENGTH_MM/2,CAR_WIDTH_MM,CAR_LENGTH_MM);
 }else{
  // Render de emergencia mientras carga: no ocultar el coche.
  ctx.fillStyle="#f8faff";roundRect(ctx,-49,-21,CAR_LENGTH_MM,42,13);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle=state.selectedCar==="spark"?"#e3be1c":"#187ac0";
  ctx.fillRect(-27,-8,52,16);
 }
 ctx.restore();
}
function loosePart(piece,index){
 const n=CATALOG[piece.id].length?7:20;
 const pose={x:piece.x,y:piece.y,h:piece.h};
 const points=Array.from({length:n+1},(_,k)=>positionOnPiece(pose,piece.id,k/n));
 return{id:piece.id,index,start:pose,end:points[points.length-1],points,raised:Boolean(piece.raised)};
}
// Una unión magnética se dibuja como UNA superficie continua. La sombra,
// los cantos y las juntas de conector sólo aparecen en el perímetro del
// tramo, no en las piezas interiores que ya quedaron encajadas.
function loosePaintGroups(){
 const groups=[],seen=new Set();
 for(let i=0;i<state.loose.length;i++){
  if(seen.has(i))continue;
  const indices=looseMembers(i);
  for(const j of indices)seen.add(j);
  const parts=indices.map(j=>loosePart(state.loose[j],j));
  const points=parts.flatMap((part,k)=>k?part.points.slice(1):part.points);
  groups.push({key:looseGroupKey(i),indices,parts,points});
 }
 return groups;
}
// Dibujo de puentes en trazados todavía sin homologar. Una recta suelta
// puede cruzar otra pieza o un tramo magnético, aunque aún no se haya
// pulsado Iniciar. La intersección no equivale a conexión magnética.
function crossingOnLooseParts(upper,lower){
 const a=upper.points,b=lower.points;
 for(let i=1;i<a.length;i++)for(let j=1;j<b.length;j++){
  const p=a[i-1],q=b[j-1],dx=a[i].x-p.x,dy=a[i].y-p.y,
   ex=b[j].x-q.x,ey=b[j].y-q.y;
  const det=dx*ey-dy*ex;if(Math.abs(det)<1e-8)continue;
  const rx=q.x-p.x,ry=q.y-p.y;
  const t=(rx*ey-ry*ex)/det,u=(rx*dy-ry*dx)/det;
  if(t<0||t>1||u<0||u>1)continue;
  const x=p.x+t*dx,y=p.y+t*dy;
  const span=CATALOG[upper.id]?.length||0;
  const progress=(x-upper.start.x)*Math.cos(upper.start.h)+
   (y-upper.start.y)*Math.sin(upper.start.h);
  // El cruce debe dejar 90 mm disponibles para cada rampa.
  if(span&&(progress<90||progress>span-90))return null;
  return{x,y};
 }
 return null;
}
function looseOverpasses(groups=loosePaintGroups()){
 const out=[],parts=groups.flatMap(group=>group.parts.map((part,i)=>({
  ...part,key:group.key,order:i
 })));
 for(const upper of parts){
  if(!upper.raised)continue;
  for(const lower of parts){
   if(upper.index===lower.index)continue;
   // Uniones adyacentes del mismo tramo no son cruces.
   if(upper.key===lower.key&&Math.abs(upper.order-lower.order)<=1)continue;
   const crossing=crossingOnLooseParts(upper,lower);
   if(!crossing)continue;
   // Un solo paso a distinto nivel por pieza para este kit experimental.
   if(out.some(x=>x.upper.index===upper.index))continue;
   out.push({upper,lower,crossing});
  }
 }
 return out;
}
function paintLooseOverpasses(ctx,groups){
 for(const {upper,lower,crossing} of looseOverpasses(groups)){
  paintBridgeCrossing(ctx,{parts:[upper,lower],bridge:{
   overParts:[0],underParts:[1],crossing,virtual:false,height:65
  }});
 }
}
function paintLoose(ctx){
 const groups=loosePaintGroups();
 // Los soportes se sitúan bajo TODAS las piezas, no sólo bajo el tramo
 // que lleva el kit. Así nunca quedan sobre la vía inferior del cruce.
 for(const group of groups)for(const part of group.parts)
  if(part.raised)paintSupportKit(ctx,part);
 for(const group of groups){
  const {points,parts,indices}=group;
  if(!points.length)continue;
  ctx.save();ctx.shadowColor="#0009";ctx.shadowBlur=18;ctx.shadowOffsetY=12;
  strokePath(ctx,points,PIECE_LOOK.shadow,TRACK_WIDTH+19);
  ctx.restore();
  strokePath(ctx,points,PIECE_LOOK.outer,TRACK_WIDTH+12);
  strokePath(ctx,points,PIECE_LOOK.rim,TRACK_WIDTH+5);
  strokePath(ctx,points,PIECE_LOOK.deck,TRACK_WIDTH-4);
  strokePath(ctx,points,PIECE_LOOK.inner,TRACK_WIDTH-31);
  for(const off of [-LANE_OFFSET,LANE_OFFSET]){
   strokePath(ctx,translated(points,off),PIECE_LOOK.groove,11);
   strokePath(ctx,translated(points,off-7.6),PIECE_LOOK.metalA,2.2);
   strokePath(ctx,translated(points,off+7.6),PIECE_LOOK.metalB,2.2);
   strokePath(ctx,translated(points,off),PIECE_LOOK.guide,5);
  }
  for(const edge of [-72,72])strokePath(ctx,translated(points,edge),PIECE_LOOK.edge,2.5);
  paintLooseKerbs(ctx,parts);
  // Sólo los conectores exteriores: nunca dibujar una falsa separación
  // oscura entre dos módulos magnéticamente unidos.
  paintSeam(ctx,parts[0].start);
  paintSeam(ctx,parts[parts.length-1].end);
  for(const part of parts)if(part.raised)paintBridgeRampProfile(ctx,part);
  if(state.mode==="build"&&state.looseSelection>=0){
   if(state.selectionMode==="group"&&group.key===state.selectedGroup){
    ctx.save();ctx.globalAlpha=.22;
    strokePath(ctx,points,"#6effdf",TRACK_WIDTH+25);ctx.restore();
   }else if(state.selectionMode==="piece"&&indices.includes(state.looseSelection)){
    const part=parts[indices.indexOf(state.looseSelection)];
    ctx.save();ctx.globalAlpha=.43;
    strokePath(ctx,part.points,"#f4d06c",TRACK_WIDTH+25);ctx.restore();
   }
  }
 }
 paintLooseOverpasses(ctx,groups);
 if(state.mode==="build"&&state.looseSelection>=0){
  const magnet=bestMagnet(state.looseSelection);
  if(magnet){
   ctx.save();ctx.lineWidth=7;ctx.strokeStyle="#84f6c0";ctx.setLineDash([20,12]);
   ctx.beginPath();ctx.moveTo(magnet.from.x,magnet.from.y);
   ctx.lineTo(magnet.to.x,magnet.to.y);ctx.stroke();
   ctx.setLineDash([]);ctx.restore();
  }
 }
 if(state.dragging?.active&&state.mode==="build"){
  const d=state.dragging,rect=editCanvas.getBoundingClientRect();
  const w=worldFromPointer(makeView(editCanvas,"build"),d.x-rect.left,d.y-rect.top);
  // La vista previa se muestra incluso fuera del antiguo tapete.
  {
   const end=state.track.ends.end,snap=!state.track.closed&&state.types.length>0&&Math.hypot(w.x-end.x,w.y-end.y)<SNAP_DISTANCE_MM;
   const snapped=gridXY(w.x,w.y);
   const pose=snap?{x:end.x,y:end.y,h:end.h}:{x:snapped.x,y:snapped.y,h:0};
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
// Exportación PNG autocontenida. La receta viaja DENTRO de la imagen
// (no en un archivo secundario), con números de montaje y elevaciones.
function blueprintData(){
 const recipe=buildRecipe(state.types,CATALOG,state.bridgeParts,state.loose,state.driveDirection);
 // Los kits son accesorios de montaje, no modifican la geometría
 // longitudinal de las rectas. Aun así deben aparecer en la receta.
 const kitCount=(state.track.elevation?.runs?.length||0)+
  state.loose.filter(p=>p.raised).length;
 if(kitCount){
  recipe.bridgeCount=kitCount;
  recipe.items.push({id:"BRIDGE_KIT",name:"Kit puente 65 mm · soportes y rampas",
   count:kitCount,length:0,accessory:true});
 }
 return recipe;
}
// El plano usa su propio estilo de impresión: toda la pista es blanca
// y todas las juntas entre piezas son negras. No altera el color de la
// mesa, la caja de piezas ni la representación de la carrera.
const BLUEPRINT_TRACK=Object.freeze({
 outline:"#10171a",paper:"#ffffff",lane:"#333b40",
 rail:"#9da8ad",seam:"#080c0f",supports:"#aab8bd"
});
function paintBlueprintRibbon(ctx,points){
 if(points.length<2)return;
 ctx.save();ctx.lineCap="butt";ctx.lineJoin="round";
 // Contorno fino y negro, con un único tablero blanco continuo.
 strokePath(ctx,points,BLUEPRINT_TRACK.outline,TRACK_WIDTH+8);
 strokePath(ctx,points,BLUEPRINT_TRACK.paper,TRACK_WIDTH);
 // Dos ranuras de guía contrastadas, manteniendo la zona blanca.
 for(const laneOffset of [-LANE_OFFSET,LANE_OFFSET]){
  strokePath(ctx,translated(points,laneOffset),BLUEPRINT_TRACK.lane,4.4);
  for(const side of [-7.6,7.6])
   strokePath(ctx,translated(points,laneOffset+side),BLUEPRINT_TRACK.rail,2);
 }
 ctx.restore();
}
function paintBlueprintSeam(ctx,p){
 const nx=-Math.sin(p.h),ny=Math.cos(p.h);
 ctx.save();ctx.strokeStyle=BLUEPRINT_TRACK.seam;ctx.lineWidth=5;
 ctx.lineCap="butt";
 ctx.beginPath();
 ctx.moveTo(p.x-nx*(TRACK_WIDTH/2-2),p.y-ny*(TRACK_WIDTH/2-2));
 ctx.lineTo(p.x+nx*(TRACK_WIDTH/2-2),p.y+ny*(TRACK_WIDTH/2-2));
 ctx.stroke();
 // Pequeños conectores visibles a cada lado, sin sombreado negro que
 // convierta los módulos en objetos visualmente separados.
 ctx.fillStyle=BLUEPRINT_TRACK.seam;
 for(const off of [-TRACK_WIDTH/2+7,TRACK_WIDTH/2-7]){
  ctx.beginPath();ctx.arc(p.x+nx*off,p.y+ny*off,4.2,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function paintBlueprintSupports(ctx,part,track=null){
 if(!part||!CATALOG[part.id])return;
 const samples=CATALOG[part.id].length?[.21,.5,.79]:[.12,.36,.64,.88];
 for(const t of samples){
  if(track&&elevationAt(track,part.index,t)<12)continue;
  const p=positionOnPiece(part.start,part.id,t);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.h);
  ctx.fillStyle=BLUEPRINT_TRACK.supports;
  ctx.strokeStyle=BLUEPRINT_TRACK.outline;ctx.lineWidth=3;
  ctx.fillRect(-14,-99,28,198);
  ctx.strokeRect(-14,-99,28,198);
  ctx.restore();
 }
}
function paintBlueprintOverpass(ctx,track){
 if(!track.bridge)return;
 const crossings=track.bridge.crossings?.length?track.bridge.crossings:
  track.bridge.crossing?[{
   ...track.bridge.crossing,upper:track.bridge.overParts[0],
   lower:track.bridge.underParts?.[0],upperT:.5,lowerT:.5
  }]:[];
 for(const crossing of crossings){
  const upper=track.parts[crossing.upper],lower=track.parts[crossing.lower];
  if(!upper)continue;
  const center=crossing;
  const angle=positionOnPiece(upper.start,upper.id,crossing.upperT??.5).h;
  const lowerAngle=lower?
   positionOnPiece(lower.start,lower.id,crossing.lowerT??.5).h:angle+Math.PI/2;
  const slope=Math.abs(Math.sin(angle-lowerAngle));
  const halfLength=Math.min(210,Math.max(103,
   Math.ceil((TRACK_WIDTH/2+16)/Math.max(.55,slope))));
  ctx.save();ctx.translate(center.x,center.y);ctx.rotate(angle);
  ctx.beginPath();ctx.rect(-halfLength,-(TRACK_WIDTH+12)/2,
   halfLength*2,TRACK_WIDTH+12);ctx.clip();
  ctx.rotate(-angle);ctx.translate(-center.x,-center.y);
  paintBlueprintRibbon(ctx,upper.points);
  paintBlueprintSeam(ctx,upper.start);
  ctx.restore();
 }
}
function paintBlueprintTrack(ctx,track){
 const groups=loosePaintGroups();
 // Los soportes se dibujan primero para no tapar nunca los carriles.
 const raised=new Set([
  ...(track.elevation?.raisedParts||[]),
  ...(track.bridge?.overParts||[])
 ]);
 for(const index of raised)paintBlueprintSupports(ctx,track.parts[index],track);
 for(const group of groups)for(const part of group.parts)
  if(part.raised)paintBlueprintSupports(ctx,part);
 if(track.parts.length){
  paintBlueprintRibbon(ctx,track.points);
  for(const part of track.parts)paintBlueprintSeam(ctx,part.start);
  if(!track.closed)paintBlueprintSeam(ctx,track.ends.end);
  paintBlueprintOverpass(ctx,track);
 }
 // También exporta un montaje sin iniciar; cada costura del grupo
 // es visible en negro, incluso si las piezas están imantadas.
 for(const group of groups){
  if(!group.points.length)continue;
  paintBlueprintRibbon(ctx,group.points);
  for(const part of group.parts)paintBlueprintSeam(ctx,part.start);
  paintBlueprintSeam(ctx,group.parts[group.parts.length-1].end);
 }
 for(const {upper,lower,crossing} of looseOverpasses(groups))
  paintBlueprintOverpass(ctx,{parts:[upper,lower],bridge:{
   overParts:[0],underParts:[1],crossing
  }});
}
// Identificación visual por TIPO, no por posición: todas las curvas R1
// 90° derechas llevan la misma letra. El círculo mantiene su tamaño en
// píxeles exportados independientemente del zoom del plano.
// Etiquetas inteligentes: prioriza las curvas y rectas más cortas, cuyo
// centro está muy cerca del de otras piezas. Busca puntos alternativos
// sobre la pieza y, si es necesario, pequeñas llamadas a los lados.
// Todo se resuelve en píxeles del PNG, no en unidades del circuito.
function paintBlueprintIdentifiers(ctx,track,groups,refs,scale,viewport){
 const pieces=[...track.parts,...groups.flatMap(group=>group.parts)];
 const crossing=track.bridge?.crossing;
 const underParts=new Set(track.bridge?.underParts||[]);
 const markers=new Array(pieces.length);
 const placed=[];
 const safeScale=Math.max(1e-9,scale);
 const data=pieces.map((part,index)=>{
  const spec=CATALOG[part.id],length=spec?.length||
   (spec?.radius||100)*Math.abs(spec?.angle||0);
  let preferred=.5;
  if(crossing&&track.parts[part.index]===part&&underParts.has(part.index)){
   const mid=positionOnPiece(part.start,part.id,.5);
   if(Math.hypot(mid.x-crossing.x,mid.y-crossing.y)<TRACK_WIDTH){
    const a=positionOnPiece(part.start,part.id,.28);
    const b=positionOnPiece(part.start,part.id,.72);
    preferred=Math.hypot(a.x-crossing.x,a.y-crossing.y)>
     Math.hypot(b.x-crossing.x,b.y-crossing.y)?.28:.72;
   }
  }
  return{part,index,code:refs.get(part.id),length,preferred};
 }).filter(item=>item.code);
 // Resolver primero los módulos más cortos deja a las rectas largas
 // la flexibilidad para situar su letra sin invadir las curvas densas.
 const order=data.slice().sort((a,b)=>a.length-b.length||a.index-b.index);
 const radii=[21,18,15,12];
 const offsets=[0,-34,34,-57,57,-83,83,-113,113];
 for(const entry of order){
  const samples=[entry.preferred,.5,.28,.72,.14,.86,.04,.96]
   .filter((value,index,array)=>array.findIndex(other=>Math.abs(other-value)<.01)===index);
  let selected=null,fallback=null;
  for(const radius of radii){
   let best=null;
   for(const sample of samples){
    const point=positionOnPiece(entry.part.start,entry.part.id,sample);
    for(const offset of offsets){
     // Desplazamiento lateral en píxeles; mantiene la posición junto a SU pieza.
     const wx=point.x-Math.sin(point.h)*offset/safeScale;
     const wy=point.y+Math.cos(point.h)*offset/safeScale;
     const sx=(wx-viewport.cx)*safeScale+viewport.width/2;
     const sy=(wy-viewport.cy)*safeScale+viewport.height/2;
     const margin=radius+5;
     if(sx<margin||sx>viewport.width-margin||
        sy<margin||sy>viewport.height-margin)continue;
     let collision=0;
     for(const other of placed){
      const required=radius+other.radius+5;
      collision+=Math.max(0,required-Math.hypot(sx-other.sx,sy-other.sy))**2;
     }
     const penalty=Math.abs(offset)*.55+
      Math.abs(sample-entry.preferred)*34+
      (21-radius)*3;
     const candidate={x:wx,y:wy,sx,sy,radius,offset,
      anchorX:point.x,anchorY:point.y,collision,penalty};
     if(!fallback||collision*120+penalty<
       fallback.collision*120+fallback.penalty)fallback=candidate;
     if(collision===0&&(!best||penalty<best.penalty))best=candidate;
    }
   }
   if(best){selected=best;break;}
  }
  if(!selected)selected=fallback;
  if(!selected){
   // Circuito extremo contra el borde: mantener una etiqueta legible.
   const p=positionOnPiece(entry.part.start,entry.part.id,entry.preferred);
   selected={x:p.x,y:p.y,
    sx:(p.x-viewport.cx)*safeScale+viewport.width/2,
    sy:(p.y-viewport.cy)*safeScale+viewport.height/2,
    radius:12,offset:0,anchorX:p.x,anchorY:p.y};
  }
  placed.push(selected);
  markers[entry.index]={id:entry.part.id,code:entry.code,
   x:selected.x,y:selected.y,radius:selected.radius,
   sx:selected.sx,sy:selected.sy,
   anchorX:selected.anchorX,anchorY:selected.anchorY};
 }
 // Pintar en el orden original mantiene los metadatos y la receta.
 // Una llamada visual indica a qué curva pertenece la letra desplazada.
 for(const marker of markers){
  if(!marker)continue;
  const moved=Math.hypot(marker.x-marker.anchorX,marker.y-marker.anchorY)*safeScale;
  if(moved>25){
   ctx.save();ctx.strokeStyle="#e3fff7";ctx.lineWidth=1.8/safeScale;
   ctx.beginPath();ctx.moveTo(marker.anchorX,marker.anchorY);
   ctx.lineTo(marker.x,marker.y);ctx.stroke();ctx.restore();
  }
  ctx.save();ctx.translate(marker.x,marker.y);
  ctx.scale(1/safeScale,1/safeScale);
  ctx.beginPath();ctx.arc(0,0,marker.radius,0,Math.PI*2);
  ctx.fillStyle="#102d36";ctx.fill();
  ctx.strokeStyle="#e9fffa";ctx.lineWidth=marker.radius>=18?3:2;ctx.stroke();
  ctx.fillStyle="#ffffff";ctx.textAlign="center";ctx.textBaseline="middle";
  const fontSize=(marker.code.length>1?17:23)*marker.radius/21;
  ctx.font="900 "+Math.max(12,Math.round(fontSize))+"px system-ui,sans-serif";
  ctx.fillText(marker.code,0,1);
  ctx.restore();
 }
 return markers;
}
function drawBlueprint(ctx,recipe,{width=1500}={}){
 const rows=Math.max(1,Math.ceil(recipe.items.length/2));
 const refs=blueprintReferenceMap(recipe.items);
 const x=Math.round(width*.045),bodyWidth=width-2*x;
 const headingY=74;
 // Reservar una cabecera independiente: el rectángulo del circuito ya
 // nunca puede pintar por encima del nombre, incluso en dos líneas.
 const frame={x:x+13,y:353,width:bodyWidth-26,height:Math.round(width*.79)};
 const metricsY=frame.y+frame.height+42;
 const recipeHeadingY=metricsY+170;
 const recipeRowY=recipeHeadingY+33;
 const h=Math.ceil(recipeRowY+rows*59+104);
 ctx.canvas.width=width;ctx.canvas.height=h;
 ctx.fillStyle="#091921";ctx.fillRect(0,0,width,h);
 // Cabecera técnica, sin elementos propios del HUD de carrera.
 ctx.fillStyle="#48e4c1";ctx.fillRect(x,headingY,15,105);
 ctx.fillStyle="#f5fffb";ctx.font="900 76px system-ui,sans-serif";
 ctx.textAlign="left";ctx.fillText("SLOTRACE",x+36,headingY+59);
 ctx.fillStyle="#7adccc";ctx.font="800 24px system-ui,sans-serif";
 ctx.fillText("CRAFT RACE STUDIO · PLANO DE CIRCUITO",x+36,headingY+100);
 // Medir el nombre completo: una línea cuando cabe, hasta dos si es
 // largo. No truncar a 45 caracteres ni permitir que entre al marco.
 const name=circuitLabel();
 const titleMaxWidth=bodyWidth-60;
 const titleMeasure=(text,size)=>{
  ctx.font="800 "+size+"px system-ui,sans-serif";
  const measured=ctx.measureText?.(text)?.width;
  return Number.isFinite(measured)?measured:text.length*size*.62;
 };
 const titleRows=(value,size)=>{
  const words=value.split(/\s+/).filter(Boolean),lines=[];
  let row="";
  for(const word of words){
   const next=row?row+" "+word:word;
   if(row&&titleMeasure(next,size)>titleMaxWidth){lines.push(row);row=word;}
   else row=next;
  }
  if(row)lines.push(row);
  return lines;
 };
 let nameSize=33,nameLines=titleRows(name,nameSize);
 while(nameSize>18&&(nameLines.length>2||
  nameLines.some(line=>titleMeasure(line,nameSize)>titleMaxWidth))){
  nameSize--;nameLines=titleRows(name,nameSize);
 }
 // Un nombre sin espacios muy largo también conserva su texto completo.
 if(nameLines.some(line=>titleMeasure(line,nameSize)>titleMaxWidth)){
  nameSize=Math.max(12,Math.floor(titleMaxWidth/(Math.max(...nameLines.map(l=>l.length))*.62)));
 }
 ctx.fillStyle="#effff7";ctx.font="800 "+nameSize+"px system-ui,sans-serif";
 for(const [lineIndex,line] of nameLines.entries())
  ctx.fillText(line,x+36,headingY+151+lineIndex*40);
 // Firma del constructor fuera del área del circuito y de la receta.
 const creator=circuitCreator();
 const creatorText="CREADOR: "+(creator||"SIN INDICAR");
 ctx.textAlign="left";ctx.fillStyle="#7adccc";
 let creatorSize=22;
 ctx.font="800 "+creatorSize+"px system-ui,sans-serif";
 while(creatorSize>13&&ctx.measureText?.(creatorText)?.width>bodyWidth-60){
  creatorSize--;ctx.font="800 "+creatorSize+"px system-ui,sans-serif";
 }
 ctx.fillText(creatorText,x+36,headingY+234);
 ctx.textAlign="right";ctx.fillStyle="#c1f1e7";ctx.font="900 27px system-ui,sans-serif";
 ctx.fillText(recipe.direction===1?"↻ SENTIDO HORARIO":"↺ SENTIDO ANTIHORARIO",
  width-x,headingY+51);
 ctx.fillStyle="#a1b9bc";ctx.font="600 22px system-ui,sans-serif";
 ctx.fillText("SR-PRECISION · ESCALA PROPORCIONAL",width-x,headingY+87);
 ctx.textAlign="left";
 ctx.strokeStyle="#57958c";ctx.lineWidth=2;
 ctx.strokeRect(x,frame.y-13,bodyWidth,frame.height+26);
 ctx.fillStyle="#17433b";ctx.fillRect(frame.x,frame.y,frame.width,frame.height);
 const groups=loosePaintGroups();
 const pts=[...state.track.parts.flatMap(p=>p.points),...groups.flatMap(g=>g.points)];
 const bounds=pts.length?{
  minX:Math.min(...pts.map(p=>p.x))-92,maxX:Math.max(...pts.map(p=>p.x))+92,
  minY:Math.min(...pts.map(p=>p.y))-92,maxY:Math.max(...pts.map(p=>p.y))+92
 }:{minX:0,maxX:TABLE.width,minY:0,maxY:TABLE.height};
 const actualW=Math.max(100,bounds.maxX-bounds.minX);
 const actualH=Math.max(100,bounds.maxY-bounds.minY);
 // Reservar píxeles para que las letras en el perímetro no se recorten.
 const scale=Math.min((frame.width-92)/actualW,(frame.height-92)/actualH);
 const cx=(bounds.minX+bounds.maxX)/2,cy=(bounds.minY+bounds.maxY)/2;
 ctx.save();ctx.beginPath();ctx.rect(frame.x,frame.y,frame.width,frame.height);ctx.clip();
 ctx.strokeStyle="#ffffff0c";ctx.lineWidth=1;
 for(let i=0;i<frame.width;i+=42){
  ctx.beginPath();ctx.moveTo(frame.x+i,frame.y);
  ctx.lineTo(frame.x+i,frame.y+frame.height);ctx.stroke();
 }
 for(let i=0;i<frame.height;i+=42){
  ctx.beginPath();ctx.moveTo(frame.x,frame.y+i);
  ctx.lineTo(frame.x+frame.width,frame.y+i);ctx.stroke();
 }
 ctx.translate(frame.x+frame.width/2,frame.y+frame.height/2);
 ctx.scale(scale,scale);ctx.translate(-cx,-cy);
 if(state.templateIncludeInExport)paintReference(ctx);
 paintBlueprintTrack(ctx,state.track);
 // Las letras se dibujan encima de las vías, después de los cruces, para
 // que sean legibles tanto en rectas como en curvas y en el puente.
 const markers=paintBlueprintIdentifiers(ctx,state.track,groups,refs,scale,
  {width:frame.width,height:frame.height,cx,cy});
 ctx.restore();
 // La sección de métricas se conserva debajo del plano ampliado.
 ctx.fillStyle="#102c35";ctx.fillRect(x,metricsY,bodyWidth,104);
 const length=(state.track.parts.length?state.track.length:recipe.nominalLength)/1000;
 const status=state.track.valid?"CIRCUITO CERRADO":
  state.loose.length?"MONTAJE EN PROGRESO":"EXTREMOS ABIERTOS";
 const metrics=[
  [String(recipe.pieces),"PIEZAS"],
  [length.toFixed(2)+" m","LONGITUD DE CARRERA"],
  [String(recipe.bridgeCount||Number(Boolean(state.track.bridge))),"KITS ELEVACIÓN"],
  [status,"ESTADO"]
 ];
 const col=bodyWidth/4;
 for(const [i,metric] of metrics.entries()){
  const px=x+21+i*col;
  ctx.fillStyle="#effff8";
  ctx.font=i===3?"800 23px system-ui,sans-serif":"900 34px system-ui,sans-serif";
  ctx.fillText(metric[0],px,metricsY+49);
  ctx.fillStyle="#85bbb4";ctx.font="750 16px system-ui,sans-serif";
  ctx.fillText(metric[1],px,metricsY+79);
 }
 ctx.fillStyle="#59e3c6";ctx.font="900 32px system-ui,sans-serif";
 ctx.fillText("RECETA DE PIEZAS",x,recipeHeadingY);
 ctx.textAlign="right";ctx.fillStyle="#8dbdb4";
 ctx.font="650 18px system-ui,sans-serif";
 ctx.fillText("LETRA EN PISTA = TIPO DE PIEZA",width-x,recipeHeadingY);
 ctx.textAlign="left";
 // Sólo la receta agrupada; el orden de montaje ya no forma parte del PNG.
 for(const [i,item] of recipe.items.entries()){
  const row=i>>1,side=i%2,rx=x+side*(bodyWidth/2),ry=recipeRowY+row*59;
  ctx.fillStyle=row%2?"#112831":"#172f37";
  ctx.fillRect(rx,ry,bodyWidth/2-10,51);
  const reference=refs.get(item.id);
  if(reference){
   ctx.fillStyle="#54ecc7";ctx.font="950 26px system-ui,sans-serif";
   ctx.fillText(reference,rx+12,ry+34);
  }
  ctx.fillStyle="#edfff7";ctx.font="750 22px system-ui,sans-serif";
  ctx.fillText(item.name,rx+(reference?56:13),ry+33);
  ctx.textAlign="right";ctx.fillStyle="#5aefca";
  ctx.font="900 26px system-ui,sans-serif";
  ctx.fillText("×"+item.count,rx+bodyWidth/2-31,ry+34);
  ctx.textAlign="left";
 }
 ctx.fillStyle="#779ba3";ctx.font="650 18px system-ui,sans-serif";
 ctx.fillText("SLOTRACE · Receta integrada · Medidas nominales en mm · Generado localmente",
  x,h-47);
 ctx.textAlign="right";ctx.fillText("TOP DOWN RACE: SLOTRACE",width-x,h-47);
 ctx.textAlign="left";
 return {width,height:h,recipe,bounds,scale,frame,
  markers,titleLines:nameLines,titleFontSize:nameSize,
  creator,creatorText,references:Object.fromEntries(refs),
  blueprintStyle:"white-track-black-seams"};
}
async function exportBlueprint(){
 const recipe=blueprintData();
 if(!recipe.pieces){toast("Construye al menos una pieza para exportar el plano.");return false;}
 const canvas=document.createElement("canvas");
 if(!canvas||typeof canvas.getContext!=="function"){toast("No se pudo preparar el plano.");return false;}
 const ctx=canvas.getContext("2d",{alpha:false});
 if(!ctx){toast("No hay soporte de dibujo para exportar.");return false;}
 drawBlueprint(ctx,recipe);
 const blob=await new Promise(resolve=>canvas.toBlob?canvas.toBlob(resolve,"image/png"):resolve(null));
 if(!blob){toast("No se pudo generar el PNG. Prueba en Safari.");return false;}
 const filename="slotrace-"+slugName(circuitLabel())+
  "-"+(state.driveDirection===1?"horario":"antihorario")+".png";
 const canShare=typeof navigator!=="undefined"&&typeof navigator.share==="function"&&
  typeof File==="function";
 if(canShare){
  const file=new File([blob],filename,{type:"image/png"});
  if(typeof navigator.canShare!=="function"||navigator.canShare({files:[file]})){
   try{
    await navigator.share({files:[file],title:"Plano SlotRace",text:"Plano con receta de piezas"});
    return true;
   }catch(e){
    if(e?.name==="AbortError")return false; // Compartir cancelado
   }
  }
 }
 // Safari normal y navegadores sin Web Share: descarga estándar.
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=filename;a.rel="noopener";
 document.body.appendChild(a);a.click();a.remove();
 if(typeof window.setTimeout==="function")
  window.setTimeout(()=>URL.revokeObjectURL(url),60000);
 toast("Plano PNG generado con la receta adherida.");
 return true;
}

function resize(){
 // iPhone Safari ajusta el viewport varias veces al girar o esconder barras.
 // Sólo cambiamos el backing buffer cuando cambia realmente el tamaño.
 let changed=false;
 const dpr=Math.min(2,window.devicePixelRatio||1);
 for(const canvas of [editCanvas,raceCanvas]){
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)continue;
  const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){
   canvas.width=w;canvas.height=h;changed=true;
  }
 }
 if(changed)state.viewDirty=true;
}
let resizeQueued=false;
function scheduleResize(){
 if(resizeQueued)return;
 resizeQueued=true;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  resizeQueued=false;resize();
 }));
}
// Las cámaras de seguimiento conservan la altura y el ángulo.
// El aumento solo cambia desde Ajustes, no con la velocidad ni en puentes.
const FOLLOW_ZOOM=2;
const FOLLOW_CUSTOM_DEFAULT_ZOOM=5;
const FOLLOW_CUSTOM_MIN_ZOOM=2,FOLLOW_CUSTOM_MAX_ZOOM=30;
const FOLLOW_X_DEADZONE=.075; // Zona de descanso pequeña: no persigue cada vibración.
const FOLLOW_Y_DEADZONE=.075;
const FOLLOW_LOOKAHEAD=.20;    // Anticipación: reserva pantalla delante del coche.
const FOLLOW_LOOK_RESPONSE=3.2; // Cambia de dirección con calma, sin latigazos.
const FOLLOW_SAFE_EDGE=.25;    // El coche nunca entra en el 25 % exterior.
const FOLLOW_RESPONSE=7.0;     // Seguimiento clásico 2× (sin cambios).
const FOLLOW_CUSTOM_RESPONSE=10; // Filtro continuo: sin umbrales que produzcan latigazos.
function setCameraMode(mode){
 if(!["general","follow","custom"].includes(mode))return false;
 if(mode===state.cameraMode)return true;
 state.cameraMode=mode;
 state.followCamera.ready=false;
 save();updateUI();
 toast(mode==="custom"?
  "Seguimiento a medida activado · "+state.followZoom+"×.":
  mode==="follow"?"Cámara de seguimiento activada · zoom fijo 2×.":
  "Vista general activada · circuito completo.");
 return true;
}
function setFollowZoom(value){
 const raw=Number(value);
 const zoom=Number.isFinite(raw)?
  Math.max(FOLLOW_CUSTOM_MIN_ZOOM,Math.min(FOLLOW_CUSTOM_MAX_ZOOM,Math.round(raw*2)/2)):
  FOLLOW_CUSTOM_DEFAULT_ZOOM;
 if(zoom===state.followZoom)return zoom;
 state.followZoom=zoom;
 state.viewDirty=true;
 save();updateUI();
 return zoom;
}
function resetFollowCamera(){
 const p=drivingPose();
 if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)){
  state.followCamera.ready=false;return;
 }
 state.followCamera.x=p.x;state.followCamera.y=p.y;
 state.followCamera.lookX=0;state.followCamera.lookY=0;
 state.followCamera.ready=true;state.followCamera.settle=0;
}
function updateFollowCamera(dt){
 if(state.mode!=="race"||(state.cameraMode!=="follow"&&state.cameraMode!=="custom"))return;
 const f=state.followCamera;
 if(!state.run&&!state.laneTransition&&f.settle<=0)return;
 const p=displayDrivingPose();
 f.settle=Math.max(0,f.settle-dt);
 if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
 if(!f.ready){resetFollowCamera();return;}
 // Usamos el sentido físico del carril, nunca el giro visual del trompo.
 // Anticipamos la marcha y movemos el encuadre con suavidad, sin rotarlo.
 const v=makeView(raceCanvas,"race");
 const cos=Math.cos(v.angle),sin=Math.sin(v.angle);
 const step=Math.max(0,Math.min(dt,.05));
 const directionX=cos*Math.cos(p.h)-sin*Math.sin(p.h);
 const directionY=sin*Math.cos(p.h)+cos*Math.sin(p.h);
 const motion=Math.max(0,Math.min(1,state.speed/36));
 const targetLookX=directionX*v.w*FOLLOW_LOOKAHEAD*motion;
 const targetLookY=directionY*v.h*FOLLOW_LOOKAHEAD*motion;
 const lookAlpha=1-Math.exp(-FOLLOW_LOOK_RESPONSE*step);
 f.lookX+=(targetLookX-f.lookX)*lookAlpha;
 f.lookY+=(targetLookY-f.lookY)*lookAlpha;
 // A zoom alto, la guardia de borde de la cámara clásica producía saltos:
 // teletransportaba el encuadre entero en un único fotograma. La cámara
 // personalizada no usa ni zona muerta ni correcciones instantáneas.
 // Sigue un objetivo con anticipación filtrada y amortiguación temporal.
 if(state.cameraMode==="custom"){
  const targetX=p.x+(cos*f.lookX+sin*f.lookY)/v.scale;
  const targetY=p.y+(-sin*f.lookX+cos*f.lookY)/v.scale;
  const followAlpha=1-Math.exp(-FOLLOW_CUSTOM_RESPONSE*step);
  f.x+=(targetX-f.x)*followAlpha;
  f.y+=(targetY-f.y)*followAlpha;
  return;
 }
 const dx=p.x-f.x,dy=p.y-f.y;
 const sx=(cos*dx-sin*dy)*v.scale,sy=(sin*dx+cos*dy)*v.scale;
 // El centro apunta por delante del coche. La tolerancia evita el nerviosismo.
 const wantedX=sx+f.lookX,wantedY=sy+f.lookY;
 const ex=Math.sign(wantedX)*Math.max(0,Math.abs(wantedX)-v.w*FOLLOW_X_DEADZONE);
 const ey=Math.sign(wantedY)*Math.max(0,Math.abs(wantedY)-v.h*FOLLOW_Y_DEADZONE);
 const alpha=1-Math.exp(-FOLLOW_RESPONSE*step);
 f.x+=(cos*ex+sin*ey)/v.scale*alpha;
 f.y+=(-sin*ex+cos*ey)/v.scale*alpha;
 // Guardia de encuadre: jamás dejar el coche pegado al borde, ni al
 // acelerar repentinamente ni al girar en una chicane.
 const deltaX=p.x-f.x,deltaY=p.y-f.y;
 const finalX=(cos*deltaX-sin*deltaY)*v.scale;
 const finalY=(sin*deltaX+cos*deltaY)*v.scale;
 const guardX=Math.sign(finalX)*Math.max(0,Math.abs(finalX)-v.w*(.5-FOLLOW_SAFE_EDGE));
 const guardY=Math.sign(finalY)*Math.max(0,Math.abs(finalY)-v.h*(.5-FOLLOW_SAFE_EDGE));
 f.x+=(cos*guardX+sin*guardY)/v.scale;
 f.y+=(-sin*guardX+cos*guardY)/v.scale;
}

function makeView(canvas,mode){
 const dpr=Math.min(2,window.devicePixelRatio||1);
 const w=canvas.width/dpr,h=canvas.height/dpr;
 const portrait=typeof window.matchMedia==="function"?
  window.matchMedia("(orientation: portrait)").matches:
  (Number.isFinite(window.innerWidth)&&Number.isFinite(window.innerHeight)?
   window.innerHeight>window.innerWidth:h>w*1.1);
 const angle=portrait?Math.PI/2:0;
 // El zoom del editor usa una referencia FIJA: ampliar el circuito
 // no reduce el tamaño de cada pieza ni modifica la cámara.
 const target=mode==="build"?{left:0,top:0,right:TABLE.width,bottom:TABLE.height}:
  {left:state.track.bounds.left-160,right:state.track.bounds.right+160,
   top:state.track.bounds.top-160,bottom:state.track.bounds.bottom+160};
 const cx=(target.left+target.right)/2,cy=(target.top+target.bottom)/2;
 const bw=target.right-target.left,bh=target.bottom-target.top;
 const width=portrait?bh:bw,height=portrait?bw:bh;
 const base=Math.max(.000001,Math.min((w-16)/width,(h-16)/height));
 const follow=mode==="race"&&(state.cameraMode==="follow"||state.cameraMode==="custom");
 const zoom=mode==="build"?state.camera.zoom:follow?
  (state.cameraMode==="custom"?state.followZoom:FOLLOW_ZOOM):1;
 const scale=base*zoom;
 const panX=mode==="build"?state.camera.panX:0,panY=mode==="build"?state.camera.panY:0;
 const centerX=follow&&state.followCamera.ready?state.followCamera.x:cx;
 const centerY=follow&&state.followCamera.ready?state.followCamera.y:cy;
 return{w,h,angle,scale,cx:centerX,cy:centerY,panX,panY,dpr};
}
function transform(ctx,v){
 ctx.translate(v.w/2+v.panX,v.h/2+v.panY);ctx.rotate(v.angle);ctx.scale(v.scale,v.scale);ctx.translate(-v.cx,-v.cy);
}
function worldFromPointer(v,screenX,screenY){
 let x=(screenX-v.w/2-v.panX)/v.scale,y=(screenY-v.h/2-v.panY)/v.scale;
 const c=Math.cos(v.angle),s=Math.sin(v.angle);
 return{x:v.cx+c*x+s*y,y:v.cy-s*x+c*y};
}
const BUILDER_MIN_ZOOM=.0001,BUILDER_MAX_ZOOM=8;
function workspaceContentBounds(){
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 const take=p=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
  left=Math.min(left,p.x);right=Math.max(right,p.x);
  top=Math.min(top,p.y);bottom=Math.max(bottom,p.y);
 };
 for(const p of state.track.points)take(p);
 for(const item of state.loose){
  const spec=CATALOG[item.id];if(!spec)continue;
  const pose={x:item.x,y:item.y,h:item.h},count=spec.length?7:20;
  for(let i=0;i<=count;i++)take(positionOnPiece(pose,item.id,i/count));
 }
 const ref=state.reference;
 if(ref?.visible){
  const dx=ref.width*ref.scale/2,dy=ref.height*ref.scale/2,c=Math.cos(ref.angle),s=Math.sin(ref.angle);
  for(const x of [-dx,dx])for(const y of [-dy,dy])
   take({x:ref.x+x*c-y*s,y:ref.y+x*s+y*c});
 }
 return !Number.isFinite(left)?{left:0,top:0,right:TABLE.width,bottom:TABLE.height}:
  {left:left-180,right:right+180,top:top-180,bottom:bottom+180};
}
function fitWorkspace(){
 if(!editCanvas.width||!editCanvas.height)return false;
 const b=workspaceContentBounds(),v=makeView(editCanvas,"build");
 const topPad=Math.min(100,v.h*.18),bottomPad=Math.min(225,v.h*.28);
 const portrait=Math.abs(v.angle)>1;
 const bw=portrait?b.bottom-b.top:b.right-b.left;
 const bh=portrait?b.right-b.left:b.bottom-b.top;
 const wanted=Math.min(Math.max(90,v.w-65)/Math.max(1,bw),
  Math.max(90,v.h-topPad-bottomPad)/Math.max(1,bh));
 const base=v.scale/Math.max(.000001,state.camera.zoom);
 state.camera.zoom=Math.max(BUILDER_MIN_ZOOM,Math.min(BUILDER_MAX_ZOOM,wanted/base));
 const u=makeView(editCanvas,"build");
 const dx=(b.left+b.right)/2-u.cx,dy=(b.top+b.bottom)/2-u.cy;
 const c=Math.cos(u.angle),s=Math.sin(u.angle);
 state.camera.panX=-(c*dx-s*dy)*u.scale;
 state.camera.panY=(topPad-bottomPad)/2-(s*dx+c*dy)*u.scale;
 state.viewDirty=true;return true;
}
function revealLatestBuilderPiece(){
 if(state.mode!=="build"||!state.track.parts.length||!editCanvas.width)return;
 const p=state.track.ends?.end;
 if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
 const v=makeView(editCanvas,"build");
 if(v.w<80||v.h<160)return;
 const c=Math.cos(v.angle),sn=Math.sin(v.angle);
 const dx=p.x-v.cx,dy=p.y-v.cy;
 const x=v.w/2+v.panX+(c*dx-sn*dy)*v.scale;
 const y=v.h/2+v.panY+(sn*dx+c*dy)*v.scale;
 // En retrato: franja inferior de piezas y fila de herramientas.
 // En pantallas anchas: estante de piezas a la derecha.
 const sideShelf=v.w>680;
 const left=40,right=sideShelf?v.w-220:v.w-40;
 const top=110,bottom=sideShelf?v.h-105:v.h-245;
 if(right<=left||bottom<=top)return;
 if(x<left||x>right||y<top||y>bottom){
  const targetX=(left+right)/2,targetY=(top+bottom)/2;
  state.camera.panX+=targetX-x;
  state.camera.panY+=targetY-y;
  state.viewDirty=true;
 }
}

// Identifica siempre la pieza del puente seleccionada, incluso cuando
// queda oculta bajo otra pista. El intervalo muestra una vista previa.
function paintBridgeSelection(ctx){
 if(state.caseCategory!=="bridge"||state.selection<0||state.mode!=="build")return;
 const current=state.track.parts[state.selection];
 if(!current)return;
 if(state.bridgeRangeStart!=null){
  const indices=bridgeRangeIndices(state.bridgeRangeStart,state.selection);
  const points=indices.flatMap((i,k)=>{
   const part=state.track.parts[i];
   return part?.points?.slice(k?1:0)||[];
  });
  // Selección clara, sin colorear toda la calzada: el antiguo relleno
  // terminaba bruscamente en el conector y simulaba una pieza desencajada.
  // El contorno queda fuera de los carriles y permite ver las uniones.
  if(points.length>1){
   ctx.save();ctx.globalAlpha=.88;
   ctx.shadowColor="#f6d374";ctx.shadowBlur=5;
   for(const offset of [-TRACK_WIDTH/2-12,TRACK_WIDTH/2+12])
    strokePath(ctx,translated(points,offset),"#f6d374",4);
   ctx.restore();
  }
 }
 const p=positionOnPiece(current.start,current.id,.5);
 ctx.save();ctx.translate(p.x,p.y);
 ctx.shadowColor="#000a";ctx.shadowBlur=18;
 ctx.beginPath();ctx.arc(0,0,66,0,Math.PI*2);
 ctx.fillStyle="#0d3d45";ctx.fill();ctx.shadowBlur=0;
 ctx.lineWidth=8;ctx.strokeStyle="#a3ffe5";ctx.stroke();
 ctx.font="900 68px system-ui,-apple-system,sans-serif";
 ctx.textAlign="center";ctx.textBaseline="middle";
 ctx.fillStyle="#f3fff8";ctx.fillText(String(state.selection+1),0,3);
 ctx.restore();
}
// Marcar los dos conectores medidos. El texto está en el panel DOM,
// porque así sigue siendo legible incluso con zoom de 0,0001×.
function paintGapDiagnostic(ctx){
 const g=state.gapDiagnostic;if(!g?.from||!g?.to)return;
 const a=g.from,b=g.to;
 ctx.save();
 ctx.strokeStyle="#ffd27d";ctx.lineWidth=5;
 ctx.setLineDash([14,9]);ctx.beginPath();
 ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 ctx.setLineDash([]);
 for(const [p,color] of [[a,"#5ef5d5"],[b,"#ffacbc"]]){
  ctx.beginPath();ctx.arc(p.x,p.y,13,0,Math.PI*2);
  ctx.fillStyle=color;ctx.fill();
  ctx.strokeStyle="#102831";ctx.lineWidth=3;ctx.stroke();
 }
 ctx.restore();
}
function renderScene(canvas,mode){
 if(!canvas.width||!canvas.height)return;
 const ctx=canvasCtx.get(canvas),v=makeView(canvas,mode);
 ctx.setTransform(v.dpr,0,0,v.dpr,0,0);
 ctx.fillStyle="#0a141b";ctx.fillRect(0,0,v.w,v.h);
 ctx.save();transform(ctx,v);
 paintTable(ctx,v,mode);
 if(mode==="build")paintReference(ctx); // Nunca afecta al juego.
 paintGrid(ctx,v,mode);
 const track=state.track,hasBridge=Boolean(track.bridge);
 // La escapatoria se pinta bajo el plástico y bajo los soportes.
 // Nunca tapa ranuras, pianos ni la plataforma superior.
 paintSmartRunoffs(ctx,track,state.driveDirection);
 const p=mode==="race"?displayDrivingPose():drivingPose(0);
 // Un coche que circula por la propia rampa siempre queda sobre SU
 // superficie, incluso cerca del extremo de menor altura. Sólo el coche
 // de una vía inferior independiente puede quedar bajo el puente.
 const carAbove=hasBridge&&Boolean(track.elevation?.profiles?.[p?.pieceIndex]);
 // Las patas van bajo la pista. No dibujar una placa sobre el asfalto.
 for(const index of track.elevation?.raisedParts||[]){
  const part=track.parts[index];if(part)paintSupportKit(ctx,part,track);
 }
 // Dibujo continuo: los carriles de los módulos acoplados nunca se cortan.
 paintGroundTrack(ctx,track,mode==="build");
 paintLaneStencils(ctx,track);
 if(hasBridge){
  // Orden de capas: pista base → coche inferior → puente completo
  // (una banda opaca) → coche elevado. Sin recorte pequeño en el cruce.
  if(track.valid&&!carAbove)paintCar(ctx,p,state.lane);
  // La cubierta elevada se dibuja una sola vez, completa y opaca.
  // El repintado localizado por recortes añadía nuevos artefactos al
  // coincidir con bordes y curvas; queda fuera de la pasada de carrera.
  paintElevatedDeck(ctx,track);
  // No repintar franjas de pendiente en la pista ya acoplada:
  // acababan antes del conector y parecían raíles que no encajaban.
  // El perfil de altura real y los soportes siguen presentes.
  // Las marcas experimentales de piezas sueltas permanecen en el taller.
  if(state.xRayEnabled)paintXRayOverlay(ctx,track,
   mode==="race"&&track.valid&&!carAbove?p:null);
  // El coche de ARRIBA se pinta al final para que nunca lo crucen
  // las guías discontinuas del nivel inferior.
  if(track.valid&&carAbove)paintCar(ctx,p,state.lane);
 }else if(track.valid)paintCar(ctx,p,state.lane);
 // Las piezas aún sueltas son contenido del TALLER, no de la carrera.
 // Dibujarlas después de la cubierta permitía que sus carriles atravesasen
 // cualquier puente ya construido. La carrera sólo muestra la pista montada.
 if(mode==="build"){
  paintLoose(ctx);
  paintBridgeSelection(ctx);
  paintGapDiagnostic(ctx);
 }
 paintGhost(ctx,track);
 ctx.restore();
}
function screenToWorld(e){
 const rect=editCanvas.getBoundingClientRect(),v=makeView(editCanvas,"build");
 return worldFromPointer(v,e.clientX-rect.left,e.clientY-rect.top);
}
// Rotación táctil discreta: cada salto corresponde exactamente a 22,5°.
// La posición base se conserva durante todo el gesto para no acumular error.
const TOUCH_ROTATION_STEP=Math.PI/8;
const rotatePoint=(p,c,s,center)=>({
 x:center.x+(p.x-center.x)*c-(p.y-center.y)*s,
 y:center.y+(p.x-center.x)*s+(p.y-center.y)*c
});
// Zoom con dos dedos SIEMPRE, incluso si uno cae sobre una pieza.
// El giro ahora tiene dos botones directos: ↶ y ↷. No lo mezclamos con
// pellizcos que podrían alterar accidentalmente un circuito montado.
function startTwoFingerGesture(){
 const pair=[...state.pointer.values()];
 if(pair.length!==2)return;
 const dx=pair[1].x-pair[0].x,dy=pair[1].y-pair[0].y;
 const dragging=pair.some(p=>p.dragged);
 for(const p of pair)if(!dragging||!p.dragged)p.consumed=true;
 state.pinch={mode:"camera",distance:Math.hypot(dx,dy),
  zoom:state.camera.zoom};
}
function rotateGestureToSteps(g,steps){
 if(!Number.isInteger(steps)||steps===g.steps)return;
 if(!g.started){
  pushHistory(); // Un solo punto de deshacer por todo el gesto.
  if(g.target==="main"&&g.single){
   const moved=detachConnected(g.index,{history:false});
   if(moved<0)return;
   if(looseMembers(moved).length>1)detachLooseMember(moved);
   g.target="loose";g.index=moved;
  }else if(g.target==="loose"&&g.single){
   detachLooseMember(g.index);
  }
  if(g.target==="main"){
   const b=state.track.bounds;
   g.pivot={x:(b.left+b.right)/2,y:(b.top+b.bottom)/2};
   g.originalOrigin={...state.origin};
   state.selectedGroup="main";state.selectionMode="group";
   state.selection=g.index;state.looseSelection=-1;
  }else{
   g.indices=g.single?[g.index]:looseMembers(g.index);
   g.originalPieces=g.indices.map(i=>({i,...state.loose[i]}));
   const pts=g.indices.flatMap(i=>loosePart(state.loose[i],i).points);
   g.pivot={x:(Math.min(...pts.map(p=>p.x))+Math.max(...pts.map(p=>p.x)))/2,
    y:(Math.min(...pts.map(p=>p.y))+Math.max(...pts.map(p=>p.y)))/2};
   state.selectedGroup=looseGroupKey(g.index);
   state.selectionMode=g.single?"piece":"group";
   state.looseSelection=g.index;state.selection=-1;
  }
  g.started=true;
 }
 const angle=steps*TOUCH_ROTATION_STEP,c=Math.cos(angle),sn=Math.sin(angle);
 if(g.target==="main"){
  const p=rotatePoint(g.originalOrigin,c,sn,g.pivot);
  state.origin={x:p.x,y:p.y,h:g.originalOrigin.h+angle};
  state.track=buildTrack(state.types,state.origin,state.bridgeParts);
 }else for(const original of g.originalPieces){
  const p=rotatePoint(original,c,sn,g.pivot),item=state.loose[original.i];
  if(!item)continue;
  item.x=p.x;item.y=p.y;item.h=original.h+angle;
 }
 g.steps=steps;
 $("tableCaption").textContent="GIRANDO "+(steps*22.5).toLocaleString("es-ES")+
  "° · PASOS EXACTOS DE 22,5°";
 state.viewDirty=true;
}
function moveTwoFingerRotation(g){
 const pair=[...state.pointer.values()];
 if(pair.length!==2)return;
 const bearing=Math.atan2(pair[1].y-pair[0].y,pair[1].x-pair[0].x);
 g.travel+=angleDiff(bearing,g.bearing);
 g.bearing=bearing;
 const steps=Math.round(g.travel/TOUCH_ROTATION_STEP);
 rotateGestureToSteps(g,steps);
}
let dragOrigin=null;
function canvasPointerDown(e){
 if(state.mode!=="build")return;
 editCanvas.setPointerCapture(e.pointerId);
 const point=screenToWorld(e);
 if(state.reference&&!state.reference.locked){
  state.pointer.set(e.pointerId,{x:e.clientX,y:e.clientY,
   originX:e.clientX,originY:e.clientY,originWorld:point,
   templateDrag:true,startX:state.reference.x,startY:state.reference.y,
   dragged:false});
  if(state.pointer.size===2)startTwoFingerGesture();
  return;
 }
 // Si dos tramos se cruzan se prioriza el superior; toques repetidos
 // en el mismo punto alternan con el inferior sin alterar la geometría.
 const loose=nearestLoose(point.x,point.y);
 const looseIndex=loose.distance<TRACK_WIDTH*.55?loose.index:-1;
 const hitList=looseIndex<0?selectMainAtCrossing(point.x,point.y):[];
 const nearest=hitList[0]||{index:-1,distance:Infinity};
 const chosen=hitList.find(hit=>hit.index===state.selection)||nearest;
 const trackIndex=chosen.distance<TRACK_WIDTH*.55?chosen.index:-1;
 const key=trackIndex>=0?"main":looseIndex>=0?looseGroupKey(looseIndex):null;
 // Tocar dos veces alterna pieza ↔ tramo. Al arrastrar se conserva
 // el modo de selección sin convertir el gesto en otro toque.
 const samePiece=trackIndex>=0?state.selection===trackIndex:state.looseSelection===looseIndex;
 const dragMode=key&&key===state.selectedGroup&&state.selectionMode==="piece"&&samePiece?"piece":"group";
 state.pointer.set(e.pointerId,{
  x:e.clientX,y:e.clientY,originX:e.clientX,originY:e.clientY,
  originWorld:point,looseIndex,trackIndex,trackCandidates:hitList.map(hit=>hit.index),dragMode,dragged:false,
  pieceStart:looseIndex>=0?{...state.loose[looseIndex]}:null
 });
 if(state.pointer.size===2)startTwoFingerGesture();
}
function canvasPointerMove(e){
 const p=state.pointer.get(e.pointerId);if(!p)return;
 const oldX=p.x,oldY=p.y;p.x=e.clientX;p.y=e.clientY;
 const distance=Math.hypot(p.x-p.originX,p.y-p.originY);
 if(p.templateDrag){
  if(state.pointer.size!==1||p.consumed)return;
  const to=screenToWorld(e);
  if(distance>=3)p.dragged=true;
  if(p.dragged&&state.reference){
   state.reference.x=p.startX+to.x-p.originWorld.x;
   state.reference.y=p.startY+to.y-p.originWorld.y;
   state.viewDirty=true;
  }
  return;
 }
 if(state.pointer.size>=2&&state.pinch?.mode==="rotate"){
  moveTwoFingerRotation(state.pinch);return;
 }
 // Tras acabar un gesto de dos dedos, el dedo restante nunca activa
 // accidentalmente el arrastre normal ni cambia la selección.
 if(p.consumed&&state.pointer.size<2)return;
 if(state.pointer.size===1&&p.trackIndex>=0&&distance>=7){
  if(!p.dragged){
   if(p.dragMode==="piece"){
    const looseIndex=detachConnected(p.trackIndex,{history:true});
    if(looseIndex>=0){
     // Desacoplar el módulo que sigue bajo el dedo del resto del grupo.
     // Sin esto, el conector final del tramo original lo vuelve a enganchar.
     if(looseMembers(looseIndex).length>1)detachLooseMember(looseIndex);
     state.selectionMode="piece";state.selectedGroup="single-"+looseIndex;
     state.looseSelection=looseIndex;state.selection=-1;
     p.looseIndex=looseIndex;p.trackIndex=-1;p.pieceStart={...state.loose[looseIndex]};
     p.dragged=true;p.dragMode="piece";
    }
   }else{
    pushHistory();p.dragged=true;p.moveMain=true;
    p.startOrigin={...state.origin};
    state.selectedGroup="main";state.selectionMode="group";state.selection=p.trackIndex;
    state.looseSelection=-1;
   }
  }
 }
 if(state.pointer.size===1&&p.moveMain){
  const to=screenToWorld(e);
  state.origin={
   x:coordinate(p.startOrigin.x+to.x-p.originWorld.x),
   y:coordinate(p.startOrigin.y+to.y-p.originWorld.y),
   h:p.startOrigin.h
  };
  state.track=buildTrack(state.types,state.origin,state.bridgeParts);
  extendWorkBoard();
  state.viewDirty=true;return;
 }
 if(state.pointer.size===1&&p.looseIndex>=0){
  if(distance<7&&!p.dragged)return;
  if(!p.dragged){
   pushHistory();p.dragged=true;
   if(p.dragMode==="piece"&&looseMembers(p.looseIndex).length>1)
    detachLooseMember(p.looseIndex);
   p.memberIndices=p.dragMode==="group"?looseMembers(p.looseIndex):[p.looseIndex];
   p.memberPositions=p.memberIndices.map(i=>({i,x:state.loose[i].x,y:state.loose[i].y}));
   state.selectionMode=p.dragMode;state.selectedGroup=looseGroupKey(p.looseIndex);
   state.looseSelection=p.looseIndex;state.selection=-1;
  }
  if(!p.memberPositions){
   p.memberIndices=[p.looseIndex];
   p.memberPositions=[{i:p.looseIndex,x:p.pieceStart.x,y:p.pieceStart.y}];
  }
  const to=screenToWorld(e);
  const pivot=p.memberPositions.find(v=>v.i===p.looseIndex)||p.memberPositions[0];
  const x=coordinate(pivot.x+to.x-p.originWorld.x);
  const y=coordinate(pivot.y+to.y-p.originWorld.y);
  for(const original of p.memberPositions){
   const piece=state.loose[original.i];if(!piece)continue;
   piece.x=original.x+x-pivot.x;piece.y=original.y+y-pivot.y;
  }
  extendWorkBoard();
  state.viewDirty=true;return;
 }
 if(state.pointer.size>=2&&state.pinch){
  const list=[...state.pointer.values()],a=list[0],b=list[1];
  const dist=Math.hypot(a.x-b.x,a.y-b.y);
  state.camera.zoom=Math.max(BUILDER_MIN_ZOOM,Math.min(BUILDER_MAX_ZOOM,state.pinch.zoom*dist/Math.max(1,state.pinch.distance)));
  state.camera.panX+=(e.clientX-oldX)/2;state.camera.panY+=(e.clientY-oldY)/2;
 }else{
  state.camera.panX+=e.clientX-oldX;state.camera.panY+=e.clientY-oldY;
 }
 state.viewDirty=true;
}
function canvasPointerEnd(e){
 const p=state.pointer.get(e.pointerId);if(!p)return;
 state.pointer.delete(e.pointerId);
 if(p.templateDrag){
  if(state.pointer.size<2)state.pinch=null;
  if(p.dragged){save();updateTemplateUI();}
  return;
 }
 if(state.pointer.size<2&&state.pinch){
  const g=state.pinch;state.pinch=null;
  if(g.mode==="rotate"&&g.started){
   if(g.target==="main")extendWorkBoard();
   save();updateUI();
   toast("Tramo girado "+(g.steps*22.5).toLocaleString("es-ES")+"° · pasos exactos de 22,5°");
  }
 }
 if(p.consumed)return;
 if(p.dragged){
  if(p.looseIndex>=0&&!snapLoose(p.looseIndex,{history:false})){
   save();updateUI();
  }
  if(p.moveMain){
   // El grupo principal también es un imán: al moverlo, enganchar un grupo
   // suelto próximo, aunque sea de varias piezas y llegue al revés.
   const groupsSeen=new Set(),matches=[];
   if(!state.track.closed)for(let i=0;i<state.loose.length;i++){
    const group=looseGroup(i);
    if(!group||groupsSeen.has(group.key))continue;
    groupsSeen.add(group.key);
    const match=bestMagnet(i);
    if(match?.kind==="main")matches.push({i,score:match.score});
   }
   matches.sort((a,b)=>a.score-b.score);
   if(matches.length)snapLoose(matches[0].i,{history:false});
   extendWorkBoard();save();updateUI();
  }
  state.dragLoose=-1;
  return;
 }
 if(state.pointer.size===0&&Math.hypot(p.x-p.originX,p.y-p.originY)<10){
  if(p.looseIndex>=0){
   state.lastTapHit=null;selectByTap("loose",p.looseIndex);
  }else if(p.trackIndex>=0){
   // Prioridad: pulsaciones sucesivas alternan pieza/tramo sin saltar
   // a otra pieza debajo de un cruce.
   selectByTap("main",p.trackIndex);
   state.lastTapHit={x:p.originWorld.x,y:p.originWorld.y,
    candidates:p.trackCandidates||[p.trackIndex],index:p.trackIndex};
  }else{
   state.lastTapHit=null;state.selectedGroup=null;
   state.selection=-1;state.looseSelection=-1;updateUI();
  }
 }
}
function initEvents(){
 for(const [category,id] of Object.entries(CASE_TABS))
  $(id).addEventListener("click",()=>chooseCaseCategory(category));
 $("casePrev").addEventListener("click",()=>changeCasePage(-1));
 $("caseNext").addEventListener("click",()=>changeCasePage(1));
 $("pieceShelfBack").addEventListener("click",()=>scrollPieceShelf(-1));
 $("pieceShelfForward").addEventListener("click",()=>scrollPieceShelf(1));
 $("moveGroup").addEventListener("click",activateGroupMove);
 for(const [button,section] of [
  ["menuLibrary","library"],["menuGarage","garage"],["menuStore","store"],["menuSettings","settings"]
 ])$(button).addEventListener("click",()=>showHub(section));
 // Todos los destinos comparten el mismo orden y posición.
 for(const [button,action] of [
  ["navMenu",showMenu],["navBuild",openWorkshop],
  ["navLibrary",()=>showHub("library")],["navGarage",()=>showHub("garage")],
  ["navStore",()=>showHub("store")],["mastSettings",()=>showHub("settings")]
 ])$(button).addEventListener("click",action);
 for(const id of ["libraryHome","garageHome","storeHome","settingsHome"])
  $(id).addEventListener("click",showMenu);
 $("libraryBuild").addEventListener("click",openWorkshop);
 $("libraryTabCircuits").addEventListener("click",()=>setLibraryTab("circuits"));
 $("libraryTabRecords").addEventListener("click",()=>setLibraryTab("records"));
 $("garageRace").addEventListener("click",menuRace);
 $("garageChooseGripline").addEventListener("click",()=>selectCar("gripline"));
 $("garageChooseSpark").addEventListener("click",()=>selectCar("spark"));
 $("storeImport").addEventListener("click",()=>showHub("library"));
 for(const [category,meta] of Object.entries(SHOP_CATEGORIES))
  $(meta.button).addEventListener("click",()=>shopSelectCategory(category));
 const openFromList=e=>{
  const btn=e.target.closest?.("[data-shop-product]");
  if(btn)shopOpenProduct(btn.dataset.shopProduct);
 };
 $("shopProducts").addEventListener("click",openFromList);
 $("shopFeatured").addEventListener("click",openFromList);
 $("shopOwnedList").addEventListener("click",openFromList);
 $("shopModalContent").addEventListener("click",e=>{
  const b=e.target.closest?.("[data-shop-plan]");
  if(b)shopOpenProduct(b.dataset.shopPlan);
 });
 $("shopShowCollection").addEventListener("click",()=>{
  state.shopCollectionExpanded=!state.shopCollectionExpanded;renderShop();
 });
 $("shopNavHome").addEventListener("click",showMenu);
 $("shopNavBuild").addEventListener("click",openWorkshop);
 $("shopNavCollection").addEventListener("click",()=>{
  state.shopCollectionExpanded=true;renderShop();
  $("shopCollectionSection").scrollIntoView?.({behavior:"smooth",block:"start"});
 });
 $("shopModalClose").addEventListener("click",shopCloseProduct);
 $("shopModalSecondary").addEventListener("click",shopCloseProduct);
 $("shopModalPrimary").addEventListener("click",shopPrimaryAction);
 $("shopProductModal").addEventListener("click",e=>{
  if(e.target===$("shopProductModal"))shopCloseProduct();
 });
 window.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!$("shopProductModal").hidden){e.preventDefault();shopCloseProduct();}
 });
 $("settingsSound").addEventListener("click",()=>{
  state.clicksEnabled=!state.clicksEnabled;
  if(state.clicksEnabled)initDialAudio();
  save();updateUI();
 });
 $("settingsMotor").addEventListener("click",()=>{
  state.motorEnabled=!state.motorEnabled;
  if(state.motorEnabled)primeMotorAudio();
  save();updateUI();
 });
 $("settingsGrid").addEventListener("click",()=>{
  state.gridEnabled=!state.gridEnabled;save();updateUI();
 });
 $("settingsXRay").addEventListener("click",()=>{
  state.xRayEnabled=!state.xRayEnabled;
  state.viewDirty=true;save();updateUI();
 });
 $("settingsTableWine").addEventListener("click",()=>setTableTheme("wine"));
 $("settingsTableCyan").addEventListener("click",()=>setTableTheme("cyan"));
 $("settingsCameraGeneral").addEventListener("click",()=>setCameraMode("general"));
 $("settingsCameraFollow").addEventListener("click",()=>setCameraMode("follow"));
 $("settingsCameraCustom").addEventListener("click",()=>setCameraMode("custom"));
 $("settingsCameraZoom").addEventListener("input",e=>setFollowZoom(e.target.value));
 $("menuRecipe").addEventListener("click",exportRecipe);
 $("menuSaveCircuit").addEventListener("click",saveCircuit);
 $("deleteCircuitCancel").addEventListener("click",cancelCircuitDeletion);
 $("deleteCircuitConfirm").addEventListener("click",confirmCircuitDeletion);
 $("circuitDeleteDialog").addEventListener("click",e=>{
  if(e.target===$("circuitDeleteDialog"))cancelCircuitDeletion();
 });
 window.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&pendingDeleteCircuitId){e.preventDefault();cancelCircuitDeletion();}
 });
 $("libraryRecoverDraft").addEventListener("click",recoverDraftToLibrary);
 $("workSaveCircuit").addEventListener("click",saveCircuit);
 $("importCircuitFile").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(file)await importRecipe(file);
  e.target.value="";
 });
 $("resultsBack").addEventListener("click",openWorkshop);
 $("resultsHome").addEventListener("click",showMenu);
 $("resultsAgain").addEventListener("click",play);
 $("menuExport").addEventListener("click",exportBlueprint);
 $("exportBlueprint").addEventListener("click",exportBlueprint);
 $("templateToggle").addEventListener("click",()=>openTemplatePanel());
 $("templateClose").addEventListener("click",()=>openTemplatePanel(false));
 $("templateLoad").addEventListener("click",()=>$("templateFile").click());
 $("templateFile").addEventListener("change",async e=>{
  const file=e.target.files?.[0];
  if(file)await templateLoadFile(file);
  e.target.value="";
 });
 $("templateFit").addEventListener("click",templateFit);
 $("templateMove").addEventListener("click",templateToggleMove);
 $("templateVisibility").addEventListener("click",templateToggleVisibility);
 $("templateRemove").addEventListener("click",templateRemove);
 $("templateExport").addEventListener("change",e=>{
  state.templateIncludeInExport=Boolean(e.target.checked);
 });
 for(const [id,prop] of [["templateOpacity","opacity"],["templateScale","scale"],["templateRotate","angle"]]){
  const el=$(id);
  el.addEventListener("pointerdown",()=>{if(state.reference)pushHistory();});
  el.addEventListener("input",e=>templateSet(prop,e.target.value));
  el.addEventListener("change",e=>{templateSet(prop,e.target.value);save();});
 }
  $("menuContinue").addEventListener("click",openWorkshop);
 $("menuRace").addEventListener("click",menuRace);
 $("menuNew").addEventListener("click",createNewCircuit);
 $("menuClockwise").addEventListener("click",()=>setNewCircuitDirection(1));
 $("menuCounter").addEventListener("click",()=>setNewCircuitDirection(-1));
 $("goHome").addEventListener("click",()=>state.mode==="race"?endSession("menu"):showMenu());
 $("raceHome").addEventListener("click",()=>endSession("menu"));
 $("workDirection").addEventListener("click",()=>changeDriveDirection(-state.driveDirection));
  $("play").addEventListener("click",play);
 $("back").addEventListener("click",back);
 $("pause").addEventListener("click",pause);
 $("lane").addEventListener("click",switchLane);
 $("oval").addEventListener("click",()=>{changeTypes(STARTER.slice(),"Óvalo de prueba montado; las piezas sueltas vuelven a la caja.",[],START);resetWorkBoard();save();state.camera={panX:0,panY:0,zoom:1};});
 $("eight").addEventListener("click",()=>{
   changeTypes(FIGURE_EIGHT.slice(),"¡Ocho exacto! Dos rectas 600 y doce curvas de 45°, puente elevado.",[],START);resetWorkBoard();save();
   state.camera={panX:0,panY:0,zoom:1};
   save();
 });
 $("clear").addEventListener("click",()=>{
  changeTypes([],"Mesa vacía: coloca y mueve las piezas como un puzzle.",[],START);
  resetWorkBoard();save();updateUI();
 });
 $("undo").addEventListener("click",undo);$("redo").addEventListener("click",redo);
 $("remove").addEventListener("click",removeSelected);$("restore").addEventListener("click",recoverDraft);
 $("rotate").addEventListener("click",()=>rotateSelection(1));
 $("rotateCCW").addEventListener("click",()=>rotateSelection(-1));
 $("flip").addEventListener("click",flipSelectedCurve);
 $("curveDirection").addEventListener("click",toggleCaseCurveDirection);
 $("bridgeKit").addEventListener("click",installBridgeKit);
 $("bridgeDock").addEventListener("click",installBridgeKit);
 $("bridgePrev").addEventListener("click",()=>selectBridgeRelative(-1));
 $("bridgeNext").addEventListener("click",()=>selectBridgeRelative(1));
 $("bridgeRangeStart").addEventListener("click",markBridgeRangeStart);
 $("bridgeRangeEnd").addEventListener("click",()=>applyBridgeRange(false));
 $("bridgeRangeClear").addEventListener("click",()=>applyBridgeRange(true));
 $("measureGap").addEventListener("click",measureOpenGap);
 $("caseToggle").addEventListener("click",()=>{
  state.caseOpen=!state.caseOpen;
  save();updateUI();scheduleResize();
 });
 $("joinPiece").addEventListener("click",startSelectedPiece);
 $("gridToggle").addEventListener("click",()=>{
  state.gridEnabled=!state.gridEnabled;save();updateUI();
  toast(state.gridEnabled?"Retícula de 25 mm activada.":"Retícula desactivada.");
 });
 $("autoClose").addEventListener("click",closeExactly);
 $("zoomIn").addEventListener("click",()=>{state.camera.zoom=Math.min(BUILDER_MAX_ZOOM,state.camera.zoom*1.25);state.viewDirty=true;});
 $("zoomOut").addEventListener("click",()=>{state.camera.zoom=Math.max(BUILDER_MIN_ZOOM,state.camera.zoom/1.25);state.viewDirty=true;});
 $("zoomFit").addEventListener("click",fitWorkspace);
 for(const type of ["pointerdown","pointermove","pointerup","pointercancel","lostpointercapture"]){
  editCanvas.addEventListener(type,e=>{
   if(type==="pointerdown")canvasPointerDown(e);
   else if(type==="pointermove")canvasPointerMove(e);
   else canvasPointerEnd(e);
  });
 }
 editCanvas.addEventListener("wheel",e=>{
  if(state.mode!=="build")return;e.preventDefault();
  state.camera.zoom=Math.max(BUILDER_MIN_ZOOM,Math.min(BUILDER_MAX_ZOOM,state.camera.zoom*(e.deltaY>0?.9:1.1)));
  state.viewDirty=true;
 },{passive:false});
 $("clickSound").addEventListener("click",()=>{
  state.clicksEnabled=!state.clicksEnabled;
  if(state.clicksEnabled)initDialAudio();
  save();updateTriggerDisplay();
 });
 const trigger=$("trigger");
 trigger.addEventListener("pointerdown",triggerPointerDown);
 trigger.addEventListener("pointermove",triggerPointerMove);
 for(const name of ["pointerup","pointercancel","lostpointercapture"])trigger.addEventListener(name,triggerPointerEnd);
 window.addEventListener("keydown",e=>{
  if(e.code==="Escape"&&state.mode!=="menu"){
   if(state.mode==="race")endSession("menu");else showMenu();return;
  }
  if(state.mode==="race"&&(e.code==="Space"||e.code==="ArrowUp")&&e.target.tagName!=="INPUT"){e.preventDefault();state.keyboardGas=true;}
  if(state.mode==="race"&&e.code==="KeyP"){pause();}
 });
 window.addEventListener("keyup",e=>{if(e.code==="Space"||e.code==="ArrowUp")state.keyboardGas=false;});
 const pauseBackground=()=>{state.buttonGas=false;state.keyboardGas=false;state.gas=0;state.triggerGesture=null;if(state.mode==="race")state.run=false;updateHud();syncMotorAudio(performance.now(),true);};
 window.addEventListener("blur",pauseBackground);
 document.addEventListener("visibilitychange",()=>{if(document.hidden)pauseBackground();});
 window.addEventListener("resize",scheduleResize);
 if(window.visualViewport)window.visualViewport.addEventListener("resize",scheduleResize);
 if(typeof ResizeObserver!=="undefined"){
  new ResizeObserver(scheduleResize).observe($("tableSpace"));
  new ResizeObserver(scheduleResize).observe($("raceSpace"));
 }
}
function loop(now){
 const dt=Math.max(0,Math.min(.05,(now-state.latest)/1000));state.latest=now;
 simulation(dt);
 advanceLaneTransition(dt);
 syncMotorAudio(now);
 updateFollowCamera(dt);
 if(state.mode==="build"){
  if(state.viewDirty){renderScene(editCanvas,"build");state.viewDirty=false;}
 }else if(state.mode==="race"){
  renderScene(raceCanvas,"race");
  updateChronometer();
 }
 if(!state._hudTime||now-state._hudTime>100){state._hudTime=now;updateHud();}
 if(state.noticeUntil&&now>state.noticeUntil){$("toast").classList.remove("show");state.noticeUntil=0;}
 requestAnimationFrame(loop);
}
protectOrphanDraft();palette();initEvents();updateUI();resize();
 loadReferenceForState();requestAnimationFrame(loop);
window.slotraceLab={version:"DEV 0.14.54",state,curve90Presets:CURVE_90_PRESETS,curve90Parts:shelfParts,curveFamilies:CURVE_FAMILIES,
 template:{validReference,referenceStorage,loadReferenceForState,openTemplatePanel,
  templateLoadFile,templateFit,templateSet,templateToggleMove,
  templateToggleVisibility,templateRemove,paintReference,updateTemplateUI},
 showHub,setLibraryTab,savedCircuitRecords,selectSavedCircuit,setCameraMode,timing:{updateChronometer},camera:{makeView,resetFollowCamera,updateFollowCamera,setFollowZoom,FOLLOW_ZOOM,FOLLOW_CUSTOM_MIN_ZOOM,FOLLOW_CUSTOM_MAX_ZOOM},
 workspace:{makeView,visibleWorldBounds,workspaceContentBounds,fitWorkspace,extendWorkBoard,paintInfiniteWorkspace,paintGrid,setTableTheme,TABLE_THEMES,addLoose,BUILDER_MIN_ZOOM,BUILDER_MAX_ZOOM},
 lanes:{switchLane,advanceLaneTransition,displayDrivingPose,laneDistanceAtPiece,poseOnDrivingLane,LANE_CHANGE_SECONDS,laneAIndex,laneLabel,laneLetter},selectCar,shopBlueprintSvg,carImages,shopSelectCategory,shopOpenProduct,shopAcquire,shopInstallPlan,shopCloseProduct,shopOwned,shopPrimaryAction,shopProducts:SHOP_PRODUCTS,requestCircuitDeletion,cancelCircuitDeletion,confirmCircuitDeletion,recoverDraftToLibrary,restoreLastCircuitRevision,readCircuitRevisions,chooseCaseCategory,changeCasePage,scrollPieceShelf,removeLooseFromCase,activateGroupMove,inventoryAction,buildTrack,STARTER,FIGURE_EIGHT,CATALOG,openRace:play,back,endSession,completeLap,saveCircuit,loadSavedCircuit,exportRecipe,importRecipe,circuitPackage,showMenu,openWorkshop,createNewCircuit,changeDriveDirection,drivingPose,blueprintData,drawBlueprint,exportBlueprint,undo,redo,changeTypes,
rendering:{elevatedDeckRuns,groundDeckRuns,elevationJoins,crossingClipPolygons,paintBridgeSelection,traceXRayCarBody,strokeXRayLine,xRayDeckPolygons,clipXRayDeck,xRayGroundGuides,paintXRaySilhouette,paintXRayOverlay,paintGroundTrack,paintFinishLine,finishLaneMarkings,paintLaneStencils,paintElevatedDeck,paintVerifiedCrossings,paintOpaqueRibbon,paintContinuousTrack,renderScene},
puzzle:{measureOpenGap,nearestOpenGap,presentGapDiagnostic,paintGapDiagnostic,openGroups,loopFromLooseGroup,closeLooseLoop,closeExactly,detachConnected,startSelectedPiece,selectBridgeRelative,markBridgeRangeStart,applyBridgeRange,bridgeRangeIndices,selectMainAtCrossing,scatterLoose,snapLoose,loosePaintGroups,looseOverpasses,paintLoose,installBridgeKit,paintSupportKit,paintBridgeRampProfile,rotateGestureToSteps,rotateSelection,flipSelectedCurve,toggleCaseCurveDirection,screenToWorld,canvasPointerDown,canvasPointerMove,canvasPointerEnd,
 looseMembers,looseGroup,bestMagnet,selectByTap,workshopVisibleCenter,promoteLooseGroup,detachLooseMember},
 physics:{DRIVE,VEHICLE_DYNAMICS,curveRadius,curvePhase,curveStressEnvelope,cornerForces,curveLimit,advanceRearDynamics,visualCarPose,simulationStep:simulation}};
// La pantalla de carga sólo se oculta después de que la mesa y sus piezas
// hayan superado la inicialización y se haya pintado el primer fotograma.
requestAnimationFrame(()=>{
 const splash=$("loadingScreen");
 if(!splash)return;
 window.setTimeout(()=>{
  splash.classList.add("is-done");
  window.setTimeout(()=>{splash.hidden=true;},280);
 },550);
});
