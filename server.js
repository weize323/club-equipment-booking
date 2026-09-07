const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, {recursive:true});
const DB_FILE = path.join(DATA_DIR, 'data.json');
// Session cookie: no Max-Age/Expires so it expires when browser closes
// But keep alive in memory for the server lifetime per TTL (for refresh)
const SESSION_TTL = 1000 * 60 * 60 * 12; // 12h server-side TTL

const DEFAULT_EQ = [
  {id:'e001',name:'SONY A7C II',type:'相機',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e002',name:'SONY A7 III',type:'相機',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e003',name:'SONY A7S II',type:'相機',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e004',name:'SONY A7S II（第二台）',type:'相機',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e005',name:'SONY A6400',type:'相機',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e006',name:'CANON EOS R5 Mark II',type:'相機',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e007',name:'CANON EOS R6 Mark II',type:'相機',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e008',name:'CANON EOS 5D Mark III',type:'相機',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e009',name:'CANON 700D',type:'相機',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e010',name:'CANON 70D',type:'相機',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e011',name:'攝影機 SONY HDR-CX900',type:'攝影機',qty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e012',name:'攝影機 SONY FDR-AX700',type:'攝影機',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e013',name:'攝影機 SONY PXW-X70',type:'攝影機',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e014',name:'導播機',type:'攝影機',qty:1,allow:['task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e015',name:'鏡頭 SONY FE 16-35mm F2.8 GM II',type:'鏡頭',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e016',name:'鏡頭 SONY FE 55mm F1.8 ZA',type:'鏡頭',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e017',name:'鏡頭 SONY FE 24-70mm F2.8 GM',type:'鏡頭',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e018',name:'鏡頭 SONY FE 24-70mm F4 ZA OSS',type:'鏡頭',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e019',name:'鏡頭 SONY E 18-105mm F4 G OSS',type:'鏡頭',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e020',name:'鏡頭 SONY FE 70-200mm F4 G OSS',type:'鏡頭',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e021',name:'鏡頭 SONY FE 85mm F1.8',type:'鏡頭',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e022',name:'電影鏡 SAMYANG VDSLR 24mm T1.5',type:'鏡頭',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e023',name:'電影鏡 SAMYANG VDSLR 85mm T1.5',type:'鏡頭',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e024',name:'鏡頭 CANON RF 24-105mm F4 L IS USM',type:'鏡頭',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e025',name:'鏡頭 CANON RF 70-200mm F4 L IS USM',type:'鏡頭',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e026',name:'鏡頭 CANON EF 24-105mm F4 L',type:'鏡頭',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e027',name:'鏡頭 CANON EF 70-200mm F4 L（或F2.8L）',type:'鏡頭',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e028',name:'鏡頭 SIGMA 18-250mm F3.5-6.3',type:'鏡頭',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e029',name:'可調式ND減光鏡 67mm',type:'濾鏡',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e030',name:'ND減光鏡 82mm',type:'濾鏡',qty:2,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e031',name:'ND減光鏡 77mm',type:'濾鏡',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e032',name:'UV保護鏡 49mm',type:'濾鏡',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e033',name:'UV保護鏡 67mm',type:'濾鏡',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e034',name:'UV保護鏡 72mm',type:'濾鏡',qty:2,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e035',name:'UV保護鏡 77mm',type:'濾鏡',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e036',name:'方型濾鏡系統套組',type:'濾鏡',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e037',name:'轉接環 CANON EF-EOS R',type:'配件',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e038',name:'圖傳 HOLLYLAND Pyros H',type:'配件',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e039',name:'無線麥克風 SONY URX-P1',type:'麥克風',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e040',name:'無線麥克風 SONY URX-P2',type:'麥克風',qty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e041',name:'無線麥克風 SONY URX-P40',type:'麥克風',qty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e042',name:'指向 3.5mm MIC',type:'麥克風',qty:5,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e043',name:'指向 XLR MIC',type:'麥克風',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e044',name:'指向 MIC',type:'麥克風',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e045',name:'手持 MIC',type:'麥克風',qty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e046',name:'一對二領夾MIC Hollyland',type:'麥克風',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e047',name:'監聽耳機',type:'麥克風',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e048',name:'聚光燈 YONGNUO YNLUX100 Pro',type:'燈光',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e049',name:'聚光燈 COB 150W LED',type:'燈光',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e050',name:'閃光燈 GODOX QT400',type:'燈光',qty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e051',name:'板燈',type:'燈光',qty:6,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e052',name:'燈棒 GODOX LC500',type:'燈光',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e053',name:'布幕腳架延伸桿',type:'燈光',qty:8,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e054',name:'布幕腳架支架',type:'燈光',qty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e055',name:'活動式綠幕',type:'燈光',qty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e056',name:'背景布（深藍、淺藍）',type:'燈光',qty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e057',name:'燈架 W-806B',type:'燈光',qty:4,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e058',name:'燈架（3/8螺絲）',type:'燈光',qty:4,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e059',name:'反折燈架（1/4螺絲）',type:'燈光',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e060',name:'三腳燈架 EI-717AT',type:'燈光',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e061',name:'燈塔雲台三角架',type:'燈光',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e062',name:'伸縮桿（3/8螺絲）',type:'燈光',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e063',name:'相機穩定器 DJI RS 4 Mini',type:'腳架',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e064',name:'穩定器 DJI RSC 2',type:'腳架',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e065',name:'三腳架 NEST NT-04',type:'腳架',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e066',name:'三腳架 LIBEC TH-650DV',type:'腳架',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e067',name:'三腳架 LIBEC TH-950',type:'腳架',qty:5,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e068',name:'三腳架 WEIFENG WF-718',type:'腳架',qty:3,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e069',name:'三腳架 LIBEC TH-X',type:'腳架',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e070',name:'三腳架 WEIFENG EI-525MV',type:'腳架',qty:2,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e071',name:'反折三腳架 MILIBOO',type:'腳架',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e072',name:'輕便三腳架 QZSD Q620',type:'腳架',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e073',name:'輕便小腳架 WEIFENG WT-3560',type:'腳架',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e074',name:'輕便小腳架 MANFROTTO MKC3-P01',type:'腳架',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e075',name:'小腳架 SLIK SH-705E',type:'腳架',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e076',name:'小腳架 SONY BCT-R640',type:'腳架',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e077',name:'小腳架 SONY',type:'腳架',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e078',name:'油壓三腳架 SACHTLER Ace',type:'腳架',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e079',name:'搖臂組',type:'腳架',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e080',name:'滑軌 lx650',type:'腳架',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e081',name:'記憶卡 256G 170MB/s',type:'記憶卡',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:['#7']},
  {id:'e082',name:'記憶卡 128G 200MB/s',type:'記憶卡',qty:7,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:['#5','#6','#9','#10','#14','#18','#21']},
  {id:'e083',name:'記憶卡 128G 170MB/s（讀取失敗）',type:'記憶卡',qty:2,allow:['task'],eqStatus:'repairing',location:'',ownership:'',note:'#8,#12 讀取偶爾失敗',cardNumbers:['#8','#12']},
  {id:'e084',name:'記憶卡 128G 95MB/s',type:'記憶卡',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:['#11']},
  {id:'e085',name:'記憶卡 64G 200MB/s',type:'記憶卡',qty:5,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:['#17','#20','#22','#23','#24']},
  {id:'e086',name:'記憶卡 64G 170MB/s',type:'記憶卡',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:['#4']},
  {id:'e087',name:'記憶卡 64G 95MB/s',type:'記憶卡',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:['#1']},
  {id:'e088',name:'相機包（大）',type:'配件',qty:3,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e089',name:'相機包（中）',type:'配件',qty:6,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e090',name:'相機包（小）',type:'配件',qty:5,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e091',name:'動力線',type:'配件',qty:5,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e092',name:'DP線',type:'配件',qty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e093',name:'HDMI線',type:'配件',qty:7,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e094',name:'Mini HDMI線',type:'配件',qty:3,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e095',name:'HDMI線（橘）',type:'配件',qty:3,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e096',name:'Micro HDMI-HDMI線（橘）',type:'配件',qty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e097',name:'HDMI L頭',type:'配件',qty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e098',name:'HDMI線 20m',type:'配件',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e099',name:'Canon-Canon 20m',type:'配件',qty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e100',name:'Canon-Canon 15m',type:'配件',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e101',name:'6.3-6.3（5m）',type:'配件',qty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e102',name:'6.3-6.3（20m）',type:'配件',qty:3,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e103',name:'Canon-6.3（10m）',type:'配件',qty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e104',name:'RCA-RCA（15m）',type:'配件',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]},
  {id:'e105',name:'RCA-3.5（15m）',type:'配件',qty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[]}
];

