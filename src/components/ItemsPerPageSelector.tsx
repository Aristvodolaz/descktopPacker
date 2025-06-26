import { motion } from 'framer-motion'

interface ItemsPerPageSelectorProps {
  itemsPerPage: number
  onItemsPerPageChange: (itemsPerPage: number) => void
  options?: number[]
}

export default function ItemsPerPageSelector({
  itemsPerPage,
  onItemsPerPageChange,
  options = [5, 10, 20, 50]
}: ItemsPerPageSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-700">Показать:</span>
      <motion.select
        whileFocus={{ scale: 1.02 }}
        value={itemsPerPage}
        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
        className="block w-auto rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </motion.select>
      <span className="text-sm text-gray-700">на странице</span>
    </div>
  )
} 