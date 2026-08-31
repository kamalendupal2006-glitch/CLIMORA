import React, { useRef, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { predictBatch } from '../services/predictionService';
import {
  Upload, FileText, AlertCircle, CheckCircle2, Download,
  X, FileSpreadsheet, ChevronDown, ChevronUp, Loader2,
  ShieldAlert, Shield, BarChart2, Info,
} from 'lucide-react';

const REQUIRED_COLUMNS = [
  'latitude','longitude','state_region','elevation_m','slope_deg','aspect_deg',
  'curvature','rainfall_mm','soil_moisture','temperature_c','humidity_pct','land_cover',
  'historical_landslide_count','days_since_previous_event',
];

const SAMPLE_CSV = `latitude,longitude,state_region,elevation_m,slope_deg,aspect_deg,curvature,rainfall_mm,soil_moisture,temperature_c,humidity_pct,land_cover,historical_landslide_count,days_since_previous_event
27.3389,88.6065,Sikkim,1487,25.0,180,0.05,4.3,0.326,21.0,92.0,Forest,3,180
11.5332,76.1284,Kerala,1180,42.5,225,0.8,188.5,0.89,21.0,94.0,Forest,6,180
25.5670,91.8829,Meghalaya,1120,38.0,200,0.6,95.0,0.72,19.5,88.0,Shrubland,5,90`;

const RISK_COLORS = {
  'NO RISK':  { bg:'#0f2418', border:'#14532d', text:'#4ade80', dot:'#22c55e' },
  'LOW':      { bg:'#1a2c14', border:'#166534', text:'#86efac', dot:'#4ade80' },
  'MODERATE': { bg:'#2a1e04', border:'#92400e', text:'#fbbf24', dot:'#f59e0b' },
  'HIGH':     { bg:'#2a0e04', border:'#991b1b', text:'#f87171', dot:'#ef4444' },
  'CRITICAL': { bg:'#1a0516', border:'#7e22ce', text:'#d8b4fe', dot:'#a855f7' },
};
function riskStyle(cat) { return RISK_COLORS[cat?.toUpperCase()] || RISK_COLORS['LOW']; }

function generatePDFReport(rows, results, filename) {
  const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(6,22,14);
  doc.rect(0,0,pageW,30,'F');
  doc.setTextColor(52,211,153); doc.setFontSize(16); doc.setFont('helvetica','bold');
  doc.text('CLIMORA — Batch Landslide Risk Assessment Report', 14, 12);
  doc.setFontSize(8); doc.setTextColor(148,163,184);
  doc.text(`Generated: ${new Date().toLocaleString()}  |  File: ${filename}  |  Rows: ${results.length}`, 14, 22);

  const counts = {'NO RISK':0,LOW:0,MODERATE:0,HIGH:0,CRITICAL:0};
  results.forEach(r=>{ if(r.success && r.risk_category) counts[r.risk_category]=(counts[r.risk_category]||0)+1; });
  const succeeded = results.filter(r=>r.success).length;

  doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
  doc.text('Summary', 14, 40);

  autoTable(doc,{
    startY:43,
    head:[['Metric','Count']],
    body:[
      ['Total Rows',String(results.length)],['Succeeded',String(succeeded)],
      ['Failed',String(results.length-succeeded)],['No Risk',String(counts['NO RISK'])],
      ['Low',String(counts.LOW)],['Moderate',String(counts.MODERATE)],
      ['High',String(counts.HIGH)],['Critical',String(counts.CRITICAL)],
    ],
    theme:'grid', styles:{fontSize:8,cellPadding:2},
    headStyles:{fillColor:[15,36,24],textColor:[52,211,153]},
    alternateRowStyles:{fillColor:[20,30,22]},
    margin:{left:14, right:pageW/2+10},
  });

  autoTable(doc,{
    startY: doc.lastAutoTable ? doc.lastAutoTable.finalY+10 : 60,
    head:[['#','Lat','Lon','State','Elev(m)','Slope°','Rain(mm)','Moisture','Risk','Prob%','Top Factor']],
    body: results.map((r,i)=>{
      const row=rows[i]||{};
      if(!r.success) return [String(i+1),String(row.latitude??''),String(row.longitude??''),row.state_region??'',String(row.elevation_m??''),String(row.slope_deg??''),String(row.rainfall_mm??''),String(row.soil_moisture??''),'ERROR','—',r.error??'Failed'];
      return [String(i+1),String(row.latitude??''),String(row.longitude??''),row.state_region??'',String(row.elevation_m??''),String(row.slope_deg??''),String(row.rainfall_mm??''),`${(parseFloat(row.soil_moisture??0)*100).toFixed(0)}%`,r.risk_category??'—',`${r.probability_percent??'?'}%`,r.contributing_factors?.[0]?.name??'—'];
    }),
    theme:'striped', styles:{fontSize:7,cellPadding:1.5,overflow:'linebreak'},
    headStyles:{fillColor:[15,36,24],textColor:[52,211,153],fontStyle:'bold'},
    didParseCell(data){
      if(data.section==='body'&&data.column.index===8){
        const c=data.cell.raw;
        if(c==='CRITICAL') data.cell.styles.textColor=[168,85,247];
        else if(c==='HIGH') data.cell.styles.textColor=[239,68,68];
        else if(c==='MODERATE') data.cell.styles.textColor=[245,158,11];
        else if(c==='LOW'||c==='NO RISK') data.cell.styles.textColor=[74,222,128];
        else if(c==='ERROR') data.cell.styles.textColor=[248,113,113];
      }
    },
    margin:{left:14,right:14},
  });

  const pgCount = doc.internal.getNumberOfPages();
  for(let i=1;i<=pgCount;i++){
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(100,116,139);
    doc.text('CLIMORA — Prototype / Research Use Only.',14,doc.internal.pageSize.getHeight()-8);
    doc.text(`Page ${i}/${pgCount}`,pageW-30,doc.internal.pageSize.getHeight()-8);
  }
  doc.save(`CLIMORA_Batch_Report_${Date.now()}.pdf`);
}

function InlineResultsTable({ rows, results }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="space-y-3 mt-4">
      <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-2">
        <BarChart2 className="w-3.5 h-3.5"/>
        Batch Results — {results.length} row{results.length!==1?'s':''}
      </div>
      {results.map((r,i)=>{
        const row=rows[i]||{};
        const isExp=expanded===i;
        const style=r.success?riskStyle(r.risk_category):riskStyle('HIGH');
        return(
          <div key={i} className="rounded-2xl border overflow-hidden transition-all duration-200" style={{borderColor:style.border,background:style.bg}}>
            <button type="button" onClick={()=>setExpanded(isExp?null:i)} className="w-full flex items-center justify-between px-4 py-3 text-left">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500 w-5">#{i+1}</span>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:style.dot}}/>
                <span className="text-xs font-bold" style={{color:style.text}}>{r.success?r.risk_category:'ERROR'}</span>
                {r.success&&<span className="text-xs font-mono text-slate-400">{r.probability_percent}%</span>}
                <span className="text-xs text-slate-500 hidden sm:inline">{row.state_region} · {row.latitude}, {row.longitude}</span>
              </div>
              <div className="flex items-center gap-2">
                {r.success&&<span className="text-[10px] text-slate-500 font-mono hidden md:inline">Top: {r.contributing_factors?.[0]?.name??'—'}</span>}
                {isExp?<ChevronUp className="w-3.5 h-3.5 text-slate-500"/>:<ChevronDown className="w-3.5 h-3.5 text-slate-500"/>}
              </div>
            </button>
            {isExp&&r.success&&(
              <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{borderColor:style.border}}>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {[['Elevation',`${row.elevation_m}m`],['Slope',`${row.slope_deg}°`],['Rainfall',`${row.rainfall_mm}mm`],['Soil Moisture',`${(parseFloat(row.soil_moisture??0)*100).toFixed(0)}%`],['Land Cover',row.land_cover],['Temperature',`${row.temperature_c}°C`],['Humidity',`${row.humidity_pct}%`],['Historical',String(row.historical_landslide_count)],['Days Since',String(row.days_since_previous_event)]].map(([k,v])=>(
                    <div key={k} className="bg-slate-950/60 rounded-lg px-2.5 py-2">
                      <div className="text-[9px] text-slate-500 uppercase tracking-wide">{k}</div>
                      <div className="text-xs text-white font-mono mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest">Contributing Factors</div>
                  {r.contributing_factors?.map(f=>(
                    <div key={f.name} className="flex items-center gap-2">
                      <div className="text-[10px] text-slate-400 w-36 flex-shrink-0">{f.name}</div>
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{width:`${f.impact}%`,background:f.severity==='high'?'#ef4444':f.severity==='moderate'?'#f59e0b':'#4ade80'}}/>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 w-8 text-right">{f.impact}%</div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-950/60 rounded-lg px-3 py-2">
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Recommendation</div>
                  <div className="text-xs text-slate-300">{r.recommendation}</div>
                </div>
              </div>
            )}
            {isExp&&!r.success&&(
              <div className="border-t px-4 py-3" style={{borderColor:style.border}}>
                <div className="text-xs text-rose-400">{r.error}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BatchUpload() {
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [parsedRows, setParsedRows] = useState(null);
  const [rawRowCount, setRawRowCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done:0, total:0 });
  const [batchResult, setBatchResult] = useState(null);
  const [runError, setRunError] = useState(null);

  const parseFile = useCallback((f) => {
    setFile(f); setParseError(null); setParsedRows(null); setBatchResult(null); setRunError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let jsonRows;
        const name = f.name.toLowerCase();
        if (name.endsWith('.csv')) {
          const wb = XLSX.read(e.target.result, { type:'string' });
          jsonRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval:'' });
        } else {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type:'array' });
          jsonRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval:'' });
        }
        if (!jsonRows||jsonRows.length===0) { setParseError('File has no data rows.'); return; }
        const cols = Object.keys(jsonRows[0]).map(c=>c.trim().toLowerCase());
        const missing = REQUIRED_COLUMNS.filter(rc=>!cols.includes(rc));
        if (missing.length>0) { setParseError(`Missing columns: ${missing.join(', ')}`); return; }
        setRawRowCount(jsonRows.length);
        const rows = jsonRows.map(row=>{
          const r={};
          for(const [k,v] of Object.entries(row)) r[k.trim().toLowerCase()]=v;
          return {
            latitude:parseFloat(r.latitude), longitude:parseFloat(r.longitude),
            state_region:String(r.state_region).trim(), elevation_m:parseFloat(r.elevation_m),
            slope_deg:parseFloat(r.slope_deg), aspect_deg:parseFloat(r.aspect_deg),
            curvature:parseFloat(r.curvature), rainfall_mm:parseFloat(r.rainfall_mm),
            soil_moisture:parseFloat(r.soil_moisture), temperature_c:parseFloat(r.temperature_c),
            humidity_pct:parseFloat(r.humidity_pct), land_cover:String(r.land_cover).trim(),
            historical_landslide_count:parseInt(r.historical_landslide_count,10),
            days_since_previous_event:parseInt(r.days_since_previous_event,10),
          };
        });
        setParsedRows(rows);
      } catch(err) { setParseError(`Failed to parse: ${err.message}`); }
    };
    f.name.toLowerCase().endsWith('.csv') ? reader.readAsText(f) : reader.readAsArrayBuffer(f);
  },[]);

  const handleDrop = useCallback((e)=>{ e.preventDefault(); setDragging(false); const f=e.dataTransfer.files[0]; if(f) parseFile(f); },[parseFile]);
  const handleFileChange = (e)=>{ const f=e.target.files[0]; if(f) parseFile(f); };

  const handleRunBatch = async () => {
    if(!parsedRows) return;
    setRunning(true); setBatchResult(null); setRunError(null);
    setProgress({ done:0, total:parsedRows.length });
    try {
      const data = await predictBatch(parsedRows,(done,total)=>setProgress({done,total}));
      setBatchResult(data);
      if(parsedRows.length>5) generatePDFReport(parsedRows,data.results,file?.name??'batch');
    } catch(err) { setRunError(err.message); }
    finally { setRunning(false); }
  };

  const handleReset = () => {
    setFile(null); setParsedRows(null); setBatchResult(null); setParseError(null); setRunError(null);
    setProgress({done:0,total:0});
    if(fileInputRef.current) fileInputRef.current.value='';
  };

  const downloadSampleCSV = () => {
    const blob = new Blob([SAMPLE_CSV],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='climora_batch_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const progressPct = progress.total>0 ? Math.round((progress.done/progress.total)*100) : 0;
  const isBigBatch = parsedRows && parsedRows.length>5;

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <Info className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0"/>
        <div className="space-y-1">
          <div className="text-xs font-semibold text-white">Batch Prediction Mode</div>
          <div className="text-xs text-slate-400">
            Upload a CSV or Excel file with up to 500 rows.{' '}
            <span className="text-emerald-400 font-semibold">≤5 rows</span> → results shown inline as expandable cards.{' '}
            <span className="text-amber-400 font-semibold">&gt;5 rows</span> → PDF report downloaded automatically.
          </div>
          <button type="button" onClick={downloadSampleCSV} className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 mt-1 underline underline-offset-2">
            <Download className="w-3 h-3"/> Download sample CSV template
          </button>
        </div>
      </div>

      {/* Drop zone */}
      {!file&&(
        <div
          onDragOver={(e)=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={handleDrop}
          onClick={()=>fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all duration-200 ${dragging?'border-emerald-500 bg-emerald-950/20':'border-slate-700 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900/60'}`}
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
            <Upload className="w-6 h-6 text-emerald-400"/>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-white">Drop your file here, or <span className="text-emerald-400">click to browse</span></div>
            <div className="text-xs text-slate-500 mt-1">Accepts .csv · .xlsx · .xls — up to 500 rows</div>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange}/>
        </div>
      )}

      {/* Parse error */}
      {parseError&&(
        <div className="flex items-start gap-3 bg-rose-950/40 border border-rose-800 rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5"/>
          <div>
            <div className="text-xs font-semibold text-rose-300">File Error</div>
            <div className="text-xs text-rose-400 mt-0.5">{parseError}</div>
            <div className="text-[11px] text-slate-500 mt-2">Required: {REQUIRED_COLUMNS.join(', ')}</div>
          </div>
        </div>
      )}

      {/* File loaded */}
      {parsedRows&&!batchResult&&(
        <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400"/>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{file?.name}</div>
                <div className="text-xs text-slate-400">
                  {rawRowCount} row{rawRowCount!==1?'s':''} parsed · 14 features detected
                  {isBigBatch&&<span className="ml-2 text-amber-400">→ PDF report will be generated</span>}
                </div>
              </div>
            </div>
            <button type="button" onClick={handleReset} className="text-slate-500 hover:text-slate-300 p-1"><X className="w-4 h-4"/></button>
          </div>

          {/* Preview */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="bg-slate-800/60">
                  {['#','State','Lat','Lon','Elev','Slope','Rainfall','Land Cover'].map(h=>(
                    <th key={h} className="px-3 py-2 text-left text-slate-400 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0,5).map((r,i)=>(
                  <tr key={i} className="border-t border-slate-800/60 hover:bg-slate-800/20">
                    <td className="px-3 py-1.5 text-slate-500">{i+1}</td>
                    <td className="px-3 py-1.5 text-slate-300">{r.state_region}</td>
                    <td className="px-3 py-1.5 text-slate-400">{r.latitude}</td>
                    <td className="px-3 py-1.5 text-slate-400">{r.longitude}</td>
                    <td className="px-3 py-1.5 text-slate-400">{r.elevation_m}m</td>
                    <td className="px-3 py-1.5 text-slate-400">{r.slope_deg}°</td>
                    <td className="px-3 py-1.5 text-slate-400">{r.rainfall_mm}mm</td>
                    <td className="px-3 py-1.5 text-slate-300">{r.land_cover}</td>
                  </tr>
                ))}
                {parsedRows.length>5&&(
                  <tr className="border-t border-slate-800/60">
                    <td colSpan={8} className="px-3 py-2 text-center text-slate-500 text-[10px]">… and {parsedRows.length-5} more rows</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button type="button" onClick={handleRunBatch} disabled={running}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all duration-200 disabled:opacity-50">
            {running?<><Loader2 className="w-4 h-4 animate-spin"/> Running predictions…</>:<><ShieldAlert className="w-4 h-4"/> Run Batch Prediction ({parsedRows.length} rows)</>}
          </button>
        </div>
      )}

      {/* Progress */}
      {running&&(
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Processing rows…</span>
            <span className="text-emerald-400 font-mono">{progress.done} / {progress.total}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300" style={{width:`${progressPct}%`}}/>
          </div>
          <div className="text-[11px] text-slate-500 text-center">
            {isBigBatch?'PDF report will download automatically when complete':'Results will appear below when complete'}
          </div>
        </div>
      )}

      {/* Run error */}
      {runError&&(
        <div className="flex items-start gap-3 bg-rose-950/40 border border-rose-800 rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5"/>
          <div>
            <div className="text-xs font-semibold text-rose-300">Batch Error</div>
            <div className="text-xs text-rose-400 mt-0.5">{runError}</div>
          </div>
        </div>
      )}

      {/* Inline results ≤5 */}
      {batchResult&&!isBigBatch&&(
        <div>
          <InlineResultsTable rows={parsedRows} results={batchResult.results}/>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400"/>
            {batchResult.succeeded} of {batchResult.total} predictions succeeded
          </div>
        </div>
      )}

      {/* PDF confirmation >5 */}
      {batchResult&&isBigBatch&&(
        <div className="flex items-start gap-3 bg-emerald-950/30 border border-emerald-800 rounded-2xl p-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5"/>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-emerald-300">Batch complete — {batchResult.succeeded}/{batchResult.total} predictions succeeded</div>
            <div className="text-xs text-slate-400">PDF report has been downloaded. If it didn't save, click below:</div>
            <button type="button" onClick={()=>generatePDFReport(parsedRows,batchResult.results,file?.name??'batch')}
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
              <Download className="w-3.5 h-3.5"/> Re-download PDF Report
            </button>
          </div>
        </div>
      )}

      {batchResult&&(
        <button type="button" onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-300 transition-all duration-200">
          <X className="w-3.5 h-3.5"/> Upload another file
        </button>
      )}
    </div>
  );
}
