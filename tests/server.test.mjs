import test from 'node:test';
import assert from 'node:assert/strict';
import {makeServer} from '../server.mjs';
import {translate} from '../gemini.mjs';
const prompt='직선 l을 그려 줘';
const plan={summary:'직선을 그리려는 설명입니다.',operations:[{kind:'line',id:'l',source:prompt}]};
async function withServer(env,fn,translateImpl){const s=makeServer({env,translateImpl});await new Promise(r=>s.listen(0,'127.0.0.1',r));try{await fn('http://127.0.0.1:'+s.address().port);}finally{await new Promise(r=>s.close(r));}}
test('Gemini REST sends schema, system instruction, key header and parses documented steps',async()=>{
 const r=await translate({taskKey:'sss',prompt,apiKey:'fake-test-key',model:'test-model',fetchImpl:async(url,opt)=>{assert.match(url,/\/interactions$/);assert.equal(opt.headers['x-goog-api-key'],'fake-test-key');const body=JSON.parse(opt.body);assert.equal(body.store,false);assert.ok(body.system_instruction);assert.equal(body.response_format.mime_type,'application/json');return Response.json({steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(plan)}]}]});}});assert.equal(r.plan.operations[0].kind,'line');
});
test('provider quota error is meaningful and does not echo credentials',async()=>{await assert.rejects(translate({taskKey:'sss',prompt,apiKey:'SECRET',model:'m',fetchImpl:async()=>new Response('SECRET',{status:429})}),/한도/);});
test('missing key has explicit status and API error',async()=>withServer({},async url=>{const info=await(await fetch(url+'/api/status')).json();assert.equal(info.configured,false);const res=await fetch(url+'/api/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskKey:'sss',prompt})});assert.equal(res.status,503);}));
test('classroom authorization, actual route to interpreter, origin and file allowlist',async()=>withServer({GEMINI_API_KEY:'NEVER-EXPOSE',CLASSROOM_CODE:'lesson'},async url=>{
 const post=(extra={})=>fetch(url+'/api/interpret',{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify({taskKey:'sss',prompt})});
 assert.equal((await post()).status,401);assert.equal((await post({'x-classroom-code':'lesson',Origin:'https://evil.example'})).status,403);
 const res=await post({'x-classroom-code':'lesson'});assert.equal(res.status,200);const data=await res.json();assert.equal(data.plan.operations[0].kind,'line');assert.equal(data.validation.type,'incomplete');assert.ok(!JSON.stringify(data).includes('NEVER-EXPOSE'));
 for(const path of ['/.env','/server.mjs','/gemini.mjs','/package.json','/../.env'])assert.equal((await fetch(url+path)).status,404);
 const page=await fetch(url);assert.equal(page.status,200);const policy=page.headers.get('Content-Security-Policy');assert.match(policy,/frame-ancestors 'self'/);assert.ok(policy.includes('https://sites.google.com'));assert.ok(policy.includes('https://aistudio.google.com'));
},async args=>{assert.equal(args.apiKey,'NEVER-EXPOSE');return {plan,model:'test'};}));
test('invalid payload rejected before interpreter',async()=>withServer({GEMINI_API_KEY:'fake'},async url=>{for(const body of ['{',JSON.stringify({taskKey:'__proto__',prompt}),JSON.stringify({taskKey:'sss',prompt:''})]){const r=await fetch(url+'/api/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body});assert.equal(r.status,400);}}));
