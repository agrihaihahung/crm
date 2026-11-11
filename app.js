/* HHH CRM – Vanilla JavaScript. No Node.js, build tools or frameworks required. */
const STORE_KEY = 'hhh-crm-customers-v1';
const seedCustomers = [
  {name:'Nguyễn Minh Tuấn',company:'Nhôm kính Minh Tuấn',type:'Xưởng sản xuất',phone:'0905 123 456',email:'tuan.minh@example.com',owner:'Hoàng Nam',status:'Đang hoạt động',color:'blue'},
  {name:'Trần Thị Hương',company:'Đại lý Hương Phát',type:'Đại lý',phone:'0914 222 810',email:'huong.tran@example.com',owner:'Lê Anh',status:'Cần chăm sóc',color:'peach'},
  {name:'Lê Quốc Bảo',company:'Cửa nhôm Quốc Bảo',type:'Thợ nhôm kính',phone:'0981 765 432',email:'bao.le@example.com',owner:'Hoàng Nam',status:'Tiềm năng',color:'mint'},
  
  {name:'Võ Thị Lan',company:'Cửa nhôm Lan Anh',type:'Cửa hàng',phone:'0935 888 120',email:'lan.vo@example.com',owner:'Lê Anh',status:'Ngừng giao dịch',color:'rose'}
];
const tasks = [
  {name:'Gọi xác nhận nhu cầu báo giá',customer:'Nhôm kính Minh Tuấn',time:'09:30',tag:'Cuộc gọi',tone:'blue',icon:'☎'},
  {name:'Gửi catalogue sản phẩm Kenwin',customer:'Đại lý Hương Phát',time:'10:45',tag:'Theo dõi',tone:'purple',icon:'✉'},
  {name:'Chăm sóc sau bán hàng',customer:'Cửa nhôm Quốc Bảo',time:'14:00',tag:'CSKH',tone:'green',icon:'◉'}
];
const navGroups = [
  {title:'TỔNG QUAN',items:[['Dashboard','▦'],['Khách hàng','♙'],['Khách tiềm năng','◎'],['Phân tích khách hàng','⌖']]},
  {title:'KINH DOANH',items:[['Cơ hội bán hàng','↗'],['Đơn hàng','▤']]},
  {title:'CHĂM SÓC KHÁCH HÀNG',items:[['Trung tâm CSKH','♡'],['Lịch chăm sóc','▣'],['Công việc','✓']]},
  {title:'THỊ TRƯỜNG',items:[['Quản lý thị trường','⌖']]},
  {title:'QUẢN TRỊ',items:[['Phân công & KPI','▥'],['Nhân viên & phân quyền','♙']]}
];
let customers = window.HHH_DB?.client ? [] : loadCustomers();
let liveMode = false, loading = false, currentCustomer = null;
let active = 'Dashboard', query = '', filter = 'Tất cả', doneTasks = new Set(), toastTimer;
let currentProfile = null, staffRows = [], staffError = '';
let kpiData={profiles:[],customers:[],activities:[],tasks:[]}, kpiError=''; 
let selectedCustomerId = null, customerActivities = [], customerActivitiesLoading = false;
let customerContacts = [], customerDocuments = [], customerTags = [], customerCareGroups = [], customerExtrasLoading = false;
const todayLabel = new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date());
const newThisMonth = customers => customers.filter(c => c.status === 'Tiềm năng').length;
const countStatus = (status) => customers.filter(c => c.status === status).length;
const app = document.getElementById('app');
function loadCustomers(){ try { const saved=localStorage.getItem(STORE_KEY); return saved?JSON.parse(saved):seedCustomers.slice(); } catch { return seedCustomers.slice(); } }
function saveCustomers(){ localStorage.setItem(STORE_KEY,JSON.stringify(customers)); }
function initials(name){return name.trim().split(/\s+/).slice(-2).map(x=>x[0]).join('').toUpperCase();}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function statusClass(s){return s==='Đang hoạt động'?'success':s==='Cần chăm sóc'?'warning':s==='Tiềm năng'?'info':'muted';}
function iconButton(symbol,label,cls=''){return `<button class="icon-btn ${cls}" aria-label="${label}" title="${label}">${symbol}</button>`;}
function money(value){return new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(value||0));}
function mapCustomer(row){return {id:row.id,legacyId:row.legacy_id,code:row.customer_code,name:row.full_name||'',company:row.company_name||'',type:row.customer_type||'Khác',phone:row.phone||'',email:row.email||'',address:row.address||'',province:row.province||'',region:row.region||'',ward:row.ward||'',source:row.source||'',notes:row.notes||'',description:row.customer_description||'',locationUrl:row.location_url||'',locationLat:row.location_lat,locationLng:row.location_lng,contact:row.contact_person||'',taxCode:row.tax_code||'',createdAt:row.created_at,assignedTo:row.assigned_to||null,owner:row.assigned_to?String(row.assigned_to).slice(0,8):'Chưa phân công',status:row.status||'Tiềm năng',businessUnit:row.business_unit||'both',businessScale:row.business_scale||'Chưa phân loại',potentialLevel:row.potential_level||'Chưa đánh giá',potentialScore:row.potential_score??null,color:'blue'};}
async function loadLiveCustomers(){
 if(!window.HHHData?.ready()) return;
 liveMode=true; loading=true; render();
 try{const rows=await window.HHHData.listCustomers({limit:1000});customers=rows.map(mapCustomer);}
 catch(err){liveMode=false;notify('Không tải được khách hàng từ Supabase: '+(err.message||err));}
 finally{loading=false;render();}
}

