(function (root, factory) {
  const core = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  root.SCALA_CORE = core;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const currency = (cents, code='BOB') => new Intl.NumberFormat('es-BO', {style:'currency', currency:code==='USD'?'USD':'BOB', minimumFractionDigits:2}).format(cents/100);
  const money = value => {
    let s = String(value ?? '').trim().replace(/\s/g, '');
    if (!s) return NaN;
    if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g,'').replace(',','.') : s.replace(/,/g,'');
    else if (s.includes(',')) s=s.replace(',','.');
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
    const n=Math.round(Number(s)*100);
    return Number.isSafeInteger(n) && n>=0 ? n : NaN;
  };
  const cleanText=(s,max=100)=>String(s??'').trim().slice(0,max);
  const validQty=n=>Number.isSafeInteger(n) && n>0 && n<=100000;
  const id=()=> 's'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
  const initial=()=>({version:1, settings:{name:'Mi negocio',phone:'',currency:'BOB'},customers:[],products:[],sales:[],quotes:[]});
  const requireNonempty=(value,label)=>{if(!cleanText(value))throw new Error('Ingresa '+label)};
  function validateProduct(p){requireNonempty(p.name,'el nombre del producto');if(!Number.isSafeInteger(p.price)||p.price<0)throw new Error('Precio no válido');if(!Number.isSafeInteger(p.stock)||p.stock<0)throw new Error('Existencia no válida');}
  function calculate(items, products){
    if(!Array.isArray(items)||!items.length)throw new Error('Agrega por lo menos un producto');
    let total=0;
    for(const item of items){const product=products.find(p=>p.id===item.productId);if(!product)throw new Error('Producto no encontrado');if(!validQty(item.qty))throw new Error('Cantidad inválida');total+=product.price*item.qty;}
    if(!Number.isSafeInteger(total))throw new Error('Importe fuera de rango');
    return total;
  }
  function createOrder(state,kind,customerId,items,notes=''){
    if(kind!=='sale'&&kind!=='quote')throw new Error('Tipo no válido');
    const customer=state.customers.find(c=>c.id===customerId);
    if(!customer)throw new Error('Selecciona un cliente');
    const consolidated=[];
    for(const item of items){const prev=consolidated.find(i=>i.productId===item.productId);if(prev)prev.qty+=item.qty;else consolidated.push({productId:item.productId,qty:item.qty});}
    const total=calculate(consolidated,state.products);
    if(kind==='sale')for(const i of consolidated){const p=state.products.find(p=>p.id===i.productId);if(p.stock<i.qty)throw new Error('Inventario insuficiente: '+p.name);}
    const lines=consolidated.map(i=>{const p=state.products.find(p=>p.id===i.productId);return {productId:p.id,name:p.name,qty:i.qty,price:p.price};});
    const order={id:id(),number:nextNumber(kind==='sale'?state.sales:state.quotes,kind==='sale'?'V':'C'),customerId,customerName:customer.name,createdAt:new Date().toISOString(),status:kind==='sale'?'pendiente':'enviada',payment:'pendiente',total,items:lines,notes:cleanText(notes,500)};
    if(kind==='sale'){for(const i of consolidated)state.products.find(p=>p.id===i.productId).stock-=i.qty;state.sales.unshift(order);}
    else state.quotes.unshift(order);
    return order;
  }
  function nextNumber(list,prefix){let max=0;for(const o of list){const n=parseInt(String(o.number||'').replace(/\D/g,''),10);if(Number.isFinite(n)&&n>max)max=n;}return prefix+'-'+String(max+1).padStart(5,'0');}
  function convertQuote(state,id){const q=state.quotes.find(x=>x.id===id);if(!q)throw new Error('Cotización no encontrada');if(q.status==='convertida')throw new Error('Ya fue convertida');const sale=createOrder(state,'sale',q.customerId,q.items.map(i=>({productId:i.productId,qty:i.qty})),q.notes);q.status='convertida';q.saleId=sale.id;return sale;}
  function totals(state){const now=new Date();const ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');const sales=state.sales.filter(s=>s.status!=='anulada');const monthly=sales.filter(s=>s.createdAt.slice(0,7)===ym);return {month:monthly.reduce((a,s)=>a+s.total,0),all:sales.reduce((a,s)=>a+s.total,0),pending:sales.filter(s=>s.payment!=='pagado').reduce((a,s)=>a+s.total,0),sales:monthly.length};}
  function restore(value){if(!value||typeof value!=='object'||value.version!==1||!Array.isArray(value.customers)||!Array.isArray(value.products)||!Array.isArray(value.sales)||!Array.isArray(value.quotes)||!value.settings)throw new Error('Archivo de respaldo incompatible');if(JSON.stringify(value).length>5_000_000)throw new Error('Respaldo demasiado grande');for(const p of value.products)validateProduct(p);return value;}
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function message(order,business){let body=`${business.name}\n${order.number}\nCliente: ${order.customerName}\n\n`;for(const i of order.items)body+=`${i.qty} × ${i.name} — ${currency(i.price*i.qty,business.currency)}\n`;body+=`\nTOTAL: ${currency(order.total,business.currency)}\n`;if(order.notes)body+=`Notas: ${order.notes}\n`;body+='\nCotización o comprobante comercial, no constituye factura fiscal.';return body;}
  return {currency,money,cleanText,validQty,id,initial,validateProduct,calculate,createOrder,convertQuote,totals,restore,esc,message};
});
