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
let avatarUrl=null,avatarPath=null,avatarImporting=false;
const AVATAR_BUCKET="craft-avatars";
const modal=get("accountModal"),entryGate=get("entryGate"),entryStatus=get("entryStatus");
// Estado de bienvenida. Solo se permite saltar automáticamente mientras
// está comprobándose la sesión. Una vez mostrada la elección de acceso,
// debe permanecer fija hasta una acción explícita del jugador.
let authTab="login",guestMode=false,entryState="checking",authIntent=OAUTH_CALLBACK;
function showEntryButtons(show){
 get("entryActions").hidden=!show;
 get("entryGuest").hidden=!show;
 entryGate.setAttribute("aria-busy",String(!show));
}
function setPilotWelcome(nickname){
 const nick=typeof nickname==="string"&&nickname.trim()?nickname.trim():null;
 const label=get("mastWelcomeNick"),initial=get("mastAvatarInitial");
 label.textContent=nick||"Piloto invitado";
 initial.textContent=nick?Array.from(nick)[0].toLocaleUpperCase("es"):"♙";
 setAvatarImage("mastAvatarImage","mastAvatarInitial",nick?avatarUrl:null);
 get("mastAvatar").setAttribute("aria-label",nick?
  "Abrir la cuenta de "+nick:"Abrir mi cuenta de CraftRace Studio");
}
function setAvatarImage(imgId,letterId,url){
 const img=get(imgId),letter=get(letterId);
 if(url){img.src=url;img.hidden=false;letter.hidden=true;}
 else{img.hidden=true;img.removeAttribute?.("src");letter.hidden=false;}
}
function avatarFromStudio(api,account,user){
 if(account?.avatar_path?.startsWith(user.id+"/")){
  const {data}=api.storage.from(AVATAR_BUCKET).getPublicUrl(account.avatar_path);
  if(data?.publicUrl)return data.publicUrl+"?v="+encodeURIComponent(account.updated_at||"1");
 }
 const url=account?.avatar_url;
 if(typeof url==="string"&&
  /^https:\/\/almaprintes\.github\.io\/SlotRace\/assets\/avatars\/[A-Za-z0-9_-]+\.webp$/.test(url))
  return url;
 return null;
}
function clearAvatar(){
 avatarUrl=null;avatarPath=null;
 setAvatarImage("mastAvatarImage","mastAvatarInitial",null);
 setAvatarImage("accountAvatarImage","accountAvatarInitial",null);
}
function enterLauncher(nickname,{userInitiated=false}={}){
 if(guestMode&&!userInitiated)return false;
 if(entryState==="needs-auth"&&!userInitiated&&!authIntent)return false;
 const wasGated=entryGate&&!entryGate.hidden;
 entryState=nickname?"authenticated":"guest";
 if(entryGate)entryGate.hidden=true;
 authIntent=false;
 setPilotWelcome(nickname);
 const greeting=get("homeGreeting");
 if(greeting)greeting.textContent=nickname?
  "Diseña tu trazado. Compite por cada milésima.":
  "Tus circuitos permanecen en este dispositivo.";
 if(wasGated){
  modal.hidden=true;
  if(typeof window!=="undefined")window.slotraceLab?.showMenu?.();
 }
 return true;
}
function entryMessage(message,{sessionInvalid=false}={}){
 if(guestMode||(entryState==="authenticated"&&!sessionInvalid))return;
 entryState="needs-auth";
 if(entryGate)entryGate.hidden=false;
 if(entryStatus)entryStatus.textContent=message;
 showEntryButtons(true);
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
   accountUser=null;accountNick=null;clearAvatar();showStage("signedOut");
   entryMessage("No hay una sesión activa. Entra o crea tu cuenta para empezar.",{sessionInvalid:true});
   if(!background)notice("Entra con tu cuenta CraftRace Studio o regístrate sin perder tu partida local.");
   return;
  }
  const {data,error}=await api.auth.getUser();
  if(error)throw error;
  const user=data?.user;
  if(!user||user.is_anonymous){
   accountUser=null;accountNick=null;clearAvatar();showStage("signedOut");
   entryMessage("Inicia sesión con una cuenta de CraftRace Studio.",{sessionInvalid:true});
   if(!background)notice("Entra con la misma cuenta que utilizas en Top Down RACE, o crea una nueva.");
   return;
  }
  await verifyLinkedIdentity(api);
  accountUser=user;
  const {data:account,error:lookup}=await api.from("craft_accounts")
   .select("user_id,nickname,avatar_path,avatar_url,updated_at").eq("user_id",user.id).maybeSingle();
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
  avatarPath=account.avatar_path||null;
  avatarUrl=avatarFromStudio(api,account,user);
  setAvatarImage("accountAvatarImage","accountAvatarInitial",avatarUrl);
  get("accountAvatarRemove").hidden=!(account.avatar_path||account.avatar_url);
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
  void importBundledAvatar(api,user,account);
 }catch(error){
  if(!guestMode)entryMessage("No se pudo comprobar la sesión. Puedes entrar, registrarte o seguir en modo local.");
  if(!background||!modal.hidden)notice(failure(error),true);
 }
}
// First-party portrait is prelinked in Studio; import it to Storage when
// its verified owner next signs into SlotRace.
async function importBundledAvatar(api,user,account){
 if(avatarImporting||account.avatar_path||!account.avatar_url||
  !/^https:\/\/almaprintes\.github\.io\/SlotRace\/assets\/avatars\/[A-Za-z0-9_-]+\.webp$/.test(account.avatar_url))return;
 avatarImporting=true;
 try{
  const r=await fetch(account.avatar_url,{cache:"force-cache"});
  if(!r.ok)throw Error("No se pudo cargar el avatar inicial.");
  const photo=await r.blob();
  if(photo.type!=="image/webp"||photo.size>262144)throw Error("Formato no válido.");
  const path=user.id+"/pilot.webp";
  const {error:upload}=await api.storage.from(AVATAR_BUCKET).upload(path,photo,{
   upsert:true,contentType:"image/webp",cacheControl:"3600"
  });
  if(upload)throw upload;
  const {data,error}=await api.from("craft_accounts")
   .update({avatar_path:path,avatar_url:null,updated_at:new Date().toISOString()})
   .eq("user_id",user.id).is("avatar_path",null).select("avatar_path").maybeSingle();
  if(error)throw error;
  if(data&&accountUser?.id===user.id)await refresh({background:true});
 }catch(_){
  // Fallback remains visible; account and local tracks are not affected.
 }finally{avatarImporting=false;}
}
async function optimizeAvatar(file){
 if(!file||!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>10000000)
  throw Error("Selecciona JPG, PNG o WebP de menos de 10 MB.");
 const photo=await createImageBitmap(file);
 try{
  const size=Math.min(photo.width,photo.height);
  if(!size)throw Error("No se pudo abrir la fotografía.");
  const canvas=document.createElement("canvas");
  canvas.width=192;canvas.height=192;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw Error("El navegador no puede procesar imágenes.");
  ctx.drawImage(photo,(photo.width-size)/2,(photo.height-size)/2,size,size,0,0,192,192);
  const image=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",.85));
  if(!image||image.size>262144||!["image/webp","image/jpeg","image/png"].includes(image.type))
   throw Error("No se pudo reducir la foto.");
  return image;
 }finally{photo.close?.();}
}
async function uploadAvatar(file){
 const api=await db();
 const {data,error:authError}=await api.auth.getUser(),user=data?.user;
 if(authError||!user||user.is_anonymous||user.id!==accountUser?.id)
  throw Error("Vuelve a iniciar sesión para actualizar el avatar.");
 const photo=await optimizeAvatar(file);
 const ext=photo.type==="image/webp"?"webp":photo.type==="image/png"?"png":"jpg";
 const path=user.id+"/pilot."+ext,previous=avatarPath;
 const {error:upload}=await api.storage.from(AVATAR_BUCKET).upload(path,photo,{
  upsert:true,contentType:photo.type,cacheControl:"3600"
 });
 if(upload)throw upload;
 const {error}=await api.from("craft_accounts")
  .update({avatar_path:path,avatar_url:null,updated_at:new Date().toISOString()})
  .eq("user_id",user.id);
 if(error)throw error;
 if(previous&&previous!==path)await api.storage.from(AVATAR_BUCKET).remove([previous]);
 await refresh();
 notice("Avatar guardado en CraftRace Studio para todos tus juegos compatibles.");
}
async function removeAvatar(){
 const api=await db();
 const {data,error:authError}=await api.auth.getUser(),user=data?.user;
 if(authError||!user||user.is_anonymous||user.id!==accountUser?.id)
  throw Error("Vuelve a iniciar sesión para quitar el avatar.");
 const previous=avatarPath;
 const {error}=await api.from("craft_accounts")
  .update({avatar_path:null,avatar_url:null,updated_at:new Date().toISOString()})
  .eq("user_id",user.id);
 if(error)throw error;
 if(previous)await api.storage.from(AVATAR_BUCKET).remove([previous]);
 await refresh();
 notice("Avatar quitado. Ahora se muestra tu inicial.");
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
 authIntent=true;
 guestMode=false;
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
 authIntent=true;
 guestMode=false;
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
 authIntent=true;
 guestMode=false;
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
 authIntent=true;
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
 // Avatar is chosen during Studio registration, but uploaded only after
 // nickname ownership is confirmed. Existing accounts are never overwritten.
 const chosen=get("accountSignupAvatarFile")?.files?.[0];
 if(chosen){
  try{await uploadAvatar(chosen);}
  catch(error){
   await refresh();
   notice("Apodo guardado. No se pudo guardar el avatar: "+failure(error),true);
   return;
  }
  get("accountSignupAvatarFile").value="";
 }else await refresh();
}
async function signOut(){
 const api=await db();
 const {error}=await api.auth.signOut({scope:"local"});
 if(error)throw error;
 guestMode=false;authIntent=false;entryState="needs-auth";
 accountUser=null;accountNick=null;clearAvatar();showStage("signedOut");
 entryMessage("Sesión cerrada. Entra o crea una cuenta. Tus circuitos locales están intactos.");
 notice("Sesión cerrada. Todos tus circuitos siguen guardados en este navegador.");
}
get("entryLogin").addEventListener("click",()=>{void open("login");});
get("entryRegister").addEventListener("click",()=>{void open("register");});
get("entryGuest").addEventListener("click",()=>{
 guestMode=true;modal.hidden=true;enterLauncher(null,{userInitiated:true});
});
get("accountTabLogin").addEventListener("click",()=>chooseAuthTab("login"));
get("accountTabRegister").addEventListener("click",()=>chooseAuthTab("register"));
get("mastAvatar").addEventListener("click",()=>{void open("login");});
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
get("accountAvatarChange").addEventListener("click",()=>get("accountAvatarFile").click());
get("accountAvatarFile").addEventListener("change",()=>{
 const field=get("accountAvatarFile"),file=field.files?.[0];
 if(file)void run(()=>uploadAvatar(file)).finally(()=>{field.value="";});
});
get("accountAvatarRemove").addEventListener("click",()=>{void run(removeAvatar);});
for(const [imgId,letterId] of [
 ["mastAvatarImage","mastAvatarInitial"],["accountAvatarImage","accountAvatarInitial"]
])get(imgId).addEventListener("error",()=>{
 get(imgId).hidden=true;get(letterId).hidden=false;
});
get("accountRetry").addEventListener("click",()=>{void run(refresh);});
// Al arrancar SOLO se ve el comprobador. Los botones aparecen cuando
// se confirma que no hay sesión. Nunca avanzar automáticamente después.
showEntryButtons(false);
if(OAUTH_CALLBACK||new URLSearchParams(location.search).has("error")){
 modal.hidden=false;
}
void refresh({background:true});
