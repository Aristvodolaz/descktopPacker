import { useState, useMemo, useCallback } from 'react'

interface UsePaginationProps<T> {
  data: T[]
  itemsPerPage: number
  initialPage?: number
}

interface UsePaginationReturn<T> {
  currentPage: number
  totalPages: number
  currentData: T[]
  totalItems: number
  itemsPerPage: number
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  canGoNext: boolean
  canGoPrev: boolean
  setItemsPerPage: (itemsPerPage: number) => void
}

export function usePagination<T>({
  data,
  itemsPerPage: initialItemsPerPage,
  initialPage = 1
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [itemsPerPage, setItemsPerPageState] = useState(initialItemsPerPage)

  const totalPages = Math.ceil(data.length / itemsPerPage)
  const totalItems = data.length

  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }, [data, currentPage, itemsPerPage])

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }, [totalPages])

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }, [currentPage, totalPages])

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }, [currentPage])

  const setItemsPerPage = useCallback((newItemsPerPage: number) => {
    setItemsPerPageState(newItemsPerPage)
    // Пересчитываем текущую страницу при изменении количества элементов
    const currentFirstItem = (currentPage - 1) * itemsPerPage
    const newPage = Math.floor(currentFirstItem / newItemsPerPage) + 1
    setCurrentPage(Math.min(newPage, Math.ceil(data.length / newItemsPerPage)))
  }, [currentPage, itemsPerPage, data.length])

  const canGoNext = currentPage < totalPages
  const canGoPrev = currentPage > 1

  // Reset to first page when data changes significantly
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [data.length, totalPages, currentPage])

  return {
    currentPage,
    totalPages,
    currentData,
    totalItems,
    itemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    setItemsPerPage
  }
} 