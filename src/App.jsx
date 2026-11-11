import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://cwjfxuelbzlxingxylfp.supabase.co";
const SUPABASE_KEY = "sb_publishable_4Mex1P359ZgUxk2VmS1iRA_oAVwjGmc";
const db = {
  async get(table, filters={}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
    Object.entries(filters).forEach(([k,v])=>url+=`&${k}=eq.${v}`);
    const res = await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
    return res.json();
  },
  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:"POST",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(data)});
    return res.json();
  },
  async update(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`,{method:"PATCH",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(data)});
    return res.json();
  },
};

// ── Club Hindica: conexión segura (solo funciones controladas, nunca la tabla) ──
const CLUB_URL = "https://club-hindica.vercel.app";
async function clubRpc(fn, args){
  try{
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify(args)});
    if(!r.ok) return {ok:false,error:"No pudimos conectar con el Club. Intenta de nuevo."};
    return await r.json();
  }catch(e){ return {ok:false,error:"Sin conexión. Intenta de nuevo."}; }
}
const clubClave = { get(){ try{return localStorage.getItem("club_clave_equipo")||"";}catch(e){return "";} }, set(v){ try{ v?localStorage.setItem("club_clave_equipo",v):localStorage.removeItem("club_clave_equipo"); }catch(e){} } };
const clubTienda = t => (t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");

// ── Stock guardado en la base de datos (tabla "stock") ──
const stockHeaders = {apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"};
const stockDesdeFila = r => ({id:r.id,tipo:r.tipo,categoria:r.categoria,producto:r.producto,colorBase:r.color_base,estampado:r.estampado,colorAcento:r.color_acento,foto:r.foto,cantidad:r.cantidad,ubicacion:r.ubicacion,fechaIngreso:r.created_at});
const stockAFila = s => ({id:String(s.id),tipo:s.tipo||null,categoria:s.categoria||null,producto:s.producto||null,color_base:s.colorBase||null,estampado:s.estampado||null,color_acento:s.colorAcento||null,foto:s.foto||null,cantidad:Number(s.cantidad)||0,ubicacion:s.ubicacion||null,updated_at:new Date().toISOString()});
let stockAvisado = false;
const stockDb = {
  async cargar(){
    try{ const r=await fetch(`${SUPABASE_URL}/rest/v1/stock?select=*`,{headers:stockHeaders}); if(!r.ok)return null; const d=await r.json(); return Array.isArray(d)?d.map(stockDesdeFila):null; }catch(e){ return null; }
  },
  async sincronizar(prev,next){
    const antes=new Map(prev.map(s=>[s.id,s])); const ahora=new Set(next.map(s=>s.id));
    const cambiados=next.filter(s=>{const a=antes.get(s.id);return !a||a.cantidad!==s.cantidad||a.ubicacion!==s.ubicacion;});
    const borrados=prev.filter(s=>!ahora.has(s.id)).map(s=>String(s.id));
    let ok=true;
    try{
      if(cambiados.length){ const r=await fetch(`${SUPABASE_URL}/rest/v1/stock`,{method:"POST",headers:{...stockHeaders,Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(cambiados.map(stockAFila))}); if(!r.ok)ok=false; }
      if(borrados.length){ const r=await fetch(`${SUPABASE_URL}/rest/v1/stock?id=in.(${borrados.map(id=>`"${id}"`).join(",")})`,{method:"DELETE",headers:stockHeaders}); if(!r.ok)ok=false; }
    }catch(e){ ok=false; }
    if(!ok&&!stockAvisado){ stockAvisado=true; alert("No se pudo guardar el stock en el sistema. Revisa la conexión a internet y vuelve a intentarlo."); setTimeout(()=>{stockAvisado=false;},60000); }
  }
};
const mismoArticulo = (a,b) => a.tipo===b.tipo&&a.categoria===b.categoria&&a.producto===b.producto&&a.colorBase===b.colorBase&&(a.estampado||"")===(b.estampado||"")&&(a.colorAcento||"")===(b.colorAcento||"")&&(a.foto||"")===(b.foto||"");
const descArticulo = s => `${s.producto} ${s.colorBase}${s.estampado&&s.estampado!=="-"?` ${s.estampado}`:""}`;

const TIENDAS_DEFAULT   = ["Maitencillo","Papudo","Reñaca"];
const DUENA_PIN_DEFAULT = "1234";
const VENDEDORAS_DEFAULT= [{nombre:"Vendedora 1",pin:"1234"},{nombre:"Vendedora 2",pin:"1234"}];
const BODEGAS           = ["Bodega Parcela","Bodega Santiago"];
const JOYERIA_ITEMS     = ["Arete","Collar","Pulsera","Anillo","Tobillera"];
const ROPA_ITEMS = {
  "Faldas":["Falda larga wrap","Falda gitana","Falda corta wrap","Falda corta elástica"],
  "Tops":["Top cuello V largo","Top cuello V corto","Top amarrado manga larga","Top amarrado manga corta","Top elástico","Top reversible"],
  "Pantalones":["Pantalón"],
  "Vestidos":["Vestido wrap largo","Vestido wrap corto","Vestido Chile corto","Vestido Chile largo","Vestido Una corto","Vestido Una largo"],
  "Accesorios":["Scrunchie ⭐","Bufanda"],
};
const COLORES    = ["Azul","Rojo","Verde","Morado","Naranja","Rosa","Amarillo","Negro","Blanco","Tierra","Turquesa","Café"];
const ESTAMPADOS = ["Indiana","Floral","Geométrico","Mandala","Abstracto","Tropical","Étnico","Boho","Liso"];
const MEDIOS_PAGO= [{id:"efectivo",label:"Efectivo",icon:"💵"},{id:"transferencia",label:"Transferencia",icon:"📱"},{id:"credito",label:"Crédito",icon:"💳"},{id:"debito",label:"Débito",icon:"💳"}];
const LISTA_APERTURA = [
  {id:"piso",label:"Limpié el piso de la tienda"},
  {id:"espejos",label:"Limpié los espejos"},
  {id:"tablero",label:"Tablero de accesorios: 1 de c/u, colores variados"},
  {id:"exhibicion",label:"Ropa bien exhibida y ordenada"},
  {id:"insumos",label:"Revisé insumos (bolsas, papel, etc.)"},
  {id:"stock",label:"Conté el stock y está correcto"},
];
const LISTA_HORARIA = [
  {id:"orden",label:"La tienda está ordenada"},
  {id:"exhibicion",label:"Artículos bien exhibidos"},
  {id:"tablero",label:"Tablero accesorios: 1 de c/u, colores variados"},
  {id:"estado",label:"Nada roto o en mal estado"},
];
const LISTA_CIERRE = [
  {id:"limpieza",label:"Limpié la tienda"},
  {id:"orden",label:"Dejé todo ordenado para mañana"},
  {id:"tablero",label:"Tablero de accesorios guardado correctamente"},
  {id:"stock",label:"Conté el stock de cierre"},
];

const PRINCIPIOS = [
  {numero:1,titulo:"Las personas están antes que las ventas",texto:"Nuestro trabajo no es vender vestidos. Nuestro trabajo es ayudar a las personas.\n\nCuando una clienta se siente escuchada, comprendida y valorada, la venta ocurre de manera natural.\n\nCada clienta debe sentirse bienvenida, respetada y apreciada."},
  {numero:2,titulo:"Una relación vale más que una venta",texto:"Una venta termina cuando la clienta paga. Una relación puede durar muchos años.\n\nNunca sacrifiques una relación por cerrar una venta. Sé siempre honesta.\n\nLa confianza es nuestro activo más importante."},
  {numero:3,titulo:"Cada clienta es una invitada",texto:"Imagina que cada persona que entra a Hindica está entrando a tu casa.\n\nRecíbela con una sonrisa. Hazla sentir cómoda. Dale espacio para mirar.\n\nAcércate con amabilidad, nunca con presión."},
  {numero:4,titulo:"No vendemos ropa. Vendemos cómo una mujer se siente.",texto:"Las mujeres no compran solamente un vestido.\n\nCompran la sensación de verse lindas. De sentirse seguras. De sentirse diferentes. De sentirse especiales.\n\nNuestro trabajo es ayudarlas a descubrir esa versión de ellas mismas."},
  {numero:5,titulo:"Cada prenda tiene una historia",texto:"Cada prenda de Hindica ha sido cuidadosamente seleccionada.\n\nEn muchos casos existen solo tres prendas iguales en todo Chile.\n\nCuando una clienta compra en Hindica, compra algo que muy pocas personas tendrán."},
  {numero:6,titulo:"Creamos experiencias, no solo ventas",texto:"Las personas olvidan los precios. Pero recuerdan cómo las hicieron sentir.\n\nQueremos que cada visita sea una experiencia agradable.\n\nAunque hoy no compre nada, queremos que tenga ganas de volver."},
  {numero:7,titulo:"Acompañamos. No presionamos.",texto:"Nunca insistimos. Nunca perseguimos. Nunca hacemos sentir incómoda a una clienta.\n\nEscuchamos. Aconsejamos. Guiamos.\n\nUna buena atención siempre vende más que la presión."},
  {numero:8,titulo:"Ayudamos a crear un look completo",texto:"Cuando una clienta encuentra un vestido que le encanta, nuestro trabajo no termina.\n\nPodemos sugerir unos aros, un collar, una pulsera, un scrunchie.\n\nSiempre pensando en ayudarla a verse aún mejor, nunca solo para vender más."},
  {numero:9,titulo:"Los pequeños detalles hacen la diferencia",texto:"Una prenda bien doblada. Una tienda ordenada. Una sonrisa sincera.\n\nRecordar el nombre de una clienta. Ofrecer un cumplido genuino.\n\nEl lujo se construye con pequeños detalles."},
  {numero:10,titulo:"Cada clienta debe salir mejor de cómo entró",texto:"Esa es nuestra promesa.\n\nNo importa si compra o no. No importa cuánto gaste.\n\nQueremos que salga sintiéndose feliz, valorada y con ganas de volver.\n\nSi logramos eso, hemos hecho bien nuestro trabajo."},
];

const PREGUNTAS = [
  {p:1,q:"¿Cuál es el trabajo principal de una vendedora Hindica?",ops:["Vender la mayor cantidad posible","Ayudar a las personas","Mantener la tienda limpia","Registrar todas las ventas"],c:1},
  {p:1,q:"Una clienta entra y solo está mirando. ¿Qué haces?",ops:["La presionas para que compre","La ignoras hasta que pida ayuda","La recibes con sonrisa y le das espacio","Le preguntas cuánto quiere gastar"],c:2},
  {p:2,q:"Una clienta quiere comprar algo que no le queda bien. ¿Qué haces?",ops:["Se lo vendes igual","Le dices honestamente que no le favorece","No dices nada","Le cobras un precio especial"],c:1},
  {p:3,q:"¿Cómo debe sentirse una clienta cuando entra a Hindica?",ops:["Presionada a comprar rápido","Bienvenida, cómoda y con espacio para mirar","Obligada a decidir pronto","Evaluada por su apariencia"],c:1},
  {p:4,q:"Cuando una mujer compra en Hindica, ¿qué busca principalmente?",ops:["El precio más bajo","La última moda","Sentirse linda, segura y especial","Ropa para el trabajo"],c:2},
  {p:5,q:"¿Cuántas prendas del mismo estampado pueden existir en Chile?",ops:["Miles","Cientos","En muchos casos solo tres","Tantas como se quieran"],c:2},
  {p:6,q:"Una clienta viene y no compra nada. ¿Qué es lo más importante?",ops:["Que compre la próxima vez","Que salga queriendo volver","Convencerla antes de que se vaya","Ofrecerle un descuento"],c:1},
  {p:7,q:"¿Cuál es la regla más importante al atender a una clienta?",ops:["Insistir hasta que compre","Seguirla por toda la tienda","Nunca presionar, siempre acompañar","Preguntarle varias veces si va a comprar"],c:2},
  {p:8,q:"Una clienta encuentra un vestido que le encanta. ¿Qué haces?",ops:["Cobras el vestido y listo","Le sugieres accesorios para completar el look","Le muestras vestidos más caros","No haces nada más"],c:1},
  {p:9,q:"¿Cuáles son pequeños detalles que hacen la diferencia?",ops:["Solo el precio bajo","Prenda bien doblada, sonrisa sincera, recordar el nombre","La velocidad de la venta","Tener muchos productos"],c:1},
  {p:10,q:"¿Cuál es la promesa Hindica con cada clienta?",ops:["Que siempre compre algo","Que gaste más cada visita","Que salga feliz, valorada y con ganas de volver","Que recomiende Hindica"],c:2},
  {p:2,q:"La confianza en Hindica se construye con...",ops:["Descuentos frecuentes","Honestidad y relaciones duraderas","Mucha publicidad","Muchos productos"],c:1},
  {p:6,q:"Las personas recuerdan principalmente...",ops:["Los precios","Cómo las hicieron sentir","Los productos disponibles","Las ofertas del día"],c:1},
  {p:9,q:"Recordar el nombre de una clienta es...",ops:["Innecesario","Un pequeño detalle que hace la diferencia","Imposible cuando hay mucha gente","Solo para clientas frecuentes"],c:1},
  {p:8,q:"Sugerir accesorios a una clienta se hace...",ops:["Para vender más a toda costa","Pensando en ayudarla a verse aún mejor","Solo si parece tener dinero","Solo si pregunta por accesorios"],c:1},
  {p:0,q:"Una clienta dice: Lo vi en Patronato más barato. ¿Qué respondes?",ops:["Pero el nuestro es de mejor calidad","Suena a muy buen precio. ¿Y lo compraste?","Los precios de Patronato son distintos","Puedo hacerte un descuento"],c:1},
  {p:0,q:"Una clienta dice: Lo voy a pensar. ¿Qué haces?",ops:["Le dices que aquí estarás","Le preguntas si hay algo en particular que la haga dudar","Le ofreces un descuento","La dejas ir sin decir nada"],c:1},
  {p:0,q:"Una clienta pide un descuento. ¿Qué haces?",ops:["Le das un 10% para cerrar la venta","Le dices que preguntarás a la dueña","Le ofreces inscribirse al Club Hindica","Le dices que no y punto"],c:2},
  {p:0,q:"Una clienta dice: Tengo que preguntarle a mi pareja. ¿Cuál es la mejor respuesta?",ops:["¿Él decide por ti?","¿Quieres que te tome una foto para mostrarle?","Bueno, aquí estaré","Es tu decisión, no la de él"],c:1},
  {p:0,q:"Una clienta dice que está muy caro. ¿Qué NO debes hacer?",ops:["Explicar que es hecho a mano en India","Mencionar que el estampado es único","Disculparte por el precio y ofrecer descuento","Ofrecerle el Club Hindica"],c:2},
  {p:0,q:"Una clienta se prueba algo que NO le queda bien. ¿Qué haces?",ops:["Le dices que le queda perfecto","Le dices honestamente que otro modelo la favorece más","No dices nada","Le dices que es cuestión de gustos"],c:1},
  {p:0,q:"¿Cuál es el principio al responder Lo vi más barato en otro lado?",ops:["Defender nuestro precio","Comparar calidades","Dejar que ella misma explique por qué no lo compró","Ofrecer igualar el precio"],c:2},
  {p:0,q:"Una clienta dice: Voy a dar una vuelta y vuelvo. ¿Qué haces?",ops:["Pones cara de decepción","Le ofreces apartárselo y le das tu nombre","Le dices que se va a ir rápido","La sigues hasta la puerta insistiendo"],c:1},
  {p:0,q:"Una clienta entra a la tienda. Después de saludarla, ¿qué le preguntas primero?",ops:["¿Qué andas buscando?","¿Eres socia del Club Hindica?","¿Te muestro las ofertas?","¿Quieres unirte al Club?"],c:1},
  {p:0,q:"Te dice que NO es socia. ¿Qué haces?",ops:["Le explicas el Club al tiro","Le muestras el QR","Le preguntas su nombre igual","Nada, la dejas mirar"],c:2},
  {p:0,q:"¿Cuándo le explicas el Club a una clienta?",ops:["Apenas entra","Si ella pregunta o al momento de pagar","Nunca","Solo si compra mucho"],c:1},
  {p:0,q:"¿Cuántas veces conviene usar el nombre de la clienta durante la visita?",ops:["Una vez","Al menos tres, de forma natural","En cada frase","No es necesario"],c:1},
  {p:0,q:"¿Cuánto descuento tiene una clienta que se une al Club hoy?",ops:["5%","10%","20% en su primera compra","3 x 2"],c:2},
  {p:0,q:"Una socia ya usó su 20% de bienvenida. ¿Qué descuento tiene ahora?",ops:["20% otra vez","Ninguno","5% en todas sus compras","10%"],c:2},
  {p:0,q:"¿Cuántos mensajes al año recibe una socia como máximo?",ops:["Los que sean necesarios","Uno por mes","Máximo 5, incluido el de cumpleaños","Máximo 6"],c:2},
  {p:0,q:"Una socia olvidó su número. ¿Qué haces?",ops:["Le dices que vuelva otro día","La inscribes de nuevo","La buscas por su RUT en la app","Le aplicas el descuento sin buscarla"],c:2},
  {p:0,q:"Una socia viene por su regalo de cumpleaños sin comprar nada. ¿Qué haces?",ops:["Le pides que compre algo","Se lo entregas y lo anotas en la app","Solo si es el día exacto","Solo si compró este año"],c:1},
  {p:0,q:"¿Cuánto cuesta inscribirse al Club Hindica?",ops:["$5.000 al año","Es gratis, para siempre","Depende de cuánto compre","Solo la primera compra"],c:1},
];

const C={bg:"#FAF7F2",dark:"#1C3A2E",orange:"#E8621F",purple:"#8B3A7E",gold:"#C9963E",text:"#1A1A1A",muted:"#7A7065",border:"#DDD5C8",green:"#2D7A45",red:"#C0392B",white:"#FFFFFF"};
const fmt=n=>new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(n||0);
const fmtTime=d=>new Date(d).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"});
const fmtDate=d=>new Date(d).toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"});
const sInput={width:"100%",padding:"12px 16px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:15,background:C.white,color:C.text,boxSizing:"border-box",outline:"none",fontFamily:"inherit"};
const sCard=(x={})=>({background:C.white,borderRadius:16,padding:20,marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",...x});
const sBtn=(color=C.orange,full=false,x={})=>({background:color,color:C.white,border:"none",borderRadius:12,padding:"14px 20px",fontSize:16,fontWeight:700,cursor:"pointer",width:full?"100%":"auto",fontFamily:"inherit",...x});

function FotoInput({label,value,onChange,required=false}){
  const ref=useRef();
  const handle=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>onChange(ev.target.result);r.readAsDataURL(file);};
  return(
    <div style={{marginBottom:16}}>
      <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}{required&&<span style={{color:C.red}}> *</span>}</div>
      <input ref={ref} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handle}/>
      {value?(
        <div>
          <img src={value} alt="" style={{width:"100%",borderRadius:12,maxHeight:200,objectFit:"cover",display:"block"}}/>
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button onClick={()=>ref.current.click()} style={{...sBtn(C.dark),padding:"8px 16px",fontSize:13,borderRadius:8,flex:1}}>📷 Cambiar</button>
            <button onClick={()=>onChange(null)} style={{...sBtn(C.red),padding:"8px 16px",fontSize:13,borderRadius:8}}>✕</button>
          </div>
        </div>
      ):(
        <div onClick={()=>ref.current.click()} style={{border:`2px dashed ${C.orange}`,borderRadius:14,padding:"28px 20px",textAlign:"center",cursor:"pointer",background:"#FEF8F3"}}>
          <div style={{fontSize:40,marginBottom:8}}>📷</div>
          <div style={{fontSize:15,fontWeight:700,color:C.orange}}>Toca para agregar foto</div>
          <div style={{fontSize:12,color:C.muted,marginTop:4}}>Cámara o galería</div>
        </div>
      )}
    </div>
  );
}

function Header({title,subtitle,color=C.dark,onBack}){
  return(
    <div style={{background:color,padding:"20px 20px 24px"}}>
      {onBack&&<button onClick={onBack} style={{background:"rgba(255,255,255,0.15)",border:"none",color:C.white,borderRadius:8,padding:"6px 14px",fontSize:14,cursor:"pointer",marginBottom:12,fontFamily:"inherit"}}>← Volver</button>}
      <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:"3px",marginBottom:4}}>HINDICA</div>
      <div style={{fontSize:24,fontWeight:800,color:C.white,lineHeight:1.1}}>{title}</div>
      {subtitle&&<div style={{fontSize:13,color:"rgba(255,255,255,0.65)",marginTop:5}}>{subtitle}</div>}
    </div>
  );
}

function CheckItem({label,checked,onToggle}){
  return(
    <div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
      <div style={{width:26,height:26,borderRadius:8,flexShrink:0,background:checked?C.green:C.white,border:`2px solid ${checked?C.green:C.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {checked&&<span style={{color:C.white,fontSize:14,fontWeight:800}}>✓</span>}
      </div>
      <div style={{fontSize:15,color:checked?C.muted:C.text,textDecoration:checked?"line-through":"none"}}>{label}</div>
    </div>
  );
}

