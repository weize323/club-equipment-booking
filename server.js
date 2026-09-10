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
const SESSION_TTL = 1000 * 60 * 60 * 12; // 12h — page refresh keeps session, browser close loses it

// ── Password helpers ──
function hashPw(pw,salt){return crypto.scryptSync(pw,salt,64).toString('hex');}
function makePw(pw){const salt=crypto.randomBytes(16).toString('hex');return{salt,hash:hashPw(pw,salt)};}
function verifyPw(pw,rec){try{return crypto.timingSafeEqual(Buffer.from(hashPw(pw,rec.salt),'hex'),Buffer.from(rec.hash,'hex'));}catch{return false;}}

// ── cardNumbers → cards migration helper ──
function migrateCards(cardNumbers){
  return (cardNumbers||[]).map(n=>({number:String(n),status:'available'}));
}

// ── Equipment migration: add missing fields without overwriting ──
function migrateEquipment(e){
  const base = {eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],usableQty:null,cards:[],...e};
  // usableQty defaults to qty if missing or 0
  // Only fill in usableQty when it's genuinely absent (null/undefined) — 0 is a valid, intentional value
  if(base.usableQty===null||base.usableQty===undefined) base.usableQty=base.qty;
  // cards: build from cardNumbers if cards array is empty/missing
  if((!base.cards||base.cards.length===0)&&base.cardNumbers&&base.cardNumbers.length>0){
    base.cards=migrateCards(base.cardNumbers);
  }
  if(!Array.isArray(base.cards)) base.cards=[];
  if(!Array.isArray(base.cardNumbers)) base.cardNumbers=[];
  return base;
}

