import { useState } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type DatasheetMeta, parseMeta } from "./types";

const MAX_COLUMNS = 26; // A–Z

const DEFAULT: DatasheetMeta = {
  columns: ["Column A", "Column B", "Column C"],
  rows: [["", "", ""]],
};

interface Props {
  metadata: string;
  onChange: (metadata: string) => void;
}

export function LedgerFields({ metadata, onChange }: Props) {
  const meta = parseMeta(metadata, DEFAULT);
  const { columns, rows } = meta;
  const [confirm, setConfirm] = useState<{
    type: "row" | "column";
    index: number;
  } | null>(null);

  const update = (patch: Partial<DatasheetMeta>) => {
    onChange(JSON.stringify({ ...meta, ...patch }));
  };

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const newRows = rows.map((r, ri) =>
      ri === rowIdx ? r.map((c, ci) => (ci === colIdx ? value : c)) : r
    );
    update({ rows: newRows });
  };

  const updateColumnName = (colIdx: number, value: string) => {
    const newCols = columns.map((c, i) => (i === colIdx ? value : c));
    update({ columns: newCols });
  };

  const addRow = () => {
    update({ rows: [...rows, new Array(columns.length).fill("")] });
  };

  const doRemoveRow = (rowIdx: number) => {
    if (rows.length <= 1) return;
    update({ rows: rows.filter((_, i) => i !== rowIdx) });
    setConfirm(null);
  };

  const doRemoveColumn = (colIdx: number) => {
    if (columns.length <= 1) return;
    const newCols = columns.filter((_, i) => i !== colIdx);
    const newRows = rows.map((r) => r.filter((_, i) => i !== colIdx));
    update({ columns: newCols, rows: newRows });
    setConfirm(null);
  };

  const requestRemoveRow = (rowIdx: number) => {
    const hasData = rows[rowIdx].some((cell) => cell.trim() !== "");
    if (hasData) {
      setConfirm({ type: "row", index: rowIdx });
    } else {
      doRemoveRow(rowIdx);
    }
  };

  const requestRemoveColumn = (colIdx: number) => {
    const hasData = rows.some((row) => row[colIdx]?.trim() !== "");
    if (hasData) {
      setConfirm({ type: "column", index: colIdx });
    } else {
      doRemoveColumn(colIdx);
    }
  };

  const addColumn = () => {
    if (columns.length >= MAX_COLUMNS) return;
    const newCols = [...columns, `Column ${String.fromCharCode(65 + columns.length)}`];
    const newRows = rows.map((r) => [...r, ""]);
    update({ columns: newCols, rows: newRows });
  };

  return (
    <div className="h-full flex flex-col gap-3 min-w-0">
      {/* Scrollable table container */}
      <div className="flex-1 rounded-lg border border-th-border min-h-0 min-w-0 overflow-x-auto overflow-y-auto">
        <table
          className="text-sm border-collapse"
          style={{ width: `${columns.length * 150 + 80}px` }}
        >
          {/* Column headers */}
          <thead>
            <tr className="bg-th-surface/80">
              <th className="w-10 px-2 py-1.5 text-center text-[10px] text-th-text-muted font-medium border-b border-r border-th-border bg-th-surface/80 sticky left-0 z-20">
                #
              </th>
              {columns.map((col, ci) => (
                <th
                  key={ci}
                  className="px-1 py-1 border-b border-r border-th-border bg-th-surface/80"
                  style={{ minWidth: "140px" }}
                >
                  <div className="flex items-center gap-1">
                    <input
                      value={col}
                      onChange={(e) => updateColumnName(ci, e.target.value)}
                      className="flex-1 bg-transparent text-xs font-semibold text-th-text px-1.5 py-1 rounded focus:outline-none focus:ring-1 focus:ring-[var(--th-accent)]/30 min-w-0"
                    />
                    {columns.length > 1 && (
                      <button
                        onClick={() => requestRemoveColumn(ci)}
                        className="text-th-text-muted/40 hover:text-red-500 shrink-0"
                        title="Remove column"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-8 border-b border-th-border bg-th-surface/80" />
            </tr>
          </thead>

          {/* Data rows */}
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-th-surface/20">
                <td className="px-2 py-1.5 text-center text-[10px] text-th-text-muted tabular-nums border-r border-b border-th-border bg-th-bg sticky left-0 z-10">
                  {ri + 1}
                </td>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-1 py-0.5 border-r border-b border-th-border">
                    <input
                      value={cell}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      className="w-full bg-transparent text-sm text-th-text px-1.5 py-1 rounded focus:outline-none focus:ring-1 focus:ring-[var(--th-accent)]/30"
                      placeholder="..."
                    />
                  </td>
                ))}
                <td className="px-1 py-1 border-b border-th-border">
                  {rows.length > 1 && (
                    <button
                      onClick={() => requestRemoveRow(ri)}
                      className="text-th-text-muted/40 hover:text-red-500"
                      title="Remove row"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={addRow} className="text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add row
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={addColumn}
          disabled={columns.length >= MAX_COLUMNS}
          className="text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add column
          {columns.length >= MAX_COLUMNS && (
            <span className="text-th-text-muted ml-1">(max {MAX_COLUMNS})</span>
          )}
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-th-sidebar border border-th-border rounded-xl p-5 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <h3 className="text-sm font-semibold text-th-text">
                Delete {confirm.type === "row" ? "Row" : "Column"}?
              </h3>
            </div>
            <p className="text-xs text-th-text-muted mb-4 leading-relaxed">
              {confirm.type === "row"
                ? `Row ${confirm.index + 1} contains data. Are you sure you want to delete it?`
                : `"${columns[confirm.index]}" contains data. Are you sure you want to delete it?`}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirm(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm.type === "row") doRemoveRow(confirm.index);
                  else doRemoveColumn(confirm.index);
                }}
                className="text-xs text-red-400 border-red-400/30 hover:bg-red-400/10"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