const pageMeta = {
 'Dashboard':['Tổng quan hoạt động','Theo dõi tình hình khách hàng và hoạt động CRM từ dữ liệu Supabase.'],
 'Khách hàng':['Danh sách khách hàng','Quản lý khách hàng trong lĩnh vực nhôm kính.'],
 'Phân tích khách hàng':['Phân tích & chăm sóc khách hàng','Bản đồ khu vực, khách tiềm năng cao, khách quá hạn chăm sóc và hiệu quả nhân viên.'],
 'Khách tiềm năng':['Quản lý khách tiềm năng','Theo dõi Lead riêng biệt theo từng giai đoạn chuyển đổi.'],
 'Cơ hội bán hàng':['Pipeline cơ hội bán hàng','Theo dõi giá trị dự kiến, giai đoạn và ngày chốt cơ hội.'],
 'Đơn hàng':['Quản lý đơn hàng','Theo dõi đơn hàng, giá trị, thanh toán và trạng thái xử lý.'],
 'Trung tâm CSKH':['Trung tâm chăm sóc khách hàng','Tiếp nhận, phân loại và theo dõi yêu cầu hỗ trợ, khiếu nại.'],
 'Lịch chăm sóc':['Lịch chăm sóc khách hàng','Theo dõi lịch hẹn, cuộc gọi và hoạt động chăm sóc theo thời gian.'],
 'Công việc':['Quản lý công việc','Phân công và theo dõi tiến độ công việc của đội ngũ.'],
 'Nhân viên & phân quyền':['Quản lý nhân viên','Quản lý vai trò truy cập và trạng thái tài khoản CRM.'],
 'Phân công & KPI':['Hiệu suất đội ngũ','Phân công khách hàng, theo dõi hoạt động và tiến độ công việc theo nhân viên.'],
 'Quản lý thị trường':['Phát triển thị trường theo địa bàn','Quản lý vùng phụ trách, kế hoạch đi thị trường, nhật ký khảo sát và dữ liệu khách hàng theo khu vực.']
};
let marketData={territories:[],plans:[],visits:[],profiles:[]};
let marketError='';
let marketPeriod='month';
let moduleRows = {};
let leadFilters={search:'',stage:'all',assignee:'all'};
let leadProfiles=[];
let leadInteractions=[];
let moduleError = {};
let moduleLoading = {};
function render(){
 const meta=pageMeta[active]||pageMeta.Dashboard;
 const visibleNavGroups=navGroups.map(g=>({...g,items:g.items.filter(([label])=>label!=='Nhân viên & phân quyền'||currentProfile?.role==='admin')})).filter(g=>g.items.length);
 const nav=visibleNavGroups.map(g=>`<section><div class="nav-heading">${g.title}</div>${g.items.map(([label,ico])=>`<button class="nav-item ${active===label?'active':''}" data-nav="${label}"><span class="nav-symbol">${ico}</span><span>${label}</span></button>`).join('')}</section>`).join('');
 app.innerHTML=`<div class="app-shell">
 <aside class="sidebar" id="sidebar"><div class="brand"><img class="brand-logo-image" src="assets/images/logo-hai-ha-hung.png" alt="Hải Hà Hưng – Kiến tạo, Nâng tầm, Thịnh vượng"><button class="icon-btn close-nav" data-action="close-nav" aria-label="Đóng menu">✕</button></div>
 <div class="workspace"><div class="workspace-logo">H</div><div><b>Hải Hà Hưng</b><small>Không gian làm việc</small></div><span>⌄</span></div>
 <nav class="nav-list">${nav}</nav>
 <div class="sidebar-bottom"><div class="sidebar-account-box"><button class="nav-item sidebar-settings" data-action="settings">⚙ <span>Cài đặt hệ thống</span></button><div class="profile"><div class="avatar avatar-dark">${esc(initials(currentProfile?.full_name||'HH'))}</div><div class="profile-info"><b>${esc(currentProfile?.full_name||currentProfile?.email||'Tài khoản')}</b><small>${esc(currentProfile?.role||'')}</small></div><button class="btn btn-light btn-logout" data-action="logout" title="Đăng xuất">↪ Đăng xuất</button></div></div></div></aside>
 <main class="main-area"><header class="topbar"><div class="top-left"><button class="icon-btn menu-btn" data-action="open-nav">☰</button><div class="breadcrumb">Không gian làm việc <span>›</span> <b>${esc(active)}</b></div></div><div class="top-actions"><label class="global-search"><span>⌕</span><input id="globalSearch" placeholder="Tìm kiếm nhanh..." value="${esc(query)}"></label><button class="icon-btn notification" data-action="notifications">♧</button><div class="top-avatar">${esc(initials(currentProfile?.full_name||'HH'))}</div><button class="btn btn-light btn-logout-top" data-action="logout">↪ Đăng xuất</button></div></header>
 <div class="page-content"><div class="welcome-row"><div><div class="eyebrow"><span class="live-dot"></span> ${esc(todayLabel.toLocaleUpperCase('vi-VN'))} · ${liveMode?'SUPABASE LIVE':'CHƯA KẾT NỐI DỮ LIỆU'}</div><h1>${active==='Dashboard'?'Tổng quan CRM':esc(active)}</h1><p>${esc(meta[1])}</p></div><div class="welcome-actions">${active==='Khách hàng'?(selectedCustomerId?'':'<button class="btn btn-light" data-action="export">⇩ Xuất CSV</button><button class="btn btn-primary" data-action="add">＋ Thêm khách hàng</button>'):(active==='Dashboard'||active==='Quản lý thị trường'||(active==='Khách tiềm năng'&&currentProfile?.role==='viewer'))?'':'<button class="btn btn-primary" data-action="module-add">＋ '+(active==='Khách tiềm năng'?'Thêm khách tiềm năng':active==='Cơ hội bán hàng'?'Thêm cơ hội':active==='Đơn hàng'?'Tạo đơn hàng':active==='Trung tâm CSKH'?'Tạo yêu cầu':'Tạo công việc')+'</button>'}</div></div>
 <section id="module-content">${renderPageContent()}</section>
 <footer class="footer"><span>© 2026 HHH CRM · Hải Hà Hưng</span><span>HHH CRM · Vanilla JS + Supabase</span></footer></div></main>${mobileScrim()}</div>`;
 bindEvents();
 if(active==='Phân tích khách hàng') requestAnimationFrame(()=>initCustomerMap());
}
function renderPageContent(){
 if(active==='Dashboard') return renderDashboard();
 if(active==='Phân tích khách hàng') return renderCustomerIntelligence();
 if(active==='Nhân viên & phân quyền') return currentProfile?.role==='admin'?renderStaffPage():'<div class="panel">Bạn không có quyền truy cập trang này.</div>';
 if(active==='Phân công & KPI') return renderKpiPage();
 if(active==='Quản lý thị trường') return renderMarketPage();
 if(active==='Khách hàng') return selectedCustomerId ? renderCustomerProfile() : renderCustomersPage();
 if(active==='Khách tiềm năng') return renderLeadsPage();
 if(active==='Cơ hội bán hàng') return renderRowsPage('opportunities');
 if(active==='Đơn hàng') return renderRowsPage('orders');
 if(active==='Trung tâm CSKH') return renderRowsPage('complaints');
 if(active==='Lịch chăm sóc'||active==='Công việc') return renderRowsPage('care_tasks');
 return '<div class="panel">Module chưa được cấu hình.</div>';
}
function renderDashboard(){
 const total=customers.length;
 const activeCount=customers.filter(c=>c.status==='Đang hoạt động').length;
 const careCount=customers.filter(c=>c.status==='Cần chăm sóc').length;
 const recent=customers.slice(0,8);
 return `<div class="stats-grid">
 ${stat('Tổng khách hàng',total.toLocaleString('vi-VN'),'','Hồ sơ đọc từ Supabase','♙','blue','up')}
 ${stat('Đang hoạt động',activeCount.toLocaleString('vi-VN'),'','Theo trạng thái hồ sơ','✓','green','up')}
 ${stat('Cần chăm sóc',careCount.toLocaleString('vi-VN'),'','Theo trạng thái hồ sơ','♡','orange','down')}
 ${stat('Khách hàng mới',customers.filter(c=>{const d=new Date(c.createdAt||0);return d.getMonth()===new Date().getMonth()&&d.getFullYear()===new Date().getFullYear();}).length,'','Hồ sơ tạo trong tháng','＋','purple','up')}
 </div>
 <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Khách hàng cập nhật gần đây</h2><p>Dữ liệu thật từ public.customers</p></div><button class="text-link" data-nav="Khách hàng">Mở danh sách ↗</button></div>${customerTable(recent,false)}</section>
 <section class="panel"><div class="panel-head"><div><h2>Phân loại hồ sơ</h2><p>Thống kê theo nhóm khách hàng</p></div></div><div class="summary-list">${countBy(customers,c=>c.type).map(([k,v])=>`<div class="summary-row"><span>${esc(k||'Khác')}</span><b>${v}</b><div class="mini-track"><i style="width:${total?Math.round(v/total*100):0}%"></i></div></div>`).join('')||'<div class="empty-state">Chưa có dữ liệu.</div>'}</div></section></div>`;
}
function countBy(list,fn){const m={};list.forEach(x=>{const k=fn(x)||'Khác';m[k]=(m[k]||0)+1;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);}
function customerTable(list){
 return `<div class="table-scroll"><table><thead><tr><th>KHÁCH HÀNG</th><th>NHÓM KHÁCH</th><th>ĐIỆN THOẠI</th><th>TRẠNG THÁI</th><th></th></tr></thead><tbody>${list.map(c=>`<tr><td><button class="customer-open" data-customer="${esc(c.id||c.phone)}"><span class="avatar avatar-blue">${esc(initials(c.name))}</span><span><b>${esc(c.name)}</b><small>${esc(c.company||c.code||'')}</small></span></button></td><td>${esc(c.type)}</td><td>${esc(c.phone||'—')}</td><td><span class="status ${statusClass(c.status)}"><i></i>${esc(c.status)}</span></td><td><button class="icon-btn row-more" data-customer="${esc(c.id||c.phone)}" aria-label="Mở hồ sơ">↗</button></td></tr>`).join('')}</tbody></table>${list.length?'':'<div class="empty-state">Không có dữ liệu phù hợp.</div>'}</div>`;
}
function renderCustomersPage(){
 const list=customers.filter(c=>`${c.name} ${c.company} ${c.phone} ${c.code}`.toLowerCase().includes(query.toLowerCase())&&(filter==='Tất cả'||c.status===filter));
 return `<div class="stats-grid stats-compact">${stat('Tổng hồ sơ',customers.length,'','Tất cả khách hàng nhôm kính','♙','blue')}${stat('Đang hoạt động',customers.filter(c=>c.status==='Đang hoạt động').length,'','Theo trạng thái','✓','green')}${stat('Tiềm năng cao',customers.filter(c=>Number(c.potentialScore||0)>=70||['Cao','Chiến lược'].includes(c.potentialLevel)).length,'','Điểm từ 70 trở lên','★','orange')}${stat('Chưa đánh giá',customers.filter(c=>c.potentialScore==null).length,'','Cần cập nhật tiềm năng','◎','purple')}</div>
 <section class="panel"><div class="panel-head"><div><h2>Danh sách khách hàng</h2><p>${customers.length} hồ sơ · Chọn một khách hàng để mở trang thông tin chi tiết</p></div></div><div class="table-tools"><label class="table-search">⌕ <input id="customerSearch" placeholder="Tìm tên, công ty, mã hoặc điện thoại..." value="${esc(query)}"></label><div class="filter-wrap"><select id="statusFilter"><option>Tất cả</option>${['Đang hoạt động','Cần chăm sóc','Tiềm năng','Ngừng giao dịch'].map(x=>`<option ${filter===x?'selected':''}>${x}</option>`).join('')}</select></div></div>${customerTable(list)}<div class="table-footer"><span>Hiển thị <b>${list.length}</b> / <b>${customers.length}</b> hồ sơ</span><span>Đã tải từ ${liveMode?'Supabase':'bộ nhớ trình duyệt'}</span></div></section>`;
}
function formatBytes(bytes){const n=Number(bytes||0);if(!n)return "0 B";const units=["B","KB","MB","GB"];const i=Math.min(Math.floor(Math.log(n)/Math.log(1024)),3);return (n/Math.pow(1024,i)).toFixed(i?1:0)+" "+units[i];}
function renderCustomerProfile(){
 const c=customers.find(x=>String(x.id||x.phone)===String(selectedCustomerId));
 if(!c){selectedCustomerId=null;return renderCustomersPage();}
 const address=[c.address,c.province].filter(Boolean).join(', ');
 const map=c.locationLat!=null&&c.locationLng!=null?`<div class="customer-map"><iframe title="Bản đồ vị trí khách hàng" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${encodeURIComponent(`${c.locationLat},${c.locationLng}`)}&z=16&output=embed"></iframe></div>`:`<div class="map-empty"><span>⌖</span><b>Chưa có bản đồ vị trí</b><p>Chỉnh sửa hồ sơ và dán đường link Google Maps có chứa tọa độ để hiển thị bản đồ tại đây.</p></div>`;
 const activities=customerActivitiesLoading?'<div class="empty-state">Đang tải lịch sử tương tác...</div>':customerActivities.length?customerActivities.map(a=>`<article class="profile-activity"><span class="activity-dot"></span><div><b>${esc(a.subject)}</b><small>${esc(activityTypeLabel(a.activity_type))} · ${new Date(a.occurred_at).toLocaleString('vi-VN')}</small><p>${esc(a.description||a.outcome||'')}</p></div></article>`).join(''):'<div class="empty-state">Chưa có lịch sử tương tác. Hãy ghi nhận cuộc gọi hoặc lần gặp đầu tiên.</div>';
 return `<div class="profile-toolbar"><button class="btn btn-light" data-back-customers>← Danh sách khách hàng</button><div class="profile-toolbar-actions"><button class="btn btn-light" data-add-activity>＋ Ghi nhận tương tác</button><button class="btn btn-primary" data-edit-customer>Chỉnh sửa hồ sơ</button></div></div>
 <section class="profile-hero panel"><div class="profile-identity"><div class="profile-avatar">${esc(initials(c.name))}</div><div><div class="eyebrow">HỒ SƠ KHÁCH HÀNG · ${esc(c.code||'CHƯA CÓ MÃ')}</div><h2>${esc(c.name)}</h2><p>${esc(c.company||'Chưa cập nhật đơn vị')}</p><span class="status ${statusClass(c.status)}"><i></i>${esc(c.status)}</span></div></div><div class="profile-quick"><a href="tel:${esc(c.phone)}" class="quick-contact">☎ <span><small>Điện thoại</small><b>${esc(c.phone||'Chưa cập nhật')}</b></span></a>${c.email?`<a href="mailto:${esc(c.email)}" class="quick-contact">✉ <span><small>Email</small><b>${esc(c.email)}</b></span></a>`:''}</div></section>
 <div class="profile-layout"><div class="profile-main"><section class="panel profile-section"><div class="panel-head"><div><h3>Thông tin khách hàng</h3><p>Thông tin nhận diện và liên hệ</p></div></div><div class="profile-info-grid"><div><small>Họ và tên</small><b>${esc(c.name)}</b></div><div><small>Số điện thoại</small><b>${esc(c.phone||'—')}</b></div><div><small>Địa chỉ</small><b>${esc(address||'—')}</b></div><div><small>Công ty / cửa hàng</small><b>${esc(c.company||'—')}</b></div><div><small>Nhóm khách hàng</small><b>${esc(c.type||'—')}</b></div><div><small>Ngành hàng</small><b>Nhôm kính</b></div><div><small>Người liên hệ</small><b>${esc(c.contact||'—')}</b></div><div><small>Email</small><b>${esc(c.email||'—')}</b></div><div><small>Mã số thuế</small><b>${esc(c.taxCode||'—')}</b></div><div><small>Người phụ trách</small><b>${esc(c.owner||'Chưa phân công')}</b></div></div></section>
 <section class="panel profile-section"><div class="panel-head"><div><h3>Người liên hệ</h3><p>Quản lý nhiều đầu mối trong cùng khách hàng</p></div><button class="btn btn-light" data-add-contact>＋ Thêm người liên hệ</button></div>${customerExtrasLoading?'<div class="empty-state">Đang tải người liên hệ...</div>':customerContacts.length?`<div class="contact-list">${customerContacts.map(x=>`<article class="contact-card"><div class="contact-avatar">${esc(initials(x.full_name||'?'))}</div><div class="contact-main"><b>${esc(x.full_name)}</b><small>${esc(x.position||'Chưa có chức vụ')}${x.is_primary?' · Người liên hệ chính':''}</small><div class="contact-links">${x.phone?`<a href="tel:${esc(x.phone)}">☎ ${esc(x.phone)}</a>`:''}${x.email?`<a href="mailto:${esc(x.email)}">✉ ${esc(x.email)}</a>`:''}</div></div><button class="icon-btn" data-delete-contact="${esc(x.id)}" title="Xóa người liên hệ">×</button></article>`).join('')}</div>`:'<div class="empty-state">Chưa có người liên hệ phụ. Thêm các đầu mối làm việc của khách hàng tại đây.</div>'}</section>
 <section class="panel profile-section"><div class="panel-head"><div><h3>Phân loại & tiềm năng</h3><p>Quy mô hoạt động và mức độ ưu tiên chăm sóc</p></div><button class="btn btn-light" data-edit-classification>Chỉnh sửa</button></div><div class="classification-grid"><div><small>Quy mô khách hàng</small><b>${esc(c.businessScale||'Chưa phân loại')}</b></div><div><small>Mức tiềm năng</small><b>${esc(c.potentialLevel||'Chưa đánh giá')}</b></div><div><small>Điểm tiềm năng</small><b>${c.potentialScore==null?'Chưa chấm điểm':esc(c.potentialScore)+'/100'}</b></div></div><div class="profile-tags"><div class="tags-head"><b>Thẻ khách hàng</b><button class="text-link" data-add-tag>＋ Gắn thẻ</button></div>${customerTags.length?customerTags.map(t=>`<span class="crm-tag">${esc(t.name)}<button data-remove-tag="${esc(t.id)}" aria-label="Gỡ thẻ">×</button></span>`).join(''):'<small class="muted-text">Chưa gắn thẻ</small>'}</div><div class="profile-tags"><div class="tags-head"><b>Nhóm chăm sóc</b><button class="text-link" data-add-care-group>＋ Thêm nhóm</button></div>${customerCareGroups.length?customerCareGroups.map(g=>`<span class="crm-tag care-tag">${esc(g.name)}<button data-remove-care-group="${esc(g.id)}" aria-label="Rời nhóm">×</button></span>`).join(''):'<small class="muted-text">Chưa thuộc nhóm chăm sóc nào</small>'}</div></section>
 <section class="panel profile-section"><div class="panel-head"><div><h3>Tài liệu & tệp đính kèm</h3><p>Hợp đồng, catalogue, báo giá và tài liệu khách hàng</p></div><label class="btn btn-primary upload-label">＋ Tải tài liệu<input type="file" id="customerDocumentUpload" hidden multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"></label></div>${customerDocuments.length?`<div class="document-list">${customerDocuments.map(d=>`<article class="document-row"><span class="document-icon">▤</span><div class="document-main"><b>${esc(d.file_name)}</b><small>${esc(d.category||'Tài liệu khác')} · ${d.file_size?formatBytes(d.file_size):''} · ${d.created_at?new Date(d.created_at).toLocaleDateString('vi-VN'):''}</small></div><button class="btn btn-light btn-small" data-download-document="${esc(d.id)}">Tải xuống</button><button class="icon-btn" data-delete-document="${esc(d.id)}" title="Xóa tài liệu">×</button></article>`).join('')}</div>`:'<div class="empty-state">Chưa có tài liệu đính kèm.</div>'}</section>
 <section class="panel profile-section"><div class="panel-head"><div><h3>Mô tả khách hàng</h3><p>Đặc điểm, nhu cầu, quy mô và lưu ý khi làm việc</p></div></div><div class="profile-description">${c.description?esc(c.description).replace(/\n/g,'<br>'):'Chưa có mô tả. Chọn “Chỉnh sửa hồ sơ” để bổ sung thông tin sâu hơn về khách hàng.'}</div>${c.notes?`<div class="profile-notes"><b>Ghi chú nội bộ</b><p>${esc(c.notes)}</p></div>`:''}</section>
 <section class="panel profile-section"><div class="panel-head"><div><h3>Lịch sử tương tác</h3><p>Toàn bộ hoạt động chăm sóc khách hàng</p></div><button class="btn btn-light" data-add-activity>＋ Thêm tương tác</button></div><div class="profile-timeline">${activities}</div></section></div>
 <aside class="profile-side"><section class="panel profile-section"><div class="panel-head"><div><h3>Vị trí khách hàng</h3><p>Google Maps · Bản đồ thu nhỏ</p></div></div>${map}${isGoogleMapsLink(c.locationUrl)?`<a class="map-open-link" href="${esc(c.locationUrl)}" target="_blank" rel="noopener noreferrer">Mở vị trí trên Google Maps ↗</a>`:''}<div class="map-address">${esc(address||'Chưa có địa chỉ')}</div></section><section class="panel profile-section"><h3>Thông tin quản lý</h3><div class="profile-meta"><div><small>Ngày tạo hồ sơ</small><b>${c.createdAt?new Date(c.createdAt).toLocaleDateString('vi-VN'):'—'}</b></div><div><small>Nguồn khách hàng</small><b>${esc(c.source||'Chưa cập nhật')}</b></div><div><small>Mã khách hàng</small><b>${esc(c.code||'—')}</b></div></div></section></aside></div>`;
}
function activityTypeLabel(type){return ({call:'Gọi điện',meeting:'Gặp trực tiếp',message:'Tin nhắn',email:'Email',visit:'Thăm khách hàng',other:'Khác'})[type]||type||'Tương tác';}
function isGoogleMapsLink(value){try{const u=new URL(String(value||''));return u.protocol==='https:'&&(/(^|\.)google\.com$/.test(u.hostname)||u.hostname==='maps.app.goo.gl'||u.hostname==='goo.gl');}catch{return false;}}
function locationPreviewMarkup(value){const coords=extractGoogleMapsCoordinates(value);if(coords)return `<div class="location-live-map"><iframe title="Xem trước vị trí" loading="lazy" src="https://maps.google.com/maps?q=${encodeURIComponent(`${coords.lat},${coords.lng}`)}&z=16&output=embed"></iframe></div><small class="field-hint">Đã nhận tọa độ: ${coords.lat}, ${coords.lng}</small>`;return value?'<div class="location-live-hint">Chưa đọc được tọa độ từ link này. Hãy dùng link Google Maps đầy đủ có dạng @vĩ_độ,kinh_độ; link rút gọn có thể cần mở rộng trước.</div>':'<div class="location-live-hint">Bản đồ xem trước sẽ xuất hiện sau khi dán link Google Maps có tọa độ.</div>'; }
function bindLocationPreview(form){const input=form.querySelector('[name=location_url]'),box=form.querySelector('[data-map-input-preview]');if(!input||!box)return;const update=()=>{const value=input.value.trim();if(value&&!isGoogleMapsLink(value)){box.innerHTML='<div class="location-live-hint">Vui lòng dán link HTTPS từ Google Maps.</div>';return;}box.innerHTML=locationPreviewMarkup(value);};input.addEventListener('input',update);update();}
function extractGoogleMapsCoordinates(value){
 const raw=String(value||'').trim();if(!raw)return null;
 const candidates=[raw];try{const u=new URL(raw);for(const key of ['q','query','ll','center']){const v=u.searchParams.get(key);if(v)candidates.unshift(v.replace(/%2C/ig,','));}}catch{}
 const patterns=[/@(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/, /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/, /^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/];
 for(const candidate of candidates)for(const re of patterns){const m=candidate.match(re);if(m){const lat=Number(m[1]),lng=Number(m[2]);if(Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180)return {lat,lng};}}
 return null;
}
function renderLeadsPage(){
 if(moduleLoading.leads)return '<div class="panel loading-state">Đang tải danh sách khách tiềm năng...</div>';
 if(moduleError.leads)return `<div class="panel error-state"><h2>Chưa tải được Lead</h2><p>${esc(moduleError.leads)}</p><small>Kiểm tra migration Phase 3.1 và quyền truy cập RLS.</small><button class="btn btn-light" data-reload="leads">Thử tải lại</button></div>`;
 const all=moduleRows.leads||[];const q=leadFilters.search.trim().toLowerCase();
 const rows=all.filter(x=>(leadFilters.stage==='all'||x.stage===leadFilters.stage)&&(leadFilters.assignee==='all'||(leadFilters.assignee==='unassigned'?!x.assigned_to:x.assigned_to===leadFilters.assignee))&&(!q||[x.full_name,x.company_name,x.phone,x.email,x.source].some(v=>String(v||'').toLowerCase().includes(q))));
 const profiles=leadProfiles.length?leadProfiles:[];const stageLabels={new:'Mới',contacted:'Đã liên hệ',qualified:'Đủ điều kiện',converted:'Đã chuyển đổi',lost:'Không phù hợp'};
 return `<div class="stats-grid stats-compact">${stat('Tổng khách tiềm năng',all.length,'','Hồ sơ trong pipeline','◎','blue')}${stat('Mới tiếp nhận',all.filter(x=>x.stage==='new').length,'','Chưa liên hệ','＋','green')}${stat('Đang phát triển',all.filter(x=>['contacted','qualified'].includes(x.stage)).length,'','Đang tiếp cận / đủ điều kiện','↗','orange')}${stat('Đã chuyển đổi',all.filter(x=>x.stage==='converted').length,'','Đã tạo hồ sơ khách hàng','✓','purple')}</div>
 <section class="panel lead-toolbar"><div class="lead-filters"><input id="leadSearch" placeholder="Tìm tên, công ty, số điện thoại..." value="${esc(leadFilters.search)}"><select id="leadStageFilter"><option value="all">Tất cả giai đoạn</option>${Object.entries(stageLabels).map(([v,l])=>`<option value="${v}" ${leadFilters.stage===v?'selected':''}>${l}</option>`).join('')}</select><select id="leadAssigneeFilter"><option value="all">Tất cả nhân viên</option><option value="unassigned" ${leadFilters.assignee==='unassigned'?'selected':''}>Chưa phân công</option>${profiles.map(u=>`<option value="${esc(u.id)}" ${leadFilters.assignee===u.id?'selected':''}>${esc(u.full_name||u.email||'Nhân viên')}</option>`).join('')}</select><button class="btn btn-light" data-lead-refresh>↻ Làm mới</button></div><div class="lead-result-count">Hiển thị <b>${rows.length}</b> / ${all.length} khách tiềm năng</div></section>
 ${rows.length?renderLeadBoard(rows,profiles):'<section class="panel empty-state empty-large">Không tìm thấy khách tiềm năng phù hợp bộ lọc.</section>'}`;
}
function renderLeadBoard(rows,profiles){
 const stages=[['new','Mới'],['contacted','Đã liên hệ'],['qualified','Đủ điều kiện'],['converted','Đã chuyển đổi'],['lost','Không phù hợp']];
 return `<div class="kanban lead-kanban">${stages.map(([key,label])=>`<section class="kanban-col"><div class="kanban-head"><b>${label}</b><span>${rows.filter(x=>x.stage===key).length}</span></div>${rows.filter(x=>x.stage===key).map(x=>{const owner=profiles.find(u=>u.id===x.assigned_to);return `<article class="kanban-card lead-card"><div class="lead-card-head"><b>${esc(x.full_name)}</b><button class="text-link" data-lead-detail="${x.id}">Chi tiết</button></div><small>${esc(x.company_name||'Chưa có công ty')}</small><p>${esc(x.phone||'Chưa có số điện thoại')}</p><div class="lead-card-meta"><span>${esc(x.source||'Chưa rõ nguồn')}</span><span>${esc(owner?.full_name||'Chưa phân công')}</span></div><div class="lead-card-actions">${currentProfile?.role==='viewer'?'':`<button class="btn btn-light" data-lead-edit="${x.id}">Sửa</button><button class="btn btn-primary" data-lead-stage="${x.id}">Chuyển giai đoạn</button>${currentProfile?.role==='admin'?`<button class="btn btn-light" data-lead-assign="${x.id}">Điều chuyển</button>`:''}`}</div></article>`;}).join('')||'<div class="kanban-empty">Chưa có hồ sơ</div>'}</section>`).join('')}</div>`;
}
const moduleConfig={
 opportunities:{title:'Cơ hội bán hàng',table:'opportunities',select:'id,title,stage,business_unit,expected_value,expected_close_date,customer_id,customers(full_name,company_name)',columns:[['title','Cơ hội'],['customers','Khách hàng'],['stage','Giai đoạn'],['expected_value','Giá trị dự kiến'],['expected_close_date','Ngày dự kiến chốt']]},
 orders:{title:'Đơn hàng',table:'orders',select:'id,order_code,customer_id,business_unit,order_date,total_amount,paid_amount,status,customers(full_name,company_name)',columns:[['order_code','Mã đơn'],['customers','Khách hàng'],['order_date','Ngày đơn'],['total_amount','Tổng tiền'],['paid_amount','Đã thanh toán'],['status','Trạng thái']]},
 complaints:{title:'Yêu cầu CSKH',table:'complaints',select:'id,title,description,priority,status,created_at,customer_id,customers(full_name,company_name)',columns:[['title','Tiêu đề'],['customers','Khách hàng'],['priority','Ưu tiên'],['status','Trạng thái'],['created_at','Ngày tạo']]},
 care_tasks:{title:'Lịch chăm sóc',table:'care_tasks',select:'id,title,description,due_at,priority,status,customer_id,customers(full_name,company_name)',columns:[['title','Công việc'],['customers','Khách hàng'],['due_at','Thời hạn'],['priority','Ưu tiên'],['status','Trạng thái']]}
};
function renderRowsPage(key){
 const cfg=moduleConfig[key],rows=moduleRows[key]||[];
 if(moduleLoading[key])return '<div class="panel loading-state">Đang tải dữ liệu từ Supabase...</div>';
 if(moduleError[key])return `<div class="panel error-state"><h2>Không tải được ${cfg.title.toLowerCase()}</h2><p>${esc(moduleError[key])}</p><small>Kiểm tra bảng, quyền truy cập RLS và cấu hình Supabase.</small><button class="btn btn-light" data-reload="${key}">Thử tải lại</button></div>`;
 const heading=key==='care_tasks'&&active==='Công việc'?'Danh sách công việc':'Danh sách '+cfg.title.toLowerCase();
 const calendarView=key==='care_tasks'&&active==='Lịch chăm sóc';
 const body=calendarView?renderCareCalendar(rows):rows.length?`<div class="table-scroll"><table><thead><tr>${cfg.columns.map(c=>`<th>${c[1].toUpperCase()}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cfg.columns.map(c=>`<td>${formatModuleCell(c[0],r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<div class="empty-state empty-large">Chưa có bản ghi. Dữ liệu sẽ xuất hiện sau khi tạo nghiệp vụ đầu tiên.</div>';
 return `<div class="stats-grid stats-compact">${stat('Tổng bản ghi',rows.length,'','Dữ liệu hiện có','▤','blue')}${stat('Đang xử lý',rows.filter(x=>['processing','in_progress','assigned'].includes(x.status)).length,'','Theo trạng thái','↻','orange')}${stat('Hoàn thành',rows.filter(x=>['completed','resolved','closed'].includes(x.status)).length,'','Theo trạng thái','✓','green')}${stat('Ưu tiên cao',rows.filter(x=>['high','urgent'].includes(x.priority)).length,'','Cần chú ý','!','purple')}</div>
 <section class="panel"><div class="panel-head"><div><h2>${calendarView?'Lịch công việc chăm sóc':heading}</h2><p>Dữ liệu trực tiếp từ public.${cfg.table}</p></div><button class="btn btn-light" data-reload="${key}">↻ Làm mới</button></div>${body}</section>`;
}

function renderCareCalendar(rows){
 if(!rows.length)return '<div class="empty-state empty-large">Chưa có lịch chăm sóc. Hãy tạo công việc để bắt đầu lập lịch.</div>';
 const grouped={};rows.forEach(r=>{const key=r.due_at?new Date(r.due_at).toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}):'Chưa xếp lịch';(grouped[key]??=[]).push(r);});
 return `<div class="agenda-list">${Object.entries(grouped).map(([day,items])=>`<section class="agenda-day"><h3>${esc(day)}</h3>${items.map(x=>`<article class="agenda-item"><div class="agenda-time">${esc(x.due_at?new Date(x.due_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'--:--')}</div><div class="agenda-detail"><b>${esc(x.title)}</b><small>${esc(x.customers?.full_name||'Chưa gắn khách hàng')} · ${esc(x.description||'')}</small></div><span class="status ${x.status==='completed'?'success':'info'}">${formatModuleCell('status',x)}</span></article>`).join('')}</section>`).join('')}</div>`;
}
function formatModuleCell(k,r){
 if(k==='customers')return esc(r.customers?.full_name||'—');
 if(k==='expected_value'||k==='total_amount'||k==='paid_amount')return `<b>${money(r[k])}</b>`;
 if(k==='due_at'||k==='expected_close_date'||k==='order_date'||k==='created_at')return esc(r[k]?new Date(r[k]).toLocaleDateString('vi-VN'):'—');
 const map={new:'Mới',contacted:'Đã liên hệ',qualified:'Đủ điều kiện',quoted:'Đã báo giá',negotiation:'Đàm phán',won:'Thành công',lost:'Thất bại',draft:'Nháp',confirmed:'Đã xác nhận',processing:'Đang xử lý',completed:'Hoàn thành',cancelled:'Đã hủy',pending:'Chờ xử lý',in_progress:'Đang thực hiện',resolved:'Đã giải quyết',closed:'Đã đóng',urgent:'Khẩn cấp',high:'Cao',normal:'Bình thường',low:'Thấp',assigned:'Đã phân công'};
 return esc(map[r[k]]||r[k]||'—');
}
function stat(title,value,change,caption,symbol,color,trend){return `<section class="stat-card"><div class="stat-top"><span>${title}</span><div class="stat-icon ${color}">${symbol}</div></div><div class="stat-value">${value}</div><div class="stat-bottom">${change?`<span class="stat-change ${trend}">${trend==='up'?'↗':'↘'} ${change}</span>`:''}<span>${caption}</span></div></section>`;}
function source(color,label,value){return `<div class="source-row"><i class="${color}"></i><span>${label}</span><b>${value}</b></div>`;}
function mobileScrim(){return '<button class="scrim" id="scrim" aria-label="Đóng menu"></button>';}


let intelligenceData={activities:[],tasks:[],profiles:[],plans:[],groups:[]};
let intelligenceError='';
async function loadCustomerIntelligence(){
 intelligenceError='';
 try{
  if(!window.HHHData?.ready()) throw new Error('Chưa kết nối Supabase.');
  const [activities,tasks,profiles,plans,groups]=await Promise.all([
   window.HHHData.listAllActivities(),window.HHHData.listCareTasks(),
   window.HHHData.listProfiles(),window.HHHData.listCarePlans(),window.HHHData.listCareGroups()
  ]);
  intelligenceData={activities,tasks,profiles,plans,groups};
 }catch(e){intelligenceError=e.message||String(e);}
 render();
}
function initCustomerMap(){
 const el=document.getElementById('customerLeafletMap');
 if(!el)return;
 if(!window.L){
  el.innerHTML='<div class="map-load-error"><b>Chưa tải được thư viện bản đồ</b><span>Kiểm tra kết nối Internet hoặc quyền truy cập CDN, sau đó tải lại trang.</span></div>';
  return;
 }
 const points=customers.filter(c=>Number.isFinite(Number(c.locationLat))&&Number.isFinite(Number(c.locationLng))
  &&(mapRegionFilter==='all'||(c.region||'Chưa phân vùng')===mapRegionFilter)
  &&(mapProvinceFilter==='all'||(c.province||'Chưa có tỉnh/thành')===mapProvinceFilter)
  &&(mapWardFilter==='all'||(c.ward||'Chưa có xã/phường')===mapWardFilter));
 if(window.customerLeaflet){window.customerLeaflet.remove();window.customerLeaflet=null;}
 try{
  const map=window.L.map(el,{scrollWheelZoom:true}).setView([16.05,108.2],6);window.customerLeaflet=map;
  const tileSources=[
   'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
   'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
  ];
  let tileFallbackUsed=false;
  const primary=window.L.tileLayer(tileSources[0],{attribution:'&copy; OpenStreetMap',maxZoom:19});
  primary.on('tileerror',()=>{
   if(tileFallbackUsed)return;tileFallbackUsed=true;
   window.L.tileLayer(tileSources[1],{attribution:'&copy; OpenStreetMap &copy; CARTO',maxZoom:19}).addTo(map);
  });
  primary.addTo(map);
  const bounds=[];
  points.forEach(c=>{const lat=Number(c.locationLat),lng=Number(c.locationLng);if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return;bounds.push([lat,lng]);
   window.L.marker([lat,lng]).addTo(map).bindPopup(`<b>${esc(c.name)}</b><br>${esc(c.company||c.address||'')}<br>${esc([c.ward,c.province].filter(Boolean).join(', '))}<br><a target="_blank" rel="noopener" href="${esc(c.locationUrl||`https://www.google.com/maps?q=${lat},${lng}`)}">Mở Google Maps</a>`);
  });
  if(bounds.length===1)map.setView(bounds[0],13);else if(bounds.length>1)map.fitBounds(bounds,{padding:[24,24],maxZoom:14});
  requestAnimationFrame(()=>map.invalidateSize(true));
  setTimeout(()=>map.invalidateSize(true),250);
 }catch(error){
  console.error('HHH CRM map initialization failed:',error);
  el.innerHTML='<div class="map-load-error"><b>Không thể khởi tạo bản đồ</b><span>'+esc(error.message||'Lỗi không xác định')+'</span></div>';
 }
}
function mapFilterChanged(level,value){
 if(level==='region'){mapRegionFilter=value;mapProvinceFilter='all';mapWardFilter='all';}
 if(level==='province'){mapProvinceFilter=value;mapWardFilter='all';}
 if(level==='ward')mapWardFilter=value;
 render();
}
window.mapFilterChanged=mapFilterChanged;
function renderCustomerIntelligence(){
 const now=Date.now(),lastByCustomer=new Map();
 intelligenceData.activities.forEach(a=>{const t=new Date(a.occurred_at).getTime();if(!lastByCustomer.has(a.customer_id)||lastByCustomer.get(a.customer_id)<t)lastByCustomer.set(a.customer_id,t);});
 const stale=customers.map(c=>({...c,lastCare:lastByCustomer.get(c.id)||0,days:lastByCustomer.has(c.id)?Math.floor((now-lastByCustomer.get(c.id))/86400000):9999})).filter(c=>c.days>=30).sort((a,b)=>b.days-a.days);
 const high=customers.filter(c=>Number(c.potentialScore||0)>=70||['Cao','Chiến lược'].includes(c.potentialLevel)).sort((a,b)=>Number(b.potentialScore||0)-Number(a.potentialScore||0));
 const mapped=customers.filter(c=>c.locationLat&&c.locationLng);
 const regionOf=c=>c.region||'Chưa phân vùng', provinceOf=c=>c.province||'Chưa có tỉnh/thành', wardOf=c=>c.ward||'Chưa có xã/phường';
 const regions=[...new Set(customers.map(regionOf))].sort((a,b)=>a.localeCompare(b,'vi'));
 const regionRows=customers.filter(c=>mapRegionFilter==='all'||regionOf(c)===mapRegionFilter);
 const provinces=[...new Set(regionRows.map(provinceOf))].sort((a,b)=>a.localeCompare(b,'vi'));
 const provinceRows=regionRows.filter(c=>mapProvinceFilter==='all'||provinceOf(c)===mapProvinceFilter);
 const wards=[...new Set(provinceRows.map(wardOf))].sort((a,b)=>a.localeCompare(b,'vi'));
 const selectedRows=provinceRows.filter(c=>mapWardFilter==='all'||wardOf(c)===mapWardFilter);
 const selectedMapped=mapped.filter(c=>(mapRegionFilter==='all'||regionOf(c)===mapRegionFilter)&&(mapProvinceFilter==='all'||provinceOf(c)===mapProvinceFilter)&&(mapWardFilter==='all'||wardOf(c)===mapWardFilter));
 const countBy=(rows,keyFn)=>{const m=new Map();rows.forEach(c=>{const k=keyFn(c);m.set(k,(m.get(k)||0)+1)});return [...m.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'vi'));};
 const areaCounts=countBy(mapped,regionOf),provinceCounts=countBy(regionRows,provinceOf),wardCounts=countBy(provinceRows,wardOf);
 const pins=mapped.map(c=>`<a target="_blank" rel="noopener" href="${esc(c.locationUrl||`https://www.google.com/maps?q=${c.locationLat},${c.locationLng}`)}"><b>${esc(c.name)}</b><small>${esc(c.company||c.address||'')}</small></a>`).join('');
 const staffStats=intelligenceData.profiles.map(p=>{
  const acts=intelligenceData.activities.filter(a=>a.created_by===p.id).length;
  const completed=intelligenceData.tasks.filter(t=>t.assigned_to===p.id&&t.status==='completed').length;
  const assigned=intelligenceData.tasks.filter(t=>t.assigned_to===p.id).length;
  return `<tr><td><b>${esc(p.full_name||p.email||'Nhân viên')}</b><small>${esc(p.email||'')}</small></td><td>${acts}</td><td>${completed}</td><td>${assigned}</td><td>${assigned?Math.round(completed/assigned*100):0}%</td></tr>`;
 }).join('');
 const groups=intelligenceData.groups.map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');
 return `<div class="stats-grid">
 ${stat('Khách hàng có vị trí',mapped.length,'','Có tọa độ Google Maps','⌖','blue')}
 ${stat('Tiềm năng cao',high.length,'','Điểm từ 70 hoặc mức Cao/Chiến lược','★','green')}
 ${stat('Lâu chưa chăm sóc',stale.length,'','Từ 30 ngày chưa có tương tác','◷','orange')}
 ${stat('Hoạt động đã ghi nhận',intelligenceData.activities.length,'','Nhật ký chăm sóc','✓','purple')}
 </div>
 ${intelligenceError?`<div class="panel"><b>Chưa tải được dữ liệu phân tích</b><p>${esc(intelligenceError)}</p></div>`:''}
 <div class="dashboard-grid">
  <section class="panel"><div class="panel-head"><div><h2>Bản đồ khách hàng nhôm kính</h2><p>${selectedRows.length}/${customers.length} khách hàng trong khu vực đang chọn · ${selectedMapped.length} đã có tọa độ bản đồ.</p></div></div>
   <div class="map-area-filters">
    <label>Khu vực<select id="mapRegionSelect" onchange="mapFilterChanged('region',this.value)"><option value="all">Tất cả khu vực (${mapped.length})</option>${regions.map(x=>`<option value="${esc(x)}" ${mapRegionFilter===x?'selected':''}>${esc(x)} (${areaCounts.find(y=>y[0]===x)?.[1]||0})</option>`).join('')}</select></label>
    <label>Tỉnh / Thành phố<select id="mapProvinceSelect" onchange="mapFilterChanged('province',this.value)" ${mapRegionFilter==='all'?'':' ' }><option value="all">Tất cả tỉnh/thành (${regionRows.length})</option>${provinces.map(x=>`<option value="${esc(x)}" ${mapProvinceFilter===x?'selected':''}>${esc(x)} (${provinceCounts.find(y=>y[0]===x)?.[1]||0})</option>`).join('')}</select></label>
    <label>Xã / Phường<select id="mapWardSelect" onchange="mapFilterChanged('ward',this.value)"><option value="all">Tất cả xã/phường (${provinceRows.length})</option>${wards.map(x=>`<option value="${esc(x)}" ${mapWardFilter===x?'selected':''}>${esc(x)} (${wardCounts.find(y=>y[0]===x)?.[1]||0})</option>`).join('')}</select></label>
   </div>
   <div class="map-area-summary"><b>${selectedRows.length} khách hàng</b><span>·</span><span>${mapRegionFilter==='all'?'Toàn quốc':esc(mapRegionFilter)}</span><span>${mapProvinceFilter==='all'?'':`· ${esc(mapProvinceFilter)}`}</span><span>${mapWardFilter==='all'?'':`· ${esc(mapWardFilter)}`}</span><button class="btn btn-light btn-sm" onclick="mapFilterChanged('region','all')">Xóa lọc</button></div>
   <div class="crm-map-grid"><div class="crm-map-frame">${mapped.length?`<div id="customerLeafletMap" aria-label="Bản đồ vị trí khách hàng"></div>`:`<div class="empty-state">Chưa có khách hàng được định vị. Thêm link Google Maps trong hồ sơ khách hàng.</div>`}</div><div class="crm-map-list">${selectedRows.length?selectedRows.map(c=>`<a ${c.locationUrl||c.locationLat?'target="_blank" rel="noopener"':''} href="${esc(c.locationUrl||(c.locationLat?`https://www.google.com/maps?q=${c.locationLat},${c.locationLng}`:'#'))}"><b>${esc(c.name)}</b><small>${esc([c.ward,c.province].filter(Boolean).join(', ')||c.address||'Chưa khai báo xã/phường')}${c.locationLat?' · Có định vị':' · Chưa định vị'}</small></a>`).join(''):'<p class="empty-state">Không có khách hàng ở khu vực này.</p>'}</div></div>
   <div class="map-count-grid"><div><b>Theo khu vực</b>${areaCounts.map(([n,c])=>`<button onclick="mapFilterChanged('region',${JSON.stringify(n)})"><span>${esc(n)}</span><strong>${c}</strong></button>`).join('')||'<small>Chưa có dữ liệu</small>'}</div><div><b>Theo tỉnh / thành</b>${provinceCounts.map(([n,c])=>`<button onclick="mapFilterChanged('province',${JSON.stringify(n)})"><span>${esc(n)}</span><strong>${c}</strong></button>`).join('')||'<small>Chọn khu vực để xem</small>'}</div><div><b>Theo xã / phường</b>${wardCounts.map(([n,c])=>`<button onclick="mapFilterChanged('ward',${JSON.stringify(n)})"><span>${esc(n)}</span><strong>${c}</strong></button>`).join('')||'<small>Chọn tỉnh/thành để xem</small>'}</div></div>
  </section>
  <section class="panel"><div class="panel-head"><div><h2>Khách hàng tiềm năng cao</h2><p>Ưu tiên chăm sóc và phát triển quan hệ.</p></div></div>
   ${high.length?`<div class="intel-list">${high.slice(0,8).map(c=>`<div><b>${esc(c.name)}</b><small>${esc(c.company||c.phone)}</small><span>${Number(c.potentialScore||0)} điểm · ${esc(c.potentialLevel||'')}</span></div>`).join('')}</div>`:'<div class="empty-state">Chưa có khách hàng được đánh giá tiềm năng cao. Cập nhật điểm trong hồ sơ khách hàng.</div>'}
  </section>
 </div>
 <div class="dashboard-grid">
  <section class="panel"><div class="panel-head"><div><h2>Khách lâu ngày chưa được chăm sóc</h2><p>Ngưỡng cảnh báo: 30 ngày kể từ tương tác gần nhất.</p></div></div>
   <div class="table-scroll"><table><thead><tr><th>KHÁCH HÀNG</th><th>ĐIỆN THOẠI</th><th>LẦN CUỐI</th><th>SỐ NGÀY</th></tr></thead><tbody>${stale.slice(0,30).map(c=>`<tr><td><button class="customer-open" data-customer="${esc(c.id)}"><b>${esc(c.name)}</b><small>${esc(c.company)}</small></button></td><td>${esc(c.phone)}</td><td>${c.lastCare?new Date(c.lastCare).toLocaleDateString('vi-VN'):'Chưa có tương tác'}</td><td><span class="status warning">${c.days===9999?'Chưa chăm sóc':c.days+' ngày'}</span></td></tr>`).join('')}</tbody></table></div>
  </section>
  <section class="panel"><div class="panel-head"><div><h2>Lịch chăm sóc định kỳ</h2><p>Tạo lịch theo nhóm khách hàng.</p></div></div>
   <form id="carePlanForm" class="care-plan-form"><label>Tên lịch<input name="name" required placeholder="Ví dụ: Gọi chăm sóc xưởng mỗi tháng"></label><label>Nhóm khách hàng<select name="group_id" required>${groups}</select></label><div class="form-row"><label>Chu kỳ<select name="interval_days"><option value="7">Mỗi 7 ngày</option><option value="14">Mỗi 14 ngày</option><option value="30" selected>Mỗi 30 ngày</option><option value="60">Mỗi 60 ngày</option><option value="90">Mỗi 90 ngày</option></select></label><label>Ngày bắt đầu<input name="starts_on" type="date" required value="${new Date().toISOString().slice(0,10)}"></label></div><button class="btn btn-primary">＋ Tạo lịch định kỳ</button></form>
   <div class="intel-list">${intelligenceData.plans.map(p=>`<div><b>${esc(p.name)}</b><small>${esc(p.group_name||'Nhóm khách hàng')} · mỗi ${p.interval_days} ngày</small><span>${p.is_active?'Đang hoạt động':'Đã tạm dừng'}</span></div>`).join('')||'<p class="empty-state">Chưa có lịch định kỳ.</p>'}</div>
  </section>
 </div>
 <section class="panel"><div class="panel-head"><div><h2>Hiệu quả chăm sóc theo nhân viên</h2><p>Số tương tác đã ghi nhận và tỷ lệ hoàn thành công việc được giao.</p></div></div>
  <div class="table-scroll"><table><thead><tr><th>NHÂN VIÊN</th><th>TƯƠNG TÁC</th><th>HOÀN THÀNH</th><th>TỔNG VIỆC</th><th>TỶ LỆ HOÀN THÀNH</th></tr></thead><tbody>${staffStats||'<tr><td colspan="5">Chưa có dữ liệu nhân viên.</td></tr>'}</tbody></table></div>
 </section>`;
}


async function loadMarketData(){
 marketError='';
 try{
  if(!window.HHHData?.ready())throw new Error('Chưa kết nối Supabase.');
  const [territories,plans,visits,profiles]=await Promise.all([window.HHHData.listMarketTerritories(),window.HHHData.listMarketPlans(),window.HHHData.listMarketVisits(),window.HHHData.listProfiles()]);
  marketData={territories,plans,visits,profiles};
 }catch(e){marketError=e.message||String(e);}
 render();
}
function marketPeriodStart(){const d=new Date();if(marketPeriod==='week')d.setDate(d.getDate()-6);else if(marketPeriod==='month')d.setDate(1);else d.setMonth(0,1);d.setHours(0,0,0,0);return d;}
function renderMarketPage(){
 const start=marketPeriodStart(),periodVisits=marketData.visits.filter(v=>new Date(v.visited_at)>=start),activeTerritories=marketData.territories.filter(t=>t.is_active!==false);
 const staff=marketData.profiles;
 const canManageMarket=currentProfile?.role==='admin'||currentProfile?.role==='editor';
 const assignedCustomers=customers.filter(c=>c.assignedTo).length;
 const plans=marketData.plans;
 const visitRows=periodVisits.slice(0,12).map(v=>`<tr><td>${new Date(v.visited_at).toLocaleDateString('vi-VN')}</td><td><b>${esc(v.customer?.full_name||'Khảo sát địa bàn')}</b><small>${esc(v.territory?.province||'')}${v.territory?.ward?' · '+esc(v.territory.ward):''}</small></td><td>${esc(v.staff?.full_name||'Nhân viên')}</td><td>${esc(marketVisitType(v.visit_type))}</td><td>${esc(v.result||'—')}</td></tr>`).join('');
 const territoryRows=activeTerritories.map(t=>`<tr><td><b>${esc(t.ward||'Toàn tỉnh/thành')}</b><small>${esc([t.province,t.region].filter(Boolean).join(' · '))}</small></td><td>${esc(t.staff?.full_name||'Chưa giao')}</td><td>${customers.filter(c=>(c.province||'')===t.province&&(!t.ward||(c.ward||'')===t.ward)).length}</td><td>${Number(t.target_customers||0)||'—'}</td><td><span class="status ${t.is_active?'success':'muted'}">${t.is_active?'Đang khai thác':'Tạm dừng'}</span></td></tr>`).join('');
 const planRows=plans.slice(0,10).map(p=>`<tr><td><b>${esc(p.title)}</b><small>${esc(p.territory?.province||'')}${p.territory?.ward?' · '+esc(p.territory.ward):''}</small></td><td>${new Date(p.plan_date+'T00:00:00').toLocaleDateString('vi-VN')}</td><td>${esc(p.staff?.full_name||'Nhân viên')}</td><td>${(currentProfile?.role==='admin'||p.assigned_to===currentProfile?.id)?`<select data-market-status="${esc(p.id)}"><option value="planned" ${p.status==='planned'?'selected':''}>Đã lập kế hoạch</option><option value="in_progress" ${p.status==='in_progress'?'selected':''}>Đang thực hiện</option><option value="completed" ${p.status==='completed'?'selected':''}>Hoàn thành</option><option value="cancelled" ${p.status==='cancelled'?'selected':''}>Đã hủy</option></select>`:esc(({planned:'Đã lập kế hoạch',in_progress:'Đang thực hiện',completed:'Hoàn thành',cancelled:'Đã hủy'})[p.status]||p.status)}</td></tr>`).join('');
 const byProvince=countBy(customers,c=>c.province||'Chưa có tỉnh/thành').slice(0,8);
 return `<div class="stats-grid">${stat('Địa bàn đang khai thác',activeTerritories.length,'','Vùng/tỉnh/xã đã giao phụ trách','⌖','blue')}${stat('Khách hàng đã phân công',assignedCustomers,'','Có nhân viên phụ trách','♙','green')}${stat('Lượt đi thị trường',periodVisits.length,'','Theo khoảng thời gian đã chọn','↗','orange')}${stat('Kế hoạch chưa hoàn thành',plans.filter(p=>p.status==='planned'||p.status==='in_progress').length,'','Đã lập hoặc đang thực hiện','▣','purple')}</div>
 ${marketError?`<section class="panel"><b>Chưa tải được dữ liệu thị trường</b><p>${esc(marketError)}</p><p class="field-hint">Hãy chạy migration Phase 3.0 trong Supabase rồi tải lại.</p></section>`:''}
 <div class="panel market-toolbar"><div><h2>Điều hành thị trường</h2><p>Quản lý địa bàn, nhân sự, kế hoạch và kết quả khảo sát.</p></div><div class="market-actions"><button class="btn btn-light" data-market-reload>↻ Làm mới</button>${currentProfile?.role==='admin'?'<button class="btn btn-light" data-geo-template>⇩ Mẫu dữ liệu địa lý</button><label class="btn btn-light market-upload">⇧ Import Excel/CSV<input id="geoImportFile" type="file" accept=".csv,.xlsx,.xls,text/csv" hidden></label><button class="btn btn-primary" data-market-territory-add>＋ Giao địa bàn</button>':''}${canManageMarket?'<button class="btn btn-primary" data-market-plan-add>＋ Lập kế hoạch</button><button class="btn btn-primary" data-market-visit-add>＋ Ghi nhận chuyến đi</button>':''}</div></div>
 <div class="panel"><div class="panel-head"><div><h2>Phân bố khách hàng theo tỉnh/thành</h2><p>Thống kê từ dữ liệu khách hàng hiện có, bao gồm hồ sơ chưa có tọa độ.</p></div></div><div class="market-province-grid">${byProvince.map(([name,n])=>`<div><span>${esc(name)}</span><b>${n}</b><i style="width:${Math.max(3,Math.round(n/Math.max(1,customers.length)*100))}%"></i></div>`).join('')||'<div class="empty-state">Chưa có dữ liệu địa bàn.</div>'}</div></div>
 <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Địa bàn được giao</h2><p>Phân công theo tỉnh/thành và xã/phường.</p></div></div><div class="table-scroll"><table><thead><tr><th>ĐỊA BÀN</th><th>NHÂN VIÊN</th><th>KHÁCH HIỆN CÓ</th><th>MỤC TIÊU</th><th>TRẠNG THÁI</th></tr></thead><tbody>${territoryRows||'<tr><td colspan="5">Chưa có địa bàn. Admin hãy tạo phân công đầu tiên.</td></tr>'}</tbody></table></div></section>
 <section class="panel"><div class="panel-head"><div><h2>Kế hoạch đi thị trường</h2><p>Theo dõi lịch làm việc ngoài thị trường.</p></div></div><div class="table-scroll"><table><thead><tr><th>KẾ HOẠCH</th><th>NGÀY</th><th>NHÂN VIÊN</th><th>TIẾN ĐỘ</th></tr></thead><tbody>${planRows||'<tr><td colspan="4">Chưa có kế hoạch thị trường.</td></tr>'}</tbody></table></div></section></div>
 <section class="panel"><div class="panel-head"><div><h2>Nhật ký đi thị trường</h2><p>Hoạt động ghi nhận trong kỳ.</p></div><div class="segmented">${[['week','7 ngày'],['month','Tháng'],['year','Năm']].map(([v,l])=>`<button data-market-period="${v}" class="${marketPeriod===v?'active':''}">${l}</button>`).join('')}</div></div><div class="table-scroll"><table><thead><tr><th>NGÀY</th><th>KHÁCH HÀNG / ĐỊA BÀN</th><th>NHÂN VIÊN</th><th>HÌNH THỨC</th><th>KẾT QUẢ</th></tr></thead><tbody>${visitRows||'<tr><td colspan="5">Chưa có lượt đi thị trường trong kỳ.</td></tr>'}</tbody></table></div></section>`;
}
function marketVisitType(v){return ({customer_visit:'Thăm khách hàng',prospecting:'Tìm khách mới',survey:'Khảo sát địa bàn',partner_meeting:'Gặp đối tác',other:'Khác'})[v]||v||'—';}
function openMarketTerritoryModal(){
 if(currentProfile?.role!=='admin'){notify('Chỉ Admin được giao địa bàn.');return;}
 const staff=marketData.profiles.map(p=>`<option value="${esc(p.id)}">${esc(p.full_name||p.email)}</option>`).join('');
 const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<form class="modal"><div class="modal-head"><div><h2>Giao địa bàn thị trường</h2><p>Một địa bàn có một nhân viên phụ trách chính.</p></div><button type="button" class="icon-btn" data-close>✕</button></div><div class="form-row"><label>Khu vực<select name="region"><option>Miền Bắc</option><option selected>Miền Trung</option><option>Miền Nam</option></select></label><label>Tỉnh / thành phố<input name="province" required placeholder="Đà Nẵng"></label></div><label>Xã / phường<input name="ward" placeholder="Để trống nếu giao toàn tỉnh/thành"></label><label>Nhân viên phụ trách<select name="assigned_to" required>${staff}</select></label><div class="form-row"><label>Mục tiêu khách hàng<input name="target_customers" type="number" min="0" value="0"></label><label>Ghi chú<input name="notes" placeholder="Phạm vi, tuyến, lưu ý..."></label></div><div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary">Lưu địa bàn</button></div></form>`;
 document.body.appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))wrap.remove();});wrap.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await window.HHHData.saveMarketTerritory({region:f.get('region'),province:String(f.get('province')).trim(),ward:String(f.get('ward')||'').trim()||null,assigned_to:f.get('assigned_to'),target_customers:Number(f.get('target_customers')||0),notes:f.get('notes')});wrap.remove();await loadMarketData();notify('Đã lưu địa bàn phụ trách.');}catch(err){notify('Không thể lưu địa bàn: '+err.message);}});
}
function openMarketPlanModal(){
 const territories=marketData.territories.map(t=>`<option value="${esc(t.id)}">${esc([t.ward,t.province,t.region].filter(Boolean).join(' · '))}</option>`).join('');
 const staffOptions=(currentProfile?.role==='admin'?marketData.profiles:marketData.profiles.filter(p=>p.id===currentProfile?.id)).map(p=>`<option value="${esc(p.id)}" ${p.id===currentProfile?.id?'selected':''}>${esc(p.full_name||p.email)}</option>`).join('');
 const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<form class="modal"><div class="modal-head"><div><h2>Lập kế hoạch đi thị trường</h2><p>Xác định địa bàn, người thực hiện và mục tiêu.</p></div><button type="button" class="icon-btn" data-close>✕</button></div><label>Tên kế hoạch<input name="title" required placeholder="Khảo sát đại lý khu vực Sơn Trà"></label><div class="form-row"><label>Địa bàn<select name="territory_id"><option value="">Chưa gắn địa bàn</option>${territories}</select></label><label>Nhân viên<select name="assigned_to">${staffOptions}</select></label></div><label>Ngày thực hiện<input name="plan_date" type="date" required value="${new Date().toISOString().slice(0,10)}"></label><label>Mục tiêu<textarea name="objective" rows="3" placeholder="Gặp đại lý, khảo sát xưởng, tìm khách hàng mới..."></textarea></label><div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary">Tạo kế hoạch</button></div></form>`;
 document.body.appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))wrap.remove();});wrap.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await window.HHHData.createMarketPlan(Object.fromEntries(f.entries()));wrap.remove();await loadMarketData();notify('Đã tạo kế hoạch thị trường.');}catch(err){notify('Không thể tạo kế hoạch: '+err.message);}});
}
function openMarketVisitModal(){
 const customerOptions=customers.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}${c.company?' · '+esc(c.company):''}</option>`).join('');
 const territories=marketData.territories.map(t=>`<option value="${esc(t.id)}">${esc([t.ward,t.province].filter(Boolean).join(' · '))}</option>`).join('');
 const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<form class="modal"><div class="modal-head"><div><h2>Ghi nhận chuyến đi thị trường</h2><p>Lưu kết quả khảo sát hoặc làm việc với khách hàng.</p></div><button type="button" class="icon-btn" data-close>✕</button></div><label>Khách hàng<select name="customer_id"><option value="">Khảo sát / tìm khách mới</option>${customerOptions}</select></label><label>Địa bàn<select name="territory_id"><option value="">Chưa gắn địa bàn</option>${territories}</select></label><div class="form-row"><label>Ngày thực hiện<input name="visited_at" type="datetime-local" required value="${new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}"></label><label>Hình thức<select name="visit_type"><option value="customer_visit">Thăm khách hàng</option><option value="prospecting">Tìm khách mới</option><option value="survey">Khảo sát địa bàn</option><option value="partner_meeting">Gặp đối tác</option><option value="other">Khác</option></select></label></div><label>Kết quả<textarea name="result" rows="2" placeholder="Nhu cầu, tình hình thị trường, đối thủ..."></textarea></label><label>Bước tiếp theo<textarea name="next_action" rows="2"></textarea></label><label>Ghi chú<textarea name="notes" rows="2"></textarea></label><div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary">Lưu nhật ký</button></div></form>`;
 document.body.appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))wrap.remove();});wrap.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await window.HHHData.createMarketVisit(Object.fromEntries(f.entries()));wrap.remove();await loadMarketData();notify('Đã ghi nhận chuyến đi thị trường.');}catch(err){notify('Không thể lưu nhật ký: '+err.message);}});
}
async function updateMarketPlanStatus(id,status){try{await window.HHHData.updateMarketPlanStatus(id,status);await loadMarketData();}catch(e){notify('Không cập nhật được kế hoạch: '+e.message);}}
function downloadGeoTemplate(){const csv='\uFEFFcustomer_code,phone,region,province,ward,address,location_url\r\n,0900000000,Miền Trung,Đà Nẵng,Phường Hải Châu,Địa chỉ mẫu,https://maps.google.com/';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='HHH-CRM-mau-import-dia-ly.csv';a.click();URL.revokeObjectURL(a.href);}
async function importGeographyFile(file){
 if(!file)return;if(!liveMode){notify('Import địa lý chỉ khả dụng khi đã kết nối Supabase.');return;}
 let rows=[];
 try{
  if(/\.xlsx?$/i.test(file.name)){
   if(!window.XLSX)throw new Error('Thư viện đọc Excel chưa tải được. Hãy dùng CSV hoặc kiểm tra Internet.');
   const data=await file.arrayBuffer(),book=window.XLSX.read(data,{type:'array'});rows=window.XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:''});
  }else{
   const text=await file.text(),lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
   const parse=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'&&line[i+1]==='"'&&q){cur+='"';i++;}else if(ch==='"')q=!q;else if(ch===','&&!q){out.push(cur);cur='';}else cur+=ch;}out.push(cur);return out;};
   const headers=parse(lines[0]).map(x=>x.trim());rows=lines.slice(1).map(line=>Object.fromEntries(parse(line).map((v,i)=>[headers[i],v])));
  }
 }catch(e){notify('Không đọc được file: '+e.message);return;}
 const norm=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[String(k).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]/g,''),String(v??'').trim()]));
 const byPhone=new Map();customers.forEach(c=>{const key=String(c.phone||'').replace(/\D/g,'');if(key){if(!byPhone.has(key))byPhone.set(key,[]);byPhone.get(key).push(c);}});
 const updates=[];let skipped=0;
 for(const raw of rows){const r=norm(raw),phone=(r.phone||r.dienthoai||r.sodienthoai||'').replace(/\D/g,'');const matches=byPhone.get(phone)||[];if(matches.length!==1){skipped++;continue;}const c=matches[0];const url=r.locationurl||r.linkgooglemaps||c.locationUrl;const coords=url?extractGoogleMapsCoordinates(url):null;updates.push({id:c.id,region:r.region||r.khuvuc||c.region,province:r.province||r.tinhthanhpho||r.tinh||c.province,ward:r.ward||r.xaphuong||r.xa||c.ward,address:r.address||r.diachi||c.address,location_url:url,location_lat:coords?.lat??c.locationLat,location_lng:coords?.lng??c.locationLng});}
 if(!updates.length){notify('Không tìm thấy số điện thoại khớp duy nhất. Không có dữ liệu nào được thay đổi.');return;}
 if(!confirm(`Tìm thấy ${updates.length} hồ sơ khớp duy nhất theo số điện thoại; bỏ qua ${skipped} dòng không khớp hoặc trùng. Chỉ cập nhật địa chỉ/khu vực, không tạo hoặc xóa khách hàng. Tiếp tục?`))return;
 try{for(const u of updates)await window.HHHData.updateCustomer(u.id,{region:u.region,province:u.province,ward:u.ward,address:u.address,location_url:u.location_url,location_lat:u.location_lat,location_lng:u.location_lng});await loadLiveCustomers();notify(`Đã cập nhật địa lý cho ${updates.length} khách hàng; bỏ qua ${skipped} dòng.`);}catch(e){notify('Import dừng do lỗi: '+e.message);}
}

