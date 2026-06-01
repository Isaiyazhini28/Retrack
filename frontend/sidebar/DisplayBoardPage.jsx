import React, { useState, useEffect } from "react";
import axios from "axios";

const BOARD_API = "http://localhost:5000/api/board";

const injectBoardStyles = () => {
  if (document.getElementById("board-css")) return;
  const s = document.createElement("style");
  s.id = "board-css";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
    .bd-root{width:100%;height:100%;overflow-y:auto;padding:28px 30px;background:#F0F4F8;font-family:'Syne',sans-serif;}
    .bd-root::-webkit-scrollbar{width:5px;}.bd-root::-webkit-scrollbar-thumb{background:#E2E8F0;border-radius:3px;}
    .bd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:18px;margin-top:20px;}
    .bd-post-card{background:#fff;border:1px solid #E2E8F0;border-radius:18px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);transition:transform 0.2s,box-shadow 0.2s;}
    .bd-post-card:hover{transform:translateY(-3px);box-shadow:0 10px 30px rgba(0,0,0,0.1);}
    .bd-post-card.pinned{border-color:#38BDF8;box-shadow:0 4px 16px rgba(56,189,248,0.2);}
    .bd-post-top{padding:16px 18px 12px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
    .bd-post-body{padding:0 18px 16px;}
    .bd-post-content{font-size:13.5px;color:#475569;line-height:1.6;}
    .bd-post-footer{padding:10px 18px;border-top:1px solid #F1F5F9;display:flex;align-items:center;justify-content:space-between;}
    .bd-badge{padding:4px 10px;border-radius:20px;font-size:10.5px;font-weight:700;}
    .bd-priority-bar{height:3px;width:100%;}
    .bd-empty{padding:60px 20px;text-align:center;color:#94A3B8;font-size:13px;}
    .bd-empty-icon{font-size:40px;margin-bottom:14px;opacity:0.5;}
    .pp-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:10px;border:none;font-size:13px;font-family:'Syne',sans-serif;font-weight:700;cursor:pointer;transition:all 0.16s;}
    .pp-btn-primary{background:linear-gradient(135deg,#0D1B2A,#1e3a5f);color:#fff;}
    .pp-btn-primary:hover{box-shadow:0 6px 20px rgba(13,27,42,0.3);transform:translateY(-1px);}
  `;
  document.head.appendChild(s);
};

const CAT_COLORS = { General:"#38BDF8",Urgent:"#EF4444","HR Policy":"#7C3AED",Event:"#10B981",Celebration:"#F59E0B","IT Update":"#F97316",Other:"#94A3B8" };
const PRI_COLORS = { Normal:"#10B981",High:"#F59E0B",Critical:"#EF4444" };

export function DisplayBoardPage() {
  injectBoardStyles();
  const [posts, setPosts]     = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title:"",content:"",category:"General",priority:"Normal",pinned:false,end_date:"" });

  const fetchPosts = async () => {
    try { const r = await axios.get(`${BOARD_API}/announcements`); setPosts(Array.isArray(r.data)?r.data:[]); } catch {}
  };
  useEffect(() => { fetchPosts(); }, []);

  const createPost = async () => {
    if (!form.title || !form.content) return alert("Title and content required");
    try {
      await axios.post(`${BOARD_API}/announcements`, { ...form, posted_by_name:"HR Admin" });
      setShowModal(false); setForm({ title:"",content:"",category:"General",priority:"Normal",pinned:false,end_date:"" }); fetchPosts();
    } catch { alert("Failed to post"); }
  };

  const deletePost = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try { await axios.delete(`${BOARD_API}/announcements/${id}`); fetchPosts(); } catch { alert("Delete failed"); }
  };

  return (
    <div className="bd-root">
      <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:22 }}>
        <div>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:3 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#0D1B2A,#1e3a5f)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>📢</div>
            <span style={{ fontSize:24,fontWeight:800,color:"#0D1B2A",letterSpacing:"-0.4px" }}>Display Board</span>
          </div>
          <div style={{ fontSize:13,color:"#94A3B8",marginLeft:52 }}>{posts.length} active announcements</div>
        </div>
        <button className="pp-btn pp-btn-primary" onClick={()=>setShowModal(true)}>+ Post Announcement</button>
      </div>

      {posts.length === 0 ? (
        <div style={{ background:"#fff",borderRadius:20,border:"1px solid #E2E8F0",overflow:"hidden" }}>
          <div className="bd-empty"><div className="bd-empty-icon">📢</div>No active announcements. Post the first one!</div>
        </div>
      ) : (
        <div className="bd-grid">
          {posts.map(post => (
            <div key={post.id} className={`bd-post-card${post.pinned?" pinned":""}`}>
              <div className="bd-priority-bar" style={{ background:PRI_COLORS[post.priority]||"#10B981" }} />
              <div className="bd-post-top">
                <div>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5 }}>
                    {post.pinned && <span style={{ fontSize:13 }}>📌</span>}
                    <span className="bd-badge" style={{ background:`${CAT_COLORS[post.category]||"#38BDF8"}15`,color:CAT_COLORS[post.category]||"#38BDF8" }}>{post.category}</span>
                    {post.priority !== "Normal" && <span className="bd-badge" style={{ background:`${PRI_COLORS[post.priority]}15`,color:PRI_COLORS[post.priority] }}>{post.priority}</span>}
                  </div>
                  <div style={{ fontSize:15,fontWeight:800,color:"#0D1B2A",lineHeight:1.3 }}>{post.title}</div>
                </div>
                <button onClick={()=>deletePost(post.id)}
                  style={{ width:28,height:28,borderRadius:7,background:"#FFF5F5",border:"1px solid #FECACA",color:"#EF4444",cursor:"pointer",fontSize:11,fontWeight:800,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
              </div>
              <div className="bd-post-body">
                <div className="bd-post-content">{post.content}</div>
              </div>
              <div className="bd-post-footer">
                <span style={{ fontSize:11,color:"#94A3B8" }}>By {post.posted_by_name||"HR Admin"}</span>
                <span style={{ fontSize:11,color:"#94A3B8" }}>{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{ width:520 }}>
            <div className="modal-header">
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                <div><div className="modal-title">Post Announcement</div><div className="modal-sub">Broadcast to all employees</div></div>
                <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
              </div>
            </div>
            <div className="modal-body">
              <label className="form-label">Title</label>
              <input className="form-input" placeholder="Announcement title" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} />
              <div className="form-row" style={{ marginBottom:0 }}>
                <div><label className="form-label">Category</label>
                  <select className="form-input" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                    {Object.keys(CAT_COLORS).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Priority</label>
                  <select className="form-input" value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))}>
                    {["Normal","High","Critical"].map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <label className="form-label">Content</label>
              <textarea className="form-input" rows={4} placeholder="Write your announcement…" value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))} style={{ resize:"vertical" }} />
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
                <input type="checkbox" id="pin-chk" checked={form.pinned} onChange={e=>setForm(p=>({...p,pinned:e.target.checked}))} />
                <label htmlFor="pin-chk" style={{ fontSize:13,fontWeight:600,color:"#0D1B2A",cursor:"pointer" }}>📌 Pin this announcement</label>
              </div>
              <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
                <button className="pp-btn" style={{ background:"#F8FAFC",border:"1px solid #E2E8F0",color:"#64748B",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13 }} onClick={()=>setShowModal(false)}>Cancel</button>
                <button className="pp-btn pp-btn-primary" onClick={createPost}>📢 Publish →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}