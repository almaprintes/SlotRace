"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const {LIVE_CHAT_PRESETS,CHAT_COOLDOWN_MS,cleanLiveChatText,validLiveChat,
  chatCooldownRemaining}=await import("../src/online-chat-ui.mjs");
 const {buildOnlineResultModel}=await import("../src/online-results.mjs");
 assert.equal(CHAT_COOLDOWN_MS,5000,"Un mensaje cada cinco segundos");
 assert.equal(chatCooldownRemaining(1000,4500),1500);
 assert.equal(chatCooldownRemaining(1000,6000),0);
 assert.equal(chatCooldownRemaining(0,1200),0);
 assert.ok(LIVE_CHAT_PRESETS.length>=8);
 for(const icon of ["💪","😂","😭","😢","😎","😡","👏","🏆"])
  assert.ok(validLiveChat(icon,"quick"),"Reacción "+icon);
 assert.equal(validLiveChat("¡Buen pique!","quick"),false,
  "Durante la carrera, solo iconos, no frases");
 assert.equal(validLiveChat("¡Buen pique!","text"),true);
 assert.equal(validLiveChat(" ","text"),false);
 assert.equal(cleanLiveChatText("  Hola\n  colega  "),"Hola colega");
 const scoreboard={1:{host:41.569,guest:42.575},2:{host:43.878,guest:44.106}};
 const input={scores:scoreboard,hostNick:"Juanfrikazo-dev",
  guestNick:"merchita1954",trackName:"Mónaco Slot"};
 const halfway=buildOnlineResultModel({...input,heat:1});
 assert.equal(halfway.complete,false);
 assert.equal(halfway.rounds.length,1);
 assert.equal(halfway.winner,"host");
 assert.equal(halfway.totals.host,41.569);
 const final=buildOnlineResultModel({...input,heat:2});
 assert.equal(final.complete,true);
 assert.equal(final.winner,"host");
 assert.equal(final.rounds.length,2);
 assert.ok(Math.abs(final.totals.host-85.447)<.0001);
 assert.ok(Math.abs(final.totals.guest-86.681)<.0001);
 assert.ok(Math.abs(final.gap-1.234)<.0001);
 const tied=buildOnlineResultModel({scores:{1:{host:5,guest:5}},heat:1});
 assert.equal(tied.winner,"tie");
 assert.throws(()=>buildOnlineResultModel({scores:{1:{host:0,guest:20}},heat:1}));
 const app=fs.readFileSync("src/app.mjs","utf8"),
  iframe=fs.readFileSync("src/live-duel.mjs","utf8"),
  page=fs.readFileSync("index.html","utf8"),
  results=fs.readFileSync("src/online-results.mjs","utf8"),
  css=fs.readFileSync("src/site.css","utf8"),
  liveHtml=fs.readFileSync("live.html","utf8");
 assert.match(app,/initOnlineChat\(/);
 assert.match(app,/slotrace:online:chatMessage/);
 assert.match(app,/postToLive\("chatSend"/);
 assert.match(iframe,/event:"chat"/);
 assert.match(iframe,/chatCooldownRemaining\(lastChatAt,now\)/);
 assert.match(iframe,/chatCooldownRemaining\(lastPeerChatAt,now\)/);
 assert.match(iframe,/buildOnlineResultModel\(/);
 assert.match(iframe,/renderOnlineResultBoard\(/);
 assert.match(liveHtml,/id="onlineResultBack"[^>]*>← Volver atrás</);
 assert.match(liveHtml,/id="onlineResultRematch"/);
 assert.match(liveHtml,/id="onlineResultChat"/);
 assert.match(iframe,/\$\("onlineResultBack"\)\.addEventListener\("click"/);
 assert.match(iframe,/\$\("onlineResultRematch"\)\.addEventListener\("click"/);
 assert.match(iframe,/\$\("onlineResultChat"\)\.addEventListener\("click"/);
 assert.match(iframe,/event:"rematch-invite"/);
 assert.match(app,/msg\.kind==="slotrace:online:goBack"/);

 assert.ok(page.includes('id="onlineReactionStage"'));
 assert.ok(page.includes('id="onlineChatDock"'));
 assert.ok(css.includes(".online-reaction-emoji"));
 assert.ok(css.includes("font-size:clamp(64px"));
 assert.ok(results.includes("textContent=String(value)")&&
  !results.includes("innerHTML"),"Los nicks nunca pasan por innerHTML");
 assert.match(app,/onlineSnapshot\(now\)/,"El cronometraje sigue independiente del chat");
 console.log("SlotRace: 5s antispam, emojis temporales grandes, privacidad, ganador, margen, 2 mangas y render seguro OK");
})().catch(e=>{console.error(e);process.exitCode=1});
