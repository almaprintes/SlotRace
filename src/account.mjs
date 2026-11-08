// SlotRace · CraftRace Studio shared identity, separate SlotRace profile.
// First release: account sign-in and nickname claim ONLY. All tracks remain
// local, untouched. No silent upload, download, overwrite or merging.
const URL="https://juukbnkjboiazqggqcyv.supabase.co";
const PUBLISHABLE_KEY="sb_publishable_l5cHUHrGHoFzGqmUyfQKSA_d3VjWksB";
const ACCOUNT_STORAGE="craftstudio-slotrace-auth-v1";
const PENDING_IDENTITY_LINK="craftstudio-slotrace-identity-link-v1";
// Capture callback before supabase-js consumes ?code from the URL.
const OAUTH_CALLBACK=new URLSearchParams(location.search).has("code");
const SDK="https://esm.sh/@supabase/supabase-js@2.119.0?target=es2022";
const get=id=>document.getElementById(id);
let client=null,accountUser=null,accountNick=null,busy=false;
const modal=get("accountModal"),entryGate=get("entryGate"),entryStatus=get("entryStatus");
let authTab="login",guestMode=false;
function enterLauncher(nickname){
 const wasGated=entryGate&&!entryGate.hidden;
 if(entryGate)entryGate.hidden=true;
 const greeting=get("homeGreeting");
 if(greeting)greeting.textContent=nickname?
  "¡Hola, "+nickname+"! ¿Competimos o construimos?":
  "Tu pista. Tus reglas. En modo local.";
 if(wasGated){
  modal.hidden=true;
  if(typeof window!=="undefined")window.slotraceLab?.showMenu?.();
 }
}
function entryMessage(message){
 if(guestMode)return;
 if(entryGate)entryGate.hidden=false;
 if(entryStatus)entryStatus.textContent=message;
}
function chooseAuthTab(tab){
 authTab=tab==="register"?"register":"login";
 get("accountTabLogin").setAttribute?.("aria-pressed",String(authTab==="login"));
 get("accountTabRegister").setAttribute?.("aria-pressed",String(authTab==="register"));
 get("accountEmailSubmit").textContent=authTab==="register"?
  "Crear mi cuenta CraftRace Studio":"Entrar con mi cuenta";
 get("accountSignup").hidden=authTab==="register";
 get("accountPassword").autocomplete=authTab==="register"?
  "new-password":"current-password";
 get("accountModalTitle").textContent=authTab==="register"?"Crear cuenta":"Mi cuenta";
}

