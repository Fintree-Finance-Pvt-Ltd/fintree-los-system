// src/pages/EntityDocs.jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Stack,
} from '@mui/material';
import api from '../api/axios';
import Perm from '../auth/Perm';
import { PERMS } from '../auth/perms';

function bytesToSize(bytes = 0) {
  if (!bytes || isNaN(bytes)) return '0 KB';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 100 ? 0 : val >= 10 ? 1 : 2)} ${sizes[i]}`;
}

export default function EntityDocs({ config }) {
  const { id } = useParams();
  const { name: entityName, apiBase, uiBase, entityKey, idField } = config;

  const [record, setRecord] = useState(null);
  const [docs, setDocs] = useState([]);
  const [filename, setFilename] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [rec, list] = await Promise.all([
        api.get(`${apiBase}/${id}`),
        api.get(`/docs/${entityKey}/${id}`),
      ]);
      setRecord(rec.data);
      setDocs(list.data || []);
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to load record/documents');
    }
  };

  useEffect(() => {
    load(); // eslint-disable-next-line
  }, [id]);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      if (filename) fd.append('filename', filename);
      fd.append('file', file);
      await api.post(`/docs/${entityKey}/${id}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFilename('');
      setFile(null);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  // ---- Header fields (smart mapping across modules) ----
  const displayCode = record?.[idField] ?? '';
  const displayName =
    record?.customer_name ??
    record?.applicant_name ??
    record?.name ??
    record?.dealer_name ??
    '';
  const displayPhone = record?.mobile_number ?? record?.phone ?? '';
  const displayEmail = record?.email ?? '';

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Button component={Link} to={uiBase} variant="text">
        ← Back
      </Button>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {entityName} Documents
        </Typography>

        {record && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,minmax(0,1fr))' },
              gap: 2,
              mb: 2,
            }}
          >
            <TextField
              label="Code"
              value={displayCode}
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Name"
              value={displayName}
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Phone"
              value={displayPhone}
              InputProps={{ readOnly: true }}
            />
            {displayEmail ? (
              <TextField
                label="Email"
                value={displayEmail}
                InputProps={{ readOnly: true }}
              />
            ) : null}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Upload toolbar (permission-gated) */}
        <Perm need={PERMS.DOCS_WRITE}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <TextField
              size="small"
              label="Filename (optional)"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              sx={{ minWidth: 220 }}
            />
            <Button component="label" variant="outlined">
              Choose File
              <input
                type="file"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </Button>
            <Button
              variant="contained"
              onClick={upload}
              disabled={busy || !file}
            >
              {busy ? 'Uploading...' : 'Upload'}
            </Button>
          </Stack>
        </Perm>

        <Typography variant="subtitle1" sx={{ mt: 1, mb: 1.5 }}>
          Files
        </Typography>

        {docs.length === 0 ? (
          <Typography color="text.secondary">No documents yet.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 1 }}>
            {docs.map((doc) => (
              <Paper
                key={doc.id}
                sx={{
                  p: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap title={doc.filename}>
                    {doc.filename}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {doc.mime || 'file'} • {bytesToSize(doc.size)}{' '}
                    {doc.created_at ? `• ${new Date(doc.created_at).toLocaleString()}` : ''}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    download
                  >
                    Download
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
