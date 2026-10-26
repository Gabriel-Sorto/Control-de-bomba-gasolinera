import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./web-preview/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.wav':'audio/wav','.json':'application/json','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 try{
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
  const file=path.resolve(root,relative);
  if(!file.startsWith(root)){res.writeHead(403);res.end();return}
  const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(body);
 }catch{res.writeHead(404);res.end('Archivo no encontrado')}
});
server.on('error',e=>{console.error('No se pudo abrir la vista previa:',e.message);process.exitCode=1});
server.listen(4173,'127.0.0.1',()=>console.log('\nGasolinera Azul: http://127.0.0.1:4173\nPIN de prueba: 1234\nDeja esta terminal abierta. Ctrl+C para detener.'));
