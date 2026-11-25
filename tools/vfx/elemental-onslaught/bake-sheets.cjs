// Bake hub VFX Generator sheet scripts (gen-sheets.json) with the hub's own ugen.js in headless Chromium.
//   node bake-sheets.cjs <dir with ugen.js> gen-sheets.json OUTDIR   (ugen.js: hub artifact tools/vfx/showcase/lib)
const http=require('http'),fs=require('fs'),path=require('path'),{chromium}=require('playwright')
const [LIB,SCRIPTS,OUT]=process.argv.slice(2)
const srv=http.createServer((q,r)=>{const f=path.join(LIB,q.url==='/'?'x.html':q.url);if(q.url==='/'){r.setHeader('content-type','text/html');return r.end('<html></html>')}
 fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;return r.end()}r.setHeader('content-type','text/javascript');r.end(d)})}).listen(0,async()=>{
 const b=await chromium.launch(),p=await b.newPage();await p.goto(`http://127.0.0.1:${srv.address().port}/`)
 const S=JSON.parse(fs.readFileSync(SCRIPTS))
 for(const [id,code] of Object.entries(S)){
  const r=await p.evaluate(async code=>{const u=await import('/ugen.js');const s=await u.makeSheet(code,1125);const buf=new Uint8Array(await s.blob.arrayBuffer());let bin='';for(const c of buf)bin+=String.fromCharCode(c);return {b64:btoa(bin),empty:s.empty,jump:s.jump}},code)
  fs.writeFileSync(path.join(OUT,id+'.png'),Buffer.from(r.b64,'base64'));console.log(id,'empty',r.empty,'jump',r.jump)}
 await b.close();srv.close()})