const DEFAULT_PH = {name:'輸入姓名',dept:'例：行銷三乙',sid:'例：D1345026',phone:'0912345678',email:'abc@gmail.com',taskName:'例：115_08_23_什麼度冬東'};
const DEFAULT_EMAIL = {serviceId:'',templateId:'',pubKey:'',subject:'【器材借用】您的申請已通過審核',body:'親愛的 {{to_name}} 同學您好，\n\n您的借用申請已通過審核！\n\n器材：{{borrow_items}}\n借出：{{borrow_start}}\n歸還：{{borrow_end}}\n\n如有問題請洽管理員。'};
const DEFAULT_LOCATIONS = ['社辦A櫃','社辦B櫃','社辦C架','倉庫'];
const DEFAULT_CAT_ORDER = ['相機','攝影機','鏡頭','濾鏡','麥克風','燈光','腳架','記憶卡','配件'];

function hashPw(pw,salt){return crypto.scryptSync(pw,salt,64).toString('hex');}
function makePw(pw){const salt=crypto.randomBytes(16).toString('hex');return{salt,hash:hashPw(pw,salt)};}
function verifyPw(pw,rec){try{return crypto.timingSafeEqual(Buffer.from(hashPw(pw,rec.salt),'hex'),Buffer.from(rec.hash,'hex'));}catch{return false;}}

