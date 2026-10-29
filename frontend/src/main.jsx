import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, ArrowRight, BrainCircuit, Check, Gauge, Info, Loader2, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import "./styles.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const LIKERT = [
  {v:1,t:"Very low"},{v:2,t:"Low"},{v:3,t:"Moderate"},{v:4,t:"High"},{v:5,t:"Very high"}
];

function App(){
  const [meta,setMeta]=useState(null);
  const [form,setForm]=useState({});
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    fetch(`${API_BASE}/api/metadata/`)
      .then(r=>r.json()).then(d=>{
        setMeta(d);
        const initial={};
        d.parameters.forEach(p=>initial[p.name]=p.default);
        setForm(initial);
      }).catch(()=>setError("Backend is not reachable. Start the project with app.py."));
  },[]);

  const setValue=(name,value)=>setForm(f=>({...f,[name]:value}));

  const submit=async(e)=>{
    e.preventDefault(); setLoading(true); setError(""); setResult(null);
    try{
      const r=await fetch(`${API_BASE}/api/predict/`,{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)
      });
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||"Prediction failed.");
      setResult(d);
      setTimeout(()=>document.getElementById("result")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
    }catch(err){setError(err.message)}
    finally{setLoading(false)}
  };

  const reset=()=>{
    if(!meta)return;
    const initial={}; meta.parameters.forEach(p=>initial[p.name]=p.default);
    setForm(initial); setResult(null); setError("");
  };

  if(!meta) return <div className="boot"><div className="boot-card"><Sparkles/><span>Loading StressLens…</span></div></div>;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><BrainCircuit size={20}/></div><div><strong>StressLens</strong><span>Multi-Task Neural Network</span></div></div>
      <div className="status"><span className="pulse"></span> Local inference</div>
    </header>

    <main>
      <section className="hero">
        <div className="eyebrow"><Sparkles size={14}/> AI-ASSISTED STUDENT WELLBEING</div>
        <h1>Understand your stress profile<br/><em>in a few signals.</em></h1>
        <p>Enter 8 key survey signals. The remaining inputs are automatically held at training-set defaults so the trained model can produce a complete 25-feature prediction.</p>
        <div className="hero-meta"><span><ShieldCheck size={15}/> Runs locally</span><span><Gauge size={15}/> 25-feature model</span><span><Activity size={15}/> 3 outcomes</span></div>
      </section>

      <section className="workspace">
        <form className="panel form-panel" onSubmit={submit}>
          <div className="panel-head">
            <div><span className="section-kicker">01 / INPUT</span><h2>Your signals</h2></div>
            <button type="button" className="ghost-btn" onClick={reset}><RotateCcw size={15}/> Reset</button>
          </div>

          <div className="fields">
            {meta.parameters.map((p,i)=><div className="field" key={p.name}>
              <div className="field-title"><label>{p.label}</label><span className="field-number">{String(i+1).padStart(2,"0")}</span></div>
              {p.type==="number" && <div className="number-wrap"><input type="number" min={p.min} max={p.max} value={form[p.name]??p.default} onChange={e=>setValue(p.name,Number(e.target.value))}/><span>years</span></div>}
              {p.type==="select" && <div className="segmented">{p.options.map(o=><button type="button" key={o.value} className={Number(form[p.name])===o.value?"selected":""} onClick={()=>setValue(p.name,o.value)}>{o.label}</button>)}</div>}
              {p.type==="likert" && <div className="likert">{LIKERT.map(o=><button type="button" key={o.v} className={Number(form[p.name])===o.v?"selected":""} onClick={()=>setValue(p.name,o.v)}><b>{o.v}</b><small>{o.t}</small></button>)}</div>}
            </div>)}
          </div>

          <div className="auto-note"><Info size={16}/><div><b>17 other features are automatic.</b><span>They use defaults derived from the model's training data. You only control the 8 displayed parameters.</span></div></div>
          {error && <div className="error">{error}</div>}
          <button className="predict-btn" disabled={loading} type="submit">{loading?<><Loader2 className="spin" size={18}/> Running model…</>:<>Predict stress level <ArrowRight size={18}/></>}</button>
        </form>

        <section className="panel result-panel" id="result">
          <div className="panel-head"><div><span className="section-kicker">02 / OUTPUT</span><h2>Prediction</h2></div><div className="model-chip">MT-NN</div></div>
          {!result ? <div className="empty-state"><div className="orb"><BrainCircuit size={34}/></div><h3>Your result will appear here</h3><p>Complete the signals on the left and run the local neural network.</p></div> :
            <div className="result-content">
              <div className={"result-card "+result.stress_level.toLowerCase().replace(" ","-")}>
                <div className="result-label">Predicted profile</div>
                <div className="result-main"><h3>{result.stress_level}</h3><div className="confidence">{result.confidence}%<span>model confidence</span></div></div>
                <div className="result-line"><span>Task head</span><b>Cluster {result.task_id+1}</b></div>
              </div>
              <div className="prob-block"><div className="subhead"><span>Class distribution</span><span>Probability</span></div>
                {result.probabilities.map(p=><div className="prob" key={p.label}><div className="prob-top"><span>{p.label}</span><b>{p.value}%</b></div><div className="bar"><i style={{width:`${p.value}%`}}></i></div></div>)}
              </div>
              <div className="tech-grid"><div><span>Engine</span><b>PyTorch</b></div><div><span>Inference</span><b>Local</b></div><div><span>Device</span><b>{result.device.includes("cuda")?"RTX GPU":"CPU"}</b></div><div><span>Features</span><b>25</b></div></div>
              <div className="notice"><Info size={15}/><span>This is a model prediction for educational/project use, not a medical diagnosis.</span></div>
            </div>}
        </section>
      </section>
    </main>
    <footer><span>StressLens · Student Stress Prediction</span><span>Private local inference · No data leaves your machine</span></footer>
  </div>
}

createRoot(document.getElementById("root")).render(<App />);
