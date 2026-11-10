// Account-scoped developer switch. This is a UI preview, not gameplay enforcement.
// Existing builder remains in unlimited-stock DEV until inventory integration.
import {availableModes,resolveMode,MODE} from "./player-economy.mjs";
const URL="https://juukbnkjboiazqggqcyv.supabase.co";
const KEY="sb_publishable_l5cHUHrGHoFzGqmUyfQKSA_d3VjWksB";
const STORAGE="craftstudio-slotrace-auth-v1";
const SDK="https://esm.sh/@supabase/supabase-js@2.119.0?target=es2022";
const host=document.getElementById("slotraceModePanel");
const status=document.getElementById("slotraceModeStatus");
const buttons=[...host.querySelectorAll("[data-game-mode]")];
let api;
async function refresh(){
 try{
  api ||= (await import(SDK)).createClient(URL,KEY,{auth:{storageKey:STORAGE,flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{user},error}=await api.auth.getUser();
  if(error||!user||user.is_anonymous)throw Error("Sin sesión verificada");
  const {data, error:roleError}=await api.from("slotrace_developers").select("user_id").eq("user_id",user.id).maybeSingle();
  if(roleError)throw roleError;
  const developer=Boolean(data);
  const modes=availableModes({authenticated:true,verifiedDeveloper:developer});
  const key="slotrace-preview-mode:"+user.id;
  const requested=localStorage.getItem(key)|| (developer?MODE.DEVELOPER:MODE.PLAYER);
  const mode=resolveMode({authenticated:true,verifiedDeveloper:developer,requested});
  host.hidden=false;
  window.dispatchEvent(new CustomEvent("slotrace:mode",{detail:{userId:user.id,mode,developer,client:api}}));
  for(const b of buttons){b.hidden=!modes.includes(b.dataset.gameMode);b.setAttribute("aria-pressed",String(mode===b.dataset.gameMode));}
  status.textContent=developer?"Cuenta de desarrollador verificada. Elige piezas ilimitadas o inventario limitado de prueba.":"Cuenta de jugador verificada. Inventario limitado de prueba activo.";
  for(const b of buttons)b.onclick=()=>{if(!modes.includes(b.dataset.gameMode))return;localStorage.setItem(key,b.dataset.gameMode);void refresh();};
 }catch(e){host.hidden=true;status.textContent="Inicia sesión para consultar los modos disponibles.";}
}
void refresh();
document.addEventListener("visibilitychange",()=>{if(!document.hidden)void refresh();});
