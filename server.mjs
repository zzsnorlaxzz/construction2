import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';
import {timingSafeEqual} from 'node:crypto';
import {translate} from './gemini.mjs';
import {TASKS,execute} from './engine.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const files={'/':['index.html','text/html; charset=utf-8'],'/index.html':['index.html','text/html; charset=utf-8'],'/app.mjs':['app.mjs','text/javascript; charset=utf-8'],'/engine.mjs':['engine.mjs','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function same(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function makeServer({env=process.env,translateImpl=translate}={}){
  const requests=new Map();let active=0;
  return createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self' https://aistudio.google.com https://*.aistudio.google.com https://sites.google.com https://*.googleusercontent.com; base-uri 'none'");
    try{
      const path=new URL(req.url,'http://local').pathname;
      if(req.method==='GET'&&path==='/api/status')return send(res,200,{configured:!!env.GEMINI_API_KEY,codeRequired:!!env.CLASSROOM_CODE,model:env.GEMINI_MODEL||'gemini-3.8-flash'});
      if(req.method==='POST'&&path==='/api/interpret'){
        // No cross-origin access. Keys and provider errors never reach the client.
        if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return send(res,403,{error:'같은 사이트에서 접속해 주세요.'});
        if(req.headers['content-type']?.split(';')[0]!=='application/json')return send(res,415,{error:'JSON 요청이 필요합니다.'});
        if(!env.GEMINI_API_KEY)return send(res,503,{error:'Gemini 연결 준비가 필요합니다. 교사가 서버의 GEMINI_API_KEY를 설정해야 합니다.'});
        if(!env.CLASSROOM_CODE&&!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return send(res,503,{error:'교사가 서버에 수업 접속 코드를 설정해야 합니다.'});
        if(env.CLASSROOM_CODE&&!same(String(req.headers['x-classroom-code']||''),env.CLASSROOM_CODE))return send(res,401,{error:'수업 접속 코드를 확인해 주세요.'});
        const now=Date.now(),ip=req.socket.remoteAddress;
        for(const [k,v] of requests)if(v.reset<now)requests.delete(k);
        const budget=requests.get(ip)||{count:0,reset:now+60000};
        if(budget.count>=12||active>=4)return send(res,429,{error:'요청이 많습니다. 잠시 후 다시 시도해 주세요.'});
        let bytes=0,chunks=[];
        for await(const chunk of req){bytes+=chunk.length;if(bytes>24000){send(res,413,{error:'명령문은 6000자 이내로 작성해 주세요.'});return;}chunks.push(chunk);}
        let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(res,400,{error:'요청 형식을 확인해 주세요.'});}
        if(typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>6000||!Object.hasOwn(TASKS,body.taskKey))return send(res,400,{error:'과제를 선택하고 1~6000자의 명령문을 입력해 주세요.'});
        budget.count++;requests.set(ip,budget);active++;
        try{const result=await translateImpl({taskKey:body.taskKey,prompt:body.prompt,apiKey:env.GEMINI_API_KEY,model:env.GEMINI_MODEL||'gemini-3.8-flash'});return send(res,200,{...result,validation:execute(body.taskKey,result.plan.operations).assessment});}
        finally{active--;}
      }
      if(req.method==='GET'&&Object.hasOwn(files,path)){const [file,mime]=files[path];res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache'});res.end(await readFile(join(root,file)));return;}
      send(res,404,{error:'찾을 수 없는 주소입니다.'});
    }catch(e){send(res,502,{error:e.name==='TimeoutError'?'Gemini 응답 시간이 길어졌습니다. 다시 시도해 주세요.':e.message?.includes('Gemini')||e.message?.includes('AI')?e.message:'처리 중 문제가 생겼습니다. 다시 시도해 주세요.'});}
  });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
  const host=process.env.HOST||(process.env.PORT?'0.0.0.0':'127.0.0.1'),port=Number(process.env.PORT||3000);
  makeServer().listen(port,host,()=>console.log(`작도 실험실: http://${host}:${port} · Gemini 키 ${process.env.GEMINI_API_KEY?'설정됨':'미설정'}`));
}
