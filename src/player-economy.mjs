// SlotRace: isolated development/player preview policy.
// IMPORTANT: Never grant developer access from nickname, localStorage or UI state.
// Backend must return a verified role for the authenticated auth.uid().
import {STARTER_PIECES,STARTING_CREDITS,PRICE_BY_PIECE,REWARDS} from "./economy-catalog.mjs";
export const MODE = Object.freeze({DEVELOPER:"developer",PLAYER:"player"});
export function availableModes({authenticated=false,verifiedDeveloper=false}={}){
 return authenticated&&verifiedDeveloper?[MODE.DEVELOPER,MODE.PLAYER]:[MODE.PLAYER];
}
export function resolveMode({authenticated=false,verifiedDeveloper=false,requested=MODE.PLAYER}={}){
 return authenticated&&verifiedDeveloper&&requested===MODE.DEVELOPER?MODE.DEVELOPER:MODE.PLAYER;
}
export function initialPlayerEconomy(){
 return {version:1,credits:STARTING_CREDITS,pieces:{...STARTER_PIECES},cars:["car-gripline"],transactions:[]};
}
export function canPlacePiece(economy,placed,id){
 if(!(id in PRICE_BY_PIECE))return false;
 const used=placed.filter(x=>x===id).length;
 return used<(economy.pieces[id]||0);
}
export function buyPiece(economy,id,quantity=1){
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>100)throw Error("Cantidad inválida");
 const price=PRICE_BY_PIECE[id];
 if(!Number.isSafeInteger(price))throw Error("Pieza no vendible");
 const cost=price*quantity;
 if(economy.credits<cost)throw Error("Créditos insuficientes");
 return {...economy,credits:economy.credits-cost,pieces:{...economy.pieces,[id]:(economy.pieces[id]||0)+quantity}};
}
export function raceReward({valid=false,aiVictory=false,firstDailyVictory=false}={}){
 if(!valid)return 0;
 return REWARDS.validRace+(aiVictory?REWARDS.aiVictoryBonus:0)+(firstDailyVictory?REWARDS.firstDailyVictoryBonus:0);
}
// Preview operations are local and disposable. Real purchases/rewards require
// atomic server-side transactions with idempotency and race validation.
