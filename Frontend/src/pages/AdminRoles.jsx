import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Checkbox,
  FormControlLabel,
  TextField,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api/axios';

const roleSchema = z.object({
  roleCode: z.string().trim().min(1, 'Role code is required').max(191),
  roleName: z.string().trim().max(191).optional(),
  is_active: z.boolean().default(true),
});

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [roleCode, setRoleCode] = useState('');
  const [checked, setChecked] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: { roleCode: '', roleName: '', is_active: true },
  });

  async function load() {
    try {
      setLoading(true);
      const [r, p] = await Promise.all([
        api.get('/admin/roles'),
        api.get('/admin/permissions'),
      ]);
      setRoles(Array.isArray(r.data) ? r.data : []);
      setPerms(Array.isArray(p.data) ? p.data : []);
    } catch (e) {
      console.error('Failed to load roles/permissions', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openRole(code) {
    try {
      setRoleCode(code);
      const { data } = await api.get(`/admin/roles/${code}/permissions`);
      const codes = Array.isArray(data)
        ? data.map((x) => (typeof x === 'string' ? x : x && x.code)).filter(Boolean)
        : [];
      setChecked(codes);
      setOpen(true);
    } catch (e) {
      console.error('Failed to load role permissions', e);
    }
  }

  function toggle(code, on) {
    setChecked((prev) =>
      on ? [...new Set([...prev, code])] : prev.filter((x) => x !== code)
    );
  }

  async function save() {
    try {
      setSavingPerms(true);
      await api.put(`/admin/roles/${roleCode}/permissions`, { perms: checked });
      setOpen(false);
      await load();
    } catch (e) {
      console.error('Failed to save permissions', e);
    } finally {
      setSavingPerms(false);
    }
  }

  function addrole() {
    setAddOpen(true);
    reset({ roleCode: '', roleName: '', is_active: true });
  }

  async function onAddRole(values) {
    try {
      await api.post('/admin/roles/create', values);
      setAddOpen(false);
      await load();
    } catch (e) {
      console.error('Failed to create role', e);
    }
  }

  const columns = [
    { field: 'code', headerName: 'Code', width: 160 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 220 },
    {
      field: 'actions',
      headerName: '',
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Button size="small" variant="outlined" onClick={() => openRole(p.row.code)}>
          Edit perms
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', mb: 2 }}>
        <Button variant="contained" onClick={addrole}>
          Add New Role
        </Button>
      </Box>

      <div style={{ height: 560, width: '100%' }}>
        <DataGrid
          rows={roles}
          columns={columns}
          getRowId={(r) => r.code}
          disableRowSelectionOnClick
          loading={loading}
        />
      </div>

      {/* Add Role Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Role</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Role Code"
            sx={{ mt: 1 }}
            {...register('roleCode')}
            error={!!errors.roleCode}
            helperText={errors.roleCode?.message}
          />
          <TextField
            fullWidth
            label="Role Name"
            sx={{ mt: 1 }}
            {...register('roleName')}
            error={!!errors.roleName}
            helperText={errors.roleName?.message}
          />
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Checkbox {...field} checked={!!field.value} />}
                label="Active"
                sx={{ mt: 1 }}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onAddRole)} disabled={isSubmitting}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit permissions — {roleCode}</DialogTitle>
        <DialogContent>
          <Stack sx={{ mt: 1 }} spacing={0.5}>
            {perms.map((p) => (
              <FormControlLabel
                key={p.code}
                control={
                  <Checkbox
                    checked={checked.includes(p.code)}
                    onChange={(e) => toggle(p.code, e.target.checked)}
                  />
                }
                label={`${p.code}${p.description ? ' — ' + p.description : ''}`}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={savingPerms}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
