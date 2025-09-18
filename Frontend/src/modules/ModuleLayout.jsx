import { useMemo } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { Box, List, ListItemButton, ListItemText, Typography, Divider } from "@mui/material";

export default function ModuleLayout({ section }) {
  const { module } = useParams();

  const base = `/${section}/${module}`;
  const items = useMemo(
    () => [
      { path: `${base}/booking`,  label: "Loan Booking" },
      { path: `${base}/pending`,  label: "Pending" },     // NEW
      { path: `${base}/approved`, label: "Approved" },
      { path: `${base}/login`,    label: "Login" },
      { path: `${base}/rejected`, label: "Rejected" },
      { path: `${base}/all`,      label: "All Loans" },
    ],
    [base]
  );

  return (
    <Box sx={{
      display: "grid",
      gridTemplateColumns: "220px 1fr",
      gap: 2,
      height: "calc(100vh - 64px)",
      overflow: "hidden",
    }}>
      <Box sx={{ borderRight: "1px solid", borderColor: "divider", overflowY: "auto" }}>
        <Typography sx={{ p: 2, fontWeight: 700 }}>
          {section.toUpperCase()} / {module}
        </Typography>
        <Divider />
        <List>
          {items.map(i => (
            <ListItemButton
              key={i.path}
              component={NavLink}
              to={i.path}
              className={({ isActive }) => (isActive ? "active" : "")}
              sx={{
                "&.active": {
                  bgcolor: "action.selected",
                  "& .MuiListItemText-primary": { fontWeight: 700 }
                }
              }}
            >
              <ListItemText primary={i.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Box sx={{ p: 2, overflow: "auto" }}>
        <Outlet />
      </Box>
    </Box>
  );
}
