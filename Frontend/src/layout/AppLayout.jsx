// import { AppBar, Toolbar, Typography, Drawer, List, ListItemButton, Box } from '@mui/material';
// import { Link } from 'react-router-dom';
// import { useAuth } from '../auth/AuthContext';
// import Perm from '../auth/Perm';
// import { PERMS } from '../auth/perms';

// const nav = [
//   { label: 'Dashboard',    to: '/',            perm: null },
//   { label: 'Admin • Users', to: '/admin/users', perm: PERMS.RBAC_MANAGE },
//   { label: 'Admin • Roles', to: '/admin/roles', perm: PERMS.RBAC_MANAGE },
//   { label: 'Admin • Fields', to: '/admin/fields', perm: PERMS.FIELDS_MANAGE },
//   { label: 'Dealers',      to: '/dealers',     perm: PERMS.DEALERS_READ },
//   { label: 'Add Dealers',  to: '/dealers/new', perm: PERMS.DEALERS_WRITE },
//   { label: 'Customers',    to: '/customers',   perm: PERMS.CUSTOMERS_READ },
//   { label: 'Docs',         to: '/docs',        perm: PERMS.DOCS_READ },
// ];

// export default function AppLayout({ children }) {
//   const { user, logout } = useAuth();
//   const can = (perm) => !perm || user?.permissions?.includes(perm);

//   return (
//     <Box sx={{ display:'flex' }}>
//       <AppBar position="fixed">
//         <Toolbar sx={{ justifyContent:'space-between' }}>
//           <Typography>LOS</Typography>
//           <Typography sx={{ display:'flex', justifyContent:'center', alignItems:'center', gap:1, cursor:'pointer' }} onClick={logout}>
//             {user?.email} <Box sx={{ border:'2px solid black', padding:'4px 8px', borderRadius:'6px', backgroundColor:'Red' }}> Logout</Box>
//           </Typography>
//         </Toolbar>
//       </AppBar>

//       <Drawer variant="permanent" sx={{ width: 220, [`& .MuiDrawer-paper`]: { width:220, mt:11, ml:3 } }}>
//         <List>
//           {nav.filter(i => can(i.perm)).map(i => (
//             <ListItemButton key={i.to} component={Link} to={i.to}>
//               {i.label}
//             </ListItemButton>
//           ))}
//         </List>
//       </Drawer>

//       <Box component="main" sx={{ flexGrow:1, p:3, mt:8, ml:'40px' }}>
//         {children}
//       </Box>
//     </Box>
//   );
// }

// AppLayout.jsx
import * as React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  IconButton,
  Avatar,
  Divider,
  Tooltip,
  Button,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import PeopleIcon from "@mui/icons-material/PeopleOutline";
import SecurityIcon from "@mui/icons-material/SecurityOutlined";
import TuneIcon from "@mui/icons-material/TuneOutlined";
import StoreIcon from "@mui/icons-material/StorefrontOutlined";
import PersonAddIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import GroupIcon from "@mui/icons-material/GroupOutlined";
import DescriptionIcon from "@mui/icons-material/DescriptionOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { PERMS } from "../auth/perms";

const DRAWER_WIDTH = 240;

