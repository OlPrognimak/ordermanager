import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#5eead4" },
    secondary: { main: "#a78bfa" },
    background: { default: "#0c1117", paper: "#131920" },
  },
  typography: {
    fontFamily: '"DM Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
});
