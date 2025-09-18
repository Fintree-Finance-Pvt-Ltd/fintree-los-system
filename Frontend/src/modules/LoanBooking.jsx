import { useMemo, useRef, useState } from "react";
import {
  Box, Paper, Tabs, Tab, TextField,
  Button, Checkbox, FormControlLabel, Typography, Alert
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import * as XLSX from "xlsx";
import { useParams } from "react-router-dom";
import api from "../api/axios";

// -------------------- FIELD MAPS (same as you posted) --------------------
const formFieldsByModule = {
  "product:ev": [
    { name: "login_date", label: "LOGIN DATE", type: "text", excelAliases: ["LOGIN DATE","Login Date"] },
    { name: "customer_name", label: "Customer Name", type: "text", required: true, excelAliases: ["Customer Name","Name"] },
    { name: "borrower_dob", label: "Borrower DOB", type: "text", excelAliases: ["Borrower DOB","DOB"] },
    { name: "father_name", label: "Father Name", type: "text", excelAliases: ["Father Name"] },
    { name: "address_line1", label: "Address Line 1", type: "text", excelAliases: ["Address Line 1"] },
    { name: "address_line2", label: "Address Line 2", type: "text", excelAliases: ["Address Line 2"] },
    { name: "village", label: "Village", type: "text", excelAliases: ["Village"] },
    { name: "district", label: "District", type: "text", excelAliases: ["District"] },
    { name: "state", label: "State", type: "text", excelAliases: ["State"] },
    { name: "pincode", label: "Pincode", type: "text", excelAliases: ["Pincode","PIN"] },
    { name: "mobile_number", label: "Mobile Number", type: "text", excelAliases: ["Mobile Number","Phone","Mobile"] },

    { name: "loan_amount", label: "Loan Amount", type: "text", excelAliases: ["Loan Amount","Amount"] },
    { name: "interest_rate", label: "Interest Rate", type: "text", excelAliases: ["Interest Rate","ROI"] },
    { name: "tenure_months", label: "Tenure", type: "text", excelAliases: ["Tenure"] },

    { name: "guarantor_name", label: "GURANTOR", type: "text", excelAliases: ["GURANTOR","Guarantor"] },
    { name: "guarantor_dob", label: "GURANTOR DOB", type: "text", excelAliases: ["GURANTOR DOB","Guarantor DOB"] },
    { name: "guarantor_aadhar", label: "GURANTOR ADHAR", type: "text", excelAliases: ["GURANTOR ADHAR","Guarantor Aadhar","Guarantor Aadhaar"] },
    { name: "guarantor_pan", label: "GURANTOR PAN", type: "text", excelAliases: ["GURANTOR PAN","Guarantor PAN"] },

    { name: "dealer_name", label: "DEALER NAME", type: "text", excelAliases: ["DEALER NAME","Dealer Name"] },
    { name: "name_in_bank", label: "Name in Bank", type: "text", excelAliases: ["Name in Bank","Account Name"] },
    { name: "bank_name", label: "Bank name", type: "text", excelAliases: ["Bank name","Bank Name"] },
    { name: "account_number", label: "Account Number", type: "text", excelAliases: ["Account Number","A/c Number","AC Number"] },
    { name: "ifsc", label: "IFSC", type: "text", excelAliases: ["IFSC","IFSC Code"] },

    { name: "borrower_aadhar", label: "Aadhar Number", type: "text", excelAliases: ["Aadhar Number","Aadhaar Number"] },
    { name: "borrower_pan", label: "Pan Card", type: "text", excelAliases: ["Pan Card","PAN"] }, // ← will show Verify

    { name: "product_name", label: "Product", type: "text", excelAliases: ["Product"] },
    { name: "lender_name", label: "lender", type: "text", excelAliases: ["lender","Lender"] },

    { name: "agreement_date", label: "Agreement Date", type: "text", excelAliases: ["Agreement Date"] },
    { name: "cibil_score", label: "CIBIL Score", type: "text", excelAliases: ["CIBIL Score"] },
    { name: "guarantor_cibil_score", label: "GURANTOR CIBIL Score", type: "text", excelAliases: ["GURANTOR CIBIL Score","Guarantor CIBIL Score"] },
    { name: "relationship_with_borrower", label: "Relationship with Borrower", type: "text", excelAliases: ["Relationship with Borrower","Relationship"] },

    { name: "coapplicant_name", label: "Co-Applicant", type: "text", excelAliases: ["Co-Applicant","Co Applicant"] },
    { name: "coapplicant_dob", label: "Co-Applicant DOB", type: "text", excelAliases: ["Co-Applicant DOB"] },
    { name: "coapplicant_aadhar", label: "Co-Applicant AADHAR", type: "text", excelAliases: ["Co-Applicant AADHAR","Co-Applicant Aadhaar"] },
    { name: "coapplicant_pan", label: "Co-Applicant PAN", type: "text", excelAliases: ["Co-Applicant PAN"] },
    { name: "coapplicant_cibil_score", label: "Co-Applicant CIBIL Score", type: "text", excelAliases: ["Co-Applicant CIBIL Score"] },

    { name: "apr", label: "APR", type: "text", excelAliases: ["APR"] },
    { name: "is_active", label: "Active", type: "checkbox", defaultValue: true, excelAliases: ["IsActive","Active"] },
  ],

  "product:mobile-loan": [
    { name: "applicant_name", label: "Applicant Name", type: "text", required: true, excelAliases: ["Applicant","Name"] },
    { name: "phone",          label: "Phone",         type: "text", excelAliases: ["Phone","Mobile"] },
    { name: "device_brand",   label: "Device Brand",  type: "text", excelAliases: ["Brand"] },
    { name: "amount",         label: "Loan Amount",   type: "text", excelAliases: ["Amount"] },
    { name: "is_active",      label: "Active",        type: "checkbox", defaultValue: true, excelAliases: ["Active"] },
  ],

  "product:education-loan": [
    { name: "applicant_name", label: "Applicant Name", type: "text", required: true, excelAliases: ["Applicant","Name"] },
    { name: "phone",          label: "Phone",         type: "text", excelAliases: ["Phone","Mobile"] },
    { name: "course",         label: "Course",        type: "text", excelAliases: ["Course"] },
    { name: "amount",         label: "Loan Amount",   type: "text", excelAliases: ["Amount"] },
    { name: "is_active",      label: "Active",        type: "checkbox", defaultValue: true, excelAliases: ["Active"] },
  ],

  "lender:ev": [
    { name: "applicant_name", label: "Applicant Name", type: "text", required: true, excelAliases: ["Applicant","Name"] },
    { name: "phone",          label: "Phone",         type: "text", excelAliases: ["Phone","Mobile"] },
    { name: "amount",         label: "Loan Amount",   type: "text", excelAliases: ["Amount"] },
    { name: "is_active",      label: "Active",        type: "checkbox", defaultValue: true, excelAliases: ["Active"] },
  ],
  "lender:adikosh": [
    { name: "applicant_name", label: "Applicant Name", type: "text", required: true, excelAliases: ["Applicant","Name"] },
    { name: "phone",          label: "Phone",         type: "text", excelAliases: ["Phone","Mobile"] },
    { name: "bureau_score",   label: "Bureau Score",  type: "text", excelAliases: ["Score","Bureau"] },
    { name: "is_active",      label: "Active",        type: "checkbox", defaultValue: true, excelAliases: ["Active"] },
  ],
  "lender:gq-fsf": [
    { name: "applicant_name", label: "Applicant Name", type: "text", required: true },
    { name: "phone",          label: "Phone",         type: "text" },
    { name: "is_active",      label: "Active",        type: "checkbox", defaultValue: true },
  ],
  "lender:gq-nonfsf": [
    { name: "applicant_name", label: "Applicant Name", type: "text", required: true },
    { name: "phone",          label: "Phone",         type: "text" },
    { name: "is_active",      label: "Active",        type: "checkbox", defaultValue: true },
  ],
  "lender:bl": [
    { name: "applicant_name", label: "Applicant Name", type: "text" },
    { name: "phone",          label: "Phone",         type: "text" },
    { name: "business_name",  label: "Business Name", type: "text" },
    { name: "is_active",      label: "Active",        type: "checkbox", defaultValue: true },
  ],
};

const normKey = (s = "") =>
  String(s).replace(/\u00a0/g, " ").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_");

const normalizeBoolean = (v) => {
  if (v === true || v === false) return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return true;
  return ["1", "true", "yes", "y", "active"].includes(s);
};

export default function LoanBooking() {
  const { module } = useParams();
  const section = window.location.pathname.startsWith("/product") ? "product" : "lender";
  const moduleKey = `${section}:${module}`;
  const formFields = formFieldsByModule[moduleKey] || [];

  // PAN verify is only for EV product form
  const needsPanCheck = moduleKey === "product:ev";
  const PAN_FIELD = "borrower_pan";
  const PAN_NAME_FIELD = "customer_name";

  // PAN verify UI state
  const [panState, setPanState] = useState({ status: "idle", msg: "" });

  // ---------- Tabs ----------
  const [tab, setTab] = useState(0);

  // ---------- Form ----------
  const zShape = {};
  formFields.forEach((f) => {
    let zf;
    if (f.type === "checkbox") zf = z.boolean().optional().default(Boolean(f.defaultValue ?? true));
    else zf = z.string().optional().or(z.literal("")).transform(v => (f.required ? v : v || null));
    if (f.required && f.type !== "checkbox") zf = z.string().min(1, `${f.label} is required`).max(191);
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

  // ---- PAN verify (button beside PAN)
  const verifyPAN = async () => {
    if (!needsPanCheck) return;
    const pan = (getValues(PAN_FIELD) || "").toString().trim().toUpperCase();
    const name = (getValues(PAN_NAME_FIELD) || "").toString().trim();

    if (!pan || pan.length < 10) {
      setPanState({ status: "error", msg: "Enter a valid PAN" });
      return;
    }

    setPanState({ status: "loading", msg: "Verifying…" });
    try {
      const { data } = await api.get("/pan/verify", { params: { pan, name } });
      // optional: prefill name if provider returns it
      if (data?.holder_name && !name) {
        setValue(PAN_NAME_FIELD, data.holder_name);
      }
      setPanState({ status: "ok", msg: "PAN verified" });
    } catch (e) {
      const info = e?.response?.data?.info;
      const msg =
        (typeof info === "string" && info) ||
        info?.message ||
        info?.error ||
        e?.response?.data?.error ||
        "PAN verification failed";
      setPanState({ status: "error", msg });
    }
  };

  const onSubmit = async (values) => {
    // If PAN present on EV form, require a successful verify first
    if (needsPanCheck && values[PAN_FIELD]) {
      if (panState.status !== "ok") {
        alert("Please verify PAN before saving.");
        return;
      }
    }

    await api.post("/loans/booking", { module: moduleKey, ...values });
    reset();
    setPanState({ status: "idle", msg: "" });
    alert("Loan created");
  };

  // ---------- Excel Import (unchanged) ----------
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const excelColumns = useMemo(
    () => [
      { field: "_issues", headerName: "Issues", width: 250, valueGetter: p => p?.row?._issues || "" },
      ...formFields.map((f) => ({
        field: f.name,
        headerName: f.label,
        flex: 1,
        minWidth: f.type === "checkbox" ? 120 : 180,
        valueGetter: (p) => f.type === "checkbox" ? (p?.row?.[f.name] ? "Yes" : "No") : p?.row?.[f.name],
      })),
    ],
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

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fr = new FileReader();
    fr.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const mapped = raw.map((orig, i) => {
        const row = {};
        Object.keys(orig).forEach((k) => (row[normKey(k)] = orig[k]));

        const item = {};
        formFields.forEach((f) => {
          let v = "";
          for (const [k, name] of aliasMap) {
            if (name === f.name && Object.prototype.hasOwnProperty.call(row, k) && String(row[k]).trim() !== "") {
              v = row[k];
              break;
            }
          }
          item[f.name] = coerce(f, v);
        });

        const missing = formFields
          .filter((f) => f.required)
          .filter((f) => String(item[f.name] ?? "").trim() === "")
          .map((f) => f.label);

        return {
          _rid: `row_${Date.now()}_${i}`,
          _issues: missing.length ? `Missing: ${missing.join(", ")}` : "",
          ...item,
        };
      });

      setPreview(mapped);
      if (fileRef.current) fileRef.current.value = "";
    };
    fr.readAsArrayBuffer(file);
  };

  const uploadAll = async () => {
    if (!preview.length) return;
    setUploading(true);
    try {
      const { data } = await api.post("/loans/booking/bulk", { module: moduleKey, items: preview });
      setResult(data);
      if (data.failed === 0) {
        alert(`Inserted ${data.inserted} applications`);
        setPreview([]);
      }
    } catch (e) {
      alert(e?.response?.data?.error || "Bulk upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Add via Form" />
        <Tab label="Import from Excel" />
      </Tabs>

      {/* ---- Form ---- */}
      {tab === 0 && (
        <Paper sx={{ p: 2, maxWidth: 720 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            {formFields.map((f) => (
              <div key={f.name} style={{ marginBottom: 12 }}>
                {f.type === "checkbox" ? (
                  <FormControlLabel control={<Checkbox defaultChecked {...register(f.name)} />} label={f.label} />
                ) : (
                  <>
                    <TextField
                      fullWidth
                      label={f.label}
                      type={f.type === "email" ? "email" : "text"}
                      {...register(f.name)}
                      error={!!errors[f.name]}
                      helperText={errors[f.name]?.message}
                      // PAN Verify adornment for EV
                      InputProps={
                        needsPanCheck && f.name === PAN_FIELD
                          ? {
                              endAdornment: (
                                <Button
                                  size="small"
                                  onClick={verifyPAN}
                                  disabled={panState.status === "loading"}
                                  sx={{ ml: 1 }}
                                >
                                  {panState.status === "loading" ? "…" : "Verify"}
                                </Button>
                              ),
                            }
                          : undefined
                      }
                    />
                    {needsPanCheck && f.name === PAN_FIELD && panState.status !== "idle" && (
                      <Typography
                        variant="caption"
                        sx={{ display: "block", mt: 0.5 }}
                        color={
                          panState.status === "ok"
                            ? "success.main"
                            : panState.status === "error"
                            ? "error"
                            : "text.secondary"
                        }
                      >
                        {panState.msg}
                      </Typography>
                    )}
                  </>
                )}
              </div>
            ))}

            <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
              <Button type="submit" variant="contained" disabled={isSubmitting}>Save</Button>
              <Button type="button" variant="outlined" onClick={() => { reset(); setPanState({ status: "idle", msg: "" }); }}>Clear</Button>
            </Box>
          </form>
        </Paper>
      )}

      {/* ---- Excel ---- */}
      {tab === 1 && (
        <Box>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography sx={{ mb: 1 }}>
              Upload an Excel (.xlsx) file for <b>{moduleKey}</b>.
            </Typography>
            <Button component="label" variant="outlined">
              Choose File
              <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFile} />
            </Button>
          </Paper>

          {preview.length > 0 && (
            <>
              <div style={{ height: 420, width: "100%" }}>
                <DataGrid
                  key={preview.length}
                  rows={preview}
                  columns={excelColumns}
                  getRowId={(r) => r._rid}
                  disableRowSelectionOnClick
                />
              </div>

              <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                <Button variant="contained" onClick={uploadAll} disabled={uploading}>
                  {uploading ? "Uploading…" : `Upload ${preview.length} rows`}
                </Button>
                <Button variant="outlined" onClick={() => setPreview([])}>Clear</Button>
              </Box>
            </>
          )}

          {result && (
            <Box sx={{ mt: 2 }}>
              {result.failed > 0 ? (
                <Alert severity="warning">
                  Inserted {result.inserted}, Failed {result.failed}. Check errors below.
                </Alert>
              ) : (
                <Alert severity="success">Inserted {result.inserted} successfully.</Alert>
              )}
              {result.errors?.length > 0 && (
                <pre style={{ background: "#111", color: "#ddd", padding: 12, borderRadius: 8, marginTop: 8 }}>
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