function initialDB(){
  return {version:3,password:makePw(process.env.ADMIN_PASSWORD||'admin123'),
    records:[],members:[],equipment:DEFAULT_EQ,
    emailSettings:DEFAULT_EMAIL,placeholders:DEFAULT_PH,
    locations:DEFAULT_LOCATIONS,catOrder:DEFAULT_CAT_ORDER};
}

function readDB(){
  if(!fs.existsSync(DB_FILE)){const d=initialDB();writeDB(d);return d;}
  try{
    const d=JSON.parse(fs.readFileSync(DB_FILE,'utf8'));
    if(!d.locations) d.locations=DEFAULT_LOCATIONS;
    if(!d.catOrder)  d.catOrder=DEFAULT_CAT_ORDER;
    if(!d.placeholders) d.placeholders=DEFAULT_PH;
    if(!d.placeholders.taskName) d.placeholders.taskName=DEFAULT_PH.taskName;
    if(!d.emailSettings) d.emailSettings=DEFAULT_EMAIL;
    // Migrate equipment: add new fields without overwriting existing
    if(d.equipment) d.equipment=d.equipment.map(e=>({
      eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],...e
    }));
    // Migrate members: add isOfficer field without overwriting existing
    if(d.members) d.members=d.members.map(m=>({isOfficer:false,...m}));
    // Migrate records: ensure required fields
    if(d.records) d.records=d.records.map(r=>({
      returnedItems:[],collabs:[],taskName:'',
      ...r,
      equipment:(r.equipment||[]).map(e=>({assignedCards:[],...e}))
    }));
    return d;
  }catch(e){
    console.error('readDB error:',e);
    // DO NOT initialise fresh – preserve data. Return safe empty shell.
    return initialDB();
  }
}

function writeDB(d){
  const tmp=DB_FILE+'.tmp';
  fs.writeFileSync(tmp,JSON.stringify(d,null,2),'utf8');
  fs.renameSync(tmp,DB_FILE);
}

let db=readDB();

// Sessions: Map<token, expiresAt>
// No Max-Age on cookie → session-cookie behaviour (expires on browser close)
// Server keeps token alive for SESSION_TTL from last login to survive page refresh
const sessions=new Map();
function cleanupSessions(){const now=Date.now();for(const[k,v]of sessions)if(v<now)sessions.delete(k);}
setInterval(cleanupSessions,30*60*1000).unref();

function parseCookies(req){
  const out={};
  (req.headers.cookie||'').split(';').forEach(x=>{
    const i=x.indexOf('=');
    if(i>0) out[x.slice(0,i).trim()]=decodeURIComponent(x.slice(i+1).trim());
  });
  return out;
}
function isAdmin(req){const t=parseCookies(req).sid;return!!(t&&sessions.get(t)>Date.now());}
function setSession(res){
  const token=crypto.randomBytes(32).toString('hex');
  sessions.set(token,Date.now()+SESSION_TTL);
  // NO Max-Age / Expires → session cookie (cleared on browser close)
  const secure=process.env.NODE_ENV==='production'?'; Secure':'';
  res.setHeader('Set-Cookie',`sid=${token}; HttpOnly; Path=/; SameSite=Lax${secure}`);
}
function clearSession(req,res){
  const t=parseCookies(req).sid;
  if(t) sessions.delete(t);
  const secure=process.env.NODE_ENV==='production'?'; Secure':'';
  res.setHeader('Set-Cookie',`sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`);
}

