/* Minimal data access layer for HHH CRM. RLS remains the security boundary. */
window.HHHData = {
  ready() { return !!window.HHH_DB?.client; },
  async listCustomers({search = "", status = "Tất cả", limit = 100} = {}) {
    if (!this.ready()) throw new Error("Chưa cấu hình Supabase. Hãy cập nhật assets/js/supabase-config.js.");
    let q = window.HHH_DB.client.from("customers")
      .select("*")
      .order("created_at", {ascending:false}).limit(limit);
    if (search) q = q.or(`full_name.ilike.%${search}%,company_name.ilike.%${search}%,phone.ilike.%${search}%`);
    if (status !== "Tất cả") q = q.eq("status", status);
    const {data,error} = await q;
    if (error) throw error;
    return data || [];
  },
  async createCustomer(input) {
    if (!this.ready()) throw new Error("Chưa cấu hình Supabase.");
    const payload = {
      full_name: String(input.full_name || "").trim(),
      company_name: String(input.company_name || "").trim() || null,
      customer_type: input.customer_type || "Khác",
      phone: String(input.phone || "").trim(),
      email: String(input.email || "").trim() || null,
      business_unit: "aluminum",
      status: input.status || "Tiềm năng",
      source: input.source || null,
      notes: input.notes || null,
      address: String(input.address || "").trim() || null,
      province: String(input.province || "").trim() || null,
      contact_person: String(input.contact_person || "").trim() || null,
      tax_code: String(input.tax_code || "").trim() || null,
      customer_description: String(input.customer_description || "").trim() || null,
      business_scale: input.business_scale || "Chưa phân loại",
      potential_level: input.potential_level || "Chưa đánh giá",
      potential_score: input.potential_score === "" || input.potential_score == null ? null : Number(input.potential_score),
      location_url: String(input.location_url || "").trim() || null,
      location_lat: input.location_lat ?? null,
      location_lng: input.location_lng ?? null
    };
    if (!payload.full_name || !payload.phone) throw new Error("Họ tên và số điện thoại là bắt buộc.");
    const {data,error} = await window.HHH_DB.client.from("customers").insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  async updateCustomer(id, changes) {
    if (!this.ready()) throw new Error("Chưa cấu hình Supabase.");
    const allowed = ["full_name","company_name","customer_type","phone","email","business_unit","status","source","address","province","group_id","assigned_to","notes","contact_person","tax_code","customer_description","business_scale","potential_level","potential_score","location_url","location_lat","location_lng"];
    const payload = Object.fromEntries(Object.entries(changes).filter(([k])=>allowed.includes(k)));
    const {data,error} = await window.HHH_DB.client.from("customers").update(payload).eq("id",id).select().single();
    if (error) throw error;
    return data;
  },
  async deleteCustomer(id) {
    if (!this.ready()) throw new Error("Chưa cấu hình Supabase.");
    const {error} = await window.HHH_DB.client.from("customers").delete().eq("id",id);
    if (error) throw error;
  },
  async listActivities(customerId) {
    if (!this.ready()) throw new Error("Chưa cấu hình Supabase.");
    const {data,error} = await window.HHH_DB.client.from("activities")
      .select("id,activity_type,subject,description,outcome,occurred_at,created_by")
      .eq("customer_id", customerId).order("occurred_at", {ascending:false}).limit(50);
    if (error) throw error;
    return data || [];
  },
  async addActivity(input) {
    if (!this.ready()) throw new Error("Chưa cấu hình Supabase.");
    const {data,error} = await window.HHH_DB.client.from("activities").insert(input).select().single();
    if (error) throw error;
    return data;
  },
  async listCareTasks({from,to}={}) {
    if (!this.ready()) throw new Error("Chưa cấu hình Supabase.");
    let q = window.HHH_DB.client.from("care_tasks")
      .select("*, customers(full_name,company_name)")
      .order("due_at",{ascending:true});
    if(from) q=q.gte("due_at",from);
    if(to) q=q.lte("due_at",to);
    const {data,error}=await q;
    if(error) throw error;
    return data || [];
  }

  ,
  async listRows(table, select = "*") {
    if (!this.ready()) throw new Error("Chưa cấu hình Supabase.");
    const allowed = ["leads","opportunities","orders","complaints","care_tasks"];
    if (!allowed.includes(table)) throw new Error("Bảng dữ liệu không được hỗ trợ.");
    let q = window.HHH_DB.client.from(table).select(select).order("created_at", {ascending:false}).limit(500);
    const {data,error}=await q;
    if(error) throw error;
    return data || [];
  },
  async createRow(table, input) {
    if (!this.ready()) throw new Error("Chưa cấu hình Supabase.");
    const allowed = ["leads","opportunities","orders","complaints","care_tasks"];
    if (!allowed.includes(table)) throw new Error("Bảng dữ liệu không được hỗ trợ.");
    let payload;
    if (table === "leads") {
      payload = {
        full_name: String(input.full_name || "").trim(),
        company_name: String(input.company_name || "").trim() || null,
        phone: String(input.phone || "").trim() || null,
        source: String(input.source || "").trim() || null,
        stage: input.stage || "new"
      };
      if (!payload.full_name) throw new Error("Vui lòng nhập họ tên.");
    } else if (table === "opportunities") {
      payload = {title:String(input.title||"").trim(),customer_id:input.customer_id,business_unit:"aluminum",expected_value:Number(input.expected_value||0),expected_close_date:input.expected_close_date||null};
    } else if (table === "orders") {
      payload = {order_code:String(input.order_code||"").trim(),customer_id:input.customer_id,business_unit:input.business_unit||"aluminum",order_date:input.order_date,total_amount:Number(input.total_amount||0),paid_amount:Number(input.paid_amount||0)};
    } else if (table === "complaints") {
      payload = {title:String(input.title||"").trim(),customer_id:input.customer_id,description:String(input.description||"").trim(),priority:input.priority||"normal"};
    } else {
      payload = {title:String(input.title||"").trim(),customer_id:input.customer_id||null,due_at:input.due_at,priority:input.priority||"normal",description:String(input.description||"").trim()||null};
    }
    const {data,error}=await window.HHH_DB.client.from(table).insert(payload).select().single();
    if(error) throw error;
    return data;
  },
  async listCustomerContacts(customerId) {
    const {data,error}=await window.HHH_DB.client.from("customer_contacts").select("id,customer_id,full_name,position,phone,email,is_primary,notes,created_at").eq("customer_id",customerId).order("is_primary",{ascending:false}).order("created_at");
    if(error) throw error; return data||[];
  },
  async createCustomerContact(input) {
    const c=window.HHH_DB.client;
    if(input.is_primary) { const {error}=await c.from("customer_contacts").update({is_primary:false}).eq("customer_id",input.customer_id); if(error) throw error; }
    const {data,error}=await c.from("customer_contacts").insert({customer_id:input.customer_id,full_name:String(input.full_name||"").trim(),position:input.position||null,phone:input.phone||null,email:input.email||null,is_primary:!!input.is_primary}).select().single();
    if(error) throw error; return data;
  },
  async deleteCustomerContact(id) { const {error}=await window.HHH_DB.client.from("customer_contacts").delete().eq("id",id); if(error) throw error; },
  async listCustomerTags(customerId) {
    const {data,error}=await window.HHH_DB.client.from("customer_tag_assignments").select("tag:customer_tags(id,name,color)").eq("customer_id",customerId);
    if(error) throw error; return (data||[]).map(x=>x.tag).filter(Boolean);
  },
  async addCustomerTag(customerId,name) {
    const c=window.HHH_DB.client;
    let {data:tag,error}=await c.from("customer_tags").select("id,name").ilike("name",name).maybeSingle();
    if(error) throw error;
    if(!tag){const result=await c.from("customer_tags").insert({name}).select("id,name").single();if(result.error)throw result.error;tag=result.data;}
    const result=await c.from("customer_tag_assignments").upsert({customer_id:customerId,tag_id:tag.id},{onConflict:"customer_id,tag_id"});
    if(result.error)throw result.error;return tag;
  },
  async removeCustomerTag(customerId,tagId) { const {error}=await window.HHH_DB.client.from("customer_tag_assignments").delete().eq("customer_id",customerId).eq("tag_id",tagId);if(error)throw error; },
  async listCustomerCareGroups(customerId) {
    const {data,error}=await window.HHH_DB.client.from("customer_care_group_members").select("group:customer_care_groups(id,name,description)").eq("customer_id",customerId);
    if(error)throw error;return (data||[]).map(x=>x.group).filter(Boolean);
  },
  async addCustomerCareGroup(customerId,name,description="") {
    const c=window.HHH_DB.client;
    let {data:group,error}=await c.from("customer_care_groups").select("id,name,description").ilike("name",name).maybeSingle();
    if(error)throw error;
    if(!group){const result=await c.from("customer_care_groups").insert({name,description:description||null}).select("id,name,description").single();if(result.error)throw result.error;group=result.data;}
    const result=await c.from("customer_care_group_members").upsert({customer_id:customerId,group_id:group.id},{onConflict:"customer_id,group_id"});if(result.error)throw result.error;return group;
  },
  async removeCustomerCareGroup(customerId,groupId) { const {error}=await window.HHH_DB.client.from("customer_care_group_members").delete().eq("customer_id",customerId).eq("group_id",groupId);if(error)throw error; },
  async listCustomerDocuments(customerId) {
    const {data,error}=await window.HHH_DB.client.from("customer_documents").select("id,customer_id,file_name,file_size,mime_type,category,storage_path,created_at").eq("customer_id",customerId).order("created_at",{ascending:false});if(error)throw error;return data||[];
  },
  async uploadCustomerDocument(customerId,file,category="Tài liệu khách hàng") {
    const c=window.HHH_DB.client;const safe=file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"_").slice(-100);const path=`${customerId}/${crypto.randomUUID()}_${safe}`;
    const up=await c.storage.from("hhh-customer-documents").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type||"application/octet-stream"});if(up.error)throw up.error;
    const meta=await c.from("customer_documents").insert({customer_id:customerId,file_name:file.name,file_size:file.size,mime_type:file.type||null,category,storage_path:path}).select().single();
    if(meta.error){await c.storage.from("hhh-customer-documents").remove([path]);throw meta.error;}return meta.data;
  },
  async getCustomerDocumentUrl(id) {
    const {data,error}=await window.HHH_DB.client.from("customer_documents").select("storage_path").eq("id",id).single();if(error)throw error;
    const result=await window.HHH_DB.client.storage.from("hhh-customer-documents").createSignedUrl(data.storage_path,90);if(result.error)throw result.error;return result.data.signedUrl;
  },
  async deleteCustomerDocument(id) {
    const c=window.HHH_DB.client;const {data,error}=await c.from("customer_documents").select("storage_path").eq("id",id).single();if(error)throw error;
    const rm=await c.storage.from("hhh-customer-documents").remove([data.storage_path]);if(rm.error)throw rm.error;
    const del=await c.from("customer_documents").delete().eq("id",id);if(del.error)throw del.error;
  }
  ,
  async listAllActivities() {
    const {data,error}=await window.HHH_DB.client.from("activities").select("id,customer_id,created_by,occurred_at,activity_type,subject").order("occurred_at",{ascending:false}).limit(5000);
    if(error)throw error;return data||[];
  },
  async listProfiles() {
    const {data,error}=await window.HHH_DB.client.from("profiles").select("id,full_name,email,role,is_active").eq("is_active",true).order("full_name");
    if(error)throw error;return data||[];
  },
  async listCareGroups() {
    const {data,error}=await window.HHH_DB.client.from("customer_care_groups").select("id,name,description").order("name");
    if(error)throw error;return data||[];
  },
  async listCarePlans() {
    const {data,error}=await window.HHH_DB.client.from("customer_care_plans").select("id,name,interval_days,starts_on,is_active,group:customer_care_groups(name)").order("created_at",{ascending:false});
    if(error)throw error;return (data||[]).map(p=>({...p,group_name:p.group?.name||''}));
  },
  async createCarePlan(input) {
    const {data,error}=await window.HHH_DB.client.from("customer_care_plans").insert({name:input.name,group_id:input.group_id,interval_days:input.interval_days,starts_on:input.starts_on}).select().single();
    if(error)throw error;return data;
  }

};
