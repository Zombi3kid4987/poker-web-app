const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
module.exports=(name,context={})=>{
 const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match=>match[1]).find(source=>source.includes('const '+name+' ='));
 if(!script)throw new Error('Missing embedded '+name);
 return vm.runInNewContext(script+';'+name+';',context);
};