const DEFAULT_EQ = [
  {id:'e001',name:'SONY A7C II',type:'相機',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e002',name:'SONY A7 III',type:'相機',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e003',name:'SONY A7S II',type:'相機',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e004',name:'SONY A7S II（第二台）',type:'相機',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e005',name:'SONY A6400',type:'相機',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e006',name:'CANON EOS R5 Mark II',type:'相機',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e007',name:'CANON EOS R6 Mark II',type:'相機',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e008',name:'CANON EOS 5D Mark III',type:'相機',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e009',name:'CANON 700D',type:'相機',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e010',name:'CANON 70D',type:'相機',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e011',name:'攝影機 SONY HDR-CX900',type:'攝影機',qty:2,usableQty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e012',name:'攝影機 SONY FDR-AX700',type:'攝影機',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e013',name:'攝影機 SONY PXW-X70',type:'攝影機',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e014',name:'導播機',type:'攝影機',qty:1,usableQty:1,allow:['task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e015',name:'鏡頭 SONY FE 16-35mm F2.8 GM II',type:'鏡頭',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e016',name:'鏡頭 SONY FE 55mm F1.8 ZA',type:'鏡頭',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e017',name:'鏡頭 SONY FE 24-70mm F2.8 GM',type:'鏡頭',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e018',name:'鏡頭 SONY FE 24-70mm F4 ZA OSS',type:'鏡頭',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e019',name:'鏡頭 SONY E 18-105mm F4 G OSS',type:'鏡頭',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e020',name:'鏡頭 SONY FE 70-200mm F4 G OSS',type:'鏡頭',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e021',name:'鏡頭 SONY FE 85mm F1.8',type:'鏡頭',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e022',name:'電影鏡 SAMYANG VDSLR 24mm T1.5',type:'鏡頭',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e023',name:'電影鏡 SAMYANG VDSLR 85mm T1.5',type:'鏡頭',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e024',name:'鏡頭 CANON RF 24-105mm F4 L IS USM',type:'鏡頭',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e025',name:'鏡頭 CANON RF 70-200mm F4 L IS USM',type:'鏡頭',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e026',name:'鏡頭 CANON EF 24-105mm F4 L',type:'鏡頭',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e027',name:'鏡頭 CANON EF 70-200mm F4 L（或F2.8L）',type:'鏡頭',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e028',name:'鏡頭 SIGMA 18-250mm F3.5-6.3',type:'鏡頭',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e029',name:'可調式ND減光鏡 67mm',type:'濾鏡',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e030',name:'ND減光鏡 82mm',type:'濾鏡',qty:2,usableQty:2,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e031',name:'ND減光鏡 77mm',type:'濾鏡',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e032',name:'UV保護鏡 49mm',type:'濾鏡',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e033',name:'UV保護鏡 67mm',type:'濾鏡',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e034',name:'UV保護鏡 72mm',type:'濾鏡',qty:2,usableQty:2,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e035',name:'UV保護鏡 77mm',type:'濾鏡',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e036',name:'方型濾鏡系統套組',type:'濾鏡',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e037',name:'轉接環 CANON EF-EOS R',type:'配件',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e038',name:'圖傳 HOLLYLAND Pyros H',type:'配件',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e039',name:'無線麥克風 SONY URX-P1',type:'麥克風',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e040',name:'無線麥克風 SONY URX-P2',type:'麥克風',qty:2,usableQty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e041',name:'無線麥克風 SONY URX-P40',type:'麥克風',qty:2,usableQty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e042',name:'指向 3.5mm MIC',type:'麥克風',qty:5,usableQty:5,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e043',name:'指向 XLR MIC',type:'麥克風',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e044',name:'指向 MIC',type:'麥克風',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e045',name:'手持 MIC',type:'麥克風',qty:2,usableQty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e046',name:'一對二領夾MIC Hollyland',type:'麥克風',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e047',name:'監聽耳機',type:'麥克風',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e048',name:'聚光燈 YONGNUO YNLUX100 Pro',type:'燈光',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e049',name:'聚光燈 COB 150W LED',type:'燈光',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e050',name:'閃光燈 GODOX QT400',type:'燈光',qty:2,usableQty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e051',name:'板燈',type:'燈光',qty:6,usableQty:6,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e052',name:'燈棒 GODOX LC500',type:'燈光',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e053',name:'布幕腳架延伸桿',type:'燈光',qty:8,usableQty:8,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e054',name:'布幕腳架支架',type:'燈光',qty:2,usableQty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e055',name:'活動式綠幕',type:'燈光',qty:2,usableQty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e056',name:'背景布（深藍、淺藍）',type:'燈光',qty:2,usableQty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e057',name:'燈架 W-806B',type:'燈光',qty:4,usableQty:4,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e058',name:'燈架（3/8螺絲）',type:'燈光',qty:4,usableQty:4,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e059',name:'反折燈架（1/4螺絲）',type:'燈光',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e060',name:'三腳燈架 EI-717AT',type:'燈光',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e061',name:'燈塔雲台三角架',type:'燈光',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e062',name:'伸縮桿（3/8螺絲）',type:'燈光',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e063',name:'相機穩定器 DJI RS 4 Mini',type:'腳架',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e064',name:'穩定器 DJI RSC 2',type:'腳架',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e065',name:'三腳架 NEST NT-04',type:'腳架',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e066',name:'三腳架 LIBEC TH-650DV',type:'腳架',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e067',name:'三腳架 LIBEC TH-950',type:'腳架',qty:5,usableQty:5,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e068',name:'三腳架 WEIFENG WF-718',type:'腳架',qty:3,usableQty:3,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e069',name:'三腳架 LIBEC TH-X',type:'腳架',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e070',name:'三腳架 WEIFENG EI-525MV',type:'腳架',qty:2,usableQty:2,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e071',name:'反折三腳架 MILIBOO',type:'腳架',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e072',name:'輕便三腳架 QZSD Q620',type:'腳架',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e073',name:'輕便小腳架 WEIFENG WT-3560',type:'腳架',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e074',name:'輕便小腳架 MANFROTTO MKC3-P01',type:'腳架',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e075',name:'小腳架 SLIK SH-705E',type:'腳架',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e076',name:'小腳架 SONY BCT-R640',type:'腳架',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e077',name:'小腳架 SONY',type:'腳架',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e078',name:'油壓三腳架 SACHTLER Ace',type:'腳架',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e079',name:'搖臂組',type:'腳架',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e080',name:'滑軌 lx650',type:'腳架',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e081',name:'記憶卡 256G 170MB/s',type:'記憶卡',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:['#7'],cards:[{number:'#7',status:'available'}]},
  {id:'e082',name:'記憶卡 128G 200MB/s',type:'記憶卡',qty:7,usableQty:7,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:['#5','#6','#9','#10','#14','#18','#21'],cards:[{number:'#5',status:'available'},{number:'#6',status:'available'},{number:'#9',status:'available'},{number:'#10',status:'available'},{number:'#14',status:'available'},{number:'#18',status:'available'},{number:'#21',status:'available'}]},
  {id:'e083',name:'記憶卡 128G 170MB/s（讀取失敗）',type:'記憶卡',qty:2,usableQty:2,allow:['task'],eqStatus:'repairing',location:'',ownership:'',note:'#8,#12 讀取偶爾失敗',cardNumbers:['#8','#12'],cards:[{number:'#8',status:'repair'},{number:'#12',status:'repair'}]},
  {id:'e084',name:'記憶卡 128G 95MB/s',type:'記憶卡',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:['#11'],cards:[{number:'#11',status:'available'}]},
  {id:'e085',name:'記憶卡 64G 200MB/s',type:'記憶卡',qty:5,usableQty:5,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:['#17','#20','#22','#23','#24'],cards:[{number:'#17',status:'available'},{number:'#20',status:'available'},{number:'#22',status:'available'},{number:'#23',status:'available'},{number:'#24',status:'available'}]},
  {id:'e086',name:'記憶卡 64G 170MB/s',type:'記憶卡',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:['#4'],cards:[{number:'#4',status:'available'}]},
  {id:'e087',name:'記憶卡 64G 95MB/s',type:'記憶卡',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:['#1'],cards:[{number:'#1',status:'available'}]},
  {id:'e088',name:'相機包（大）',type:'配件',qty:3,usableQty:3,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e089',name:'相機包（中）',type:'配件',qty:6,usableQty:6,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e090',name:'相機包（小）',type:'配件',qty:5,usableQty:5,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e091',name:'動力線',type:'配件',qty:5,usableQty:5,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e092',name:'DP線',type:'配件',qty:2,usableQty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e093',name:'HDMI線',type:'配件',qty:7,usableQty:7,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e094',name:'Mini HDMI線',type:'配件',qty:3,usableQty:3,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e095',name:'HDMI線（橘）',type:'配件',qty:3,usableQty:3,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e096',name:'Micro HDMI-HDMI線（橘）',type:'配件',qty:2,usableQty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e097',name:'HDMI L頭',type:'配件',qty:1,usableQty:1,allow:['personal','event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e098',name:'HDMI線 20m',type:'配件',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e099',name:'Canon-Canon 20m',type:'配件',qty:2,usableQty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e100',name:'Canon-Canon 15m',type:'配件',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e101',name:'6.3-6.3（5m）',type:'配件',qty:2,usableQty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e102',name:'6.3-6.3（20m）',type:'配件',qty:3,usableQty:3,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e103',name:'Canon-6.3（10m）',type:'配件',qty:2,usableQty:2,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e104',name:'RCA-RCA（15m）',type:'配件',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]},
  {id:'e105',name:'RCA-3.5（15m）',type:'配件',qty:1,usableQty:1,allow:['event','task'],eqStatus:'available',location:'',ownership:'',note:'',cardNumbers:[],cards:[]}
];

const DEFAULT_PH={name:'輸入姓名',dept:'例：行銷三乙',sid:'例：D1345026',phone:'0912345678',email:'abc@gmail.com',taskName:'例：115_08_23_什麼度冬東'};
const DEFAULT_EMAIL={serviceId:'',templateId:'',pubKey:'',adminEmail:'',subject:'【器材借用】您的申請已通過審核',body:'親愛的 {{to_name}} 同學您好，\n\n您的借用申請已通過審核！\n\n器材：{{borrow_items}}\n借出：{{borrow_start}}\n歸還：{{borrow_end}}\n\n如有問題請洽管理員。',notifySubject:'【器材借用通知】新的借用申請',notifyBody:'有新的借用申請需要審核。\n\n申請人：{{to_name}}\n系級：{{dept}}\n學號：{{sid}}\n電話：{{phone}}\n申請人Email：{{email}}\n\n任務名稱：{{taskName}}\n\n借用日期：{{borrow_start}}\n歸還日期：{{borrow_end}}\n\n申請器材：\n{{borrow_items}}\n\n請至管理員後台查看並審核。',notifyTemplateId:'',resetTemplateId:'',approveTemplateId:''};
const DEFAULT_LOCATIONS=['社辦A櫃','社辦B櫃','社辦C架','倉庫'];
const DEFAULT_CAT_ORDER=['相機','攝影機','鏡頭','濾鏡','麥克風','燈光','腳架','記憶卡','配件'];

// Fresh-install gate: creating a brand-new empty database is ONLY allowed when this
// is explicitly set. In a normal Railway deploy this stays unset/false, so a missing
// or unreadable data.json can NEVER be silently treated as "first run" — it fails
// closed instead, protecting existing production data from ever being replaced by
// initialDB() by accident (a bad Volume mount, a permissions glitch, disk hiccup, etc).
const ALLOW_INITIAL_DB = process.env.ALLOW_INITIAL_DB === 'true';

function initialDB(){
  return {version:4,password:makePw(process.env.ADMIN_PASSWORD||'admin123'),
    records:[],members:[],equipment:DEFAULT_EQ,
    emailSettings:DEFAULT_EMAIL,placeholders:DEFAULT_PH,
    locations:DEFAULT_LOCATIONS,catOrder:DEFAULT_CAT_ORDER,
    resetTokens:{}};
}

function failClosed(reason, detail){
  console.error('='.repeat(64));
  console.error('FATAL: data.json missing / data persistence error');
  console.error(`Reason: ${reason}`);
  if(detail) console.error(String(detail));
  console.error(`Expected file: ${DB_FILE}`);
  console.error('Refusing to start with an empty or corrupted database — this');
  console.error('protects existing production data from being silently reset.');
  console.error('If this is genuinely a brand-new environment with no prior data,');
  console.error('set ALLOW_INITIAL_DB=true and restart to create a fresh database.');
  console.error('If data.json is corrupted, a backup may exist at data.json.bak —');
  console.error('inspect and restore it manually before restarting.');
  console.error('='.repeat(64));
  process.exit(1);
}

function readDB(){
  if(!fs.existsSync(DB_FILE)){
    if(!ALLOW_INITIAL_DB) return failClosed('data.json does not exist and ALLOW_INITIAL_DB is not set to true');
    console.log(`[readDB] No existing data.json found. ALLOW_INITIAL_DB=true — creating a fresh database at ${DB_FILE}`);
    const d=initialDB();
    writeDB(d);
    return d;
  }

  let raw;
  try{
    raw=fs.readFileSync(DB_FILE,'utf8');
  }catch(e){
    return failClosed('failed to read data.json (permissions or I/O error)', e);
  }

  let d;
  try{
    d=JSON.parse(raw);
  }catch(e){
    return failClosed('failed to parse data.json as JSON (file may be corrupted or truncated)', e);
  }

  try{
    // Non-destructive migrations: ONLY fill in fields that are genuinely absent
    // (undefined). Never treat an admin's intentionally-set falsy value (0, '',
    // false, an emptied array/object) as "missing" and overwrite it with a default —
    // that would silently discard real configuration the admin already saved.
    if(!d.locations) d.locations=DEFAULT_LOCATIONS;
    if(!d.catOrder)  d.catOrder=DEFAULT_CAT_ORDER;
    if(!d.placeholders) d.placeholders=DEFAULT_PH;
    if(d.placeholders.taskName===undefined) d.placeholders.taskName=DEFAULT_PH.taskName;
    if(!d.emailSettings) d.emailSettings=DEFAULT_EMAIL;
    if(d.emailSettings.adminEmail===undefined) d.emailSettings.adminEmail='';
    if(d.emailSettings.notifySubject===undefined) d.emailSettings.notifySubject=DEFAULT_EMAIL.notifySubject;
    if(d.emailSettings.notifyBody===undefined) d.emailSettings.notifyBody=DEFAULT_EMAIL.notifyBody;
    if(d.emailSettings.notifyTemplateId===undefined) d.emailSettings.notifyTemplateId='';
    if(d.emailSettings.resetTemplateId===undefined) d.emailSettings.resetTemplateId='';
    if(d.emailSettings.approveTemplateId===undefined) d.emailSettings.approveTemplateId='';
    if(!d.resetTokens) d.resetTokens={};
    // Migrate equipment: add usableQty, cards, keep cardNumbers for compatibility.
    // migrateEquipment() itself only fills genuinely-missing sub-fields (see its own
    // null/undefined check for usableQty — 0 is preserved as a valid, intentional value).
    if(d.equipment) d.equipment=d.equipment.map(migrateEquipment);
    // Migrate members: isOfficer defaults to false only when the field is absent —
    // spread order (...m last) means an existing true/false value always wins.
    if(d.members) d.members=d.members.map(m=>({isOfficer:false,...m}));
    // Migrate records: same absent-field-only pattern.
    if(d.records) d.records=d.records.map(r=>({
      returnedItems:[],collabs:[],taskName:'',...r,
      equipment:(r.equipment||[]).map(e=>({assignedCards:[],...e}))
    }));
  }catch(e){
    return failClosed('migration step threw an unexpected error while processing data.json', e);
  }

  // Safe startup diagnostic — counts only, never PII (no names/phone/email/sid).
  console.log(`[readDB] DATA_FILE=${DB_FILE}`);
  console.log(`[readDB] records=${(d.records||[]).length} members=${(d.members||[]).length} equipment=${(d.equipment||[]).length}`);
  return d;
}

function writeDB(d){
  const tmp=DB_FILE+'.tmp';
  const bak=DB_FILE+'.bak';
  // Back up the current file before it gets overwritten. If the backup itself
  // fails, abort the write entirely rather than risk losing the only good copy —
  // the existing data.json is left completely untouched in that case.
  if(fs.existsSync(DB_FILE)){
    try{
      fs.copyFileSync(DB_FILE,bak);
    }catch(e){
      console.error('='.repeat(64));
      console.error('ERROR: failed to create data.json.bak before writing — aborting this write.');
      console.error('The existing data.json has NOT been modified.');
      console.error(String(e));
      console.error('='.repeat(64));
      throw e;
    }
  }
  fs.writeFileSync(tmp,JSON.stringify(d,null,2),'utf8');
  fs.renameSync(tmp,DB_FILE); // atomic — data.json is only ever replaced in one step
}

let db=readDB();

// ── Sessions ──
const sessions=new Map();
function cleanupSessions(){const now=Date.now();for(const[k,v]of sessions)if(v<now)sessions.delete(k);}
setInterval(cleanupSessions,30*60*1000).unref();

function parseCookies(req){
  const out={};
  (req.headers.cookie||'').split(';').forEach(x=>{
    const i=x.indexOf('=');if(i>0)out[x.slice(0,i).trim()]=decodeURIComponent(x.slice(i+1).trim());
  });
  return out;
}
function isAdmin(req){const t=parseCookies(req).sid;return!!(t&&sessions.get(t)>Date.now());}
function setSession(res){
  const token=crypto.randomBytes(32).toString('hex');
  sessions.set(token,Date.now()+SESSION_TTL);
  const secure=process.env.NODE_ENV==='production'?'; Secure':'';
  res.setHeader('Set-Cookie',`sid=${token}; HttpOnly; Path=/; SameSite=Lax${secure}`);
}
function clearSession(req,res){
  const t=parseCookies(req).sid;if(t)sessions.delete(t);
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

// ── Public records (strip private contact info) ──
function publicRecords(){
  return db.records.map(r=>({
    id:r.id,start:r.start,end:r.end,
    equipment:(r.equipment||[]).map(e=>({id:e.id,qty:e.qty,name:e.name,assignedCards:e.assignedCards||[]})),
    status:r.status,returnedItems:r.returnedItems||[],
    cat:r.cat,createdAt:r.createdAt,taskName:r.taskName||''
  }));
}

// ── Officer check (name + sid + phone all match) ──
function checkOfficer(name,sid,phone){
  const m=db.members.find(x=>x.name===name&&x.sid===sid&&x.phone===phone);
  return !!(m&&m.isOfficer);
}
function effectiveAllow(cat,isOfficer){
  if(isOfficer&&cat==='personal')return'task';
  return cat;
}

// ── getOccupied: qty in use for eqId in time window ──
function getOccupied(eqId,start,end,excludeId){
  const s=start?new Date(start):null,e=end?new Date(end):null;
  return db.records.filter(r=>{
    if(r.id===excludeId)return false;
    if(r.status==='pending'||r.status==='done')return false;
    const returned=r.returnedItems||[];
    const item=(r.equipment||[]).find(x=>x.id===eqId);
    if(!item)return false;
    if(returned.includes(item.id+'__'+item.qty))return false;
    if(s&&e){const rs=new Date(r.start),re=new Date(r.end);if(!(rs<e&&re>s))return false;}
    return true;
  }).reduce((sum,r)=>{
    const item=(r.equipment||[]).find(x=>x.id===eqId);
    return sum+(item?item.qty:0);
  },0);
}

// ── getBusyCards: cards in use for eqId in time window ──
function getBusyCards(eqId,start,end,excludeId){
  const s=start?new Date(start):null;
  const e=end?new Date(end):null;
  const busy=new Set();
  db.records.forEach(r=>{
    if(r.id===excludeId)return;
    if(r.status==='done'||r.status==='pending')return;
    const item=(r.equipment||[]).find(x=>x.id===eqId);
    if(!item)return;
    if((r.returnedItems||[]).includes(item.id+'__'+item.qty))return;
    if(s&&e){const rs=new Date(r.start),re=new Date(r.end);if(!(rs<e&&re>s))return;}
    (item.assignedCards||[]).forEach(c=>{if(c)busy.add(c);});
  });
  return busy;
}

// ── Validate cards for a borrow item ──
// Memory cards are independent physical assets: borrowing qty N of a memory-card
// equipment REQUIRES exactly N specific, valid card numbers — "unspecified" is not
// a valid final state. requestedCards should be the raw array (same length as qty);
// empty slots are treated as missing and reported as errors.
// "Unspecified" is a legitimate, permanent final state for a memory-card slot —
// a member may submit with zero cards chosen, and an admin may later fill in some
// or all of them. Whatever IS specified (0 to qty cards) is fully validated; only
// the total count is capped at qty (cannot exceed what was actually borrowed).
function validateCards(eq,requestedCards,qty,start,end,excludeId){
  const errors=[];
  if(!eq||(eq.cards||[]).length===0) return errors; // not a memory-card item — nothing to validate
  const nonEmpty=(requestedCards||[]).filter(Boolean);
  if(nonEmpty.length>qty){
    errors.push(`指定卡號數量（${nonEmpty.length}）超過借用數量（${qty}）`);
  }
  const cardMap=new Map((eq.cards||[]).map(c=>[c.number,c]));
  for(const cn of nonEmpty){
    const card=cardMap.get(cn);
    if(!card){errors.push(`卡號 ${cn} 不存在`);continue;}
    if(card.status!=='available'){errors.push(`卡號 ${cn} 狀態為${card.status}，不可借用`);}
  }
  // Duplicates within this same borrow item
  const unique=new Set(nonEmpty);
  if(unique.size!==nonEmpty.length)errors.push('同一筆借用中卡號不可重複選擇');
  // Time conflict with other active records
  const busy=getBusyCards(eq.id,start,end,excludeId);
  const conflicts=nonEmpty.filter(c=>busy.has(c));
  if(conflicts.length)errors.push(`卡號 ${conflicts.join('、')} 此時段已被借用`);
  return errors;
}

// Whole-array card-consistency check, used to guard the generic bulk endpoint
// (PUT /api/admin/state/records) so it can never be used to bypass the same
// card rules enforced by the dedicated record-editing endpoints. Returns the
// first error message found, or null if the proposed array is internally consistent.
function validateRecordsArray(recordsArr){
  if(!Array.isArray(recordsArr)) return '資料格式錯誤';
  // Per-item structural checks: existence, status, no duplicate within the same item,
  // and count never exceeding qty. "Unspecified" cards are always allowed.
  for(const r of recordsArr){
    for(const item of (r.equipment||[])){
      const eq=db.equipment.find(e=>e.id===item.id);
      if(!eq||(eq.cards||[]).length===0) continue;
      const cards=(item.assignedCards||[]).filter(Boolean);
      if(cards.length>item.qty) return `${eq.name} 指定卡號數量（${cards.length}）超過借用數量（${item.qty}）`;
      if(new Set(cards).size!==cards.length) return `${eq.name} 同一筆借用中卡號不可重複選擇`;
      const cardMap=new Map((eq.cards||[]).map(c=>[c.number,c]));
      for(const cn of cards){
        const card=cardMap.get(cn);
        if(!card) return `${eq.name} 卡號 ${cn} 不存在`;
        if(card.status!=='available') return `${eq.name} 卡號 ${cn} 狀態為${card.status}，不可借用`;
      }
    }
  }
  // Cross-record time-window conflict check. For EACH record's own card assignment
  // (regardless of that record's own status — a still-pending request's chosen card
  // still must not collide with someone else's active booking), check for overlap
  // against every OTHER record that is currently active (not pending/done, and not
  // already fully returned for that item) — mirrors getBusyCards()'s exclude-self,
  // ignore-pending/done semantics used by the dedicated single-record endpoints.
  for(const r of recordsArr){
    for(const item of (r.equipment||[])){
      const eq=db.equipment.find(e=>e.id===item.id);
      if(!eq||(eq.cards||[]).length===0) continue;
      const cards=(item.assignedCards||[]).filter(Boolean);
      if(!cards.length) continue;
      for(const other of recordsArr){
        if(other.id===r.id) continue;
        if(other.status==='pending'||other.status==='done') continue;
        const otherItem=(other.equipment||[]).find(x=>x.id===item.id);
        if(!otherItem) continue;
        if((other.returnedItems||[]).includes(otherItem.id+'__'+otherItem.qty)) continue;
        const otherCards=(otherItem.assignedCards||[]).filter(Boolean);
        const overlap=cards.filter(c=>otherCards.includes(c));
        if(!overlap.length) continue;
        const rs=new Date(r.start),re=new Date(r.end),os=new Date(other.start),oe=new Date(other.end);
        if(rs<oe&&re>os) return `${eq.name} 卡號 ${overlap.join('、')} 與其他借用時段衝突`;
      }
    }
  }
  return null;
}

// ── EmailJS notification via HTTP to EmailJS REST API ──
// We call EmailJS REST API directly from server to send admin notification
function sendEmailJSRaw(settings,templateParams,templateId){
  const tid=templateId||settings.templateId;
  // Validate against the template actually being used, not just the base "approval" templateId —
  // this way notify/reset emails work even if they use their own dedicated template.
  if(!settings.serviceId||!tid||!settings.pubKey) return;
  const payload=JSON.stringify({
    service_id:settings.serviceId,
    template_id:tid,
    user_id:settings.pubKey,
    template_params:templateParams
  });
  try{
    const https=require('https');
    const opts={hostname:'api.emailjs.com',path:'/api/v1.0/email/send',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload),'origin':'http://localhost'}};
    const req2=https.request(opts,res2=>{
      let body='';res2.on('data',d=>body+=d);
      res2.on('end',()=>{if(res2.statusCode>=400)console.error('EmailJS error:',res2.statusCode,body);});
    });
    req2.on('error',e=>console.error('EmailJS request error:',e));
    req2.write(payload);req2.end();
  }catch(e){console.error('sendEmailJS error:',e);}
}

function sendAdminNotify(rec){
  const s=db.emailSettings||{};
  if(!s.serviceId||!s.pubKey||!s.adminEmail) return;
  const eqLines=(rec.equipment||[]).map(e=>{
    const cards=(e.assignedCards||[]).filter(Boolean);
    return e.name+' ×'+e.qty+(cards.length?' ['+cards.join(',')+']':'');
  }).join('\n');
  const body=(s.notifyBody||DEFAULT_EMAIL.notifyBody)
    .replace(/{{to_name}}/g,rec.name)
    .replace(/{{dept}}/g,rec.dept||'')
    .replace(/{{sid}}/g,rec.sid||'')
    .replace(/{{phone}}/g,rec.phone||'')
    .replace(/{{email}}/g,rec.email||'')
    .replace(/{{taskName}}/g,rec.taskName||'（無）')
    .replace(/{{borrow_start}}/g,rec.start||'')
    .replace(/{{borrow_end}}/g,rec.end||'')
    .replace(/{{borrow_items}}/g,eqLines);
  sendEmailJSRaw(s,{
    to_email:s.adminEmail,
    to_name:'管理員',
    subject:s.notifySubject||DEFAULT_EMAIL.notifySubject,
    message:body,
    borrow_items:eqLines,
    borrow_start:rec.start||'',
    borrow_end:rec.end||''
  },s.notifyTemplateId||s.templateId);
}

// Derive the public base URL for links sent in emails (password reset, etc).
// Priority: explicit APP_URL env var > request's forwarded/host headers.
// Never falls back to localhost — if genuinely undeterminable, uses a relative-safe placeholder.
function getBaseUrl(req){
  if(process.env.APP_URL) return process.env.APP_URL.replace(/\/$/,'');
  const proto=(req.headers['x-forwarded-proto']||'').split(',')[0].trim()
    || (req.socket&&req.socket.encrypted?'https':'http');
  const host=(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  if(host) return `${proto}://${host}`;
  // Last resort: relative path (browsers will resolve it against the current origin when clicked from webmail preview it may not work, but this only triggers if the request truly carries no Host header, which practically never happens)
  return '';
}

const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://localhost');
    const p=u.pathname,m=req.method;

    // ── Static ──
    if(m==='GET'&&(p==='/'||p==='/index.html'))return fs.createReadStream(path.join(ROOT,'index.html')).pipe(res);
    if(m==='GET'&&p==='/admin')return fs.createReadStream(path.join(ROOT,'admin.html')).pipe(res);
    if(m==='GET'&&p==='/api/health')return json(res,200,{ok:true,records:db.records.length,members:db.members.length,equipment:db.equipment.length});

    // ── Public placeholders ──
    if(m==='GET'&&p==='/api/public-placeholders'){
      const def=DEFAULT_PH,ph=db.placeholders||{};
      return json(res,200,{name:ph.name||def.name,dept:ph.dept||def.dept,sid:ph.sid||def.sid,phone:ph.phone||def.phone,email:ph.email||def.email,taskName:ph.taskName||def.taskName});
    }

    // ── Public state ──
    // NOTE: does NOT expose officer names/sid/phone. Officer status is checked
    // per-person via POST /api/member/check-officer so anonymous visitors can
    // never harvest the full officer roster's personal data.
    if(m==='GET'&&p==='/api/public-state'){
      return json(res,200,{
        equipment:db.equipment,
        records:publicRecords(),
        placeholders:db.placeholders,
        locations:db.locations,
        catOrder:db.catOrder
      });
    }

    // ── Public: check if a specific person (by exact name+sid+phone match) is an officer ──
    // Returns ONLY a boolean — never the officer roster, never any member's stored data.
    if(m==='POST'&&p==='/api/member/check-officer'){
      const b=await bodyJSON(req);
      const name=String(b.name||'').trim(),sid=String(b.sid||'').trim(),phone=String(b.phone||'').trim();
      if(!name||!sid||!phone)return json(res,200,{ok:true,isOfficer:false});
      return json(res,200,{ok:true,isOfficer:checkOfficer(name,sid,phone)});
    }

    // ── Admin login ──
    if(m==='POST'&&p==='/api/admin/login'){
      const b=await bodyJSON(req);
      if(!verifyPw(String(b.password||''),db.password))return json(res,401,{error:'密碼錯誤'});
      setSession(res);return json(res,200,{ok:true});
    }

    // ── Admin logout ──
    if(m==='POST'&&p==='/api/admin/logout'){clearSession(req,res);return json(res,200,{ok:true});}

    // ── Admin check session ──
    if(m==='GET'&&p==='/api/admin/check')return json(res,200,{ok:isAdmin(req)});

    // ── Forgot password: request reset ──
    if(m==='POST'&&p==='/api/admin/forgot-password'){
      const b=await bodyJSON(req);
      const email=String(b.email||'').trim();
      // Always return success to avoid info leakage
      const adminEmail=(db.emailSettings||{}).adminEmail||'';
      if(email&&email===adminEmail&&db.emailSettings.serviceId&&db.emailSettings.pubKey){
        const token=crypto.randomBytes(32).toString('hex');
        const expires=Date.now()+1000*60*30; // 30 min
        if(!db.resetTokens)db.resetTokens={};
        db.resetTokens[token]={expires,used:false};
        writeDB(db);
        const base=getBaseUrl(req);
        const resetUrl=(base?base:'')+'/admin?reset='+token;
        sendEmailJSRaw(db.emailSettings,{
          to_email:email,to_name:'管理員',
          subject:'【器材借用】密碼重設',
          message:`請點擊以下連結重設密碼（30分鐘內有效，使用一次後失效）：\n\n${resetUrl}\n\n如果您沒有要求重設密碼，請忽略此封信件。`
        },db.emailSettings.resetTemplateId||db.emailSettings.templateId);
      }
      return json(res,200,{ok:true,message:'如果信箱正確，您將收到密碼重設信件。'});
    }

    // ── Forgot password: verify token ──
    if(m==='POST'&&p==='/api/admin/verify-reset-token'){
      const b=await bodyJSON(req);
      const token=String(b.token||'');
      const rec=(db.resetTokens||{})[token];
      if(!rec||rec.used||rec.expires<Date.now())return json(res,400,{error:'連結無效或已過期'});
      return json(res,200,{ok:true});
    }

    // ── Forgot password: do reset ──
    if(m==='POST'&&p==='/api/admin/reset-password'){
      const b=await bodyJSON(req);
      const token=String(b.token||'');
      const newPw=String(b.newPassword||'');
      const rec=(db.resetTokens||{})[token];
      if(!rec||rec.used||rec.expires<Date.now())return json(res,400,{error:'連結無效或已過期'});
      if(newPw.length<4)return json(res,400,{error:'新密碼至少 4 碼'});
      db.password=makePw(newPw);
      db.resetTokens[token].used=true;
      writeDB(db);
      return json(res,200,{ok:true});
    }

    // ── Admin full state ──
    if(m==='GET'&&p==='/api/admin/state'){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      return json(res,200,{records:db.records,members:db.members,equipment:db.equipment,emailSettings:db.emailSettings,placeholders:db.placeholders,locations:db.locations,catOrder:db.catOrder});
    }

    // ── Admin bulk update any top-level key ──
    if(m==='PUT'&&p.startsWith('/api/admin/state/')){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const key=decodeURIComponent(p.split('/').pop());
      const b=await bodyJSON(req);
      // 'records' is intentionally NOT in this list. Every record mutation now goes
      // through a dedicated single-id endpoint (PUT/PATCH/POST/DELETE .../records/:id...)
      // which reads and writes exactly one record — never the whole array. This
      // generic bulk endpoint can therefore no longer be used, accidentally or
      // otherwise, to overwrite the entire records collection with a stale copy.
      const allowed=['members','equipment','emailSettings','placeholders','locations','catOrder'];
      if(!allowed.includes(key))return json(res,400,{error:'不允許的欄位'});
      db[key]=b.value;writeDB(db);return json(res,200,{ok:true});
    }

    // ── Admin change password ──
    if(m==='POST'&&p==='/api/admin/password'){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const b=await bodyJSON(req);
      if(!verifyPw(String(b.oldPassword||''),db.password))return json(res,400,{error:'目前密碼不正確'});
      if(String(b.newPassword||'').length<4)return json(res,400,{error:'新密碼至少 4 碼'});
      db.password=makePw(String(b.newPassword));writeDB(db);return json(res,200,{ok:true});
    }

    // ── Admin: rename location (sync equipment) ──
    if(m==='POST'&&p==='/api/admin/locations/rename'){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const b=await bodyJSON(req);
      const oldName=String(b.oldName||'').trim(),newName=String(b.newName||'').trim();
      if(!oldName||!newName)return json(res,400,{error:'位置名稱不可為空'});
      // Prevent renaming into a name that already exists elsewhere (would create duplicate locations)
      if(newName!==oldName&&db.locations.includes(newName)){
        return json(res,409,{error:`位置「${newName}」已經存在，請使用其他名稱，或直接刪除舊位置改用現有位置。`});
      }
      // Rename in locations array
      const li=db.locations.indexOf(oldName);
      if(li>=0)db.locations[li]=newName;
      // Sync all equipment using this location
      let count=0;
      db.equipment.forEach(e=>{if(e.location===oldName){e.location=newName;count++;}});
      writeDB(db);return json(res,200,{ok:true,syncedEquipment:count});
    }

    // ── Admin: delete location (check equipment first) ──
    if(m==='POST'&&p==='/api/admin/locations/delete'){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const b=await bodyJSON(req);
      const locName=String(b.name||'').trim();
      const using=db.equipment.filter(e=>e.location===locName);
      // Hard rule: a location in use can never be deleted, no force-override.
      // Admin must reassign every affected equipment's location first.
      if(using.length>0)return json(res,409,{error:`目前有 ${using.length} 件器材使用此位置，請先重新指定這些器材的位置後再刪除。`,using:using.map(e=>e.name)});
      db.locations=db.locations.filter(l=>l!==locName);
      writeDB(db);return json(res,200,{ok:true});
    }

    // ── Admin: full edit a record ──
    if(m==='PUT'&&p.match(/^\/api\/admin\/records\/[^/]+$/)){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const recId=p.split('/')[4];
      const b=await bodyJSON(req);
      const idx=db.records.findIndex(r=>r.id===recId);
      if(idx===-1)return json(res,404,{error:'紀錄不存在'});
      if(!b.name||!b.dept||!b.sid||!b.phone||!b.email)return json(res,400,{error:'借用人資料不完整'});
      if(!b.cat||!['personal','event','task'].includes(b.cat))return json(res,400,{error:'借用類別無效'});
      if(b.cat==='task'&&!String(b.taskName||'').trim())return json(res,400,{error:'社內任務必須填寫任務名稱'});
      if(!b.start||!b.end)return json(res,400,{error:'時間不完整'});
      if(new Date(b.end)<=new Date(b.start))return json(res,400,{error:'歸還時間必須晚於借出時間'});
      if(!Array.isArray(b.equipment)||!b.equipment.length)return json(res,400,{error:'至少需要一項器材'});

      for(const item of b.equipment){
        const eq=db.equipment.find(e=>e.id===item.id);
        if(!eq)return json(res,400,{error:`器材不存在：${item.id}`});
        const qty=Number(item.qty);
        if(!Number.isInteger(qty)||qty<1)return json(res,400,{error:`器材數量無效：${eq.name}`});
        if(qty>eq.qty)return json(res,400,{error:`${eq.name} 數量 ${qty} 超過總數 ${eq.qty}`});
        // usableQty check
        const usableQty=(eq.usableQty??eq.qty);
        const occupied=getOccupied(eq.id,b.start,b.end,recId);
        if(occupied+qty>usableQty)return json(res,400,{error:`${eq.name} 此時段可借上限 ${usableQty}，已借出 ${occupied}，本次需要 ${qty}`});
        // Card validation — mandatory: memory-card items must have exactly `qty` valid cards specified
        if((eq.cards||[]).length>0){
          const errs=validateCards(eq,item.assignedCards||[],qty,b.start,b.end,recId);
          if(errs.length)return json(res,400,{error:`${eq.name}：${errs.join('；')}`});
        }
      }

      const old=db.records[idx];
      const updated={
        ...old,
        name:String(b.name).trim(),dept:String(b.dept).trim(),sid:String(b.sid).trim(),
        phone:String(b.phone).trim(),email:String(b.email).trim(),cat:b.cat,
        taskName:String(b.taskName||'').trim(),start:b.start,end:b.end,
        note:String(b.note||'').trim(),
        equipment:b.equipment.map(e=>({
          id:e.id,qty:Number(e.qty),
          name:e.name||(db.equipment.find(x=>x.id===e.id)||{name:e.id}).name,
          assignedCards:Array.isArray(e.assignedCards)?e.assignedCards.filter(Boolean):[],
        })),
        returnedItems:(()=>{
          const raw=Array.isArray(b.returnedItems)?b.returnedItems:old.returnedItems||[];
          const validKeys=new Set((b.equipment||[]).map(e=>e.id+'__'+Number(e.qty)));
          return raw.filter(k=>validKeys.has(k));
        })(),
        updatedAt:new Date().toISOString()
      };
      if(updated.returnedItems.length>0){
        const allEq=updated.equipment||[];
        if(allEq.length>0&&allEq.every(e=>updated.returnedItems.includes(e.id+'__'+e.qty))){
          updated.status='done';
          if(!updated.returnedAt)updated.returnedAt=new Date().toISOString();
        }
      }
      db.records[idx]=updated;writeDB(db);
      return json(res,200,{ok:true,record:updated,publicRecords:publicRecords()});
    }

    // ── Admin: update assigned cards ──
    if(m==='PATCH'&&p.match(/^\/api\/admin\/records\/[^/]+\/cards$/)){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const recId=p.split('/')[4];
      const b=await bodyJSON(req);
      const rec=db.records.find(r=>r.id===recId);
      if(!rec)return json(res,404,{error:'紀錄不存在'});
      const item=(rec.equipment||[]).find(e=>e.id===b.eqId);
      if(!item)return json(res,404,{error:'器材不存在於此紀錄'});
      const eq=db.equipment.find(e=>e.id===b.eqId);
      if(eq&&(eq.cards||[]).length>0){
        // "不指定" is valid — whatever IS specified (0 to item.qty cards) is fully validated
        const errs=validateCards(eq,b.assignedCards||[],item.qty,rec.start,rec.end,recId);
        if(errs.length)return json(res,400,{error:errs.join('；')});
      }
      item.assignedCards=Array.isArray(b.assignedCards)?b.assignedCards.filter(Boolean):[];
      writeDB(db);return json(res,200,{ok:true,record:rec});
    }

    // ── Admin: approve a single record by id (server computes the task-count bump —
    //    never trusts a client-supplied members array) ──
    if(m==='POST'&&p.match(/^\/api\/admin\/records\/[^/]+\/approve$/)){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const recId=p.split('/')[4];
      const rec=db.records.find(r=>r.id===recId);
      if(!rec)return json(res,404,{error:'紀錄不存在'});
      rec.status='approved';
      if(rec.cat==='task'){
        const mem=db.members.find(x=>x.sid===rec.sid||x.name===rec.name);
        if(mem) mem.taskCount=(mem.taskCount||0)+1;
      }
      writeDB(db);
      return json(res,200,{ok:true,record:rec});
    }

    // ── Admin: reject (delete) a single pending record by id ──
    if(m==='POST'&&p.match(/^\/api\/admin\/records\/[^/]+\/reject$/)){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const recId=p.split('/')[4];
      const idx=db.records.findIndex(r=>r.id===recId);
      if(idx===-1)return json(res,404,{error:'紀錄不存在'});
      db.records.splice(idx,1);
      writeDB(db);
      return json(res,200,{ok:true,deletedId:recId});
    }

    // ── Admin: delete a single record by id (any status) ──
    if(m==='DELETE'&&p.match(/^\/api\/admin\/records\/[^/]+$/)){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const recId=p.split('/')[4];
      const idx=db.records.findIndex(r=>r.id===recId);
      if(idx===-1)return json(res,404,{error:'紀錄不存在'});
      db.records.splice(idx,1);
      writeDB(db);
      return json(res,200,{ok:true,deletedId:recId});
    }

    // ── Admin: register full or partial return for a single record by id ──
    if(m==='POST'&&p.match(/^\/api\/admin\/records\/[^/]+\/return$/)){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const recId=p.split('/')[4];
      const b=await bodyJSON(req);
      const rec=db.records.find(r=>r.id===recId);
      if(!rec)return json(res,404,{error:'紀錄不存在'});
      if(b.all){
        rec.returnedItems=(rec.equipment||[]).map(e=>e.id+'__'+e.qty);
        rec.status='done';
        rec.returnedAt=new Date().toISOString();
      }else{
        const validKeys=new Set((rec.equipment||[]).map(e=>e.id+'__'+e.qty));
        const addKeys=(Array.isArray(b.returnedKeys)?b.returnedKeys:[]).filter(k=>validKeys.has(k));
        if(!addKeys.length)return json(res,400,{error:'請至少勾選一項尚未歸還的器材'});
        rec.returnedItems=[...new Set([...(rec.returnedItems||[]),...addKeys])];
        const allEq=rec.equipment||[];
        if(allEq.length>0&&allEq.every(e=>rec.returnedItems.includes(e.id+'__'+e.qty))){
          rec.status='done';
          if(!rec.returnedAt) rec.returnedAt=new Date().toISOString();
        }
      }
      if(b.note!==undefined) rec.returnNote=String(b.note||'').trim();
      writeDB(db);
      return json(res,200,{ok:true,record:rec});
    }

    // ── Admin: replace the equipment list of a single record by id (used by the
    //    "修改借用器材" add/remove-item modal). Re-validates qty/usableQty/cards the
    //    same way the full-edit endpoint does, and rebuilds returnedItems to only
    //    keep keys that still match the new equipment set. ──
    if(m==='PATCH'&&p.match(/^\/api\/admin\/records\/[^/]+\/equipment$/)){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const recId=p.split('/')[4];
      const b=await bodyJSON(req);
      const rec=db.records.find(r=>r.id===recId);
      if(!rec)return json(res,404,{error:'紀錄不存在'});
      if(!Array.isArray(b.equipment))return json(res,400,{error:'器材清單格式錯誤'});

      for(const item of b.equipment){
        const eq=db.equipment.find(e=>e.id===item.id);
        if(!eq)return json(res,400,{error:`器材不存在：${item.id}`});
        const qty=Number(item.qty);
        if(!Number.isInteger(qty)||qty<1)return json(res,400,{error:`器材數量無效：${eq.name}`});
        if(qty>eq.qty)return json(res,400,{error:`${eq.name} 數量 ${qty} 超過總數 ${eq.qty}`});
        const usableQty=(eq.usableQty??eq.qty);
        const occupied=getOccupied(eq.id,rec.start,rec.end,recId);
        if(occupied+qty>usableQty)return json(res,400,{error:`${eq.name} 此時段可借上限 ${usableQty}，已借出 ${occupied}，本次需要 ${qty}`});
        if((eq.cards||[]).length>0){
          const errs=validateCards(eq,item.assignedCards||[],qty,rec.start,rec.end,recId);
          if(errs.length)return json(res,400,{error:`${eq.name}：${errs.join('；')}`});
        }
      }

      rec.equipment=b.equipment.map(e=>({
        id:e.id,qty:Number(e.qty),
        name:e.name||(db.equipment.find(x=>x.id===e.id)||{name:e.id}).name,
        assignedCards:Array.isArray(e.assignedCards)?e.assignedCards.filter(Boolean):[]
      }));
      const validKeys=new Set(rec.equipment.map(e=>e.id+'__'+e.qty));
      rec.returnedItems=(rec.returnedItems||[]).filter(k=>validKeys.has(k));
      writeDB(db);
      return json(res,200,{ok:true,record:rec});
    }

    // ── Admin: create a new member (single-item — never touches other members) ──
    if(m==='POST'&&p==='/api/admin/members'){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const b=await bodyJSON(req);
      const name=String(b.name||'').trim();
      if(!name)return json(res,400,{error:'請輸入姓名'});
      if(db.members.find(x=>x.name===name))return json(res,400,{error:'此姓名已存在'});
      const mem={
        id:'m'+Date.now(),
        name,
        dept:String(b.dept||'').trim(),
        sid:String(b.sid||'').trim(),
        phone:String(b.phone||'').trim(),
        email:String(b.email||'').trim(),
        isOfficer:!!b.isOfficer,
        taskCount:0
      };
      db.members.push(mem);
      writeDB(db);
      return json(res,200,{ok:true,member:mem});
    }

    // ── Admin: full edit of one member by id ──
    if(m==='PUT'&&p.match(/^\/api\/admin\/members\/[^/]+$/)){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const memId=p.split('/')[4];
      const b=await bodyJSON(req);
      const mem=db.members.find(x=>x.id===memId);
      if(!mem)return json(res,404,{error:'社員不存在'});
      const name=String(b.name||'').trim();
      if(!name)return json(res,400,{error:'請輸入姓名'});
      if(db.members.find(x=>x.id!==memId&&x.name===name))return json(res,400,{error:'此姓名已存在'});
      mem.name=name;
      mem.dept=String(b.dept||'').trim();
      mem.sid=String(b.sid||'').trim();
      mem.phone=String(b.phone||'').trim();
      mem.email=String(b.email||'').trim();
      mem.isOfficer=!!b.isOfficer;
      writeDB(db);
      return json(res,200,{ok:true,member:mem});
    }

    // ── Admin: delete one member by id ──
    if(m==='DELETE'&&p.match(/^\/api\/admin\/members\/[^/]+$/)){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const memId=p.split('/')[4];
      const idx=db.members.findIndex(x=>x.id===memId);
      if(idx===-1)return json(res,404,{error:'社員不存在'});
      db.members.splice(idx,1);
      writeDB(db);
      return json(res,200,{ok:true,deletedId:memId});
    }

    // ── Admin: set/unset officer status for one member by id ──
    if(m==='POST'&&p.match(/^\/api\/admin\/members\/[^/]+\/officer$/)){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const memId=p.split('/')[4];
      const b=await bodyJSON(req);
      const mem=db.members.find(x=>x.id===memId);
      if(!mem)return json(res,404,{error:'社員不存在'});
      mem.isOfficer=!!b.isOfficer;
      writeDB(db);
      return json(res,200,{ok:true,member:mem});
    }

    // ── Admin: adjust one member's taskCount by a delta (+1 / -1), floored at 0 ──
    if(m==='POST'&&p.match(/^\/api\/admin\/members\/[^/]+\/task-count$/)){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const memId=p.split('/')[4];
      const b=await bodyJSON(req);
      const mem=db.members.find(x=>x.id===memId);
      if(!mem)return json(res,404,{error:'社員不存在'});
      const delta=Number(b.delta)||0;
      mem.taskCount=Math.max(0,(mem.taskCount||0)+delta);
      writeDB(db);
      return json(res,200,{ok:true,member:mem});
    }

    // ── Admin: redeem 3 task-count for 1 personal-borrow credit, for one member ──
    if(m==='POST'&&p.match(/^\/api\/admin\/members\/[^/]+\/redeem$/)){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const memId=p.split('/')[4];
      const mem=db.members.find(x=>x.id===memId);
      if(!mem)return json(res,404,{error:'社員不存在'});
      if((mem.taskCount||0)<3)return json(res,400,{error:'任務場次不足 3 場，無法兌換'});
      mem.taskCount-=3;
      writeDB(db);
      return json(res,200,{ok:true,member:mem});
    }

    // ── Member submit borrow ──
    if(m==='POST'&&p==='/api/member/submit'){
      const b=await bodyJSON(req);
      const required=['name','dept','sid','phone','email','cat','start','end'];
      if(required.some(k=>!String(b[k]||'').trim()))return json(res,400,{error:'資料不完整'});
      if(new Date(b.end)<=new Date(b.start))return json(res,400,{error:'借用時間不正確'});
      if(!Array.isArray(b.equipment)||!b.equipment.length)return json(res,400,{error:'至少選擇一項器材'});
      if(b.cat==='task'&&!String(b.taskName||'').trim())return json(res,400,{error:'社內任務必須填寫任務名稱'});

      const isOfficer=checkOfficer(String(b.name).trim(),String(b.sid).trim(),String(b.phone).trim());
      const effCat=effectiveAllow(b.cat,isOfficer);
      const errors=[];

      for(const item of b.equipment){
        const eq=db.equipment.find(e=>e.id===item.id);
        if(!eq){errors.push('器材不存在');continue;}
        if(eq.eqStatus==='disabled'){errors.push(eq.name+'（停用）');continue;}
        if(!(eq.allow||[]).includes(effCat)){errors.push(eq.name+'（此類別不可借）');continue;}
        // usableQty server-side check
        const usableQty=(eq.usableQty??eq.qty);
        const occupied=getOccupied(eq.id,b.start,b.end,null);
        if(occupied+item.qty>usableQty){errors.push(`${eq.name} 此時段可借上限 ${usableQty}，已借出 ${occupied}`);continue;}
        // Card validation — mandatory: memory-card equipment requires exactly item.qty
        // valid, available, non-conflicting cards. Missing/partial assignment is now an error,
        // not silently accepted.
        if((eq.cards||[]).length>0){
          const errs=validateCards(eq,item.assignedCards||[],item.qty,b.start,b.end,null);
          errs.forEach(e=>errors.push(eq.name+'：'+e));
        }
      }
      if(errors.length)return json(res,400,{error:'以下器材不可借用：'+errors.join('、')});

      const rec={
        id:'r'+Date.now(),
        name:String(b.name).trim(),dept:String(b.dept).trim(),sid:String(b.sid).trim(),
        phone:String(b.phone).trim(),email:String(b.email).trim(),cat:b.cat,
        taskName:String(b.taskName||'').trim(),start:b.start,end:b.end,
        note:String(b.note||'').trim(),
        equipment:(b.equipment||[]).map(e=>({
          id:e.id,qty:e.qty,name:e.name,
          assignedCards:Array.isArray(e.assignedCards)?e.assignedCards.filter(Boolean):[]
        })),
        collabs:Array.isArray(b.collabs)?b.collabs:[],
        status:'pending',returnedItems:[],
        createdAt:new Date().toISOString()
      };
      db.records.unshift(rec);

      let mem=db.members.find(x=>x.sid===rec.sid||x.name===rec.name);
      if(!mem){mem={id:'m'+Date.now(),name:rec.name,dept:rec.dept,sid:rec.sid,phone:rec.phone,email:rec.email,taskCount:0,isOfficer:false};db.members.push(mem);}
      else Object.assign(mem,{dept:rec.dept,phone:rec.phone,email:rec.email});
      for(const c of rec.collabs){
        if(!c.name)continue;
        let cm=db.members.find(x=>x.name===c.name||(c.sid&&x.sid===c.sid));
        if(!cm){cm={id:'m'+Date.now()+Math.random(),name:c.name,sid:c.sid||'',dept:'',phone:'',email:'',taskCount:0,isOfficer:false};db.members.push(cm);}
        if(rec.cat==='task')cm.taskCount=(cm.taskCount||0)+1;
      }
      writeDB(db);

      // Send admin notification email
      try{sendAdminNotify(rec);}catch(e){console.error('notify error:',e);}

      return json(res,200,{ok:true,id:rec.id,publicRecords:publicRecords()});
    }

    // ── Member verify ──
    if(m==='POST'&&p==='/api/member/verify'){
      const b=await bodyJSON(req);
      const name=String(b.name||'').trim(),sid=String(b.sid||'').trim(),phone=String(b.phone||'').trim();
      const member=db.members.find(x=>x.name===name&&x.sid===sid&&x.phone===phone);
      const recs=db.records.filter(r=>r.name===name&&r.sid===sid&&r.phone===phone);
      if(!member&&!recs.length)return json(res,200,{ok:false,records:[],isOfficer:false});
      return json(res,200,{ok:true,records:recs,isOfficer:!!(member&&member.isOfficer)});
    }

    // ── Admin import legacy ──
    if(m==='POST'&&p==='/api/admin/import-legacy'){
      if(!isAdmin(req))return json(res,401,{error:'未登入'});
      const b=await bodyJSON(req);
      const mode=b.mode||'merge';
      const report={added:{},skipped:{},merged:{}};

      if(Array.isArray(b.equipment)&&b.equipment.length){
        const legacyEq=b.equipment.map(migrateEquipment);
        if(mode==='overwrite'){db.equipment=legacyEq;report.merged.equipment=legacyEq.length;}
        else{
          const existIds=new Set(db.equipment.map(e=>e.id));
          const existNames=new Set(db.equipment.map(e=>e.name));
          let added=0,skipped=0;
          for(const e of legacyEq){if(existIds.has(e.id)||existNames.has(e.name)){skipped++;continue;}db.equipment.push(e);added++;}
          report.added.equipment=added;report.skipped.equipment=skipped;
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
          report.added.members=added;report.skipped.members=skipped;
        }
      }
      if(Array.isArray(b.records)&&b.records.length){
        const legacyR=b.records.map(r=>({returnedItems:[],collabs:[],taskName:'',...r,equipment:(r.equipment||[]).map(e=>({assignedCards:[],...e}))}));
        if(mode==='overwrite'){db.records=legacyR;report.merged.records=legacyR.length;}
        else{
          const existIds=new Set(db.records.map(r=>r.id));
          let added=0,skipped=0;
          for(const r of legacyR){if(existIds.has(r.id)){skipped++;continue;}db.records.push(r);added++;}
          report.added.records=added;report.skipped.records=skipped;
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

    // ── Static fallback ──
    if(m==='GET'){
      const fp=path.normalize(path.join(ROOT,p));
      if(fp.startsWith(ROOT)&&fs.existsSync(fp)&&fs.statSync(fp).isFile())return fs.createReadStream(fp).pipe(res);
    }
    json(res,404,{error:'Not found'});
  }catch(e){console.error(e);json(res,500,{error:'伺服器錯誤'});}
});

server.listen(PORT,()=>console.log(`器材借用系統 running on port ${PORT}`));
