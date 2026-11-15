module.exports=function(){
  const noop=function(){};
  const ctx=new Proxy({}, {get:function(t,k){
    if(k==='canvas') return {};
    if(k==='createRadialGradient'||k==='createLinearGradient') return function(){return {addColorStop:noop};};
    if(k==='measureText') return function(){return {width:10};};
    if(k==='getImageData') return function(){return {data:[]};};
    return noop;
  }, set:function(){return true;}});
  return {width:0,height:0,style:{},getContext:function(){return ctx;}};
};