let kpiPeriod='month', kpiStaff='all';
let mapRegionFilter='all', mapProvinceFilter='all', mapWardFilter='all';
async function logoutUser(){
 if(!window.HHH_DB?.client){location.href='login.html';return;}
 if(!confirm('Bạn chắc chắn muốn đăng xuất khỏi HHH CRM?'))return;
 try{const {error}=await window.HHH_DB.client.auth.signOut();if(error)throw error;location.replace('login.html');}
 catch(e){notify('Đăng xuất chưa thành công: '+(e.message||e));}
}
async function loadKpi(){
 kpiError='';
 try{const [profiles,rows,activities,tasks]=await Promise.all([
  window.HHHData.listProfiles(),window.HHHData.listCustomers({limit:2000}),window.HHHData.listAllActivities(),window.HHHData.listCareTasks()
 ]);kpiData={profiles,customers:rows,activities,tasks};
 }catch(e){kpiError=e.message||String(e);}
 render();
}
function renderKpiPage(){
 const now=new Date();let start=new Date(now);
 if(kpiPeriod==='week'){start.setDate(now.getDate()-6);start.setHours(0,0,0,0);}
 else if(kpiPeriod==='month'){start=new Date(now.getFullYear(),now.getMonth(),1);}
 else {start=new Date(now.getFullYear(),0,1);}
 const inPeriod=d=>d&&new Date(d)>=start&&new Date(d)<=now;
 const staff=kpiData.profiles.filter(p=>kpiStaff==='all'||p.id===kpiStaff);
 const rows=staff.map(p=>{
  const cs=kpiData.customers.filter(c=>c.assigned_to===p.id);
  const acts=kpiData.activities.filter(a=>a.created_by===p.id&&inPeriod(a.occurred_at));
  const tasks=kpiData.tasks.filter(x=>x.assigned_to===p.id&&inPeriod(x.created_at));
  const done=tasks.filter(x=>x.status==='completed').length;
  const calls=acts.filter(a=>a.activity_type==='call').length;
  const meetings=acts.filter(a=>a.activity_type==='meeting'||a.activity_type==='visit').length;
  return {p,customers:cs.length,acts:acts.length,calls,meetings,tasks:tasks.length,done,rate:tasks.length?Math.round(done/tasks.length*100):0};
 });
 const sum=k=>rows.reduce((a,r)=>a+r[k],0);
 return `<div class="table-tools"><label>Thời gian <select id="kpiPeriod"><option value="week" ${kpiPeriod==='week'?'selected':''}>7 ngày gần đây</option><option value="month" ${kpiPeriod==='month'?'selected':''}>Tháng này</option><option value="year" ${kpiPeriod==='year'?'selected':''}>Năm nay</option></select></label><label>Nhân viên <select id="kpiStaff"><option value="all">Tất cả nhân viên</option>${kpiData.profiles.map(p=>`<option value="${esc(p.id)}" ${kpiStaff===p.id?'selected':''}>${esc(p.full_name||p.email||'Nhân viên')}</option>`).join('')}</select></label><button class="btn btn-light" data-kpi-reload>↻ Làm mới</button></div>
 ${kpiError?`<section class="panel"><b>Không tải được báo cáo</b><p>${esc(kpiError)}</p><p class="field-hint">Kiểm tra quyền SELECT của tài khoản và migration Phase 2.9.</p></section>`:`<div class="stats-grid">${stat('Khách đang phụ trách',sum('customers'),'','Theo phân công hiện tại','♙','blue')}${stat('Tương tác',sum('acts'),'','Trong kỳ đã chọn','◎','green')}${stat('Công việc hoàn thành',sum('done'),'','Trong kỳ đã chọn','✓','purple')}${stat('Tỷ lệ hoàn thành',`${sum('tasks')?Math.round(sum('done')/sum('tasks')*100):0}%`,'','Công việc hoàn tất / tổng công việc','◷','orange')}</div>
 <section class="panel"><div class="panel-head"><div><h2>Hiệu suất theo nhân viên</h2><p>KPI được tổng hợp từ khách hàng, activities và care_tasks trong Supabase.</p></div></div><div class="table-scroll"><table><thead><tr><th>NHÂN VIÊN</th><th>KHÁCH PHỤ TRÁCH</th><th>TƯƠNG TÁC</th><th>CUỘC GỌI</th><th>GẶP KHÁCH</th><th>CÔNG VIỆC</th><th>HOÀN THÀNH</th><th>TỶ LỆ</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.p.full_name||r.p.email||'Nhân viên')}</b><small>${esc(r.p.email||'')}</small></td><td>${r.customers}</td><td>${r.acts}</td><td>${r.calls}</td><td>${r.meetings}</td><td>${r.tasks}</td><td>${r.done}</td><td><b>${r.rate}%</b></td></tr>`).join('')||'<tr><td colspan="8">Chưa có dữ liệu nhân viên.</td></tr>'}</tbody></table></div></section>`}`;
}

async function loadStaff(){
 try{staffError='';staffRows=await window.HHHData.listStaff();render();}
 catch(e){staffError=e.message||String(e);render();}
}
function renderStaffPage(){
 const rows=staffRows.map(u=>`<tr><td><b>${esc(u.full_name||'Chưa đặt tên')}</b><small>${esc(u.email||'')}</small></td><td><span class="status info">${esc(u.id.slice(0,8))}</span></td><td><select data-staff-role data-staff-id="${esc(u.id)}" ${u.id===currentProfile?.id?'disabled':''}><option value="admin" ${u.role==='admin'?'selected':''}>Admin</option><option value="editor" ${u.role==='editor'?'selected':''}>Editor</option><option value="viewer" ${u.role==='viewer'?'selected':''}>Viewer</option></select></td><td><label class="staff-toggle"><input type="checkbox" data-staff-active data-staff-id="${esc(u.id)}" ${u.is_active?'checked':''} ${u.id===currentProfile?.id?'disabled':''}><span>${u.is_active?'Đang hoạt động':'Đã khóa'}</span></label></td><td>${u.created_at?new Date(u.created_at).toLocaleDateString('vi-VN'):'—'}</td></tr>`).join('');
 return `<section class="panel"><div class="panel-head"><div><h2>Danh sách nhân viên</h2><p>Thay đổi vai trò và trạng thái truy cập CRM. Quyền thực tế được kiểm soát bằng RLS trong Supabase.</p></div><button class="btn btn-light" data-staff-reload>↻ Làm mới</button></div>${staffError?`<div class="empty-state">Không tải được nhân viên: ${esc(staffError)}<br>Kiểm tra migration Phase 2.8 và quyền admin.</div>`:`<div class="table-scroll"><table><thead><tr><th>NHÂN VIÊN</th><th>MÃ TÀI KHOẢN</th><th>VAI TRÒ</th><th>TRẠNG THÁI</th><th>NGÀY TẠO</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Chưa có tài khoản nhân viên.</td></tr>'}</tbody></table></div>`}</section>
 <section class="panel staff-role-guide"><div class="panel-head"><div><h2>Giải thích vai trò</h2><p>Phân quyền áp dụng trên dữ liệu CRM.</p></div></div><div class="staff-role-grid"><article><b>Admin</b><p>Quản trị tài khoản, xem và quản lý toàn bộ dữ liệu, được phép xóa theo policy.</p></article><article><b>Editor</b><p>Xem, thêm và chỉnh sửa dữ liệu. Không được xóa dữ liệu.</p></article><article><b>Viewer</b><p>Chỉ xem dữ liệu, không được thêm, sửa hoặc xóa.</p></article></div><p class="field-hint">Tạo tài khoản mới tại Supabase → Authentication → Users → Add user. Sau đó tải lại danh sách để gán vai trò.</p></section>`;
}
async function saveStaffAccess(id,role,isActive){
 try{await window.HHHData.updateStaffAccess({user_id:id,role,is_active:isActive});notify('Đã cập nhật quyền nhân viên.');await loadStaff();}
 catch(e){notify('Không thể cập nhật quyền: '+(e.message||e));await loadStaff();}
}
async function loadCurrentProfile(){
 try{const {data:{user}}=await window.HHH_DB.client.auth.getUser();if(!user)return;const {data,error}=await window.HHH_DB.client.from('profiles').select('id,full_name,email,role,is_active').eq('id',user.id).single();if(error)throw error;currentProfile=data;if(!data.is_active){await window.HHH_DB.client.auth.signOut();location.href='login.html';return;}render();}
 catch(e){console.warn('Không tải được hồ sơ quyền:',e.message);}
}

function bindEvents(){
 document.querySelectorAll('[data-nav]').forEach(el=>el.addEventListener('click',async()=>{active=el.dataset.nav;selectedCustomerId=null;customerActivities=[];query='';filter='Tất cả';document.getElementById('sidebar')?.classList.remove('sidebar-open');render();if(active==='Nhân viên & phân quyền')await loadStaff();else await loadModuleForActive();}));
 document.querySelectorAll('[data-staff-role]').forEach(el=>el.addEventListener('change',()=>saveStaffAccess(el.dataset.staffId,el.value,null)));
 document.querySelectorAll('[data-staff-active]').forEach(el=>el.addEventListener('change',()=>saveStaffAccess(el.dataset.staffId,null,el.checked)));
 document.querySelector('[data-staff-reload]')?.addEventListener('click',loadStaff);
 document.querySelector('[data-kpi-reload]')?.addEventListener('click',loadKpi);
 document.querySelector('[data-market-reload]')?.addEventListener('click',loadMarketData);
 document.querySelector('[data-market-territory-add]')?.addEventListener('click',openMarketTerritoryModal);
 document.querySelector('[data-market-plan-add]')?.addEventListener('click',openMarketPlanModal);
 document.querySelector('[data-market-visit-add]')?.addEventListener('click',openMarketVisitModal);
 document.querySelectorAll('[data-market-period]').forEach(el=>el.addEventListener('click',()=>{marketPeriod=el.dataset.marketPeriod;render();}));
 document.querySelectorAll('[data-market-status]').forEach(el=>el.addEventListener('change',()=>updateMarketPlanStatus(el.dataset.marketStatus,el.value)));
 document.getElementById('geoImportFile')?.addEventListener('change',e=>importGeographyFile(e.target.files?.[0]));
 document.querySelector('[data-geo-template]')?.addEventListener('click',downloadGeoTemplate);
 document.getElementById('kpiPeriod')?.addEventListener('change',e=>{kpiPeriod=e.target.value;render();});
 document.getElementById('kpiStaff')?.addEventListener('change',e=>{kpiStaff=e.target.value;render();});
 document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>action(el.dataset.action)));
 document.querySelectorAll('[data-customer]').forEach(el=>el.addEventListener('click',()=>{const c=customers.find(x=>String(x.id||x.phone)===el.dataset.customer);if(c)showCustomer(c);}));
 document.querySelector('[data-back-customers]')?.addEventListener('click',()=>{selectedCustomerId=null;customerActivities=[];render();});
 document.querySelectorAll('[data-edit-customer]').forEach(el=>el.addEventListener('click',()=>{const c=customers.find(x=>String(x.id||x.phone)===String(selectedCustomerId));if(c)openEditCustomer(c,null);}));
 document.querySelectorAll('[data-add-activity]').forEach(el=>el.addEventListener('click',()=>{const c=customers.find(x=>String(x.id||x.phone)===String(selectedCustomerId));if(c)openActivityModal(c,null);}));
 document.querySelector('[data-add-contact]')?.addEventListener('click',()=>openContactModal());
 document.querySelectorAll('[data-delete-contact]').forEach(el=>el.addEventListener('click',()=>deleteContact(el.dataset.deleteContact)));
 document.querySelector('[data-edit-classification]')?.addEventListener('click',()=>{const c=customers.find(x=>String(x.id||x.phone)===String(selectedCustomerId));if(c)openEditCustomer(c,null);});
 document.querySelector('[data-add-tag]')?.addEventListener('click',()=>openTagModal());
 document.querySelectorAll('[data-remove-tag]').forEach(el=>el.addEventListener('click',()=>removeTag(el.dataset.removeTag)));
 document.querySelector('[data-add-care-group]')?.addEventListener('click',()=>openCareGroupModal());
 document.querySelectorAll('[data-remove-care-group]').forEach(el=>el.addEventListener('click',()=>removeCareGroup(el.dataset.removeCareGroup)));
 document.getElementById('customerDocumentUpload')?.addEventListener('change',e=>uploadCustomerDocuments(e.target.files));
 document.querySelectorAll('[data-download-document]').forEach(el=>el.addEventListener('click',()=>downloadCustomerDocument(el.dataset.downloadDocument)));
 document.querySelectorAll('[data-delete-document]').forEach(el=>el.addEventListener('click',()=>deleteCustomerDocument(el.dataset.deleteDocument)));
 document.getElementById('globalSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter'){query=e.target.value;active='Khách hàng';render();}});
 document.getElementById('customerSearch')?.addEventListener('input',e=>{query=e.target.value;const pos=e.target.selectionStart;render();const input=document.getElementById('customerSearch');if(input){input.focus();input.setSelectionRange(pos,pos);}});
 document.getElementById('statusFilter')?.addEventListener('change',e=>{filter=e.target.value;render();});
 document.querySelectorAll('[data-reload]').forEach(el=>el.addEventListener('click',()=>loadModule(el.dataset.reload)));
 document.getElementById('leadSearch')?.addEventListener('input',e=>{leadFilters.search=e.target.value;render();const i=document.getElementById('leadSearch');i?.focus();i?.setSelectionRange(i.value.length,i.value.length);});
 document.getElementById('leadStageFilter')?.addEventListener('change',e=>{leadFilters.stage=e.target.value;render();});
 document.getElementById('leadAssigneeFilter')?.addEventListener('change',e=>{leadFilters.assignee=e.target.value;render();});
 document.querySelector('[data-lead-refresh]')?.addEventListener('click',()=>loadModule('leads'));
 document.querySelectorAll('[data-lead-edit]').forEach(el=>el.addEventListener('click',()=>openLeadEdit(el.dataset.leadEdit)));
 document.querySelectorAll('[data-lead-assign]').forEach(el=>el.addEventListener('click',()=>openLeadAssign(el.dataset.leadAssign)));
 document.querySelectorAll('[data-lead-stage]').forEach(el=>el.addEventListener('click',()=>openLeadStage(el.dataset.leadStage)));
 document.querySelectorAll('[data-lead-detail]').forEach(el=>el.addEventListener('click',()=>openLeadDetail(el.dataset.leadDetail)));

 document.getElementById('carePlanForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await window.HHHData.createCarePlan({name:f.get('name'),group_id:f.get('group_id'),interval_days:Number(f.get('interval_days')),starts_on:f.get('starts_on')});notify('Đã tạo lịch chăm sóc định kỳ.');await loadCustomerIntelligence();}catch(err){notify('Không thể tạo lịch: '+err.message);}});

 document.getElementById('scrim')?.addEventListener('click',()=>document.getElementById('sidebar')?.classList.remove('sidebar-open'));
}
async function loadModuleForActive(){
 if(active==='Phân công & KPI'){await loadKpi();return;}
 const map={'Khách tiềm năng':'leads','Cơ hội bán hàng':'opportunities','Đơn hàng':'orders','Trung tâm CSKH':'complaints','Lịch chăm sóc':'care_tasks','Công việc':'care_tasks'};
 const key=map[active];if(key)await loadModule(key); else if(active==='Phân tích khách hàng') await loadCustomerIntelligence(); else if(active==='Quản lý thị trường') await loadMarketData();
}
async function loadModule(key){
 moduleLoading[key]=true;moduleError[key]='';render();
 try{
   if(!window.HHHData?.ready())throw new Error('Chưa kết nối Supabase.');
   if(key==='leads'){moduleRows[key]=await window.HHHData.listRows('leads','id,full_name,company_name,phone,email,source,stage,assigned_to,created_by,customer_type,region,province,ward,notes,next_follow_up_at,estimated_value,lost_reason,converted_customer_id,created_at,updated_at');leadProfiles=await window.HHHData.listProfiles();}
   else moduleRows[key]=await window.HHHData.listRows(moduleConfig[key].table,moduleConfig[key].select);
 }catch(e){moduleError[key]=e.message||String(e);}
 finally{moduleLoading[key]=false;render();}
}
function refreshTable(){const q=query.toLowerCase();const rows=[...document.querySelectorAll('tbody tr')];rows.forEach(row=>{const text=row.textContent.toLowerCase();row.hidden=!(text.includes(q))|| (filter!=='Tất cả'&&!row.querySelector('.status')?.textContent.includes(filter));});const count=rows.filter(r=>!r.hidden).length;const label=document.querySelector('.table-footer span');if(label)label.innerHTML=`Hiển thị <b>${count}</b> trên <b>${customers.length}</b> khách hàng`;const empty=document.querySelector('.empty-state');if(empty)empty.style.display=count?'none':'block';}
function action(type){switch(type){case'add':openModal();break;case'logout':logoutUser();break;case'open-nav':document.getElementById('sidebar')?.classList.add('sidebar-open');break;case'close-nav':document.getElementById('sidebar')?.classList.remove('sidebar-open');break;case'help':notify('Chọn từng module ở thanh điều hướng để quản lý nghiệp vụ riêng.');break;case'settings':notify('Cấu hình hệ thống sẽ được bổ sung ở phase sau.');break;case'notifications':notify('Bạn đã xem các thông báo mới nhất.');break;case'page':notify('Đang hiển thị danh sách dữ liệu đã tải.');break;case'export':exportCsv();break;case'module-add':openModuleModal();break;}}
async function populateAssignees(select,selected=''){if(!select||!window.HHHData?.ready())return;try{const users=await window.HHHData.listProfiles();select.innerHTML='<option value="">Chưa phân công</option>'+users.map(u=>`<option value="${esc(u.id)}" ${u.id===selected?'selected':''}>${esc(u.full_name||u.email||'Nhân viên')}</option>`).join('');if(!selected&&currentProfile?.id)select.value=currentProfile.id;}catch(e){select.innerHTML='<option value="">Không tải được danh sách nhân viên</option>';}}
function openModal(){const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.id='addModal';wrap.innerHTML=`<form class="modal" id="customerForm"><div class="modal-head"><div><h2>Thêm khách hàng mới</h2><p>Nhập thông tin cơ bản để tạo hồ sơ khách hàng.</p></div><button type="button" class="icon-btn" data-close>✕</button></div><label>Họ và tên<input name="name" required placeholder="Nhập họ tên khách hàng"></label><label>Tên công ty / cửa hàng<input name="company" placeholder="Nhập tên đơn vị"></label><div class="form-row"><label>Số điện thoại<input name="phone" required type="tel" placeholder="09xx xxx xxx"></label><label>Nhóm khách hàng<select name="type"><option>Đại lý</option><option>Xưởng sản xuất</option><option>Thợ nhôm kính</option><option>Cửa hàng</option><option>Khác</option></select></label></div><label>Email<input name="email" type="email" placeholder="email@example.com"></label><label>Nhân viên phụ trách<select name="assigned_to" data-assignee><option value="">Đang tải nhân viên...</option></select></label><label>Địa chỉ<input name="address" placeholder="Địa chỉ khách hàng"></label><label>Link định vị Google Maps<input name="location_url" placeholder="Dán link chia sẻ Google Maps tại đây"></label><div data-map-input-preview class="location-preview-wrap"></div><label>Mô tả khách hàng<textarea name="customer_description" rows="3" placeholder="Quy mô, nhu cầu, đặc điểm, lịch sử làm việc..."></textarea></label><div class="form-row"><label>Khu vực<select name="region"><option value="">Chọn khu vực</option><option>Miền Bắc</option><option>Miền Trung</option><option>Miền Nam</option></select></label><label>Tỉnh / thành<input name="province" placeholder="Đà Nẵng"></label></div><label>Xã / phường<input name="ward" placeholder="Ví dụ: Phường Hải Châu"></label><div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary" type="submit">＋ Tạo khách hàng</button></div></form>`;document.body.appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))wrap.remove();});populateAssignees(wrap.querySelector('[data-assignee]'));bindLocationPreview(wrap.querySelector('form'));wrap.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),phone=String(f.get('phone')).trim();const locationUrl=String(f.get('location_url')||'').trim();if(locationUrl&&!isGoogleMapsLink(locationUrl)){notify('Vui lòng nhập link HTTPS từ Google Maps.');return;}const coords=extractGoogleMapsCoordinates(locationUrl);const payload={full_name:String(f.get('name')).trim(),company_name:String(f.get('company')).trim(),phone,email:String(f.get('email')).trim(),customer_type:String(f.get('type')),business_unit:'aluminum',status:'Tiềm năng',address:String(f.get('address')||'').trim(),province:String(f.get('province')||'').trim(),region:String(f.get('region')||'').trim(),ward:String(f.get('ward')||'').trim(),location_url:locationUrl,location_lat:coords?.lat??null,location_lng:coords?.lng??null,customer_description:String(f.get('customer_description')||'').trim(),assigned_to:String(f.get('assigned_to')||'')||null};try{if(liveMode){await window.HHHData.createCustomer(payload);await loadLiveCustomers();}else{customers.unshift(mapCustomer({full_name:payload.full_name,company_name:payload.company_name,phone,email:payload.email,customer_type:payload.customer_type,status:'Tiềm năng',address:payload.address,province:payload.province,region:payload.region,ward:payload.ward,location_url:payload.location_url,location_lat:payload.location_lat,location_lng:payload.location_lng,customer_description:payload.customer_description}));saveCustomers();render();}query='';filter='Tất cả';wrap.remove();notify(liveMode?'Đã lưu khách hàng vào Supabase.':'Đã thêm khách hàng vào dữ liệu demo.');}catch(err){notify('Không thể lưu khách hàng: '+(err.message||err));}});}
async function showCustomer(c){
 active='Khách hàng';selectedCustomerId=String(c.id||c.phone);currentCustomer=c;customerActivities=[];customerContacts=[];customerDocuments=[];customerTags=[];customerCareGroups=[];customerActivitiesLoading=liveMode&&!!c.id;render();
 if(liveMode&&c.id){customerExtrasLoading=true;try{const results=await Promise.all([window.HHHData.listActivities(c.id),window.HHHData.listCustomerContacts(c.id),window.HHHData.listCustomerDocuments(c.id),window.HHHData.listCustomerTags(c.id),window.HHHData.listCustomerCareGroups(c.id)]);[customerActivities,customerContacts,customerDocuments,customerTags,customerCareGroups]=results;}catch(err){notify('Không tải được dữ liệu hồ sơ: '+err.message);}finally{customerActivitiesLoading=false;customerExtrasLoading=false;render();}}
}
function openEditCustomer(c,parent){
 const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.style.zIndex='120';
 wrap.innerHTML=`<form class="modal edit-customer-form"><div class="modal-head"><div><h2>Cập nhật hồ sơ khách hàng</h2><p>Bổ sung thông tin chi tiết và vị trí Google Maps</p></div><button type="button" class="icon-btn" data-close>✕</button></div>
 <label>Họ và tên<input name="full_name" required value="${esc(c.name)}"></label><label>Công ty / cửa hàng<input name="company_name" value="${esc(c.company)}"></label>
 <div class="form-row"><label>Điện thoại<input name="phone" value="${esc(c.phone)}"></label><label>Nhóm khách hàng<input name="customer_type" value="${esc(c.type)}"></label></div>
 <label>Địa chỉ<input name="address" value="${esc(c.address)}"></label><div class="form-row"><label>Khu vực<select name="region">${['','Miền Bắc','Miền Trung','Miền Nam'].map(x=>`<option value="${x}" ${c.region===x?'selected':''}>${x||'Chọn khu vực'}</option>`).join('')}</select></label><label>Tỉnh / thành<input name="province" value="${esc(c.province)}"></label></div><label>Xã / phường<input name="ward" value="${esc(c.ward)}" placeholder="Ví dụ: Phường Hải Châu"></label>
 <label>Link định vị Google Maps<input name="location_url" value="${esc(c.locationUrl)}" placeholder="Dán link Google Maps (ưu tiên link có tọa độ)"><small class="field-hint">Hỗ trợ link Google Maps có tọa độ dạng @lat,lng hoặc !3dlat!4dlng. Link rút gọn maps.app.goo.gl có thể cần mở rộng trước.</small></label><div data-map-input-preview class="location-preview-wrap"></div>
 <div class="form-row"><label>Email<input name="email" type="email" value="${esc(c.email)}"></label><label>Người liên hệ<input name="contact_person" value="${esc(c.contact)}"></label></div>
 <div class="form-row"><label>Mã số thuế<input name="tax_code" value="${esc(c.taxCode)}"></label><label>Trạng thái<select name="status">${['Tiềm năng','Đang hoạt động','Cần chăm sóc','Ngừng giao dịch'].map(x=>`<option ${c.status===x?'selected':''}>${x}</option>`).join('')}</select></label></div>
 <div class="form-row"><label>Quy mô khách hàng<select name="business_scale">${['Chưa phân loại','Cá nhân / hộ kinh doanh','Nhỏ','Vừa','Lớn','Doanh nghiệp / chuỗi'].map(x=>`<option ${c.businessScale===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Mức tiềm năng<select name="potential_level">${['Chưa đánh giá','Thấp','Trung bình','Cao','Chiến lược'].map(x=>`<option ${c.potentialLevel===x?'selected':''}>${x}</option>`).join('')}</select></label></div><label>Điểm tiềm năng (0–100)<input name="potential_score" type="number" min="0" max="100" value="${c.potentialScore??''}" placeholder="Để trống nếu chưa đánh giá"></label>
 <label>Mô tả khách hàng<textarea name="customer_description" rows="4" placeholder="Quy mô kinh doanh, lĩnh vực hoạt động, nhu cầu, sản phẩm quan tâm, đặc điểm làm việc...">${esc(c.description)}</textarea></label>
 <label>Nhân viên phụ trách<select name="assigned_to" data-assignee><option value="${esc(c.assignedTo||'')}">Đang tải nhân viên...</option></select></label><label>Ghi chú nội bộ<textarea name="notes" rows="3">${esc(c.notes)}</textarea></label>
 <div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary">Lưu hồ sơ</button></div></form>`;
 document.body.appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))wrap.remove();});
 populateAssignees(wrap.querySelector('[data-assignee]'),c.assignedTo);bindLocationPreview(wrap.querySelector('form'));wrap.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const locationUrl=String(f.get('location_url')||'').trim();if(locationUrl&&!isGoogleMapsLink(locationUrl)){notify('Vui lòng nhập link HTTPS từ Google Maps.');return;}const coords=extractGoogleMapsCoordinates(locationUrl);const changes={full_name:String(f.get('full_name')||'').trim(),company_name:String(f.get('company_name')||'').trim(),phone:String(f.get('phone')||'').trim(),customer_type:String(f.get('customer_type')||'').trim(),address:String(f.get('address')||'').trim(),province:String(f.get('province')||'').trim(),region:String(f.get('region')||'').trim(),ward:String(f.get('ward')||'').trim(),email:String(f.get('email')||'').trim(),contact_person:String(f.get('contact_person')||'').trim(),tax_code:String(f.get('tax_code')||'').trim(),status:String(f.get('status')||'').trim(),business_scale:String(f.get('business_scale')||'Chưa phân loại'),potential_level:String(f.get('potential_level')||'Chưa đánh giá'),potential_score:f.get('potential_score')===''?null:Number(f.get('potential_score')),customer_description:String(f.get('customer_description')||'').trim(),notes:String(f.get('notes')||'').trim(),assigned_to:String(f.get('assigned_to')||'')||null,location_url:locationUrl,location_lat:coords?.lat??null,location_lng:coords?.lng??null};
  try{if(liveMode){await window.HHHData.updateCustomer(c.id,changes);await loadLiveCustomers();}else{Object.assign(c,{name:changes.full_name,company:changes.company_name,phone:changes.phone,type:changes.customer_type,address:changes.address,province:changes.province,region:changes.region,ward:changes.ward,email:changes.email,contact:changes.contact_person,taxCode:changes.tax_code,status:changes.status,description:changes.customer_description,notes:changes.notes,locationUrl,locationLat:changes.location_lat,locationLng:changes.location_lng});saveCustomers();}wrap.remove();const updated=customers.find(x=>String(x.id||x.phone)===String(selectedCustomerId))||c;await showCustomer(updated);notify('Đã cập nhật hồ sơ khách hàng.');}catch(err){notify('Không thể cập nhật: '+err.message);}
 });
}

