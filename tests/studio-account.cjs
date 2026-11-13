"use strict";
// CraftRace Studio: inspect the production account module with a synthetic
// verified Supabase user. Never make real requests or touch real accounts.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const src=fs.readFileSync("src/account.mjs","utf8");
const html=fs.readFileSync("index.html","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8")).version;
assert.match(html,new RegExp('src/account\\.mjs\\?v='+version.replaceAll(".","\\.")));
assert.match(src,/auth\.linkIdentity\(/,"Must link identities under existing UUID");
assert.match(src,/user\.id!==accountUser\?\.id/,"Must verify current UUID before link");
assert.match(src,/user\.id!==pending\.userId/,"Must fail closed on changed UUID");
assert.match(src,/\.update\(\{nickname\}\).*?\.is\("nickname",null\)/s,
 "Claim only an unassigned studio nickname");
assert.doesNotMatch(src,/service_role|sb_secret_/,"Never expose privileged credentials");
assert.doesNotMatch(src,/localStorage\.(?:setItem|removeItem)\(["']slotrace-circuit-library-v1/,
 "Login must never change the local tracks");

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
const nodes=new Map(ids.map(id=>[id,{
 id,hidden:id==="entryActions"||id==="entryGuest",disabled:false,textContent:"",value:"",
 attrs:{},listeners:{},classList:{toggle(){}},
 setAttribute(name,val){this.attrs[name]=String(val);},
 querySelectorAll:()=>[],focus(){},replaceChildren(){this.children=[];this.textContent="";},appendChild(node){(this.children??=[]).push(node)},addEventListener(name,handler){
  (this.listeners[name]??=[]).push(handler);
 }
}]));
const get=id=>{const v=nodes.get(id);if(!v)throw Error("Missing DOM "+id);return v};
const doc={getElementById:get,addEventListener(){},createElement:tag=>({tagName:tag.toUpperCase(),dataset:{},attrs:{},setAttribute(n,v){this.attrs[n]=String(v)},appendChild(){},addEventListener(){}})};
const loc={origin:"https://almaprintes.github.io",pathname:"/SlotRace/",search:"",hash:""};
const mem=new Map([["slotrace-circuit-library-v1",JSON.stringify([{id:"one"},{id:"two"},{id:"three"}])],
 ["tdr2:onlineSession:v1","SAVED_TDR_SESSION"]]);
const localStorage={getItem:key=>mem.get(key)||null,setItem:(key,val)=>mem.set(key,String(val)),
 removeItem:key=>mem.delete(key)};
const session=new Map();
const sessionStorage={getItem:key=>session.get(key)||null,setItem:(key,val)=>session.set(key,String(val)),
 removeItem:key=>session.delete(key)};
let alias="Juanfrikazo-dev", linked=null,registeredSlot=false,signOutCount=0;
let mockUser={id:"fixed-uuid",email:"player@example.test",is_anonymous:false,
 identities:[{provider:"google",user_id:"fixed-uuid"}]};
const auth={
 async getSession(){return {data:{session:{user:mockUser}},error:null}},
 async getUser(){return {data:{user:mockUser},error:null}},
 onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},
 async linkIdentity({provider}){linked={provider,userId:mockUser.id};return{error:null}},
 async signOut(){signOutCount++;return {error:null}},
 async signInWithOAuth(){return {error:null}}
};
const api={
 auth,
 from(name){
  return {
   select(){return this},eq(){return this},is(){return this},
   async maybeSingle(){
    if(name==="craft_accounts")return {data:{user_id:mockUser.id,nickname:alias},error:null};
    if(name==="profiles")return {data:{nick:"JUANFRIKAZO_DEV"},error:null};
    return{data:null,error:null};
   },
   upsert(val){
    assert.equal(name,"slotrace_profiles");
    assert.equal(val.user_id,mockUser.id);registeredSlot=true;
    return Promise.resolve({error:null});
   },
   update(val){
    assert.equal(name,"craft_accounts");
    alias=val.nickname;return this;
   },
   // The profile update chain returns the claimed alias.
  };
 }
};
const sdk={createClient:(url,key,options)=>{
 assert.match(url,/juukbnkjboiazqggqcyv/);
 assert.ok(key.startsWith("sb_publishable_"));
 assert.equal(options.auth.flowType,"pkce");
 return api;
}};
const testSrc=src.replace("const sdk=await import(SDK);","const sdk=mockSdk;");
assert.notEqual(src,testSrc,"Mock must replace remote SDK import");
const construct=new Function("document","location","localStorage","sessionStorage",
 "queueMicrotask","mockSdk",testSrc+
 "\nreturn {refresh,claim,linkSocial,open,close,social,verifyLinkedIdentity};");
const instance=construct(doc,loc,localStorage,sessionStorage,queueMicrotask,sdk);
(async()=>{
 assert.equal(get("entryActions").hidden,true,
  "Al primer frame no aparecen botones de login durante la comprobación");
 assert.equal(get("entryGuest").hidden,true,
  "Continuar sin cuenta permanece oculto hasta resolver la sesión");
 assert.equal(get("entryGate").attrs["aria-busy"],"true",
  "El portal informa de que sigue verificando el acceso");
 get("accountModal").hidden=false;
 await instance.refresh();
 assert.equal(get("accountConnected").hidden,false);
 assert.equal(get("accountClaim").hidden,true);
 assert.equal(get("accountCurrentNick").textContent,"Juanfrikazo-dev");
 assert.match(get("accountProviderList").textContent,/Google/);
 assert.equal(get("accountLinkGoogle").hidden,true);
 assert.equal(get("accountLinkApple").hidden,false);
 assert.equal(get("accountLocalCircuitCount").textContent,"3 circuitos guardados aquí");
 assert.equal(get("entryGate").hidden,true,
  "Un usuario con sesión verificada salta automáticamente el registro");
 assert.equal(get("mastWelcomeNick").textContent,"Juanfrikazo-dev",
  "La cabecera personal muestra el apodo validado en CraftRace Studio");
 assert.equal(get("mastAvatarInitial").textContent,"J",
  "El avatar toma su inicial del perfil activo");
 assert.match(get("mastAvatar").attrs["aria-label"],/Juanfrikazo-dev/,
  "El avatar permite abrir la cuenta del piloto");
 assert.doesNotMatch(get("homeGreeting").textContent,/Juanfrikazo-dev/,
  "El apodo no se repite en la portada del juego");
 assert.match(get("homeGreeting").textContent,/Diseña tu trazado/,
  "El subtítulo de portada ahora habla de la experiencia, no del usuario");
 get("mastAvatar").listeners.click[0]();
 assert.equal(get("accountModal").hidden,false,
  "El avatar abre el panel de cuenta existente");
 get("entryRegister").listeners.click[0]();
 assert.equal(get("accountEmailSubmit").textContent,"Crear mi cuenta CraftRace Studio",
  "La pantalla de registro tiene su propio botón principal");
 get("accountTabLogin").listeners.click[0]();
 assert.equal(get("accountEmailSubmit").textContent,"Entrar con mi cuenta",
  "Se puede volver al inicio de sesión sin perder datos");
 assert.equal(registeredSlot,true);
 assert.equal(localStorage.getItem("tdr2:onlineSession:v1"),"SAVED_TDR_SESSION");

 // The global DB has a member but no nickname until the user claims one.
 alias=null;registeredSlot=false;
 await instance.refresh();
 assert.equal(get("accountClaim").hidden,false);
 assert.equal(get("accountNickname").value,"JUANFRIKAZO_DEV");
 get("accountNickname").value="CARRERISTA_2026";
 await instance.claim();
 assert.equal(alias,"CARRERISTA_2026");
 assert.equal(registeredSlot,true);

 // Linking Apple NEVER calls signInWithOAuth or creates a new local user.
 await instance.linkSocial("apple");
 assert.deepEqual(linked,{provider:"apple",userId:"fixed-uuid"});
 const pending=JSON.parse(sessionStorage.getItem("craftstudio-slotrace-identity-link-v1"));
 assert.equal(pending.userId,"fixed-uuid");
 assert.equal(signOutCount,0);
 assert.equal(localStorage.getItem("tdr2:onlineSession:v1"),"SAVED_TDR_SESSION");
 assert.equal(JSON.parse(localStorage.getItem("slotrace-circuit-library-v1")).length,3);
 // Una sesión ausente abre la pantalla de acceso, nunca borra pistas.
 const previousGetSession=auth.getSession;
 auth.getSession=async()=>({data:{session:null},error:null});
 await instance.refresh();
 assert.equal(get("entryGate").hidden,false,
  "Sin sesión se muestra la bienvenida con login / registro");
 assert.equal(get("entryActions").hidden,false,
  "Después de confirmar que no hay sesión aparecen ambos botones");
 assert.equal(get("entryGuest").hidden,false,
  "El modo local solo aparece tras concluir la comprobación");
 assert.equal(get("entryGate").attrs["aria-busy"],"false");
 assert.equal(get("accountSignedOut").hidden,false);
 // Incluso aunque el SDK descubra después una sesión válida, una puerta de
 // entrada que ya mostró botones NO puede desaparecer por sí sola.
 auth.getSession=previousGetSession;
 await instance.refresh({background:true});
 assert.equal(get("entryGate").hidden,false,
  "No saltar automáticamente al menú tras haber mostrado Entrar con mi cuenta");
 assert.equal(get("entryActions").hidden,false);
 // Un login explícito sí puede desbloquear la entrada.
 await instance.social("google");
 await instance.refresh({background:true});
 assert.equal(get("entryGate").hidden,true,
  "Tras una acción explícita del usuario se permite entrar al launcher");
 auth.getSession=async()=>({data:{session:null},error:null});
 await instance.refresh({background:true});
 // Simulación de una visita sin sesión tras cerrar sesión/recargar.
 get("entryGuest").listeners.click[0]();
 assert.equal(get("entryGate").hidden,true,
  "Sin Internet el jugador puede acceder explícitamente al modo local");
 assert.equal(get("mastWelcomeNick").textContent,"Piloto invitado",
  "El modo local no presenta el nombre de la última cuenta conectada");
 assert.equal(get("mastAvatarInitial").textContent,"♙",
  "No reutilizar las iniciales del usuario anterior en modo invitado");
 assert.equal(JSON.parse(localStorage.getItem("slotrace-circuit-library-v1")).length,3);
 auth.getSession=previousGetSession;
 console.log("PASS CraftRace Studio: auth gate stays put, explicit login, shared UUID, nick and local saves");
})().catch(error=>{console.error(error);process.exitCode=1});
