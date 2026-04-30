import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, Outlet, useLocation } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";
import { ENABLE_STRATEGIES_PAGE, ENABLE_USER_MANUAL_PAGE } from "@/constants/navAvailability";

const drawerWidth = 240;

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/configure", label: "Configure run" },
  { to: "/analysis", label: "Data analysis" },
  ...(ENABLE_STRATEGIES_PAGE ? [{ to: "/strategies", label: "Strategies" as const }] : []),
  ...(ENABLE_USER_MANUAL_PAGE ? [{ to: "/manual", label: "User manual" as const }] : []),
];

export default function Layout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  const drawer = (
    <Box onClick={() => isMobile && setOpen(false)} sx={{ textAlign: "center" }}>
      <Box sx={{ my: 2 }}>
        <BrandLogo compact />
      </Box>
      <Divider />
      <List>
        {nav.map((item) => (
          <ListItemButton
            key={item.to}
            component={RouterLink}
            to={item.to}
            selected={loc.pathname === item.to}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setOpen(true)}
            sx={{ mr: 2, display: { xs: "inline-flex", md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <BrandLogo />
        </Toolbar>
      </AppBar>
      <Drawer
        variant="temporary"
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          /* Paper is position:fixed; without a width on the docked root, flex collapses to 0 and main sits under the drawer */
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
          },
        }}
        open
      >
        {drawer}
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: 3,
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
