import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, FormControlLabel, Checkbox, Stack, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api/axios';

const userSchema = z.object({
  email: z.string().email('Invalid email').max(191),
  name: z.string().max(191).optional(),
  is_active: z.boolean().optional().default(true),
});

export default function AdminUsers() {
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openRoles, setOpenRoles] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm({ resolver: zodResolver(userSchema), defaultValues: { email:'', name:'', is_active:true } });

  async function load() {
    const [u, r] = await Promise.all([api.get('/admin/users'), api.get('/admin/roles')]);
    setRows(u.data);
    setRoles(r.data);
  }
  useEffect(() => { load(); }, []);

  const columns = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 220 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'is_active', headerName: 'Active', width: 100, valueFormatter: p => (p.value ? 'Yes' : 'No') },
    {
      field: 'roles', headerName: 'Roles', flex: 1, minWidth: 220,
      renderCell: (p) => (p.value ?? []).map(code => <Chip key={code} label={code} size="small" sx={{ mr:0.5 }} />)
    },
    {
      field: 'actions', headerName: '', width: 160, sortable: false, filterable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={() => openEditRoles(p.row)}>Roles</Button>
        </Stack>
      )
    }
  ], []);

  function openAddUser() {
    reset({ email:'', name:'', is_active:true });
    setOpenAdd(true);
  }

  async function onAddUser(values) {
    await api.post('/admin/users', values);
    setOpenAdd(false);
    await load();
  }

  function openEditRoles(row) {
    setCurrentUser(row);
    setSelectedRoles(row.roles || []);
    setOpenRoles(true);
  }

  async function saveRoles() {
    await api.put(`/admin/users/${currentUser.id}/roles`, { roles: selectedRoles });
    setOpenRoles(false);
    await load();
  }

  return (
    <Box>
      <Box sx={{ display:'flex', mb:2 }}>
        <Button variant="contained" onClick={openAddUser}>Add user</Button>
      </Box>

      <div style={{ height: 560, width: '100%' }}>
        <DataGrid rows={rows} columns={columns} getRowId={(r)=>r.id} disableRowSelectionOnClick />
      </div>

      {/* Add user dialog */}
      <Dialog open={openAdd} onClose={()=>setOpenAdd(false)}>
        <DialogTitle>Add user</DialogTitle>
        <DialogContent sx={{ pt:1 }}>
          <TextField fullWidth label="Email" sx={{ mt:1 }} {...register('email')} error={!!errors.email} helperText={errors.email?.message}/>
          <TextField fullWidth label="Name" sx={{ mt:2 }} {...register('name')} error={!!errors.name} helperText={errors.name?.message}/>
          <FormControlLabel control={<Checkbox defaultChecked {...register('is_active')} />} label="Active" sx={{ mt:1 }}/>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpenAdd(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onAddUser)} disabled={isSubmitting}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Assign roles dialog */}
      <Dialog open={openRoles} onClose={()=>setOpenRoles(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Assign roles {currentUser && `— ${currentUser.email}`}</DialogTitle>
        <DialogContent>
          <Stack sx={{ mt:1 }} spacing={1}>
            {roles.map(r => (
              <FormControlLabel
                key={r.code}
                control={
                  <Checkbox
                    checked={selectedRoles.includes(r.code)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelectedRoles(prev => checked ? [...prev, r.code] : prev.filter(x=>x!==r.code));
                    }}
                  />
                }
                label={`${r.code} — ${r.name}`}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpenRoles(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveRoles}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
