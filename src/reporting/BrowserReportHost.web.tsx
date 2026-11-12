import {pdfSnapshot,subscribePdf} from './pdfExport.web';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {openReportWindow} from './reportHandoff.web';
import {closeReportPreviews,reportPreviewSnapshot,subscribeReportPreview} from './reportPreview.web';
export function BrowserReportHost() {
 const html=useSyncExternalStore(subscribeReportPreview,reportPreviewSnapshot,()=>null);
 const pdf=useSyncExternalStore(subscribePdf,pdfSnapshot,()=>null);
 const content=pdf?.html??html;
 const [notice,setNotice]=useState('');
 useEffect(()=>{setNotice('');},[pdf]);
 const open=()=>{if(!pdf)return;setNotice('Opening your private report window…');void openReportWindow(pdf).then(()=>setNotice('Report opened in a browser window. Download it there.')).catch(e=>setNotice(e.message));};
 if(!content)return null;
 const embedded=window.self!==window.top;
 const controlStyle={boxSizing:'border-box',border:'1px solid #87aeb8',borderRadius:8,padding:'10px 16px',minHeight:44,background:'#fff',color:'#172b4d',font:'600 14px system-ui',cursor:'pointer',textAlign:'center',textDecoration:'none',display:'inline-flex',alignItems:'center',justifyContent:'center'} as const;
 return <section role="dialog" aria-modal="true" aria-label="Inspection report preview" style={{position:'fixed',inset:0,zIndex:10001,background:'#edf3f5',display:'flex',flexDirection:'column',fontFamily:'system-ui',color:'#172b4d'}}>
  <div role="toolbar" aria-label="Report actions" style={{padding:'12px 16px',background:'#172b4d',display:'flex',gap:10,justifyContent:'flex-end',alignItems:'center',flexWrap:'wrap'}}>
   <a style={{...controlStyle,background:'#b8efcf',opacity:pdf?1:0.55}} href={pdf?.url} download={pdf?.filename} aria-disabled={!pdf} onClick={event=>{if(!pdf){event.preventDefault();return;}if(embedded){event.preventDefault();open();}else{setNotice('Download requested. Check your browser downloads.');}}}>Download PDF</a>
   <button type="button" style={controlStyle} disabled={!pdf} onClick={open}>Open in browser</button>
   <button type="button" style={controlStyle} onClick={closeReportPreviews}>Close report</button>
  </div>
  {!!notice&&<p role="status" style={{margin:0,padding:'10px 16px',fontSize:13,background:'#e8f4ee'}}>{notice}</p>}
  <iframe key={pdf?.url??'html'} title="Branded inspection report" srcDoc={content} sandbox="allow-same-origin allow-modals" style={{border:0,flex:1,minHeight:0,width:'100%',background:'#f8f9ff'}} />
 </section>;
}
