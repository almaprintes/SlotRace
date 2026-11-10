// SlotRace economy proposal v1 — catalog prices, no live purchases or balances.
// IDs correspond to src/pt-precision.mjs. DEV stock remains unlimited.
export const ECONOMY_VERSION = "slotrace-economy-v1";
export const STARTING_CREDITS = 200;
export const REWARDS = Object.freeze({
  validRace: 50, aiVictoryBonus: 30, firstDailyVictoryBonus: 100,
  tenRaceChallenge: 200
});
export const PRICE_BY_PIECE = Object.freeze({
  S075:80, S0875:90, S175:110, S350:120, S600:180,
  START350:120, X350:300,
  R1_225R:100,R1_225L:100,R1_45R:100,R1_45L:100,R1_90R:200,R1_90L:200,
  R2_225R:100,R2_225L:100,R2_45R:100,R2_45L:100,R2_90R:200,R2_90L:200,
  R3_225R:150,R3_225L:150,R3_90R:300,R3_90L:300,
  R4_225R:150,R4_225L:150,R4_90R:300,R4_90L:300
});
export const PRICE_BY_PRODUCT = Object.freeze({
  "car-standard":1500, "car-special":3000, "expansion-basic":500
});
// The starter pack is an actual buildable oval from RECIPES. One extra car
// and a controller are granted by the eventual onboarding transaction.
export const STARTER_PIECES = Object.freeze({
  S350:4, R2_45R:8, START350:1
});
export function validatePriceCatalog(parts){
  const missing=Object.keys(parts).filter(id=>!parts[id].legacy && !(id in PRICE_BY_PIECE));
  const unknown=Object.keys(PRICE_BY_PIECE).filter(id=>!(id in parts));
  return {missing,unknown,valid:missing.length===0&&unknown.length===0};
}
export function quotePieces(items){
  if(!Array.isArray(items))throw new TypeError("Se esperaba una lista de piezas");
  return items.reduce((total,id)=>{
    if(!Object.hasOwn(PRICE_BY_PIECE,id))throw new Error("Pieza no vendible: "+id);
    return total+PRICE_BY_PIECE[id];
  },0);
}
