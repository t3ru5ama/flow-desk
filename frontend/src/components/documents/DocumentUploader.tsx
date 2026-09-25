import { useRef, useState } from "react";
import { Button } from "../ui/Button";

export function DocumentUploader({ onFilesSelected, uploading }: { onFilesSelected: (files: File[]) => void; uploading?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) onFilesSelected(Array.from(e.dataTransfer.files));
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-150 ${
        dragOver ? "border-fd-leather bg-fd-khaki/20" : "border-fd-khaki bg-white"
      }`}
    >
      <p className="text-sm text-fd-taupe">Drag and drop a file, or</p>
      <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? "Uploading…" : "Choose file"}
      </Button>
      <p className="text-xs text-fd-taupe">Max 10MB &middot; pdf, doc, xls, png, jpg, txt, csv, zip</p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFilesSelected(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}
