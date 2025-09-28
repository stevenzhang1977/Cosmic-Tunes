import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Choose() {
  const router = useRouter();
  const [show, setShow] = useState(true);

  useEffect(() => {
    // If user refreshes here, keep the chooser visible
    setShow(true);
  }, []);

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f172a,#1e293b)',color:'#fff',display:'grid',placeItems:'center',fontFamily:'Inter,system-ui,sans-serif'}}>
      {/* dim background */}
      {show && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)'}} />
      )}

      {/* modal */}
      {show && (
        <div style={{position:'relative',zIndex:10,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.15)',backdropFilter:'blur(8px)',borderRadius:16,padding:24,width:'min(92vw,520px)'}}>
          <h1 style={{fontSize:24,fontWeight:700,marginBottom:8}}>How do you want to build your galaxy?</h1>
          <p style={{opacity:.85,marginBottom:16}}>Choose solo for your personal universe, or create/join a shared session for a merged galaxy.</p>

          <div style={{display:'grid',gap:12}}>
            <button
              onClick={() => router.push("/galaxy")}
              style={{padding:'12px 14px',borderRadius:10,fontWeight:600,background:'#6366f1'}}
            >
              Solo (Personal Universe)
            </button>

            <button
              onClick={() => router.push("/group?host=true")}
              style={{padding:'12px 14px',borderRadius:10,fontWeight:600,background:'#a855f7'}}
            >
              Group (Create or Join a Session)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
