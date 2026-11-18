/* MiniSh: a small shell that actually executes, for practising text-processing pipelines and
   basic scripting in the browser. It is NOT bash. It covers the subset coding screens lean on:
   pipes, redirects, variables, $(...), $((...)), for / while / if, test, and the usual text tools
   (cat echo printf head tail cut tr sort uniq wc grep sed awk seq tac rev nl paste read).
   Everything runs against an in-memory file map. No network, no real filesystem, no eval. */
(function(){
"use strict";
var MAX=300000;
function lines(s){if(s==="")return [];var a=s.split("\n");if(a[a.length-1]==="")a.pop();return a;}
function out(a){return a.length?a.join("\n")+"\n":"";}
function rest(inp){var s=inp.s.slice(inp.p);inp.p=inp.s.length;return s;}
function num(x){if(typeof x==="number")return x;var m=/^\s*[-+]?(\d+\.?\d*([eE][-+]?\d+)?|\.\d+)/.exec(x==null?"":String(x));return m?parseFloat(m[0]):0;}
function looksNum(x){return typeof x==="number"||/^\s*[-+]?(\d+\.?\d*([eE][-+]?\d+)?|\.\d+)\s*$/.test(String(x));}

/* ---------- POSIX regex to JS ---------- */
var CLS={alpha:"a-zA-Z",digit:"0-9",alnum:"a-zA-Z0-9",upper:"A-Z",lower:"a-z",space:" \\t\\n\\r\\f\\v",punct:"!-\\/:-@\\[-`{-~",xdigit:"0-9A-Fa-f",blank:" \\t"};
function rx(p,ere,flags){var o="",i=0,n=p.length;
  while(i<n){var c=p[i];
    if(c==="["){var j=i+1,b="[";if(p[j]==="^"){b+="^";j++;}if(p[j]==="]"){b+="\\]";j++;}
      while(j<n&&p[j]!=="]"){if(p[j]==="["&&p[j+1]===":"){var e=p.indexOf(":]",j);if(e<0)break;b+=CLS[p.slice(j+2,e)]||"";j=e+2;}
        else{b+=p[j]==="\\"?(ere&&j+1<n&&p[j+1]!=="]"?"\\"+p[++j]:"\\\\"):p[j]==="["?"\\[":p[j];j++;}}
      o+=b+"]";i=j+1;continue;}
    if(c==="\\"){var d=p[i+1];i+=2;if(d===undefined){o+="\\\\";continue;}
      if(!ere&&"(){}|+?".indexOf(d)>=0){o+=d;continue;}
      if(d==="<"||d===">"){o+="\\b";continue;}
      o+="\\"+d;continue;}
    if(!ere&&"(){}|+?".indexOf(c)>=0){o+="\\"+c;i++;continue;}
    if(c==="/"){o+="\\/";i++;continue;}
    o+=c;i++;}
  try{return new RegExp(o,flags||"");}catch(e){throw new Err("invalid regular expression: "+p);}}
function Err(m,code){this.m=m;this.code=code||2;}

/* ---------- printf-style formatting, shared by printf and awk ---------- */
function unesc(s){return s.replace(/\\(n|t|r|\\|"|'|a|0?[0-7]{1,3}|.)/g,function(_,c){return c==="n"?"\n":c==="t"?"\t":c==="r"?"\r":c==="\\"?"\\":c==="a"?"\x07":/^[0-7]+$/.test(c)?String.fromCharCode(parseInt(c,8)):c;});}
function fmt(f,args,tostr){var k=0,used=false;tostr=tostr||String;
  var s=f.replace(/%(-?)(\+?)(0?)(\d*)(?:\.(\d+))?([sdifgxXcu%])/g,function(_,left,plus,zero,w,prec,t){
    if(t==="%")return "%";var a=args[k++];used=true;var r;
    if(t==="s"){r=a==null?"":tostr(a);if(prec!==undefined)r=r.slice(0,+prec);}
    else if(t==="c"){r=typeof a==="number"?String.fromCharCode(a):String(a==null?"":a).charAt(0);}
    else if(t==="d"||t==="i"||t==="u"){r=String(Math.trunc(num(a)));if(prec!==undefined)r=r.replace(/^(-?)(\d+)$/,function(m,sg,d){while(d.length<+prec)d="0"+d;return sg+d;});}
    else if(t==="f"){r=num(a).toFixed(prec===undefined?6:+prec);}
    else if(t==="g"){r=String(parseFloat(num(a).toPrecision(prec===undefined?6:Math.max(1,+prec))));}
    else{r=Math.trunc(num(a)).toString(16);if(t==="X")r=r.toUpperCase();}
    if(plus&&t!=="s"&&t!=="c"&&r[0]!=="-")r="+"+r;
    w=+w||0;if(r.length<w){if(left)r=r+new Array(w-r.length+1).join(" ");else if(zero&&t!=="s"){var sg=/^[-+]/.test(r)?r[0]:"";r=sg+new Array(w-r.length+1).join("0")+r.slice(sg.length);}else r=new Array(w-r.length+1).join(" ")+r;}
    return r;});
  return {s:s,n:k,used:used};}

/* =====================================================================
   awk (a practical subset)
   ===================================================================== */
var KW={BEGIN:1,END:1,"if":1,"else":1,"for":1,"while":1,"in":1,print:1,printf:1,next:1,exit:1,"break":1,"continue":1,"delete":1,"do":1};
function alex(src){var t=[],i=0,n=src.length,pv=false;
  while(i<n){var c=src[i];
    if(c===" "||c==="\t"||c==="\r"){i++;continue;}
    if(c==="\\"&&src[i+1]==="\n"){i+=2;continue;}
    if(c==="#"){while(i<n&&src[i]!=="\n")i++;continue;}
    if(c==="\n"){t.push({t:"nl"});i++;pv=false;continue;}
    if(/[0-9]/.test(c)||(c==="."&&/[0-9]/.test(src[i+1]||""))){var m=/^(\d+\.?\d*([eE][-+]?\d+)?|\.\d+)/.exec(src.slice(i));t.push({t:"num",v:parseFloat(m[0])});i+=m[0].length;pv=true;continue;}
    if(c==='"'){var s="";i++;while(i<n&&src[i]!=='"'){if(src[i]==="\\"){i++;var e=src[i];s+=e==="n"?"\n":e==="t"?"\t":e==="\\"?"\\":e==='"'?'"':e==="/"?"/":"\\"+e;}else s+=src[i];i++;}i++;t.push({t:"str",v:s});pv=true;continue;}
    if(c==="/"&&!pv){var r="";i++;while(i<n&&src[i]!=="/"){if(src[i]==="\\"&&src[i+1]==="/"){r+="/";i+=2;continue;}if(src[i]==="\\"){r+=src[i]+(src[i+1]||"");i+=2;continue;}
        if(src[i]==="["){var j=src.indexOf("]",i+2);if(j<0)j=n-1;r+=src.slice(i,j+1);i=j+1;continue;}r+=src[i];i++;}i++;t.push({t:"re",v:r});pv=true;continue;}
    if(/[A-Za-z_]/.test(c)){var w=/^[A-Za-z_]\w*/.exec(src.slice(i))[0];i+=w.length;if(KW[w]===1&&Object.prototype.hasOwnProperty.call(KW,w)){t.push({t:"kw",v:w});pv=false;}else{t.push({t:"name",v:w,call:src[i]==="("});pv=true;}continue;}
    var ops=["&&","||","==","!=","<=",">=","+=","-=","*=","/=","%=","^=","++","--","!~",">>"],op=null;for(var k=0;k<ops.length;k++)if(src.substr(i,2)===ops[k]){op=ops[k];break;}
    if(!op)op=c;i+=op.length;t.push({t:"op",v:op});pv=(op===")"||op==="]");}
  t.push({t:"eof"});return t;}

function awkProgram(src){
  var T=alex(src),p=0,noGt=0;
  function pk(){return T[p];}
  function isOp(v){return T[p].t==="op"&&T[p].v===v;}
  function isKw(v){return T[p].t==="kw"&&T[p].v===v;}
  function eat(v){if(!isOp(v))throw new Err("awk: syntax error near "+(T[p].v===undefined?T[p].t:T[p].v)+", expected "+v);p++;}
  function skip(){while(T[p].t==="nl"||isOp(";"))p++;}
  function skipNl(){while(T[p].t==="nl")p++;}
  function str(x){if(x==null)return "";if(typeof x==="number")return Number.isInteger(x)?String(x):String(parseFloat(x.toPrecision(6)));return x;}
  function truthy(x){if(x==null)return false;if(typeof x==="number")return x!==0;return looksNum(x)?num(x)!==0:x!=="";}
  function cmp(a,b){if(a==null)a="";if(b==null)b="";if(looksNum(a)&&looksNum(b)){a=num(a);b=num(b);}else{a=str(a);b=str(b);}return a<b?-1:a>b?1:0;}
  function mkre(node,E){if(node.re)return node.re;var s=str(node(E));E.rc=E.rc||{};return E.rc[s]||(E.rc[s]=rx(s,true));}
  function lv(get,set){get.set=set;return get;}
  // ---- expressions
  function expr(){return assign();}
  function assign(){var l=ternary();
    if(T[p].t==="op"&&/^(=|\+=|-=|\*=|\/=|%=|\^=)$/.test(T[p].v)){if(!l.set)throw new Err("awk: cannot assign to that");var op=T[p].v;p++;var r=assign();
      return function(E){var v=r(E);if(op!=="="){var a=num(l(E)),b=num(v);v=op==="+="?a+b:op==="-="?a-b:op==="*="?a*b:op==="/="?a/b:op==="%="?a%b:Math.pow(a,b);}l.set(E,v);return v;};}
    return l;}
  function ternary(){var c=or();if(isOp("?")){p++;var a=ternary();eat(":");var b=ternary();return function(E){return truthy(c(E))?a(E):b(E);};}return c;}
  function or(){var l=and();while(isOp("||")){p++;skipNl();var r=and();l=(function(a,b){return function(E){return truthy(a(E))||truthy(b(E))?1:0;};})(l,r);}return l;}
  function and(){var l=inop();while(isOp("&&")){p++;skipNl();var r=inop();l=(function(a,b){return function(E){return truthy(a(E))&&truthy(b(E))?1:0;};})(l,r);}return l;}
  function inop(){var l=match();while(isKw("in")){p++;var nm=T[p];if(nm.t!=="name")throw new Err("awk: expected an array name after in");p++;l=(function(a,n){return function(E){var m=E.a[n];return m&&m.has(str(a(E)))?1:0;};})(l,nm.v);}return l;}
  function match(){var l=rel();while(isOp("~")||isOp("!~")){var neg=T[p].v==="!~";p++;var r=rel();l=(function(a,b,ng){return function(E){var ok=mkre(b,E).test(str(a(E)));return (ok!==ng)?1:0;};})(l,r,neg);}return l;}
  function rel(){var l=concat();
    while(T[p].t==="op"&&/^(<|<=|==|!=|>|>=)$/.test(T[p].v)&&!(T[p].v===">"&&noGt)){var op=T[p].v;p++;var r=concat();
      l=(function(a,b,o){return function(E){var c=cmp(a(E),b(E));return (o==="<"?c<0:o==="<="?c<=0:o==="=="?c===0:o==="!="?c!==0:o===">"?c>0:c>=0)?1:0;};})(l,r,op);}
    return l;}
  function startsValue(){var t=T[p];return t.t==="num"||t.t==="str"||t.t==="name"||(t.t==="op"&&(t.v==="$"||t.v==="("));}
  function concat(){var l=add();while(startsValue()){var r=add();l=(function(a,b){return function(E){return str(a(E))+str(b(E));};})(l,r);}return l;}
  function add(){var l=mul();while(isOp("+")||isOp("-")){var op=T[p].v;p++;var r=mul();l=(function(a,b,o){return function(E){return o==="+"?num(a(E))+num(b(E)):num(a(E))-num(b(E));};})(l,r,op);}return l;}
  function mul(){var l=unary();while(isOp("*")||isOp("/")||isOp("%")){var op=T[p].v;p++;var r=unary();l=(function(a,b,o){return function(E){var x=num(a(E)),y=num(b(E));if(o!=="*"&&y===0)throw new Err("awk: division by zero");return o==="*"?x*y:o==="/"?x/y:x%y;};})(l,r,op);}return l;}
  function unary(){
    if(isOp("!")){p++;var a=unary();return function(E){return truthy(a(E))?0:1;};}
    if(isOp("-")){p++;var b=unary();return function(E){return -num(b(E));};}
    if(isOp("+")){p++;var c=unary();return function(E){return num(c(E));};}
    return pow();}
  function pow(){var l=postfix();if(isOp("^")){p++;var r=unary();return function(E){return Math.pow(num(l(E)),num(r(E)));};}return l;}
  function postfix(){
    if(isOp("++")||isOp("--")){var d=T[p].v==="++"?1:-1;p++;var o=postfix();if(!o.set)throw new Err("awk: ++ needs a variable");return function(E){var v=num(o(E))+d;o.set(E,v);return v;};}
    var x=primary();
    if((isOp("++")||isOp("--"))&&x.set){var d2=T[p].v==="++"?1:-1;p++;return function(E){var v=num(x(E));x.set(E,v+d2);return v;};}
    return x;}
  function args(){var a=[];eat("(");if(!isOp(")")){a.push(expr());while(isOp(",")){p++;skipNl();a.push(expr());}}eat(")");return a;}
  function primary(){var t=T[p];
    if(t.t==="num"){p++;return function(){return t.v;};}
    if(t.t==="str"){p++;return function(){return t.v;};}
    if(t.t==="re"){p++;var re=rx(t.v,true);var f=function(E){return re.test(E.r)?1:0;};f.re=re;return f;}
    if(isOp("$")){p++;var ix=(isOp("++")||isOp("--"))?postfix():primary();
      return lv(function(E){var i=Math.trunc(num(ix(E)));return i===0?E.r:(E.F[i-1]===undefined?"":E.F[i-1]);},
                function(E,v){var i=Math.trunc(num(ix(E)));if(i===0){E.setRec(str(v));return;}while(E.F.length<i)E.F.push("");E.F[i-1]=str(v);E.r=E.F.join(str(E.v.OFS));});}
    if(isOp("(")){p++;var sv=noGt;noGt=0;var e=expr();
      if(isOp(",")){var parts=[e];while(isOp(",")){p++;parts.push(expr());}eat(")");noGt=sv;if(!isKw("in"))throw new Err("awk: unexpected comma");p++;var an=T[p];p++;return function(E){var m=E.a[an.v];return m&&m.has(parts.map(function(q){return str(q(E));}).join("\x1c"))?1:0;};}
      eat(")");noGt=sv;return e;}
    if(t.t==="name"){p++;var nm=t.v;
      if(t.call)return call(nm,args());
      if(isOp("[")){p++;var idx=[expr()];while(isOp(",")){p++;idx.push(expr());}eat("]");
        var key=function(E){return idx.length===1?str(idx[0](E)):idx.map(function(q){return str(q(E));}).join("\x1c");};
        return lv(function(E){var m=E.a[nm]||(E.a[nm]=new Map());var k=key(E);if(!m.has(k))m.set(k,"");return m.get(k);},function(E,v){(E.a[nm]||(E.a[nm]=new Map())).set(key(E),v);});}
      if(nm==="NF")return lv(function(E){return E.F.length;},function(E,v){E.F.length=Math.max(0,Math.trunc(num(v)));E.r=E.F.join(str(E.v.OFS));});
      if(nm==="length")return function(E){return E.r.length;};
      var g=lv(function(E){return E.v[nm];},function(E,v){E.v[nm]=v;});g.vn=nm;return g;}
    throw new Err("awk: syntax error near "+(t.v===undefined?(t.t==="eof"?"end of program":t.t):t.v));}
  function call(nm,a){
    function need(n){if(a.length<n)throw new Err("awk: "+nm+"() needs "+n+" argument"+(n>1?"s":""));}
    switch(nm){
      case "length":return function(E){if(!a.length)return E.r.length;if(a[0].vn&&E.a[a[0].vn])return E.a[a[0].vn].size;return str(a[0](E)).length;};
      case "substr":need(2);return function(E){var s=str(a[0](E)),i=Math.round(num(a[1](E))),n=a[2]?Math.round(num(a[2](E))):Infinity;var st=Math.max(i,1),en=n===Infinity?s.length+1:i+n;return en>st?s.slice(st-1,en-1):"";};
      case "index":need(2);return function(E){return str(a[0](E)).indexOf(str(a[1](E)))+1;};
      case "tolower":need(1);return function(E){return str(a[0](E)).toLowerCase();};
      case "toupper":need(1);return function(E){return str(a[0](E)).toUpperCase();};
      case "int":need(1);return function(E){return Math.trunc(num(a[0](E)));};
      case "sqrt":need(1);return function(E){return Math.sqrt(num(a[0](E)));};
      case "sprintf":need(1);return function(E){return fmt(str(a[0](E)),a.slice(1).map(function(q){return q(E);}),str).s;};
      case "split":need(2);if(!a[1].vn)throw new Err("awk: split() needs an array name");return function(E){var s=str(a[0](E)),sep=a[2]?(a[2].re||str(a[2](E))):E.v.FS,parts=s===""?[]:E.splitBy(s,sep);var m=new Map();parts.forEach(function(x,i){m.set(String(i+1),x);});E.a[a[1].vn]=m;return parts.length;};
      case "sub":case "gsub":need(2);return function(E){var re=mkre(a[0],E),rep=str(a[1](E)),tg=a[2]||null,s=tg?str(tg(E)):E.r,n=0;
          var g=new RegExp(re.source,nm==="gsub"?"g":"");var r=s.replace(g,function(m){n++;return rep.replace(/\\&|&/g,function(x){return x==="&"?m:"&";});});
          if(n){if(tg){if(!tg.set)throw new Err("awk: "+nm+"() target must be a variable or field");tg.set(E,r);}else E.setRec(r);}return n;};
      case "match":need(2);return function(E){var m=mkre(a[1],E).exec(str(a[0](E)));E.v.RSTART=m?m.index+1:0;E.v.RLENGTH=m?m[0].length:-1;return E.v.RSTART;};
    }
    throw new Err("awk: function "+nm+"() is not available in this lab");}
  // ---- statements
  var NEXT={},BRK={},CONT={};
  function block(){eat("{");var s=[];skip();while(!isOp("}")){if(T[p].t==="eof")throw new Err("awk: missing }");s.push(stmt());skip();}p++;return function(E){for(var i=0;i<s.length;i++)s[i](E);};}
  function exprList(){var a=[];var paren=false;
    if(isOp("(")){var d=0,q=p;for(;T[q].t!=="eof";q++){if(T[q].t==="op"&&T[q].v==="(")d++;if(T[q].t==="op"&&T[q].v===")"){d--;if(d===0)break;}}
      var nx=T[q+1];paren=nx&&(nx.t==="nl"||nx.t==="eof"||(nx.t==="op"&&(nx.v===";"||nx.v==="}")));}
    if(paren){p++;a.push(expr());while(isOp(",")){p++;skipNl();a.push(expr());}eat(")");return a;}
    noGt++;try{if(!(T[p].t==="nl"||T[p].t==="eof"||isOp(";")||isOp("}"))){a.push(expr());while(isOp(",")){p++;skipNl();a.push(expr());}}}finally{noGt--;}
    if(isOp(">")||isOp(">>")||isOp("|"))throw new Err("awk: output redirection inside print is not available in this lab. Redirect the whole command instead.");
    return a;}
  function stmt(){
    if(isOp("{"))return block();
    if(isKw("if")){p++;eat("(");var c=expr();eat(")");skipNl();var a=stmt();var sv=p;skip();var b=null;if(isKw("else")){p++;skipNl();b=stmt();}else p=sv;return function(E){if(truthy(c(E)))a(E);else if(b)b(E);};}
    if(isKw("while")){p++;eat("(");var wc=expr();eat(")");skipNl();var wb=stmt();return function(E){while(truthy(wc(E))){E.tick();try{wb(E);}catch(x){if(x===BRK)break;if(x!==CONT)throw x;}}};}
    if(isKw("for")){p++;eat("(");
      if(T[p].t==="name"&&T[p+1].t==="kw"&&T[p+1].v==="in"&&T[p+2].t==="name"&&T[p+3].t==="op"&&T[p+3].v===")"){var kv=T[p].v,ar=T[p+2].v;p+=4;skipNl();var fb=stmt();
        return function(E){var m=E.a[ar];if(!m)return;var keys=Array.from(m.keys());for(var i=0;i<keys.length;i++){E.tick();E.v[kv]=keys[i];try{fb(E);}catch(x){if(x===BRK)break;if(x!==CONT)throw x;}}};}
      var init=isOp(";")?null:expr();eat(";");var cond=isOp(";")?null:expr();eat(";");var inc=isOp(")")?null:expr();eat(")");skipNl();var body=stmt();
      return function(E){if(init)init(E);while(!cond||truthy(cond(E))){E.tick();try{body(E);}catch(x){if(x===BRK)break;if(x!==CONT)throw x;}if(inc)inc(E);}};}
    if(isKw("print")){p++;var pa=exprList();return function(E){E.out.push(pa.length?pa.map(function(q){return str(q(E));}).join(str(E.v.OFS)):E.r);E.out.push(str(E.v.ORS));};}
    if(isKw("printf")){p++;var fa=exprList();if(!fa.length)throw new Err("awk: printf needs a format");return function(E){E.out.push(fmt(str(fa[0](E)),fa.slice(1).map(function(q){return q(E);}),str).s);};}
    if(isKw("next")){p++;return function(){throw NEXT;};}
    if(isKw("exit")){p++;var ec=(T[p].t==="nl"||T[p].t==="eof"||isOp(";")||isOp("}"))?null:expr();return function(E){throw {exit:ec?Math.trunc(num(ec(E))):0};};}
    if(isKw("break")){p++;return function(){throw BRK;};}
    if(isKw("continue")){p++;return function(){throw CONT;};}
    if(isKw("delete")){p++;var dn=T[p];if(dn.t!=="name")throw new Err("awk: delete needs an array");p++;var di=null;if(isOp("[")){p++;di=expr();eat("]");}return function(E){var m=E.a[dn.v];if(m){if(di)m.delete(str(di(E)));else m.clear();}};}
    var e=expr();return function(E){e(E);};}
  var items=[];skip();
  while(T[p].t!=="eof"){var kind="main",pat=null,act=null;
    if(isKw("BEGIN")){kind="begin";p++;}else if(isKw("END")){kind="end";p++;}
    else if(!isOp("{")){pat=expr();if(isOp(","))throw new Err("awk: range patterns (a,b) are not available in this lab");}
    if(isOp("{"))act=block();else if(kind!=="main")throw new Err("awk: "+kind.toUpperCase()+" needs a { block }");
    items.push({k:kind,p:pat,a:act});skip();}
  return {items:items,NEXT:NEXT,str:str,truthy:truthy};
}
function awk(args,inp,ctx){
  var FS=" ",pre=[],i=0,prog=null,files=[];
  for(;i<args.length;i++){var a=args[i];
    if(prog===null&&a==="-F"){FS=args[++i];continue;}
    if(prog===null&&/^-F./.test(a)){FS=a.slice(2);continue;}
    if(prog===null&&a==="-v"){pre.push(args[++i]);continue;}
    if(prog===null){prog=a;continue;}
    if(/^[A-Za-z_]\w*=/.test(a))pre.push(a);else files.push(a);}
  if(prog===null)throw new Err("awk: no program given");
  if(FS==="\\t")FS="\t";
  var P=awkProgram(prog);
  var E={v:{FS:FS,OFS:" ",ORS:"\n",NR:0,SUBSEP:"\x1c"},a:{},F:[],r:"",out:[],
    tick:function(){if(++ctx.steps>MAX)throw new Err("too many steps: is there a loop that never ends?");},
    splitBy:function(s,sep){if(sep&&sep.test)return s.split(sep);sep=sep==null?" ":String(sep);if(sep===" "){var t=s.replace(/^[ \t\n]+|[ \t\n]+$/g,"");return t===""?[]:t.split(/[ \t\n]+/);}
      if(sep.length===1)return s.split(sep);return s.split(rx(sep,true));},
    setRec:function(s){E.r=s;E.F=s===""?[]:E.splitBy(s,E.v.FS);}};
  pre.forEach(function(x){var k=x.indexOf("=");E.v[x.slice(0,k)]=unesc(x.slice(k+1));});
  var code=0,exited=false;
  function run(kind){for(var j=0;j<P.items.length;j++){var it=P.items[j];if(it.k!==kind)continue;if(it.p&&!P.truthy(it.p(E)))continue;if(it.a)it.a(E);else{E.out.push(E.r);E.out.push(P.str(E.v.ORS));}}}
  try{run("begin");
    var needInput=P.items.some(function(it){return it.k!=="begin";});
    if(needInput){var data=files.length?files.map(function(f){return readFile(f,ctx,"awk");}).join(""):rest(inp);var recs=lines(data);
      for(var r=0;r<recs.length;r++){E.tick();E.v.NR++;E.setRec(recs[r]);try{run("main");}catch(x){if(x!==P.NEXT)throw x;}}}
  }catch(x){if(x&&x.exit!==undefined){code=x.exit;exited=true;}else throw x;}
  try{run("end");}catch(x){if(x&&x.exit!==undefined)code=x.exit;else throw x;}
  return {o:E.out.join(""),c:code};
}

/* =====================================================================
   text utilities
   ===================================================================== */
function readFile(f,ctx,who){if(f==="/dev/null")return "";if(!Object.prototype.hasOwnProperty.call(ctx.fs,f))throw new Err(who+": "+f+": No such file or directory",1);return ctx.fs[f];}
function input(files,inp,ctx,who){if(!files.length)return rest(inp);return files.map(function(f){return f==="-"?rest(inp):readFile(f,ctx,who);}).join("");}
function flags(args,valued){var o={},rest_=[],i=0;for(;i<args.length;i++){var a=args[i];if(a==="--"){rest_=rest_.concat(args.slice(i+1));break;}
    if(a.length>1&&a[0]==="-"&&!/^-\d/.test(a)){for(var j=1;j<a.length;j++){var c=a[j];if(valued&&valued.indexOf(c)>=0){var v=a.slice(j+1);if(v==="")v=args[++i];if(v===undefined)throw new Err("option -"+c+" needs a value");(o[c]=o[c]||[]).push(v);break;}o[c]=true;}}
    else rest_.push(a);}
  return {o:o,r:rest_};}
function ranges(spec){return spec.split(",").map(function(p){var m=/^(\d*)(-?)(\d*)$/.exec(p);if(!m||p==="")throw new Err("cut: invalid field list: "+spec);var a=m[1]===""?1:+m[1],b=m[2]?(m[3]===""?Infinity:+m[3]):a;return [a,b];});}
function trset(s){s=unesc(s);var o="",i=0;while(i<s.length){if(s[i]==="["&&s[i+1]===":"){var e=s.indexOf(":]",i);if(e>0){var nm=s.slice(i+2,e);var map={upper:"ABCDEFGHIJKLMNOPQRSTUVWXYZ",lower:"abcdefghijklmnopqrstuvwxyz",digit:"0123456789",space:" \t\n\r\f\v",alpha:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",alnum:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",punct:"!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",blank:" \t"};o+=map[nm]||"";i=e+2;continue;}}
    if(s[i+1]==="-"&&s[i+2]!==undefined){var a=s.charCodeAt(i),b=s.charCodeAt(i+2);for(var c=a;c<=b;c++)o+=String.fromCharCode(c);i+=3;continue;}o+=s[i];i++;}return o;}
function sedRep(r){var o="";for(var i=0;i<r.length;i++){var c=r[i];if(c==="\\"){var d=r[++i];if(d===undefined){o+="\\";}else if(/[0-9]/.test(d))o+="$"+d;else if(d==="n")o+="\n";else if(d==="t")o+="\t";else o+=d==="$"?"$$":d;}else if(c==="&")o+="$&";else if(c==="$")o+="$$";else o+=c;}return o;}
function sedParse(script,ere){var cmds=[],i=0,n=script.length;
  function addr(){if(/[0-9]/.test(script[i])){var m=/^\d+/.exec(script.slice(i))[0];i+=m.length;return {n:+m};}if(script[i]==="$"){i++;return {last:true};}
    if(script[i]==="/"){var s="";i++;while(i<n&&script[i]!=="/"){if(script[i]==="\\"&&script[i+1]==="/"){s+="/";i+=2;continue;}if(script[i]==="\\"){s+=script[i]+script[i+1];i+=2;continue;}s+=script[i];i++;}i++;var fl="";if(script[i]==="I"){fl="i";i++;}return {re:rx(s,ere,fl)};}return null;}
  while(i<n){while(i<n&&/[\s;]/.test(script[i]))i++;if(i>=n)break;var c={};c.a1=addr();if(c.a1&&script[i]===","){i++;c.a2=addr();if(!c.a2)throw new Err("sed: bad address");}
    while(script[i]===" ")i++;if(script[i]==="!"){c.neg=true;i++;while(script[i]===" ")i++;}
    var ch=script[i++];
    if(ch==="s"||ch==="y"){var d=script[i++],parts=["",""],k=0;while(i<n&&k<2){if(script[i]==="\\"&&script[i+1]===d){parts[k]+=d;i+=2;continue;}if(script[i]==="\\"){parts[k]+=script[i]+(script[i+1]||"");i+=2;continue;}if(script[i]===d){k++;i++;continue;}parts[k]+=script[i];i++;}
      if(k<2)throw new Err("sed: unterminated `"+ch+"' command");
      if(ch==="y"){c.c="y";c.from=unesc(parts[0]);c.to=unesc(parts[1]);if(c.from.length!==c.to.length)throw new Err("sed: y strings are different lengths");}
      else{var f="";while(i<n&&/[gpiI0-9]/.test(script[i]))f+=script[i++];c.c="s";c.g=f.indexOf("g")>=0;c.p=f.indexOf("p")>=0;c.nth=+(/\d+/.exec(f)||[0])[0];c.re=rx(parts[0],ere,(/[iI]/.test(f)?"i":"")+"g");c.rep=sedRep(parts[1]);}}
    else if("dpq=".indexOf(ch)>=0){c.c=ch;}
    else if(ch==="{"||ch==="}")throw new Err("sed: { } blocks are not available in this lab");
    else throw new Err("sed: unknown command: `"+(ch||"")+"'");
    cmds.push(c);}
  return cmds;}
function sed(args,inp,ctx){var f=flags(args,"e"),o=f.o,ere=!!(o.E||o.r),r=f.r.slice(),scripts=o.e||[];if(!scripts.length){if(!r.length)throw new Err("sed: no script given");scripts=[r.shift()];}
  var cmds=sedParse(scripts.join("\n"),ere),L=lines(input(r,inp,ctx,"sed")),res=[];
  function hit(a,ln,i){return a.n!==undefined?a.n===i+1:a.last?i===L.length-1:a.re.test(ln);}
  for(var i=0;i<L.length;i++){var ln=L[i],del=false,quit=false;
    for(var k=0;k<cmds.length&&!del;k++){var c=cmds[k],on;
      if(!c.a1)on=true;else if(!c.a2)on=hit(c.a1,ln,i);
      else{if(c.act){on=true;if(c.a2.n!==undefined?i+1>=c.a2.n:hit(c.a2,ln,i))c.act=false;}else if(hit(c.a1,ln,i)){on=true;c.act=!(c.a2.n!==undefined&&c.a2.n<=i+1);}else on=false;}
      if(c.neg)on=!on;if(!on)continue;
      if(c.c==="s"){var cnt=0,did=false;c.re.lastIndex=0;var nl=ln.replace(c.re,function(m){cnt++;if(c.g?(cnt>=(c.nth||1)):(cnt===(c.nth||1))){did=true;var a2=arguments,gs=[];for(var q=1;q<a2.length-2;q++)gs.push(a2[q]);return c.rep.replace(/\$(\$|&|\d)/g,function(_,x){return x==="$"?"$":x==="&"?m:(gs[+x-1]===undefined?"":gs[+x-1]);});}return m;});
        if(did){ln=nl;if(c.p)res.push(ln);}}
      else if(c.c==="y"){ln=ln.split("").map(function(ch2){var ix=c.from.indexOf(ch2);return ix<0?ch2:c.to[ix];}).join("");}
      else if(c.c==="d")del=true;else if(c.c==="p")res.push(ln);else if(c.c==="=")res.push(String(i+1));else if(c.c==="q")quit=true;}
    if(!del&&!o.n)res.push(ln);if(quit)break;}
  return out(res);}
function grep(args,inp,ctx){var f=flags(args,"em"),o=f.o,r=f.r.slice(),pats=o.e||[];if(!pats.length){if(!r.length)throw new Err("grep: no pattern given");pats=[r.shift()];}
  var src=pats.map(function(p){return o.F?p.replace(/[.*+?^${}()|[\]\\\/]/g,"\\$&"):rx(p,!!o.E).source;}).join("|");if(o.w)src="\\b(?:"+src+")\\b";if(o.x)src="^(?:"+src+")$";
  var re=new RegExp(src,o.i?"i":""),reg=new RegExp(src,o.i?"gi":"g"),many=r.length>1,res=[],total=0,max=o.m?+o.m[0]:Infinity;
  (r.length?r:["-"]).forEach(function(file){var L=lines(file==="-"?rest(inp):readFile(file,ctx,"grep")),n=0,pre=many?file+":":"";
    for(var i=0;i<L.length&&n<max;i++){var ok=re.test(L[i]);if(ok!==!!o.v){n++;if(o.c||o.q)continue;if(o.o&&!o.v){(L[i].match(reg)||[]).forEach(function(m){if(m!=="")res.push(pre+(o.n?(i+1)+":":"")+m);});}else res.push(pre+(o.n?(i+1)+":":"")+L[i]);}}
    total+=n;if(o.c)res.push(pre+n);});
  return {o:o.q?"":out(res),c:total?0:1};}
function sort(args,inp,ctx){var f=flags(args,"kt"),o=f.o,L=lines(input(f.r,inp,ctx,"sort")),sep=o.t?o.t[0]:null,keys=(o.k||[]).map(function(k){var m=/^(\d+)(?:\.\d+)?([a-zA-Z]*)(?:,(\d+)(?:\.\d+)?([a-zA-Z]*))?$/.exec(k);if(!m)throw new Err("sort: invalid key: "+k);var fl=(m[2]||"")+(m[4]||"");return {a:+m[1],b:m[3]?+m[3]:Infinity,n:fl.indexOf("n")>=0||(!!o.n&&fl===""),r:fl.indexOf("r")>=0||(!!o.r&&fl==="")};});
  function fields(l){if(sep)return l.split(sep);var m=l.match(/[ \t]*[^ \t]+/g)||[];return m;}
  function key(l,k){var F=fields(l),part=F.slice(k.a-1,k.b===Infinity?undefined:k.b).join(sep||"");return sep?part:part.replace(/^[ \t]+/,"");}
  function c2(a,b,n){if(n){var x=num(a),y=num(b);return x<y?-1:x>y?1:0;}if(o.f){a=a.toUpperCase();b=b.toUpperCase();}return a<b?-1:a>b?1:0;}
  if(!keys.length)keys=[{whole:true,n:!!o.n,r:!!o.r}];
  function cmpKeys(a,b){for(var i=0;i<keys.length;i++){var k=keys[i],c=k.whole?c2(a,b,k.n):c2(key(a,k),key(b,k),k.n);if(c)return k.r?-c:c;}return 0;}
  var idx=L.map(function(l,i){return i;});
  idx.sort(function(i,j){var c=cmpKeys(L[i],L[j]);if(c)return c;if(o.u||o.s)return i-j;c=L[i]<L[j]?-1:L[i]>L[j]?1:0;return o.r?-c:(c||i-j);});
  var res=idx.map(function(i){return L[i];});if(o.u)res=res.filter(function(l,i){return i===0||cmpKeys(res[i-1],l)!==0;});
  return out(res);}
var U={
  cat:function(a,inp,ctx){var f=flags(a),s=input(f.r,inp,ctx,"cat");if(f.o.n)return out(lines(s).map(function(l,i){return fmt("%6d\t",[i+1]).s+l;}));return s;},
  tac:function(a,inp,ctx){return out(lines(input(a,inp,ctx,"tac")).reverse());},
  rev:function(a,inp,ctx){return out(lines(input(a,inp,ctx,"rev")).map(function(l){return l.split("").reverse().join("");}));},
  nl:function(a,inp,ctx){var n=0;return out(lines(input(flags(a,"bw").r,inp,ctx,"nl")).map(function(l){return l===""?"":fmt("%6d\t",[++n]).s+l;}));},
  head:function(a,inp,ctx){var n=10,files=[];for(var i=0;i<a.length;i++){if(a[i]==="-n")n=a[++i];else if(/^-n./.test(a[i]))n=a[i].slice(2);else if(/^-\d+$/.test(a[i]))n=a[i].slice(1);else files.push(a[i]);}
    var L=lines(input(files,inp,ctx,"head"));n=String(n);return out(n[0]==="-"?L.slice(0,Math.max(0,L.length-(+n.slice(1)))):L.slice(0,+n));},
  tail:function(a,inp,ctx){var n="10",files=[];for(var i=0;i<a.length;i++){if(a[i]==="-n")n=a[++i];else if(/^-n./.test(a[i]))n=a[i].slice(2);else if(/^-\d+$/.test(a[i]))n=a[i].slice(1);else if(/^\+\d+$/.test(a[i]))n=a[i];else files.push(a[i]);}
    var L=lines(input(files,inp,ctx,"tail"));n=String(n);return out(n[0]==="+"?L.slice(+n.slice(1)-1):(+n===0?[]:L.slice(-(+n))));},
  wc:function(a,inp,ctx){var f=flags(a),o=f.o,any=o.l||o.w||o.c||o.m;function cnt(s){var r=[];if(!any||o.l)r.push((s.match(/\n/g)||[]).length);if(!any||o.w)r.push((s.match(/\S+/g)||[]).length);if(!any||o.c||o.m)r.push(s.length);return r;}
    if(!f.r.length){var c=cnt(rest(inp));return (c.length===1?String(c[0]):c.map(function(x){return fmt("%7d",[x]).s;}).join(" "))+"\n";}
    var tot=null,res=f.r.map(function(file){var c2=cnt(readFile(file,ctx,"wc"));tot=tot?tot.map(function(x,i){return x+c2[i];}):c2;return (c2.length===1&&f.r.length===1?String(c2[0]):c2.map(function(x){return fmt("%7d",[x]).s;}).join(" "))+" "+file;});
    if(f.r.length>1)res.push(tot.map(function(x){return fmt("%7d",[x]).s;}).join(" ")+" total");return out(res);},
  cut:function(a,inp,ctx){var f=flags(a,"dfc"),o=f.o,d=o.d?unesc(o.d[0]):"\t",L=lines(input(f.r,inp,ctx,"cut"));if(!o.f&&!o.c)throw new Err("cut: you must specify -f or -c");var R=ranges((o.f||o.c)[0]);
    function pick(arr){var res=[];for(var i=0;i<arr.length;i++){for(var k=0;k<R.length;k++)if(i+1>=R[k][0]&&i+1<=R[k][1]){res.push(arr[i]);break;}}return res;}
    return out(L.map(function(l){if(o.c)return pick(l.split("")).join("");if(l.indexOf(d)<0)return o.s?null:l;return pick(l.split(d)).join(d);}).filter(function(x){return x!==null;}));},
  tr:function(a,inp,ctx){var f=flags(a),o=f.o,s=rest(inp),s1=trset(f.r[0]||""),s2=f.r[1]!==undefined?trset(f.r[1]):"";if(!f.r.length)throw new Err("tr: missing operand");
    if(o.c||o.C){var all="";for(var i=0;i<256;i++){var ch=String.fromCharCode(i);if(s1.indexOf(ch)<0)all+=ch;}s1=all;}
    var res="";if(o.d){for(var j=0;j<s.length;j++)if(s1.indexOf(s[j])<0)res+=s[j];s=res;if(o.s&&s2){var q="";for(j=0;j<s.length;j++)if(!(s2.indexOf(s[j])>=0&&q[q.length-1]===s[j]))q+=s[j];s=q;}return s;}
    if(s2){while(s2.length<s1.length)s2+=s2[s2.length-1];for(var k=0;k<s.length;k++){var ix=s1.indexOf(s[k]);res+=ix<0?s[k]:s2[ix];}s=res;}
    if(o.s){var sq=s2||s1,q2="";for(var m=0;m<s.length;m++)if(!(sq.indexOf(s[m])>=0&&q2[q2.length-1]===s[m]))q2+=s[m];s=q2;}return s;},
  uniq:function(a,inp,ctx){var f=flags(a),o=f.o,L=lines(input(f.r,inp,ctx,"uniq")),res=[],i=0;while(i<L.length){var j=i;while(j+1<L.length&&(o.i?L[j+1].toLowerCase()===L[i].toLowerCase():L[j+1]===L[i]))j++;var n=j-i+1;if(!(o.d&&n<2)&&!(o.u&&n>1))res.push(o.c?fmt("%7d ",[n]).s+L[i]:L[i]);i=j+1;}return out(res);},
  sort:sort,grep:grep,sed:sed,awk:awk,
  egrep:function(a,inp,ctx){return grep(["-E"].concat(a),inp,ctx);},
  seq:function(a){var f=flags(a,"s"),v=f.r.map(Number),lo=1,st=1,hi;if(v.length===1)hi=v[0];else if(v.length===2){lo=v[0];hi=v[1];}else{lo=v[0];st=v[1];hi=v[2];}if(!st||v.some(isNaN)||!v.length)throw new Err("seq: invalid arguments");var r=[];for(var x=lo;st>0?x<=hi:x>=hi;x+=st){r.push(String(x));if(r.length>100000)throw new Err("seq: too many values");}return f.o.s?(r.join(unesc(f.o.s[0]))+(r.length?"\n":"")):out(r);},
  paste:function(a,inp,ctx){var f=flags(a,"d"),d=f.o.d?unesc(f.o.d[0]):"\t";var srcs=(f.r.length?f.r:["-"]).map(function(x){return lines(x==="-"?rest(inp):readFile(x,ctx,"paste"));});
    if(f.o.s)return out(srcs.map(function(L){var s="";L.forEach(function(l,i){s+=(i?d[(i-1)%d.length]:"")+l;});return s;}));
    var n=Math.max.apply(null,srcs.map(function(L){return L.length;})),res=[];for(var i=0;i<n;i++)res.push(srcs.map(function(L){return L[i]===undefined?"":L[i];}).join(d[0]));return out(res);},
  basename:function(a){return (a[0]||"").replace(/\/+$/,"").replace(/^.*\//,"").replace(a[1]?new RegExp(a[1].replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"$"):/$^/,"")+"\n";},
  dirname:function(a){var s=(a[0]||"").replace(/\/+$/,"");return (s.indexOf("/")<0?".":s.replace(/\/[^\/]*$/,"")||"/")+"\n";},
  "true":function(){return "";},":":function(){return "";},"false":function(){return {o:"",c:1};},sleep:function(){return "";}
};

/* =====================================================================
   the shell: tokens, parser, expansion, execution
   ===================================================================== */
var RES={"if":1,then:1,elif:1,"else":1,fi:1,"for":1,"in":1,"do":1,done:1,"while":1,until:1,"{":1,"}":1,"!":1};
function closeParen(s,i){var d=0;for(;i<s.length;i++){var c=s[i];if(c==="\\"){i++;continue;}if(c==="'"){i=s.indexOf("'",i+1);if(i<0)return -1;continue;}if(c==="("){d++;}else if(c===")"){d--;if(d===0)return i;}}return -1;}
function tokenize(src){var t=[],i=0,n=src.length;
  function cmdPos(){var l=t[t.length-1];return !l||l.t==="op"||(l.t==="w"&&RES[l.v]===1&&l.v!=="in"&&l.v!=="}");}
  while(i<n){var c=src[i];
    if(c===" "||c==="\t"||c==="\r"){i++;continue;}
    if(c==="\\"&&src[i+1]==="\n"){i+=2;continue;}
    if(c==="\n"){t.push({t:"op",v:";"});i++;continue;}
    if(c==="#"&&(i===0||/[\s;|&(]/.test(src[i-1]))){while(i<n&&src[i]!=="\n")i++;continue;}
    var two=src.substr(i,2);
    if(two==="&&"||two==="||"||two===";;"){t.push({t:"op",v:two});i+=2;continue;}
    if(two==="(("&&cmdPos()){var e=src.indexOf("))",i);if(e<0)throw new Err("syntax error: missing ))");t.push({t:"w",v:"((",arith:src.slice(i+2,e)});i=e+2;continue;}
    if(two==="[["&&cmdPos()&&/\s/.test(src[i+2]||"")){var e2=src.indexOf("]]",i);if(e2<0)throw new Err("syntax error: missing ]]");t.push({t:"w",v:"[[",cond:src.slice(i+2,e2)});i=e2+2;continue;}
    var rm=/^(\d*)(>>|>&\d|>|<)|^(&>)/.exec(src.slice(i));
    if(rm&&!(rm[1]&&t.length&&false)){if(rm[3]){t.push({t:"redir",v:">",fd:1});i+=2;continue;}
      if(src[i]==="<"&&src[i+1]==="<")throw new Err("here-documents (<<) are not available in this lab");
      if(rm[1]===""||/[\s;|&]/.test(src[i-1]||" ")){t.push({t:"redir",v:rm[2],fd:rm[1]===""?(rm[2]==="<"?0:1):+rm[1]});i+=rm[0].length;continue;}}
    if(c==="|"||c===";"||c==="("||c===")"){if(c==="&")throw new Err("background jobs (&) are not available in this lab");t.push({t:"op",v:c});i++;continue;}
    if(c==="&")throw new Err("background jobs (&) are not available in this lab");
    var s=i;
    while(i<n){c=src[i];
      if(c==="\\"){i+=2;continue;}
      if(c==="'"){var q=src.indexOf("'",i+1);if(q<0)throw new Err("syntax error: unmatched '");i=q+1;continue;}
      if(c==='"'){i++;while(i<n&&src[i]!=='"'){if(src[i]==="\\")i++;else if(src[i]==="$"&&src[i+1]==="("){var cp=closeParen(src,i+1);if(cp<0)throw new Err("syntax error: unmatched $(");i=cp;}i++;}if(i>=n)throw new Err("syntax error: unmatched \"");i++;continue;}
      if(c==="`"){var b=src.indexOf("`",i+1);if(b<0)throw new Err("syntax error: unmatched `");i=b+1;continue;}
      if(c==="$"&&src[i+1]==="("){var cp2=closeParen(src,i+1);if(cp2<0)throw new Err("syntax error: unmatched $(");i=cp2+1;continue;}
      if(c==="$"&&src[i+1]==="{"){var cb=src.indexOf("}",i);if(cb<0)throw new Err("syntax error: unmatched ${");i=cb+1;continue;}
      if(/[\s;|&()<>]/.test(c))break;i++;}
    t.push({t:"w",v:src.slice(s,i)});}
  return t;}
function parse(src){var T=tokenize(src),p=0;
  function isW(v){return p<T.length&&T[p].t==="w"&&T[p].v===v;}
  function isOp(v){return p<T.length&&T[p].t==="op"&&T[p].v===v;}
  function need(v){if(!isW(v))throw new Err("syntax error: expected `"+v+"'"+(p<T.length?" near `"+T[p].v+"'":" before the end"));p++;}
  function list(stop){var items=[];for(;;){while(isOp(";"))p++;if(p>=T.length)break;if(T[p].t==="w"&&stop.indexOf(T[p].v)>=0)break;if(isOp(")"))break;items.push(andor());}return items;}
  function andor(){var parts=[pipeline()];while(isOp("&&")||isOp("||")){var o=T[p].v;p++;while(isOp(";"))p++;parts.push(o);parts.push(pipeline());}return parts.length===1?parts[0]:{k:"andor",parts:parts};}
  function pipeline(){var neg=false;if(isW("!")){neg=true;p++;}var cmds=[command()];while(isOp("|")){p++;while(isOp(";"))p++;cmds.push(command());}return (cmds.length===1&&!neg)?cmds[0]:{k:"pipe",cmds:cmds,neg:neg};}
  function redirs(node){node.redirs=node.redirs||[];while(p<T.length&&T[p].t==="redir"){var r=T[p++];if(/^>&/.test(r.v)){node.redirs.push({v:r.v,fd:r.fd});continue;}if(p>=T.length||T[p].t!=="w")throw new Err("syntax error: redirection needs a file name");node.redirs.push({v:r.v,fd:r.fd,w:T[p++].v});}return node;}
  function command(){
    if(p>=T.length)throw new Err("syntax error: unexpected end of script");
    var t=T[p];
    if(t.t==="op"&&t.v==="("){p++;var body=list([]);if(!isOp(")"))throw new Err("syntax error: expected )");p++;return redirs({k:"group",body:body});}
    if(t.t!=="w"&&t.t!=="redir")throw new Err("syntax error near `"+t.v+"'");
    if(t.t==="w"){
      if(t.v==="{"){p++;var b=list(["}"]);need("}");return redirs({k:"group",body:b});}
      if(t.v==="if"){p++;var cl=[];var c=list(["then"]);need("then");var th=list(["elif","else","fi"]);cl.push({c:c,b:th});var el=null;
        while(isW("elif")){p++;var c2=list(["then"]);need("then");cl.push({c:c2,b:list(["elif","else","fi"])});}
        if(isW("else")){p++;el=list(["fi"]);}need("fi");return redirs({k:"if",cl:cl,el:el});}
      if(t.v==="for"){p++;var v=T[p++];if(!v||v.t!=="w"||!/^[A-Za-z_]\w*$/.test(v.v))throw new Err("syntax error: for needs a variable name");var words=null;
        if(isW("in")){p++;words=[];while(p<T.length&&T[p].t==="w"&&!(isOp(";")))words.push(T[p++].v);}
        while(isOp(";"))p++;need("do");var fb=list(["done"]);need("done");return redirs({k:"for",v:v.v,words:words,body:fb});}
      if(t.v==="while"||t.v==="until"){p++;var wc=list(["do"]);need("do");var wb=list(["done"]);need("done");return redirs({k:"while",until:t.v==="until",c:wc,body:wb});}
      if(RES[t.v]===1&&t.v!=="!"&&!t.arith&&!t.cond)throw new Err("syntax error near unexpected `"+t.v+"'");
    }
    var node={k:"simple",assign:[],words:[],redirs:[]};
    for(;p<T.length;){var x=T[p];
      if(x.t==="redir"){redirs(node);continue;}
      if(x.t!=="w")break;
      if(x.arith!==undefined||x.cond!==undefined){if(node.words.length)break;node.special=x;p++;break;}
      if(!node.words.length&&/^[A-Za-z_]\w*=/.test(x.v)){node.assign.push(x.v);p++;continue;}
      node.words.push(x.v);p++;}
    redirs(node);return node;}
  var prog=list([]);if(p<T.length)throw new Err("syntax error near unexpected `"+T[p].v+"'");return prog;}

/* ---- arithmetic: $(( )) and (( )) ---- */
function arith(src,ctx){var t=[],m,re=/\s*(\d+|[A-Za-z_]\w*|\*\*|<<|>>|<=|>=|==|!=|&&|\|\||\+\+|--|[-+*\/%]=|[-+*\/%()<>!=?:,])/y,pos=0;
  src=src.replace(/\$\{?([A-Za-z_]\w*|\d)\}?/g,function(_,nm){return " "+varGet(ctx,nm)+" ";});
  while(pos<src.length){re.lastIndex=pos;m=re.exec(src);if(!m){if(/^\s*$/.test(src.slice(pos)))break;throw new Err("arithmetic: syntax error near `"+src.slice(pos).trim()+"'");}t.push(m[1]);pos=re.lastIndex;}
  var p=0;function val(nm){var v=ctx.vars[nm];return v===undefined||v===""?0:(parseInt(v,10)||0);}
  function expr(){var l=tern();while(t[p]===","){p++;l=tern();}return l;}
  function tern(){if(/^[A-Za-z_]\w*$/.test(t[p])&&/^([-+*\/%]?=)$/.test(t[p+1]||"")){var nm=t[p],op=t[p+1];p+=2;var r=tern(),cur=val(nm),v=op==="="?r:op==="+="?cur+r:op==="-="?cur-r:op==="*="?cur*r:op==="/="?div(cur,r):cur%r;ctx.vars[nm]=String(v);return v;}
    var c=or();if(t[p]==="?"){p++;var a=tern();if(t[p]!==":")throw new Err("arithmetic: expected :");p++;var b=tern();return c?a:b;}return c;}
  function div(a,b){if(b===0)throw new Err("arithmetic: division by 0");return Math.trunc(a/b);}
  function or(){var l=and();while(t[p]==="||"){p++;var r=and();l=(l||r)?1:0;}return l;}
  function and(){var l=cmp();while(t[p]==="&&"){p++;var r=cmp();l=(l&&r)?1:0;}return l;}
  function cmp(){var l=sum();while(/^(<|>|<=|>=|==|!=)$/.test(t[p]||"")){var o=t[p++],r=sum();l=(o==="<"?l<r:o===">"?l>r:o==="<="?l<=r:o===">="?l>=r:o==="=="?l===r:l!==r)?1:0;}return l;}
  function sum(){var l=term();while(t[p]==="+"||t[p]==="-"){var o=t[p++],r=term();l=o==="+"?l+r:l-r;}return l;}
  function term(){var l=un();while(t[p]==="*"||t[p]==="/"||t[p]==="%"){var o=t[p++],r=un();if(o!=="*"&&r===0)throw new Err("arithmetic: division by 0");l=o==="*"?l*r:o==="/"?Math.trunc(l/r):l%r;}return l;}
  function un(){if(t[p]==="-"){p++;return -un();}if(t[p]==="+"){p++;return un();}if(t[p]==="!"){p++;return un()?0:1;}
    if(t[p]==="++"||t[p]==="--"){var d=t[p++]==="++"?1:-1,nm=t[p++];var v=val(nm)+d;ctx.vars[nm]=String(v);return v;}return pw();}
  function pw(){var l=atom();if(t[p]==="**"){p++;return Math.pow(l,un());}return l;}
  function atom(){var x=t[p++];if(x===undefined)throw new Err("arithmetic: unexpected end");if(x==="("){var v=expr();if(t[p]!==")")throw new Err("arithmetic: expected )");p++;return v;}
    if(/^\d+$/.test(x))return parseInt(x,10);if(/^[A-Za-z_]\w*$/.test(x)){var cur=val(x);if(t[p]==="++"||t[p]==="--"){ctx.vars[x]=String(cur+(t[p]==="++"?1:-1));p++;}return cur;}throw new Err("arithmetic: syntax error near `"+x+"'");}
  if(!t.length)return 0;var res=expr();if(p<t.length)throw new Err("arithmetic: syntax error near `"+t[p]+"'");return res;}

/* ---- expansion ---- */
function varGet(ctx,nm){if(/^\d+$/.test(nm))return nm==="0"?"script":(ctx.args[+nm-1]===undefined?"":ctx.args[+nm-1]);if(nm==="#")return String(ctx.args.length);if(nm==="?")return String(ctx.last);if(nm==="@"||nm==="*")return ctx.args.join(" ");var v=ctx.vars[nm];return v===undefined?"":v;}
function dollar(s,i,ctx,quoted){ // s[i]==="$"; returns {v, end, list?}
  var c=s[i+1];
  if(c==="("&&s[i+2]==="("){var e=s.indexOf("))",i);if(e>0){return {v:String(arith(s.slice(i+3,e),ctx)),end:e+2};}}
  if(c==="("){var cp=closeParen(s,i+1);return {v:capture(s.slice(i+2,cp),ctx),end:cp+1};}
  if(c==="{"){var cb=s.indexOf("}",i),body=s.slice(i+2,cb),m;
    if((m=/^#([A-Za-z_]\w*|[@*])$/.exec(body)))return {v:String(m[1]==="@"||m[1]==="*"?ctx.args.length:varGet(ctx,m[1]).length),end:cb+1};
    if((m=/^([A-Za-z_]\w*|\d+|[@*#?])(?:(:?[-=+])([\s\S]*))?$/.exec(body))){var val=varGet(ctx,m[1]);if(m[2]){var unset=m[2][0]===":"?val==="":ctx.vars[m[1]]===undefined;var alt=expandNoSplit(m[3],ctx);if(/-$/.test(m[2])){if(unset)val=alt;}else if(/=$/.test(m[2])){if(unset){ctx.vars[m[1]]=alt;val=alt;}}else{val=unset?"":alt;}}
      return {v:val,end:cb+1,list:(m[1]==="@"&&quoted&&!m[2])?ctx.args.slice():null};}
    if((m=/^([A-Za-z_]\w*)(%%?|##?)([\s\S]*)$/.exec(body))){var v=varGet(ctx,m[1]),L=v.length,k,
        gre=new RegExp("^"+expandNoSplit(m[3],ctx).replace(/[.+^${}()|[\]\\]/g,"\\$&").replace(/\*/g,"[\\s\\S]*").replace(/\?/g,"[\\s\\S]")+"$");
      if(m[2]==="#"){for(k=0;k<=L;k++)if(gre.test(v.slice(0,k)))return {v:v.slice(k),end:cb+1};}
      else if(m[2]==="##"){for(k=L;k>=0;k--)if(gre.test(v.slice(0,k)))return {v:v.slice(k),end:cb+1};}
      else if(m[2]==="%"){for(k=L;k>=0;k--)if(gre.test(v.slice(k)))return {v:v.slice(0,k),end:cb+1};}
      else{for(k=0;k<=L;k++)if(gre.test(v.slice(k)))return {v:v.slice(0,k),end:cb+1};}
      return {v:v,end:cb+1};}
    throw new Err("bad substitution: ${"+body+"}");}
  var m2=/^([A-Za-z_]\w*|\d|[@*#?])/.exec(s.slice(i+1));
  if(!m2)return {v:"$",end:i+1};
  return {v:varGet(ctx,m2[1]),end:i+1+m2[1].length,list:(m2[1]==="@"&&quoted)?ctx.args.slice():null};}
function capture(src,ctx){var o=runList(parse(src),{s:"",p:0},ctx);return o.replace(/\n+$/,"");}
function expandWord(raw,ctx,nosplit){
  var bm=/^([^'"$`\\]*)\{(-?\d+)\.\.(-?\d+)\}([^'"$`\\]*)$/.exec(raw);
  if(bm&&!nosplit){var a=+bm[2],b=+bm[3],res=[],st=a<=b?1:-1;for(var x=a;st>0?x<=b:x>=b;x+=st){res.push(bm[1]+x+bm[4]);if(res.length>100000)throw new Err("brace range too large");}return res;}
  var fields=[],cur=null,i=0,n=raw.length,glob=false;
  function lit(s){cur=(cur===null?"":cur)+s;}
  function unq(s){if(nosplit){lit(s);return;}var parts=s.split(/[ \t\n]+/);if(/^[ \t\n]/.test(s)&&cur!==null){fields.push(cur);cur=null;}
    for(var k=0;k<parts.length;k++){if(parts[k]!=="")lit(parts[k]);if(k<parts.length-1&&cur!==null){fields.push(cur);cur=null;}}}
  while(i<n){var c=raw[i];
    if(c==="'"){var e=raw.indexOf("'",i+1);lit(raw.slice(i+1,e));i=e+1;continue;}
    if(c==="\\"){lit(raw[i+1]===undefined?"\\":raw[i+1]);i+=2;continue;}
    if(c==='"'){i++;lit("");while(i<n&&raw[i]!=='"'){var d=raw[i];
        if(d==="\\"&&/["\\$`]/.test(raw[i+1]||"")){lit(raw[i+1]);i+=2;continue;}
        if(d==="$"){var r=dollar(raw,i,ctx,true);if(r.list){if(r.list.length){lit(r.list[0]);for(var q=1;q<r.list.length;q++){fields.push(cur);cur=r.list[q];}}}else lit(r.v);i=r.end;continue;}
        if(d==="`"){var be=raw.indexOf("`",i+1);lit(capture(raw.slice(i+1,be),ctx));i=be+1;continue;}
        lit(d);i++;}i++;continue;}
    if(c==="$"){var r2=dollar(raw,i,ctx,false);unq(r2.v);i=r2.end;continue;}
    if(c==="`"){var be2=raw.indexOf("`",i+1);unq(capture(raw.slice(i+1,be2),ctx));i=be2+1;continue;}
    if(c==="*"||c==="?")glob=true;
    lit(c);i++;}
  if(cur!==null)fields.push(cur);
  if(glob&&!nosplit&&fields.length===1&&!/['"\\]/.test(raw)){var re=new RegExp("^"+fields[0].replace(/[.+^${}()|[\]\\]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".")+"$"),hits=Object.keys(ctx.fs).filter(function(f){return re.test(f);}).sort();if(hits.length)return hits;}
  return fields;}
function expandNoSplit(raw,ctx){return expandWord(raw,ctx,true).join(" ");}

/* ---- test / [ / [[ ---- */
function testExpr(a,ctx,dbl){var p=0;
  function prim(){var x=a[p];if(x===undefined)throw new Err("test: missing argument");
    if(x==="!"){p++;return !prim();}
    if(x==="("){p++;var v=or();p++;return v;}
    if(/^-[znfedsrwx]$/.test(x)&&a[p+1]!==undefined&&!/^(=|==|!=|-eq|-ne|-lt|-le|-gt|-ge)$/.test(a[p+1])){var y=a[p+1];p+=2;
      return x==="-z"?y==="":x==="-n"?y!=="":x==="-d"?false:x==="-s"?(Object.prototype.hasOwnProperty.call(ctx.fs,y)&&ctx.fs[y]!==""):Object.prototype.hasOwnProperty.call(ctx.fs,y);}
    var op=a[p+1];
    if(op!==undefined&&/^(=|==|!=|=~|<|>|-eq|-ne|-lt|-le|-gt|-ge)$/.test(op)){var l=a[p],r=a[p+2];if(r===undefined)throw new Err("test: missing argument after "+op);p+=3;
      if(op==="="||op==="=="){if(dbl&&/[*?]/.test(r))return new RegExp("^"+r.replace(/[.+^${}()|[\]\\]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".")+"$").test(l);return l===r;}
      if(op==="!=")return l!==r;if(op==="=~")return rx(r,true).test(l);if(op==="<")return l<r;if(op===">")return l>r;
      if(!/^\s*-?\d+\s*$/.test(l)||!/^\s*-?\d+\s*$/.test(r))throw new Err("test: integer expression expected: "+(/^\s*-?\d+\s*$/.test(l)?r:l));
      var x1=parseInt(l,10),y1=parseInt(r,10);return op==="-eq"?x1===y1:op==="-ne"?x1!==y1:op==="-lt"?x1<y1:op==="-le"?x1<=y1:op==="-gt"?x1>y1:x1>=y1;}
    p++;return x!=="";}
  function and(){var l=prim();while(a[p]==="&&"||a[p]==="-a"){p++;var r=prim();l=l&&r;}return l;}
  function or(){var l=and();while(a[p]==="||"||a[p]==="-o"){p++;var r=and();l=l||r;}return l;}
  if(!a.length)return false;var res=or();if(p<a.length)throw new Err("test: too many arguments");return res;}

/* ---- execution ---- */
var BRK={brk:1},CONT={cont:1};
function tick(ctx){if(++ctx.steps>MAX)throw new Err("too many steps: is there a loop that never ends?");}
function carry(x,o){if(x&&typeof x==="object"&&(x.exit!==undefined||x.brk||x.cont))x.o=o+(x.o||"");return x;}
function runList(items,inp,ctx){var o="";for(var i=0;i<items.length;i++){try{o+=runNode(items[i],inp,ctx);}catch(x){throw carry(x,o);}}return o;}
function withRedirs(node,inp,ctx,fn){var rs=node.redirs||[],sink=null,app=false;
  for(var i=0;i<rs.length;i++){var r=rs[i];if(/^>&/.test(r.v))continue;var f=expandNoSplit(r.w,ctx);
    if(r.v==="<"){try{inp={s:readFile(f,ctx,"sh"),p:0};}catch(e){ctx.err+=e.m+"\n";ctx.last=1;return "";}}
    else if(r.fd===1){sink=f;app=r.v===">>";}}
  var o=fn(inp);
  if(sink!==null){if(sink!=="/dev/null")ctx.fs[sink]=(app&&ctx.fs[sink]!==undefined?ctx.fs[sink]:"")+o;return "";}
  return o;}
function runNode(node,inp,ctx){tick(ctx);
  switch(node.k){
    case "andor":var o=runNode(node.parts[0],inp,ctx);for(var i=1;i<node.parts.length;i+=2){if((node.parts[i]==="&&")===(ctx.last===0))o+=runNode(node.parts[i+1],inp,ctx);}return o;
    case "pipe":var cur=inp,res="";for(var j=0;j<node.cmds.length;j++){res=runNode(node.cmds[j],cur,ctx);cur={s:res,p:0};}if(node.neg)ctx.last=ctx.last===0?1:0;return res;
    case "group":return withRedirs(node,inp,ctx,function(io){return runList(node.body,io,ctx);});
    case "if":return withRedirs(node,inp,ctx,function(io){var o2="";for(var k=0;k<node.cl.length;k++){o2+=runList(node.cl[k].c,io,ctx);if(ctx.last===0)return o2+runList(node.cl[k].b,io,ctx);}if(node.el)return o2+runList(node.el,io,ctx);ctx.last=0;return o2;});
    case "for":return withRedirs(node,inp,ctx,function(io){var vals=[],o3="";if(node.words===null)vals=ctx.args.slice();else node.words.forEach(function(w){vals=vals.concat(expandWord(w,ctx));});ctx.last=0;
        for(var k=0;k<vals.length;k++){tick(ctx);ctx.vars[node.v]=vals[k];try{o3+=runList(node.body,io,ctx);}catch(x){if(x&&x.brk){o3+=x.o||"";break;}if(x&&x.cont){o3+=x.o||"";continue;}throw carry(x,o3);}}return o3;});
    case "while":return withRedirs(node,inp,ctx,function(io){var o4="";for(;;){tick(ctx);o4+=runList(node.c,io,ctx);if((ctx.last===0)===node.until)break;try{o4+=runList(node.body,io,ctx);}catch(x){if(x&&x.brk){o4+=x.o||"";break;}if(x&&x.cont){o4+=x.o||"";continue;}throw carry(x,o4);}}ctx.last=0;return o4;});
    case "simple":return withRedirs(node,inp,ctx,function(io){return simple(node,io,ctx);});
  }
  return "";}
function simple(node,inp,ctx){
  if(node.special){var sp=node.special;if(sp.arith!==undefined){ctx.last=arith(sp.arith,ctx)!==0?0:1;return "";}
    var words=[];tokenize(sp.cond.replace(/&&/g," '&&' ").replace(/\|\|/g," '||' ").replace(/([<>])/g," '$1' ")).forEach(function(t){if(t.t==="w")words.push(expandNoSplit(t.v,ctx));});ctx.last=testExpr(words,ctx,true)?0:1;return "";}
  var saved={},k;
  if(!node.words.length){node.assign.forEach(function(a){var e=a.indexOf("=");ctx.vars[a.slice(0,e)]=expandNoSplit(a.slice(e+1),ctx);});ctx.last=0;return "";}
  node.assign.forEach(function(a){var e=a.indexOf("="),nm=a.slice(0,e);saved[nm]=ctx.vars[nm];ctx.vars[nm]=expandNoSplit(a.slice(e+1),ctx);});
  var argv=[];node.words.forEach(function(w){argv=argv.concat(expandWord(w,ctx));});
  try{return builtin(argv,inp,ctx);}
  finally{for(k in saved){if(saved[k]===undefined)delete ctx.vars[k];else ctx.vars[k]=saved[k];}}}
function builtin(argv,inp,ctx){var name=argv[0],a=argv.slice(1);
  if(name===undefined){ctx.last=0;return "";}
  try{
    switch(name){
      case "echo":var nl=true,esc=false;while(a.length&&/^-[neE]+$/.test(a[0])){if(a[0].indexOf("n")>=0)nl=false;if(a[0].indexOf("e")>=0)esc=true;a.shift();}var s=a.join(" ");if(esc)s=unesc(s);ctx.last=0;return s+(nl?"\n":"");
      case "printf":if(!a.length)throw new Err("printf: usage: printf format [arguments]");var f=unesc(a[0]),rest_=a.slice(1),o="";do{var r=fmt(f,rest_);o+=r.s;rest_=rest_.slice(r.n);if(!r.n)break;}while(rest_.length);ctx.last=0;return o;
      case "read":var raw=false;while(a.length&&a[0][0]==="-"){if(a[0]==="-r")raw=true;a.shift();}if(inp.p>=inp.s.length){a.forEach(function(v){ctx.vars[v]="";});ctx.last=1;return "";}
        var nlp=inp.s.indexOf("\n",inp.p),line=nlp<0?inp.s.slice(inp.p):inp.s.slice(inp.p,nlp);inp.p=nlp<0?inp.s.length:nlp+1;if(!raw)line=line.replace(/\\(.)/g,"$1");
        if(!a.length)a=["REPLY"];var ifs=ctx.vars.IFS;if(ifs===""){ctx.vars[a[0]]=line;for(var q=1;q<a.length;q++)ctx.vars[a[q]]="";}
        else{var sepRe=ifs===undefined?/[ \t]+/:new RegExp("["+ifs.replace(/[\]\\^-]/g,"\\$&")+"]"+(/^[ \t\n]+$/.test(ifs)?"+":""));line=ifs===undefined||/[ \t]/.test(ifs)?line.replace(/^[ \t]+|[ \t]+$/g,""):line;
          for(var w=0;w<a.length;w++){if(w===a.length-1){ctx.vars[a[w]]=line;break;}var m=sepRe.exec(line);if(!m||line===""){ctx.vars[a[w]]=line;line="";}else{ctx.vars[a[w]]=line.slice(0,m.index);line=line.slice(m.index+m[0].length);}}}
        ctx.last=0;return "";
      case "test":ctx.last=testExpr(a,ctx,false)?0:1;return "";
      case "[":if(a[a.length-1]!=="]")throw new Err("[: missing `]'");ctx.last=testExpr(a.slice(0,-1),ctx,false)?0:1;return "";
      case "exit":throw {exit:a.length?(parseInt(a[0],10)||0):ctx.last};
      case "break":throw {brk:1};
      case "continue":throw {cont:1};
      case "export":case "local":case "declare":case "readonly":a.forEach(function(x){var e=x.indexOf("=");if(e>0)ctx.vars[x.slice(0,e)]=x.slice(e+1);});ctx.last=0;return "";
      case "let":var lv=0;a.forEach(function(x){lv=arith(x,ctx);});ctx.last=lv!==0?0:1;return "";
      case "shift":ctx.args.splice(0,a.length?+a[0]:1);ctx.last=0;return "";
      case "set":ctx.last=0;return "";
      case "unset":a.forEach(function(x){delete ctx.vars[x];});ctx.last=0;return "";
      case "expr":ctx.last=0;return String(arith(a.join(" ").replace(/\\\*/g,"*"),ctx))+"\n";
    }
    var fn=Object.prototype.hasOwnProperty.call(U,name)?U[name]:null;
    if(!fn){ctx.err+=name+": command not found (not available in this lab)\n";ctx.last=127;return "";}
    var res=fn(a,inp,ctx);if(typeof res==="string"){ctx.last=0;return res;}ctx.last=res.c||0;return res.o;
  }catch(e){if(e instanceof Err){ctx.err+=e.m+"\n";ctx.last=e.code;return "";}throw e;}}

/* Run a script. files: {name: content}. Returns {out, err, code, files}. */
function run(script,files,stdin,args){
  var ctx={vars:{},fs:{},args:(args||[]).slice(),err:"",steps:0,last:0},o="",k;
  for(k in files||{})if(Object.prototype.hasOwnProperty.call(files,k))ctx.fs[k]=files[k];
  try{o=runList(parse(script),{s:stdin||"",p:0},ctx);}
  catch(e){if(e instanceof Err){ctx.err+=e.m+"\n";ctx.last=e.code;}else if(e&&e.exit!==undefined){ctx.last=e.exit;o=e.o||o;}
    else if(e&&(e.brk||e.cont)){ctx.err+="break/continue only work inside a loop\n";}
    else if(e instanceof RangeError){ctx.err+="the script nested too deeply or looped forever\n";ctx.last=2;}
    else{ctx.err+="internal error: "+(e&&e.message||e)+"\n";ctx.last=2;}}
  return {out:o,err:ctx.err,code:ctx.last,files:ctx.fs};}
var api={run:run,commands:["echo","printf","read","test","[","[[","((","exit","break","continue","let","expr","shift","unset"].concat(Object.keys(U)).sort()};
if(typeof window!=="undefined")window.MiniSh=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