function activeCustomer(){return customers.find(x=>String(x.id||x.phone)===String(selectedCustomerId));}
function profileModal(title,body,submitLabel,handler){const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.style.zIndex='130';wrap.innerHTML=`<form class="modal"><div class="modal-head"><div><h2>${title}</h2></div><button type="button" class="icon-btn" data-close>✕</button></div>${body}<div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary">${submitLabel}</button></div></form>`;document.body.appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))wrap.remove();});wrap.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();try{await handler(new FormData(e.currentTarget));wrap.remove();await showCustomer(activeCustomer());notify('Đã cập nhật hồ sơ khách hàng.');}catch(err){notify('Không thể lưu: '+(err.message||err));}});}
function openContactModal(){const c=activeCustomer();if(!c)return;profileModal('Thêm người liên hệ',`<label>Họ tên<input name="full_name" required></label><label>Chức vụ / vai trò<input name="position" placeholder="Chủ xưởng, kế toán, mua hàng..."></label><div class="form-row"><label>Số điện thoại<input name="phone" type="tel"></label><label>Email<input name="email" type="email"></label></div><label><input type="checkbox" name="is_primary" value="true"> Đặt làm người liên hệ chính</label>`,`Lưu người liên hệ`,async f=>window.HHHData.createCustomerContact({customer_id:c.id,full_name:f.get('full_name'),position:f.get('position'),phone:f.get('phone'),email:f.get('email'),is_primary:f.get('is_primary')==='true'}));}
async function deleteContact(id){if(!confirm('Xóa người liên hệ này?'))return;try{await window.HHHData.deleteCustomerContact(id);await showCustomer(activeCustomer());}catch(e){notify(e.message);}}
function openTagModal(){profileModal('Gắn thẻ khách hàng',`<label>Tên thẻ<input name="name" required placeholder="Ví dụ: Khách VIP, cần báo giá, mua thường xuyên"></label><small class="field-hint">Nếu thẻ chưa tồn tại, hệ thống sẽ tạo mới.</small>`,'Gắn thẻ',async f=>window.HHHData.addCustomerTag(activeCustomer().id,String(f.get('name')).trim()));}
async function removeTag(id){try{await window.HHHData.removeCustomerTag(activeCustomer().id,id);await showCustomer(activeCustomer());}catch(e){notify(e.message);}}
function openCareGroupModal(){profileModal('Thêm nhóm chăm sóc',`<label>Tên nhóm<input name="name" required placeholder="Ví dụ: Khách xưởng nhôm Đà Nẵng"></label><label>Mô tả<input name="description" placeholder="Mục tiêu / quy tắc chăm sóc"></label>`,'Thêm vào nhóm',async f=>window.HHHData.addCustomerCareGroup(activeCustomer().id,String(f.get('name')).trim(),String(f.get('description')||'')));}
async function removeCareGroup(id){try{await window.HHHData.removeCustomerCareGroup(activeCustomer().id,id);await showCustomer(activeCustomer());}catch(e){notify(e.message);}}
async function uploadCustomerDocuments(files){const c=activeCustomer();if(!c||!files?.length)return;const category=prompt('Phân loại tài liệu: Hợp đồng / Catalogue / Báo giá / Hồ sơ / Khác','Catalogue')||'Tài liệu khách hàng';for(const file of files){try{await window.HHHData.uploadCustomerDocument(c.id,file,category);}catch(e){notify('Tải '+file.name+' thất bại: '+e.message);return;}}await showCustomer(c);notify('Đã tải tài liệu lên hồ sơ.');}
async function downloadCustomerDocument(id){try{const url=await window.HHHData.getCustomerDocumentUrl(id);window.open(url,'_blank','noopener');}catch(e){notify(e.message);}}
async function deleteCustomerDocument(id){if(!confirm('Xóa tài liệu này khỏi hồ sơ?'))return;try{await window.HHHData.deleteCustomerDocument(id);await showCustomer(activeCustomer());}catch(e){notify(e.message);}}

