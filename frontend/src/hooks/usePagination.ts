export function usePagination(page: number, total: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    startItem: total === 0 ? 0 : (page - 1) * pageSize + 1,
    endItem: Math.min(page * pageSize, total),
  };
}