const stages={
 signedOut:get("accountSignedOut"),
 claim:get("accountClaim"),
 connected:get("accountConnected")
};
function notice(text,failed=false){
 const target=get("accountNotice");
 target.textContent=text;target.classList.toggle("is-error",failed);
}
function showStage(stage){
 for(const [name,el] of Object.entries(stages))el.hidden=name!==stage;
}
function failure(error){
 if(!error)return "No se pudo completar la operación.";
 const message=String(error.message||error);
 if(error.code==="23505"||/already exists|duplicate key|unique constraint|ya pertenece/i.test(message))
  return "Ese apodo ya está ocupado. Prueba con otro.";
 if(/email not confirmed|email_not_confirmed/i.test(message))
  return "Confirma primero tu correo desde el mensaje recibido.";
 if(/invalid login credentials|invalid_credentials/i.test(message))
  return "Correo o contraseña incorrectos.";
 if(/provider is not enabled|unsupported provider/i.test(message))
  return "Este proveedor todavía no está habilitado en Supabase. La partida local permanece intacta.";
 if(/manual_linking_disabled|identity linking is disabled/i.test(message))
  return "Activa «Allow manual linking» en Supabase para añadir este proveedor sin cambiar de cuenta.";
 if(/not allowed|redirect|unauthorized/i.test(message))
  return "Hay que autorizar la URL de SlotRace en Supabase Auth. No se ha cambiado tu partida.";
 if(/network|failed to fetch|load failed/i.test(message))
  return "No hay conexión con el servicio de cuentas. Puedes seguir jugando sin registrarte.";
 if(/no conservó la misma identidad/i.test(message))
  return "El proveedor pertenece a otra cuenta. No se ha mezclado ningún dato; entra con tu identidad original.";
 return "No se pudo completar la operación. Revisa los datos y vuelve a intentarlo.";
}
function setBusy(value){busy=value;for(const button of modal.querySelectorAll("button"))if(button.id!=="accountClose")button.disabled=value;}
async function db(){
 if(client)return client;
 const sdk=await import(SDK);
 client=sdk.createClient(URL,PUBLISHABLE_KEY,{
  auth:{storageKey:ACCOUNT_STORAGE,flowType:"pkce",persistSession:true,
   autoRefreshToken:true,detectSessionInUrl:true}
 });
 client.auth.onAuthStateChange((event)=>{
  // El arranque comprueba la sesión aunque no se abra el panel de cuenta.
  if(event==="SIGNED_IN"||event==="SIGNED_OUT")
   queueMicrotask(()=>{void refresh({background:true});});
 });
 return client;
}
const redirect=()=>location.origin+location.pathname;
async function ensureSlotProfile(api,userId){
 const {error}=await api.from("slotrace_profiles").upsert({user_id:userId},
  {onConflict:"user_id",ignoreDuplicates:true});
 if(error)throw error;
}
async function refresh({background=false}={}){
 if(!background)notice("Comprobando tu cuenta…");
 try{
  const api=await db();
  // Inspect local session only to avoid throwing on a first visit; authorize
  // actual profile access exclusively through the verified getUser() result.
  const {data:sessionData,error:sessionError}=await api.auth.getSession();
  if(sessionError)throw sessionError;
  if(!sessionData?.session){
   sessionStorage.removeItem(PENDING_IDENTITY_LINK);
   accountUser=null;accountNick=null;showStage("signedOut");
   entryMessage("No hay una sesión activa. Entra o crea tu cuenta para empezar.");
   if(!background)notice("Entra con tu cuenta CraftRace Studio o regístrate sin perder tu partida local.");
   return;
  }
  const {data,error}=await api.auth.getUser();
  if(error)throw error;
  const user=data?.user;
  if(!user||user.is_anonymous){
   accountUser=null;accountNick=null;showStage("signedOut");
   entryMessage("Inicia sesión con una cuenta de CraftRace Studio.");
   if(!background)notice("Entra con la misma cuenta que utilizas en Top Down RACE, o crea una nueva.");
   return;
  }
  await verifyLinkedIdentity(api);
  accountUser=user;
  const {data:account,error:lookup}=await api.from("craft_accounts")
   .select("user_id,nickname").eq("user_id",user.id).maybeSingle();
  if(lookup)throw lookup;
  if(!account||!account.nickname){
   accountNick=null;
   const {data:tdr}=await api.from("profiles").select("nick")
    .eq("user_id",user.id).maybeSingle();
   if(tdr?.nick&&!get("accountNickname").value)
    get("accountNickname").value=tdr.nick;
   showStage("claim");
   if(entryGate&&!entryGate.hidden)modal.hidden=false;
   notice("Sesión verificada. Elige tu apodo público único para CraftRace Studio.");
   return;
  }
  accountNick=account.nickname;
  await ensureSlotProfile(api,user.id);
  get("accountCurrentNick").textContent=account.nickname;
  get("accountEmailDisplay").textContent=user.email||"Acceso mediante proveedor";
  get("accountLocalCircuitCount").textContent=localCircuitCount()+" circuitos guardados aquí";
  const providers=new Set((user.identities||[]).map(item=>item.provider));
  get("accountProviderList").textContent=[...providers].map(p=>
   p==="google"?"Google":p==="apple"?"Apple":p==="email"?"Correo":p).join(" · ")||
   "Proveedor no indicado";
  get("accountLinkGoogle").hidden=providers.has("google");
  get("accountLinkApple").hidden=providers.has("apple");
  showStage("connected");
  notice("Cuenta conectada. Tus circuitos locales siguen en este dispositivo.");
  enterLauncher(account.nickname);
 }catch(error){
  if(!guestMode)entryMessage("No se pudo comprobar la sesión. Puedes entrar, registrarte o seguir en modo local.");
  if(!background||!modal.hidden)notice(failure(error),true);
 }
}
function localCircuitCount(){
 try{
  const value=JSON.parse(localStorage.getItem("slotrace-circuit-library-v1")||"[]");
  return Array.isArray(value)?value.length:0;
 }catch(_){return 0;}
}
async function run(action){
 if(busy)return;
 setBusy(true);
 try{await action();}catch(error){notice(failure(error),true);}
 finally{setBusy(false);}
}
async function open(tab="login"){
 chooseAuthTab(tab);
 modal.hidden=false;
 get("accountClose").focus();
 await refresh();
}
function close(){modal.hidden=true;}
async function signInWithPassword(){
 const email=get("accountEmail").value.trim();
 const password=get("accountPassword").value;
 if(!email||password.length<10){notice("Introduce un correo y contraseña de al menos 10 caracteres.",true);return;}
 const api=await db();
 const {error}=await api.auth.signInWithPassword({email,password});
 if(error)throw error;
 get("accountPassword").value="";
 await refresh();
}
async function signUp(){
 const email=get("accountEmail").value.trim(),password=get("accountPassword").value;
 if(!get("accountEmail").checkValidity()||password.length<10){
  notice("Indica un correo válido y una contraseña de al menos 10 caracteres.",true);return;
 }
 const api=await db();
 const {data,error}=await api.auth.signUp({
  email,password,options:{emailRedirectTo:redirect()}
 });
 if(error)throw error;
 get("accountPassword").value="";
 if(data.session){await refresh();return;}
 notice("Solicitud enviada. Comprueba tu correo y confirma la cuenta antes de entrar.");
}
async function social(provider){
 const api=await db();
 const {error}=await api.auth.signInWithOAuth({provider,options:{redirectTo:redirect()}});
 if(error)throw error;
}
// Distinct Apple relay email is not an identity proof. To merge Google and
// Apple without duplicating the UUID, link from a VERIFIED active session.
// Supabase Auth must have Allow manual linking enabled for this operation.
async function linkSocial(provider){
 const api=await db();
 const {data,error}=await api.auth.getUser();
 const user=data?.user;
 if(error||!user||user.is_anonymous||user.id!==accountUser?.id)
  throw new Error("La sesión de CraftRace Studio no coincide. Vuelve a entrar.");
 if((user.identities||[]).some(identity=>identity.provider===provider)){
  notice("Este proveedor ya está vinculado a tu cuenta.");
  return;
 }
 sessionStorage.setItem(PENDING_IDENTITY_LINK,JSON.stringify({userId:user.id,provider}));
 const {error:linkError}=await api.auth.linkIdentity({
  provider,options:{redirectTo:redirect()}
 });
 if(linkError){sessionStorage.removeItem(PENDING_IDENTITY_LINK);throw linkError;}
}
// Fail closed when a linking callback does not prove the SAME studio UUID.
// No local track data is touched. The user can sign back into the old account.
async function verifyLinkedIdentity(api){
 // A dismissed OAuth tab must not log out the existing player.
 if(!OAUTH_CALLBACK)return;
 const stored=sessionStorage.getItem(PENDING_IDENTITY_LINK);
 if(!stored)return;
 sessionStorage.removeItem(PENDING_IDENTITY_LINK);
 let pending;
 try{pending=JSON.parse(stored);}catch(_){return;}
 const {data,error}=await api.auth.getUser();
 const user=data?.user;
 if(error||!user||user.id!==pending.userId||
   !(user.identities||[]).some(i=>i.provider===pending.provider&&
      (!i.user_id||i.user_id===user.id))){
  await api.auth.signOut({scope:"local"});
  throw new Error("La vinculación no conservó la misma identidad. Vuelve a iniciar sesión con tu cuenta original.");
 }
}
async function claim(){
 if(!accountUser)throw new Error("Debes iniciar sesión antes de registrar el apodo.");
 const nickname=get("accountNickname").value.trim();
 if(!/^[A-Za-z0-9_-]{3,24}$/.test(nickname)){
  notice("El apodo debe tener de 3 a 24 caracteres: letras sin tildes, números, guion o guion bajo.",true);
  return;
 }
 const api=await db();
 const {data:{user},error:authError}=await api.auth.getUser();
 if(authError||!user||user.id!==accountUser.id||user.is_anonymous)
  throw new Error("La sesión ha cambiado. Vuelve a iniciar sesión.");
 // Registered automatically by the shared Auth trigger. Nickname is
 // claimed later, atomically, and never overwrites an existing studio alias.
 const {data:updated,error}=await api.from("craft_accounts")
  .update({nickname}).eq("user_id",user.id).is("nickname",null)
  .select("nickname").maybeSingle();
 if(error)throw error;
 if(!updated)throw new Error("Este perfil ya tiene un apodo. Comprueba tu cuenta.");
 await ensureSlotProfile(api,user.id);
 await refresh();
}
async function signOut(){
 const api=await db();
 const {error}=await api.auth.signOut({scope:"local"});
 if(error)throw error;
 guestMode=false;accountUser=null;accountNick=null;showStage("signedOut");
 entryMessage("Sesión cerrada. Entra o crea una cuenta. Tus circuitos locales están intactos.");
 notice("Sesión cerrada. Todos tus circuitos siguen guardados en este navegador.");
}
get("entryLogin").addEventListener("click",()=>{void open("login");});
get("entryRegister").addEventListener("click",()=>{void open("register");});
get("entryGuest").addEventListener("click",()=>{
 guestMode=true;modal.hidden=true;enterLauncher(null);
});
get("accountTabLogin").addEventListener("click",()=>chooseAuthTab("login"));
get("accountTabRegister").addEventListener("click",()=>chooseAuthTab("register"));
get("menuAccount").addEventListener("click",()=>{void open("login");});
get("settingsAccount").addEventListener("click",()=>{void open();});
get("accountClose").addEventListener("click",close);
modal.addEventListener("click",e=>{if(e.target===modal)close();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)close();});
get("accountLoginForm").addEventListener("submit",e=>{
 e.preventDefault();void run(authTab==="register"?signUp:signInWithPassword);
});
get("accountSignup").addEventListener("click",()=>chooseAuthTab("register"));
get("accountGoogle").addEventListener("click",()=>{void run(()=>social("google"));});
get("accountApple").addEventListener("click",()=>{void run(()=>social("apple"));});
get("accountLinkGoogle").addEventListener("click",()=>{void run(()=>linkSocial("google"));});
get("accountLinkApple").addEventListener("click",()=>{void run(()=>linkSocial("apple"));});
get("accountClaimForm").addEventListener("submit",e=>{
 e.preventDefault();void run(claim);
});
get("accountSignOut").addEventListener("click",()=>{void run(signOut);});
get("accountRetry").addEventListener("click",()=>{void run(refresh);});
// Autologin en cada apertura; sin sesión, pantalla de acceso/registro.
// Si el servicio falla, el constructor sigue accesible en modo local.
if(OAUTH_CALLBACK||new URLSearchParams(location.search).has("error")){
 modal.hidden=false;
}
void refresh({background:true});
