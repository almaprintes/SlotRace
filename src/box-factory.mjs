// Declarative, reusable SlotRace box factory. No controller is ever included.
export function createSlotRaceBox({id,name,short,kicker="CAJA DE COLECCIÓN",tag="CAJA",
 car,subtitle,detail,pieces,plans,highlights,art="red"}){
 if(!/^box-[a-z0-9-]+$/.test(id))throw new Error("Identificador de caja inválido");
 if(!name||!short||!car||!Array.isArray(plans)||!plans.length)throw new Error("Caja incompleta");
 if(!pieces||!Object.keys(pieces).length||Object.values(pieces).some(n=>!Number.isInteger(n)||n<=0))
  throw new Error("Inventario de caja inválido");
 const count=Object.values(pieces).reduce((a,b)=>a+b,0);
 return Object.freeze({id,kind:"boxes",name,short,kicker,tag,car,subtitle,detail,
  pieces:Object.freeze({...pieces}),plans:Object.freeze([...plans]),
  cars:Object.freeze(["car-"+car]),highlights:Object.freeze(highlights||[car,count+" piezas","Plano incluido"]),
  art,pieceCount:count,contentsVersion:1});
}
export function validateBoxRecipe(box,plan){
 if(!box||!plan?.types)return {valid:false,missing:["Plano inexistente"]};
 const required={};for(const id of plan.types)required[id]=(required[id]||0)+1;
 const missing=Object.entries(required).filter(([id,n])=>(box.pieces[id]||0)<n).map(([id,n])=>id+": "+n);
 return {valid:missing.length===0,missing,required};
}
export function boxContents(box){return {car:box.car,pieces:{...box.pieces},plans:[...box.plans]};}
