export const fuels = ['Regular', 'Especial', 'Diésel'];
export const money = n => '$' + (n / 100).toFixed(2);
export const gallons = n => n.toFixed(3);
export const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
export function numberValue(value) {
  const text = String(value).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,3})?$/.test(text)) throw Error('Ingresa un número válido, sin signos ni separadores de miles.');
  const n = Number(text);
  if (!Number.isFinite(n) || n > 1000000) throw Error('El valor supera el límite permitido.');
  return n;
}
export function cents(value, allowZero = false) {
  const text = String(value).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw Error('Usa como máximo dos decimales para dólares.');
  const n = Math.round(numberValue(text) * 100);
  if (n < (allowZero ? 0 : 1)) throw Error('El monto debe ser mayor que cero.');
  return n;
}
export const initialState = () => ({version: 1, prices: {Regular: 385, Especial: 410, 'Diésel': 360}, priceDate: new Date().toISOString(), shifts: []});
export function totals(shift) {
  return shift.sales.filter(v => !v.voidedAt).reduce((a,v) => ({usd: a.usd + v.amount, gal: a.gal + (v.gallons ?? 0), cash: a.cash + (v.payment === 'Efectivo' ? v.amount : 0), card: a.card + (v.payment === 'Tarjeta POS' ? v.amount : 0), count: a.count + 1}), {usd:0,gal:0,cash:0,card:0,count:0});
}
export const SAFE_THRESHOLD = 20000;
export function safeTotals(shift) {
  const saved = (shift.safeDeposits ?? []).reduce((sum, d) => sum + d.amount, 0);
  const balance = totals(shift).cash - saved;
  return {saved, balance, available: Math.max(0, balance), recommended: balance >= SAFE_THRESHOLD};
}
export function saveToSafe(state, shiftId) {
  const shift = state.shifts.find(s => s.id === shiftId);
  if (!shift || shift.closedAt) throw Error('Abre un turno para registrar dinero en caja fuerte.');
  const {available} = safeTotals(shift);
  if (available <= 0) throw Error('No hay ventas en efectivo pendientes de guardar.');
  const deposit = {id:id(), at:new Date().toISOString(), amount:available};
  return {...state,shifts:state.shifts.map(s => s.id === shiftId ? {...s,safeDeposits:[deposit,...(s.safeDeposits ?? [])]} : s)};
}
export function openShift(state, {name,pin,pump,fund,meter}) {
  if (state.shifts.some(s => !s.closedAt)) throw Error('Ya existe un turno activo.');
  if (!name.trim() || !/^1234$/.test(pin)) throw Error('Ingresa tu nombre y el PIN de prueba: 1234.');
  if (!Number.isInteger(pump) || pump < 1 || pump > 8) throw Error('Selecciona una bomba de 1 a 8.');
  const shift = {id:id(),name:name.trim(),pump,fund:cents(fund,true),meter:meter.trim() ? numberValue(meter) : null,openedAt:new Date().toISOString(),closedAt:null,sales:[],safeDeposits:[]};
  return {...state,shifts:[shift,...state.shifts]};
}
export function addSale(state, shiftId, {mode,value,fuel,payment}) {
  const shift = state.shifts.find(s => s.id === shiftId);
  if (!shift || shift.closedAt) throw Error('Abre un turno para registrar ventas.');
  if (!['Botón','Exacto','Galón'].includes(mode) || !['Efectivo','Tarjeta POS'].includes(payment)) throw Error('Selección inválida.');
  const byGallons = mode === 'Galón';
  if (byGallons && !fuels.includes(fuel)) throw Error('Selecciona el combustible para calcular el precio.');
  const price = byGallons ? state.prices[fuel] : null;
  if (byGallons && !(price > 0)) throw Error('Configura el precio del combustible.');
  const gal = byGallons ? numberValue(value) : null;
  const amount = mode === 'Galón' ? Math.round(gal * price) : cents(value);
  if ((byGallons && gal <= 0) || amount <= 0) throw Error('La venta debe ser mayor que cero.');
  const sale = {id:id(),at:new Date().toISOString(),mode,fuel:byGallons?fuel:null,payment,price,amount,gallons:gal,voidedAt:null,reason:null};
  return {state:{...state,shifts:state.shifts.map(s => s.id === shiftId ? {...s,sales:[sale,...s.sales]} : s)},sale};
}
export function voidSale(state, shiftId, saleId, reason) {
  const shift = state.shifts.find(s => s.id === shiftId);
  if (!shift || shift.closedAt) throw Error('El turno está cerrado.');
  if (!reason.trim()) throw Error('Escribe el motivo de la anulación.');
  const sale = shift.sales.find(s => s.id === saleId);
  if (!sale || sale.voidedAt) throw Error('La venta ya está anulada o no existe.');
  return {...state,shifts:state.shifts.map(s => s.id === shiftId ? {...s,sales:s.sales.map(v => v.id === saleId ? {...v,voidedAt:new Date().toISOString(),reason:reason.trim()} : v)} : s)};
}
export function closeShift(state, shiftId, counted, meterEnd) {
  const shift = state.shifts.find(s => s.id === shiftId);
  if (!shift || shift.closedAt) throw Error('El turno ya está cerrado.');
  const cashCounted = cents(counted,true);
  const end = meterEnd.trim() ? numberValue(meterEnd) : null;
  if (end !== null && shift.meter !== null && end < shift.meter) throw Error('La lectura final no puede ser menor que la inicial.');
  const t = totals(shift);
  const expectedCash = t.cash + shift.fund - safeTotals(shift).saved;
  return {...state,shifts:state.shifts.map(s => s.id === shiftId ? {...s,closedAt:new Date().toISOString(),cashCounted,meterEnd:end,expectedCash,difference:cashCounted-expectedCash} : s)};
}
export const dateText = value => new Date(value).toLocaleString('es-SV');
export function summary(s) {
  const t = totals(s);
  return `GASOLINERA AZUL · CORTE ${s.id}\n${s.name} · Bomba ${s.pump}\nInicio: ${dateText(s.openedAt)}\nCierre: ${s.closedAt ? dateText(s.closedAt) : 'Turno activo'}\nVentas: ${money(t.usd)}\nOperaciones válidas: ${t.count}\nEfectivo vendido: ${money(t.cash)}\nTarjeta POS: ${money(t.card)}\nFondo inicial: ${money(s.fund)}\nEfectivo a entregar: ${money(t.cash+s.fund)}\nEfectivo contado al cierre (fuera de caja fuerte): ${s.closedAt ? money(s.cashCounted) : 'Pendiente'}\nDiferencia: ${s.closedAt ? money(s.difference) : 'Pendiente'}\nGuardado en caja fuerte: ${money(safeTotals(s).saved)}\nEfectivo pendiente con fondo: ${money(t.cash+s.fund-safeTotals(s).saved)}\nGuardados: ${(s.safeDeposits ?? []).length}${(s.safeDeposits ?? []).map(d => `\n- ${dateText(d.at)}: ${money(d.amount)}`).join('')}\nTotalizador inicial: ${s.meter ?? 'Sin lectura'}\nTotalizador final: ${s.meterEnd ?? 'Sin lectura'}`;
}