const nav = [
  { label: "Dashboard", to: "/", perm: null, icon: <DashboardIcon /> },
  {
    label: "Admin • Users",
    to: "/admin/users",
    perm: PERMS.RBAC_MANAGE,
    icon: <PeopleIcon />,
  },
  {
    label: "Admin • Roles",
    to: "/admin/roles",
    perm: PERMS.RBAC_MANAGE,
    icon: <SecurityIcon />,
  },
  {
    label: "Admin • Fields",
    to: "/admin/fields",
    perm: PERMS.FIELDS_MANAGE,
    icon: <TuneIcon />,
  },
  {
    label: "Dealers",
    to: "/dealers",
    perm: PERMS.DEALERS_READ,
    icon: <StoreIcon />,
  },
  {
    label: "Add Dealers",
    to: "/dealers/new",
    perm: PERMS.DEALERS_WRITE,
    icon: <PersonAddIcon />,
  },
  { label: "Financial Institutes", to: "/fin", perm: PERMS.FIN_READ, icon: <StoreIcon /> },
  { label: "Add Financial Institute", to: "/fin/new", perm: PERMS.FIN_WRITE, icon: <PersonAddIcon /> },
  { label: "Landlords", to: "/landlords", perm: PERMS.LAND_READ, icon: <StoreIcon /> },
  { label: "Add Landlord", to: "/landlords/new", perm: PERMS.LAND_WRITE, icon: <PersonAddIcon /> },
  {
    label: "Customers",
    to: "/customers",
    perm: PERMS.CUSTOMERS_READ,
    icon: <GroupIcon />,
  },
  {
    label: "Docs",
    to: "/docs",
    perm: PERMS.DOCS_READ,
    icon: <DescriptionIcon />,
  },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const can = (perm) => !perm || user?.permissions?.includes(perm);

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgb(52, 73, 94)",
        color: "white",
      }}
    >
      {/* Top spacing equal to AppBar height */}
      <Toolbar />
      <Box sx={{ px: 1.5, py: 0.5 }}>
        <Typography
          variant="overline"
          sx={{ fontWeight: 700, fontSize: 24, letterSpacing: 1 }}
        >
          LOS System
        </Typography>
      </Box>
      <List sx={{ px: 1 }}>
        {nav
          .filter((i) => can(i.perm))
          .map((i) => {
            const selected =
              i.to === "/"
                ? location.pathname === "/"
                : location.pathname === i.to ||
                  location.pathname.startsWith(i.to + "/");

            return (
              <ListItemButton
                key={i.to}
                component={NavLink}
                to={i.to}
                // Let NavLink render an <a> but keep MUI styles
                style={{ textDecoration: "none" }}
                selected={selected}
                sx={{
                  mb: 0.5,
                  borderRadius: 2,
                  "&.Mui-selected": {
                    // bgcolor: 'primary.light',
                    color: "primary.contrastText",
                    "& .MuiListItemIcon-root": {
                      color: "primary.contrastText",
                    },
                    "&:hover": { bgcolor: "#28A745" },
                  },
                  "&:hover": { bgcolor: "#28A745" },
                }}
                onClick={() => setMobileOpen(false)}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{i.icon}</ListItemIcon>
                <ListItemText
                  primary={i.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: selected ? 600 : 500,
                  }}
                />
              </ListItemButton>
            );
          })}
      </List>

      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32 }}>
          {(user?.email?.[0] || "U").toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }}>
            {user?.email || "User"}
          </Typography>
          <Typography noWrap sx={{ fontSize: 12, color: "text.secondary" }}>
            Signed in
          </Typography>
        </Box>
        <Tooltip title="Logout">
          <IconButton color="error" onClick={logout} size="small">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        bgcolor: "background.default",
        minHeight: "100vh",
      }}
    >
      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backdropFilter: "blur(8px)",
          backgroundColor: "rgb(52, 73, 94)",
          color: "white",
          // background: (theme) => theme.palette.mode === 'light'
          //   ? 'rgba(255,255,255,0.8)'
          //   : 'rgba(18,18,18,0.7)',
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ px: 2, gap: 1 }}>
          {/* Mobile menu button */}
          <IconButton
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ display: { md: "none" } }}
            edge="start"
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
            LOS
          </Typography>

          <Box
            sx={{
              ml: "auto",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              color: "white",
            }}
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {(user?.email?.[0] || "U").toUpperCase()}
            </Avatar>
            <Typography
              noWrap
              sx={{ display: { xs: "none", sm: "block" }, color: "white" }}
              title={user?.email}
            >
              {user?.email}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="white"
              onClick={logout}
              sx={{ textTransform: "none", backgroundColor: "red" }}
              startIcon={<LogoutIcon />}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Permanent drawer on md+, temporary on mobile */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop */}
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 2, sm: 3, lg: 4 },
          py: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          backgroundColor: "#acab8eff",
        }}
      >
        {/* Offset for AppBar */}
        <Toolbar />

        {/* Content container with card-like feel */}
        <Box
          sx={{
            minHeight: "calc(100vh - 112px)",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            p: { xs: 2, sm: 3 },
            boxShadow: (theme) => theme.shadows[1],
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
