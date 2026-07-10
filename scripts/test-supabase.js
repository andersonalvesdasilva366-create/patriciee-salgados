(async ()=>{
  try{
    const url = 'https://swzfjksxrsupkekwpyor.supabase.co/rest/v1/products';
    const key = 'sb_publishable_JsYyYlBFR2tgZru2s25J7w_z8EoOIEP';
    const body = [{"name":"Teste Promo via node","description":"Produto teste via API (node)","imageurl":"https://example.com/img.png","price":9.99,"stock":10,"orderbalance":0,"partner":false,"promotion":true}];
    const post = await fetch(url, {method:'POST', headers:{'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','Prefer':'return=representation'}, body: JSON.stringify(body)});
    console.log('POST', post.status);
    console.log(await post.text());
    const get = await fetch(url + '?select=*', {headers:{'apikey':key,'Authorization':'Bearer '+key}});
    console.log('GET', get.status);
    console.log(await get.text());
  }catch(e){ console.error(e); process.exit(1); }
})();
