import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Checkbox, FormControlLabel } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import api from '../api/axios';

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [open, setOpen] = useState(false);
  const [roleCode, setRoleCode] = useState('');
  const [checked, setChecked] = useState([]);

  async function load() {
    const [r, p] = await Promise.all([api.get('/admin/roles'), api.get('/admin/permissions')]);
    setRoles(r.data);
    setPerms(p.data);
  }
  useEffect(()=>{ load(); },[]);

  async function openRole(code) {
    setRoleCode(code);
    const { data } = await api.get(`/admin/roles/${code}/permissions`);
    setChecked(data);
    setOpen(true);
  }

  function toggle(code, on) {
    setChecked(prev => on ? [...new Set([...prev, code])] : prev.filter(x=>x!==code));
  }

  async function save() {
    await api.put(`/admin/roles/${roleCode}/permissions`, { perms: checked });
    setOpen(false);
    await load();
  }

  const columns = [
    { field: 'code', headerName: 'Code', width: 160 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 220 },
    {
      field: 'actions', headerName: '', width: 140, sortable:false, filterable:false,
      renderCell: (p) => <Button size="small" variant="outlined" onClick={()=>openRole(p.row.code)}>Edit perms</Button>
    }
  ];

  return (
    <Box>
      <div style={{ height: 560, width: '100%' }}>
        <DataGrid rows={roles} columns={columns} getRowId={(r)=>r.code} disableRowSelectionOnClick />
      </div>

      <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit permissions — {roleCode}</DialogTitle>
        <DialogContent>
          <Stack sx={{ mt:1 }} spacing={0.5}>
            {perms.map(p => (
              <FormControlLabel
                key={p.code}
                control={
                  <Checkbox
                    checked={checked.includes(p.code)}
                    onChange={(e)=>toggle(p.code, e.target.checked)}
                  />
                }
                label={`${p.code}${p.description ? ' — ' + p.description : ''}`}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
