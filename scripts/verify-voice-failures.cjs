const { chromium, expect } = require('../client/node_modules/@playwright/test');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 const result={date:new Date().toISOString(),scope:'Local Chromium synthetic microphones; forced relay. No external NAT or audio-quality claim.'};
 const pages=[];
 const compose=(...args)=>execFileSync('docker',['compose',...args],{stdio:'pipe'});
 try {
  for(const name of ['fault-a','fault-b']){
   const c=await browser.newContext({permissions:['microphone']}); const p=await c.newPage();
   await p.addInitScript(()=>{const Native=RTCPeerConnection;window.peers=[];window.RTCPeerConnection=class extends Native{constructor(c){super(c);window.peers.push(this);}};});
   await p.goto('http://127.0.0.1:5173'); await p.getByLabel('Display name').fill(name);await p.getByRole('button',{name:'Enter workspace'}).click();
   await p.getByRole('button',{name:'Join voice'}).first().click();await p.getByLabel('Force TURN').check();await p.locator('.call-panel').getByRole('button',{name:'Join voice',exact:true}).click();pages.push(p);
  }
  for(const p of pages)await expect(p.getByRole('status')).toHaveText('Voice connected',{timeout:30000});
  const start=Date.now();
  compose('stop','coturn');
  await expect.poll(()=>pages[0].evaluate(()=>window.peers.at(-1).connectionState),{timeout:60000}).toMatch(/disconnected|failed|closed/);
  result.turn={secondsUntilLoss:(Date.now()-start)/1000,state:await pages[0].evaluate(()=>window.peers.at(-1).connectionState),ui:await pages[0].getByRole('status').textContent()};
  compose('start','coturn');
  for(const p of pages){const leave=p.getByRole('button',{name:'Leave',exact:true});if(await leave.count())await leave.click();}
  for(const p of pages){await p.getByRole('button',{name:'Join voice'}).first().click();await p.getByLabel('Force TURN').check();await p.locator('.call-panel').getByRole('button',{name:'Join voice',exact:true}).click();}
  for(const p of pages)await expect(p.getByRole('status')).toHaveText('Voice connected',{timeout:30000});
  result.turn.rejoined=true;
  compose('stop','signaling');
  await expect.poll(()=>pages[0].evaluate(()=>window.peers.at(-1).connectionState),{timeout:15000}).toBe('closed');
  result.signaling={state:await pages[0].evaluate(()=>window.peers.at(-1).connectionState),ui:await pages[0].getByRole('status').textContent()};
  fs.writeFileSync('docs/evidence/voice-failures.json',JSON.stringify(result,null,2)+'\n');console.log(result);
 } finally{compose('start','coturn','signaling');await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
