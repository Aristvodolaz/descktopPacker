import { motion } from 'framer-motion'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange
}: PaginationProps) {
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getVisiblePages = () => {
    const pages = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      const startPage = Math.max(1, currentPage - 2)
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
      
      if (startPage > 1) {
        pages.push(1)
        if (startPage > 2) pages.push('...')
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      <div className="flex justify-between flex-1 sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`
            relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
            ${currentPage === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          Предыдущая
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`
            relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
            ${currentPage === totalPages
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          Следующая
        </button>
      </div>
      
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Показано{' '}
            <span className="font-medium">{startItem}</span>
            {' '}до{' '}
            <span className="font-medium">{endItem}</span>
            {' '}из{' '}
            <span className="font-medium">{totalItems}</span>
            {' '}результатов
          </p>
        </div>
        
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            {/* Previous button */}
            <motion.button
              whileHover={{ scale: currentPage > 1 ? 1.05 : 1 }}
              whileTap={{ scale: currentPage > 1 ? 0.95 : 1 }}
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`
                relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium
                ${currentPage === 1
                  ? 'text-gray-300 bg-gray-50 border-gray-300 cursor-not-allowed'
                  : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                }
              `}
            >
              <span className="sr-only">Предыдущая</span>
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </motion.button>

            {/* Page numbers */}
            {getVisiblePages().map((page, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: page !== '...' ? 1.05 : 1 }}
                whileTap={{ scale: page !== '...' && page !== currentPage ? 0.95 : 1 }}
                onClick={() => typeof page === 'number' && onPageChange(page)}
                disabled={page === '...' || page === currentPage}
                className={`
                  relative inline-flex items-center px-4 py-2 border text-sm font-medium
                  ${page === currentPage
                    ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                    : page === '...'
                    ? 'bg-white border-gray-300 text-gray-700 cursor-default'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {page}
              </motion.button>
            ))}

            {/* Next button */}
            <motion.button
              whileHover={{ scale: currentPage < totalPages ? 1.05 : 1 }}
              whileTap={{ scale: currentPage < totalPages ? 0.95 : 1 }}
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`
                relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium
                ${currentPage === totalPages
                  ? 'text-gray-300 bg-gray-50 border-gray-300 cursor-not-allowed'
                  : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                }
              `}
            >
              <span className="sr-only">Следующая</span>
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </motion.button>
          </nav>
        </div>
      </div>
    </div>
  )
} 