function json(res,status,obj){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(obj));
}
function bodyJSON(req){
  return new Promise((resolve,reject)=>{
    let s='';
    req.on('data',c=>{s+=c;if(s.length>4e6)req.destroy();});
    req.on('end',()=>{try{resolve(s?JSON.parse(s):{});}catch(e){reject(e);}});
    req.on('error',reject);
  });
}

// Public records (strip private contact info, keep schedule-relevant data)
function publicRecords(){
  return db.records.map(r=>({
    id:r.id, start:r.start, end:r.end,
    equipment:(r.equipment||[]).map(e=>({id:e.id,qty:e.qty,name:e.name,assignedCards:e.assignedCards||[]})),
    status:r.status, returnedItems:r.returnedItems||[],
    cat:r.cat, createdAt:r.createdAt, taskName:r.taskName||''
  }));
}

// isOfficer helper — requires name + sid + phone all match
function checkOfficer(name,sid,phone){
  const m=db.members.find(x=>
    x.name===name &&
    x.sid===sid &&
    x.phone===phone
  );
  return !!(m&&m.isOfficer);
}

// Effective allow-list: if officer + personal, treat as task for allow check
function effectiveAllow(cat,isOfficer){
  if(isOfficer&&cat==='personal') return 'task';
  return cat;
}

// Occupied qty for eqId in time window, optionally excluding one record
function getOccupied(eqId,start,end,excludeId){
  const s=start?new Date(start):null,e=end?new Date(end):null;
  return db.records.filter(r=>{
    if(r.id===excludeId) return false;
    if(r.status==='pending'||r.status==='done') return false;
    const returned=r.returnedItems||[];
    const item=(r.equipment||[]).find(x=>x.id===eqId);
    if(!item) return false;
    if(returned.includes(item.id+'__'+item.qty)) return false;
    if(s&&e){const rs=new Date(r.start),re=new Date(r.end);if(!(rs<e&&re>s))return false;}
    return true;
  }).reduce((sum,r)=>{
    const item=(r.equipment||[]).find(x=>x.id===eqId);
    return sum+(item?item.qty:0);
  },0);
}

// Cards in use for eqId during [start,end] time window, excluding one record
// start/end are optional; if omitted, all active records are considered
function getBusyCards(eqId,start,end,excludeId){
  const s=start?new Date(start):null;
  const e=end?new Date(end):null;
  const busy=new Set();
  db.records.forEach(r=>{
    if(r.id===excludeId) return;
    if(r.status==='done'||r.status==='pending') return;
    const item=(r.equipment||[]).find(x=>x.id===eqId);
    if(!item) return;
    if((r.returnedItems||[]).includes(item.id+'__'+item.qty)) return;
    // Time overlap check: existing overlaps [start,end]?
    if(s&&e){
      const rs=new Date(r.start),re=new Date(r.end);
      if(!(rs<e&&re>s)) return; // no overlap → skip
    }
    (item.assignedCards||[]).forEach(c=>{if(c)busy.add(c);});
  });
  return busy;
}

