import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as documentsApi from "../../api/documents";
import * as incidentsApi from "../../api/incidents";
import { DocumentUploader } from "../documents/DocumentUploader";
import { LoadingState } from "../ui/States";
import { formatBytes } from "../../lib/format";

export function IncidentDocumentsList({ incidentId }: { incidentId: string }) {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["incident", incidentId, "documents"],
    queryFn: () => incidentsApi.listIncidentDocuments(incidentId),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentsApi.uploadDocument(file, { incident_id: incidentId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incident", incidentId, "documents"] }),
  });

  return (
    <div className="rounded-lg border border-fd-khaki bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-fd-cacao">Attachments</h3>
      {isPending ? (
        <LoadingState rows={2} />
      ) : data && data.items.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-2">
          {data.items.map((d) => (
            <li key={d.id} className="flex justify-between text-sm">
              <button
                className="text-fd-cacao hover:text-fd-leather"
                onClick={() => documentsApi.downloadDocument(d.id, d.filename)}
              >
                {d.filename}
              </button>
              <span className="text-fd-taupe">{formatBytes(d.size_bytes)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-fd-taupe">No attachments.</p>
      )}
      <DocumentUploader
        uploading={uploadMutation.isPending}
        onFilesSelected={(files) => files.forEach((f) => uploadMutation.mutate(f))}
      />
    </div>
  );
}
