import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as documentsApi from "../../api/documents";
import * as projectsApi from "../../api/projects";
import { AppShell } from "../../components/layout/AppShell";
import { DocumentList } from "../../components/documents/DocumentList";
import { DocumentUploader } from "../../components/documents/DocumentUploader";
import { Select } from "../../components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/States";
import { useUiStore } from "../../store/uiStore";
import type { Document } from "../../types";

export function DocumentsPage() {
  const [projectId, setProjectId] = useState("");
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["documents", { project_id: projectId }],
    queryFn: () => documentsApi.listDocuments({ project_id: projectId || undefined }),
  });
  const projects = useQuery({ queryKey: ["projects", "minimal"], queryFn: () => projectsApi.listProjects({}) });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentsApi.uploadDocument(file, { project_id: projectId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      addToast("Document uploaded");
    },
    onError: () => addToast("Upload failed", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: documentsApi.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      addToast("Document deleted");
    },
  });

  async function handleDownload(doc: Document) {
    try {
      await documentsApi.downloadDocument(doc.id, doc.filename);
    } catch {
      addToast("Download failed", "error");
    }
  }

  return (
    <AppShell title="Documents">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">All projects</option>
          {projects.data?.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="mb-6">
        <DocumentUploader
          uploading={uploadMutation.isPending}
          onFilesSelected={(files) => files.forEach((f) => uploadMutation.mutate(f))}
        />
      </div>

      {isPending ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <ErrorState message="Couldn't load documents." onRetry={refetch} />
      ) : data.items.length === 0 ? (
        <EmptyState title="No documents yet" />
      ) : (
        <DocumentList
          documents={data.items}
          onDownload={handleDownload}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}
    </AppShell>
  );
}
