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
  {title:'CHĂM SÓC KHÁCH HÀNG',items:[['Trung tâm CSKH','♡'],['Lịch chăm sóc','▣'],['Công việc','✓']]}
];
let customers = window.HHH_DB?.client ? [] : loadCustomers();
let liveMode = false, loading = false, currentCustomer = null;
let active = 'Dashboard', query = '', filter = 'Tất cả', doneTasks = new Set(), toastTimer;
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
function mapCustomer(row){return {id:row.id,legacyId:row.legacy_id,code:row.customer_code,name:row.full_name||'',company:row.company_name||'',type:row.customer_type||'Khác',phone:row.phone||'',email:row.email||'',address:row.address||'',province:row.province||'',source:row.source||'',notes:row.notes||'',description:row.customer_description||'',locationUrl:row.location_url||'',locationLat:row.location_lat,locationLng:row.location_lng,contact:row.contact_person||'',taxCode:row.tax_code||'',createdAt:row.created_at,owner:row.assigned_to?String(row.assigned_to).slice(0,8):'Chưa phân công',status:row.status||'Tiềm năng',businessUnit:row.business_unit||'both',businessScale:row.business_scale||'Chưa phân loại',potentialLevel:row.potential_level||'Chưa đánh giá',potentialScore:row.potential_score??null,color:'blue'};}
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
 'Công việc':['Quản lý công việc','Phân công và theo dõi tiến độ công việc của đội ngũ.']
};
let moduleRows = {};
let moduleError = {};
let moduleLoading = {};
function render(){
 const meta=pageMeta[active]||pageMeta.Dashboard;
 const nav=navGroups.map(g=>`<section><div class="nav-heading">${g.title}</div>${g.items.map(([label,ico])=>`<button class="nav-item ${active===label?'active':''}" data-nav="${label}"><span class="nav-symbol">${ico}</span><span>${label}</span></button>`).join('')}</section>`).join('');
 app.innerHTML=`<div class="app-shell">
 <aside class="sidebar" id="sidebar"><div class="brand"><div class="brand-mark">HHH</div><div><b>HHH CRM</b><small>Customer relationship</small></div><button class="icon-btn close-nav" data-action="close-nav">✕</button></div>
 <div class="workspace"><div class="workspace-logo">H</div><div><b>Hải Hà Hưng</b><small>Không gian làm việc</small></div><span>⌄</span></div>
 <nav class="nav-list">${nav}</nav>
 <div class="sidebar-bottom"><div class="help-card"><div class="help-icon">✧</div><b>Cần hỗ trợ?</b><p>Trung tâm quản lý quan hệ khách hàng Hải Hà Hưng.</p><button data-action="help">Xem hướng dẫn ↗</button></div><button class="nav-item" data-action="settings">⚙ Cài đặt hệ thống</button><div class="profile"><div class="avatar avatar-dark">HH</div><div class="profile-info"><b>Quản trị viên</b><small>Administrator</small></div></div></div></aside>
 <main class="main-area"><header class="topbar"><div class="top-left"><button class="icon-btn menu-btn" data-action="open-nav">☰</button><div class="breadcrumb">Không gian làm việc <span>›</span> <b>${esc(active)}</b></div></div><div class="top-actions"><label class="global-search"><span>⌕</span><input id="globalSearch" placeholder="Tìm kiếm nhanh..." value="${esc(query)}"></label><button class="icon-btn notification" data-action="notifications">♧</button><div class="top-avatar">HH</div></div></header>
 <div class="page-content"><div class="welcome-row"><div><div class="eyebrow"><span class="live-dot"></span> ${esc(todayLabel.toLocaleUpperCase('vi-VN'))} · ${liveMode?'SUPABASE LIVE':'CHƯA KẾT NỐI DỮ LIỆU'}</div><h1>${active==='Dashboard'?'Tổng quan CRM':esc(active)}</h1><p>${esc(meta[1])}</p></div><div class="welcome-actions">${active==='Khách hàng'?(selectedCustomerId?'':'<button class="btn btn-light" data-action="export">⇩ Xuất CSV</button><button class="btn btn-primary" data-action="add">＋ Thêm khách hàng</button>'):active==='Dashboard'?'':'<button class="btn btn-primary" data-action="module-add">＋ '+(active==='Khách tiềm năng'?'Thêm khách tiềm năng':active==='Cơ hội bán hàng'?'Thêm cơ hội':active==='Đơn hàng'?'Tạo đơn hàng':active==='Trung tâm CSKH'?'Tạo yêu cầu':'Tạo công việc')+'</button>'}</div></div>
 <section id="module-content">${renderPageContent()}</section>
 <footer class="footer"><span>© 2026 HHH CRM · Hải Hà Hưng</span><span>HHH CRM · Vanilla JS + Supabase</span></footer></div></main>${mobileScrim()}</div>`;
 bindEvents();
}
function renderPageContent(){
 if(active==='Dashboard') return renderDashboard();
 if(active==='Phân tích khách hàng') return renderCustomerIntelligence();
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
 if(moduleError.leads)return `<div class="panel error-state"><h2>Chưa tải được Lead</h2><p>${esc(moduleError.leads)}</p><small>Hãy chạy sql/phase2_3_leads_migration.sql trong Supabase SQL Editor rồi thử lại.</small><button class="btn btn-light" data-reload="leads">Thử tải lại</button></div>`;
 const rows=moduleRows.leads||[];
 return `<div class="stats-grid stats-compact">${stat('Tổng khách tiềm năng',rows.length,'','Bảng leads riêng','◎','blue')}${stat('Mới',rows.filter(x=>x.stage==='new').length,'','Chưa liên hệ','＋','green')}${stat('Đang tiếp cận',rows.filter(x=>['contacted','qualified'].includes(x.stage)).length,'','Đang phát triển','↗','orange')}${stat('Đã chuyển đổi',rows.filter(x=>x.stage==='converted').length,'','Chuyển thành khách hàng','✓','purple')}</div>${renderLeadBoard(rows)}`;
}
function renderLeadBoard(rows){
 const stages=[['new','Mới'],['contacted','Đã liên hệ'],['qualified','Đủ điều kiện'],['converted','Đã chuyển đổi'],['lost','Không phù hợp']];
 return `<div class="kanban">${stages.map(([key,label])=>`<section class="kanban-col"><div class="kanban-head"><b>${label}</b><span>${rows.filter(x=>x.stage===key).length}</span></div>${rows.filter(x=>x.stage===key).map(x=>`<article class="kanban-card"><b>${esc(x.full_name)}</b><small>${esc(x.company_name||'')}</small><p>${esc(x.phone||'')}</p><small>${esc(x.source||'Chưa rõ nguồn')}</small></article>`).join('')||'<div class="kanban-empty">Chưa có hồ sơ</div>'}</section>`).join('')}</div>`;
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
 if(!el||!window.L)return;
 const points=customers.filter(c=>Number.isFinite(Number(c.locationLat))&&Number.isFinite(Number(c.locationLng)));
 if(!points.length)return;
 const map=window.L.map(el).setView([Number(points[0].locationLat),Number(points[0].locationLng)],9);
 window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map);
 const bounds=[];
 points.forEach(c=>{
  const lat=Number(c.locationLat),lng=Number(c.locationLng);bounds.push([lat,lng]);
  window.L.marker([lat,lng]).addTo(map).bindPopup(`<b>${esc(c.name)}</b><br>${esc(c.company||c.address||'')}<br><a target="_blank" rel="noopener" href="${esc(c.locationUrl||`https://www.google.com/maps?q=${lat},${lng}`)}">Mở Google Maps</a>`);
 });
 if(bounds.length>1)map.fitBounds(bounds,{padding:[24,24]});
}
function renderCustomerIntelligence(){
 const now=Date.now(),lastByCustomer=new Map();
 intelligenceData.activities.forEach(a=>{const t=new Date(a.occurred_at).getTime();if(!lastByCustomer.has(a.customer_id)||lastByCustomer.get(a.customer_id)<t)lastByCustomer.set(a.customer_id,t);});
 const stale=customers.map(c=>({...c,lastCare:lastByCustomer.get(c.id)||0,days:lastByCustomer.has(c.id)?Math.floor((now-lastByCustomer.get(c.id))/86400000):9999})).filter(c=>c.days>=30).sort((a,b)=>b.days-a.days);
 const high=customers.filter(c=>Number(c.potentialScore||0)>=70||['Cao','Chiến lược'].includes(c.potentialLevel)).sort((a,b)=>Number(b.potentialScore||0)-Number(a.potentialScore||0));
 const mapped=customers.filter(c=>c.locationLat&&c.locationLng);
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
  <section class="panel"><div class="panel-head"><div><h2>Bản đồ khách hàng nhôm kính</h2><p>${mapped.length} khách hàng đã có tọa độ. Chọn khách để mở Google Maps.</p></div></div>
   <div class="crm-map-grid"><div class="crm-map-frame">${mapped.length?`<div id="customerLeafletMap" aria-label="Bản đồ vị trí khách hàng"></div>`:`<div class="empty-state">Chưa có khách hàng được định vị. Thêm link Google Maps trong hồ sơ khách hàng.</div>`}</div><div class="crm-map-list">${pins||'<p class="empty-state">Chưa có dữ liệu tọa độ.</p>'}</div></div>
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

function bindEvents(){
 document.querySelectorAll('[data-nav]').forEach(el=>el.addEventListener('click',async()=>{active=el.dataset.nav;selectedCustomerId=null;customerActivities=[];query='';filter='Tất cả';document.getElementById('sidebar')?.classList.remove('sidebar-open');render();await loadModuleForActive();}));
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

 document.getElementById('carePlanForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await window.HHHData.createCarePlan({name:f.get('name'),group_id:f.get('group_id'),interval_days:Number(f.get('interval_days')),starts_on:f.get('starts_on')});notify('Đã tạo lịch chăm sóc định kỳ.');await loadCustomerIntelligence();}catch(err){notify('Không thể tạo lịch: '+err.message);}});

 document.getElementById('scrim')?.addEventListener('click',()=>document.getElementById('sidebar')?.classList.remove('sidebar-open'));
}
async function loadModuleForActive(){
 const map={'Khách tiềm năng':'leads','Cơ hội bán hàng':'opportunities','Đơn hàng':'orders','Trung tâm CSKH':'complaints','Lịch chăm sóc':'care_tasks','Công việc':'care_tasks'};
 const key=map[active];if(key)await loadModule(key); else if(active==='Phân tích khách hàng') await loadCustomerIntelligence();
}
async function loadModule(key){
 moduleLoading[key]=true;moduleError[key]='';render();
 try{
   if(!window.HHHData?.ready())throw new Error('Chưa kết nối Supabase.');
   if(key==='leads')moduleRows[key]=await window.HHHData.listRows('leads','id,full_name,company_name,phone,source,stage,created_at');
   else moduleRows[key]=await window.HHHData.listRows(moduleConfig[key].table,moduleConfig[key].select);
 }catch(e){moduleError[key]=e.message||String(e);}
 finally{moduleLoading[key]=false;render();}
}
function refreshTable(){const q=query.toLowerCase();const rows=[...document.querySelectorAll('tbody tr')];rows.forEach(row=>{const text=row.textContent.toLowerCase();row.hidden=!(text.includes(q))|| (filter!=='Tất cả'&&!row.querySelector('.status')?.textContent.includes(filter));});const count=rows.filter(r=>!r.hidden).length;const label=document.querySelector('.table-footer span');if(label)label.innerHTML=`Hiển thị <b>${count}</b> trên <b>${customers.length}</b> khách hàng`;const empty=document.querySelector('.empty-state');if(empty)empty.style.display=count?'none':'block';}
function action(type){switch(type){case'add':openModal();break;case'open-nav':document.getElementById('sidebar')?.classList.add('sidebar-open');break;case'close-nav':document.getElementById('sidebar')?.classList.remove('sidebar-open');break;case'help':notify('Chọn từng module ở thanh điều hướng để quản lý nghiệp vụ riêng.');break;case'settings':notify('Cấu hình hệ thống sẽ được bổ sung ở phase sau.');break;case'notifications':notify('Bạn đã xem các thông báo mới nhất.');break;case'page':notify('Đang hiển thị danh sách dữ liệu đã tải.');break;case'export':exportCsv();break;case'module-add':openModuleModal();break;}}
function openModal(){const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.id='addModal';wrap.innerHTML=`<form class="modal" id="customerForm"><div class="modal-head"><div><h2>Thêm khách hàng mới</h2><p>Nhập thông tin cơ bản để tạo hồ sơ khách hàng.</p></div><button type="button" class="icon-btn" data-close>✕</button></div><label>Họ và tên<input name="name" required placeholder="Nhập họ tên khách hàng"></label><label>Tên công ty / cửa hàng<input name="company" placeholder="Nhập tên đơn vị"></label><div class="form-row"><label>Số điện thoại<input name="phone" required type="tel" placeholder="09xx xxx xxx"></label><label>Nhóm khách hàng<select name="type"><option>Đại lý</option><option>Xưởng sản xuất</option><option>Thợ nhôm kính</option><option>Cửa hàng</option><option>Khác</option></select></label></div><label>Email<input name="email" type="email" placeholder="email@example.com"></label><label>Địa chỉ<input name="address" placeholder="Địa chỉ khách hàng"></label><label>Link định vị Google Maps<input name="location_url" placeholder="Dán link chia sẻ Google Maps tại đây"></label><div data-map-input-preview class="location-preview-wrap"></div><label>Mô tả khách hàng<textarea name="customer_description" rows="3" placeholder="Quy mô, nhu cầu, đặc điểm, lịch sử làm việc..."></textarea></label><div class="form-row"><label>Tỉnh / thành<input name="province" placeholder="Đà Nẵng"></label></div><div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary" type="submit">＋ Tạo khách hàng</button></div></form>`;document.body.appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))wrap.remove();});bindLocationPreview(wrap.querySelector('form'));wrap.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),phone=String(f.get('phone')).trim();const locationUrl=String(f.get('location_url')||'').trim();if(locationUrl&&!isGoogleMapsLink(locationUrl)){notify('Vui lòng nhập link HTTPS từ Google Maps.');return;}const coords=extractGoogleMapsCoordinates(locationUrl);const payload={full_name:String(f.get('name')).trim(),company_name:String(f.get('company')).trim(),phone,email:String(f.get('email')).trim(),customer_type:String(f.get('type')),business_unit:'aluminum',status:'Tiềm năng',address:String(f.get('address')||'').trim(),province:String(f.get('province')||'').trim(),location_url:locationUrl,location_lat:coords?.lat??null,location_lng:coords?.lng??null,customer_description:String(f.get('customer_description')||'').trim()};try{if(liveMode){await window.HHHData.createCustomer(payload);await loadLiveCustomers();}else{customers.unshift(mapCustomer({full_name:payload.full_name,company_name:payload.company_name,phone,email:payload.email,customer_type:payload.customer_type,status:'Tiềm năng',address:payload.address,province:payload.province,location_url:payload.location_url,location_lat:payload.location_lat,location_lng:payload.location_lng,customer_description:payload.customer_description}));saveCustomers();render();}query='';filter='Tất cả';wrap.remove();notify(liveMode?'Đã lưu khách hàng vào Supabase.':'Đã thêm khách hàng vào dữ liệu demo.');}catch(err){notify('Không thể lưu khách hàng: '+(err.message||err));}});}
async function showCustomer(c){
 active='Khách hàng';selectedCustomerId=String(c.id||c.phone);currentCustomer=c;customerActivities=[];customerContacts=[];customerDocuments=[];customerTags=[];customerCareGroups=[];customerActivitiesLoading=liveMode&&!!c.id;render();
 if(liveMode&&c.id){customerExtrasLoading=true;try{const results=await Promise.all([window.HHHData.listActivities(c.id),window.HHHData.listCustomerContacts(c.id),window.HHHData.listCustomerDocuments(c.id),window.HHHData.listCustomerTags(c.id),window.HHHData.listCustomerCareGroups(c.id)]);[customerActivities,customerContacts,customerDocuments,customerTags,customerCareGroups]=results;}catch(err){notify('Không tải được dữ liệu hồ sơ: '+err.message);}finally{customerActivitiesLoading=false;customerExtrasLoading=false;render();}}
}
function openEditCustomer(c,parent){
 const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.style.zIndex='120';
 wrap.innerHTML=`<form class="modal edit-customer-form"><div class="modal-head"><div><h2>Cập nhật hồ sơ khách hàng</h2><p>Bổ sung thông tin chi tiết và vị trí Google Maps</p></div><button type="button" class="icon-btn" data-close>✕</button></div>
 <label>Họ và tên<input name="full_name" required value="${esc(c.name)}"></label><label>Công ty / cửa hàng<input name="company_name" value="${esc(c.company)}"></label>
 <div class="form-row"><label>Điện thoại<input name="phone" value="${esc(c.phone)}"></label><label>Nhóm khách hàng<input name="customer_type" value="${esc(c.type)}"></label></div>
 <label>Địa chỉ<input name="address" value="${esc(c.address)}"></label><label>Tỉnh / thành<input name="province" value="${esc(c.province)}"></label>
 <label>Link định vị Google Maps<input name="location_url" value="${esc(c.locationUrl)}" placeholder="Dán link Google Maps (ưu tiên link có tọa độ)"><small class="field-hint">Hỗ trợ link Google Maps có tọa độ dạng @lat,lng hoặc !3dlat!4dlng. Link rút gọn maps.app.goo.gl có thể cần mở rộng trước.</small></label><div data-map-input-preview class="location-preview-wrap"></div>
 <div class="form-row"><label>Email<input name="email" type="email" value="${esc(c.email)}"></label><label>Người liên hệ<input name="contact_person" value="${esc(c.contact)}"></label></div>
 <div class="form-row"><label>Mã số thuế<input name="tax_code" value="${esc(c.taxCode)}"></label><label>Trạng thái<select name="status">${['Tiềm năng','Đang hoạt động','Cần chăm sóc','Ngừng giao dịch'].map(x=>`<option ${c.status===x?'selected':''}>${x}</option>`).join('')}</select></label></div>
 <div class="form-row"><label>Quy mô khách hàng<select name="business_scale">${['Chưa phân loại','Cá nhân / hộ kinh doanh','Nhỏ','Vừa','Lớn','Doanh nghiệp / chuỗi'].map(x=>`<option ${c.businessScale===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Mức tiềm năng<select name="potential_level">${['Chưa đánh giá','Thấp','Trung bình','Cao','Chiến lược'].map(x=>`<option ${c.potentialLevel===x?'selected':''}>${x}</option>`).join('')}</select></label></div><label>Điểm tiềm năng (0–100)<input name="potential_score" type="number" min="0" max="100" value="${c.potentialScore??''}" placeholder="Để trống nếu chưa đánh giá"></label>
 <label>Mô tả khách hàng<textarea name="customer_description" rows="4" placeholder="Quy mô kinh doanh, lĩnh vực hoạt động, nhu cầu, sản phẩm quan tâm, đặc điểm làm việc...">${esc(c.description)}</textarea></label>
 <label>Ghi chú nội bộ<textarea name="notes" rows="3">${esc(c.notes)}</textarea></label>
 <div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary">Lưu hồ sơ</button></div></form>`;
 document.body.appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))wrap.remove();});
 bindLocationPreview(wrap.querySelector('form'));wrap.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const locationUrl=String(f.get('location_url')||'').trim();if(locationUrl&&!isGoogleMapsLink(locationUrl)){notify('Vui lòng nhập link HTTPS từ Google Maps.');return;}const coords=extractGoogleMapsCoordinates(locationUrl);const changes={full_name:String(f.get('full_name')||'').trim(),company_name:String(f.get('company_name')||'').trim(),phone:String(f.get('phone')||'').trim(),customer_type:String(f.get('customer_type')||'').trim(),address:String(f.get('address')||'').trim(),province:String(f.get('province')||'').trim(),email:String(f.get('email')||'').trim(),contact_person:String(f.get('contact_person')||'').trim(),tax_code:String(f.get('tax_code')||'').trim(),status:String(f.get('status')||'').trim(),business_scale:String(f.get('business_scale')||'Chưa phân loại'),potential_level:String(f.get('potential_level')||'Chưa đánh giá'),potential_score:f.get('potential_score')===''?null:Number(f.get('potential_score')),customer_description:String(f.get('customer_description')||'').trim(),notes:String(f.get('notes')||'').trim(),location_url:locationUrl,location_lat:coords?.lat??null,location_lng:coords?.lng??null};
  try{if(liveMode){await window.HHHData.updateCustomer(c.id,changes);await loadLiveCustomers();}else{Object.assign(c,{name:changes.full_name,company:changes.company_name,phone:changes.phone,type:changes.customer_type,address:changes.address,province:changes.province,email:changes.email,contact:changes.contact_person,taxCode:changes.tax_code,status:changes.status,description:changes.customer_description,notes:changes.notes,locationUrl,locationLat:changes.location_lat,locationLng:changes.location_lng});saveCustomers();}wrap.remove();const updated=customers.find(x=>String(x.id||x.phone)===String(selectedCustomerId))||c;await showCustomer(updated);notify('Đã cập nhật hồ sơ khách hàng.');}catch(err){notify('Không thể cập nhật: '+err.message);}
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
 if(key==='Khách tiềm năng'){
  const wrap=document.createElement('div');wrap.className='modal-backdrop';
  wrap.innerHTML=`<form class="modal"><div class="modal-head"><div><h2>Thêm khách tiềm năng</h2><p>Lead độc lập, không thay đổi 179 khách hàng hiện hữu.</p></div><button type="button" class="icon-btn" data-close>✕</button></div><label>Họ tên<input name="full_name" required></label><label>Công ty<input name="company_name"></label><div class="form-row"><label>Điện thoại<input name="phone"></label><label>Nguồn<input name="source" placeholder="Giới thiệu, Facebook..."></label></div><label>Giai đoạn<select name="stage"><option value="new">Mới</option><option value="contacted">Đã liên hệ</option><option value="qualified">Đủ điều kiện</option></select></label><div class="modal-actions"><button type="button" class="btn btn-light" data-close>Hủy</button><button class="btn btn-primary">Lưu Lead</button></div></form>`;
  document.body.appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))wrap.remove();});
  wrap.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await window.HHHData.createRow('leads',{full_name:f.get('full_name'),company_name:f.get('company_name'),phone:f.get('phone'),source:f.get('source'),stage:f.get('stage')});wrap.remove();await loadModule('leads');notify('Đã tạo khách tiềm năng.');}catch(err){notify('Không thể tạo Lead: '+err.message);}});return;
 }
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
function exportCsv(){const headers=['Mã khách hàng','ID nguồn','Họ và tên','Công ty','Nhóm khách hàng','Điện thoại','Email','Địa chỉ','Trạng thái'];const rows=customers.map(c=>[c.code,c.legacyId,c.name,c.company,c.type,c.phone,c.email,c.address,c.status]);const csv='\uFEFF'+[headers,...rows].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='HHH-CRM-khach-hang.csv';a.click();URL.revokeObjectURL(url);notify('Đã xuất danh sách khách hàng dạng CSV.');}
function notify(message){document.querySelector('.toast')?.remove();const t=document.createElement('div');t.className='toast';t.innerHTML=`<span>✓</span>${esc(message)}`;document.body.appendChild(t);clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.remove(),2800);}
render();
if(window.HHHData?.ready()) loadLiveCustomers();