function openActivityModal(customer,parent){const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.style.zIndex='120';wrap.innerHTML=`<form class="modal" id="activityForm"><div class="modal-head"><div><h2>Ghi nhận tương tác</h2><p>${esc(customer.name)}</p></div><button type="button" class="icon-btn" data-close>✕</button></div><label>Hình thức<select name="activity_type"><option value="call">Gọi điện</option><option value="meeting">Gặp trực tiếp</option><option value="message">Tin nhắn</option><option value="email">Email</option><option value="visit">Thăm khách hàng</option><option value="other">Khác</option></select></label><label>Nội dung<input name="subject" required placeholder="Ví dụ: Gọi tư vấn sản phẩm"></label><label>Chi tiết<textarea name="description" rows="3" placeholder="Nội dung trao đổi..."></textarea></label><label>Kết quả<input name="outcome" placeholder="Kết quả / bước tiếp theo"></label><div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary">Lưu tương tác</button></div></form>`;document.body.appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))wrap.remove();});wrap.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await window.HHHData.addActivity({customer_id:customer.id,activity_type:f.get('activity_type'),subject:String(f.get('subject')).trim(),description:String(f.get('description')||'').trim()||null,outcome:String(f.get('outcome')||'').trim()||null});wrap.remove();showCustomer(customer);notify('Đã lưu lịch sử tương tác.');}catch(err){notify('Không thể lưu tương tác: '+err.message);}});}



