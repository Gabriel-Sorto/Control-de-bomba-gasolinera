import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,openShift,addSale,totals,voidSale,closeShift,cents,safeTotals,saveToSafe,summary} from '../src/domain.js';
function opened(){return openShift(initialState(),{name:'Ana',pin:'1234',pump:2,fund:'20',meter:'100'})}
test('valida dinero, PIN y apertura única',()=>{
 for(const v of ['-1','NaN','1.001','','1e2','0'])assert.throws(()=>cents(v));
 assert.equal(cents('7,50'),750);
 assert.throws(()=>openShift(initialState(),{name:'Ana',pin:'0000',pump:1,fund:'20',meter:''}));
 assert.throws(()=>openShift(opened(),{name:'Ana',pin:'1234',pump:1,fund:'20',meter:''}));
});
test('montos suman dinero y solo las ventas por galones suman volumen',()=>{
 let d=opened(),s=d.shifts[0];
 for(const [mode,value,payment] of [['Botón','10','Efectivo'],['Exacto','7.50','Tarjeta POS'],['Galón','2','Efectivo']])d=addSale(d,s.id,{mode,value,payment,fuel:'Regular'}).state;
 const t=totals(d.shifts[0]);assert.equal(t.usd,2520);assert.equal(t.cash,1770);assert.equal(t.card,750);assert.equal(t.count,3);assert.equal(t.gal,2);
});
test('precio histórico permanece al cambiar precios',()=>{
 let d=opened();d=addSale(d,d.shifts[0].id,{mode:'Galón',value:'1',payment:'Efectivo',fuel:'Regular'}).state;
 d.prices.Regular=500;assert.equal(d.shifts[0].sales[0].price,385);assert.equal(totals(d.shifts[0]).usd,385);
});
test('anulación conserva auditoría y excluye totales',()=>{
 let d=opened();const r=addSale(d,d.shifts[0].id,{mode:'Botón',value:'20',payment:'Efectivo',fuel:'Regular'});d=r.state;
 assert.throws(()=>voidSale(d,d.shifts[0].id,r.sale.id,''));
 d=voidSale(d,d.shifts[0].id,r.sale.id,'Monto incorrecto');assert.equal(totals(d.shifts[0]).usd,0);assert.equal(d.shifts[0].sales.length,1);assert.equal(d.shifts[0].sales[0].reason,'Monto incorrecto');assert.throws(()=>voidSale(d,d.shifts[0].id,r.sale.id,'Otra vez'));
});
test('cierre suma fondo, separa POS y bloquea modificaciones',()=>{
 let d=opened(),s=d.shifts[0];
 for(const payment of ['Efectivo','Tarjeta POS'])d=addSale(d,s.id,{mode:'Botón',value:'10',payment,fuel:'Regular'}).state;
 assert.throws(()=>closeShift(d,s.id,'30','99'));
 d=closeShift(d,s.id,'29.50','110');s=d.shifts[0];assert.equal(s.expectedCash,3000);assert.equal(s.difference,-50);assert.equal(totals(s).card,1000);
 assert.throws(()=>addSale(d,s.id,{mode:'Botón',value:'5',payment:'Efectivo',fuel:'Regular'}));assert.throws(()=>voidSale(d,s.id,s.sales[0].id,'Error'));assert.throws(()=>closeShift(d,s.id,'30','110'));
});
test('serialización conserva turno y auditoría al reiniciar',()=>{const d=opened();const r=JSON.parse(JSON.stringify(d));assert.deepEqual(r,d);assert.equal(r.shifts[0].closedAt,null)});
function sell(d,value,payment='Efectivo'){return addSale(d,d.shifts[0].id,{mode:'Exacto',value,payment,fuel:'Regular'}).state}
test('ventas por monto no requieren combustible ni precio y no inventan volumen',()=>{
 let d=opened();d.prices={};
 for(const mode of ['Botón','Exacto']){
  const r=addSale(d,d.shifts[0].id,{mode,value:'10',payment:'Efectivo'});d=r.state;
  assert.equal(r.sale.fuel,null);assert.equal(r.sale.price,null);assert.equal(r.sale.gallons,null);
 }
 assert.equal(totals(d.shifts[0]).usd,2000);assert.equal(totals(d.shifts[0]).gal,0);
 assert.throws(()=>addSale(d,d.shifts[0].id,{mode:'Galón',value:'2',payment:'Efectivo'}));
 assert.throws(()=>addSale(d,d.shifts[0].id,{mode:'Galón',value:'2',fuel:'Regular',payment:'Efectivo'}));
});
test('combustible y precio seleccionados calculan el importe solo en galones',()=>{
 const d=opened();
 for(const fuel of ['Regular','Especial','Diésel']){
  const r=addSale(d,d.shifts[0].id,{mode:'Galón',value:'2.5',fuel,payment:'Efectivo'});
  assert.equal(r.sale.fuel,fuel);assert.equal(r.sale.amount,Math.round(2.5*d.prices[fuel]));assert.equal(r.sale.gallons,2.5);
 }
});
test('aviso desde $200 en efectivo, sin contar POS ni fondo y sin bloquear ventas',()=>{
 let d=sell(opened(),'500','Tarjeta POS');d=sell(d,'199.99');assert.equal(safeTotals(d.shifts[0]).recommended,false);
 d=sell(d,'0.01');assert.equal(safeTotals(d.shifts[0]).recommended,true);
 d=sell(d,'20');assert.equal(safeTotals(d.shifts[0]).available,22000);assert.equal(totals(d.shifts[0]).usd,72000);
});
test('guardados sucesivos reinician aviso, conservan ventas y persisten monto y hora',()=>{
 let d=sell(opened(),'220');const before=totals(d.shifts[0]);d=saveToSafe(d,d.shifts[0].id);
 assert.deepEqual(totals(d.shifts[0]),before);assert.equal(safeTotals(d.shifts[0]).available,0);assert.equal(safeTotals(d.shifts[0]).recommended,false);
 assert.throws(()=>saveToSafe(d,d.shifts[0].id));
 d=sell(d,'200');assert.equal(safeTotals(d.shifts[0]).recommended,true);d=saveToSafe(d,d.shifts[0].id);
 d=JSON.parse(JSON.stringify(d));assert.equal(d.shifts[0].safeDeposits.length,2);assert.deepEqual(d.shifts[0].safeDeposits.map(v=>v.amount),[20000,22000]);assert.ok(d.shifts[0].safeDeposits.every(v=>Number.isFinite(Date.parse(v.at))));assert.equal(safeTotals(d.shifts[0]).saved,42000);assert.match(summary(d.shifts[0]),/Guardados: 2/);
});
test('arqueo descuenta lo ya guardado y conserva el fondo',()=>{
 let d=sell(opened(),'220');d=saveToSafe(d,d.shifts[0].id);d=sell(d,'30');d=sell(d,'100','Tarjeta POS');d=closeShift(d,d.shifts[0].id,'50','');
 assert.equal(d.shifts[0].expectedCash,5000);assert.equal(d.shifts[0].difference,0);assert.equal(safeTotals(d.shifts[0]).saved,22000);assert.throws(()=>saveToSafe(d,d.shifts[0].id));
});
test('turnos anteriores sin guardados siguen siendo compatibles',()=>{
 let d=sell(opened(),'200');delete d.shifts[0].safeDeposits;assert.equal(safeTotals(d.shifts[0]).recommended,true);d=saveToSafe(d,d.shifts[0].id);assert.equal(d.shifts[0].safeDeposits.length,1);
});
test('anulaciones ajustan aviso y saldo sin reescribir los guardados históricos',()=>{
 let d=sell(opened(),'220');const sale=d.shifts[0].sales[0];d=voidSale(d,d.shifts[0].id,sale.id,'Error');assert.equal(safeTotals(d.shifts[0]).recommended,false);
 d=sell(d,'220');const later=d.shifts[0].sales[0];d=saveToSafe(d,d.shifts[0].id);const deposit={...d.shifts[0].safeDeposits[0]};d=voidSale(d,d.shifts[0].id,later.id,'Devolución');assert.equal(safeTotals(d.shifts[0]).balance,-22000);assert.equal(safeTotals(d.shifts[0]).available,0);assert.deepEqual(d.shifts[0].safeDeposits[0],deposit);
});
