import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Stack, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Perm from '../auth/Perm';
import { PERMS } from '../auth/perms';

function StatusChip({ value }) {
  const v = (value || 'PENDING').toUpperCase();
  const map = { PENDING:{color:'default',label:'Pending'}, APPROVED:{color:'success',label:'Approved'}, REJECTED:{color:'error',label:'Rejected'} }[v] || { color:'default', label:v };
  return <Chip size="small" color={map.color} label={map.label} />;
}

const toObject = (v)=> (v==null ? {} : (typeof v==='object' ? v : (tryParse(v))));
const tryParse = (s)=>{ try { return JSON.parse(s); } catch { return {}; } };

export default function EntityList({ config }) {
  const { apiBase, uiBase, entityKey, idField, perms, listColumns } = config;

  const [rows,setRows] = useState([]);
  const [total,setTotal] = useState(0);
  const [search,setSearch] = useState('');
  const [page,setPage] = useState(0);
  const [pageSize,setPageSize] = useState(20);
  const [defs,setDefs] = useState([]);

  // approve/reject dialog
  const [dlgOpen,setDlgOpen] = useState(false);
  const [dlgRow,setDlgRow] = useState(null);
  const [dlgAction,setDlgAction] = useState('approve');
  const [dlgReason,setDlgReason] = useState('');
  const [busy,setBusy] = useState(false);

  // load dynamic field defs for this entity
  useEffect(()=>{
    api.get('/fields',{ params:{ entity: entityKey } })
      .then(r=> setDefs((r.data||[]).filter(d=>d.is_active)))
      .catch(()=> setDefs([]));
  },[entityKey]);

  const fetchData = useCallback(async ()=>{
    const offset = page * pageSize;
    const { data } = await api.get(apiBase, { params:{ search, limit: pageSize, offset } });
    const rowsWithCustom = (data.rows||[]).map(r => ({ ...r, _custom: toObject(r.custom_data) }));
    setRows(rowsWithCustom);
    setTotal(Number(data.total||0));
  },[apiBase, page, pageSize, search]);

  useEffect(()=>{ fetchData(); },[fetchData]);

  const onSearch = async ()=>{ setPage(0); await fetchData(); };

  // build base columns from config + special renderers
  const baseCols = useMemo(()=>{
    return listColumns.map(col=>{
      if (col.type === 'status') return ({ ...col, renderCell:(p)=> <StatusChip value={p.value}/> });
      if (col.type === 'boolean') return ({ ...col, valueFormatter:(p)=> (p?.value===1||p?.value===true)?'Yes':'No' });
      return col;
    });
  },[listColumns]);

  // dynamic custom columns (from admin/fields)
  const dynCols = useMemo(()=> defs.map(d=>({
    field: `custom_${d.code}`, headerName: d.label, flex:1, minWidth:150, sortable:false, filterable:false,
    renderCell:(params)=>{
      const v = params?.row?._custom?.[d.code];
      if (v === undefined || v === null) return '';
      if (typeof v === 'boolean') return v ? 'Yes':'No';
      return String(v);
    }
  })),[defs]);

  // Actions column: Docs + Approve/Reject
  const openDlg = (row, action)=>{ setDlgRow(row); setDlgAction(action); setDlgReason(''); setDlgOpen(true); };
  const closeDlg = ()=> setDlgOpen(false);
  const submitStatus = async ()=>{
    if (!dlgRow) return;
    setBusy(true);
    try {
      await api.patch(`${apiBase}/${dlgRow.id}/status`, { action: dlgAction, reason: dlgReason || undefined });
      closeDlg(); await fetchData();
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to update status');
    } finally { setBusy(false); }
  };

  const actionCol = useMemo(()=>({
    field:'actions', headerName:'Actions', width: 230, sortable:false, filterable:false,
    renderCell: (p)=>{
      const row = p.row;
      const pending = (row.status || 'PENDING').toUpperCase() === 'PENDING';
      return (
        <Stack direction="row" spacing={1}>
          <Perm need={PERMS.DOCS_READ}>
            <Button size="small" variant="outlined" component={Link} to={`${uiBase}/${row.id}/docs`}>Docs</Button>
          </Perm>
          <Perm need={perms.review}>
            <span>
              <Button size="small" variant="contained" color="success" disabled={!pending} onClick={()=>openDlg(row,'approve')}>Approve</Button>
            </span>
            <span>
              <Button size="small" variant="contained" color="error" disabled={!pending} onClick={()=>openDlg(row,'reject')}>Reject</Button>
            </span>
          </Perm>
        </Stack>
      );
    }
  }),[uiBase, perms.review]);

  const columns = useMemo(()=> [...baseCols, ...dynCols, actionCol], [baseCols, dynCols, actionCol]);

  return (
    <>
      <Box>
        <Box sx={{ display:'flex', gap:1, mb:2 }}>
          <TextField size="small" placeholder="Search" value={search}
            onChange={(e)=>setSearch(e.target.value)}
            onKeyDown={(e)=>{ if (e.key==='Enter') onSearch(); }}
          />
          <Button variant="outlined" onClick={onSearch}>Search</Button>
          <Perm need={perms.write}>
            <Button variant="contained" component={Link} to={`${uiBase}/new`} sx={{ ml:'auto' }}>
              Add {config.name}
            </Button>
          </Perm>
        </Box>

        <div style={{ height: 560, width:'100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(r)=> r.id}
            rowCount={total}
            paginationMode="server"
            pageSizeOptions={[10,20,50,100]}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={({ page: p, pageSize: ps })=>{ setPage(p); setPageSize(ps); }}
            disableRowSelectionOnClick
          />
        </div>
      </Box>

      {/* Approve/Reject dialog */}
      <Dialog open={dlgOpen} onClose={closeDlg}>
        <DialogTitle>{dlgAction === 'approve' ? `Approve ${config.name}?` : `Reject ${config.name}?`}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Reason (optional)" value={dlgReason} onChange={(e)=>setDlgReason(e.target.value)} multiline minRows={2} sx={{ mt:1, width:420, maxWidth:'90vw' }}/>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDlg}>Cancel</Button>
          <Button onClick={submitStatus} variant="contained" disabled={busy} color={dlgAction==='approve'?'success':'error'}>
            {busy? 'Saving...' : (dlgAction==='approve'?'Approve':'Reject')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
