"use strict";
// Comportamiento de mesa-puzzle. Ejecutar con node tests/puzzle-table.cjs.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
 const geo=await import("../src/track.mjs");
 const blueprint=await import("../src/blueprint.mjs");
 const source=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8")
  .replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?/gm,"")
  .replace("function paintSeam(ctx,p){","function paintSeam(ctx,p){window.__seamLog.push(p);")
  .replace("function strokePath(ctx,points,color,width){","function strokePath(ctx,points,color,width){if(color===\"#0c1518\"&&width===TRACK_WIDTH+19)window.__shadowLog.push(points.length);");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../src/site.css"),"utf8");
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 function node(id){
  return{id,children:[],listeners:{},dataset:{},style:{},textContent:"",innerHTML:"",disabled:false,hidden:false,
   width:390,height:600,clientWidth:390,value:"0",
   classList:{add(){},remove(){},toggle(){},contains(){return false}},
   attrs:{},setAttribute(n,v){this.attrs[n]=String(v)},setPointerCapture(){},appendChild(n){this.children.push(n);},
   addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)},
   getBoundingClientRect(){return{left:0,top:0,width:390,height:600,right:390,bottom:600}},
   querySelectorAll(){return this.children},
   querySelector(sel){
    if(sel===".bridge-kit-cta")return this.kitCta??=node("kit-cta");if(sel===".qty")return this.qty??=node("qty");
    if(sel===".grip"||sel===".foam-drag-grip")return this.grip??=node("grip");
    return null;
   }};
 }
 const elements=new Map(ids.map(id=>[id,node(id)]));
 const ctx=new Proxy({}, {get(_,k){return k==="createLinearGradient"?()=>({addColorStop(){}}):()=>{}},
  set(obj,k,v){obj[k]=v;return true;}});
 for(const id of ["editCanvas","raceCanvas"])elements.get(id).getContext=()=>ctx;
 const document={getElementById:id=>elements.get(id),createElement:()=>node("card"),
  addEventListener(){},hidden:false};
 const window={devicePixelRatio:1,innerWidth:390,innerHeight:844,__seamLog:[],__shadowLog:[],
  matchMedia:()=>({matches:true}),addEventListener(){},setTimeout:fn=>fn()};
 const saved=new Map(),localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
 const callbacks=[];const requestAnimationFrame=fn=>callbacks.push(fn);
 const keys=[...Object.keys(geo),...Object.keys(blueprint)],values=keys.map(k=>Object.hasOwn(geo,k)?geo[k]:blueprint[k]);
 const navigator={
  shared:null,canShare:()=>true,
  async share(payload){this.shared=payload;}
 };
 class TestFile{
  constructor(parts,name,opts){this.name=name;this.type=opts.type;this.parts=parts;}
 }
 new Function(...keys,"document","window","localStorage","performance","requestAnimationFrame","ResizeObserver","navigator","File",source)(
  ...values,document,window,localStorage,{now:()=>0},requestAnimationFrame,class{observe(){}},navigator,TestFile
 );
 const game=window.slotraceLab,st=game.state;
 assert.equal(game.version,"DEV 0.15.8");
 // El cronómetro ya no espera a la actualización de 100 ms del HUD.
 st.seconds=9.317;game.timing.updateChronometer();
 assert.equal(elements.get("lapTime").textContent,"9,317");
 st.seconds=9.334;game.timing.updateChronometer();
 assert.equal(elements.get("lapTime").textContent,"9,334");
 st.seconds=0;game.timing.updateChronometer();
 assert.match(source,/renderScene\(raceCanvas,"race"\);\s*updateChronometer\(\);/,
  "La lectura se pinta cada fotograma, no cada décima");
 assert.match(source,/function drawTableArtwork\(ctx,b\)/);
 assert.match(source,/strokeGeometryCache=new WeakMap\(\)/);
 // Marcas de fábrica en salida/meta: las letras son físicas, no
 // etiquetas relativas a la dirección del coche.
 const ovalMarks=game.rendering.finishLaneMarkings(geo.buildTrack(geo.STARTER));
 assert.equal(ovalMarks.length,2);
 assert.deepEqual(ovalMarks.map(m=>m.letter),["B","A"],
  "Óvalo estándar: A impresa en el interior de meta");
 assert.equal(ovalMarks[1].physicalLane,geo.finishInteriorPhysicalLane(geo.STARTER));
 const finishFirst=geo.buildTrack(geo.STARTER).parts[0];
 const nearMeta=geo.positionOnPiece(finishFirst.start,finishFirst.id,.20);
 assert.ok(Math.hypot(ovalMarks[0].x-ovalMarks[1].x,
  ovalMarks[0].y-ovalMarks[1].y)>geo.LANE_OFFSET,
  "Las letras quedan físicamente separadas junto a cada ranura");
 assert.ok(Number.isFinite(nearMeta.x)&&Number.isFinite(ovalMarks[1].h));
 const savedDirection=st.driveDirection;
 st.driveDirection=-1;
 assert.deepEqual(game.rendering.finishLaneMarkings(geo.buildTrack(geo.STARTER))
  .map(m=>m.letter),["B","A"],
  "La dirección de conducción nunca cambia las letras impresas");
 st.driveDirection=savedDirection;
 assert.deepEqual(game.rendering.finishLaneMarkings(geo.buildTrack(["S350"])),[],
  "No imprimir las letras en circuitos abiertos");
 const printedLetters=[];
 const stencilContext=new Proxy({},{
  get(_,name){return name==="fillText"?(value)=>printedLetters.push(value):()=>{};},
  set(target,name,value){target[name]=value;return true;}
 });
 game.rendering.paintLaneStencils(stencilContext,geo.buildTrack(geo.STARTER));
 assert.deepEqual(printedLetters,["B","A"],
  "El canvas realmente dibuja ambas letras en su ranura");
 assert.match(html,/id="laneIndicator"/);
 assert.match(css,/\.race-hint \.lane-indicator\.lane-b/);

 assert.match(html,/class="home-hero-photo"/);
 assert.match(html,/slotrace-duelo-curva\.avif/);
 assert.doesNotMatch(html,/class="hero-cars"/);
 assert.match(html,/avenir_gripline_threequarter\.webp/);
 assert.match(html,/helix_spark_threequarter\.webp/);
 assert.equal(st.mode,"menu","Arranque en menú, sin entrar al taller");
 assert.equal(elements.get("menuScreen").hidden,false,"Menú visible al iniciar");
 assert.equal(elements.get("mastBrand").hidden,true,
  "En bienvenida se oculta el logo repetido del juego");
 assert.equal(elements.get("mastWelcome").hidden,false,
  "La cabecera de bienvenida muestra identidad del piloto");
 assert.match(html,/id="mastAvatar"/,"Avatar de jugador visible y accesible");
 assert.match(html,/id="mastWelcomeNick"/,"Nick personalizado sin duplicar el título del juego");
 assert.match(css,/\.mast-welcome\[hidden\],\.mast \.brand\[hidden\]\{display:none!important\}/,
  "Las variantes de cabecera deben respetar hidden en Safari");
 assert.match(css,/body\[data-screen="menu"\] #mastMode\{display:none!important\}/,
  "No desperdiciar espacio con la etiqueta INICIO en la bienvenida");
 assert.equal(elements.get("buildScreen").hidden,true);
 assert.equal(elements.get("raceScreen").hidden,true);
 assert.equal(elements.get("goHome").hidden,true);
 assert.equal(elements.get("mainNavigation").hidden,false,
  "La bienvenida comparte el mismo pie de navegación con todas las pantallas");
 assert.equal(elements.get("navMenu").attrs["aria-current"],"page",
  "Inicio está seleccionado en la barra común");
 assert.match(css,/\.launcher-screen \.launcher-shortcuts\{display:none!important\}/,
  "No mostrar accesos rápidos duplicados sobre la barra");
 assert.match(css,/\.launcher-screen \.home-scroll\{[\s\S]*?overflow-y:auto!important/,
  "El contenido inicial puede desplazarse entre cabecera y pie");
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/,
  "La barra tiene seis destinos fijos");
 assert.match(css,/html,body\{background:#eef1f5\}/,
  "La zona inferior hereda el fondo claro en iOS");
 assert.match(html,/id="navRace"[^>]*aria-label="Ir a competir"/,
  "Competir cuenta con un acceso consistente");
 assert.match(html,/id="entryGate"/);
 assert.match(html,/id="entryLogin"/);
 assert.match(html,/id="entryRegister"/);
 assert.match(html,/id="entryGuest"/);
 assert.match(html,/id="raceLobbyScreen"/);
 assert.match(html,/id="raceCircuitSelect"/);
 assert.match(html,/id="raceStart"/);
 assert.match(css,/\.launcher-screen \.launcher-actions/);
 assert.match(html,/id="entryActions" class="entry-actions" hidden/,
  "El portal de acceso no puede enseñar botones durante la comprobación");
 assert.match(html,/id="entryGuest"[^>]*hidden/,
  "El modo local se muestra solo cuando ha terminado la verificación");
 assert.match(css,/\.entry-gate \.entry-actions\[hidden\]/,
  "Safari debe respetar hidden aunque .entry-actions defina display:grid");
 assert.match(css,/\.launcher-screen \.launcher-actions \.launcher-choice\.launcher-building strong\{\s*color:#ffffff!important/,
  "Construir: texto principal blanco incluso sobre los estilos antiguos");
 assert.match(css,/\.launcher-screen \.launcher-actions \.launcher-choice\.launcher-building small\{\s*color:#dceaf1!important/,
  "Construir: descripción clara en azul oscuro");
 assert.match(css,/white-space:normal!important/,
  "Las descripciones de tarjetas deben ocupar varias líneas en iPhone");
 for(const [id,mode] of [
  ["navBuild","build"],["navLibrary","library"],["navGarage","garage"],
  ["navStore","store"],["navMenu","menu"]]){
  elements.get(id).listeners.click[0]();
  assert.equal(st.mode,mode,"La barra común navega a "+mode);
  if(mode==="garage")assert.equal(elements.get("mastMode").textContent,"GARAJE");
  if(mode==="store")assert.equal(elements.get("mastMode").textContent,"TIENDA");
  assert.equal(elements.get("mainNavigation").hidden,false);
  if(mode!=="menu"){
   for(const id of ["navMenu","navRace","navBuild","navLibrary","navGarage","navStore"])
    assert.equal(elements.get(id).hidden,false,
     "Los seis destinos son visibles desde "+mode);
  }
 }
 elements.get("mastSettings").listeners.click[0]();
 assert.equal(st.mode,"settings","Ajustes ocupa el mismo lugar en la cabecera");
 assert.equal(elements.get("settingsScreen").hidden,false);
 assert.equal(elements.get("goHome").hidden,true,
  "El botón de inicio no se duplica si existe abajo");
 assert.equal(elements.get("mastMode").textContent,"AJUSTES");
 for(const id of ["navMenu","navRace","navBuild","navLibrary","navGarage","navStore"])
  assert.equal(elements.get(id).hidden,false,"Ajustes mantiene los seis destinos");
 elements.get("navMenu").listeners.click[0]();
 assert.equal(st.mode,"menu");

 assert.equal(elements.get("menuRace").disabled,false,
  "La opción Competir siempre abre el vestíbulo, incluso con pista abierta");
 game.menuRace();
 assert.equal(st.mode,"raceLobby","Competir abre su preparación específica");
 assert.equal(st.flow,"race");
 assert.equal(elements.get("raceLobbyScreen").hidden,false);
 assert.equal(elements.get("raceScreen").hidden,true,
  "No se inicia una carrera accidentalmente");
 assert.equal(elements.get("mainNavigation").hidden,false);
 assert.equal(elements.get("navBuild").hidden,false,
  "Construir no desaparece al entrar en modo piloto");
 assert.equal(elements.get("navRace").hidden,false);
 assert.equal(elements.get("raceStart").disabled,false,"Óvalo válido listo");
 game.showMenu();
 assert.equal(st.driveDirection,1,"Sentido horario predeterminado");
 game.openWorkshop();
 assert.equal(st.mode,"build");
 assert.equal(st.flow,"build");
 assert.equal(elements.get("mastBrand").hidden,false,
  "El taller conserva la marca SlotRace");
 assert.equal(elements.get("mastWelcome").hidden,true,
  "El saludo aparece solamente en bienvenida");
 assert.equal(elements.get("navRace").hidden,false,
  "El taller conserva Competir en la barra común");
 assert.equal(elements.get("navBuild").hidden,false);
 assert.match(html,/id="builderScroll"/);
 assert.match(html,/id="caseStraights"/);
 assert.match(html,/id="moveGroup"/);
 assert.match(html,/id="caseMountGuide"/);
 assert.match(html,/id="rotateCCW"/,"Giro antihorario siempre visible");
 assert.match(html,/class="screen builder-screen builder-workbench"/,
  "Mesa principal a pantalla completa");
 assert.match(html,/id="bridgeDock"/,"Puentes accesibles sin salir del estante");
 assert.equal(game.chooseCaseCategory("curve"),true);
 assert.equal(st.caseCategory,"curve");
 assert.equal(game.chooseCaseCategory("straight"),true);
 assert.equal(st.caseCategory,"straight");
 assert.equal(elements.get("buildScreen").hidden,false);
 game.showMenu();
 assert.equal(st.mode,"menu");
 // Los seis accesos del menú abren pantallas funcionales independientes.
 for(const [button,screen] of [
  ["menuLibrary","libraryScreen"],["menuGarage","garageScreen"],
  ["menuStore","storeScreen"],["menuSettings","settingsScreen"]]){
  elements.get(button).listeners.click[0]();
  assert.equal(elements.get(screen).hidden,false,button+" abre su pantalla");
  assert.equal(elements.get("menuScreen").hidden,true);
  game.showMenu();
 }
 assert.match(html,/avenir_gripline_threequarter\.webp/);
 assert.match(html,/helix_spark_threequarter\.webp/);
 // Tienda: cuatro categorías, cajas grandes y adquisiciones LOCALES sin pagos.
 assert.equal(game.shopProducts.length,10,"Catálogo inicial con diez referencias");
 elements.get("menuStore").listeners.click[0]();
 assert.equal(st.mode,"store");
 assert.match(elements.get("shopProducts").innerHTML,/Caja básica SR-Precision/);
 assert.match(elements.get("shopProducts").innerHTML,/Open Rally Box/);
 assert.equal(game.shopOwned("box-basic"),true,"La caja básica es propiedad inicial");
 assert.equal(game.shopOwned("car-gripline"),true,"Avenir Gripline incluido");
 assert.equal(game.shopOwned("plan-oval"),true,"Plano ovalado incluido en caja básica");
 assert.equal(game.shopSelectCategory("packs"),true);
 assert.match(elements.get("shopProducts").innerHTML,/Pack puente 65 mm/);
 assert.equal(game.shopSelectCategory("circuits"),true);
 assert.match(elements.get("shopProducts").innerHTML,/Catalunya Slot/);
 assert.doesNotMatch(elements.get("shopProducts").innerHTML,/Sprint urbano|Receta pendiente/);
 const catalunyaPlan=game.shopProducts.find(p=>p.id==="plan-catalunya");
 assert.ok(catalunyaPlan);
 assert.equal(catalunyaPlan.types.length,60);
 assert.equal(catalunyaPlan.creator,"Juanfrikazo-dev");
 assert.equal(game.shopOpenProduct("plan-catalunya"),true);
 assert.match(elements.get("shopModalContent").innerHTML,
  /CREADOR: Juanfrikazo-dev/,"La ficha oficial identifica al autor");
 game.shopCloseProduct();
 assert.deepEqual(catalunyaPlan.types.slice(0,7),["R3_225L","R4_225L","S600","S075","S350","S350","START350"]);
 assert.equal(catalunyaPlan.direction,-1,
   "Catalunya Slot debe avanzar al revés del montaje para correr en horario");
 const catTrack=geo.buildTrack(catalunyaPlan.types,catalunyaPlan.origin);
 assert.equal(catTrack.closed,true,"Catalunya cierra geométricamente");
 assert.equal(catTrack.valid,true,"Catalunya se puede instalar");
 assert.ok(Math.abs(catTrack.length/1000-18.89)<.04,"Longitud 18,89 m");
 const catSvg=game.shopBlueprintSvg(catalunyaPlan.types,catalunyaPlan.name,catalunyaPlan.origin);
 assert.match(catSvg,/60 piezas/);
 assert.match(elements.get("shopProducts").innerHTML,/is-catalunya/);
 assert.equal(game.shopSelectCategory("boxes"),true);
 assert.equal(game.shopOpenProduct("box-rally"),true);
 assert.equal(elements.get("shopProductModal").hidden,false);
 assert.match(elements.get("shopModalContent").innerHTML,/14 piezas|14 piezas|Ocho con puente/);
 assert.equal(game.shopAcquire("box-rally"),true,"Caja temática adquirida gratis");
 assert.equal(game.shopOwned("box-rally"),true);
 assert.equal(game.shopOwned("plan-eight"),true,"La caja desbloquea su receta");
 assert.equal(game.shopOwned("car-spark"),true,"Helix Spark coleccionable");
 const ownedAfter=JSON.parse(saved.get("slotrace-shop-owned-v1"));
 assert.ok(ownedAfter.includes("box-rally"),"Compra de pruebas se guarda separada");
 assert.equal(JSON.parse(saved.get("slotrace-circuit-library-v1")||"[]").length,0,
  "Adquirir una caja no sobrescribe ni genera circuitos en el inventario");
 game.shopCloseProduct();
 assert.equal(elements.get("shopProductModal").hidden,true);
 assert.equal(game.shopSelectCategory("cars"),true);
 assert.match(elements.get("shopProducts").innerHTML,/Helix Spark/);
 assert.equal(game.shopSelectCategory("invalid"),false);
 game.showMenu();
 elements.get("menuSettings").listeners.click[0]();
 const soundBefore=st.clicksEnabled,gridBefore=st.gridEnabled,motorBefore=st.motorEnabled;
 assert.equal(st.cameraMode,"general","La vista clásica sigue siendo la predeterminada");
 const standardView=game.camera.makeView(elements.get("raceCanvas"),"race");
 elements.get("settingsCameraFollow").listeners.click[0]();
 assert.equal(st.cameraMode,"follow");
 assert.equal(elements.get("settingsCameraFollow").attrs["aria-pressed"],"true");
 assert.equal(elements.get("settingsCameraGeneral").attrs["aria-pressed"],"false");
 assert.match(elements.get("settingsCameraDescription").textContent,/Zoom fijo de 2×/);
 assert.equal(JSON.parse(saved.get("slotrace-lab-10")).cameraMode,"follow",
  "La cámara seleccionada persiste en el dispositivo");
 const followView=game.camera.makeView(elements.get("raceCanvas"),"race");
 assert.ok(Math.abs(followView.scale/standardView.scale-2)<1e-9,
  "Seguimiento multiplica exactamente por 2 el zoom general");
 assert.equal(followView.angle,standardView.angle,
  "El seguimiento mantiene la orientación y no gira con el coche");
 elements.get("settingsCameraCustom").listeners.click[0]();
 assert.equal(st.cameraMode,"custom");
 assert.equal(elements.get("settingsCameraCustom").attrs["aria-pressed"],"true");
 assert.equal(elements.get("settingsCameraCustomPanel").hidden,false);
 assert.equal(elements.get("settingsCameraZoomValue").textContent,"5×");
 let customView=game.camera.makeView(elements.get("raceCanvas"),"race");
 assert.ok(Math.abs(customView.scale/standardView.scale-5)<1e-9,
  "El nuevo seguimiento empieza con 5×");
 assert.equal(customView.angle,standardView.angle);
 elements.get("settingsCameraZoom").listeners.input[0]({target:{value:"12.5"}});
 assert.equal(st.followZoom,12.5);
 assert.equal(elements.get("settingsCameraZoomValue").textContent,"12.5×");
 assert.equal(JSON.parse(saved.get("slotrace-lab-10")).followZoom,12.5,
  "El zoom elegido se conserva en el dispositivo");
 customView=game.camera.makeView(elements.get("raceCanvas"),"race");
 assert.ok(Math.abs(customView.scale/standardView.scale-12.5)<1e-9,
  "Se aplica el zoom seleccionado");
 assert.equal(game.camera.setFollowZoom(100),30,"Aumento máximo de 30×");
 assert.equal(game.camera.setFollowZoom(-2),2,"Aumento mínimo de 2×");
 assert.equal(game.camera.setFollowZoom("no-válido"),5,"Restaurar valor predeterminado");
 // Regresión visual: en 5× la cámara no puede pegar un salto entero
 // cuando el coche se aleja del centro (antes la guardia lo hacía).
 const cameraState={...st.followCamera},raceMode=st.mode,raceRun=st.run,raceSpeed=st.speed;
 st.mode="race";st.run=true;st.speed=0;
 const carPose=game.drivingPose();
 const zoom5=game.camera.makeView(elements.get("raceCanvas"),"race");
 st.followCamera.ready=true;
 st.followCamera.x=carPose.x+zoom5.w*.55/zoom5.scale;
 st.followCamera.y=carPose.y;
 st.followCamera.lookX=0;st.followCamera.lookY=0;st.followCamera.settle=0;
 const cameraFarX=st.followCamera.x;
 game.camera.updateFollowCamera(1/60);
 const firstStep=Math.hypot(st.followCamera.x-cameraFarX,
  st.followCamera.y-carPose.y)*zoom5.scale;
 assert.ok(firstStep<zoom5.w*.10,
  "En 5× no hay teletransporte al reencuadrar (<10 % pantalla/fotograma)");
 const afterFirst=st.followCamera.x;
 game.camera.updateFollowCamera(1/60);
 assert.ok(Math.abs(st.followCamera.x-carPose.x)<Math.abs(afterFirst-carPose.x),
  "El seguimiento se acerca progresivamente al coche");
 Object.assign(st.followCamera,cameraState);
 st.mode=raceMode;st.run=raceRun;st.speed=raceSpeed;
 elements.get("settingsCameraGeneral").listeners.click[0]();
 assert.equal(elements.get("settingsCameraCustomPanel").hidden,true);
 assert.equal(st.cameraMode,"general");
 assert.equal(game.camera.makeView(elements.get("raceCanvas"),"race").scale,standardView.scale);
 assert.equal(JSON.parse(saved.get("slotrace-lab-10")).cameraMode,"general");
 elements.get("settingsSound").listeners.click[0]();
 elements.get("settingsMotor").listeners.click[0]();
 elements.get("settingsGrid").listeners.click[0]();
 assert.equal(st.clicksEnabled,!soundBefore,"Clics configurables desde Ajustes");
 assert.equal(st.motorEnabled,!motorBefore,"Motor independiente");
 assert.equal(JSON.parse(saved.get("slotrace-lab-10")).motorEnabled,!motorBefore,"Motor guardado");
 assert.equal(st.gridEnabled,!gridBefore,"Cuadrícula configurable desde Ajustes");
 elements.get("settingsSound").listeners.click[0]();
 elements.get("settingsMotor").listeners.click[0]();
 elements.get("settingsGrid").listeners.click[0]();
 assert.equal(st.clicksEnabled,soundBefore);
 assert.equal(st.motorEnabled,motorBefore);
 assert.equal(st.gridEnabled,gridBefore);
 elements.get("settingsHome").listeners.click[0]();
 assert.equal(st.mode,"menu");
 elements.get("menuLibrary").listeners.click[0]();
 assert.equal(elements.get("menuExport").hidden,false);
 elements.get("libraryBuild").listeners.click[0]();
 assert.equal(st.mode,"build");
 game.showMenu();

 // La dirección se elige AL CREAR, no cambia el circuito guardado
 // hasta que el jugador pulsa expresamente "Crear circuito".
 elements.get("menuCounter").listeners.click[0]();
 assert.equal(st.newCircuitDirection,-1);
 assert.equal(st.driveDirection,1);
 const savedTypes=st.types.slice();
 elements.get("menuNew").listeners.click[0]();
 assert.equal(st.mode,"build");
 assert.equal(st.driveDirection,-1);
 assert.equal(st.types.length,0,"Nuevo circuito = mesa vacía");
 assert.deepEqual(st.draft.types,savedTypes,"Montaje anterior recuperable");
 const disk=JSON.parse(saved.get("slotrace-lab-10"));
 assert.equal(disk.driveDirection,-1,"El sentido sobrevive al reinicio");
 assert.deepEqual(disk.draft.types,savedTypes);

 // No se puede pulsar Correr para cambiar el circuito silenciosamente
 // por un óvalo: se respeta el circuito incompleto.
 game.showMenu();
 assert.equal(elements.get("menuRace").disabled,false,
  "Compite abre la selección incluso con una pista incompleta");
 assert.equal(game.menuRace(),true);
 assert.equal(st.mode,"raceLobby","En pista abierta se ofrece completar antes de correr");
 assert.equal(elements.get("raceStart").disabled,true);
 assert.equal(elements.get("raceFinishTrack").hidden,false);
 assert.equal(game.openRace(),false);
 assert.equal(st.types.length,0,"No reemplazar montaje por receta de demo");
 game.openWorkshop();
 game.changeTypes(geo.STARTER.slice(),"Óvalo para carreras",[],geo.START);
 assert.equal(st.track.valid,true);
 // En sentido inverso la posición es distancia NEGATIVA y la marcha
 // apunta 180° en sentido contrario. El carril físico también se invierte.
 st.lane=0;
 const sampled=game.drivingPose(230);
 const expected=geo.positionAt(st.track.lanes[1],-230);
 assert.ok(Math.hypot(sampled.x-expected.x,sampled.y-expected.y)<1e-8);
 assert.ok(Math.abs(Math.sin(sampled.h-expected.h-Math.PI))<1e-8);
 assert.equal(sampled.curve,-expected.curve);
 game.showMenu();
 assert.equal(elements.get("menuRace").disabled,false);
 elements.get("menuRace").listeners.click[0]();
 assert.equal(st.mode,"raceLobby","Menú Competir abre la preparación");
 elements.get("raceStart").listeners.click[0]();
 assert.equal(st.mode,"race","La carrera comienza solo al confirmar pista y coche");
 assert.equal(elements.get("mainNavigation").hidden,true,
  "El mando no pierde espacio por la barra general durante la carrera");
 assert.equal(elements.get("raceScreen").hidden,false);
 elements.get("raceHome").listeners.click[0]();
 assert.equal(st.mode,"menu","Salir de carrera vuelve al menú principal");
 assert.equal(st.run,false);
 game.openWorkshop();
 elements.get("workDirection").listeners.click[0]();
 assert.equal(st.driveDirection,1,"Cambiar dirección también desde taller");

 // Receta íntegra, con cantidades correctas y sentido reproducible.
 const rec=game.blueprintData();
 assert.equal(rec.pieces,geo.STARTER.length);
 assert.equal(rec.directionLabel,"HORARIO");
 assert.equal(rec.loose,0);
 const sum=rec.items.reduce((n,item)=>n+item.count,0);
 assert.equal(sum,rec.pieces,"No faltar piezas en el PNG");
 assert.equal(rec.sequence.length,geo.STARTER.length);
 assert.equal(rec.sequence[0].position,1);
 assert.match(source,/CAR_LENGTH_MM=98/,"Ambos coches usan tamaño cenital de 98 mm");
  assert.match(source,/assets\/cars\/helix_spark\.webp/,"Sprite cenital del Spark original");
 assert.match(source,/assets\/cars\/avenir_gripline\.webp/,"Usar piel original TDR");
 assert.doesNotMatch(source,/roundRect\(ctx,-70,-27,140,54/,
  "El coche procedural antiguo ha sido sustituido");

 // Canvas de prueba con instrumentación de textos. No hay red ni
 // motores externos y la exportación se hace completamente en local.
 const renderTexts=[],printStrokes=[],printFills=[];
 const pngCanvas={width:0,height:0,blobType:null,
  getContext(){return pngCtx;},
  toBlob(cb,type){this.blobType=type;cb({type,size:1234});}
 };
 const pngCtx=new Proxy({canvas:pngCanvas},{
  get(target,key){
   if(key in target)return target[key];
   if(key==="fillText")return(value)=>renderTexts.push(String(value));
   if(key==="stroke")return()=>printStrokes.push({
    color:target.strokeStyle,width:target.lineWidth
   });
   if(key==="fill")return()=>printFills.push(target.fillStyle);
   if(key==="createLinearGradient")return()=>({addColorStop(){}});
   return()=>{};
  },set(target,key,value){target[key]=value;return true;}
 });
 const meta=game.drawBlueprint(pngCtx,rec);
 assert.equal(meta.width,1500);
 assert.ok(meta.height>1400);
 assert.ok(renderTexts.includes("RECETA DE PIEZAS"),"Receta adherida al mismo PNG");
 assert.ok(!renderTexts.includes("ORDEN DE MONTAJE"),"El PNG ya no muestra orden de montaje");
 assert.ok(meta.frame.height>=1100,"Plano ampliado aprovechando el espacio liberado");
 assert.equal(meta.blueprintStyle,"white-track-black-seams");
 const referred=rec.items.filter(item=>!item.accessory);
 assert.equal(meta.markers.length,st.track.parts.length,
   "Cada pieza colocada tiene una referencia visible");
 assert.equal(Object.keys(meta.references).length,referred.length,
   "Una sola letra distinta para cada tipo de módulo");
 assert.ok(renderTexts.includes("LETRA EN PISTA = TIPO DE PIEZA"),
   "La leyenda explica cómo se leen las letras del plano");
 for(const item of referred){
  const code=meta.references[item.id];
  assert.match(code,/^[A-Z]+$/,"Referencia legible para "+item.id);
  assert.equal(meta.markers.filter(marker=>marker.id===item.id).length,item.count,
    "Número de etiquetas coincide con las piezas "+item.name);
  assert.ok(meta.markers.filter(marker=>marker.id===item.id).every(marker=>marker.code===code),
    "Las piezas del mismo tipo repiten el mismo código");
  assert.equal(renderTexts.filter(text=>text===code).length,item.count+1,
    "La referencia aparece en cada módulo y otra vez junto a la receta");
 }
 assert.equal(meta.references.BRIDGE_KIT,undefined,
   "El kit de apoyo no se etiqueta como vía física");

 assert.ok(printStrokes.some(v=>v.color==="#ffffff"&&v.width===geo.TRACK_WIDTH),
  "La superficie del circuito se pinta en blanco puro");
 assert.ok(printStrokes.some(v=>v.color==="#080c0f"&&v.width===5),
  "Las juntas de cada pieza se imprimen en negro");
 assert.ok(printStrokes.some(v=>v.color==="#10171a"&&v.width===geo.TRACK_WIDTH+8),
  "El contorno negro separa la vía blanca del fondo verde");
 assert.ok(meta.scale>0,"El circuito sigue centrado y encuadrado");
 assert.ok(renderTexts.some(v=>v.includes("HORARIO")),"Dirección visible en plano");
 assert.ok(renderTexts.some(v=>v.includes("×")),"Cantidades por modelo visibles");
 assert.ok(renderTexts.some(v=>v.includes("Recta")||v.includes("Salida")),
  "La receta muestra los nombres de las piezas, sin códigos de montaje");
 // El nombre queda completamente por ENCIMA de la ventana del plano.
 assert.ok(meta.frame.y>=300,"La cabecera tiene una franja exclusiva para el nombre");
 const originalBlueprintName=st.circuitName;
 st.circuitName="Mónaco Slot";
 const monacoTitle=game.drawBlueprint(pngCtx,rec);
 assert.deepEqual(monacoTitle.titleLines,["Mónaco Slot"]);
 assert.equal(monacoTitle.creator,"Juanfrikazo-dev","Autor de Mónaco Slot");
 assert.equal(monacoTitle.creatorText,"CREADOR: Juanfrikazo-dev");
 assert.ok(renderTexts.includes("CREADOR: Juanfrikazo-dev"),
  "La firma se dibuja dentro del PNG, no solo en su metadata");
 assert.equal(game.circuitPackage().creator,"Juanfrikazo-dev",
  "La receta JSON de Mónaco conserva el nombre del creador");
 assert.ok(monacoTitle.frame.y>74+151+monacoTitle.titleFontSize,
  "La pista no vuelve a pintar encima del título");
 st.circuitName="Mónaco Slot especial con curvas históricas compactas y cerradas";
 const longTitle=game.drawBlueprint(pngCtx,rec,{width:920});
 assert.equal(longTitle.titleLines.join(" "),st.circuitName,
  "Nunca perder caracteres del nombre de un circuito");
 assert.ok(longTitle.titleLines.length<=2,"El nombre largo ocupa un máximo de dos líneas");
 assert.ok(longTitle.frame.y>74+151+(longTitle.titleLines.length-1)*40+longTitle.titleFontSize,
  "El título multilinea tampoco entra en el marco");
 st.circuitName=originalBlueprintName;
 // Varios módulos cortos juntos requieren etiquetas independientes legibles.
 const shortPieces=Array.from({length:6},(_,i)=>({
  id:"R1_45R",x:2250+(i%3)*33,y:480+Math.floor(i/3)*36,h:0
 }));
 st.loose.push(...shortPieces);
 const compactMeta=game.drawBlueprint(pngCtx,game.blueprintData());
 const smallMarkers=compactMeta.markers.slice(-shortPieces.length);
 assert.equal(smallMarkers.length,shortPieces.length);
 for(let i=0;i<smallMarkers.length;i++){
  const a=smallMarkers[i];
  assert.equal(a.id,"R1_45R");
  assert.ok(Number.isFinite(a.sx)&&Number.isFinite(a.sy));
  assert.ok(a.sx>a.radius&&a.sx<compactMeta.frame.width-a.radius);
  assert.ok(a.sy>a.radius&&a.sy<compactMeta.frame.height-a.radius);
  for(let j=0;j<i;j++){
   const b=smallMarkers[j];
   assert.ok(Math.hypot(a.sx-b.sx,a.sy-b.sy)>=a.radius+b.radius+4,
    "Las letras de dos curvas juntas nunca deben taparse");
  }
 }
 st.loose.splice(-shortPieces.length);
 document.createElement=tag=>tag==="canvas"?pngCanvas:node("card");
 const result=await game.exportBlueprint();
 assert.equal(result,true,"Exportador abre menú de compartir en iOS");
 assert.equal(pngCanvas.blobType,"image/png");
 assert.ok(navigator.shared,"API de compartir recibió el archivo");
 assert.equal(navigator.shared.files[0].type,"image/png");
 assert.match(navigator.shared.files[0].name,/\.png$/);
 assert.ok(navigator.shared.files[0].parts[0].size>0);

// También se identifican módulos sueltos que todavía no se han unido
// al trazado principal. No introducir un orden numerado.
 st.loose.push({id:"S075",x:1650,y:650,h:0});
 const partial=game.blueprintData();
 const partialMeta=game.drawBlueprint(pngCtx,partial);
 assert.equal(partialMeta.markers.length,st.track.parts.length+1,
  "Incluye una marca para cada pieza suelta junto a las ya montadas");
 assert.equal(partialMeta.markers.at(-1).id,"S075");
 assert.equal(partialMeta.markers.at(-1).code,partialMeta.references.S075);
 assert.ok(!renderTexts.includes("ORDEN DE MONTAJE"),
  "El plano con piezas sueltas sigue sin incluir montaje numerado");
 st.loose.pop();



 // Mis circuitos: nombrar, guardar, reabrir y mostrar el nombre en el plano.
 game.openWorkshop();
 elements.get("workCircuitName").value="Ocho de pruebas";
 assert.equal(game.saveCircuit(),true);
 const library=JSON.parse(saved.get("slotrace-circuit-library-v1"));
 assert.equal(library.length,1);
 assert.equal(library[0].name,"Ocho de pruebas");
 assert.deepEqual(library[0].snapshot.types,st.types);
 assert.equal(game.circuitPackage().name,"Ocho de pruebas");
 // REGRESIÓN: guardar Splash con la ficha de OchoA abierta NO puede borrarla.
 const previousId=library[0].id,previousPieces=library[0].snapshot.types.slice();
 elements.get("workCircuitName").value="Splash";
 assert.equal(game.saveCircuit(),true,"Cambiar nombre crea un circuito nuevo");
 const both=JSON.parse(saved.get("slotrace-circuit-library-v1"));
 assert.equal(both.length,2,"Splash y el anterior permanecen en el inventario");
 assert.deepEqual(both.map(x=>x.name),["Splash","Ocho de pruebas"]);
 assert.notEqual(both[0].id,previousId);
 assert.deepEqual(both[1].snapshot.types,previousPieces,"La receta anterior queda intacta");
 elements.get("workCircuitName").value="Ocho de pruebas";
 assert.equal(game.saveCircuit(),false,"No permite sustituir otro circuito por nombre duplicado");
 assert.equal(JSON.parse(saved.get("slotrace-circuit-library-v1")).length,2);
 assert.equal(game.loadSavedCircuit(previousId),true,"Ocho de pruebas puede reabrirse");
 const layout=st.types.slice();
 game.changeTypes([],"Mesa de prueba vacía",[],geo.START);
 assert.equal(game.loadSavedCircuit(library[0].id),true);
 assert.deepEqual(st.types,layout);
 const namePrint=[];
 game.drawBlueprint(new Proxy({canvas:{width:0,height:0}},{
  get(target,key){if(key in target)return target[key];
   if(key==="fillText")return v=>namePrint.push(String(v));
   if(key==="createLinearGradient")return()=>({addColorStop(){}});
   return()=>{};},
  set(target,key,value){target[key]=value;return true;}
 }),game.blueprintData());
 assert.ok(namePrint.includes("Ocho de pruebas"));

 // Los tiempos de TODAS las vueltas se ven al salir, pero no se persisten.
 game.openRace();
 assert.equal(st.raceStarted,false,"Nuevo circuito cargado: salida en espera");
 assert.equal(st.seconds,0);
 game.physics.simulationStep(.3);
 assert.equal(st.seconds,0,"El reloj no avanza sin gas");
 st.keyboardGas=true;
 game.physics.simulationStep(.02);
 assert.equal(st.raceStarted,true,"Acelerar con teclado inicia la salida");
 assert.ok(st.seconds>0&&st.seconds<=.021);
 st.keyboardGas=false;
 const elapsed=st.seconds;
 game.physics.simulationStep(.04);
 assert.ok(st.seconds>elapsed,"El cronómetro sigue aunque se suelte el acelerador");
 game.openRace();
 assert.equal(st.raceStarted,false,"Otra sesión vuelve a esperar la salida");
 assert.equal(st.seconds,0);
 st.seconds=16.75;game.completeLap();
 st.seconds=15.20;game.completeLap();
 st.seconds=16.10;game.completeLap();
 st.lane=1;st.seconds=8.266;game.completeLap();
 assert.deepEqual(st.sessionLaps.map(l=>l.seconds),[16.75,15.20,16.10,8.266]);
 assert.equal(st.records["library-"+library[0].id+"-"+st.types.join("-")+"-rear-physics-v4"][0],15.20);
 assert.equal(game.endSession("menu"),true);
 assert.equal(st.mode,"results");
 assert.equal(elements.get("resultsScreen").hidden,false);
 assert.equal(elements.get("resultsLaps").children.length,4);
 const lapRows=elements.get("resultsLaps").children;
 assert.match(lapRows[1].className,/is-best-right/,"El índice lógico 0 corresponde al Carril B del ocho");
 assert.match(lapRows[3].className,/is-best-left/,"El índice lógico 1 corresponde al Carril A del ocho");
 assert.equal(game.lanes.laneAIndex(),1,"El primer giro a derechas define el interior en meta");
 assert.equal(game.lanes.laneLabel(0),"Carril B");
 assert.equal(game.lanes.laneLabel(1),"Carril A");
 const resultLaneTiles=elements.get("resultsStats").children[0].children;
 assert.equal(resultLaneTiles[0].children[0].textContent,"Mejor Carril A");
 assert.equal(resultLaneTiles[0].children[1].textContent,"8,266 s");
 assert.equal(resultLaneTiles[1].children[0].textContent,"Mejor Carril B");
 assert.equal(resultLaneTiles[1].children[1].textContent,"15,200 s");
 assert.doesNotMatch(lapRows[0].className,/is-best-/,"La vuelta inicial no se resalta si luego fue superada");
 assert.doesNotMatch(lapRows[2].className,/is-best-/,"Otra vuelta del mismo carril no se resalta");
 assert.equal(lapRows[1].children[2].children[0].textContent,"MEJOR DEL CARRIL");
 assert.equal(lapRows[3].children[2].children[0].textContent,"MEJOR DEL CARRIL");
 assert.equal(elements.get("resultsStats").children[1].children[1].textContent,
  "23,466 s","El combinado suma los mejores tiempos de cada carril");
 assert.equal(elements.get("resultsStats").children[0].children.length,2,
  "Los dos carriles muestran tiempos separados");
 const afterRace=JSON.parse(saved.get("slotrace-lab-10"));
 assert.equal("sessionLaps" in afterRace,false);
 assert.equal(afterRace.circuitName,"Ocho de pruebas");
 elements.get("resultsHome").listeners.click[0]();
 assert.equal(st.mode,"menu");

 // Mis circuitos incluye dos pestañas; la segunda agrupa récords locales
 // sin sumar coches, sentidos o versiones de física diferentes.
 assert.match(html,/id="libraryTabRecords"/);
 assert.match(html,/id="libraryRecordsList"/);
 assert.doesNotMatch(html,/id="libraryVersionRecovery"/,
  "El historial de versiones recuperadas ya no ocupa espacio visual");
 assert.doesNotMatch(html,/id="libraryRestoreVersion"/);
 const currentRecordKey="library-"+library[0].id+"-"+st.types.join("-");
 st.records[currentRecordKey+"-rear-physics-v1-helix-spark"]=[22.5,21.3];
 st.records[currentRecordKey+"-reverse-rear-physics-v2"]=[19.2,20.4];
 const savedVariants=game.savedCircuitRecords(library[0]);
 assert.equal(savedVariants.length,3,"Se muestran física actual, anterior y sentido inverso");
 assert.deepEqual(savedVariants[0].times,[15.2,8.266],
  "Primero los tiempos actuales de Gripline y sentido horario");
 assert.equal(savedVariants[0].combined,23.466,
  "El combinado usa los dos carriles de la misma variante");
 assert.deepEqual(savedVariants[0].times,[15.2,8.266],
  "La nueva nomenclatura no reescribe los índices antiguos");
 assert.equal(game.lanes.laneAIndex(savedVariants[0].types,1),1);
 assert.equal(game.lanes.laneAIndex(savedVariants.find(v=>v.reverse).types,-1),0,
  "En sentido contrario Carril A sigue en la misma guía física");
 assert.ok(savedVariants.some(v=>v.physics===1&&v.car==="spark"),
  "Los tiempos históricos del Spark siguen accesibles");
 assert.ok(savedVariants.some(v=>v.reverse&&v.physics===2),
  "La marcha antihoraria no se mezcla con la horaria");
 game.showHub("library");
 assert.equal(elements.get("libraryRecordsPanel").hidden,true);
 elements.get("libraryTabRecords").listeners.click[0]();
 assert.equal(st.libraryTab,"records");
 assert.equal(elements.get("libraryRecordsPanel").hidden,false);
 assert.equal(elements.get("libraryCircuitsPanel").hidden,true);
 assert.equal(elements.get("libraryTabRecords").attrs["aria-selected"],"true");
 const recordCards=elements.get("libraryRecordsList").children;
 assert.equal(recordCards.length,2,"También muestra circuitos aún sin tiempos");
 assert.match(elements.get("libraryRecordsCount").textContent,/1 de 2 con tiempos/);
 const recordCard=recordCards.find(card=>card.children[0].children[0].children[0].textContent==="Ocho de pruebas");
 assert.ok(recordCard,"La ficha de récords conserva el nombre del circuito");
 assert.equal(recordCard.children.length,4,"Tres variantes diferenciadas");
 const currentCells=recordCard.children[1].children[2].children;
 assert.equal(currentCells[0].children[0].textContent,"Carril A");
 assert.equal(currentCells[0].children[1].textContent,"8,266 s");
 assert.equal(currentCells[1].children[0].textContent,"Carril B");
 assert.equal(currentCells[1].children[1].textContent,"15,200 s");
 assert.equal(recordCard.children[1].children[2].children[2].children[1].textContent,
  "23,466 s","Combinado correctamente formateado");
 assert.match(recordCard.children[3].children[1].textContent,/histórico/);
 recordCard.children[0].children[1].listeners.click[0]();
 assert.equal(st.mode,"build","El botón Abrir recupera directamente el circuito");
 assert.equal(st.activeCircuitId,library[0].id);
 game.showHub("library");
 elements.get("libraryTabCircuits").listeners.click[0]();
 assert.equal(elements.get("libraryRecordsPanel").hidden,true);
 assert.equal(elements.get("libraryCircuitsPanel").hidden,false);

 // Rescate sin sobrescribir Splash si OchoA todavía existe en el borrador.
 const splashId=both[0].id;
 st.draft={types:["S350","R1_90R"],loose:[],bridgeParts:[],origin:{...geo.START},
  name:"OchoA",direction:-1,activeId:splashId};
 game.showHub("library");
 assert.equal(elements.get("libraryDraftRecovery").hidden,false);
 assert.equal(game.recoverDraftToLibrary(),true,"Rescatar OchoA del borrador");
 const rescued=JSON.parse(saved.get("slotrace-circuit-library-v1"));
 assert.equal(rescued.length,3);
 assert.deepEqual(rescued.map(x=>x.name),["OchoA","Splash","Ocho de pruebas"]);
 assert.notEqual(rescued[0].id,splashId,"OchoA recuperado tiene identidad propia");
 assert.deepEqual(rescued[0].snapshot.types,["S350","R1_90R"]);
 assert.deepEqual(rescued[1].snapshot.types,previousPieces,"Splash no se modifica al recuperar");
 assert.equal(elements.get("libraryDraftRecovery").hidden,true);

 // Cambiar el trazado de un circuito existente preserva la versión anterior.
 game.loadSavedCircuit(previousId);
 const stable=st.types.slice();
 game.changeTypes([...stable,"S075"],"Edición del trazado",[],geo.START);
 elements.get("workCircuitName").value="Ocho de pruebas";
 assert.equal(game.saveCircuit(),true);
 assert.equal(game.readCircuitRevisions()[0].name,"Ocho de pruebas");
 assert.deepEqual(game.readCircuitRevisions()[0].snapshot.types,stable);
 assert.equal(game.restoreLastCircuitRevision(),true);
 const withBackup=JSON.parse(saved.get("slotrace-circuit-library-v1"));
 assert.ok(withBackup.some(x=>x.name==="Ocho de pruebas (recuperado)"));
 assert.deepEqual(withBackup.find(x=>x.name==="Ocho de pruebas (recuperado)").snapshot.types,stable);
 assert.ok(withBackup.some(x=>x.name==="OchoA"));
 assert.ok(withBackup.some(x=>x.name==="Splash"));

 // Gestos tipo iOS: abrir papelera, cerrar al deslizar a la derecha, cancelar
 // y borrar EXCLUSIVAMENTE la ficha elegida (sin tocar OchoA ni Splash).
 assert.equal(game.loadSavedCircuit(rescued[0].id),true);
 elements.get("workCircuitName").value="OchoA (recuperado)";
 assert.equal(game.saveCircuit(),true);
 const duplicateId=st.activeCircuitId;
 assert.notEqual(duplicateId,rescued[0].id);
 assert.equal(st.library[0].name,"OchoA (recuperado)");
 const deskBefore=st.types.slice();
 const untouchedOriginal=JSON.stringify(st.library.find(c=>c.id===rescued[0].id).snapshot);
 const untouchedSplash=JSON.stringify(st.library.find(c=>c.id===splashId).snapshot);
 const recordKeyDuplicate="library-"+duplicateId+"-T";
 const recordKeyOriginal="library-"+rescued[0].id+"-T";
 st.records[recordKeyDuplicate]=[6.1,6.2];
 st.records[recordKeyOriginal]=[9.1,9.2];
 game.showHub("library");
 const libraryPanel=elements.get("circuitLibrary");
 const currentCards=()=>libraryPanel.children.slice(-st.library.length);
 const cardFor=id=>currentCards()[st.library.findIndex(c=>c.id===id)];
 const nameFor=id=>cardFor(id).children[1].children[0].children[0];
 const openFor=id=>cardFor(id).children[1].children[1];
 // Tocar el título selecciona y carga ese circuito SIN abrir el taller.
 assert.equal(st.activeCircuitId,duplicateId);
 assert.equal(nameFor(rescued[0].id).textContent,"OchoA");
 nameFor(rescued[0].id).listeners.click[0]();
 assert.equal(st.mode,"library","Elegir por el nombre no cambia de pantalla");
 assert.equal(st.activeCircuitId,rescued[0].id);
 assert.equal(st.circuitName,"OchoA");
 assert.equal(elements.get("circuitName").value,"OchoA");
 assert.deepEqual(st.types,st.library.find(c=>c.id===rescued[0].id).snapshot.types);
 assert.equal(nameFor(rescued[0].id).attrs["aria-pressed"],"true");
 assert.ok(cardFor(rescued[0].id).className.includes("is-selected"),
  "El circuito seleccionado queda destacado en la lista");
 assert.equal(JSON.parse(saved.get("slotrace-lab-10")).activeCircuitId,rescued[0].id,
  "La selección persiste");
 nameFor(duplicateId).listeners.click[0]();
 assert.equal(st.mode,"library");
 assert.equal(st.activeCircuitId,duplicateId);
 const draftBeforeRepeat=st.draft;
 nameFor(duplicateId).listeners.click[0]();
 assert.equal(st.draft,draftBeforeRepeat,
  "Volver a tocar el nombre activo no pisa el borrador");
 assert.equal(nameFor(duplicateId).attrs["aria-pressed"],"true");
 // Abrir mantiene la acción anterior y sí lleva al taller.
 openFor(duplicateId).listeners.click[0]();
 assert.equal(st.mode,"build","El botón Abrir sigue entrando al taller");
 assert.equal(st.activeCircuitId,duplicateId);
 game.showHub("library");
 const swipeShell=currentCards()[0],trash=swipeShell.children[0],front=swipeShell.children[1];
 assert.equal(trash.disabled,true,"Papelera oculta y desactivada al principio");
 function slide(from,to){
  const evt=(x)=>({pointerId:7,pointerType:"touch",clientX:x,clientY:100,
   preventDefault(){}});
  front.listeners.pointerdown[0](evt(from));
  front.listeners.pointermove[0](evt(to));
  front.listeners.pointerup[0](evt(to));
 }
 slide(260,180);
 assert.equal(front.style.transform,"translateX(-100px)","Deslizar izquierda descubre la papelera");
 assert.equal(trash.disabled,false);
 slide(160,240);
 assert.equal(front.style.transform,"translateX(0px)","Deslizar derecha cierra acciones");
 assert.equal(trash.disabled,true);
 slide(260,160);
 trash.listeners.click[0]();
 assert.equal(elements.get("circuitDeleteDialog").hidden,false);
 assert.equal(elements.get("deleteCircuitName").textContent,"«OchoA (recuperado)»");
 elements.get("deleteCircuitCancel").listeners.click[0]();
 assert.equal(elements.get("circuitDeleteDialog").hidden,true,"Cancelar cierra sin borrar");
 assert.equal(st.library.some(c=>c.id===duplicateId),true);
 trash.listeners.click[0]();
 elements.get("deleteCircuitConfirm").listeners.click[0]();
 assert.equal(elements.get("circuitDeleteDialog").hidden,true);
 assert.equal(st.library.some(c=>c.id===duplicateId),false,"Solo se elimina la copia");
 assert.equal(st.activeCircuitId,null,"Al borrar el activo, la mesa queda sin vinculación");
 assert.deepEqual(st.types,deskBefore,"No se pierden las piezas en la mesa");
 assert.equal(st.records[recordKeyDuplicate],undefined,"Solo se borran récords de esa identidad");
 assert.deepEqual(st.records[recordKeyOriginal],[9.1,9.2],"Otros récords intactos");
 assert.equal(JSON.stringify(st.library.find(c=>c.id===rescued[0].id).snapshot),untouchedOriginal);
 assert.equal(JSON.stringify(st.library.find(c=>c.id===splashId).snapshot),untouchedSplash);
 assert.equal(JSON.parse(saved.get("slotrace-circuit-library-v1")).some(c=>c.id===duplicateId),false);
 assert.equal(st.library.some(c=>c.name==="OchoA"),true);
 assert.equal(st.library.some(c=>c.name==="Splash"),true);
 // Guardar desde tienda un plano validado no puede sustituir las creaciones.
 const previousTracks=st.library.map(x=>({id:x.id,name:x.name,snapshot:JSON.stringify(x.snapshot)}));
 assert.equal(game.shopInstallPlan("plan-eight"),true,"Montar receta desbloqueada del ocho");
 assert.equal(st.mode,"build");
 assert.equal(st.track.valid,true);
 assert.equal(st.types.length,14);
 assert.equal(st.circuitName,"Ocho con puente");
 assert.equal(st.library.length,previousTracks.length+1);
 for(const track of previousTracks){
  const same=st.library.find(c=>c.id===track.id);
  assert.ok(same,"Circuito anterior conservado: "+track.name);
  assert.equal(JSON.stringify(same.snapshot),track.snapshot);
 }
 const storeCount=st.library.length;
 assert.equal(game.shopInstallPlan("plan-eight"),true,"Segunda apertura reutiliza la misma receta");
 assert.equal(st.library.length,storeCount,"No duplica el plano de tienda");
 assert.equal(game.shopInstallPlan("plan-catalunya"),false,
  "Catalunya solo se instala tras añadirlo gratis");

 // Los planos comerciales se generan a partir de las piezas REALES del motor.
 const realOval=game.shopBlueprintSvg(geo.STARTER,"Óvalo de prueba");
 assert.match(realOval,/shop-real-blueprint/);
 assert.match(realOval,/viewBox="[-\d\. ]+"/);
 assert.equal((realOval.match(/<line /g)||[]).length,geo.STARTER.length-1,
  "Cada costura pertenece a una unión real del óvalo");
 assert.match(realOval,/Plano real de Óvalo de prueba/);
 const realEight=game.shopBlueprintSvg(geo.FIGURE_EIGHT,"Ocho de prueba");
 assert.match(realEight,/shop-blueprint-bridge/,"El plano del ocho muestra la vía elevada");
 assert.match(realEight,/circuito válido/);
 game.showHub("store");
 game.shopSelectCategory("circuits");
 assert.match(elements.get("shopProducts").innerHTML,/shop-real-blueprint/,
  "La tienda usa geometría exacta, no iconos inventados");
 assert.match(elements.get("shopProducts").innerHTML,/Catalunya Slot/,
  "Se muestra Catalunya Slot con su receta real");
 assert.doesNotMatch(elements.get("shopProducts").innerHTML,/Plano en diseño/,
  "El plano provisional ha desaparecido de la tienda");

 // Elegir Spark en el garaje lo habilita sin afectar al Gripline.
 game.showHub("garage");
 elements.get("garageChooseSpark").listeners.click[0]();
 assert.equal(st.selectedCar,"spark");
 assert.equal(game.shopOwned("car-spark"),true,"Selección disponible en pruebas");
 assert.equal(JSON.parse(saved.get("slotrace-lab-10")).selectedCar,"spark",
  "El coche elegido persiste sin borrar el trazado");
 assert.equal(elements.get("garageRace").textContent,"🏁 Jugar con Helix Spark");
 assert.equal(elements.get("garageChooseSpark").attrs["aria-pressed"],"true");
 assert.equal(game.openRace(),true,"El segundo coche puede competir en pista");
 assert.equal(st.mode,"race");
 assert.equal(st.raceStarted,false,"Spark espera la primera aceleración");
 assert.equal(elements.get("raceCarName").textContent,"Helix Spark");
 st.seconds=7.432;game.completeLap();
 const sparkKeys=Object.keys(st.records).filter(k=>k.endsWith("-helix-spark"));
 assert.ok(sparkKeys.length>0,"Los tiempos de Spark no pisan los de Gripline");
 game.endSession("menu");
 assert.match(elements.get("resultsCircuit").textContent,/Helix Spark/,
  "El informe muestra con qué coche se condujo");
 game.showHub("garage");
 elements.get("garageChooseGripline").listeners.click[0]();
 assert.equal(st.selectedCar,"gripline");
 assert.equal(elements.get("garageRace").textContent,"🏁 Jugar con Avenir Gripline");
 assert.equal(game.openRace(),true);
 assert.equal(elements.get("raceCarName").textContent,"Avenir Gripline");
 assert.equal(Object.keys(st.records).filter(k=>k.endsWith("-helix-spark")).length,
  sparkKeys.length,"Cambiar de coche no borra los récords de Spark");
 game.showMenu();

 // Seguimiento: altura fija sin zoom pulsante ni movimientos laterales inútiles.
 game.showHub("settings");
 elements.get("settingsCameraFollow").listeners.click[0]();
 assert.equal(game.openRace(),true);
 assert.equal(st.mode,"race");
 assert.equal(st.followCamera.ready,true);
 const startPose=game.drivingPose();
 const viewStart=game.camera.makeView(elements.get("raceCanvas"),"race");
 assert.equal(viewStart.cx,startPose.x);
 assert.equal(viewStart.cy,startPose.y);
 assert.ok(Math.abs(viewStart.scale/standardView.scale-2)<1e-9);
 game.camera.updateFollowCamera(.05);
 assert.equal(st.followCamera.x,startPose.x,
  "Parado dentro de la zona de tolerancia: la cámara no se mueve");
 assert.equal(st.followCamera.y,startPose.y);
 const beforeCamera={...st.followCamera};
 st.followCamera.x-=800;st.followCamera.y-=800;
 const displaced={...st.followCamera};
 game.camera.updateFollowCamera(.016);
 assert.ok(st.followCamera.x>displaced.x&&st.followCamera.x<beforeCamera.x,
  "El objetivo se sigue de forma progresiva y no con un salto");
 assert.ok(st.followCamera.y>displaced.y&&st.followCamera.y<beforeCamera.y,
  "Amortiguación en ambos ejes");
 const afterCameraView=game.camera.makeView(elements.get("raceCanvas"),"race");
 assert.equal(afterCameraView.scale,viewStart.scale,
  "El zoom permanece fijo aunque se mueva la cámara");
 assert.equal(afterCameraView.angle,viewStart.angle);
 // Adelantar el encuadre, sin cambiar altura y con aire por delante.
 st.followCamera.x=startPose.x;st.followCamera.y=startPose.y;
 st.followCamera.lookX=0;st.followCamera.lookY=0;
 st.speed=54;
 for(let i=0;i<30;i++)game.camera.updateFollowCamera(.05);
 const leadView=game.camera.makeView(elements.get("raceCanvas"),"race");
 const lx=startPose.x-leadView.cx,ly=startPose.y-leadView.cy;
 const c=Math.cos(leadView.angle),s=Math.sin(leadView.angle);
 const carX=(c*lx-s*ly)*leadView.scale,carY=(s*lx+c*ly)*leadView.scale;
 const headingX=c*Math.cos(startPose.h)-s*Math.sin(startPose.h);
 const headingY=s*Math.cos(startPose.h)+c*Math.sin(startPose.h);
 assert.ok(carX*headingX/leadView.w+carY*headingY/leadView.h<-.045,
  "Debe quedar más pista visible por delante que detrás del coche");
 // Tras un desplazamiento brusco, el vehículo no puede tocar los bordes.
 st.followCamera.x-=10000;st.followCamera.y-=10000;
 game.camera.updateFollowCamera(.016);
 const safeView=game.camera.makeView(elements.get("raceCanvas"),"race");
 const dX=startPose.x-safeView.cx,dY=startPose.y-safeView.cy;
 const screenX=(c*dX-s*dY)*safeView.scale;
 const screenY=(s*dX+c*dY)*safeView.scale;
 assert.ok(Math.abs(screenX)<=safeView.w*.25+1e-6,
  "Al menos 25 % de margen horizontal respecto a los bordes");
 assert.ok(Math.abs(screenY)<=safeView.h*.25+1e-6,
  "Al menos 25 % de margen vertical respecto a los bordes");
 assert.equal(safeView.scale,viewStart.scale,
  "La zona segura no cambia el zoom ni la altura de cámara");
 elements.get("pause").listeners.click[0]();
 assert.equal(st.run,false);
 const pausedPosition={...st.followCamera};
 game.camera.updateFollowCamera(.05);
 assert.deepEqual(st.followCamera,pausedPosition,"En pausa no oscila la cámara");
 // El cambio no requiere pausa, mantiene la pieza y la velocidad,
 // anima el coche, mueve la cámara y protege los récords de cada carril.
 const laneBadge=elements.get("laneIndicator");
 assert.equal(laneBadge.textContent,"OCUPAS "+game.lanes.laneLabel(st.lane).toUpperCase(),
  "La insignia muestra el carril ocupado antes del cambio");
 const laneBtn=elements.get("lane");
 assert.equal(laneBtn.disabled,false,"Carril disponible incluso con carrera activa");
 const oldLane=st.lane,oldSpeed=st.speed,oldPose=game.drivingPose();
 st.seconds=12.345;st.raceStarted=true;
 st.followCamera.x=oldPose.x-400;st.followCamera.y=oldPose.y-300;
 laneBtn.listeners.click[0]();
 assert.equal(st.run,false,"Cambiar no modifica la pausa");
 assert.equal(st.lane,1-oldLane);
 assert.equal(laneBadge.textContent,"OCUPAS "+game.lanes.laneLabel(st.lane).toUpperCase(),
  "Al cambiar de carril se actualiza el texto permanente del HUD");
 assert.equal(st.speed,oldSpeed,"Velocidad conservada");
 assert.equal(st.seconds,12.345,"Cronómetro conservado");
 assert.equal(st.raceStarted,true,"No hay salida nueva");
 assert.equal(st.lapEligible,false,"Vuelta mixta excluida de los récords");
 assert.equal(laneBtn.disabled,true,"No acumular transiciones simultáneas");
 const targetPose=game.drivingPose(),firstPose=game.lanes.displayDrivingPose();
 assert.equal(targetPose.pieceIndex,oldPose.pieceIndex,
  "Se conserva la misma pieza en la pista");
 assert.ok(Math.abs((targetPose.pieceT??0)-(oldPose.pieceT??0))<.002,
  "Sin saltos de progreso longitudinal en las curvas");
 assert.ok(Math.hypot(firstPose.x-oldPose.x,firstPose.y-oldPose.y)<.3,
  "Comienza en el carril original sin teletransporte");
 const delta=Math.hypot(targetPose.x-oldPose.x,targetPose.y-oldPose.y);
 assert.ok(delta>20,"Los carriles ocupan posiciones diferentes");
 assert.equal(game.lanes.switchLane(),false,"Bloquear doble pulsación durante la transición");
 game.lanes.advanceLaneTransition(.24);
 const mid=game.lanes.displayDrivingPose();
 assert.ok(Math.hypot(mid.x-oldPose.x,mid.y-oldPose.y)>delta*.3,
  "A mitad de transición, el coche ha empezado a desplazarse");
 assert.ok(Math.hypot(mid.x-targetPose.x,mid.y-targetPose.y)>delta*.3,
  "A mitad de transición, no ha llegado al otro carril");
 const cameraBefore=st.followCamera.x;
 game.camera.updateFollowCamera(.05);
 assert.ok(st.followCamera.x>cameraBefore,
  "La cámara sigue animándose al cambiar en pausa");
 game.lanes.advanceLaneTransition(.24);
 assert.equal(st.laneTransition,null);
 const settled=game.lanes.displayDrivingPose();
 assert.ok(Math.hypot(settled.x-targetPose.x,settled.y-targetPose.y)<.01,
  "La animación termina exactamente sobre el carril nuevo");
 const recorded=st.sessionLaps.length,lapNumber=st.lap;
 game.completeLap();
 assert.equal(st.sessionLaps.length,recorded,"La vuelta mixta no se registra");
 assert.equal(st.lap,lapNumber+1);
 assert.equal(st.lapEligible,true,"La siguiente vuelve a ser oficial");
 st.seconds=9.15;game.completeLap();
 assert.equal(st.sessionLaps.length,recorded+1,
  "Después de cambiar se pueden registrar vueltas válidas");
 elements.get("pause").listeners.click[0]();
 assert.equal(st.run,true);
 assert.equal(laneBtn.disabled,false,"El botón puede usarse sin pausar");
 const priorTime=st.seconds,priorSpeed=st.speed;
 laneBtn.listeners.click[0]();
 assert.equal(st.lane,oldLane,"Segundo cambio durante la carrera");
 assert.equal(st.run,true,"La conducción no se detiene");
 assert.equal(st.seconds,priorTime,"El tiempo no se reinicia");
 assert.equal(st.speed,priorSpeed,"La velocidad no se reinicia");

 game.showMenu();
 game.showHub("settings");
 elements.get("settingsCameraGeneral").listeners.click[0]();
 assert.equal(st.cameraMode,"general");
 assert.equal(game.camera.makeView(elements.get("raceCanvas"),"race").scale,standardView.scale);
 assert.equal(JSON.parse(saved.get("slotrace-lab-10")).cameraMode,"general",
  "La vista general vuelve a estar seleccionada y guardada");

 // PT/82: categoría Especiales, cupo, cambio automático y
 // récord propio de dos vueltas sin mezclarlo con los carriles normales.
 game.showMenu();game.openWorkshop();
 assert.equal(game.chooseCaseCategory("special"),true);
 const ptTypes=geo.STARTER.slice(),ptIndex=ptTypes.indexOf("S350");
 ptTypes[ptIndex]="X350";
 assert.equal(game.changeTypes(ptTypes,"PT/82",[],geo.START),true);
 assert.equal(st.track.valid,true);
 assert.equal(st.track.laneChangerIndex,ptIndex);
 assert.equal(game.inventoryAction("X350"),false,
  "No se admite una segunda PT/82");
 assert.equal(game.openRace(),true);
 assert.equal(st.lane,game.lanes.laneAIndex(),"La prueba PT/82 comienza en el Carril A interior");
 assert.equal(elements.get("lane").hidden,true,"El cambio manual desaparece");
 assert.equal(game.lanes.switchLane(),false,"Cambio manual bloqueado también por código");
 st.raceStarted=true;st.gas=.85;st.speed=300;st.run=true;st.distance=0;
 game.physics.simulationStep(.03);
 assert.equal(st.lane,1-game.lanes.laneAIndex(),"La PT/82 cambia de A a B al entrar");
 assert.equal(elements.get("laneIndicator").textContent,"OCUPAS CARRIL B",
  "La PT/82 actualiza el indicador tras cruzar la X");
 assert.equal(st.x350Crossings,1);
 assert.equal(st.laneTransition.physical,true);
 const crossover=game.lanes.displayDrivingPose();
 assert.equal(crossover.pieceIndex,ptIndex);
 assert.ok(Number.isFinite(crossover.x)&&Number.isFinite(crossover.y));
 st.seconds=10.125;st.laneTransition=null;st.x350Crossings=1;
 game.completeLap();
 assert.equal(st.x350FirstLap,10.125);
 assert.equal(st.sessionLaps.length,0,"Solo una vuelta: aún no hay récord");
 st.seconds=9.375;st.x350Crossings=1;st.lane=game.lanes.laneAIndex();
 game.completeLap();
 assert.equal(st.sessionLaps.length,1);
 assert.equal(st.sessionLaps[0].seconds,19.5,
  "Tiempo oficial = dos vueltas consecutivas");
 assert.equal(st.sessionLaps[0].changeover,true);
 assert.equal(st.x350FirstLap,null);
 assert.equal(game.endSession("menu"),true);
 // El mock DOM no implementa la limpieza automática de children al
 // escribir textContent="", así que inspeccionamos el último resultado.
 const lastMetric=elements.get("resultsStats").children.at(-1);
 assert.equal(lastMetric.children[0].textContent,"Mejor doble vuelta PT/82");
 assert.match(lastMetric.children[1].textContent,/19,500/);
 // Catalunya Slot: el tamaño del montaje no debe limitar la superficie
 // ni encoger las pistas, y Ver todo debe calcular el encuadre real.
 game.createNewCircuit();
 const initialEditor=game.workspace.makeView(elements.get("editCanvas"),"build");
 const straights=Array(70).fill("S350");
 const giant=[...straights,...Array(4).fill("R2_45R"),
  ...straights,...Array(4).fill("R2_45R")];
 const huge=geo.buildTrack(giant,geo.START);
 assert.ok(huge.closed&&huge.onTable&&huge.valid,
  "Un circuito de decenas de metros debe ser homologable");
 assert.ok(huge.board.width>geo.TABLE.width*8);
 assert.equal(game.changeTypes(giant,"",[],geo.START),true);
 const scaleAfter=game.workspace.makeView(elements.get("editCanvas"),"build").scale;
 assert.ok(Math.abs(scaleAfter-initialEditor.scale)<1e-10,
  "Añadir pista nunca debe alejar automáticamente la cámara");
 assert.equal(game.workspace.addLoose("S350",65000,-55000),true);
 assert.equal(st.loose.at(-1).x,65000);
 assert.equal(st.loose.at(-1).y,-55000);
 assert.ok(st.workBoard.right>65000&&st.workBoard.top< -55000);
 assert.equal(game.workspace.fitWorkspace(),true);
 assert.ok(st.camera.zoom<1,"Ver todo encuadra el circuito completo");
 const fitView=game.workspace.makeView(elements.get("editCanvas"),"build");
 assert.ok(fitView.scale<initialEditor.scale);
 let gridStrokes=0,filled=0;
 const testCtx=new Proxy({},{
  get(_,key){
   if(key==="stroke")return()=>gridStrokes++;
   if(key==="fillRect")return()=>filled++;
   if(key==="createLinearGradient")return()=>({addColorStop(){}});
   return()=>{};
  },set(obj,key,val){obj[key]=val;return true;}
 });
 const farView={...fitView,scale:.00001};
 game.workspace.paintInfiniteWorkspace(testCtx,farView);
 game.workspace.paintGrid(testCtx,farView,"build");
 assert.equal(filled,1,"La superficie cubre solo el viewport");
 assert.ok(gridStrokes>0&&gridStrokes<450,
  "La cuadrícula se adapta al zoom en un circuito inmenso");
 assert.doesNotMatch(source,/Suelta dentro de la mesa verde/);
 // Catalunya original desde la tienda; no sobrescribir las creaciones previas.
 const beforeCatalogue=st.library.length;
 game.showHub("store");
 assert.equal(game.shopAcquire("plan-catalunya"),true);
 assert.equal(game.shopOwned("plan-catalunya"),true);
 assert.equal(game.shopInstallPlan("plan-catalunya"),true);
 assert.equal(st.mode,"build");
 assert.equal(st.circuitName,"Catalunya Slot");
 assert.equal(st.circuitCreator,"Juanfrikazo-dev");
 assert.equal(st.library[0].creator,"Juanfrikazo-dev");
 assert.equal(game.circuitPackage().creator,"Juanfrikazo-dev");
 assert.equal(st.driveDirection,-1,"Nuevo Catalunya Slot se instala en sentido horario real");
 assert.equal(game.circuitPackage().directionLabel,"Horario",
  "El formato exportado informa del sentido físico y conserva la dirección original");
 const catalunyaPNG=game.drawBlueprint(pngCtx,game.blueprintData());
 assert.equal(catalunyaPNG.creator,"Juanfrikazo-dev");
 assert.equal(st.library.length,beforeCatalogue+1);
 assert.deepEqual(st.types,catalunyaPlan.types);
 assert.deepEqual(st.origin,catalunyaPlan.origin);
 assert.equal(st.track.valid,true);
 // Simular Catalunya importado antes de existir en tienda (sin shopPlanId).
 const existingCatalogue=st.library[0];
 existingCatalogue.shopPlanId=undefined;
 const afterCatalogue=st.library.length;
 game.showHub("store");
 assert.equal(game.shopInstallPlan("plan-catalunya"),true);
 assert.equal(st.activeCircuitId,existingCatalogue.id);
 assert.equal(st.library.length,afterCatalogue,"No crear un segundo Catalunya");
 assert.deepEqual(st.types,catalunyaPlan.types);

 // Nuevo circuito con intención HORARIA antes de tener su geometría.
 const monacoFixture=JSON.parse(fs.readFileSync("tests/fixtures/monaco-slot.json","utf8"));
 game.showMenu();
 elements.get("menuClockwise").listeners.click[0]();
 elements.get("menuNew").listeners.click[0]();
 assert.equal(st.pendingDesiredDirection,1,
  "La preferencia horaria persiste mientras construimos");
 game.changeTypes(monacoFixture.types,"Mónaco de prueba",[],monacoFixture.origin);
 assert.equal(st.track.closed,true);
 assert.equal(st.driveDirection,-1,
  "Al cerrar un circuito de montaje inverso, el motor ajusta el horario real");
 assert.equal(st.pendingDesiredDirection,null,"La corrección ocurre solo una vez");
 assert.equal(game.circuitPackage().directionLabel,"Horario");
 const storedAfterClosing=JSON.parse(saved.get("slotrace-lab-10"));
 assert.equal(storedAfterClosing.driveDirection,-1);
 assert.equal(storedAfterClosing.pendingDesiredDirection,null);
 // El piloto puede alternar entrenamiento, clasificación o carrera cerrada.
 game.changeTypes(geo.STARTER.slice(),"Óvalo de competición",[],geo.START);
 game.menuRace();
 const modes=elements.get("raceMode");
 for(const fn of modes.listeners.change||[])
  fn({target:{value:"lap_race"}});
 assert.equal(st.sessionMode,"lap_race");
 assert.equal(elements.get("raceTargetLapsRow").hidden,false);
 for(const fn of elements.get("raceTargetLaps").listeners.change||[])
  fn({target:{value:"3"}});
 assert.equal(st.targetLaps,3);
 assert.equal(JSON.parse(saved.get("slotrace-lab-10")).targetLaps,3,
  "El reglamento local de vueltas se guarda");
 assert.equal(game.openRace(),true);
 st.seconds=7.31;game.completeLap();
 st.seconds=7.22;game.completeLap();
 assert.equal(st.mode,"race","Una manga no termina antes de su última vuelta");
 st.seconds=7.19;game.completeLap();
 assert.equal(st.mode,"results","La carrera de 3 vueltas termina automáticamente");
 assert.match(elements.get("resultsCircuit").textContent,/Carrera por vueltas/);
 assert.equal(st.sessionLaps.length,3);
 assert.equal(st.sessionClockSummary.clockVersion,"monotonic-v2");
 assert.match(elements.get("resultsTimingAudit").textContent,/NO HOMOLOGADOS/);
 const trialReports=game.raceReports();
 assert.ok(trialReports.length>=1,"Cada tanda se archiva separada de la partida");
 const finalTrial=trialReports[0];
 assert.equal(finalTrial.mode,"lap_race");
 assert.equal(finalTrial.targetLaps,3);
 assert.equal(finalTrial.laps.length,3);
 assert.equal(finalTrial.source,"local-unverified");
 assert.equal(finalTrial.timingVersion,"monotonic-v2");
 game.menuRace();
 for(const fn of modes.listeners.change||[])
  fn({target:{value:"qualifying"}});
 assert.equal(elements.get("raceTargetLapsRow").hidden,true);
 assert.equal(st.sessionMode,"qualifying");
 console.log("SlotRace DEV 0.15.8: orientación física, modo campeonato local y carreras de 3 vueltas OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
