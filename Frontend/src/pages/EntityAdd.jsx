import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Tab,
  Tabs,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Alert,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DataGrid } from "@mui/x-data-grid";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";




const normKey = (s = "") =>
  String(s)
    .replace(/\u00a0/g, " ")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_");
const normalizeBoolean = (v) => {
  if (v === true || v === false) return v;
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!s) return true;
  return ["1", "true", "yes", "y", "active"].includes(s);
};

export default function EntityAdd({ config }) {
  const { apiBase, entityKey, name: entityName, formFields } = config;

  const [tab, setTab] = useState(0); // 0=form, 1=excel
  const [defs, setDefs] = useState([]); // dynamic field definitions
  const [custom, setCustom] = useState({}); // values for dynamic fields
  const [gstState, setGstState] = useState({ status: 'idle', msg: '' });
  const navigate = useNavigate();

  // Load active custom fields for this entity
  useEffect(() => {
    api
      .get("/fields", { params: { entity: entityKey } })
      .then((r) => setDefs((r.data || []).filter((d) => d.is_active)))
      .catch(() => setDefs([]));
  }, [entityKey]);


  async function verifyGST(gstin, setValue) {
  if (!gstin || String(gstin).trim().length < 15) {
    setGstState({ status: 'error', msg: 'Enter full 15-char GSTIN' });
    return;
  }
  setGstState({ status: 'loading', msg: 'Verifying…' });
  try {
    const { data } = await api.get('/gst/verify', { params: { gstin } });
    // Prefill known fields when present
    if (data.legalName) {
      // map to your current entity fields
      // For dealer entity you have dealer_name / name_as_per_invoice / dealer_address
      setValue('dealer_name', data.tradeName || data.legalName);
      setValue('name_as_per_invoice', data.legalName);
    }
    if (data.address) setValue('dealer_address', data.address);
    setGstState({ status: 'ok', msg: data.status ? `GSTIN ${data.status}` : 'Verified' });
  } catch (e) {
    const msg = e?.response?.data?.error || 'Verification failed';
    setGstState({ status: 'error', msg });
  }
}

  // Build Zod schema from formFields
  const zShape = {};
  formFields.forEach((f) => {
    let zf;
    if (f.type === "email")
      zf = z
        .string()
        .email("Invalid email")
        .max(191)
        .optional()
        .or(z.literal(""))
        .transform((v) => v || null);
    else if (f.type === "checkbox")
      zf = z
        .boolean()
        .optional()
        .default(Boolean(f.defaultValue ?? true));
    else
      zf = z
        .string()
        .max(191)
        .optional()
        .or(z.literal(""))
        .transform((v) => (f.required ? v : v || null));
    if (f.required && f.type !== "checkbox")
      zf = z.string().min(1, `${f.label} is required`).max(191);
    zShape[f.name] = zf;
  });
  const schema = z.object(zShape);

  const defaults = formFields.reduce((acc, f) => {
    acc[f.name] = f.type === "checkbox" ? f.defaultValue ?? true : "";
    return acc;
  }, {});

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    getValues,
    setValue,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const setValueFor = (code, val) =>
    setCustom((prev) => ({ ...prev, [code]: val }));
  const parseOptions = (opts) =>
    Array.isArray(opts)
      ? opts
      : typeof opts === "string"
      ? opts
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const onSubmit = async (values) => {
    await api.post(apiBase, { ...values, custom });
    reset();
    setCustom({});
    alert(`${entityName} created`);
    navigate(config.uiBase);
  };

  // ===== Excel import =====
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  // Build DataGrid columns from formFields
  const excelColumns = useMemo(
    () =>
      formFields.map((f) => ({
        field: f.name,
        headerName: f.label,
        flex: 1,
        minWidth: f.type === "checkbox" ? 120 : 180,
        valueGetter: (p) =>
          f.type === "checkbox"
            ? p?.row?.[f.name]
              ? "Yes"
              : "No"
            : p?.row?.[f.name],
      })),
    [formFields]
  );

  const aliasMap = useMemo(() => {
    const m = new Map();
    formFields.forEach((f) => {
      (f.excelAliases || []).forEach((a) => m.set(normKey(a), f.name));
      m.set(normKey(f.label), f.name);
      m.set(normKey(f.name), f.name);
    });
    return m;
  }, [formFields]);

  const coerce = (field, value) => {
    if (value == null) return field.type === "checkbox" ? true : "";
    if (field.type === "checkbox") return normalizeBoolean(value);
    return String(value).trim();
  };

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" }); // array of objects
      const mapped = raw
        .map((orig) => {
          // normalize header keys of this row
          const row = {};
          Object.keys(orig).forEach((k) => (row[normKey(k)] = orig[k]));
          // build one item with all configured fields
          const item = {};
          formFields.forEach((f) => {
            // find by aliases
            let v = "";
            for (const [k, name] of aliasMap) {
              if (
                name === f.name &&
                row.hasOwnProperty(k) &&
                String(row[k]).trim() !== ""
              ) {
                v = row[k];
                break;
              }
            }
            item[f.name] = coerce(f, v);
          });
          return item;
        })
        .filter((r) => {
          // keep rows that satisfy all required fields
          return formFields.every(
            (f) => !f.required || String(r[f.name] || "").trim() !== ""
          );
        });

      setPreview(mapped);
    };
    reader.readAsArrayBuffer(file);
  }

  async function uploadAll() {
    if (preview.length === 0) return;
    setUploading(true);
    try {
      const { data } = await api.post(`${apiBase}/bulk`, { items: preview });
      setResult(data);
      if (data.failed === 0) {
        alert(`Inserted ${data.inserted} ${entityName.toLowerCase()}(s)`);
        navigate(config.uiBase);
      }
    } catch (e) {
      alert(e?.response?.data?.error || "Bulk upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Add ${entityName}`} />
        <Tab label="Import from Excel" />
      </Tabs>

      {/* ===== Form Tab ===== */}
      {tab === 0 && (
        <Paper sx={{ p: 2, maxWidth: 640 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
{formFields.map(f => (
  <div key={f.name} style={{ marginBottom: 12 }}>
    {f.type === 'checkbox' ? (
      <FormControlLabel control={<Checkbox defaultChecked {...register(f.name)} />} label={f.label} />
    ) : (
      <TextField
        fullWidth
        label={f.label}
        type={f.type === 'email' ? 'email' : 'text'}
        {...register(f.name)}
        error={!!errors[f.name]}
        helperText={errors[f.name]?.message}
        InputProps={f.name === 'gst_no' ? {
          endAdornment: (
            <Button
              size="small"
              onClick={() => verifyGST(getValues('gst_no'), setValue)}
              disabled={gstState.status === 'loading'}
            >
              {gstState.status === 'loading' ? '...' : 'Verify'}
            </Button>
          )
        } : undefined}
      />
    )}

    {f.name === 'gst_no' && gstState.status !== 'idle' && (
      <Typography variant="caption" color={
        gstState.status === 'ok' ? 'success.main' :
        gstState.status === 'error' ? 'error' : 'text.secondary'
      }>
        {gstState.msg}
      </Typography>
    )}
  </div>
))}


            {/* Dynamic custom fields (from Admin > Fields) */}
            {defs.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                  Additional fields
                </Typography>
                {defs.map((f) => (
                  <div key={f.id} style={{ marginBottom: 12 }}>
                    {f.input_type === "text" && (
                      <TextField
                        fullWidth
                        label={f.label}
                        required={!!f.required}
                        onChange={(e) => setValueFor(f.code, e.target.value)}
                      />
                    )}
                    {f.input_type === "number" && (
                      <TextField
                        fullWidth
                        type="number"
                        label={f.label}
                        required={!!f.required}
                        onChange={(e) =>
                          setValueFor(f.code, Number(e.target.value))
                        }
                      />
                    )}
                    {f.input_type === "date" && (
                      <TextField
                        fullWidth
                        type="date"
                        label={f.label}
                        required={!!f.required}
                        InputLabelProps={{ shrink: true }}
                        onChange={(e) => setValueFor(f.code, e.target.value)}
                      />
                    )}
                    {f.input_type === "checkbox" && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            onChange={(e) =>
                              setValueFor(f.code, e.target.checked)
                            }
                          />
                        }
                        label={f.label}
                      />
                    )}
                    {f.input_type === "select" && (
                      <TextField
                        fullWidth
                        select
                        label={f.label}
                        required={!!f.required}
                        onChange={(e) => setValueFor(f.code, e.target.value)}
                      >
                        {(Array.isArray(f.options)
                          ? f.options
                          : String(f.options || "").split(",")
                        )
                          .filter(Boolean)
                          .map((opt) => (
                            <MenuItem key={opt} value={opt}>
                              {opt}
                            </MenuItem>
                          ))}
                      </TextField>
                    )}
                  </div>
                ))}
              </>
            )}

            <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                Save
              </Button>
              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  reset();
                  setCustom({});
                }}
              >
                Clear
              </Button>
            </Box>
          </form>
        </Paper>
      )}

      {/* ===== Excel Tab ===== */}
      {tab === 1 && (
        <Box>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography sx={{ mb: 1 }}>
              Upload an Excel (.xlsx) file.
            </Typography>
            <Button component="label" variant="outlined">
              Choose File
              <input
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={handleFile}
              />
            </Button>
          </Paper>

          {preview.length > 0 && (
            <>
              <div style={{ height: 420, width: "100%" }}>
                <DataGrid
                  rows={preview.map((r, i) => ({ id: i, ...r }))}
                  columns={excelColumns}
                  disableRowSelectionOnClick
                />
              </div>
              <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={uploadAll}
                  disabled={uploading}
                >
                  {uploading
                    ? "Uploading..."
                    : `Upload ${preview.length} ${entityName.toLowerCase()}(s)`}
                </Button>
                <Button variant="outlined" onClick={() => setPreview([])}>
                  Clear
                </Button>
              </Box>
            </>
          )}

          {result && (
            <Box sx={{ mt: 2 }}>
              {result.failed > 0 ? (
                <Alert severity="warning">
                  Inserted {result.inserted}, Failed {result.failed}. See errors
                  below.
                </Alert>
              ) : (
                <Alert severity="success">
                  Inserted {result.inserted} successfully.
                </Alert>
              )}
              {result.errors?.length > 0 && (
                <pre
                  style={{
                    background: "#111",
                    color: "#ddd",
                    padding: 12,
                    borderRadius: 8,
                    marginTop: 8,
                  }}
                >
                  {JSON.stringify(result.errors, null, 2)}
                </pre>
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
