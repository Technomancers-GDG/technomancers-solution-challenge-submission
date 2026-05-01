import { useMemo, useState } from "react";

export function usePagination(items = [], pageSize = 20) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  function nextPage() {
    setPage((current) => Math.min(current + 1, totalPages));
  }

  function previousPage() {
    setPage((current) => Math.max(1, current - 1));
  }

  function goToPage(nextPageNumber) {
    const normalized = Number(nextPageNumber);
    if (Number.isNaN(normalized)) {
      return;
    }
    setPage(Math.max(1, Math.min(totalPages, normalized)));
  }

  return {
    page,
    totalPages,
    pageSize,
    totalItems: items.length,
    paginatedItems,
    nextPage,
    previousPage,
    goToPage,
    setPage,
  };
}
