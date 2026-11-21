// Usage: node render.js "<query>" <outDir>  — renders render.html in headless Chromium (llvmpipe or SwiftShader) and saves window.shots as PNGs.
// NODE_TOOLS = folder whose node_modules has playwright (cloud default /opt/node-tools); CHROME = browser exe when Playwright's own is not installed (PC)
const {chromium}=require('module').createRequire((process.env.NODE_TOOLS||'/opt/node-tools')+'/')('playwright');
const path=require('path'),fs=require('fs');
const DIR=__dirname,DEPS=process.env.NODE_MODULES||path.join(DIR,'node_modules');  // three@0.186.1 lives here (gitignored)
const CT={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.bin':'application/octet-stream'};
(async()=>{
 const q=process.argv[2]||'',out=path.resolve(DIR,process.argv[3]||'shots');fs.mkdirSync(out,{recursive:true});
 // WebGL on the CPU: Mesa llvmpipe when the machine has it (renders several times faster), else SwiftShader; GL=swiftshader forces it
 const MESA=['/usr/lib/x86_64-linux-gnu/libEGL_mesa.so.0','/usr/lib/aarch64-linux-gnu/libEGL_mesa.so.0','/usr/lib64/libEGL_mesa.so.0'].some(f=>fs.existsSync(f));
 const GL=process.env.GL||(MESA?'llvmpipe':'swiftshader');
 const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-gl=angle',...(GL==='llvmpipe'?['--use-angle=gl-egl']:['--use-angle=swiftshader','--enable-unsafe-swiftshader']),'--ignore-gpu-blocklist','--disable-gpu-watchdog'],env:{...process.env,EGL_PLATFORM:'surfaceless'}});
 const p=await b.newPage({viewport:{width:800,height:600}});
 p.on('console',m=>console.log('console:',m.text().slice(0,300)));p.on('pageerror',e=>console.log('pageerror:',e.message));
 await p.route('http://t/**',r=>{const u=new URL(r.request().url()),f=u.pathname.startsWith('/three/')?path.join(DEPS,u.pathname):path.join(DIR,u.pathname);
  if(!fs.existsSync(f))return r.fulfill({status:404,body:'not found'});
  r.fulfill({status:200,contentType:CT[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)})});
 const t0=Date.now();await p.goto('http://t/'+(process.env.PAGE||'render.html')+'?'+q);
 await p.waitForFunction(()=>window.done||window.fail,null,{timeout:0,polling:1000});
 const fail=await p.evaluate(()=>window.fail);if(fail){console.log('FAIL',fail);await b.close();process.exit(1)}
 const shots=await p.evaluate(()=>window.shots);
 for(const k in shots)fs.writeFileSync(path.join(out,k+'.png'),Buffer.from(shots[k].split(',')[1],'base64'));
 console.log(JSON.stringify(await p.evaluate(()=>window.info)));console.log('time',(Date.now()-t0)/1000,GL);await b.close();
})();
