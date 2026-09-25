import { formatBytes, formatDate } from "../../lib/format";
import { Button } from "../ui/Button";
import type { Document } from "../../types";

export function DocumentList({
  documents,
  onDownload,
  onDelete,
}: {
  documents: Document[];
  onDownload: (doc: Document) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-fd-khaki bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-fd-khaki bg-fd-pearl text-xs uppercase text-fd-taupe">
          <tr>
            <th className="px-4 py-3 font-medium">File</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium">Uploaded</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {documents.map((d) => (
            <tr key={d.id} className="border-b border-fd-khaki last:border-0 hover:bg-fd-pearl/60">
              <td className="px-4 py-3 text-fd-cacao">{d.filename}</td>
              <td className="px-4 py-3 text-fd-taupe">{formatBytes(d.size_bytes)}</td>
              <td className="px-4 py-3 text-fd-taupe">{formatDate(d.created_at)}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => onDownload(d)}>
                    Download
                  </Button>
                  {onDelete && (
                    <Button variant="ghost" onClick={() => onDelete(d.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
