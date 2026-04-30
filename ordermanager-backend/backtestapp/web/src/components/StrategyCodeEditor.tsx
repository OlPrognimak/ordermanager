import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import { Box } from "@mui/material";

type Props = {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
};

export function StrategyCodeEditor({ value, onChange, minHeight = 440 }: Props) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        "& .cm-editor": { minHeight },
        "& .cm-scroller": { fontFamily: "ui-monospace, monospace", fontSize: 13 },
      }}
    >
      <CodeMirror
        value={value}
        height={`${minHeight}px`}
        theme={oneDark}
        extensions={[python()]}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightSelectionMatches: true,
        }}
      />
    </Box>
  );
}
