import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, Divider } from '@mui/material';
import api from '../api/axios';

export default function EntityDocs({ config }) {
  const { id } = useParams();
  const { name: entityName, apiBase, uiBase, entityKey, idField } = config;
  const [record,setRecord] = useState(null);
  const [docs,setDocs] = useState([]);
  const [filename,setFilename] = useState('');
  const [file,setFile] = useState(null);
  const [busy,setBusy] = useState(false);

  const load = async ()=>{
    const [rec, list] = await Promise.all([
      api.get(`${apiBase}/${id}`),
      api.get(`/docs/${entityKey}/${id}`)
    ]);
    setRecord(rec.data);
    setDocs(list.data||[]);
  };
  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[id]);

  const upload = async ()=>{
    if (!file) return;
    setBusy(true);
    try{
      const fd = new FormData();
      if (filename) fd.append('filename', filename);
      fd.append('file', file);
      await api.post(`/docs/${entityKey}/${id}/upload`, fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      setFilename(''); setFile(null);
      await load();
    } finally { setBusy(false); }
  };

  return (
    <Box sx={{ display:'grid', gap:2 }}>
      <Button component={Link} to={uiBase} variant="text">← Back</Button>
      <Paper sx={{ p:2 }}>
        <Typography variant="h6">{entityName} Documents</Typography>
        {record && (
          <Box sx={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:2, mb:2 }}>
            <TextField label="Code" value={record[idField] || ''} InputProps={{ readOnly:true }}/>
            <TextField label="Name" value={record.name || record.dealer_name || ''} InputProps={{ readOnly:true }}/>
            <TextField label="Email" value={record.email || ''} InputProps={{ readOnly:true }}/>
          </Box>
        )}
        <Divider sx={{ my:2 }}/>
        <Box sx={{ display:'flex', gap:1, alignItems:'center', flexWrap:'wrap' }}>
          <TextField size="small" label="Filename (optional)" value={filename} onChange={(e)=>setFilename(e.target.value)} />
          <Button component="label" variant="outlined">Choose File<input type="file" hidden onChange={(e)=>setFile(e.target.files?.[0]||null)} /></Button>
          <Button variant="contained" onClick={upload} disabled={busy || !file}>{busy ? 'Uploading...' : 'Upload'}</Button>
        </Box>
        <Typography variant="subtitle1" sx={{ mt:3, mb:1 }}>Files</Typography>
        {docs.length === 0 ? <Typography color="text.secondary">No documents yet.</Typography> : (
          <Box sx={{ display:'grid', gap:1 }}>
            {docs.map(doc=>(
              <Paper key={doc.id} sx={{ p:1.5, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <Box>
                  <Typography>{doc.filename}</Typography>
                  <Typography variant="caption" color="text.secondary">{doc.mime} • {(doc.size/1024).toFixed(1)} KB</Typography>
                </Box>
                <Button size="small" variant="outlined" href={doc.url} target="_blank" rel="noreferrer" download>Download</Button>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
