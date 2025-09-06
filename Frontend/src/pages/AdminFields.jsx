import { useEffect, useMemo, useState } from 'react';
import { Box, Paper, TextField, MenuItem, Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import api from '../api/axios';
import Perm from '../auth/Perm';
import { PERMS } from '../auth/perms';

const ENTITIES = [
  { key:'dealer',               label:'Dealer' },
  { key:'financial_institute',  label:'Financial Institute' },
  { key:'landlord',             label:'Landlord' },
];

const TYPES = ['text','number','date','checkbox','select'];

export default function AdminFields() {
  const [entity, setEntity] = useState('dealer');
  const [rows, setRows] = useState([]);
  const [dirty, setDirty] = useState(new Map()); // id -> partial changes
  const [creating, setCreating] = useState(false);
  const [newRow, setNewRow] = useState({
    entity: 'dealer', code:'', label:'', input_type:'text',
    required:false, is_active:true, options:'', sort_order:0
  });

  // Load defs for selected entity
  const load = async () => {
    const { data } = await api.get('/fields', { params: { entity } });
    // normalize options to string for editing
    const withOptions = (data || []).map(r => ({
      ...r,
      options: Array.isArray(r.options) ? r.options.join(',') : (r.options || '')
    }));
    setRows(withOptions);
    setDirty(new Map());
  };
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [entity]);

  const columns = useMemo(() => ([
    { field:'id', headerName:'ID', width:70 },
    { field:'code', headerName:'Code', width:160, editable:true },
    { field:'label', headerName:'Label', flex:1, minWidth:200, editable:true },
    { field:'input_type', headerName:'Type', width:140, editable:true,
      type:'singleSelect', valueOptions:TYPES },
    { field:'required', headerName:'Req', width:70, type:'boolean', editable:true },
    { field:'is_active', headerName:'Active', width:80, type:'boolean', editable:true },
    { field:'options', headerName:'Options (comma for select)', flex:1, minWidth:240, editable:true },
    { field:'sort_order', headerName:'Sort', width:80, editable:true, type:'number' },
  ]),[]);

  const onProcessRowUpdate = (updated, original) => {
    const diff = {};
    for (const k of ['code','label','input_type','required','is_active','options','sort_order']) {
      if (updated[k] !== original[k]) diff[k] = updated[k];
    }
    if (Object.keys(diff).length) {
      const d = new Map(dirty);
      d.set(updated.id, diff);
      setDirty(d);
    }
    return updated;
  };

  const saveAll = async () => {
    const updates = Array.from(dirty.entries());
    for (const [id, patch] of updates) {
      const body = { ...patch };
      if (body.options !== undefined) {
        body.options = String(body.options || '');
      }
      await api.put(`/fields/admin/${id}`, body);
    }
    await load();
  };

  const create = async () => {
    const body = {
      ...newRow,
      entity,
      options: String(newRow.options || '')
    };
    await api.post('/fields/admin', body);
    setCreating(false);
    setNewRow({ entity, code:'', label:'', input_type:'text', required:false, is_active:true, options:'', sort_order:0 });
    await load();
  };

  return (
    <Box>
      <Paper sx={{ p:2, mb:2, display:'flex', gap:2, alignItems:'center' }}>
        <TextField select size="small" label="Entity" value={entity} onChange={e=>setEntity(e.target.value)} sx={{ width: 280 }}>
          {ENTITIES.map(e => <MenuItem key={e.key} value={e.key}>{e.label}</MenuItem>)}
        </TextField>
        <Perm need={PERMS.FIELDS_WRITE}>
          <Button variant="contained" onClick={()=>setCreating(v=>!v)}>
            {creating ? 'Cancel New' : 'New Field'}
          </Button>
          <Button variant="outlined" onClick={saveAll} disabled={dirty.size===0}>
            Save Changes ({dirty.size})
          </Button>
        </Perm>
      </Paper>

      {creating && (
        <Paper sx={{ p:2, mb:2, display:'grid', gridTemplateColumns:'repeat(6,minmax(0,1fr))', gap:2 }}>
          <TextField label="Code" value={newRow.code} onChange={e=>setNewRow({...newRow, code:e.target.value})}/>
          <TextField label="Label" value={newRow.label} onChange={e=>setNewRow({...newRow, label:e.target.value})}/>
          <TextField select label="Type" value={newRow.input_type} onChange={e=>setNewRow({...newRow, input_type:e.target.value})}>
            {TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField label="Options (for select)" value={newRow.options} onChange={e=>setNewRow({...newRow, options:e.target.value})}/>
          <TextField label="Sort" type="number" value={newRow.sort_order} onChange={e=>setNewRow({...newRow, sort_order:Number(e.target.value||0)})}/>
          <Box sx={{ display:'flex', gap:1, alignItems:'center' }}>
            <Button variant="contained" onClick={create}>Create</Button>
          </Box>
        </Paper>
      )}

      <div style={{ height: 520, width:'100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r)=>r.id}
          processRowUpdate={onProcessRowUpdate}
          experimentalFeatures={{ newEditingApi: true }}
        />
      </div>
    </Box>
  );
}
