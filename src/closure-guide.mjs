import {findBidirectionalClosure} from "./closure-tail.mjs?v=0.15.68";
// Propuestas de cierre: geometría validada y presupuesto antes de tocar la mesa.
// El optimizador prioriza montar con piezas disponibles; el catálogo sólo
// representa posibilidades, nunca compras automáticas.
const count=ids=>ids.reduce((m,id)=>(m[id]=(m[id]||0)+1,m),{});
const list=counts=>Object.entries(counts).filter(([,qty])=>qty>0).map(([id,qty])=>({id,qty}));
export function closureBudget(before,after,available,prices){
 const old=count(before),next=count(after),add={},returnParts={},missing={};
 for(const id of new Set([...before,...after])){
  const difference=(next[id]||0)-(old[id]||0);
  if(difference>0)add[id]=difference;
  else if(difference<0)returnParts[id]=-difference;
 }
 let price=0,pricable=true;
 for(const [id,qty] of Object.entries(add)){
  const lacking=available===null?0:Math.max(0,qty-Math.max(0,available[id]||0));
  if(lacking)missing[id]=lacking;
 }
 for(const [id,qty] of Object.entries(missing)){
  if(!Number.isFinite(prices[id]))pricable=false;
  else price+=prices[id]*qty;
 }
 const value=list(add).reduce((sum,{id,qty})=>sum+
  (Number.isFinite(prices[id])?prices[id]*qty:0),0);
 return{add:list(add),returnParts:list(returnParts),missing:list(missing),
  missingCount:Object.values(missing).reduce((a,b)=>a+b,0),
  price:pricable?price:null,referenceValue:value};
}
const diffCount=(a,b)=>{
 let changed=0;
 for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i])changed++;
 return changed+Math.abs(a.length-b.length);
};
export function proposeClosures({
 types,origin,raisedParts=[],available=null,prices,catalog=null,build,solve,
 maxStates=30000,maxAdd=5
}){
 if(!Array.isArray(types)||types.length<3)
  return{ok:false,reason:"Monta al menos tres piezas conectadas para buscar un cierre."};
 const metaCount=types.filter(id=>id==="START350").length;
 if(metaCount>1)return{ok:false,reason:"Hay varias piezas de salida/meta. Debe quedar una sola."};
 // La salida/meta tiene longitud 350 mm. Si ya existe una recta
 // equivalente, intercambiarla no altera ni desplaza los conectores.
 const seed=[...types];
 let searchRaised=[...raisedParts];
 if(!metaCount){
  const straight=seed.indexOf("S350");
  if(straight>=0)seed[straight]="START350";
  else{
   // En los ochos predomina S600: convertir UNA recta no elevada en
   // tres módulos de igual longitud que incluyen salida/meta, sin
   // mover un solo conector ni desmontar el trazado ya construido.
   const long=seed.findIndex((id,i)=>id==="S600"&&!searchRaised.includes(i));
   if(long>=0){
    seed.splice(long,1,"START350","S175","S075");
    searchRaised=searchRaised.map(i=>i>long?i+2:i);
   }
  }
 }
 const sourceChanger=types.filter(id=>id==="X350").length;
 const eligible=candidate=>candidate.filter(id=>id==="START350").length===1&&
  candidate.filter(id=>id==="X350").length===sourceChanger&&
  !candidate.some(id=>id===undefined);
 const candidates=[];
 const signatures=new Set();
 const trySolution=(accept,tag)=>{
  const result=tag==="bidirectional"?
   (catalog?findBidirectionalClosure(seed,{origin,raisedParts:searchRaised,build,catalog,available,prices,accept,maxAppend:6,maxTailReplace:3}):null):
   solve(seed,{origin,raisedParts:searchRaised,maxStates,maxReplace:3,maxAdd,accept});
  if(!result?.ok)return result;
  const candidate=result.types;
  if(!accept(candidate))return{ok:false,reason:"La solución no cumple las piezas disponibles."};
  const candidateRaised=result.raisedParts??searchRaised;
  const geometry=build(candidate,origin,candidateRaised);
  if(!geometry.valid||!eligible(candidate))return{ok:false,reason:"La propuesta no supera la comprobación de conectores y alturas."};
  const budget=closureBudget(types,candidate,available,prices);
  const signature=candidate.join("|");
  if(!signatures.has(signature)){
   signatures.add(signature);
   candidates.push({
    types:candidate,origin:{...origin},raisedParts:[...candidateRaised],
    geometry,changes:diffCount(types,candidate),added:result.added||0,
    replaced:result.replaced||0,tag,...budget
   });
  }
  return result;
 };
 const enough=candidate=>eligible(candidate)&&closureBudget(types,candidate,available,prices).missingCount===0;
 let first=null;
 if(available!==null)first=trySolution(enough,"bidirectional");
 if(!candidates.length)first=trySolution(eligible,"bidirectional");
 // Sólo si el cálculo por ambos extremos no dio resultado, ejecutar
 // el motor antiguo de sustituciones y composición modular.
 let second=null;
 if(!candidates.length&&available!==null)second=trySolution(enough,"owned");
 if(!candidates.length)second=trySolution(eligible,"catalog");
 if(!candidates.length){
  return{ok:false,reason:second?.reason||first?.reason||
   "No se encontró un cierre válido dentro del límite de búsqueda. El circuito no se modificó.",
   limited:Boolean(first?.limited||second?.limited)};
 }
 // Menor compra, después menor número de piezas adquiridas y de cambios.
 candidates.sort((a,b)=>a.missingCount-b.missingCount||
  (a.price??Infinity)-(b.price??Infinity)||
  a.changes-b.changes||a.added-b.added||a.types.length-b.types.length);
 return{ok:true,proposals:candidates,selected:candidates[0]};
}