const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://localhost');
    const p=u.pathname;
    const m=req.method;

    // ── Static pages ──
    if(m==='GET'&&(p==='/'||p==='/index.html'))
      return fs.createReadStream(path.join(ROOT,'index.html')).pipe(res);
    if(m==='GET'&&p==='/admin')
      return fs.createReadStream(path.join(ROOT,'admin.html')).pipe(res);
    if(m==='GET'&&p==='/api/health')
      return json(res,200,{ok:true,records:db.records.length,members:db.members.length,equipment:db.equipment.length});

    // ── Public state (members includes isOfficer flag for index.html) ──
    if(m==='GET'&&p==='/api/public-state'){
      return json(res,200,{
        equipment:db.equipment,
        records:publicRecords(),
        placeholders:db.placeholders,
        locations:db.locations,
        catOrder:db.catOrder,
        // Expose officer list (name+sid only) so index.html can check without full member data
        officerList:db.members.filter(x=>x.isOfficer).map(x=>({name:x.name,sid:x.sid,phone:x.phone}))
      });
    }

    // ── Admin login ──
    if(m==='POST'&&p==='/api/admin/login'){
      const b=await bodyJSON(req);
      if(!verifyPw(String(b.password||''),db.password)) return json(res,401,{error:'密碼錯誤'});
      setSession(res);
      return json(res,200,{ok:true});
    }

    // ── Admin logout ──
    if(m==='POST'&&p==='/api/admin/logout'){
      clearSession(req,res);
      return json(res,200,{ok:true});
    }

    // ── Admin: check session ──
    if(m==='GET'&&p==='/api/admin/check'){
      return json(res,200,{ok:isAdmin(req)});
    }

    // ── Admin full state ──
    if(m==='GET'&&p==='/api/admin/state'){
      if(!isAdmin(req)) return json(res,401,{error:'未登入'});
      return json(res,200,{
        records:db.records, members:db.members, equipment:db.equipment,
        emailSettings:db.emailSettings, placeholders:db.placeholders,
        locations:db.locations, catOrder:db.catOrder
      });
    }

    // ── Admin bulk update any top-level key ──
    if(m==='PUT'&&p.startsWith('/api/admin/state/')){
      if(!isAdmin(req)) return json(res,401,{error:'未登入'});
      const key=decodeURIComponent(p.split('/').pop());
      const b=await bodyJSON(req);
      const allowed=['records','members','equipment','emailSettings','placeholders','locations','catOrder'];
      if(!allowed.includes(key)) return json(res,400,{error:'不允許的欄位'});
      db[key]=b.value; writeDB(db);
      return json(res,200,{ok:true});
    }

    // ── Admin change password ──
    if(m==='POST'&&p==='/api/admin/password'){
      if(!isAdmin(req)) return json(res,401,{error:'未登入'});
      const b=await bodyJSON(req);
      if(!verifyPw(String(b.oldPassword||''),db.password)) return json(res,400,{error:'目前密碼不正確'});
      if(String(b.newPassword||'').length<4) return json(res,400,{error:'新密碼至少 4 碼'});
      db.password=makePw(String(b.newPassword)); writeDB(db);
      return json(res,200,{ok:true});
    }

    // ── Admin full edit a record ──
    if(m==='PUT'&&p.match(/^\/api\/admin\/records\/[^/]+$/)){
      if(!isAdmin(req)) return json(res,401,{error:'未登入'});
      const recId=p.split('/')[4];
      const b=await bodyJSON(req);
      const idx=db.records.findIndex(r=>r.id===recId);
      if(idx===-1) return json(res,404,{error:'紀錄不存在'});

      // Validate
      if(!b.name||!b.dept||!b.sid||!b.phone||!b.email) return json(res,400,{error:'借用人資料不完整'});
      if(!b.cat||!['personal','event','task'].includes(b.cat)) return json(res,400,{error:'借用類別無效'});
      if(b.cat==='task'&&!String(b.taskName||'').trim()) return json(res,400,{error:'社內任務必須填寫任務名稱'});
      if(!b.start||!b.end) return json(res,400,{error:'時間不完整'});
      if(new Date(b.end)<=new Date(b.start)) return json(res,400,{error:'歸還時間必須晚於借出時間'});
      if(!Array.isArray(b.equipment)||!b.equipment.length) return json(res,400,{error:'至少需要一項器材'});

      // Validate each equipment item
      for(const item of b.equipment){
        const eq=db.equipment.find(e=>e.id===item.id);
        if(!eq) return json(res,400,{error:`器材不存在：${item.id}`});
        const qty=Number(item.qty);
        if(!Number.isInteger(qty)||qty<1) return json(res,400,{error:`器材數量無效：${eq.name}`});
        if(qty>eq.qty) return json(res,400,{error:`${eq.name} 數量 ${qty} 超過總數 ${eq.qty}`});
        // Inventory check: other records occupying this eq in the same time window
        const occupied=getOccupied(eq.id,b.start,b.end,recId);
        if(occupied+qty>eq.qty) return json(res,400,{error:`${eq.name} 此時段庫存不足（已被借 ${occupied} 台，總共 ${eq.qty} 台，本次需要 ${qty} 台）`});
        // Card validation
        if((eq.cardNumbers||[]).length>0){
          const cards=(item.assignedCards||[]).filter(Boolean);
          const valid=new Set(eq.cardNumbers);
          // Each card must exist in cardNumbers
          const invalid=cards.filter(c=>!valid.has(c));
          if(invalid.length) return json(res,400,{error:`${eq.name} 卡號不存在：${invalid.join('、')}`});
          // No duplicate cards within this item
          if(new Set(cards).size!==cards.length) return json(res,400,{error:`${eq.name} 指定卡號有重複`});
          // Cards must not exceed qty
          if(cards.length>qty) return json(res,400,{error:`${eq.name} 指定卡號數量（${cards.length}）超過借用數量（${qty}）`});
          // Check against other active records in same time window
          const busy=getBusyCards(eq.id,b.start,b.end,recId);
          const conflicts=cards.filter(c=>busy.has(c));
          if(conflicts.length) return json(res,400,{error:`${eq.name} 卡號已被此時段其他借用占用：${conflicts.join('、')}`});
        }
      }

      // Preserve fields that admin edit should not touch
      const old=db.records[idx];
      const updated={
        ...old,
        name:String(b.name).trim(),
        dept:String(b.dept).trim(),
        sid:String(b.sid).trim(),
        phone:String(b.phone).trim(),
        email:String(b.email).trim(),
        cat:b.cat,
        taskName:String(b.taskName||'').trim(),
        start:b.start,
        end:b.end,
        note:String(b.note||'').trim(),
        equipment:b.equipment.map(e=>({
          id:e.id,
          qty:Number(e.qty),
          name:e.name||(db.equipment.find(x=>x.id===e.id)||{name:e.id}).name,
          assignedCards:Array.isArray(e.assignedCards)?e.assignedCards.filter(Boolean):[],
        })),
        // Rebuild returnedItems: only keep keys that match current equipment qty
        returnedItems:(()=>{
          const raw=Array.isArray(b.returnedItems)?b.returnedItems:old.returnedItems||[];
          // Filter to only valid keys matching new equipment list
          const validKeys=new Set((b.equipment||[]).map(e=>e.id+'__'+Number(e.qty)));
          return raw.filter(k=>validKeys.has(k));
        })(),
        updatedAt:new Date().toISOString()
      };
      // status is computed dynamically, never store a client-provided status
      // keep the stored status field only for 'pending'/'done'/'approved'
      // (computeStatus on frontend derives display from time + returnedItems)
      if(b.forceStatus==='done'||updated.returnedItems.length>0){
        const allEq=updated.equipment||[];
        if(allEq.length>0&&allEq.every(e=>updated.returnedItems.includes(e.id+'__'+e.qty))){
          updated.status='done';
          if(!updated.returnedAt) updated.returnedAt=new Date().toISOString();
        }
      }
      db.records[idx]=updated;
      writeDB(db);
      return json(res,200,{ok:true,record:updated,publicRecords:publicRecords()});
    }

    // ── Admin: update assigned cards for one equipment item ──
    if(m==='PATCH'&&p.match(/^\/api\/admin\/records\/[^/]+\/cards$/)){
      if(!isAdmin(req)) return json(res,401,{error:'未登入'});
      const recId=p.split('/')[4];
      const b=await bodyJSON(req);
      const rec=db.records.find(r=>r.id===recId);
      if(!rec) return json(res,404,{error:'紀錄不存在'});
      const item=(rec.equipment||[]).find(e=>e.id===b.eqId);
      if(!item) return json(res,404,{error:'器材不存在於此紀錄'});
      const eq=db.equipment.find(e=>e.id===b.eqId);
      if(eq&&(eq.cardNumbers||[]).length>0){
        const cards=(b.assignedCards||[]).filter(Boolean);
        const valid=new Set(eq.cardNumbers);
        const invalid=cards.filter(c=>!valid.has(c));
        if(invalid.length) return json(res,400,{error:'卡號不存在：'+invalid.join('、')});
        if(new Set(cards).size!==cards.length) return json(res,400,{error:'指定卡號有重複'});
        if(cards.length>item.qty) return json(res,400,{error:`卡號數量（${cards.length}）超過借用數量（${item.qty}）`});
        // Use record's own start/end for time-window busy check
        const busy=getBusyCards(b.eqId,rec.start,rec.end,recId);
        const conflict=cards.filter(c=>busy.has(c));
        if(conflict.length) return json(res,400,{error:'卡號已被此時段其他借用占用：'+conflict.join('、')});
      }
      item.assignedCards=Array.isArray(b.assignedCards)?b.assignedCards.filter(Boolean):[];
      writeDB(db);
      return json(res,200,{ok:true});
    }

    // ── Member submit borrow ──
    if(m==='POST'&&p==='/api/member/submit'){
      const b=await bodyJSON(req);
      const required=['name','dept','sid','phone','email','cat','start','end'];
      if(required.some(k=>!String(b[k]||'').trim())) return json(res,400,{error:'資料不完整'});
      if(new Date(b.end)<=new Date(b.start)) return json(res,400,{error:'借用時間不正確'});
      if(!Array.isArray(b.equipment)||!b.equipment.length) return json(res,400,{error:'至少選擇一項器材'});
      if(b.cat==='task'&&!String(b.taskName||'').trim()) return json(res,400,{error:'社內任務必須填寫任務名稱'});

      // Backend officer check — require name + sid + phone all match
      const isOfficer=checkOfficer(String(b.name).trim(),String(b.sid).trim(),String(b.phone).trim());
      const effCat=effectiveAllow(b.cat,isOfficer);

      const errors=[];
      for(const item of b.equipment){
        const eq=db.equipment.find(e=>e.id===item.id);
        if(!eq){errors.push(`器材不存在`);continue;}
        if(eq.eqStatus==='disabled'){errors.push(eq.name+'（停用）');continue;}
        if(!(eq.allow||[]).includes(effCat)){errors.push(eq.name+'（此類別不可借）');}
        // Card conflict check with time-window overlap
        if((eq.cardNumbers||[]).length>0&&Array.isArray(item.assignedCards)){
          const cards=item.assignedCards.filter(Boolean);
          const valid=new Set(eq.cardNumbers);
          const badCards=cards.filter(c=>!valid.has(c));
          if(badCards.length) errors.push(`${eq.name} 卡號不存在：${badCards.join(',')}`);
          if(new Set(cards).size!==cards.length) errors.push(`${eq.name} 指定卡號有重複`);
          if(cards.length>item.qty) errors.push(`${eq.name} 卡號數量超過借用數量`);
          const busy=getBusyCards(item.id,b.start,b.end,null);
          const conflict=cards.filter(c=>busy.has(c));
          if(conflict.length) errors.push(`${eq.name} 卡號 ${conflict.join(',')} 此時段已借出`);
        }
      }
      if(errors.length) return json(res,400,{error:'以下器材不可借用：'+errors.join('、')});

      const rec={
        id:'r'+Date.now(),
        name:String(b.name).trim(), dept:String(b.dept).trim(),
        sid:String(b.sid).trim(),   phone:String(b.phone).trim(),
        email:String(b.email).trim(), cat:b.cat,
        taskName:String(b.taskName||'').trim(),
        start:b.start, end:b.end,
        note:String(b.note||'').trim(),
        equipment:(b.equipment||[]).map(e=>({
          id:e.id, qty:e.qty, name:e.name,
          assignedCards:Array.isArray(e.assignedCards)?e.assignedCards.filter(Boolean):[]
        })),
        collabs:Array.isArray(b.collabs)?b.collabs:[],
        status:'pending', returnedItems:[],
        createdAt:new Date().toISOString()
      };
      db.records.unshift(rec);

      // Upsert member
      let mem=db.members.find(x=>x.sid===rec.sid||x.name===rec.name);
      if(!mem){
        mem={id:'m'+Date.now(),name:rec.name,dept:rec.dept,sid:rec.sid,
             phone:rec.phone,email:rec.email,taskCount:0,isOfficer:false};
        db.members.push(mem);
      } else {
        Object.assign(mem,{dept:rec.dept,phone:rec.phone,email:rec.email});
      }
      // Collab task count
      for(const c of rec.collabs){
        if(!c.name) continue;
        let cm=db.members.find(x=>x.name===c.name||(c.sid&&x.sid===c.sid));
        if(!cm){cm={id:'m'+Date.now()+Math.random(),name:c.name,sid:c.sid||'',dept:'',phone:'',email:'',taskCount:0,isOfficer:false};db.members.push(cm);}
        if(rec.cat==='task') cm.taskCount=(cm.taskCount||0)+1;
      }
      writeDB(db);
      return json(res,200,{ok:true,id:rec.id,publicRecords:publicRecords()});
    }

    // ── Member verify identity ──
    if(m==='POST'&&p==='/api/member/verify'){
      const b=await bodyJSON(req);
      const name=String(b.name||'').trim(), sid=String(b.sid||'').trim(), phone=String(b.phone||'').trim();
      const member=db.members.find(x=>x.name===name&&x.sid===sid&&x.phone===phone);
      const recs=db.records.filter(r=>r.name===name&&r.sid===sid&&r.phone===phone);
      if(!member&&!recs.length) return json(res,200,{ok:false,records:[],isOfficer:false});
      return json(res,200,{ok:true,records:recs,isOfficer:!!(member&&member.isOfficer)});
    }

    // ── Admin import legacy localStorage data ──
    if(m==='POST'&&p==='/api/admin/import-legacy'){
      if(!isAdmin(req)) return json(res,401,{error:'未登入'});
      const b=await bodyJSON(req);
      const mode=b.mode||'merge';
      const report={added:{},skipped:{},merged:{}};

      if(Array.isArray(b.equipment)&&b.equipment.length){
        const legacyEq=b.equipment.map(e=>({eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],...e}));
        if(mode==='overwrite'){db.equipment=legacyEq;report.merged.equipment=legacyEq.length;}
        else{
          const existIds=new Set(db.equipment.map(e=>e.id));
          const existNames=new Set(db.equipment.map(e=>e.name));
          let added=0,skipped=0;
          for(const e of legacyEq){if(existIds.has(e.id)||existNames.has(e.name)){skipped++;continue;}db.equipment.push(e);added++;}
          report.added.equipment=added; report.skipped.equipment=skipped;
        }
      }
      if(Array.isArray(b.members)&&b.members.length){
        const legacyM=b.members.map(x=>({isOfficer:false,...x}));
        if(mode==='overwrite'){db.members=legacyM;report.merged.members=legacyM.length;}
        else{
          const existIds=new Set(db.members.map(x=>x.id));
          const existSids=new Set(db.members.filter(x=>x.sid).map(x=>x.sid));
          let added=0,skipped=0;
          for(const m of legacyM){if(existIds.has(m.id)||(m.sid&&existSids.has(m.sid))){skipped++;continue;}db.members.push(m);added++;}
          report.added.members=added; report.skipped.members=skipped;
        }
      }
      if(Array.isArray(b.records)&&b.records.length){
        const legacyR=b.records.map(r=>({returnedItems:[],collabs:[],taskName:'',...r,equipment:(r.equipment||[]).map(e=>({assignedCards:[],...e}))}));
        if(mode==='overwrite'){db.records=legacyR;report.merged.records=legacyR.length;}
        else{
          const existIds=new Set(db.records.map(r=>r.id));
          let added=0,skipped=0;
          for(const r of legacyR){if(existIds.has(r.id)){skipped++;continue;}db.records.push(r);added++;}
          report.added.records=added; report.skipped.records=skipped;
        }
        db.records.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
      }
      if(b.placeholders&&typeof b.placeholders==='object'){db.placeholders={...db.placeholders,...b.placeholders};report.merged.placeholders=true;}
      if(b.emailSettings&&typeof b.emailSettings==='object'){db.emailSettings={...db.emailSettings,...b.emailSettings};report.merged.emailSettings=true;}
      if(Array.isArray(b.locations)&&b.locations.length){
        const ex=new Set(db.locations);const nl=b.locations.filter(l=>!ex.has(l));
        db.locations=[...db.locations,...nl];report.added.locations=nl.length;
      }
      if(Array.isArray(b.catOrder)&&b.catOrder.length&&mode==='overwrite'){db.catOrder=b.catOrder;report.merged.catOrder=true;}
      writeDB(db);
      return json(res,200,{ok:true,report,totals:{records:db.records.length,members:db.members.length,equipment:db.equipment.length}});
    }

    // ── Static file fallback ──
    if(m==='GET'){
      const fp=path.normalize(path.join(ROOT,p));
      if(fp.startsWith(ROOT)&&fs.existsSync(fp)&&fs.statSync(fp).isFile())
        return fs.createReadStream(fp).pipe(res);
    }
    json(res,404,{error:'Not found'});
  }catch(e){console.error(e);json(res,500,{error:'伺服器錯誤'});}
});

server.listen(PORT,()=>console.log(`器材借用系統 running on port ${PORT}`));