async function openModuleModal(){
 const key=active;
 if(key==='Khách tiềm năng'){openLeadCreateModal();return;}
 const tableKey=key==='Cơ hội bán hàng'?'opportunities':key==='Đơn hàng'?'orders':key==='Trung tâm CSKH'?'complaints':'care_tasks';
 const options=customers.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}${c.company?' – '+esc(c.company):''}</option>`).join('');
 let fields='';
 if(tableKey==='opportunities')fields=`<label>Tên cơ hội<input name="title" required placeholder="Ví dụ: Đơn hàng hệ nhôm Kenwin"></label><label>Khách hàng<select name="customer_id" required>${options}</select></label><div class="form-row"><label>Giá trị dự kiến<input name="expected_value" type="number" min="0" value="0"></label><label>Ngày dự kiến chốt<input name="expected_close_date" type="date"></label></div><input type="hidden" name="business_unit" value="aluminum">`;
 if(tableKey==='orders')fields=`<label>Mã đơn hàng<input name="order_code" required placeholder="HHH-2026-001"></label><label>Khách hàng<select name="customer_id" required>${options}</select></label><div class="form-row"><label>Ngày đơn<input name="order_date" type="date" required value="${new Date().toISOString().slice(0,10)}"></label><input type="hidden" name="business_unit" value="aluminum"></div><div class="form-row"><label>Tổng tiền<input name="total_amount" type="number" min="0" required value="0"></label><label>Đã thanh toán<input name="paid_amount" type="number" min="0" required value="0"></label></div>`;
 if(tableKey==='complaints')fields=`<label>Tiêu đề yêu cầu<input name="title" required></label><label>Khách hàng<select name="customer_id" required>${options}</select></label><label>Mô tả<textarea name="description" rows="3" required></textarea></label><label>Mức ưu tiên<select name="priority"><option value="normal">Bình thường</option><option value="high">Cao</option><option value="urgent">Khẩn cấp</option><option value="low">Thấp</option></select></label>`;
 if(tableKey==='care_tasks')fields=`<label>Tên công việc<input name="title" required></label><label>Khách hàng<select name="customer_id"><option value="">Không gắn khách hàng</option>${options}</select></label><div class="form-row"><label>Thời hạn<input name="due_at" type="datetime-local" required></label><label>Ưu tiên<select name="priority"><option value="normal">Bình thường</option><option value="high">Cao</option><option value="urgent">Khẩn cấp</option><option value="low">Thấp</option></select></label></div><label>Mô tả<textarea name="description" rows="3"></textarea></label>`;
 const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<form class="modal"><div class="modal-head"><div><h2>${pageMeta[key][0]}</h2><p>Tạo dữ liệu mới trong Supabase.</p></div><button type="button" class="icon-btn" data-close>✕</button></div>${fields}<div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary">Lưu dữ liệu</button></div></form>`;
 document.body.appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))wrap.remove();});
 wrap.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const payload=Object.fromEntries(f.entries());try{await window.HHHData.createRow(tableKey,payload);wrap.remove();await loadModule(tableKey);notify('Đã lưu dữ liệu vào Supabase.');}catch(err){notify('Không thể lưu: '+err.message);}});
}

