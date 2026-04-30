import { Box, Typography } from "@mui/material";

export default function BrandLogo({ compact = false }: { compact?: boolean }) {
  const iconSize = compact ? 22 : 26;
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
      <Box
        component="svg"
        viewBox="0 0 64 64"
        sx={{ width: iconSize, height: iconSize, flexShrink: 0 }}
        aria-hidden
      >
        <defs>
          <linearGradient id="brand-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0b1220" />
            <stop offset="100%" stopColor="#15263f" />
          </linearGradient>
          <linearGradient id="brand-up" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#18c964" />
            <stop offset="100%" stopColor="#7dffb2" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#brand-bg)" />
        <path
          d="M16 42 L28 30 L36 36 L48 20"
          fill="none"
          stroke="url(#brand-up)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="48" cy="20" r="4" fill="#7dffb2" />
      </Box>
      <Typography variant={compact ? "subtitle1" : "h6"} noWrap component="div" sx={{ lineHeight: 1.1 }}>
        Backtest Lab
      </Typography>
    </Box>
  );
}
