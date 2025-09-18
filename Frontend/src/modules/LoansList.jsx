import { useEffect, useMemo, useState } from "react";
import { Box, TextField, Button, Stack, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "../api/axios";
import Perm from "../auth/Perm";
import { PERMS } from "../auth/perms";

// Map URL module → permission segment + entityName for docs
const PROD_KEY = { ev: "EV", "mobile-loan": "MOBILE", "education-loan": "EDU" };
const LEND_KEY = { ev: "EV", adikosh: "ADIKOSH", "gq-fsf": "GQFSF", "gq-nonfsf": "GQNONFSF", bl: "BL" };
const entityNameFor = (section, mod) =>
  section === "product"
    ? (mod === "ev" ? "product_ev" : mod === "mobile-loan" ? "product_mobile" : "product_education")
    : (mod === "ev" ? "lender_ev" :
       mod === "adikosh" ? "lender_adikosh" :
       mod === "gq-fsf" ? "lender_gq_fsf" :
       mod === "gq-nonfsf" ? "lender_gq_nonfsf" : "lender_bl");

const permFor = (section, mod, action /* READ | WRITE | REVIEW */) => {
  const seg = section === "product" ? PROD_KEY[mod] : LEND_KEY[mod];
  if (!seg) return undefined;
  const base = section === "product" ? "PROD" : "LEND";
  return PERMS[`${base}_${seg}_${action}`];
};

function StatusChip({ value }) {
  const v = (value || "LOGIN").toUpperCase();
  const map = {
    LOGIN: { color: "info", label: "Login" },
    APPROVED: { color: "success", label: "Approved" },
    REJECTED: { color: "error", label: "Rejected" },
    PENDING: { color: "default", label: "Pending" }, // legacy, just in case
  }[v] || { color: "default", label: v };
  return <Chip size="small" color={map.color} label={map.label} />;
}

export default function LoansList({ status }) {
  const { module } = useParams();
  const loc = useLocation();
  const section = loc.pathname.startsWith("/product") ? "product" : "lender";
  const moduleKey = `${section}:${module}`;

  // API base for status actions (e.g., /product/ev)
  const apiBase = `/${section}/${module}`;
  // Entity name for docs page
  const entityName = entityNameFor(section, module);
  // Perms
  const reviewPerm = permFor(section, module, "REVIEW");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);

  // Approve/Reject dialog
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgRow, setDlgRow] = useState(null);
  const [dlgAction, setDlgAction] = useState("approve"); // or 'reject'
  const [dlgReason, setDlgReason] = useState("");
  const [busy, setBusy] = useState(false);

  const columns = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 90 },
      { field: "applicant_name", headerName: "Applicant", flex: 1, minWidth: 180 },
      { field: "phone", headerName: "Phone", width: 150 },
      { field: "amount", headerName: "Amount", width: 120 },
      { field: "status", headerName: "Status", width: 120, renderCell: (p) => <StatusChip value={p.value} /> },
      { field: "created_at", headerName: "Created", width: 180 },
      {
        field: "actions",
        headerName: "Actions",
        width: 260,
        sortable: false,
        filterable: false,
        renderCell: (p) => {
          const row = p.row;
          return (
            <Stack direction="row" spacing={1}>
              {/* Docs button → use central Docs page with query params */}
              <Perm need={PERMS.DOCS_READ}>
                <Button
                  size="small"
                  variant="outlined"
                  component={Link}
                  to={`/${section}/${module}/${row.id}/docs`}

                >
                  Docs
                </Button>
              </Perm>

              {/* Approve / Reject (only when not terminal) */}
              <Perm need={reviewPerm}>
                <span>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    disabled={String(row.status).toUpperCase() !== "LOGIN"}
                    onClick={() => {
                      setDlgRow(row);
                      setDlgAction("approve");
                      setDlgReason("");
                      setDlgOpen(true);
                    }}
                  >
                    Approve
                  </Button>
                </span>
                <span>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    disabled={String(row.status).toUpperCase() !== "LOGIN"}
                    onClick={() => {
                      setDlgRow(row);
                      setDlgAction("reject");
                      setDlgReason("");
                      setDlgOpen(true);
                    }}
                  >
                    Reject
                  </Button>
                </span>
              </Perm>
            </Stack>
          );
        },
      },
    ],
    [entityName, reviewPerm]
  );

  const fetchData = async () => {
    const offset = page * pageSize;
    // GET /loans/list?module=...&status=...&search=...&limit=&offset=
    const { data } = await api.get("/loans/list", {
      params: { module: moduleKey, status, search, limit: pageSize, offset },
    });
    setRows(data.rows || []);
    setTotal(Number(data.total || 0));
  };

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status, moduleKey]);

  const onSearch = async () => {
    setPage(0);
    await fetchData();
  };

  const closeDlg = () => setDlgOpen(false);
  const submitStatus = async () => {
    if (!dlgRow) return;
    setBusy(true);
    try {
      await api.patch(`${apiBase}/${dlgRow.id}/status`, {
        action: dlgAction, // 'approve' | 'reject'
        reason: dlgReason || undefined,
      });
      closeDlg();
      await fetchData();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to update status");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
        <Button variant="outlined" onClick={onSearch}>Search</Button>
      </Box>

      <div style={{ height: 560, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          rowCount={total}
          paginationMode="server"
          pageSizeOptions={[10, 20, 50, 100]}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={({ page: p, pageSize: ps }) => {
            setPage(p);
            setPageSize(ps);
          }}
          disableRowSelectionOnClick
        />
      </div>

      {/* Approve/Reject dialog */}
      <Dialog open={dlgOpen} onClose={closeDlg}>
        <DialogTitle>
          {dlgAction === "approve" ? "Approve application?" : "Reject application?"}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Reason (optional)"
            value={dlgReason}
            onChange={(e) => setDlgReason(e.target.value)}
            multiline
            minRows={2}
            sx={{ mt: 1, width: 420, maxWidth: "90vw" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDlg}>Cancel</Button>
          <Button onClick={submitStatus} variant="contained" disabled={busy}
            color={dlgAction === "approve" ? "success" : "error"}>
            {busy ? "Saving..." : dlgAction === "approve" ? "Approve" : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
