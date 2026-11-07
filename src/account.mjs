// SlotRace · CraftRace Studio shared identity, separate SlotRace profile.
// First release: account sign-in and nickname claim ONLY. All tracks remain
// local, untouched. No silent upload, download, overwrite or merging.
const URL="https://juukbnkjboiazqggqcyv.supabase.co";
const PUBLISHABLE_KEY="sb_publishable_l5cHUHrGHoFzGqmUyfQKSA_d3VjWksB";
const ACCOUNT_STORAGE="craftstudio-slotrace-auth-v1";
const SDK="https://esm.sh/@supabase/supabase-js@2.119.0?target=es2022";
const get=id=>document.getElementById(id);
let client=null,accountUser=null,accountNick=null,busy=false;
const modal=get("accountModal");
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
 if(/not allowed|redirect|unauthorized/i.test(message))
  return "Hay que autorizar la URL de SlotRace en Supabase Auth. No se ha cambiado tu partida.";
 if(/network|failed to fetch|load failed/i.test(message))
  return "No hay conexión con el servicio de cuentas. Puedes seguir jugando sin registrarte.";
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
  if(event==="SIGNED_IN"||event==="SIGNED_OUT"||event==="TOKEN_REFRESHED"){
   if(!modal.hidden&&event!=="TOKEN_REFRESHED")
    queueMicrotask(()=>{void refresh();});
  }
 });
 return client;
}
const redirect=()=>location.origin+location.pathname;
async function ensureSlotProfile(api,userId){
 const {error}=await api.from("slotrace_profiles").upsert({user_id:userId},
  {onConflict:"user_id",ignoreDuplicates:true});
 if(error)throw error;
}
async function refresh(){
 if(modal.hidden)return;
 notice("Comprobando tu cuenta…");
 try{
  const api=await db();
  const {data,error}=await api.auth.getUser();
  if(error&&!data?.user)throw error;
  const user=data?.user;
  if(!user||user.is_anonymous){
   accountUser=null;accountNick=null;showStage("signedOut");
   notice("Entra con la misma cuenta que utilizas en Top Down RACE, o crea una nueva.");
   return;
  }
  accountUser=user;
  const {data:account,error:lookup}=await api.from("craft_accounts")
   .select("user_id,nickname").eq("user_id",user.id).maybeSingle();
  if(lookup)throw lookup;
  if(!account){
   accountNick=null;
   const {data:tdr}=await api.from("profiles").select("nick")
    .eq("user_id",user.id).maybeSingle();
   if(tdr?.nick&&!get("accountNickname").value)
    get("accountNickname").value=tdr.nick;
   showStage("claim");
   notice("Sesión verificada. Elige tu apodo público único para CraftRace Studio.");
   return;
  }
  accountNick=account.nickname;
  await ensureSlotProfile(api,user.id);
  get("accountCurrentNick").textContent=account.nickname;
  get("accountEmailDisplay").textContent=user.email||"Acceso mediante proveedor";
  get("accountLocalCircuitCount").textContent=localCircuitCount()+" circuitos guardados aquí";
  showStage("connected");
  notice("Cuenta conectada. Tus circuitos locales siguen en este dispositivo.");
 }catch(error){
  notice(failure(error),true);
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
async function open(){
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
 const {error}=await api.from("craft_accounts")
  .insert({user_id:user.id,nickname});
 if(error)throw error;
 await ensureSlotProfile(api,user.id);
 await refresh();
}
async function signOut(){
 const api=await db();
 const {error}=await api.auth.signOut({scope:"local"});
 if(error)throw error;
 accountUser=null;accountNick=null;showStage("signedOut");
 notice("Sesión cerrada. Todos tus circuitos siguen guardados en este navegador.");
}
get("menuAccount").addEventListener("click",()=>{void open();});
get("settingsAccount").addEventListener("click",()=>{void open();});
get("accountClose").addEventListener("click",close);
modal.addEventListener("click",e=>{if(e.target===modal)close();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)close();});
get("accountLoginForm").addEventListener("submit",e=>{
 e.preventDefault();void run(signInWithPassword);
});
get("accountSignup").addEventListener("click",()=>{void run(signUp);});
get("accountGoogle").addEventListener("click",()=>{void run(()=>social("google"));});
get("accountApple").addEventListener("click",()=>{void run(()=>social("apple"));});
get("accountClaimForm").addEventListener("submit",e=>{
 e.preventDefault();void run(claim);
});
get("accountSignOut").addEventListener("click",()=>{void run(signOut);});
get("accountRetry").addEventListener("click",()=>{void run(refresh);});
// OAuth returning through GitHub Pages gets resolved even before opening settings.
if(new URLSearchParams(location.search).has("code")||
   new URLSearchParams(location.search).has("error")){
 modal.hidden=false;void refresh();
}
// No Supabase dependency is loaded until the account is opened (or OAuth returns).
