const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const source = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const PokerTablesModel ='));
assert.ok(source,'The embedded table model must exist');
const model = vm.runInNewContext(source+';PokerTablesModel;');
const baseline = {vpip:25,pfr:21,threeBet:8,f3b:50,steal:40,cbet:62,fcbet:48,cr:8,wtsd:28,wsd:53};
const profile = (id,stats={})=>({id,playerName:id,stats:{...baseline,...stats},knownStats:Object.keys(baseline),hands:5000,showdowns:200,autoEstimateHands:false});
const players = new Map(Array.from({length:6},(_,i)=>profile('reg'+i)).map(p=>[p.id,p]));
players.set('whale',profile('whale',{vpip:63,pfr:10,threeBet:3,fcbet:30,wtsd:40,cbet:45,cr:4,steal:25}));
players.set('pressure',profile('pressure',{vpip:32,pfr:27,threeBet:13,steal:52,cbet:70,cr:11}));
function fullTable(){let t=model.setSeat(model.createTable('Test'),0,{kind:'hero'});for(let i=1;i<6;i++)t=model.setSeat(t,i,{kind:'player',playerId:'reg'+i});return t;}

test('a saved player can sit at different tables, but never twice at one table',()=>{
 const a=model.setSeat(fullTable(),5,{kind:'player',playerId:'whale'});
 const b=model.setSeat(model.createTable('Other'),1,{kind:'player',playerId:'whale'});
 assert.equal(b.seats[1].playerId,a.seats[5].playerId);
 assert.throws(()=>model.setSeat(a,1,{kind:'player',playerId:'whale'}));
});
test('clockwise action gives Hero position on the immediate right opponent across the orbit',()=>{
 const t=fullTable();assert.equal(model.positionShare(t,0,5),5/6);assert.equal(model.positionShare(t,0,1),1/6);
 for(let n=2;n<=9;n++){let table=model.setSeat(model.createTable('Orbit',n),0,{kind:'hero'});for(let i=1;i<n;i++)table=model.setSeat(table,i,{kind:'unknown'});for(let i=1;i<n;i++)assert.equal(model.positionShare(table,0,i)+model.positionShare(table,i,0),1);}
});
test('seat grades favor access to weak ranges and position against pressure; button does not change orbit grade',()=>{
 const t=fullTable();
 for(const id of ['whale','pressure']){const right=model.setSeat(t,5,{kind:'player',playerId:id}),left=model.setSeat(t,1,{kind:'player',playerId:id});assert.ok(model.scoreTable(right,players).score>model.scoreTable(left,players).score);}
 const movedButton={...t,buttonSeat:3};assert.equal(model.scoreTable(t,players).score,model.scoreTable(movedButton,players).score);
 assert.notEqual(model.currentPositions(t,players)[0].label,model.currentPositions(movedButton,players)[0].label);
});
test('heads-up button is small blind and first preflop; big blind is first postflop',()=>{
 const hu=model.setSeat(model.setSeat(model.createTable('Heads up',2),0,{kind:'hero'}),1,{kind:'player',playerId:'whale'});
 const result=model.scoreTable(hu,players);assert.notEqual(result.grade,null);assert.equal(result.positions[0].label,'BTN / SB');assert.equal(result.positions[0].preflopOrder,1);assert.equal(result.positions[1].postflopOrder,1);assert.equal(model.positionShare(hu,0,1),.5);
});
test('missing profiles, absent Hero, and unobserved HUD stats cannot fabricate a grade',()=>{
 const blank=profile('blank');blank.knownStats=[];const map=new Map(players);map.set('blank',blank);
 assert.equal(model.scoreTable(model.createTable('Empty'),map).grade,null);
 let t=model.setSeat(model.createTable('Unknown'),0,{kind:'hero'});t=model.setSeat(t,1,{kind:'player',playerId:'deleted'});t=model.setSeat(t,2,{kind:'player',playerId:'blank'});
 const result=model.scoreTable(t,map);assert.equal(result.grade,null);assert.equal(result.coverage.known,0);assert.equal(result.coverage.unknown,2);
});
test('hidden backing numbers cannot leak into partial-profile street advice',()=>{
 const p=profile('partial',{vpip:63,pfr:10,fcbet:25,wtsd:40});p.knownStats=['vpip','pfr'];const map=new Map(players);map.set(p.id,p);
 const result=model.scoreTable(model.setSeat(fullTable(),5,{kind:'player',playerId:p.id}),map);
 assert.equal(result.provisional,true);assert.ok(!result.guides.postflop.some(s=>s.includes('observed sticky')));
});
test('shared profile edits update the grades of both independently seated tables',()=>{
 const a=model.setSeat(fullTable(),5,{kind:'player',playerId:'whale'}),b=model.setSeat(fullTable(),1,{kind:'player',playerId:'whale'});
 const before=[model.scoreTable(a,players).score,model.scoreTable(b,players).score];const changed=new Map(players);changed.set('whale',profile('whale',{vpip:32,pfr:27,threeBet:16,steal:55,cbet:80,cr:15}));
 assert.ok(model.scoreTable(a,changed).score<before[0]);assert.ok(model.scoreTable(b,changed).score<before[1]);assert.equal(a.seats[5].playerId,b.seats[1].playerId);
});
test('invalid layouts cannot duplicate tables, hide sparse seats, or silently remove occupied seats',()=>{
 const t=fullTable();assert.throws(()=>model.resizeTable(t,5));assert.throws(()=>model.validateWorkspace({version:1,tables:[t,t],activeTableId:t.id}));
 const sparse={...t,seats:Array(6)};assert.throws(()=>model.validateTable(sparse));
 const moved=model.moveHero(t,1);assert.equal(moved.seats.filter(s=>s?.kind==='hero').length,1);assert.equal(moved.seats[0],null);
});