function TagBtn({label,active,color=C.orange,bgActive="#FEF0E8",onClick}){
  return(
    <button onClick={onClick} style={{padding:"8px 14px",borderRadius:20,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",border:`2px solid ${active?color:C.border}`,background:active?bgActive:C.white,color:active?color:C.text}}>
      {label}
    </button>
  );
}

function Badge({text,color=C.orange}){
  return <span style={{background:color,color:C.white,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{text}</span>;
}

function PinInput({onPin,error,title,subtitle,color=C.dark}){
  const [digits,setDigits]=useState([]);
  const add=d=>{
    if(digits.length>=4)return;
    const next=[...digits,d];
    setDigits(next);
    if(next.length===4){onPin(next.join(""));setDigits([]);}
  };
  const del=()=>setDigits(p=>p.slice(0,-1));
  const keys=[1,2,3,4,5,6,7,8,9,null,0,"⌫"];
  return(
    <div style={{minHeight:"100vh",background:color,fontFamily:"system-ui,-apple-system,sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32}}>
      <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"5px",textTransform:"uppercase",marginBottom:10}}>HINDICA</div>
      <div style={{fontSize:22,fontWeight:800,color:C.white,marginBottom:6,textAlign:"center"}}>{title}</div>
      {subtitle&&<div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginBottom:32,textAlign:"center",whiteSpace:"pre-line"}}>{subtitle}</div>}
      <div style={{display:"flex",gap:14,marginBottom:12}}>
        {[0,1,2,3].map(i=>(<div key={i} style={{width:18,height:18,borderRadius:"50%",background:digits.length>i?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.2)",transition:"all 0.15s"}}/>))}
      </div>
      {error&&<div style={{color:"#FF8A7A",fontSize:14,fontWeight:700,marginBottom:12,textAlign:"center"}}>{error}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,72px)",gap:12,marginTop:16}}>
        {keys.map((k,i)=>(
          k===null?<div key={i}/>:
          <button key={i} onClick={()=>k==="⌫"?del():add(k)} style={{width:72,height:72,borderRadius:"50%",border:"none",background:k==="⌫"?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.12)",color:C.white,fontSize:k==="⌫"?22:26,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{k}</button>
        ))}
      </div>
    </div>
  );
}

function PrincipiosDiarios({seller,onComplete}){
  const [current,setCurrent]=useState(0);
  const [checked,setChecked]=useState({});
  const [showAll,setShowAll]=useState(false);
  const p=PRINCIPIOS[current];
  const allDone=Object.keys(checked).length===PRINCIPIOS.length;
  if(showAll)return(
    <div style={{background:C.dark,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <div style={{background:"rgba(255,255,255,0.05)",padding:"20px 20px 16px"}}>
        <button onClick={()=>setShowAll(false)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:C.white,borderRadius:8,padding:"6px 14px",fontSize:14,cursor:"pointer",fontFamily:"inherit",marginBottom:12}}>← Volver</button>
        <div style={{fontSize:20,fontWeight:800,color:C.white}}>Los 10 Principios</div>
      </div>
      <div style={{padding:"16px 20px"}}>
        {PRINCIPIOS.map(p=>(
          <div key={p.numero} style={{marginBottom:24,paddingBottom:24,borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
            <div style={{fontSize:11,color:C.orange,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:6}}>Principio {p.numero}</div>
            <div style={{fontSize:16,fontWeight:800,color:C.white,marginBottom:10}}>{p.titulo}</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,0.65)",lineHeight:1.7,whiteSpace:"pre-line"}}>{p.texto}</div>
          </div>
        ))}
      </div>
    </div>
  );
  return(
    <div style={{background:C.dark,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"28px 24px 20px"}}>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"3px",textTransform:"uppercase",marginBottom:4}}>BUENOS DÍAS, {seller.toUpperCase()}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginTop:4}}>Antes de comenzar, repasemos lo que nos define.</div>
        <div style={{display:"flex",gap:4,marginTop:16,flexWrap:"wrap"}}>
          {PRINCIPIOS.map((_,i)=>(<div key={i} style={{width:24,height:4,borderRadius:2,background:checked[i]?C.orange:i===current?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.1)",transition:"all 0.2s"}}/>))}
        </div>
      </div>
      <div style={{flex:1,background:"rgba(255,255,255,0.04)",margin:"0 16px",borderRadius:20,padding:"28px 24px",display:"flex",flexDirection:"column"}}>
        <div style={{fontSize:11,color:C.orange,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",marginBottom:12}}>Principio {p.numero} de 10</div>
        <div style={{fontSize:22,fontWeight:800,color:C.white,lineHeight:1.3,marginBottom:20}}>{p.titulo}</div>
        <div style={{fontSize:15,color:"rgba(255,255,255,0.7)",lineHeight:1.8,whiteSpace:"pre-line",flex:1}}>{p.texto}</div>
        <div onClick={()=>{setChecked(prev=>({...prev,[current]:true}));if(current<PRINCIPIOS.length-1)setCurrent(c=>c+1);}} style={{marginTop:28,background:C.orange,borderRadius:14,padding:"16px",textAlign:"center",cursor:"pointer",fontWeight:800,fontSize:16,color:C.white}}>
          {current<PRINCIPIOS.length-1?"Entendido →":"✓ Completé los 10 principios"}
        </div>
      </div>
      <div style={{padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        {current>0?<button onClick={()=>setCurrent(c=>c-1)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.4)",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Anterior</button>:<div/>}
        <button onClick={()=>setShowAll(true)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.3)",fontSize:12,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>Ver todos</button>
      </div>
      {allDone&&(<div style={{padding:"0 16px 24px"}}><button onClick={onComplete} style={{width:"100%",background:C.green,border:"none",borderRadius:14,padding:"18px",fontSize:17,fontWeight:800,color:C.white,cursor:"pointer",fontFamily:"inherit"}}>✓ Continuar al quiz →</button></div>)}
    </div>
  );
}

function QuizDiario({seller,historial,onComplete}){
  const getPreguntas=()=>{
    const mezcladas=[...PREGUNTAS].sort(()=>Math.random()-0.5);
    const debiles=historial.filter(h=>!h.correcto).map(h=>h.pregunta);
    const prioritarias=mezcladas.filter(q=>debiles.includes(q.q));
    const resto=mezcladas.filter(q=>!debiles.includes(q.q));
    return [...prioritarias,...resto].slice(0,3);
  };
  const [preguntas]=useState(()=>getPreguntas());
  const [actual,setActual]=useState(0);
  const [seleccion,setSeleccion]=useState(null);
  const [mostrarRes,setMostrarRes]=useState(false);
  const [resultados,setResultados]=useState([]);
  const [terminado,setTerminado]=useState(false);
  if(preguntas.length===0){onComplete([]);return null;}
  const q=preguntas[actual];
  const correctas=resultados.filter(r=>r.correcto).length;
  const responder=idx=>{
    if(mostrarRes)return;
    setSeleccion(idx);
    setMostrarRes(true);
    const correcto=idx===q.c;
    const nuevos=[...resultados,{pregunta:q.q,correcto,seleccion:idx,correcta:q.c,principio:q.p}];
    setResultados(nuevos);
    if(actual===preguntas.length-1){setTimeout(()=>setTerminado(true),1200);}
  };
  if(terminado)return(
    <div style={{background:C.dark,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
      <div style={{fontSize:50,marginBottom:20}}>{correctas===preguntas.length?"🌟":correctas>=2?"👍":"💪"}</div>
      <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"3px",textTransform:"uppercase",marginBottom:8}}>QUIZ DIARIO</div>
      <div style={{fontSize:24,fontWeight:800,color:C.white,marginBottom:6}}>{correctas} de {preguntas.length} correctas</div>
      <div style={{fontSize:14,color:"rgba(255,255,255,0.5)",marginBottom:32}}>{correctas===preguntas.length?"¡Perfecto! Conoces los principios Hindica.":correctas>=2?"¡Bien! Sigue repasando cada día.":"Repasa los principios y mañana lo harás mejor."}</div>
      {resultados.map((r,i)=>(
        <div key={i} style={{background:"rgba(255,255,255,0.06)",borderRadius:12,padding:"14px 16px",marginBottom:10,textAlign:"left",width:"100%",maxWidth:380}}>
          <div style={{fontSize:12,color:r.correcto?C.green:"#FF8A7A",fontWeight:700,marginBottom:4}}>{r.correcto?"✓ Correcta":"✗ Incorrecta"}</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.7)"}}>{r.pregunta}</div>
          {!r.correcto&&<div style={{fontSize:12,color:C.orange,marginTop:4}}>Respuesta: {preguntas[i]?.ops[r.correcta]}</div>}
        </div>
      ))}
      <button onClick={()=>onComplete(resultados)} style={{...sBtn(C.orange,true),borderRadius:14,padding:"16px",fontSize:16,marginTop:16}}>Comenzar turno →</button>
    </div>
  );
  return(
    <div style={{background:C.dark,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",padding:"32px 24px"}}>
      <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"3px",textTransform:"uppercase",marginBottom:8}}>QUIZ DIARIO · {seller.toUpperCase()}</div>
      <div style={{display:"flex",gap:8,marginBottom:28}}>
        {preguntas.map((_,i)=>(<div key={i} style={{flex:1,height:4,borderRadius:2,background:i<actual?C.orange:i===actual?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.1)"}}/>))}
      </div>
      <div style={{fontSize:11,color:C.orange,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:12}}>Pregunta {actual+1} de {preguntas.length}</div>
      <div style={{fontSize:20,fontWeight:800,color:C.white,lineHeight:1.4,marginBottom:28}}>{q.q}</div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {q.ops.map((op,i)=>{
          let bg="rgba(255,255,255,0.08)",border="transparent";
          if(mostrarRes){if(i===q.c){bg="rgba(45,122,69,0.4)";border=C.green;}else if(i===seleccion&&i!==q.c){bg="rgba(192,57,43,0.4)";border=C.red;}}
          else if(seleccion===i){bg="rgba(232,98,31,0.3)";border=C.orange;}
          return(<button key={i} onClick={()=>responder(i)} style={{background:bg,border:`2px solid ${border}`,borderRadius:14,padding:"16px 18px",textAlign:"left",color:C.white,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>{op}</button>);
        })}
      </div>
      {mostrarRes&&actual<preguntas.length-1&&(<button onClick={()=>{setActual(a=>a+1);setSeleccion(null);setMostrarRes(false);}} style={{...sBtn(C.orange,true),borderRadius:14,padding:"16px",fontSize:16,marginTop:24}}>Siguiente →</button>)}
    </div>
  );
}

function Selector({onVendedora,onDuena,onEntrenamiento}){
  return(
    <div style={{minHeight:"100vh",background:C.dark,fontFamily:"system-ui,-apple-system,sans-serif",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"50px 28px 32px",textAlign:"center"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:"6px",textTransform:"uppercase",marginBottom:12}}>BIENVENIDA A</div>
        <div style={{fontSize:48,fontWeight:900,color:C.white,letterSpacing:"8px"}}>HINDICA</div>
        <div style={{width:50,height:3,background:C.orange,margin:"18px auto"}}/>
      </div>
      <div style={{flex:1,background:C.bg,borderRadius:"32px 32px 0 0",padding:"32px 24px"}}>
        <div style={{fontSize:14,fontWeight:700,color:C.muted,textAlign:"center",marginBottom:24,textTransform:"uppercase",letterSpacing:"1px"}}>¿Cómo ingresas hoy?</div>
        <button onClick={onVendedora} style={{width:"100%",background:C.orange,border:"none",borderRadius:20,padding:"22px 20px",marginBottom:14,cursor:"pointer",fontFamily:"inherit",textAlign:"left",display:"flex",alignItems:"center",gap:18}}>
          <span style={{fontSize:34}}>🛍️</span>
          <div><div style={{fontSize:17,fontWeight:800,color:C.white}}>Soy vendedora</div><div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginTop:3}}>Apertura, ventas y cierre de turno</div></div>
        </button>
        <button onClick={onEntrenamiento} style={{width:"100%",background:C.green,border:"none",borderRadius:20,padding:"22px 20px",marginBottom:14,cursor:"pointer",fontFamily:"inherit",textAlign:"left",display:"flex",alignItems:"center",gap:18}}>
          <span style={{fontSize:34}}>📚</span>
          <div><div style={{fontSize:17,fontWeight:800,color:C.white}}>Estoy en entrenamiento</div><div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginTop:3}}>Principios, manual de ventas y quiz</div></div>
        </button>
        <button onClick={onDuena} style={{width:"100%",background:C.dark,border:"2px solid rgba(255,255,255,0.15)",borderRadius:20,padding:"22px 20px",cursor:"pointer",fontFamily:"inherit",textAlign:"left",display:"flex",alignItems:"center",gap:18}}>
          <span style={{fontSize:34}}>👑</span>
          <div><div style={{fontSize:17,fontWeight:800,color:C.white}}>Soy la dueña</div><div style={{fontSize:13,color:"rgba(255,255,255,0.55)",marginTop:3}}>Panel general, alertas y reportes</div></div>
        </button>
      </div>
    </div>
  );
}

// ─── MODO ENTRENAMIENTO ───────────────────────────────────────────────────────
const MANUAL_VENTAS = [
  { titulo:"Bienvenida a Hindica", icono:"🌿", contenido:"Bienvenida al equipo Hindica." + String.fromCharCode(10) + String.fromCharCode(10) + "Hindica nació para traer a Chile ropa hermosa, colorida y confeccionada artesanalmente en India. Vendemos prendas únicas — en muchos casos existen solo tres iguales en todo Chile." + String.fromCharCode(10) + String.fromCharCode(10) + "Este manual te prepara para el día a día. Tarda aproximadamente 15 minutos. Cuando termines, sabrás exactamente qué hacer en cada momento de tu turno." },
  { titulo:"Tu día completo — De principio a fin", icono:"📅", contenido:"Así es un día típico en Hindica:" + String.fromCharCode(10) + String.fromCharCode(10) + "1. Llegas a la tienda a la hora acordada" + String.fromCharCode(10) + "2. Abres la app y seleccionas tu tienda y nombre" + String.fromCharCode(10) + "3. Lees los 10 principios Hindica (obligatorio)" + String.fromCharCode(10) + "4. Respondes el quiz de 3 preguntas" + String.fromCharCode(10) + "5. Completas la apertura: checklist + fotos + fondo de caja" + String.fromCharCode(10) + "6. Abres la tienda y comienzas a atender" + String.fromCharCode(10) + "7. Cada hora: revisas y ordenas la tienda + foto" + String.fromCharCode(10) + "8. Cada venta: la registras en la app inmediatamente" + String.fromCharCode(10) + "9. Al cierre: conteo de stock + arqueo de caja + foto" + String.fromCharCode(10) + String.fromCharCode(10) + "La app es tu compañera durante todo el día. No es opcional — es parte del trabajo." },
  { titulo:"Cómo abrir la app", icono:"📱", contenido:"1. Abre Safari o Chrome en tu teléfono" + String.fromCharCode(10) + "2. Ve a: gestion.hindica.cl" + String.fromCharCode(10) + "3. Toca Soy vendedora" + String.fromCharCode(10) + "4. Selecciona tu tienda" + String.fromCharCode(10) + "5. Selecciona tu nombre" + String.fromCharCode(10) + "6. Ingresa tu PIN de 4 dígitos" + String.fromCharCode(10) + String.fromCharCode(10) + "Después del PIN verás los 10 Principios Hindica. Debes leer y confirmar cada uno — no se puede saltar." + String.fromCharCode(10) + String.fromCharCode(10) + "Luego hay 3 preguntas de quiz. El sistema recuerda tus errores y te pregunta sobre tus puntos débiles." },
  { titulo:"La apertura — Cómo abrir bien la tienda", icono:"🔓", contenido:"Pasos obligatorios en orden:" + String.fromCharCode(10) + String.fromCharCode(10) + "✓ Limpiar el piso de la tienda" + String.fromCharCode(10) + "✓ Limpiar los espejos" + String.fromCharCode(10) + "✓ Tablero de accesorios: 1 de cada modelo, colores variados" + String.fromCharCode(10) + "✓ Ropa bien exhibida y ordenada" + String.fromCharCode(10) + "✓ Revisar insumos: bolsas, papel, perchas" + String.fromCharCode(10) + "✓ Contar el stock" + String.fromCharCode(10) + String.fromCharCode(10) + "Fotos obligatorias:" + String.fromCharCode(10) + "📸 Foto de la tienda abierta, limpia y ordenada" + String.fromCharCode(10) + "📸 Foto del tablero de accesorios" + String.fromCharCode(10) + String.fromCharCode(10) + "Fondo de caja: anota cuánto efectivo hay al abrir." },
  { titulo:"El tablero de accesorios", icono:"💍", contenido:"Reglas obligatorias:" + String.fromCharCode(10) + "• Solo 1 de cada modelo en exhibición" + String.fromCharCode(10) + "• Colores lo más variados posible — nunca dos iguales juntos" + String.fromCharCode(10) + "• Si se vende algo, reemplázalo inmediatamente" + String.fromCharCode(10) + "• Siempre debe verse lleno y ordenado" + String.fromCharCode(10) + String.fromCharCode(10) + "Esto se verifica en la apertura y en cada chequeo horario con foto." + String.fromCharCode(10) + String.fromCharCode(10) + "Un tablero bien organizado vende solo. Uno desordenado hace que las clientas pasen de largo." },
  { titulo:"Cómo registrar una venta", icono:"🛍️", contenido:"Registra CADA venta en la app inmediatamente después de cobrar." + String.fromCharCode(10) + String.fromCharCode(10) + "Pasos:" + String.fromCharCode(10) + "1. Toca Registrar venta" + String.fromCharCode(10) + "2. Selecciona categoría y producto" + String.fromCharCode(10) + "3. Elige el color base" + String.fromCharCode(10) + "4. Para ropa: elige estampado y color acento" + String.fromCharCode(10) + "5. Toma una foto del artículo vendido (obligatorio)" + String.fromCharCode(10) + "6. Ingresa el precio" + String.fromCharCode(10) + "7. Selecciona el medio de pago" + String.fromCharCode(10) + String.fromCharCode(10) + "Nunca registres sin foto ni sin el medio de pago correcto." },
  { titulo:"El chequeo horario", icono:"⏰", contenido:"La app te avisa cuando es hora de revisar la tienda." + String.fromCharCode(10) + String.fromCharCode(10) + "Lógica inteligente:" + String.fromCharCode(10) + "• Si vendiste algo en la última hora → 20 minutos extra de gracia" + String.fromCharCode(10) + "• Sin ventas → aviso a los 120 minutos" + String.fromCharCode(10) + "• Si ignoras dos avisos → la dueña recibe una alerta" + String.fromCharCode(10) + String.fromCharCode(10) + "Qué hacer:" + String.fromCharCode(10) + "✓ Verificar que la tienda está ordenada" + String.fromCharCode(10) + "✓ Artículos bien exhibidos" + String.fromCharCode(10) + "✓ Tablero: 1 de cada modelo, colores variados" + String.fromCharCode(10) + "✓ Nada roto o en mal estado" + String.fromCharCode(10) + "📸 Foto de la tienda" + String.fromCharCode(10) + "📸 Foto del tablero" },
  { titulo:"Manejo de caja", icono:"💵", contenido:"La caja es tu responsabilidad directa." + String.fromCharCode(10) + String.fromCharCode(10) + "Al abrir: anota el fondo inicial." + String.fromCharCode(10) + String.fromCharCode(10) + "Durante el día:" + String.fromCharCode(10) + "• Registra CADA venta con el medio de pago correcto" + String.fromCharCode(10) + "• Si sale efectivo → registra Salida de caja con monto y motivo" + String.fromCharCode(10) + String.fromCharCode(10) + "Al cerrar:" + String.fromCharCode(10) + "• Cuenta el efectivo físico" + String.fromCharCode(10) + "• La app calcula cuánto debería haber" + String.fromCharCode(10) + "• Ingresa el monto real — siempre sé honesta" + String.fromCharCode(10) + String.fromCharCode(10) + "Los errores que se reportan tienen solución. Los que se esconden no." },
  { titulo:"Cómo cerrar la tienda", icono:"🔒", contenido:"Al finalizar el día:" + String.fromCharCode(10) + String.fromCharCode(10) + "1. Conteo final del stock" + String.fromCharCode(10) + "2. Cierre en la app" + String.fromCharCode(10) + "3. Resumen de ventas por medio de pago" + String.fromCharCode(10) + "4. Cuenta el efectivo e ingrésalo" + String.fromCharCode(10) + "5. Checklist de cierre:" + String.fromCharCode(10) + "   ✓ Limpié la tienda" + String.fromCharCode(10) + "   ✓ Todo ordenado para mañana" + String.fromCharCode(10) + "   ✓ Tablero guardado" + String.fromCharCode(10) + "   ✓ Stock contado" + String.fromCharCode(10) + "6. Foto de la tienda cerrada y ordenada" + String.fromCharCode(10) + String.fromCharCode(10) + "La tienda debe quedar como quieres encontrarla mañana." },
  { titulo:"El Método Hindica — Los 5 Pasos", icono:"🌟", contenido:"En Hindica no vendemos ropa. Acompañamos a una mujer a descubrir cómo quiere sentirse." + String.fromCharCode(10) + String.fromCharCode(10) + "Los 5 pasos:" + String.fromCharCode(10) + "1. OBSERVAR — antes de acercarte, mira qué hace" + String.fromCharCode(10) + "2. ESCUCHAR — una pregunta abierta, luego cállate" + String.fromCharCode(10) + "3. COMPRENDER — entiende qué necesita realmente" + String.fromCharCode(10) + "4. ASESORAR — ofrece 2-3 opciones, sé honesta" + String.fromCharCode(10) + "5. INSPIRAR — ayúdala a verse bien, deja que decida" + String.fromCharCode(10) + String.fromCharCode(10) + "No hay guión. Hay actitud: curiosidad, calidez y honestidad." },
  { titulo:"Paso 1 — OBSERVAR", icono:"👁️", contenido:"Antes de acercarte, observa." + String.fromCharCode(10) + String.fromCharCode(10) + "¿Qué está mirando? ¿Va rápido o despacio? ¿Toca las prendas?" + String.fromCharCode(10) + String.fromCharCode(10) + "Una clienta que toca las telas → está interesada, acércate" + String.fromCharCode(10) + "Una que mira desde lejos → necesita tiempo, dale espacio" + String.fromCharCode(10) + "Una que entra apurada → salúdala y déjala explorar" + String.fromCharCode(10) + String.fromCharCode(10) + "Nunca te lances a hablar apenas entra. Ese primer momento de tranquilidad es valioso." },
  { titulo:"Paso 2 — ESCUCHAR", icono:"👂", contenido:"Cuando te acerques, usa esta pregunta:" + String.fromCharCode(10) + String.fromCharCode(10) + "¿Estás buscando algo en particular o estás viendo qué te llama la atención?" + String.fromCharCode(10) + String.fromCharCode(10) + "Luego CALLA. No interrumpas. No ofrezcas opciones todavía." + String.fromCharCode(10) + String.fromCharCode(10) + "Si dice solo estoy mirando → Perfecto, cualquier cosa me avisas. Y te alejas." + String.fromCharCode(10) + String.fromCharCode(10) + "El error más común: hablar demasiado rápido antes de entender qué quiere ella." },
  { titulo:"Paso 3 — COMPRENDER", icono:"🧠", contenido:"Comprende qué está buscando realmente." + String.fromCharCode(10) + String.fromCharCode(10) + "Busco algo cómodo para la playa puede significar:" + String.fromCharCode(10) + "→ Quiere verse bien sin esfuerzo" + String.fromCharCode(10) + "→ Va a estar mucho tiempo al sol" + String.fromCharCode(10) + "→ No quiere gastar mucho" + String.fromCharCode(10) + String.fromCharCode(10) + "Haz una pregunta más si necesitas claridad:" + String.fromCharCode(10) + "¿Es para salir a cenar o para estar en la playa?" + String.fromCharCode(10) + "¿Tienes algún color favorito o algo que quieras evitar?" },
  { titulo:"Paso 4 — ASESORAR", icono:"💡", contenido:"Ahora sí hablas. Pero solo de las 2 o 3 opciones que le sirven." + String.fromCharCode(10) + String.fromCharCode(10) + "Sé honesta. Si algo no le queda bien, dilo con amabilidad:" + String.fromCharCode(10) + "Este modelo es muy lindo pero creo que este otro te favorece más." + String.fromCharCode(10) + String.fromCharCode(10) + "Nunca digas te queda perfecto si no es verdad. Ella lo sabe." + String.fromCharCode(10) + String.fromCharCode(10) + "La honestidad construye confianza. Una clienta que confía en tu opinión compra más y vuelve más." },
  { titulo:"Paso 5 — INSPIRAR", icono:"✨", contenido:"El cierre no es presionar. Es inspirar." + String.fromCharCode(10) + String.fromCharCode(10) + "Cuando ella se ve bien, refléjalo:" + String.fromCharCode(10) + "Te queda increíble — ese color con tu tono de piel es perfecto." + String.fromCharCode(10) + String.fromCharCode(10) + "Sugiere un accesorio:" + String.fromCharCode(10) + "¿Viste que tenemos unos aretes que irían ideales con eso?" + String.fromCharCode(10) + String.fromCharCode(10) + "No preguntes ¿lo llevas? — di ¿te lo envuelvo?" + String.fromCharCode(10) + String.fromCharCode(10) + "Si no quiere comprar: que se vaya bien y con ganas de volver." },
  { titulo:"Upselling", icono:"🎁", contenido:"Upselling es ayudar a la clienta a llevarse una experiencia completa." + String.fromCharCode(10) + String.fromCharCode(10) + "Reglas de oro:" + String.fromCharCode(10) + "• Solo sugiere si realmente complementa lo que compró" + String.fromCharCode(10) + "• Muéstralo físicamente — pon el collar con el vestido" + String.fromCharCode(10) + "• Una sola sugerencia, no tres" + String.fromCharCode(10) + "• Si dice que no, acéptalo sin insistir" + String.fromCharCode(10) + String.fromCharCode(10) + "Ejemplo: vendiste falda gitana azul → sugiere scrunchie en tono tierra" },
  { titulo:"Comportamiento en la tienda", icono:"⭐", contenido:"Presentación:" + String.fromCharCode(10) + "• Llega siempre a la hora acordada" + String.fromCharCode(10) + "• Vístete acorde al estilo Hindica" + String.fromCharCode(10) + "• Sin teléfono en la mano mientras hay clientas" + String.fromCharCode(10) + String.fromCharCode(10) + "Actitud:" + String.fromCharCode(10) + "• Saluda a CADA persona que entra" + String.fromCharCode(10) + "• Si tienes un mal día, déjalo afuera" + String.fromCharCode(10) + "• Trata a la dueña con honestidad siempre" + String.fromCharCode(10) + String.fromCharCode(10) + "Con compañeras:" + String.fromCharCode(10) + "• No dos encima de la misma clienta" + String.fromCharCode(10) + "• Diferencias: háblalo entre ustedes, nunca delante de clientas" },
  { titulo:"Qué hacer y qué NO hacer", icono:"📋", contenido:"✅ SÍ hacer:" + String.fromCharCode(10) + "• Registrar cada venta inmediatamente" + String.fromCharCode(10) + "• Saludar a todas las clientas" + String.fromCharCode(10) + "• Ser honesta con la caja siempre" + String.fromCharCode(10) + "• Avisar si falta algo antes de que sea problema" + String.fromCharCode(10) + "• Dejar la tienda ordenada siempre" + String.fromCharCode(10) + String.fromCharCode(10) + "❌ NO hacer:" + String.fromCharCode(10) + "• Cobrar sin registrar en la app" + String.fromCharCode(10) + "• Guardar efectivo fuera de la caja" + String.fromCharCode(10) + "• Decir te queda perfecto si no es verdad" + String.fromCharCode(10) + "• Ignorar los avisos de la app" + String.fromCharCode(10) + "• Salir sin completar el cierre" },
  { titulo:"Primer contacto: ¿Eres socia?", icono:"👋", contenido:"Cuando una clienta entra a la tienda:" + String.fromCharCode(10) + "" + String.fromCharCode(10) + "1. Salúdala con calidez y mírala a los ojos: ¡Hola, bienvenida a Hindica!" + String.fromCharCode(10) + "2. Dale un momento para mirar y pregunta: ¿Eres socia del Club Hindica?" + String.fromCharCode(10) + "3. Responda lo que responda, pregúntale su nombre:" + String.fromCharCode(10) + "   • Si dice sí: ¡Qué bueno verte! ¿Cómo te llamas?" + String.fromCharCode(10) + "   • Si dice no: ¡No te preocupes! ¿Cómo te llamas?" + String.fromCharCode(10) + "4. Preséntate: Yo soy [tu nombre]. Cualquier cosa, me dices." + String.fromCharCode(10) + "5. NO le expliques el Club en ese momento. Solo si ella pregunta, o al momento de pagar." + String.fromCharCode(10) + "" + String.fromCharCode(10) + "Por qué funciona: la pregunta hace que el Club exista en su cabeza sin venderle nada. Y saber su nombre cambia toda la conversación." },
  { titulo:"Usa su nombre", icono:"💛", contenido:"Úsalo al menos tres veces durante la visita:" + String.fromCharCode(10) + "• Al saludar" + String.fromCharCode(10) + "• Al recomendar: Camila, este turquesa te va a quedar precioso" + String.fromCharCode(10) + "• En caja" + String.fromCharCode(10) + "• Al despedirte: ¡Gracias, Camila, que lo disfrutes!" + String.fromCharCode(10) + "" + String.fromCharCode(10) + "Para recordarlo: repítelo en voz alta apenas te lo dice y asócialo con algo que lleva puesto." + String.fromCharCode(10) + "Natural, nunca forzado: no en cada frase." + String.fromCharCode(10) + "Si se te olvida, pide perdón con humor y pregúntale de nuevo. Es mejor que evitarlo." + String.fromCharCode(10) + "" + String.fromCharCode(10) + "Si es socia, la app te muestra su nombre y su color favorito al registrar la venta. Úsalos." },
  { titulo:"El Club en caja", icono:"🧾", contenido:"Al registrar la venta, la app te pregunta: ¿Es socia del Club?" + String.fromCharCode(10) + "" + String.fromCharCode(10) + "SI ES SOCIA:" + String.fromCharCode(10) + "• Pídele su número de socia (o su RUT, si lo olvidó) y búscala en la app." + String.fromCharCode(10) + "• La app te dice qué descuento corresponde: 20% de bienvenida (una sola vez) o 5%." + String.fromCharCode(10) + "• Escribe el precio normal: la app calcula cuánto cobrar." + String.fromCharCode(10) + "• Si aparece regalo de cumpleaños disponible, cuéntale. Si está de cumpleaños, ¡salúdala!" + String.fromCharCode(10) + "" + String.fromCharCode(10) + "SI NO ES SOCIA:" + String.fromCharCode(10) + "Antes de pagar: ¿Te quieres unir al Club Hindica? Es gratis, toma un minuto y hoy mismo tienes 20% de descuento en esta compra." + String.fromCharCode(10) + "Muéstrale el QR del mesón. Cuando termine te muestra su número: búscala y aplica el 20%." + String.fromCharCode(10) + "" + String.fromCharCode(10) + "Si no quiere: ¡Perfecto! Cuando quieras, el QR está aquí. Nunca insistas." + String.fromCharCode(10) + "Si no puede escanear: inscríbela tú desde club-hindica.vercel.app, con ella al lado." },
  { titulo:"Beneficios y reglas del Club", icono:"🌿", contenido:"El Club Hindica es gratis, para siempre. Cada socia tiene un número desde el 1001." + String.fromCharCode(10) + "" + String.fromCharCode(10) + "• 20% de descuento una sola vez, en su primera compra como socia. Ese día no se suma al 5%." + String.fromCharCode(10) + "• 5% en todas sus compras, en todas las tiendas." + String.fromCharCode(10) + "• Regalo de cumpleaños sin comprar nada: lo retira cuando quiera desde su mes de cumpleaños. Uno por año." + String.fromCharCode(10) + "• Ofertas exclusivas y acceso antes que nadie a ediciones especiales y colecciones nuevas." + String.fromCharCode(10) + "• Invitaciones a los eventos VIP del Club." + String.fromCharCode(10) + "• Máximo 5 mensajes de WhatsApp al año, incluido el saludo de cumpleaños." + String.fromCharCode(10) + "• Sus datos no se comparten con nadie." },
  { titulo:"Preguntas sobre el Club", icono:"🛡️", contenido:"¿Me van a llenar de mensajes?" + String.fromCharCode(10) + "Para nada: máximo 5 al año, incluido tu saludo de cumpleaños. El sistema no nos deja mandar más." + String.fromCharCode(10) + "" + String.fromCharCode(10) + "¿Tengo que pagar algo?" + String.fromCharCode(10) + "Nada. Es gratis, para siempre." + String.fromCharCode(10) + "" + String.fromCharCode(10) + "¿Para qué quieren mi RUT?" + String.fromCharCode(10) + "Para que el descuento de bienvenida sea uno por persona. Se guarda cifrado: nadie del equipo puede verlo." + String.fromCharCode(10) + "" + String.fromCharCode(10) + "¿Para qué quieren mis datos?" + String.fromCharCode(10) + "Para reconocerte como socia, darte tu regalo de cumpleaños e invitarte a eventos. No los compartimos con nadie." + String.fromCharCode(10) + "" + String.fromCharCode(10) + "¿Tengo que comprar algo ahora?" + String.fromCharCode(10) + "No. Tu 20% te espera en tu primera compra, cuando quieras." + String.fromCharCode(10) + "" + String.fromCharCode(10) + "Olvidé mi número." + String.fromCharCode(10) + "Lo busco con tu RUT, o lo tienes en tu chat de WhatsApp con Hindica." + String.fromCharCode(10) + "" + String.fromCharCode(10) + "Quiero salir del Club." + String.fromCharCode(10) + "Escribe BAJA a nuestro WhatsApp o dímelo, y lo anotamos." },
  { titulo:"Preguntas frecuentes", icono:"❓", contenido:"¿Y si no sé el precio de algo?" + String.fromCharCode(10) + "Pregunta o busca en la app. Nunca inventes un precio." + String.fromCharCode(10) + String.fromCharCode(10) + "¿Y si una clienta se enoja?" + String.fromCharCode(10) + "Calmada y amable. Si se complica, avisa a la dueña." + String.fromCharCode(10) + String.fromCharCode(10) + "¿Y si me equivoco en una venta?" + String.fromCharCode(10) + "Avisa a la dueña de inmediato. Siempre hay solución." + String.fromCharCode(10) + String.fromCharCode(10) + "¿Y si la caja no cuadra?" + String.fromCharCode(10) + "Sé honesta. Anota la diferencia real." + String.fromCharCode(10) + String.fromCharCode(10) + "¿Y si llego tarde?" + String.fromCharCode(10) + "Avisa ANTES. Siempre." },
];
const OBJECIONES = [
  {
    objecion: "Lo vi en Patronato más barato",
    icono: "🏷️",
    principio: "Nunca discutas el precio. Deja que ella misma se explique por qué el nuestro vale más.",
    respuesta: "Suena a muy buen precio. ¿Y lo compraste?" + String.fromCharCode(10) + String.fromCharCode(10) + "(Casi siempre dirá que no)" + String.fromCharCode(10) + String.fromCharCode(10) + "¿Y por qué no?" + String.fromCharCode(10) + String.fromCharCode(10) + "Aquí ella sola te explicará: la tela era distinta, no le gustó tanto, no era igual. Ella misma justifica por qué el nuestro es mejor.",
    noHacer: "No digas: pero el nuestro es de mejor calidad. No compares directamente. No te pongas a la defensiva."
  },
  {
    objecion: "Lo voy a pensar",
    icono: "🤔",
    principio: "Normalmente significa que hay una duda concreta sin resolver. Tu trabajo es descubrir cuál.",
    respuesta: "Claro, tómate tu tiempo. ¿Hay algo en particular que te haga dudar?" + String.fromCharCode(10) + String.fromCharCode(10) + "(Escucha la respuesta real)" + String.fromCharCode(10) + String.fromCharCode(10) + "Si dice el precio: Te entiendo. Fíjate que este estampado es único, en Chile hay solo tres iguales." + String.fromCharCode(10) + String.fromCharCode(10) + "Si dice no sé si me queda: ¿Quieres probártelo de nuevo? A veces la segunda vez se ve distinto.",
    noHacer: "No digas: bueno, aquí estaré. No la dejes ir sin entender la duda real."
  },
  {
    objecion: "Tengo que preguntarle a mi pareja",
    icono: "💬",
    principio: "Respeta la decisión, pero facilita el sí.",
    respuesta: "Por supuesto. ¿Quieres que te tome una foto con él puesto para mostrárselo?" + String.fromCharCode(10) + String.fromCharCode(10) + "(Le tomas la foto)" + String.fromCharCode(10) + String.fromCharCode(10) + "Si quieres te lo guardo hasta mañana, sin compromiso. Así no lo pierdes mientras decides." + String.fromCharCode(10) + String.fromCharCode(10) + "Esto elimina el riesgo de perder la prenda y le da una razón concreta para volver.",
    noHacer: "No preguntes si su pareja decide por ella. No la hagas sentir mal por consultar."
  },
  {
    objecion: "Está muy caro",
    icono: "💰",
    principio: "El precio no se defiende. Se explica el valor.",
    respuesta: "Te entiendo. Fíjate que cada prenda es hecha a mano en India, y de este estampado en particular llegan solo tres a todo Chile." + String.fromCharCode(10) + String.fromCharCode(10) + "No es ropa que vas a ver en otra persona." + String.fromCharCode(10) + String.fromCharCode(10) + "Si sigue dudando: ¿Sabías que tenemos el Club Hindica? Es gratis y si te inscribes hoy tienes 20% de descuento en esta compra.",
    noHacer: "No te disculpes por el precio. No ofrezcas descuento inmediatamente."
  },
  {
    objecion: "¿Me haces un descuento?",
    icono: "🎁",
    principio: "Nunca improvises descuentos. Redirige al Club.",
    respuesta: "No manejamos descuentos, pero tenemos algo mejor: el Club Hindica." + String.fromCharCode(10) + String.fromCharCode(10) + "Te inscribes gratis y hoy tienes 20% de descuento. Después, 5% en todas tus compras y un regalo en tu cumpleaños." + String.fromCharCode(10) + String.fromCharCode(10) + "¿Te inscribo ahora? Toma un minuto y el beneficio aplica hoy mismo.",
    noHacer: "Nunca inventes un descuento por tu cuenta. Nunca digas déjame preguntar a la dueña."
  },
  {
    objecion: "No estoy segura si me queda bien",
    icono: "🪞",
    principio: "Sé honesta. Si le queda bien, díselo con especificidad. Si no, ofrece otra opción.",
    respuesta: "Si le queda bien:" + String.fromCharCode(10) + "Te queda increíble. Fíjate cómo ese azul te ilumina la cara. Y el largo con tu altura queda perfecto." + String.fromCharCode(10) + String.fromCharCode(10) + "Si no le queda bien:" + String.fromCharCode(10) + "Te soy honesta, creo que este otro modelo te va a favorecer más. ¿Te lo traigo para que lo compares?" + String.fromCharCode(10) + String.fromCharCode(10) + "La honestidad aquí construye una clienta de por vida.",
    noHacer: "Nunca digas te queda perfecto si no es verdad. Ella lo sabe y pierdes su confianza para siempre."
  },
  {
    objecion: "Voy a dar una vuelta y vuelvo",
    icono: "🚶",
    principio: "Déjala ir bien, pero dale una razón para volver.",
    respuesta: "Dale, tranquila. ¿Quieres que te lo deje apartado mientras tanto?" + String.fromCharCode(10) + String.fromCharCode(10) + "Es que de este estampado tenemos solo este, y a veces se van rápido." + String.fromCharCode(10) + String.fromCharCode(10) + "Si dice que no: Perfecto, aquí estaré. Me llamo (tu nombre), pregunta por mí cuando vuelvas.",
    noHacer: "No la presiones. No pongas cara de decepción. No digas bueno, ya."
  },
  {
    objecion: "Ya tengo algo parecido",
    icono: "👗",
    principio: "Reconoce su gusto y muestra la diferencia.",
    respuesta: "¡Qué bueno, entonces sabes que te queda bien ese estilo!" + String.fromCharCode(10) + String.fromCharCode(10) + "¿De qué color es el que tienes?" + String.fromCharCode(10) + String.fromCharCode(10) + "(Escucha)" + String.fromCharCode(10) + String.fromCharCode(10) + "Este es totalmente distinto en estampado. Y como cada uno es único, nunca se van a ver iguales aunque sean el mismo modelo.",
    noHacer: "No digas pero este es diferente sin preguntar primero qué tiene."
  },
  {
    objecion: "No sé si lo voy a usar",
    icono: "📅",
    principio: "Ayúdala a visualizar una ocasión concreta.",
    respuesta: "¿Tienes algún panorama pronto? ¿Un asado, un cumpleaños, vacaciones?" + String.fromCharCode(10) + String.fromCharCode(10) + "(Escucha)" + String.fromCharCode(10) + String.fromCharCode(10) + "Para eso quedaría ideal. Y además es de esas prendas que sirven tanto para el día como para salir en la noche con unas sandalias." + String.fromCharCode(10) + String.fromCharCode(10) + "Le das permiso mental para justificar la compra.",
    noHacer: "No digas seguro la vas a usar. Ayúdala a encontrar la ocasión ella misma."
  },
  {
    objecion: "Está lindo pero no ahora",
    icono: "⏳",
    principio: "Entiende si es tema de plata o de momento.",
    respuesta: "Te entiendo perfecto. ¿Te lo aparto para más adelante?" + String.fromCharCode(10) + String.fromCharCode(10) + "O si prefieres, inscríbete al Club Hindica ahora (es gratis) y tu 20% de bienvenida te espera para cuando vuelvas." + String.fromCharCode(10) + String.fromCharCode(10) + "Y te avisamos cuando lleguen cosas nuevas que te puedan gustar.",
    noHacer: "No insistas. Convierte la visita en un dato para el Club."
  },
];

function ModoEntrenamiento({onBack}){
  const [tab,setTab]=useState("principios");
  const [manualIdx,setManualIdx]=useState(0);
  const [quizMode,setQuizMode]=useState(false);
  const [objIdx,setObjIdx]=useState(null);
  const [nuevaObj,setNuevaObj]=useState("");
  const [objEnviada,setObjEnviada]=useState(false);

  if(quizMode) return <QuizDiario seller="Entrenamiento" historial={[]} onComplete={()=>setQuizMode(false)}/>;

  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <div style={{background:C.green,padding:"20px 20px 0"}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.15)",border:"none",color:C.white,borderRadius:8,padding:"6px 14px",fontSize:14,cursor:"pointer",marginBottom:14,fontFamily:"inherit"}}>← Salir</button>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",letterSpacing:"3px",textTransform:"uppercase"}}>HINDICA</div>
        <div style={{fontSize:22,fontWeight:800,color:C.white,marginTop:4,marginBottom:16}}>📚 Centro de Entrenamiento</div>
        <div style={{display:"flex",gap:4}}>
          {[{id:"principios",label:"Principios"},{id:"manual",label:"Manual"},{id:"objeciones",label:"Objeciones"},{id:"quiz",label:"Quiz"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 14px",borderRadius:"10px 10px 0 0",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,whiteSpace:"nowrap",background:tab===t.id?C.bg:"rgba(255,255,255,0.1)",color:tab===t.id?C.green:"rgba(255,255,255,0.7)"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"20px 20px 0"}}>
        {tab==="principios"&&<>
          <div style={{...sCard({background:"#E8F5EE",border:`1.5px solid ${C.green}`}),marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:800,color:C.green,marginBottom:4}}>Los 10 Principios Hindica</div>
            <div style={{fontSize:13,color:C.muted}}>Lee y estudia estos principios. Los verás cada día al iniciar tu turno.</div>
          </div>
          {PRINCIPIOS.map((p,i)=>(
            <div key={i} style={sCard()}>
              <div style={{fontSize:11,color:C.orange,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:6}}>Principio {p.numero}</div>
              <div style={{fontSize:16,fontWeight:800,color:C.dark,marginBottom:12}}>{p.titulo}</div>
              <div style={{fontSize:14,color:C.text,lineHeight:1.7,whiteSpace:"pre-line"}}>{p.texto}</div>
            </div>
          ))}
        </>}

        {tab==="manual"&&<>
          <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
            {MANUAL_VENTAS.map((m,i)=>(
              <button key={i} onClick={()=>setManualIdx(i)} style={{flexShrink:0,padding:"8px 14px",borderRadius:20,border:`2px solid ${manualIdx===i?C.green:C.border}`,background:manualIdx===i?C.green:C.white,color:manualIdx===i?C.white:C.text,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                {i+1}
              </button>
            ))}
          </div>
          <div style={sCard()}>
            <div style={{fontSize:28,marginBottom:12}}>{MANUAL_VENTAS[manualIdx].icono}</div>
            <div style={{fontSize:18,fontWeight:800,color:C.dark,marginBottom:16}}>{MANUAL_VENTAS[manualIdx].titulo}</div>
            <div style={{fontSize:15,color:C.text,lineHeight:1.8,whiteSpace:"pre-line"}}>{MANUAL_VENTAS[manualIdx].contenido}</div>
            <div style={{display:"flex",gap:12,marginTop:24}}>
              {manualIdx>0&&<button onClick={()=>setManualIdx(i=>i-1)} style={{...sBtn(C.border),color:C.text,flex:1,borderRadius:12,padding:"14px"}}>← Anterior</button>}
              {manualIdx<MANUAL_VENTAS.length-1&&<button onClick={()=>setManualIdx(i=>i+1)} style={{...sBtn(C.green,false),flex:1,borderRadius:12,padding:"14px"}}>Siguiente →</button>}
            </div>
          </div>
          <div style={{...sCard({background:"#E8F5EE",border:`1.5px solid ${C.green}`})}}>
            <div style={{fontSize:13,color:C.green,fontWeight:700}}>{manualIdx+1} de {MANUAL_VENTAS.length} capítulos</div>
            <div style={{background:"rgba(0,0,0,0.08)",borderRadius:8,height:6,marginTop:8}}><div style={{background:C.green,height:6,borderRadius:8,width:`${((manualIdx+1)/MANUAL_VENTAS.length)*100}%`,transition:"width 0.3s"}}/></div>
          </div>
        </>}

        {tab==="objeciones"&&<>
          <div style={{...sCard({background:"#FEF8F3",border:`1.5px solid ${C.orange}`}),marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:800,color:C.orange,marginBottom:6}}>🛡️ Cómo responder objeciones</div>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>Las objeciones no son un rechazo. Son una duda sin resolver. Aquí aprendes a responder cada una sin presionar y sin discutir.</div>
          </div>

          {objIdx===null ? (
            <>
              {OBJECIONES.map((o,i)=>(
                <div key={i} onClick={()=>setObjIdx(i)} style={{...sCard({padding:16}),cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
                  <span style={{fontSize:26,flexShrink:0}}>{o.icono}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:3}}>La clienta dice</div>
                    <div style={{fontSize:15,fontWeight:700,color:C.dark}}>"{o.objecion}"</div>
                  </div>
                  <span style={{fontSize:20,color:C.muted}}>→</span>
                </div>
              ))}

              <div style={{...sCard({background:"#EEF4F1",border:`1.5px solid ${C.dark}`}),marginTop:20}}>
                <div style={{fontSize:15,fontWeight:800,color:C.dark,marginBottom:6}}>💡 ¿Escuchaste una objeción nueva?</div>
                <div style={{fontSize:13,color:C.muted,marginBottom:14,lineHeight:1.6}}>Si una clienta te dijo algo para lo que no tenías respuesta, cuéntanoslo. Lo agregaremos al entrenamiento de todas.</div>
                {objEnviada ? (
                  <div style={{background:"#E8F5EE",borderRadius:10,padding:14,fontSize:14,color:C.green,fontWeight:700}}>
                    ✓ ¡Gracias! La dueña lo revisará y agregará una respuesta al entrenamiento.
                  </div>
                ) : (
                  <>
                    <textarea style={{...sInput,height:90,resize:"none",marginBottom:10}} placeholder="Ej: Una clienta me dijo que prefiere comprar por Instagram..." value={nuevaObj} onChange={e=>setNuevaObj(e.target.value)}/>
                    <button disabled={!nuevaObj.trim()} onClick={()=>{setObjEnviada(true);setNuevaObj("");setTimeout(()=>setObjEnviada(false),4000);}} style={{...sBtn(nuevaObj.trim()?C.dark:C.border,true),borderRadius:10,padding:"13px",fontSize:15,opacity:nuevaObj.trim()?1:0.5}}>
                      Enviar objeción a la dueña
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <button onClick={()=>setObjIdx(null)} style={{...sBtn(C.border),color:C.text,borderRadius:10,padding:"10px 16px",fontSize:14,marginBottom:16}}>← Todas las objeciones</button>
              <div style={sCard()}>
                <div style={{fontSize:32,marginBottom:10}}>{OBJECIONES[objIdx].icono}</div>
                <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>La clienta dice</div>
                <div style={{fontSize:20,fontWeight:800,color:C.dark,marginBottom:20,lineHeight:1.3}}>"{OBJECIONES[objIdx].objecion}"</div>

                <div style={{background:"#FEF8F3",borderRadius:12,padding:16,marginBottom:16}}>
                  <div style={{fontSize:11,color:C.orange,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>El principio</div>
                  <div style={{fontSize:14,color:C.text,lineHeight:1.6}}>{OBJECIONES[objIdx].principio}</div>
                </div>

                <div style={{background:"#E8F5EE",borderRadius:12,padding:16,marginBottom:16}}>
                  <div style={{fontSize:11,color:C.green,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>✓ Qué decir</div>
                  <div style={{fontSize:15,color:C.text,lineHeight:1.8,whiteSpace:"pre-line"}}>{OBJECIONES[objIdx].respuesta}</div>
                </div>

                <div style={{background:"#FDECEA",borderRadius:12,padding:16}}>
                  <div style={{fontSize:11,color:C.red,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>✗ Qué NO hacer</div>
                  <div style={{fontSize:14,color:C.text,lineHeight:1.6}}>{OBJECIONES[objIdx].noHacer}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:12}}>
                {objIdx>0&&<button onClick={()=>setObjIdx(i=>i-1)} style={{...sBtn(C.border),color:C.text,flex:1,borderRadius:12,padding:"14px"}}>← Anterior</button>}
                {objIdx<OBJECIONES.length-1&&<button onClick={()=>setObjIdx(i=>i+1)} style={{...sBtn(C.orange),flex:1,borderRadius:12,padding:"14px"}}>Siguiente →</button>}
              </div>
            </>
          )}
        </>}

        {tab==="quiz"&&<>
          <div style={{...sCard({background:"#E8F5EE",border:`1.5px solid ${C.green}`}),marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:800,color:C.green,marginBottom:4}}>🎯 Practica con el quiz</div>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>Pon a prueba lo que sabes sobre los principios Hindica. El quiz tiene 3 preguntas aleatorias. Puedes hacerlo las veces que quieras.</div>
          </div>
          <button onClick={()=>setQuizMode(true)} style={{...sBtn(C.green,true),padding:"20px",fontSize:18,borderRadius:16,marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
            🎮 Empezar quiz
          </button>
          <div style={sCard()}>
            <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>Todos los principios en resumen</div>
            {PRINCIPIOS.map((p,i)=>(<div key={i} style={{padding:"10px 0",borderBottom:i<PRINCIPIOS.length-1?`1px solid ${C.border}`:"none"}}><div style={{fontSize:12,color:C.orange,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Principio {p.numero}</div><div style={{fontSize:14,fontWeight:700,color:C.dark,marginTop:2}}>{p.titulo}</div></div>))}
          </div>
        </>}
      </div>
    </div>
  );
}

function LoginVendedora({vendedoras,tiendas,onStart}){
  const [step,setStep]=useState("tienda");
  const [tienda,setTienda]=useState("");
  const [nombre,setNombre]=useState("");
  const [error,setError]=useState("");
  const handlePin=pin=>{
    const v=vendedoras.find(v=>v.nombre===nombre);
    if(v&&v.pin===pin){onStart(tienda,nombre);}
    else{setError("PIN incorrecto. Intenta de nuevo.");}
  };
  if(step==="tienda")return(
    <div style={{background:C.bg,borderRadius:"28px 28px 0 0",padding:"32px 24px",minHeight:"55vh"}}>
      <div style={{fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:20}}>¿En qué tienda trabajas hoy?</div>
      {tiendas.map(t=>(<button key={t} onClick={()=>{setTienda(t);setStep("nombre");}} style={{width:"100%",background:C.white,border:`2px solid ${C.border}`,borderRadius:16,padding:"18px 20px",marginBottom:12,cursor:"pointer",fontFamily:"inherit",textAlign:"left",fontSize:16,fontWeight:700,color:C.dark}}>📍 {t}</button>))}
    </div>
  );
  if(step==="nombre")return(
    <div style={{background:C.bg,borderRadius:"28px 28px 0 0",padding:"32px 24px",minHeight:"70vh"}}>
      <button onClick={()=>setStep("tienda")} style={{background:"transparent",border:"none",color:C.muted,fontSize:14,cursor:"pointer",fontFamily:"inherit",marginBottom:20}}>← Cambiar tienda</button>
      <div style={{fontSize:14,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>¿Quién eres?</div>
      <div style={{fontSize:13,color:C.muted,marginBottom:20}}>Tienda: <strong>{tienda}</strong></div>
      {vendedoras.map(v=>(<button key={v.nombre} onClick={()=>{setNombre(v.nombre);setStep("pin");setError("");}} style={{width:"100%",background:C.white,border:`2px solid ${C.border}`,borderRadius:16,padding:"18px 20px",marginBottom:12,cursor:"pointer",fontFamily:"inherit",textAlign:"left",fontSize:16,fontWeight:700,color:C.dark}}>👤 {v.nombre}</button>))}
    </div>
  );
  if(step==="pin")return(<PinInput title={`Hola, ${nombre}`} subtitle={`Ingresa tu PIN de 4 dígitos${vendedoras.find(v=>v.nombre===nombre)?.pin==="1234"?"\nPIN por defecto: 1234":""}`} color={C.dark} error={error} onPin={handlePin}/>);
}

function LoginDuena({duenaPin,onSuccess,onBack}){
  const [error,setError]=useState("");
  const handlePin=pin=>{if(pin===duenaPin)onSuccess();else setError("PIN incorrecto.");};
  return(<div style={{position:"relative"}}><button onClick={onBack} style={{position:"absolute",top:20,left:20,zIndex:10,background:"rgba(255,255,255,0.1)",border:"none",color:C.white,borderRadius:8,padding:"6px 14px",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>← Volver</button><PinInput title="Panel Dueña" subtitle="Ingresa tu código secreto" color={C.purple} error={error} onPin={handlePin}/></div>);
}

function AgregarStock({onSave,onBack,tiendas,destino}){
  const [tipo,setTipo]=useState("");
  const [bodega,setBodega]=useState(destino||"");
  const [categoria,setCategoria]=useState("");
  const [producto,setProducto]=useState("");
  const [colorBase,setColorBase]=useState("");
  const [estampado,setEstampado]=useState("");
  const [colorAcento,setColorAcento]=useState("");
  const [foto,setFoto]=useState(null);
  const [cantidad,setCantidad]=useState(1);
  const todosProductos=tipo==="joyeria"?JOYERIA_ITEMS:(categoria?(ROPA_ITEMS[categoria]||[]):[]);
  const canSave=tipo&&bodega&&producto&&colorBase&&cantidad&&(tipo==="ropa"||(tipo==="joyeria"&&foto));
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <Header title={destino?`Artículo nuevo · ${destino}`:"Agregar Stock"} color={C.purple} onBack={onBack}/>
      <div style={{padding:"20px 20px 0"}}>
        <div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>¿Qué tipo de artículo?</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[{id:"ropa",label:"👗 Ropa & Accesorios",sub:"Faldas, tops, scrunchies…"},{id:"joyeria",label:"💍 Joyería",sub:"Aretes, collares, pulseras…"}].map(t=>(
              <button key={t.id} onClick={()=>{setTipo(t.id);setCategoria("");setProducto("");setFoto(null);}} style={{padding:"16px 12px",borderRadius:14,border:`2px solid ${tipo===t.id?C.purple:C.border}`,background:tipo===t.id?"#F5ECF5":C.white,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                <div style={{fontSize:14,fontWeight:800,color:tipo===t.id?C.purple:C.text}}>{t.label}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:4}}>{t.sub}</div>
              </button>
            ))}
          </div>
        </div>
        {tipo&&<>
          {!destino&&<div style={sCard()}>
            <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>¿Dónde entra?</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{BODEGAS.map(b=><TagBtn key={b} label={b} active={bodega===b} color={C.purple} bgActive="#F5ECF5" onClick={()=>setBodega(b)}/>)}</div>
          </div>}
          {tipo==="ropa"&&<div style={sCard()}>
            <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Categoría</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{Object.keys(ROPA_ITEMS).map(cat=><TagBtn key={cat} label={cat} active={categoria===cat} onClick={()=>{setCategoria(cat);setProducto("");}}/>)}</div>
          </div>}
          {(tipo==="joyeria"||(tipo==="ropa"&&categoria))&&<div style={sCard()}>
            <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Producto</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{todosProductos.map(p=><TagBtn key={p} label={p} active={producto===p} color={C.dark} bgActive="#EEF4F1" onClick={()=>setProducto(p)}/>)}</div>
          </div>}
          {tipo==="joyeria"&&producto&&<div style={sCard()}><FotoInput label="Foto del modelo (obligatoria para joyería)" value={foto} onChange={setFoto} required/></div>}
          {producto&&<div style={sCard()}>
            <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Color base</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:tipo==="ropa"?16:0}}>{COLORES.map(c=><TagBtn key={c} label={c} active={colorBase===c} onClick={()=>setColorBase(c)}/>)}</div>
            {tipo==="ropa"&&<>
              <div style={{fontSize:16,fontWeight:800,margin:"16px 0 12px"}}>Estampado</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>{ESTAMPADOS.map(e=><TagBtn key={e} label={e} active={estampado===e} color={C.purple} bgActive="#F5ECF5" onClick={()=>setEstampado(e)}/>)}</div>
              <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Color acento</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{COLORES.map(c=><TagBtn key={c} label={c} active={colorAcento===c} color={C.gold} bgActive="#FDF5E0" onClick={()=>setColorAcento(c)}/>)}</div>
            </>}
          </div>}
          {producto&&colorBase&&<div style={sCard()}>
            <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Cantidad</div>
            <div style={{display:"flex",alignItems:"center",gap:20}}>
              <button onClick={()=>setCantidad(q=>Math.max(1,q-1))} style={{...sBtn(C.border),color:C.text,width:48,height:48,borderRadius:12,fontSize:24,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
              <div style={{fontSize:36,fontWeight:900,minWidth:60,textAlign:"center"}}>{cantidad}</div>
              <button onClick={()=>setCantidad(q=>q+1)} style={{...sBtn(C.dark),width:48,height:48,borderRadius:12,fontSize:24,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
          </div>}
          {canSave&&<button onClick={()=>onSave({id:Date.now().toString(),tipo,bodega,categoria:tipo==="joyeria"?"Joyería":categoria,producto,colorBase,estampado:tipo==="joyeria"?"-":estampado,colorAcento:tipo==="joyeria"?"-":colorAcento,foto,cantidad,ubicacion:bodega,fechaIngreso:new Date()})} style={{...sBtn(C.purple,true),padding:"18px",fontSize:17,borderRadius:16}}>
            ✓ Guardar en {bodega||"bodega"}
          </button>}
        </>}
      </div>
    </div>
  );
}

function EnviarATienda({allStock,tiendas,onSend,onBack}){
  const [tienda,setTienda]=useState("");
  const [bodega,setBodega]=useState("");
  const [cantidades,setCantidades]=useState({});
  const stockBodega=allStock.filter(s=>s.ubicacion===bodega&&s.cantidad>0);
  const total=Object.values(cantidades).reduce((a,b)=>a+b,0);
  const setCant=(id,val)=>{const max=stockBodega.find(s=>s.id===id)?.cantidad||0;setCantidades(p=>({...p,[id]:Math.max(0,Math.min(max,val))}));};
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <Header title="Enviar a Tienda" color={C.green} onBack={onBack}/>
      <div style={{padding:"20px 20px 0"}}>
        <div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Desde bodega</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{BODEGAS.map(b=><TagBtn key={b} label={b} active={bodega===b} color={C.dark} bgActive="#EEF4F1" onClick={()=>{setBodega(b);setCantidades({});}}/>)}</div>
        </div>
        <div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Hacia tienda</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{tiendas.map(t=><TagBtn key={t} label={t} active={tienda===t} color={C.orange} bgActive="#FEF0E8" onClick={()=>setTienda(t)}/>)}</div>
        </div>
        {bodega&&stockBodega.length===0&&<div style={{...sCard(),textAlign:"center",padding:32}}><div style={{fontSize:13,color:C.muted}}>No hay stock en {bodega}.</div></div>}
        {bodega&&stockBodega.length>0&&<div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>¿Qué envías?</div>
          {stockBodega.map(item=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
              {item.foto?<img src={item.foto} alt="" style={{width:48,height:48,borderRadius:10,objectFit:"cover",flexShrink:0}}/>:<div style={{width:48,height:48,borderRadius:10,background:"#F0EDE8",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{item.tipo==="joyeria"?"💍":"👗"}</div>}
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700}}>{item.producto}</div>
                <div style={{fontSize:11,color:C.muted}}>{item.colorBase}{item.estampado&&item.estampado!=="-"?` · ${item.estampado}`:""} · Disp: {item.cantidad}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <button onClick={()=>setCant(item.id,(cantidades[item.id]||0)-1)} style={{...sBtn(C.border),color:C.text,width:32,height:32,borderRadius:8,fontSize:18,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                <div style={{fontSize:18,fontWeight:800,minWidth:28,textAlign:"center"}}>{cantidades[item.id]||0}</div>
                <button onClick={()=>setCant(item.id,(cantidades[item.id]||0)+1)} style={{...sBtn(C.dark),width:32,height:32,borderRadius:8,fontSize:18,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
              </div>
            </div>
          ))}
        </div>}
        {tienda&&bodega&&total>0&&<button onClick={()=>onSend(tienda,bodega,cantidades)} style={{...sBtn(C.green,true),padding:"18px",fontSize:17,borderRadius:16}}>✓ Enviar {total} artículo{total!==1?"s":""} a {tienda}</button>}
      </div>
    </div>
  );
}

function TransferirBodega({allStock,onTransfer,onBack}){
  const [desde,setDesde]=useState("");
  const [hacia,setHacia]=useState("");
  const [cantidades,setCantidades]=useState({});
  const stockDesde=allStock.filter(s=>s.ubicacion===desde&&s.cantidad>0);
  const total=Object.values(cantidades).reduce((a,b)=>a+b,0);
  const setCant=(id,val)=>{const max=stockDesde.find(s=>s.id===id)?.cantidad||0;setCantidades(p=>({...p,[id]:Math.max(0,Math.min(max,val))}));};
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <Header title="Mover entre Bodegas" color={C.purple} onBack={onBack}/>
      <div style={{padding:"20px 20px 0"}}>
        <div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Desde</div>
          <div style={{display:"flex",gap:8}}>{BODEGAS.map(b=><TagBtn key={b} label={b} active={desde===b} color={C.dark} bgActive="#EEF4F1" onClick={()=>{setDesde(b);setCantidades({});}}/>)}</div>
        </div>
        <div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Hacia</div>
          <div style={{display:"flex",gap:8}}>{BODEGAS.filter(b=>b!==desde).map(b=><TagBtn key={b} label={b} active={hacia===b} color={C.purple} bgActive="#F5ECF5" onClick={()=>setHacia(b)}/>)}</div>
        </div>
        {desde&&stockDesde.length>0&&<div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>¿Qué transfiero?</div>
          {stockDesde.map(item=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
              {item.foto?<img src={item.foto} alt="" style={{width:44,height:44,borderRadius:8,objectFit:"cover",flexShrink:0}}/>:<div style={{width:44,height:44,borderRadius:8,background:"#F0EDE8",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{item.tipo==="joyeria"?"💍":"👗"}</div>}
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{item.producto}</div><div style={{fontSize:11,color:C.muted}}>{item.colorBase} · Disp: {item.cantidad}</div></div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <button onClick={()=>setCant(item.id,(cantidades[item.id]||0)-1)} style={{...sBtn(C.border),color:C.text,width:30,height:30,borderRadius:8,fontSize:16,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                <div style={{fontSize:16,fontWeight:800,minWidth:24,textAlign:"center"}}>{cantidades[item.id]||0}</div>
                <button onClick={()=>setCant(item.id,(cantidades[item.id]||0)+1)} style={{...sBtn(C.dark),width:30,height:30,borderRadius:8,fontSize:16,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
              </div>
            </div>
          ))}
        </div>}
        {desde&&hacia&&total>0&&<button onClick={()=>onTransfer(desde,hacia,cantidades)} style={{...sBtn(C.purple,true),padding:"18px",fontSize:17,borderRadius:16}}>✓ Mover {total} artículo{total!==1?"s":""} a {hacia}</button>}
      </div>
    </div>
  );
}

function Contador({valor,onChange,max}){
  const btn={width:40,height:40,borderRadius:10,fontSize:22,padding:0,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer",fontFamily:"inherit"};
  return(
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <button onClick={()=>onChange(Math.max(0,valor-1))} style={{...btn,background:C.border,color:C.text}}>−</button>
      <div style={{fontSize:22,fontWeight:900,minWidth:34,textAlign:"center"}}>{valor}</div>
      <button onClick={()=>onChange(max!=null?Math.min(max,valor+1):valor+1)} style={{...btn,background:C.dark,color:C.white}}>+</button>
    </div>
  );
}

function FilaArticulo({item,derecha}){
  return(
    <div style={sCard({padding:14})}><div style={{display:"flex",gap:12,alignItems:"center"}}>
      {item.foto?<img src={item.foto} alt="" style={{width:50,height:50,borderRadius:10,objectFit:"cover",flexShrink:0}}/>:<div style={{width:50,height:50,borderRadius:10,background:"#F0EDE8",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{item.tipo==="joyeria"?"💍":"👗"}</div>}
      <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:800}}>{item.producto}</div><div style={{fontSize:12,color:C.muted}}>{item.colorBase}{item.estampado&&item.estampado!=="-"?` · ${item.estampado}`:""}{item.colorAcento&&item.colorAcento!=="-"?` · ${item.colorAcento}`:""}</div></div>
      {derecha}
    </div></div>
  );
}

function StockTienda({tienda,seller,allStock,setAllStock,addFlag,onBack}){
  const [modo,setModo]=useState("ver");
  const [filtro,setFiltro]=useState("todo");
  const [bodega,setBodega]=useState("");
  const [recibir,setRecibir]=useState({});
  const [conteo,setConteo]=useState({});
  const [msg,setMsg]=useState("");
  const enTienda=allStock.filter(s=>s.ubicacion===tienda&&s.cantidad>0);
  const stock=enTienda.filter(s=>filtro==="todo"||s.tipo===filtro);
  const enBodega=allStock.filter(s=>s.ubicacion===bodega&&s.cantidad>0);
  const totalRecibir=Object.values(recibir).reduce((a,b)=>a+b,0);
  const volver=()=>{setModo("ver");setBodega("");setRecibir({});setConteo({});};

  const guardarRecepcion=()=>{
    setAllStock(prev=>{
      let u=prev.map(s=>({...s}));
      Object.entries(recibir).forEach(([id,cant],k)=>{
        if(cant<=0)return;
        const orig=u.find(s=>s.id===id); if(!orig)return;
        orig.cantidad-=cant;
        const dest=u.find(s=>s.ubicacion===tienda&&mismoArticulo(s,orig));
        if(dest)dest.cantidad+=cant;
        else u.push({...orig,id:`${Date.now()}-${k}`,cantidad:cant,ubicacion:tienda,fechaIngreso:new Date()});
      });
      return u.filter(s=>s.cantidad>0);
    });
    setMsg(`✓ ${totalRecibir} artículo${totalRecibir===1?"":"s"} recibido${totalRecibir===1?"":"s"} y descontado${totalRecibir===1?"":"s"} de ${bodega}.`);
    volver();
  };

  const empezarConteo=()=>{const c0={};enTienda.forEach(s=>{c0[s.id]=s.cantidad;});setConteo(c0);setMsg("");setModo("contar");};
  const guardarConteo=()=>{
    const difs=enTienda.filter(s=>conteo[s.id]!==s.cantidad).map(s=>`${descArticulo(s)}: sistema ${s.cantidad} → contado ${conteo[s.id]} (${conteo[s.id]-s.cantidad>0?"+":""}${conteo[s.id]-s.cantidad})`);
    if(difs.length){
      setAllStock(prev=>prev.map(s=>conteo[s.id]!=null&&s.ubicacion===tienda?{...s,cantidad:conteo[s.id]}:s).filter(s=>s.cantidad>0));
      addFlag({titulo:`Diferencia de stock en ${tienda}`,detalle:`Conteo de ${seller}: `+difs.join(" · "),tienda,nivel:"amarillo"});
      setMsg(`Conteo guardado. ${difs.length} diferencia${difs.length===1?"":"s"}: se avisó a la dueña.`);
    }else setMsg("✓ Conteo guardado: todo cuadra.");
    volver();
  };

  if(modo==="nuevo")return <AgregarStock destino={tienda} onBack={()=>setModo("recibir")} onSave={item=>{
    setAllStock(prev=>[...prev,{...item,ubicacion:tienda}]);
    addFlag({titulo:"Artículo nuevo ingresado en tienda",detalle:`${seller} ingresó ${item.cantidad} × ${descArticulo(item)} directo en ${tienda} (no venía de bodega en el sistema). Revisa el stock de bodega.`,tienda,nivel:"amarillo"});
    setMsg(`✓ ${item.cantidad} × ${item.producto} agregado a ${tienda}.`);volver();
  }}/>;

  if(modo==="recibir")return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <Header title="Recibir stock" subtitle={tienda} onBack={volver}/>
      <div style={{padding:"20px 20px 0"}}>
        <div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>¿De qué bodega viene?</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:12}}>Lo que marques se suma a {tienda} y se descuenta de la bodega.</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{BODEGAS.map(b=><TagBtn key={b} label={b} active={bodega===b} color={C.dark} bgActive="#EEF4F1" onClick={()=>{setBodega(b);setRecibir({});}}/>)}</div>
        </div>
        {bodega&&enBodega.length===0&&<div style={{...sCard(),textAlign:"center",padding:28}}><div style={{fontSize:13,color:C.muted}}>No hay stock registrado en {bodega}.</div></div>}
        {bodega&&enBodega.map(item=><FilaArticulo key={item.id} item={item} derecha={<div style={{textAlign:"right"}}><div style={{fontSize:11,color:C.muted,marginBottom:4}}>hay {item.cantidad}</div><Contador valor={recibir[item.id]||0} max={item.cantidad} onChange={v=>setRecibir(p=>({...p,[item.id]:v}))}/></div>}/>)}
        {totalRecibir>0&&<button onClick={guardarRecepcion} style={{...sBtn(C.green,true),padding:"18px",fontSize:17,borderRadius:16,marginBottom:14}}>✓ Recibí {totalRecibir} artículo{totalRecibir===1?"":"s"}</button>}
        <button onClick={()=>setModo("nuevo")} style={{...sBtn(C.white,true),color:C.purple,border:`2px dashed ${C.purple}`,fontSize:14}}>¿No está en la lista? Agregar artículo nuevo</button>
        <div style={{fontSize:12,color:C.muted,marginTop:8,textAlign:"center"}}>Si agregas un artículo nuevo, la dueña recibe un aviso.</div>
      </div>
    </div>
  );

  if(modo==="contar")return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <Header title="Contar stock" subtitle={tienda} onBack={volver}/>
      <div style={{padding:"20px 20px 0"}}>
        <div style={{...sCard(),background:"#FEF8F3"}}><div style={{fontSize:13,lineHeight:1.5}}>Cuenta cada artículo en la tienda y ajusta con − y +. Si algo no cuadra, se guarda el número que contaste y la dueña recibe un aviso con la diferencia.</div></div>
        {enTienda.length===0&&<div style={{...sCard(),textAlign:"center",padding:28}}><div style={{fontSize:13,color:C.muted}}>No hay stock registrado. Usa "Recibir stock" primero.</div></div>}
        {enTienda.map(item=><FilaArticulo key={item.id} item={item} derecha={<div style={{textAlign:"right"}}><div style={{fontSize:11,color:conteo[item.id]!==item.cantidad?C.orange:C.muted,marginBottom:4,fontWeight:conteo[item.id]!==item.cantidad?700:400}}>sistema: {item.cantidad}</div><Contador valor={conteo[item.id]??item.cantidad} onChange={v=>setConteo(p=>({...p,[item.id]:v}))}/></div>}/>)}
        {enTienda.length>0&&<button onClick={guardarConteo} style={{...sBtn(C.green,true),padding:"18px",fontSize:17,borderRadius:16}}>✓ Guardar conteo</button>}
      </div>
    </div>
  );

  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <Header title={`Stock · ${tienda}`} onBack={onBack}/>
      <div style={{padding:"20px 20px 0"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <button onClick={()=>{setMsg("");setModo("recibir");}} style={{...sBtn(C.green,true),borderRadius:12,padding:"14px 8px",fontSize:13,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><span style={{fontSize:20}}>📥</span>Recibir stock</button>
          <button onClick={empezarConteo} style={{...sBtn(C.dark,true),borderRadius:12,padding:"14px 8px",fontSize:13,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><span style={{fontSize:20}}>🔢</span>Contar stock</button>
        </div>
        {msg&&<div style={{background:"#E8F5EE",color:C.green,borderRadius:12,padding:"12px 14px",fontSize:14,fontWeight:600,marginBottom:14}}>{msg}</div>}
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {[{id:"todo",label:"Todo"},{id:"ropa",label:"👗 Ropa"},{id:"joyeria",label:"💍 Joyería"}].map(f=>(<TagBtn key={f.id} label={f.label} active={filtro===f.id} onClick={()=>setFiltro(f.id)}/>))}
        </div>
        <div style={{fontSize:13,color:C.muted,marginBottom:12,fontWeight:600}}>{stock.reduce((a,i)=>a+i.cantidad,0)} unidades · {stock.length} modelos</div>
        {stock.length===0?<div style={{...sCard(),textAlign:"center",padding:40}}><div style={{fontSize:13,color:C.muted}}>No hay stock registrado para esta tienda.</div></div>
          :stock.map(item=><FilaArticulo key={item.id} item={item} derecha={<div style={{fontSize:22,fontWeight:900,color:C.dark}}>{item.cantidad}</div>}/>)}
      </div>
    </div>
  );
}

function PanelDuena({allSales,allFlags,allStock,setAllStock,vendedoras,setVendedoras,duenaPin,setDuenaPin,tiendas,setTiendas,ferias,setFerias,quizStats,onBack}){
  const [tab,setTab]=useState("hoy");
  const [subScreen,setSubScreen]=useState("");
  const [newNombre,setNewNombre]=useState("");
  const [newPin,setNewPin]=useState("");
  const [editDuenaPin,setEditDuenaPin]=useState("");
  const [pinMsg,setPinMsg]=useState("");
  const [newTienda,setNewTienda]=useState("");
  const [newFeria,setNewFeria]=useState("");
  const [newFeriaFecha,setNewFeriaFecha]=useState("");
  const [filtroUbicacion,setFiltroUbicacion]=useState("todo");
  const [filtroTipo,setFiltroTipo]=useState("todo");
  const [busqueda,setBusqueda]=useState("");


  const totalHoy=allSales.reduce((a,s)=>a+s.precio,0);
  const byTienda=tiendas.map(t=>({tienda:t,ventas:allSales.filter(s=>s.tienda===t),total:allSales.filter(s=>s.tienda===t).reduce((a,s)=>a+s.precio,0)}));
  const byPago=MEDIOS_PAGO.map(p=>({...p,total:allSales.filter(s=>s.pago===p.id).reduce((a,s)=>a+s.precio,0),count:allSales.filter(s=>s.pago===p.id).length})).filter(p=>p.count>0);

  const inventarioFiltrado=allStock.filter(item=>{
    const ubOk=filtroUbicacion==="todo"||item.ubicacion===filtroUbicacion;
    const tipoOk=filtroTipo==="todo"||item.tipo===filtroTipo;
    const busOk=!busqueda||item.producto?.toLowerCase().includes(busqueda.toLowerCase())||item.colorBase?.toLowerCase().includes(busqueda.toLowerCase());
    return ubOk&&tipoOk&&busOk&&item.cantidad>0;
  });

  const handleAddStock=item=>{setAllStock(p=>[...p,item]);setSubScreen("");};
  const handleEnviar=(tienda,bodega,cantidades)=>{
    setAllStock(prev=>{
      let updated=[...prev];
      Object.entries(cantidades).forEach(([id,cant])=>{
        if(cant<=0)return;
        const idx=updated.findIndex(s=>s.id===id);
        if(idx>=0){
          const orig=updated[idx];
          updated[idx]={...orig,cantidad:orig.cantidad-cant};
          if(cant>0)updated.push({...orig,id:Date.now().toString()+id,cantidad:cant,ubicacion:tienda});
        }
      });
      return updated.filter(s=>s.cantidad>0);
    });
    setSubScreen("");
  };
  const handleTransferir=(desde,hacia,cantidades)=>{
    setAllStock(prev=>{
      let updated=[...prev];
      Object.entries(cantidades).forEach(([id,cant])=>{
        if(cant<=0)return;
        const idx=updated.findIndex(s=>s.id===id);
        if(idx>=0){
          const orig=updated[idx];
          updated[idx]={...orig,cantidad:orig.cantidad-cant};
          if(cant>0)updated.push({...orig,id:Date.now().toString()+id,cantidad:cant,ubicacion:hacia});
        }
      });
      return updated.filter(s=>s.cantidad>0);
    });
    setSubScreen("");
  };

  const tabs=[{id:"hoy",label:"Hoy"},{id:"alertas",label:`Alertas${allFlags.length>0?` (${allFlags.length})`:""}`},{id:"ventas",label:"Ventas"},{id:"inventario",label:"Inventario"},{id:"socias",label:"Socias"},{id:"formacion",label:"Formación"},{id:"reposicion",label:"Reposición"},{id:"config",label:"⚙️"}];

  if(subScreen==="addStock")return<AgregarStock onSave={handleAddStock} onBack={()=>setSubScreen("")} tiendas={tiendas}/>;
  if(subScreen==="enviar")return<EnviarATienda allStock={allStock} tiendas={tiendas} onSend={handleEnviar} onBack={()=>setSubScreen("")}/>;
  if(subScreen==="transferir")return<TransferirBodega allStock={allStock} onTransfer={handleTransferir} onBack={()=>setSubScreen("")}/>;

  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <div style={{background:C.purple,padding:"20px 20px 0"}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.15)",border:"none",color:C.white,borderRadius:8,padding:"6px 14px",fontSize:13,cursor:"pointer",marginBottom:14,fontFamily:"inherit"}}>← Salir</button>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"3px",textTransform:"uppercase"}}>PANEL DUEÑA</div>
        <div style={{fontSize:22,fontWeight:800,color:C.white,marginTop:4,marginBottom:16}}>👑 Hindica</div>
        <div style={{display:"flex",gap:10,marginBottom:16}}>
          <div style={{flex:1,background:"rgba(255,255,255,0.1)",borderRadius:14,padding:"14px"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.45)",textTransform:"uppercase"}}>Ventas hoy</div><div style={{fontSize:26,fontWeight:900,color:C.white,marginTop:4}}>{allSales.length}</div></div>
          <div style={{flex:2,background:"rgba(255,255,255,0.1)",borderRadius:14,padding:"14px"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.45)",textTransform:"uppercase"}}>Total hoy</div><div style={{fontSize:22,fontWeight:800,color:C.gold,marginTop:4}}>{fmt(totalHoy)}</div></div>
          <div style={{background:allFlags.length>0?C.red:"rgba(255,255,255,0.1)",borderRadius:14,padding:"14px 16px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.6)",textTransform:"uppercase"}}>Alertas</div><div style={{fontSize:26,fontWeight:900,color:C.white}}>{allFlags.length}</div></div>
        </div>
        <div style={{display:"flex",gap:3,overflowX:"auto"}}>
          {tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 12px",borderRadius:"10px 10px 0 0",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,whiteSpace:"nowrap",background:tab===t.id?C.bg:"rgba(255,255,255,0.08)",color:tab===t.id?C.purple:"rgba(255,255,255,0.6)"}}>{t.label}</button>))}
        </div>
      </div>

      <div style={{padding:"20px 20px 0"}}>
        {tab==="hoy"&&<>
          {byTienda.map(({tienda,ventas,total})=>(<div key={tienda} style={sCard()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontSize:16,fontWeight:800}}>📍 {tienda}</div><Badge text={`${ventas.length} ventas`} color={ventas.length===0?C.muted:C.green}/></div><div style={{fontSize:22,fontWeight:800,color:C.dark}}>{fmt(total)}</div></div>))}
          {byPago.length>0&&<div style={sCard()}><div style={{fontSize:16,fontWeight:800,marginBottom:14}}>Por medio de pago</div>{byPago.map(p=>(<div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div>{p.icon} {p.label} <span style={{color:C.muted,fontSize:12}}>({p.count})</span></div><div style={{fontWeight:700}}>{fmt(p.total)}</div></div>))}</div>}
        </>}

        {tab==="alertas"&&<>{allFlags.length===0?<div style={{...sCard(),textAlign:"center",padding:40}}><div style={{fontSize:40,marginBottom:12}}>✅</div><div style={{fontSize:16,fontWeight:700,color:C.green}}>¡Todo en orden!</div></div>:allFlags.map((flag,i)=>(<div key={i} style={{...sCard(),borderLeft:`4px solid ${flag.nivel==="rojo"?C.red:C.gold}`}}><div style={{fontSize:14,fontWeight:800,color:flag.nivel==="rojo"?C.red:C.gold}}>{flag.nivel==="rojo"?"🔴":"🟡"} {flag.titulo}</div><div style={{fontSize:13,color:C.muted,marginTop:4}}>{flag.detalle}</div><div style={{fontSize:11,color:C.muted,marginTop:6}}>{flag.tienda} · {fmtTime(flag.hora)}</div></div>))}</>}

        {tab==="ventas"&&<>{allSales.length===0?<div style={{...sCard(),textAlign:"center",padding:40}}><div style={{fontSize:13,color:C.muted}}>Aún no hay ventas hoy.</div></div>:allSales.map((sale,i)=>(<div key={i} style={sCard({padding:14})}><div style={{display:"flex",gap:12,alignItems:"center"}}>{sale.foto&&<img src={sale.foto} alt="" style={{width:60,height:60,borderRadius:10,objectFit:"cover",flexShrink:0}}/>}<div style={{flex:1}}><div style={{fontSize:14,fontWeight:800}}>{sale.producto}</div><div style={{fontSize:12,color:C.muted}}>{sale.colorBase}{sale.estampado&&sale.estampado!=="-"?` · ${sale.estampado}`:""}</div><div style={{fontSize:11,color:C.muted}}>{sale.tienda} · {sale.vendedora} · {fmtTime(sale.hora)}</div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:15,fontWeight:800}}>{fmt(sale.precio)}</div><div style={{fontSize:11,color:C.muted}}>{MEDIOS_PAGO.find(p=>p.id===sale.pago)?.label}</div></div></div></div>))}</>}

        {tab==="inventario"&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
            <button onClick={()=>setSubScreen("addStock")} style={{...sBtn(C.purple,true),borderRadius:12,padding:"14px 8px",fontSize:12,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><span style={{fontSize:20}}>📦</span>Agregar</button>
            <button onClick={()=>setSubScreen("enviar")} style={{...sBtn(C.green,true),borderRadius:12,padding:"14px 8px",fontSize:12,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><span style={{fontSize:20}}>🚚</span>Enviar</button>
            <button onClick={()=>setSubScreen("transferir")} style={{...sBtn(C.dark,true),borderRadius:12,padding:"14px 8px",fontSize:12,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><span style={{fontSize:20}}>🔄</span>Mover</button>
          </div>
          <div style={sCard()}>
            <input style={{...sInput,marginBottom:12}} placeholder="🔍 Buscar producto o color..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              {["todo",...BODEGAS,...tiendas].map(u=>(<TagBtn key={u} label={u==="todo"?"Todas":u} active={filtroUbicacion===u} color={C.dark} bgActive="#EEF4F1" onClick={()=>setFiltroUbicacion(u)}/>))}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
              {[{id:"todo",label:"Todo"},{id:"ropa",label:"👗 Ropa"},{id:"joyeria",label:"💍 Joyería"}].map(t=>(<TagBtn key={t.id} label={t.label} active={filtroTipo===t.id} onClick={()=>setFiltroTipo(t.id)}/>))}
            </div>
          </div>
          <div style={{fontSize:13,color:C.muted,marginBottom:12,fontWeight:600}}>{inventarioFiltrado.length} modelos · {inventarioFiltrado.reduce((a,i)=>a+i.cantidad,0)} unidades</div>
          {inventarioFiltrado.length===0?<div style={{...sCard(),textAlign:"center",padding:40}}><div style={{fontSize:13,color:C.muted}}>No hay artículos con ese filtro.</div></div>
            :inventarioFiltrado.map((item,i)=>(<div key={i} style={sCard({padding:14})}><div style={{display:"flex",gap:12,alignItems:"center"}}>{item.foto?<img src={item.foto} alt="" style={{width:52,height:52,borderRadius:10,objectFit:"cover",flexShrink:0}}/>:<div style={{width:52,height:52,borderRadius:10,background:"#F0EDE8",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{item.tipo==="joyeria"?"💍":"👗"}</div>}<div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.producto}</div><div style={{fontSize:12,color:C.muted}}>{item.colorBase}{item.estampado&&item.estampado!=="-"?` · ${item.estampado}`:""}</div><div style={{fontSize:11,color:C.purple,fontWeight:600,marginTop:2}}>📍 {item.ubicacion}</div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:22,fontWeight:900,color:C.dark}}>{item.cantidad}</div><div style={{fontSize:10,color:C.muted,textTransform:"uppercase"}}>uds</div></div></div></div>))
          }
        </>}

        {tab==="socias"&&<>
          <div style={sCard()}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:6}}>🌿 Club Hindica</div>
            <div style={{fontSize:14,color:C.muted,lineHeight:1.5,marginBottom:16}}>Por seguridad, los datos de las socias (teléfonos, cumpleaños) ya no se leen desde esta app. Están en el panel protegido del Club, con tu clave de dueña.</div>
            <a href={CLUB_URL+"/#duena"} target="_blank" rel="noreferrer" style={{...sBtn(C.purple,true),display:"block",textAlign:"center",textDecoration:"none",boxSizing:"border-box",marginBottom:10}}>Abrir panel de socias</a>
            <div style={{fontSize:13,color:C.muted}}>Ahí tienes: cumpleaños del mes y saludos por WhatsApp, mensajes del Club (máx. 5 al año), lista de socias y resumen por comuna, edad y color.</div>
          </div>
          <div style={sCard()}>
            <div style={{fontSize:15,fontWeight:800,marginBottom:6}}>Clave del Club en este equipo</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:10}}>Las vendedoras la ingresan una vez por teléfono o tablet al registrar una venta. Si cambias la clave del equipo en Supabase, bórrala aquí para que la pidan de nuevo.</div>
            <button onClick={()=>{clubClave.set("");alert("Clave del Club borrada en este equipo.");}} style={{...sBtn(C.dark),fontSize:14,padding:"10px 16px"}}>Borrar clave de este equipo</button>
          </div>
        </>}

        {tab==="formacion"&&<>
          <div style={{...sCard({background:"#FEF8F3",border:`1.5px solid ${C.orange}`}),marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:800,color:C.orange,marginBottom:6}}>📚 Sistema de Formación Diaria</div>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>Cada vendedora lee los 10 principios al iniciar su turno y responde un quiz de 3 preguntas. El sistema prioriza los temas donde cada una ha fallado anteriormente.</div>
          </div>
          {vendedoras.map((v,i)=>{
            const stats=quizStats.filter(s=>s.vendedora===v.nombre);
            const total=stats.length;
            const correctas=stats.filter(s=>s.correcto).length;
            const pct=total>0?Math.round((correctas/total)*100):null;
            const debiles=[...new Set(stats.filter(s=>!s.correcto).map(s=>s.principio))];
            return(
              <div key={i} style={sCard()}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:16,fontWeight:800}}>👤 {v.nombre}</div>
                  {pct!==null?<Badge text={`${pct}% correctas`} color={pct>=80?C.green:pct>=60?C.gold:C.red}/>:<Badge text="Sin datos aún" color={C.muted}/>}
                </div>
                <div style={{fontSize:13,color:C.muted,marginBottom:8}}>{total} preguntas respondidas · {correctas} correctas</div>
                {debiles.length>0&&<><div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>TEMAS A REFORZAR:</div>{debiles.map(p=>(<div key={p} style={{fontSize:13,color:C.red,marginBottom:2}}>• Principio {p}: {PRINCIPIOS.find(pr=>pr.numero===p)?.titulo}</div>))}</>}
                {total>0&&debiles.length===0&&<div style={{fontSize:13,color:C.green}}>✓ Sin temas débiles detectados</div>}
              </div>
            );
          })}
        </>}

        {tab==="reposicion"&&<>
          <div style={{...sCard({background:"#FEF8F3",border:`1.5px solid ${C.orange}`})}}>
            <div style={{fontSize:14,fontWeight:800,color:C.orange,marginBottom:6}}>💡 Referencia para reposición</div>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>Fotos de lo vendido para buscar estampados similares al comprar.</div>
          </div>
          {allSales.filter(s=>s.foto).length===0?<div style={{...sCard(),textAlign:"center",padding:40}}><div style={{fontSize:13,color:C.muted}}>Las fotos aparecerán aquí.</div></div>
            :<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{allSales.filter(s=>s.foto).map((sale,i)=>(<div key={i} style={{background:C.white,borderRadius:14,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}><img src={sale.foto} alt="" style={{width:"100%",height:120,objectFit:"cover",display:"block"}}/><div style={{padding:"10px 12px"}}><div style={{fontSize:12,fontWeight:700}}>{sale.producto}</div><div style={{fontSize:11,color:C.muted}}>{sale.colorBase}{sale.estampado&&sale.estampado!=="-"?` · ${sale.estampado}`:""}</div><div style={{fontSize:11,color:C.orange,fontWeight:700,marginTop:4}}>{fmt(sale.precio)}</div></div></div>))}</div>
          }
        </>}

        {tab==="config"&&<>
          <div style={sCard()}>
            <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>👤 Vendedoras y PINs</div>
            {vendedoras.map((v,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{fontSize:15,fontWeight:700}}>{v.nombre}</div><div style={{fontSize:12,color:C.muted}}>PIN: ●●●●</div></div><button onClick={()=>setVendedoras(vv=>vv.filter((_,j)=>j!==i))} style={{...sBtn(C.red),padding:"6px 14px",fontSize:13,borderRadius:8}}>Eliminar</button></div>))}
            <div style={{marginTop:16}}>
              <input style={{...sInput,marginBottom:10}} placeholder="Nombre de la vendedora" value={newNombre} onChange={e=>setNewNombre(e.target.value)}/>
              <input style={{...sInput,marginBottom:10}} placeholder="PIN de 4 dígitos" maxLength={4} type="password" value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,""))}/>
              <button disabled={!newNombre.trim()||newPin.length!==4} onClick={()=>{setVendedoras(p=>[...p,{nombre:newNombre.trim(),pin:newPin}]);setNewNombre("");setNewPin("");}} style={{...sBtn(newNombre.trim()&&newPin.length===4?C.green:C.border,true),opacity:newNombre.trim()&&newPin.length===4?1:0.5,borderRadius:10,padding:"12px"}}>+ Agregar vendedora</button>
            </div>
          </div>
          <div style={sCard()}>
            <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>🔐 Cambiar mi PIN</div>
            <input style={{...sInput,marginBottom:10}} placeholder="Nuevo PIN de 4 dígitos" maxLength={4} type="password" value={editDuenaPin} onChange={e=>setEditDuenaPin(e.target.value.replace(/\D/g,""))}/>
            <button disabled={editDuenaPin.length!==4} onClick={()=>{setDuenaPin(editDuenaPin);setEditDuenaPin("");setPinMsg("✓ PIN actualizado");setTimeout(()=>setPinMsg(""),2000);}} style={{...sBtn(editDuenaPin.length===4?C.purple:C.border,true),opacity:editDuenaPin.length===4?1:0.5,borderRadius:10,padding:"12px"}}>Guardar nuevo PIN</button>
            {pinMsg&&<div style={{color:C.green,fontWeight:700,marginTop:10}}>{pinMsg}</div>}
          </div>
          <div style={sCard()}>
            <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>🏪 Tiendas permanentes</div>
            {tiendas.map((t,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:15,fontWeight:600}}>📍 {t}</div><button onClick={()=>setTiendas(tt=>tt.filter((_,j)=>j!==i))} style={{...sBtn(C.red),padding:"5px 12px",fontSize:12,borderRadius:8}}>Eliminar</button></div>))}
            <div style={{marginTop:14,display:"flex",gap:8}}>
              <input style={{...sInput,flex:1}} placeholder="Nueva tienda..." value={newTienda} onChange={e=>setNewTienda(e.target.value)}/>
              <button disabled={!newTienda.trim()} onClick={()=>{setTiendas(p=>[...p,newTienda.trim()]);setNewTienda("");}} style={{...sBtn(newTienda.trim()?C.green:C.border),borderRadius:10,padding:"12px 16px",opacity:newTienda.trim()?1:0.5}}>+</button>
            </div>
          </div>
          <div style={sCard()}>
            <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>🎪 Ferias temporeras</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:14}}>Con fecha de cierre. Se agregan como tienda automáticamente.</div>
            {ferias.map((f,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{fontSize:15,fontWeight:600}}>🎪 {f.nombre}</div><div style={{fontSize:12,color:C.muted}}>Hasta: {f.fecha||"Sin fecha"}</div></div><button onClick={()=>{setFerias(ff=>ff.filter((_,j)=>j!==i));setTiendas(tt=>tt.filter(t=>t!==f.nombre));}} style={{...sBtn(C.red),padding:"5px 12px",fontSize:12,borderRadius:8}}>Eliminar</button></div>))}
            <div style={{marginTop:14}}>
              <input style={{...sInput,marginBottom:8}} placeholder="Nombre de la feria" value={newFeria} onChange={e=>setNewFeria(e.target.value)}/>
              <input style={{...sInput,marginBottom:8}} type="date" value={newFeriaFecha} onChange={e=>setNewFeriaFecha(e.target.value)}/>
              <button disabled={!newFeria.trim()} onClick={()=>{setFerias(p=>[...p,{nombre:newFeria.trim(),fecha:newFeriaFecha}]);setTiendas(p=>[...p,newFeria.trim()]);setNewFeria("");setNewFeriaFecha("");}} style={{...sBtn(newFeria.trim()?C.orange:C.border,true),borderRadius:10,padding:"12px",opacity:newFeria.trim()?1:0.5}}>+ Agregar feria</button>
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}

function Apertura({tienda,seller,onComplete}){
  const [checks,setChecks]=useState({});
  const [fotoTienda,setFotoTienda]=useState(null);
  const [fotoTablero,setFotoTablero]=useState(null);
  const [insumos,setInsumos]=useState("");
  const [fondo,setFondo]=useState("");
  const [notas,setNotas]=useState("");
  const allChecked=LISTA_APERTURA.every(i=>checks[i.id]);
  const canDone=allChecked&&fotoTienda&&fotoTablero&&fondo;
  const toggle=id=>setChecks(p=>({...p,[id]:!p[id]}));
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <Header title="Apertura de Tienda" subtitle={`${tienda} · ${fmtTime(new Date())}`}/>
      <div style={{padding:"20px 20px 0"}}>
        <div style={sCard()}><div style={{fontSize:16,fontWeight:800,marginBottom:14}}>Lista de apertura</div>{LISTA_APERTURA.map(item=><CheckItem key={item.id} label={item.label} checked={!!checks[item.id]} onToggle={()=>toggle(item.id)}/>)}</div>
        <div style={sCard()}><div style={{fontSize:16,fontWeight:800,marginBottom:4}}>¿Falta algo?</div><div style={{fontSize:13,color:C.muted,marginBottom:12}}>Bolsas, papel, perchas…</div><textarea style={{...sInput,height:76,resize:"none"}} placeholder="Ej: Se acabaron las bolsas medianas..." value={insumos} onChange={e=>setInsumos(e.target.value)}/></div>
        <div style={sCard()}><div style={{fontSize:16,fontWeight:800,marginBottom:4}}>Fondo de caja</div><div style={{display:"flex",alignItems:"center",gap:8,marginTop:12}}><span style={{fontSize:18,fontWeight:700,color:C.muted}}>$</span><input type="number" style={sInput} placeholder="0" value={fondo} onChange={e=>setFondo(e.target.value)}/></div></div>
        <div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>Fotos obligatorias</div>
          <FotoInput label="Foto de la tienda abierta y ordenada" value={fotoTienda} onChange={setFotoTienda} required/>
          <FotoInput label="Foto del tablero de accesorios" value={fotoTablero} onChange={setFotoTablero} required/>
        </div>
        <div style={sCard()}><textarea style={{...sInput,height:76,resize:"none"}} placeholder="Notas para la dueña (opcional)…" value={notas} onChange={e=>setNotas(e.target.value)}/></div>
        {!canDone&&<div style={{background:"#FEF0ED",border:`1.5px solid ${C.orange}`,borderRadius:12,padding:14,marginBottom:16,fontSize:14,color:C.orange}}>⚠️ Completa la lista, las fotos y el fondo de caja para continuar.</div>}
        <button disabled={!canDone} onClick={()=>onComplete({checks,fotoTienda,fotoTablero,insumos,fondo:Number(fondo),notas,hora:new Date()})} style={{...sBtn(canDone?C.orange:C.border,true),padding:"18px",fontSize:17,borderRadius:16,opacity:canDone?1:0.5}}>✓ Confirmar apertura</button>
      </div>
    </div>
  );
}

function TurnoActivo({tienda,seller,sales,cashMovements,fondo,checksDue,onNewSale,onChequeo,onSalidaCaja,onInsumos,onVerStock,onCierre}){
  const totalVentas=sales.reduce((a,s)=>a+s.precio,0);
  const ventasEfectivo=sales.filter(s=>s.pago==="efectivo").reduce((a,s)=>a+s.precio,0);
  const salidas=cashMovements.reduce((a,m)=>a+m.monto,0);
  const cajaEsperada=(fondo||0)+ventasEfectivo-salidas;
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <div style={{background:C.dark,padding:"20px 20px 28px"}}>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"2px",textTransform:"uppercase"}}>HINDICA · {tienda.toUpperCase()}</div>
        <div style={{fontSize:22,fontWeight:800,color:C.white,marginTop:4}}>Hola, {seller} 👋</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginTop:2}}>{fmtDate(new Date())} · {fmtTime(new Date())}</div>
        <div style={{display:"flex",gap:12,marginTop:18}}>
          <div style={{flex:1,background:"rgba(255,255,255,0.1)",borderRadius:14,padding:"14px 16px"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",textTransform:"uppercase"}}>Ventas hoy</div><div style={{fontSize:28,fontWeight:900,color:C.white,marginTop:4}}>{sales.length}</div></div>
          <div style={{flex:2,background:"rgba(255,255,255,0.1)",borderRadius:14,padding:"14px 16px"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",textTransform:"uppercase"}}>Total vendido</div><div style={{fontSize:22,fontWeight:800,color:C.gold,marginTop:4}}>{fmt(totalVentas)}</div></div>
        </div>
      </div>
      <div style={{padding:"20px 20px 0"}}>
        {checksDue&&(<div onClick={onChequeo} style={{background:C.orange,borderRadius:16,padding:"16px 18px",marginBottom:18,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{color:C.white,fontWeight:800,fontSize:15}}>⏰ Hora de revisar la tienda</div><div style={{color:"rgba(255,255,255,0.75)",fontSize:13,marginTop:2}}>Toca para hacer el chequeo horario</div></div><div style={{color:C.white,fontSize:22}}>→</div></div>)}
        <button onClick={onNewSale} style={{...sBtn(C.orange,true),padding:"20px",fontSize:18,borderRadius:16,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><span>🛍️</span> Registrar venta</button>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          {[{label:"Chequeo tienda",icon:"🏪",color:C.dark,action:onChequeo},{label:"Mi stock",icon:"📦",color:"#5B6BA8",action:onVerStock},{label:"Salida de caja",icon:"💵",color:C.purple,action:onSalidaCaja},{label:"Reportar insumos",icon:"📋",color:"#5E8A6E",action:onInsumos},{label:"Cerrar turno",icon:"🔒",color:"#888",action:onCierre}].map(({label,icon,color,action})=>(
            <button key={label} onClick={action} style={{background:color,color:C.white,border:"none",borderRadius:14,padding:"16px 10px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,fontFamily:"inherit"}}><span style={{fontSize:22}}>{icon}</span>{label}</button>
          ))}
        </div>
        {sales.length>0&&<div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>Ventas de hoy</div>
          {sales.map((sale,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<sales.length-1?`1px solid ${C.border}`:"none"}}>{sale.foto&&<img src={sale.foto} alt="" style={{width:52,height:52,borderRadius:10,objectFit:"cover",flexShrink:0}}/>}<div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sale.producto}</div><div style={{fontSize:12,color:C.muted}}>{sale.colorBase}{sale.estampado&&sale.estampado!=="-"?` · ${sale.estampado}`:""}</div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:15,fontWeight:800}}>{fmt(sale.precio)}</div><div style={{fontSize:11,color:C.muted}}>{MEDIOS_PAGO.find(p=>p.id===sale.pago)?.label}</div></div></div>))}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:14}}><div style={{fontSize:14,fontWeight:700}}>Efectivo esperado en caja</div><div style={{fontSize:18,fontWeight:800,color:C.green}}>{fmt(cajaEsperada)}</div></div>
        </div>}
      </div>
    </div>
  );
}

function ClubCaja({tienda,club,setClub}){
  const [clave,setClave]=useState(clubClave.get());
  const [claveIn,setClaveIn]=useState("");
  const [esSocia,setEsSocia]=useState(null);
  const [busca,setBusca]=useState("");
  const [cargando,setCargando]=useState(false);
  const [msg,setMsg]=useState("");
  const [regaloOk,setRegaloOk]=useState(false);
  const socia=club.socia;

  const guardarClave=async()=>{
    setMsg(""); setCargando(true);
    const r=await clubRpc("club_buscar",{p_clave:claveIn,p_numero:0});
    setCargando(false);
    if(r.error&&r.error.startsWith("Clave")) return setMsg(r.error);
    clubClave.set(claveIn); setClave(claveIn); setClaveIn("");
  };
  const buscar=async()=>{
    const v=busca.trim(); if(!v)return;
    setMsg(""); setCargando(true);
    const r=await clubRpc("club_buscar",/^\d{4,6}$/.test(v)?{p_clave:clave,p_numero:Number(v)}:{p_clave:clave,p_rut:v});
    setCargando(false);
    if(!r.ok){ if(r.error&&r.error.startsWith("Clave")){clubClave.set("");setClave("");} return setMsg(r.error); }
    setClub({decidido:true,socia:r.socia});
  };
  const regalo=async()=>{
    if(!window.confirm(`¿Entregaste el regalo de cumpleaños a ${socia.primer_nombre}?`))return;
    const r=await clubRpc("club_regalo",{p_clave:clave,p_numero:socia.numero,p_tienda:clubTienda(tienda)});
    if(!r.ok)return setMsg(r.error);
    setRegaloOk(true); setClub({decidido:true,socia:r.socia});
  };
  const reiniciar=()=>{ setEsSocia(null); setBusca(""); setMsg(""); setRegaloOk(false); setClub({decidido:false,socia:null}); };

  if(socia) return(
    <div style={sCard({border:`2px solid ${C.purple}`})}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:12,color:C.muted,fontWeight:700}}>SOCIA N° {socia.numero}</div>
          <div style={{fontSize:22,fontWeight:900,color:C.purple}}>{socia.nombre}</div>
        </div>
        <button onClick={reiniciar} style={{background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cambiar</button>
      </div>
      <div style={{background:"#F5ECF5",borderRadius:10,padding:"10px 12px",margin:"10px 0",fontSize:14}}>💬 Llámala por su nombre: <b>{socia.primer_nombre}</b>{socia.color_favorito?<> · le encanta el <b>{socia.color_favorito.toLowerCase()}</b></>:null}</div>
      {socia.cumple_hoy&&<div style={{background:"#FDF5E0",color:C.gold,borderRadius:10,padding:"10px 12px",marginBottom:8,fontWeight:800}}>🎂 ¡Hoy es su cumpleaños! Salúdala.</div>}
      {!socia.cumple_hoy&&socia.cumple_este_mes&&<div style={{background:"#FDF5E0",color:C.gold,borderRadius:10,padding:"10px 12px",marginBottom:8,fontWeight:700}}>🎂 Está de cumpleaños este mes</div>}
      <div style={{fontSize:15,fontWeight:800,color:C.green,marginBottom:socia.regalo==="disponible"?10:0}}>{socia.bienvenida_disponible?"✓ 20% de bienvenida (una sola vez)":"✓ 5% de descuento de socia"}</div>
      {socia.regalo==="disponible"&&<button onClick={regalo} style={{...sBtn(C.gold,true),fontSize:15,padding:"12px"}}>🎁 Tiene regalo de cumpleaños: entregar</button>}
      {regaloOk&&<div style={{fontSize:13,color:C.green,marginTop:8}}>Regalo anotado ✓</div>}
      {msg&&<div style={{fontSize:13,color:C.red,marginTop:8}}>{msg}</div>}
    </div>
  );

  if(club.decidido) return(
    <div style={sCard({padding:14})}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:14,color:C.muted}}>Venta sin Club</div>
        <button onClick={reiniciar} style={{background:"none",border:"none",color:C.purple,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Cambiar</button>
      </div>
    </div>
  );

  return(
    <div style={sCard({border:`2px solid ${C.purple}`})}>
      <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>🌿 ¿Es socia del Club Hindica?</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button onClick={()=>{setEsSocia(true);setMsg("");}} style={{...sBtn(esSocia===true?C.purple:C.white),color:esSocia===true?C.white:C.text,border:`2px solid ${esSocia===true?C.purple:C.border}`}}>Sí</button>
        <button onClick={()=>setEsSocia(false)} style={{...sBtn(esSocia===false?C.dark:C.white),color:esSocia===false?C.white:C.text,border:`2px solid ${esSocia===false?C.dark:C.border}`}}>No</button>
      </div>
      {esSocia===false&&<div style={{marginTop:14}}>
        <div style={{background:"#FEF0E8",borderRadius:12,padding:"12px 14px",fontSize:14,lineHeight:1.5,marginBottom:12}}>
          <b style={{color:C.orange}}>Ofrécele el Club ahora:</b><br/>"Antes de pagar, ¿te quieres unir al Club Hindica? Es gratis, toma un minuto y hoy mismo tienes 20% de descuento en esta compra."<br/><span style={{color:C.muted}}>Muéstrale el QR del mesón. Si se une, toca "Sí" y busca su número.</span>
        </div>
        <button onClick={()=>setClub({decidido:true,socia:null})} style={{...sBtn(C.dark,true),fontSize:15}}>No quiere unirse · seguir sin Club</button>
      </div>}
      {esSocia===true&&!clave&&<div style={{marginTop:14}}>
        <div style={{fontSize:13,color:C.muted,marginBottom:8}}>Primera vez en este teléfono: ingresa la clave del Club (te la da la dueña). Se guarda aquí.</div>
        <div style={{display:"flex",gap:8}}>
          <input type="password" style={sInput} placeholder="Clave del Club" value={claveIn} onChange={e=>setClaveIn(e.target.value)}/>
          <button onClick={guardarClave} style={{...sBtn(C.purple),padding:"12px 16px"}}>{cargando?"…":"OK"}</button>
        </div>
      </div>}
      {esSocia===true&&clave&&<div style={{marginTop:14}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:8}}>Número de socia o RUT</div>
        <div style={{display:"flex",gap:8}}>
          <input style={sInput} placeholder="Ej: 1023 o 12.345.678-9" value={busca} onChange={e=>setBusca(e.target.value)} onKeyDown={e=>e.key==="Enter"&&buscar()}/>
          <button onClick={buscar} style={{...sBtn(C.purple),padding:"12px 16px"}}>{cargando?"…":"Buscar"}</button>
        </div>
        <div style={{fontSize:12,color:C.muted,marginTop:6}}>Si olvidó su número, búscala por RUT.</div>
        <button onClick={()=>setClub({decidido:true,socia:null})} style={{background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer",marginTop:10,padding:0,fontFamily:"inherit",textDecoration:"underline"}}>No la encontramos · seguir sin descuento</button>
      </div>}
      {msg&&<div style={{fontSize:13,color:C.red,marginTop:10}}>{msg}</div>}
    </div>
  );
}

function NuevaVenta({seller,tienda,onSave,onBack}){
  const [categoria,setCategoria]=useState("");
  const [producto,setProducto]=useState("");
  const [colorBase,setColorBase]=useState("");
  const [estampado,setEstampado]=useState("");
  const [colorAcento,setColorAcento]=useState("");
  const [foto,setFoto]=useState(null);
  const [precio,setPrecio]=useState("");
  const [pago,setPago]=useState("");
  const [club,setClub]=useState({decidido:false,socia:null});
  const [guardando,setGuardando]=useState(false);
  const [errorGuardar,setErrorGuardar]=useState("");
  const socia=club.socia;
  const descuento=socia?(socia.bienvenida_disponible?20:5):0;
  const precioFinal=precio?Math.round(Number(precio)*(100-descuento)/100):0;
  const esJoy=JOYERIA_ITEMS.includes(producto);
  const todosProds=categoria?(categoria==="Joyería"?JOYERIA_ITEMS:(ROPA_ITEMS[categoria]||[])):[];
  const canSave=club.decidido&&producto&&colorBase&&foto&&precio&&pago&&(esJoy||(estampado&&colorAcento));
  const guardar=async()=>{
    setErrorGuardar("");
    if(socia){
      setGuardando(true);
      const r=await clubRpc("club_compra",{p_clave:clubClave.get(),p_numero:socia.numero,p_bienvenida:descuento===20,p_tienda:clubTienda(tienda)});
      setGuardando(false);
      if(!r.ok){ setErrorGuardar(r.error||"No se pudo registrar el descuento del Club."); return; }
    }
    onSave({hora:new Date(),vendedora:seller,tienda,categoria,producto,colorBase,estampado:esJoy?"-":estampado,colorAcento:esJoy?"-":colorAcento,foto,precio:precioFinal,precioLista:Number(precio),descuentoClub:descuento,pago,numeroSocia:socia?socia.numero:null,nombreSocia:socia?socia.nombre:null});
  };
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <Header title="Registrar Venta" subtitle={`${seller} · ${tienda}`} color={C.orange} onBack={onBack}/>
      <div style={{padding:"20px 20px 0"}}>
        <ClubCaja tienda={tienda} club={club} setClub={setClub}/>
        {club.decidido&&<div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Categoría</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{[...Object.keys(ROPA_ITEMS),"Joyería"].map(cat=><TagBtn key={cat} label={cat} active={categoria===cat} onClick={()=>{setCategoria(cat);setProducto("");}}/>)}</div>
        </div>}
        {categoria&&<div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Producto</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{todosProds.map(p=><TagBtn key={p} label={p} active={producto===p} color={C.dark} bgActive="#EEF4F1" onClick={()=>setProducto(p)}/>)}</div>
        </div>}
        {producto&&<div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Color base</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:esJoy?0:16}}>{COLORES.map(c=><TagBtn key={c} label={c} active={colorBase===c} onClick={()=>setColorBase(c)}/>)}</div>
          {!esJoy&&<>
            <div style={{fontSize:16,fontWeight:800,margin:"16px 0 12px"}}>Estampado</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>{ESTAMPADOS.map(e=><TagBtn key={e} label={e} active={estampado===e} color={C.purple} bgActive="#F5ECF5" onClick={()=>setEstampado(e)}/>)}</div>
            <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Color acento</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{COLORES.map(c=><TagBtn key={c} label={c} active={colorAcento===c} color={C.gold} bgActive="#FDF5E0" onClick={()=>setColorAcento(c)}/>)}</div>
          </>}
        </div>}
        {producto&&<div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>Foto del artículo <span style={{color:C.red}}>*</span></div>
          <div style={{fontSize:13,color:C.muted,marginBottom:14}}>{esJoy?"Foto clara de la joyería vendida.":"Foto del estampado del artículo."}</div>
          <FotoInput label="Foto" value={foto} onChange={setFoto} required/>
        </div>}
        {foto&&<div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>Precio y pago</div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:8}}>{descuento?"Precio normal (de la etiqueta)":"Precio"}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18,fontWeight:700,color:C.muted}}>$</span><input type="number" style={sInput} placeholder="0" value={precio} onChange={e=>setPrecio(e.target.value)}/></div>
            {descuento>0&&precio&&<div style={{marginTop:10,background:"#E8F5EE",borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,color:C.green,fontWeight:700}}>Club {descuento}% {descuento===20?"(bienvenida)":""}<br/><span style={{fontWeight:400}}>Descuento: {fmt(Number(precio)-precioFinal)}</span></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:11,color:C.muted,textTransform:"uppercase",fontWeight:700}}>A cobrar</div><div style={{fontSize:22,fontWeight:900,color:C.green}}>{fmt(precioFinal)}</div></div>
            </div>}
          </div>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:10}}>Medio de pago</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{MEDIOS_PAGO.map(p=>(<button key={p.id} onClick={()=>setPago(p.id)} style={{padding:"14px",borderRadius:12,fontFamily:"inherit",border:`2px solid ${pago===p.id?C.dark:C.border}`,background:pago===p.id?C.dark:C.white,color:pago===p.id?C.white:C.text,fontSize:15,fontWeight:700,cursor:"pointer"}}>{p.icon} {p.label}</button>))}</div>
        </div>}
        {errorGuardar&&<div style={{background:"#FDECEA",color:C.red,borderRadius:12,padding:"12px 14px",fontSize:14,marginBottom:12}}>{errorGuardar}</div>}
        {canSave&&<button disabled={guardando} onClick={guardar} style={{...sBtn(C.green,true),padding:"18px",fontSize:17,borderRadius:16,opacity:guardando?0.6:1}}>{guardando?"Guardando…":`✓ Guardar venta${descuento?` · cobrar ${fmt(precioFinal)}`:""}`}</button>}
      </div>
    </div>
  );
}

function ChequeoHorario({seller,tienda,onSave,onBack}){
  const [checks,setChecks]=useState({});
  const [fotoTienda,setFotoTienda]=useState(null);
  const [fotoTablero,setFotoTablero]=useState(null);
  const [notas,setNotas]=useState("");
  const allChecked=LISTA_HORARIA.every(i=>checks[i.id]);
  const canSave=allChecked&&fotoTienda&&fotoTablero;
  const toggle=id=>setChecks(p=>({...p,[id]:!p[id]}));
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <Header title="Chequeo Horario" subtitle={`${tienda} · ${fmtTime(new Date())}`} onBack={onBack}/>
      <div style={{padding:"20px 20px 0"}}>
        <div style={sCard()}><div style={{fontSize:16,fontWeight:800,marginBottom:14}}>Estado de la tienda</div>{LISTA_HORARIA.map(item=><CheckItem key={item.id} label={item.label} checked={!!checks[item.id]} onToggle={()=>toggle(item.id)}/>)}</div>
        <div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>Fotos del momento</div>
          <FotoInput label="Foto de la tienda ahora" value={fotoTienda} onChange={setFotoTienda} required/>
          <FotoInput label="Foto del tablero de accesorios" value={fotoTablero} onChange={setFotoTablero} required/>
        </div>
        <div style={sCard()}><textarea style={{...sInput,height:76,resize:"none"}} placeholder="¿Algo que reportar? (opcional)" value={notas} onChange={e=>setNotas(e.target.value)}/></div>
        <button disabled={!canSave} onClick={()=>onSave({checks,fotoTienda,fotoTablero,notas,hora:new Date()})} style={{...sBtn(canSave?C.dark:C.border,true),padding:"18px",fontSize:17,borderRadius:16,opacity:canSave?1:0.5}}>✓ Confirmar chequeo</button>
      </div>
    </div>
  );
}

function SalidaCaja({seller,onSave,onBack}){
  const [monto,setMonto]=useState("");
  const [motivo,setMotivo]=useState("");
  const ok=monto&&motivo.trim();
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <Header title="Salida de Caja" color={C.purple} onBack={onBack}/>
      <div style={{padding:"20px 20px 0"}}>
        <div style={sCard()}><div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Monto</div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18,fontWeight:700,color:C.muted}}>$</span><input type="number" style={sInput} placeholder="0" value={monto} onChange={e=>setMonto(e.target.value)}/></div></div>
        <div style={sCard()}><div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Motivo</div><textarea style={{...sInput,height:80,resize:"none"}} placeholder="¿Para qué se usa este dinero?" value={motivo} onChange={e=>setMotivo(e.target.value)}/></div>
        <button disabled={!ok} onClick={()=>onSave({monto:Number(monto),motivo,hora:new Date(),vendedora:seller})} style={{...sBtn(ok?C.purple:C.border,true),padding:"18px",fontSize:17,borderRadius:16,opacity:ok?1:0.5}}>✓ Registrar salida</button>
      </div>
    </div>
  );
}

function ReporteInsumos({seller,tienda,onSave,onBack}){
  const [items,setItems]=useState("");
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <Header title="Reportar Insumos" subtitle="Se notificará a la dueña" color="#5E8A6E" onBack={onBack}/>
      <div style={{padding:"20px 20px 0"}}>
        <div style={sCard()}><div style={{fontSize:16,fontWeight:800,marginBottom:4}}>¿Qué falta?</div><div style={{fontSize:13,color:C.muted,marginBottom:14}}>Bolsas, papel, perchas, stickers, etc.</div><textarea style={{...sInput,height:120,resize:"none"}} placeholder="Ej: Se acabaron las bolsas grandes…" value={items} onChange={e=>setItems(e.target.value)}/></div>
        <div style={{background:"#E8F5EE",borderRadius:12,padding:14,marginBottom:20,fontSize:14,color:"#1E6640"}}>📬 La dueña recibirá una notificación inmediata.</div>
        <button disabled={!items.trim()} onClick={()=>onSave({items,hora:new Date(),vendedora:seller,tienda})} style={{...sBtn(items.trim()?"#5E8A6E":C.border,true),padding:"18px",fontSize:17,borderRadius:16,opacity:items.trim()?1:0.5}}>✓ Enviar reporte</button>
      </div>
    </div>
  );
}

function Cierre({tienda,seller,sales,cashMovements,fondo,onComplete}){
  const [fotoCierre,setFotoCierre]=useState(null);
  const [efectivoReal,setEfectivoReal]=useState("");
  const [checks,setChecks]=useState({});
  const [notas,setNotas]=useState("");
  const ventasEfectivo=sales.filter(s=>s.pago==="efectivo").reduce((a,s)=>a+s.precio,0);
  const salidas=cashMovements.reduce((a,m)=>a+m.monto,0);
  const cajaEsperada=(fondo||0)+ventasEfectivo-salidas;
  const totalVentas=sales.reduce((a,s)=>a+s.precio,0);
  const diferencia=efectivoReal!==""?Number(efectivoReal)-cajaEsperada:null;
  const allChecked=LISTA_CIERRE.every(i=>checks[i.id]);
  const canClose=allChecked&&fotoCierre&&efectivoReal;
  const toggle=id=>setChecks(p=>({...p,[id]:!p[id]}));
  const byPago=MEDIOS_PAGO.map(p=>({...p,total:sales.filter(s=>s.pago===p.id).reduce((a,s)=>a+s.precio,0),count:sales.filter(s=>s.pago===p.id).length})).filter(p=>p.count>0);
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:40}}>
      <Header title="Cierre de Turno" subtitle={`${tienda} · ${fmtDate(new Date())}`}/>
      <div style={{padding:"20px 20px 0"}}>
        <div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>Resumen del día</div>
          {byPago.map(p=>(<div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div>{p.icon} {p.label} <span style={{color:C.muted,fontSize:13}}>({p.count})</span></div><div style={{fontWeight:700}}>{fmt(p.total)}</div></div>))}
          {sales.length===0&&<div style={{color:C.muted,fontSize:14}}>Sin ventas hoy.</div>}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:14}}><div style={{fontSize:16,fontWeight:800}}>Total vendido</div><div style={{fontSize:18,fontWeight:800,color:C.green}}>{fmt(totalVentas)}</div></div>
        </div>
        <div style={sCard()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>Arqueo de caja</div>
          {[{label:"Fondo inicial",value:fmt(fondo||0)},{label:"Ventas en efectivo",value:fmt(ventasEfectivo)},...(salidas>0?[{label:"Salidas",value:`−${fmt(salidas)}`,red:true}]:[])].map(({label,value,red})=>(<div key={label} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:red?C.red:C.muted}}>{label}</span><span style={{fontWeight:600,color:red?C.red:C.text}}>{value}</span></div>))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"12px 0 16px",borderTop:`2px solid ${C.border}`,marginTop:8}}><span style={{fontWeight:800}}>Efectivo esperado</span><span style={{fontWeight:800,fontSize:16}}>{fmt(cajaEsperada)}</span></div>
          <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:8,textTransform:"uppercase"}}>Efectivo real en caja</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18,fontWeight:700,color:C.muted}}>$</span><input type="number" style={sInput} placeholder="Cuenta el efectivo..." value={efectivoReal} onChange={e=>setEfectivoReal(e.target.value)}/></div>
          {diferencia!==null&&diferencia!==0&&(<div style={{marginTop:14,padding:14,borderRadius:12,background:diferencia<0?"#FDECEA":"#E8F5EE",border:`1.5px solid ${diferencia<0?C.red:C.green}`}}><div style={{fontWeight:800,color:diferencia<0?C.red:C.green}}>{diferencia<0?`⚠️ Falta ${fmt(Math.abs(diferencia))} en caja`:`ℹ️ Sobran ${fmt(diferencia)} en caja`}</div><div style={{fontSize:13,color:C.muted,marginTop:4}}>Se notificará a la dueña.</div></div>)}
          {diferencia===0&&efectivoReal!==""&&(<div style={{marginTop:14,padding:14,borderRadius:12,background:"#E8F5EE",border:`1.5px solid ${C.green}`}}><div style={{fontWeight:800,color:C.green}}>✓ Caja cuadra perfectamente</div></div>)}
        </div>
        <div style={sCard()}><div style={{fontSize:16,fontWeight:800,marginBottom:14}}>Checklist de cierre</div>{LISTA_CIERRE.map(item=><CheckItem key={item.id} label={item.label} checked={!!checks[item.id]} onToggle={()=>toggle(item.id)}/>)}</div>
        <div style={sCard()}>
          <FotoInput label="Foto de la tienda cerrada y ordenada" value={fotoCierre} onChange={setFotoCierre} required/>
          <textarea style={{...sInput,height:70,resize:"none",marginTop:12}} placeholder="Notas del turno (opcional)…" value={notas} onChange={e=>setNotas(e.target.value)}/>
        </div>
        <button disabled={!canClose} onClick={()=>onComplete({fotoCierre,efectivoReal:Number(efectivoReal),cajaEsperada,diferencia,checks,notas})} style={{...sBtn(canClose?C.dark:C.border,true),padding:"18px",fontSize:17,borderRadius:16,opacity:canClose?1:0.5}}>🔒 Cerrar turno definitivamente</button>
      </div>
    </div>
  );
}

function TurnoCerrado({tienda,seller,sales}){
  const total=sales.reduce((a,s)=>a+s.precio,0);
  return(
    <div style={{background:C.dark,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
      <div style={{fontSize:60,marginBottom:20}}>✅</div>
      <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",letterSpacing:"4px",textTransform:"uppercase",marginBottom:8}}>TURNO CERRADO</div>
      <div style={{fontSize:26,fontWeight:800,color:C.white,marginBottom:6}}>{tienda}</div>
      <div style={{fontSize:16,color:"rgba(255,255,255,0.5)",marginBottom:36}}>¡Buen trabajo, {seller}!</div>
      <div style={{background:"rgba(255,255,255,0.1)",borderRadius:20,padding:"24px 40px"}}>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"1px"}}>Total vendido hoy</div>
        <div style={{fontSize:38,fontWeight:900,color:C.gold,marginTop:8}}>{fmt(total)}</div>
        <div style={{fontSize:14,color:"rgba(255,255,255,0.4)",marginTop:6}}>{sales.length} venta{sales.length!==1?"s":""}</div>
      </div>
    </div>
  );
}

export default function HindicaApp(){
  const [mode,setMode]         = useState("selector");
  const [screen,setScreen]     = useState("login");
  const [tienda,setTienda]     = useState("");
  const [seller,setSeller]     = useState("");
  const [opening,setOpening]   = useState(null);
  const [sales,setSales]       = useState([]);
  const [allSales,setAllSales] = useState([]);
  const [cashMovements,setCashMovements] = useState([]);
  const [hourlyChecks,setHourlyChecks]  = useState([]);
  const [shiftStart,setShiftStart]      = useState(null);
  const [lastCheck,setLastCheck]        = useState(null);
  const [allFlags,setAllFlags]  = useState([]);
  const [allStock,_setAllStock] = useState([]);
  const stockRef = useRef([]);
  const setAllStock = fn => {
    const prev = stockRef.current;
    const next = typeof fn === "function" ? fn(prev) : fn;
    stockRef.current = next; _setAllStock(next);
    stockDb.sincronizar(prev, next);
  };
  const recargarStock = async () => { const r = await stockDb.cargar(); if (r) { stockRef.current = r; _setAllStock(r); } };
  const [ferias,setFerias]      = useState([]);
  const [quizStats,setQuizStats]= useState([]);
  const [now,setNow]            = useState(new Date());
  const [tiendas,setTiendas]    = useState(TIENDAS_DEFAULT);
  const [vendedoras,setVendedoras] = useState(VENDEDORAS_DEFAULT);
  const [duenaPin,setDuenaPin]  = useState(DUENA_PIN_DEFAULT);
  const [turnoId,setTurnoId]    = useState(null);

  useEffect(()=>{
    const load=async()=>{
      try{
        const [v,t,s,a]=await Promise.all([db.get("vendedoras",{}),db.get("tiendas",{}),db.get("ventas",{}),db.get("alertas",{})]);
        if(v&&v.length>0)setVendedoras(v.map(x=>({nombre:x.nombre,pin:x.pin,id:x.id})));
        if(t&&t.length>0)setTiendas(t.map(x=>x.nombre));
        if(s&&s.length>0)setAllSales(s);
        if(a&&a.length>0)setAllFlags(a.filter(x=>!x.vista));
      }catch(e){}
    };
    load();
  },[]);

  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(t);},[]);
  useEffect(()=>{ recargarStock(); },[]); // eslint-disable-line
  useEffect(()=>{ if(mode==="duena"||screen==="verStock"||screen==="newSale"||screen==="shift") recargarStock(); },[mode,screen]); // eslint-disable-line

  const addFlag=async f=>{
    const flag={...f,hora:new Date()};
    setAllFlags(p=>[...p,flag]);
    try{await db.insert("alertas",{titulo:f.titulo,detalle:f.detalle,tienda:f.tienda,nivel:f.nivel});}catch(e){}
  };

  const checksDue=(()=>{
    if(mode!=="vendedora"||screen!=="shift"||!shiftStart)return false;
    const ref=lastCheck||shiftStart;
    const mins=(now-ref)/60000;
    const lastSale=sales.length>0?sales[sales.length-1]:null;
    const busy=lastSale&&(now-new Date(lastSale.hora))/60000<60;
    return busy?mins>80:mins>120;
  })();

  const W=c=><div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh"}}>{c}</div>;

  if(mode==="selector")return W(<Selector onVendedora={()=>{setMode("vendedora");setScreen("login");}} onDuena={()=>setMode("duena_login")} onEntrenamiento={()=>setMode("entrenamiento")}/>);
  if(mode==="entrenamiento")return W(<ModoEntrenamiento onBack={()=>setMode("selector")}/>);
  if(mode==="duena_login")return W(<LoginDuena duenaPin={duenaPin} onSuccess={()=>setMode("duena")} onBack={()=>setMode("selector")}/>);
  if(mode==="duena")return W(<PanelDuena allSales={allSales} allFlags={allFlags} allStock={allStock} setAllStock={setAllStock} vendedoras={vendedoras} setVendedoras={setVendedoras} duenaPin={duenaPin} setDuenaPin={setDuenaPin} tiendas={tiendas} setTiendas={setTiendas} ferias={ferias} setFerias={setFerias} quizStats={quizStats} onBack={()=>setMode("selector")}/>);

  if(screen==="login")return W(
    <div style={{minHeight:"100vh",background:C.dark,fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{padding:"50px 28px 32px",textAlign:"center"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:"5px",textTransform:"uppercase",marginBottom:10}}>BIENVENIDA A</div>
        <div style={{fontSize:44,fontWeight:900,color:C.white,letterSpacing:"8px"}}>HINDICA</div>
        <div style={{width:40,height:3,background:C.orange,margin:"14px auto"}}/>
      </div>
      <LoginVendedora vendedoras={vendedoras} tiendas={tiendas} onStart={(t,s)=>{setTienda(t);setSeller(s);setShiftStart(new Date());setScreen("principios");}}/>
    </div>
  );

  if(screen==="principios")return W(<PrincipiosDiarios seller={seller} onComplete={()=>setScreen("quiz")}/>);
  if(screen==="quiz")return W(<QuizDiario seller={seller} historial={quizStats.filter(s=>s.vendedora===seller)} onComplete={resultados=>{setQuizStats(p=>[...p,...resultados.map(r=>({...r,vendedora:seller,fecha:new Date()}))]);setScreen("opening");}}/>);
  if(screen==="opening")return W(<Apertura tienda={tienda} seller={seller} onComplete={async data=>{setOpening(data);setScreen("shift");if(data.insumos)addFlag({titulo:"Insumos faltantes en apertura",detalle:data.insumos,tienda,nivel:"amarillo"});try{const r=await db.insert("turnos",{vendedora:seller,tienda,fondo_caja:data.fondo,foto_apertura:data.fotoTienda,foto_tablero_apertura:data.fotoTablero,insumos_faltantes:data.insumos,notas_apertura:data.notas,hora_apertura:data.hora});if(r&&r[0])setTurnoId(r[0].id);}catch(e){}}}/>);
  if(screen==="shift")return W(<TurnoActivo tienda={tienda} seller={seller} sales={sales} cashMovements={cashMovements} fondo={opening?.fondo} checksDue={checksDue} onNewSale={()=>setScreen("newSale")} onChequeo={()=>setScreen("chequeo")} onSalidaCaja={()=>setScreen("salidaCaja")} onInsumos={()=>setScreen("insumos")} onVerStock={()=>setScreen("verStock")} onCierre={()=>setScreen("cierre")}/>);
  if(screen==="newSale")return W(<NuevaVenta seller={seller} tienda={tienda} onSave={async s=>{setSales(p=>[...p,s]);setAllSales(p=>[...p,s]);setAllStock(prev=>{const u=[...prev];const idx=u.findIndex(i=>i.ubicacion===tienda&&i.producto===s.producto&&i.colorBase===s.colorBase&&i.cantidad>0);if(idx>=0)u[idx]={...u[idx],cantidad:u[idx].cantidad-1};return u;});setScreen("shift");try{await db.insert("ventas",{turno_id:turnoId,vendedora:s.vendedora,tienda:s.tienda,categoria:s.categoria,producto:s.producto,color_base:s.colorBase,estampado:s.estampado,color_acento:s.colorAcento,foto:s.foto,precio:s.precio,medio_pago:s.pago,hora:s.hora});}catch(e){}}} onBack={()=>setScreen("shift")}/>);
  if(screen==="chequeo")return W(<ChequeoHorario seller={seller} tienda={tienda} onSave={c=>{setHourlyChecks(p=>[...p,c]);setLastCheck(new Date());if(c.notas)addFlag({titulo:"Reporte en chequeo horario",detalle:c.notas,tienda,nivel:"amarillo"});setScreen("shift");}} onBack={()=>setScreen("shift")}/>);
  if(screen==="salidaCaja")return W(<SalidaCaja seller={seller} onSave={m=>{setCashMovements(p=>[...p,m]);addFlag({titulo:"Salida de caja",detalle:`${seller} retiró ${fmt(m.monto)}: ${m.motivo}`,tienda,nivel:"amarillo"});setScreen("shift");}} onBack={()=>setScreen("shift")}/>);
  if(screen==="insumos")return W(<ReporteInsumos seller={seller} tienda={tienda} onSave={r=>{addFlag({titulo:"Insumos faltantes",detalle:r.items,tienda,nivel:"rojo"});setScreen("shift");}} onBack={()=>setScreen("shift")}/>);
  if(screen==="verStock")return W(<StockTienda tienda={tienda} seller={seller} allStock={allStock} setAllStock={setAllStock} addFlag={addFlag} onBack={()=>setScreen("shift")}/>);
  if(screen==="cierre")return W(<Cierre tienda={tienda} seller={seller} sales={sales} cashMovements={cashMovements} fondo={opening?.fondo} onComplete={data=>{if(data.diferencia!==0)addFlag({titulo:"Diferencia en caja al cierre",detalle:`${data.diferencia<0?"Falta":"Sobra"} ${fmt(Math.abs(data.diferencia))} en ${tienda}`,tienda,nivel:"rojo"});setScreen("cerrado");}}/>);
  if(screen==="cerrado")return W(<TurnoCerrado tienda={tienda} seller={seller} sales={sales}/>);
}

