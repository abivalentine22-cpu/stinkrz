const SUPPORT_URL = "https://buy.stripe.com/aFa7sMdjY7Cddfue6qbwk00";
const TZ = "America/Los_Angeles";
export function monthRange(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "numeric" }).formatToParts(now).map(p => [p.type,p.value]));
  const midnight = (year,month) => {
    const target = Date.UTC(year,month,1);
    let guess = target;
    for(let i=0;i<3;i++) {
      const p = Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:TZ,year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",second:"numeric",hourCycle:"h23"}).formatToParts(new Date(guess)).map(p=>[p.type,p.value]));
      const local = Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
      guess += target-local;
    }
    return Math.floor(guess/1000);
  };
  const year=+parts.year, month=+parts.month-1;
  return { start:midnight(year,month),end:midnight(year,month+1),label:new Intl.DateTimeFormat("en-US",{timeZone:TZ,month:"long",year:"numeric"}).format(now) };
}
export async function collectTotal(api,range) {
  async function list(path,params,visit) {
    let cursor;
    for(let page=0;page<100;page++) {
      const result=await api(path,{...params,limit:100,...(cursor?{starting_after:cursor}:{})});
      if(!Array.isArray(result.data)) throw new Error("Invalid Stripe result");
      for(const item of result.data) visit(item);
      if(!result.has_more) return;
      cursor=result.data.at(-1)?.id;
      if(!cursor) throw new Error("Incomplete Stripe result");
    }
    throw new Error("Stripe pagination limit");
  }
  let link;
  await list("/payment_links",{},item=>{if(item.url===SUPPORT_URL&&item.livemode===true)link=item.id});
  if(!link) throw new Error("Support link unavailable");
  let cents=0;
  const seen=new Set();
  await list("/checkout/sessions",{
    payment_link:link,status:"complete","created[gte]":range.start,"created[lt]":range.end,
    "expand[]":"data.payment_intent.latest_charge"
  },session=>{
    if(session.payment_link!==link||session.livemode!==true||session.payment_status!=="paid"||session.currency!=="usd"||session.mode!=="payment"||session.created<range.start||session.created>=range.end)return;
    const charge=session.payment_intent?.latest_charge;
    if(!charge||typeof charge!=="object"||!Number.isSafeInteger(charge.amount_captured)||!Number.isSafeInteger(charge.amount_refunded))throw new Error("Charge unavailable");
    if(seen.has(charge.id)||charge.disputed||charge.paid!==true||charge.currency!=="usd"||charge.livemode!==true)return;
    seen.add(charge.id);
    cents+=Math.max(0,charge.amount_captured-charge.amount_refunded);
  });
  return {raised_cents:cents,goal_cents:15000,currency:"usd",month:range.label,time_zone:TZ};
}
let cache=null;
let pending=null;
export async function handleRequest(req,options={}) {
  const now=options.now||new Date();
  const key=options.key??Deno.env.get("STRIPE_SUPPORT_READ_KEY");
  const headers={"Cache-Control":"no-store"};
  if(!key||!/^rk_live_/.test(key))return Response.json({available:false},{headers});
  const range=monthRange(now);
  try {
    const api=options.api|| (async(path,params)=>{
      const url=new URL("https://api.stripe.com/v1"+path);
      for(const [name,value] of Object.entries(params))url.searchParams.set(name,String(value));
      const response=await fetch(url,{headers:{Authorization:"Bearer "+key},signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error("Stripe request failed");
      return response.json();
    });
    if(!options.api) {
      if(cache?.start===range.start&&cache.until>Date.now())return Response.json({available:true,...cache.total},{headers});
      if(!pending)pending=collectTotal(api,range).then(total=>{cache={start:range.start,until:Date.now()+60000,total};return total}).finally(()=>{pending=null});
    }
    const total=options.api?await collectTotal(api,range):await pending;
    return Response.json({available:true,...total},{headers});
  }catch{
    return Response.json({available:false},{headers});
  }
}
Deno.serve(req=>handleRequest(req));