function leadById(id){return (moduleRows.leads||[]).find(x=>x.id===id);}
function leadModal(html,onSubmit){const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=html;document.body.appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))wrap.remove();});wrap.querySelector('form')?.addEventListener('submit',async e=>{e.preventDefault();try{await onSubmit(new FormData(e.currentTarget),wrap);wrap.remove();await loadModule('leads');}catch(err){notify('Không thể thực hiện: '+(err.message||err));}});return wrap;}
function leadOwnerOptions(selected=''){return '<option value="">Chưa phân công</option>'+leadProfiles.map(u=>`<option value="${esc(u.id)}" ${u.id===selected?'selected':''}>${esc(u.full_name||u.email||'Nhân viên')}</option>`).join('');}
function openLeadCreateModal(){leadModal(`<form class="modal lead-modal"><div class="modal-head"><div><h2>Thêm khách hàng tiềm năng</h2><p>Ghi nhận đầu mối mới, chưa tạo hồ sơ khách hàng chính thức.</p></div><button type="button" class="icon-btn" data-close>✕</button></div><div class="form-row"><label>Họ tên / người liên hệ<input name="full_name" required></label><label>Công ty / cửa hàng<input name="company_name"></label></div><div class="form-row"><label>Điện thoại<input name="phone" type="tel"></label><label>Email<input name="email" type="email"></label></div><div class="form-row"><label>Nguồn khách hàng<select name="source"><option value="">Chọn nguồn</option><option>Giới thiệu</option><option>Facebook</option><option>Zalo</option><option>Website</option><option>Đi thị trường</option><option>Hội chợ / sự kiện</option><option>Khác</option></select></label><label>Loại khách hàng<select name="customer_type"><option>Đại lý</option><option>Cửa hàng</option><option>Xưởng sản xuất</option><option>Thợ nhôm kính</option><option>Đối tác dự án</option><option>Khác</option></select></label></div><div class="form-row"><label>Nhân viên phụ trách<select name="assigned_to">${leadOwnerOptions(currentProfile?.id||'')}</select></label><label>Giai đoạn<select name="stage"><option value="new">Mới</option><option value="contacted">Đã liên hệ</option><option value="qualified">Đủ điều kiện</option></select></label></div><div class="form-row"><label>Tỉnh / thành<input name="province"></label><label>Xã / phường<input name="ward"></label></div><label>Ghi chú<textarea name="notes" rows="3"></textarea></label><div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary">Lưu khách tiềm năng</button></div></form>`,async f=>{const v=Object.fromEntries(f.entries());await window.HHHData.createRow('leads',v);notify('Đã tạo khách tiềm năng.');});}
function openLeadEdit(id){const x=leadById(id);if(!x)return;leadModal(`<form class="modal lead-modal"><div class="modal-head"><div><h2>Chỉnh sửa khách tiềm năng</h2><p>Cập nhật thông tin và nhu cầu khách hàng.</p></div><button type="button" class="icon-btn" data-close>✕</button></div><div class="form-row"><label>Họ tên<input name="full_name" required value="${esc(x.full_name)}"></label><label>Công ty<input name="company_name" value="${esc(x.company_name||'')}"></label></div><div class="form-row"><label>Điện thoại<input name="phone" value="${esc(x.phone||'')}"></label><label>Email<input name="email" type="email" value="${esc(x.email||'')}"></label></div><div class="form-row"><label>Nguồn<input name="source" value="${esc(x.source||'')}"></label><label>Loại khách<select name="customer_type">${['Đại lý','Cửa hàng','Xưởng sản xuất','Thợ nhôm kính','Đối tác dự án','Khác'].map(v=>`<option ${x.customer_type===v?'selected':''}>${v}</option>`).join('')}</select></label></div><div class="form-row"><label>Tỉnh / thành<input name="province" value="${esc(x.province||'')}"></label><label>Xã / phường<input name="ward" value="${esc(x.ward||'')}"></label></div><label>Giá trị tiềm năng dự kiến (VNĐ)<input name="estimated_value" type="number" min="0" value="${x.estimated_value||0}"></label><label>Ghi chú<textarea name="notes" rows="3">${esc(x.notes||'')}</textarea></label><div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary">Lưu thay đổi</button></div></form>`,async f=>{const v=Object.fromEntries(f.entries());v.estimated_value=Number(v.estimated_value||0);await window.HHHData.updateLead(id,v);notify('Đã cập nhật khách tiềm năng.');});}
function openLeadAssign(id){const x=leadById(id);if(!x)return;if(currentProfile?.role!=='admin'){notify('Chỉ Admin mới được điều chuyển khách tiềm năng.');return;}leadModal(`<form class="modal"><div class="modal-head"><div><h2>Điều chuyển khách tiềm năng</h2><p>${esc(x.full_name)} · ${esc(x.company_name||'')}</p></div><button type="button" class="icon-btn" data-close>✕</button></div><label>Nhân viên nhận phụ trách<select name="assigned_to" required>${leadOwnerOptions(x.assigned_to||'')}</select></label><label>Lý do điều chuyển<textarea name="reason" rows="3" required placeholder="Nêu lý do và nội dung bàn giao..."></textarea></label><div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary">Xác nhận điều chuyển</button></div></form>`,async f=>{const v=Object.fromEntries(f.entries());await window.HHHData.updateLead(id,{assigned_to:v.assigned_to});await window.HHHData.addLeadInteraction({lead_id:id,interaction_type:'transfer',subject:'Điều chuyển người phụ trách',description:v.reason});notify('Đã điều chuyển khách tiềm năng và lưu nhật ký bàn giao.');});}
function openLeadStage(id){const x=leadById(id);if(!x)return;leadModal(`<form class="modal"><div class="modal-head"><div><h2>Chuyển giai đoạn</h2><p>${esc(x.full_name)}</p></div><button type="button" class="icon-btn" data-close>✕</button></div><label>Giai đoạn mới<select name="stage">${[['new','Mới'],['contacted','Đã liên hệ'],['qualified','Đủ điều kiện'],['converted','Đã chuyển đổi'],['lost','Không phù hợp']].map(([v,l])=>`<option value="${v}" ${x.stage===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Lý do / ghi chú<textarea name="reason" rows="3"></textarea></label><div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary">Cập nhật giai đoạn</button></div></form>`,async f=>{const v=Object.fromEntries(f.entries());if(v.stage==='converted'){await convertLeadToCustomer(x);return;}await window.HHHData.updateLead(id,{stage:v.stage,...(v.stage==='lost'?{lost_reason:v.reason}:{}),...(v.stage==='contacted'?{last_contacted_at:new Date().toISOString()}:{})});await window.HHHData.addLeadInteraction({lead_id:id,interaction_type:'stage',subject:'Chuyển giai đoạn: '+v.stage,description:v.reason||null});notify('Đã cập nhật giai đoạn khách tiềm năng.');});}
async function convertLeadToCustomer(x){if(!confirm('Chuyển khách tiềm năng này thành hồ sơ khách hàng chính thức?'))return;const customer=await window.HHHData.createCustomer({full_name:x.full_name,company_name:x.company_name,phone:x.phone||'',email:x.email||'',customer_type:x.customer_type||'Khác',source:x.source||'Khách tiềm năng',status:'Tiềm năng',province:x.province||'',ward:x.ward||'',notes:x.notes||'',assigned_to:x.assigned_to||currentProfile?.id});await window.HHHData.updateLead(x.id,{stage:'converted',converted_customer_id:customer.id});await window.HHHData.addLeadInteraction({lead_id:x.id,interaction_type:'conversion',subject:'Chuyển thành khách hàng chính thức',description:'Mã hồ sơ khách hàng: '+customer.id});notify('Đã tạo hồ sơ khách hàng và liên kết với Lead.');await loadLiveCustomers();}
async function openLeadDetail(id){const x=leadById(id);if(!x)return;let history=[];try{history=await window.HHHData.listLeadInteractions(id);}catch(e){notify('Không tải được lịch sử: '+e.message);}const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<section class="modal lead-modal"><div class="modal-head"><div><h2>${esc(x.full_name)}</h2><p>${esc(x.company_name||'Khách hàng cá nhân')} · ${esc(x.phone||'Chưa có số điện thoại')}</p></div><button type="button" class="icon-btn" data-close>✕</button></div><div class="lead-detail-grid"><div><small>Giai đoạn</small><b>${esc(x.stage)}</b></div><div><small>Nguồn</small><b>${esc(x.source||'Chưa rõ')}</b></div><div><small>Giá trị dự kiến</small><b>${money(x.estimated_value)}</b></div><div><small>Địa bàn</small><b>${esc([x.ward,x.province].filter(Boolean).join(', ')||'Chưa cập nhật')}</b></div></div><label>Ghi chú</label><p>${esc(x.notes||'Chưa có ghi chú')}</p><div class="panel-head"><div><h3>Lịch sử tương tác</h3></div><button class="btn btn-primary" data-lead-add-interaction="${x.id}">＋ Ghi nhận</button></div><div class="lead-history">${history.map(h=>`<article><b>${esc(h.subject)}</b><small>${new Date(h.created_at).toLocaleString('vi-VN')}</small><p>${esc(h.description||'')}</p></article>`).join('')||'<div class="empty-state">Chưa có tương tác.</div>'}</div>${x.converted_customer_id?`<p class="field-hint">Đã liên kết khách hàng: ${esc(x.converted_customer_id)}</p>`:''}</section>`;document.body.appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))wrap.remove();});wrap.querySelector('[data-lead-add-interaction]')?.addEventListener('click',()=>{wrap.remove();openLeadInteraction(id);});}
function openLeadInteraction(id){leadModal(`<form class="modal"><div class="modal-head"><div><h2>Ghi nhận chăm sóc Lead</h2></div><button type="button" class="icon-btn" data-close>✕</button></div><label>Hình thức<select name="interaction_type"><option value="call">Gọi điện</option><option value="meeting">Gặp trực tiếp</option><option value="message">Tin nhắn</option><option value="email">Email</option><option value="visit">Thăm khách</option><option value="other">Khác</option></select></label><label>Nội dung<input name="subject" required></label><label>Kết quả / bước tiếp theo<textarea name="description" rows="3"></textarea></label><label>Lịch nhắc tiếp theo<input name="next_follow_up_at" type="datetime-local"></label><div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary">Lưu tương tác</button></div></form>`,async f=>{const v=Object.fromEntries(f.entries());await window.HHHData.addLeadInteraction({lead_id:id,interaction_type:v.interaction_type,subject:v.subject,description:v.description,next_follow_up_at:v.next_follow_up_at?new Date(v.next_follow_up_at).toISOString():null});await window.HHHData.updateLead(id,{last_contacted_at:new Date().toISOString(),...(v.next_follow_up_at?{next_follow_up_at:new Date(v.next_follow_up_at).toISOString()}:{})});notify('Đã lưu lịch sử chăm sóc.');});}

function exportCsv(){const headers=['Mã khách hàng','ID nguồn','Họ và tên','Công ty','Nhóm khách hàng','Điện thoại','Email','Địa chỉ','Trạng thái'];const rows=customers.map(c=>[c.code,c.legacyId,c.name,c.company,c.type,c.phone,c.email,c.address,c.status]);const csv='\uFEFF'+[headers,...rows].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='HHH-CRM-khach-hang.csv';a.click();URL.revokeObjectURL(url);notify('Đã xuất danh sách khách hàng dạng CSV.');}
function notify(message){document.querySelector('.toast')?.remove();const t=document.createElement('div');t.className='toast';t.innerHTML=`<span>✓</span>${esc(message)}`;document.body.appendChild(t);clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.remove(),2800);}
render();
if(window.HHHData?.ready()){loadCurrentProfile();loadLiveCustomers();}
