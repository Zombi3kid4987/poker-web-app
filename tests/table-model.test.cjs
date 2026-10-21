const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=require('./model-loader.cjs');
const model=load('PokerTablesModel');
const baseline={vpip:25,pfr:21,threeBet:8,f3b:50,steal:40,cbet:62,fcbet:48,cr:8,wtsd:28,wsd:53};
const profile=(id,stats={})=>({id,playerName:id,stats:{...baseline,...stats},knownStats:Object.keys(baseline),hands:5000,showdowns:200,autoEstimateHands:false});
const players=new Map(Array.from({length:6},(_,i)=>profile('reg'+i)).map(p=>[p.id,p]));
players.set('whale',profile('whale',{vpip:63,pfr:10,threeBet:3,fcbet:30,wtsd:40,cbet:45,cr:4,steal:25}));
players.set('pressure',profile('pressure',{vpip:32,pfr:27,threeBet:13,steal:52,cbet:70,cr:11}));
function fullTable(){let t=model.createTable('Test');for(let i=0;i<6;i++)if(i!==3)t=model.setSeat(t,i,{kind:'player',playerId:'reg'+i});return t;}

test('Hero is always Seat 4 and cannot be moved, cleared, or replaced',()=>{
 const t=model.createTable();assert.equal(t.seats[3].kind,'hero');assert.equal(t.seats.filter(s=>s?.kind==='hero').length,1);
 assert.throws(()=>model.moveHero(t,0));assert.throws(()=>model.setSeat(t,3,null));assert.throws(()=>model.setSeat(t,3,{kind:'unknown'}));assert.throws(()=>model.setSeat(t,0,{kind:'hero'}));assert.throws(()=>model.resizeTable(t,3));
});
test('same player can sit at different tables, but not twice at one table',()=>{
 const a=model.setSeat(fullTable(),2,{kind:'player',playerId:'whale'}),b=model.setSeat(model.createTable('Other'),4,{kind:'player',playerId:'whale'});
 assert.equal(a.seats[2].playerId,b.seats[4].playerId);assert.throws(()=>model.setSeat(a,1,{kind:'player',playerId:'whale'}));
});
test('legacy Hero movement swaps occupants without losing their stacks',()=>{
 const old={id:'legacy',name:'Legacy',seatCount:6,buttonSeat:0,seats:[{kind:'hero',stackBb:120},null,null,{kind:'player',playerId:'whale',stackBb:75},null,null]};
 const t=model.validateTable(old);assert.equal(t.seats[3].kind,'hero');assert.equal(t.seats[3].stackBb,120);assert.equal(t.seats[0].playerId,'whale');assert.equal(t.seats[0].stackBb,75);
 const small=model.validateTable({id:'old-hu',name:'Old heads up',seatCount:2,buttonSeat:0,seats:[{kind:'hero'},{kind:'player',playerId:'whale'}]});assert.equal(small.seatCount,4);assert.equal(small.seats[3].kind,'hero');assert.equal(small.seats[1].playerId,'whale');
});
test('full legacy table preserves displaced Seat 4 opponent off-table for reassignment',()=>{
 const old={id:'nine',name:'Nine',seatCount:9,buttonSeat:0,seats:Array.from({length:9},(_,i)=>({kind:'unknown',name:'Opponent '+i,stackBb:i+10}))};
 const t=model.validateTable(old);assert.equal(t.seats[3].kind,'hero');assert.equal(t.unseated.length,1);assert.equal(t.unseated[0].name,'Opponent 3');assert.equal(t.unseated[0].stackBb,13);
 assert.equal(t.seats.filter(s=>s?.kind!=='hero').length+t.unseated.length,9);
 const moved=model.seatUnseated(model.setSeat(t,0,null),0,0);assert.equal(moved.seats[0].name,'Opponent 3');assert.equal(moved.seats[0].stackBb,13);assert.equal(moved.unseated.length,0);
});
test('clockwise action gives Hero position on the right-hand opponent across a full orbit',()=>{
 const t=fullTable();assert.equal(model.positionShare(t,3,2),5/6);assert.equal(model.positionShare(t,3,4),1/6);
 for(let n=4;n<=9;n++){let table=model.createTable('Orbit',n);for(let i=0;i<n;i++)if(i!==3)table=model.setSeat(table,i,{kind:'unknown'});for(let i=0;i<n;i++)if(i!==3)assert.equal(model.positionShare(table,3,i)+model.positionShare(table,i,3),1);}
});
test('seat grade rewards access to loose ranges and position against pressure; dealer changes only current-hand order',()=>{
 const t=fullTable();for(const id of ['whale','pressure']){const right=model.setSeat(t,2,{kind:'player',playerId:id}),left=model.setSeat(t,4,{kind:'player',playerId:id});assert.ok(model.scoreTable(right,players).score>model.scoreTable(left,players).score);}
 assert.equal(model.scoreTable(t,players).score,model.scoreTable({...t,buttonSeat:2},players).score);assert.notEqual(model.currentPositions(t,players)[3].label,model.currentPositions({...t,buttonSeat:2},players)[3].label);
});
test('heads-up uses occupied seats: button is SB first preflop and BB is first postflop',()=>{
 const hu=model.setSeat({...model.createTable('HU',4),buttonSeat:3},0,{kind:'player',playerId:'whale'}),result=model.scoreTable(hu,players);
 assert.notEqual(result.grade,null);assert.equal(result.positions[3].label,'BTN / SB');assert.equal(result.positions[3].preflopOrder,1);assert.equal(result.positions[0].postflopOrder,1);assert.equal(model.positionShare(hu,3,0),.5);
});
test('unknown profiles and partial backing stats never fabricate an edge or exploit',()=>{
 const blank=profile('blank');blank.knownStats=[];const map=new Map(players);map.set('blank',blank);let t=model.setSeat(model.createTable(),0,{kind:'player',playerId:'deleted'});t=model.setSeat(t,1,{kind:'player',playerId:'blank'});
 assert.equal(model.scoreTable(t,map).grade,null);assert.equal(model.scoreTable(t,map).coverage.known,0);
 const partial=profile('partial',{vpip:63,pfr:10,fcbet:25,wtsd:40});partial.knownStats=['vpip','pfr'];map.set(partial.id,partial);const result=model.scoreTable(model.setSeat(fullTable(),2,{kind:'player',playerId:'partial'}),map);
 assert.ok(!result.exploitSheet.find(p=>p.playerId==='partial').postflop.some(s=>s.includes('sticky')));assert.equal(result.provisional,true);
});
test('effective stacks use the smaller entered stack; unknowns are neutral and short stacks affect score',()=>{
 let t=model.setSeat(model.createTable(),2,{kind:'player',playerId:'whale'});t=model.setSeat(t,4,{kind:'player',playerId:'pressure'});const unknown=model.scoreTable(t,players);assert.equal(unknown.gradeBreakdown.stack,0);assert.ok(unknown.opponents.every(p=>p.effectiveStackBb===null));
 let known=model.setStack(model.setStack(model.setStack(t,3,100),2,80),4,200);const normal=model.scoreTable(known,players);assert.equal(normal.opponents[0].effectiveStackBb,80);assert.equal(normal.opponents[1].effectiveStackBb,100);assert.equal(normal.score,unknown.score);
 const shallow=model.scoreTable(model.setStack(known,3,25),players);assert.ok(shallow.opponents.every(p=>p.effectiveStackBb===25));assert.notEqual(shallow.gradeBreakdown.stack,0);assert.notEqual(shallow.score,normal.score);
});
test('stacks stay table-specific, preserve same occupant, and reset on occupant replacement',()=>{
 let t=model.setStack(model.setSeat(model.createTable(),2,{kind:'player',playerId:'whale'}),2,175.25);const other=model.setStack(model.setSeat(model.createTable(),2,{kind:'player',playerId:'whale'}),2,40);
 assert.equal(t.seats[2].stackBb,175.25);assert.equal(other.seats[2].stackBb,40);assert.equal(model.setSeat(t,2,{kind:'player',playerId:'whale'}).seats[2].stackBb,175.25);assert.equal(model.setSeat(t,2,{kind:'player',playerId:'pressure'}).seats[2].stackBb,null);
 for(const value of [-1,0,.01,.123,10000.01,NaN,Infinity,'100'])assert.throws(()=>model.setStack(t,3,value));assert.throws(()=>model.setStack(t,0,100));
});
test('grade explanation sums exactly to the final score and exploit sheet covers every seated opponent',()=>{
 let t=model.setStack(model.setSeat(model.setSeat(model.createTable(),2,{kind:'player',playerId:'whale'}),4,{kind:'player',playerId:'pressure'}),3,250);t=model.setStack(model.setStack(t,2,300),4,200);const r=model.scoreTable(t,players),b=r.gradeBreakdown;
 assert.ok(Math.abs(b.base+b.lineup+b.position+b.stack+b.sample+b.clamp+b.rounding-r.score)<1e-8);assert.equal(r.exploitSheet.length,2);assert.ok(r.exploitSheet.every(p=>p.preflop.length&&p.postflop.length&&p.river.length));assert.ok(r.exploitSheet.every(p=>p.cautions.some(s=>s.includes('top-pair'))));
});
test('shared profile edits recalculate both independent table grades',()=>{
 const a=model.setSeat(fullTable(),2,{kind:'player',playerId:'whale'}),b=model.setSeat(fullTable(),4,{kind:'player',playerId:'whale'}),before=[model.scoreTable(a,players).score,model.scoreTable(b,players).score];
 const changed=new Map(players);changed.set('whale',profile('whale',{vpip:32,pfr:27,threeBet:16,steal:55,cbet:80,cr:15}));assert.ok(model.scoreTable(a,changed).score<before[0]);assert.ok(model.scoreTable(b,changed).score<before[1]);
});
