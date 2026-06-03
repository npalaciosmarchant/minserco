import { useState, useMemo } from "react"

export function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages)

  const paged = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  )

  function goTo(p: number) { setPage(Math.max(1, Math.min(p, totalPages))) }
  function reset() { setPage(1) }

  return { paged, page: safePage, totalPages, goTo, reset, total: items.length }
}
