import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, X, Edit } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { isSupabaseConfigured } from '@/lib/supabase'

interface EditableCellProps {
  value: string
  onSave: (newValue: string) => Promise<{ success: boolean; error?: string }>
  disabled?: boolean
}

export const EditableCell = ({ value, onSave, disabled = false }: EditableCellProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    if (editValue.trim() === '' || editValue === value) {
      setIsEditing(false)
      setEditValue(value)
      return
    }

    setIsLoading(true)
    const result = await onSave(editValue.trim())
    
    if (result.success) {
      setIsEditing(false)
      toast({
        title: "Updated successfully",
        description: `Value changed to "${editValue.trim()}"`,
      })
    } else {
      toast({
        title: "Update failed",
        description: result.error || "Failed to update value",
        variant: "destructive",
      })
      setEditValue(value) // Reset to original value
    }
    setIsLoading(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (disabled || !isSupabaseConfigured()) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium">{value}</span>
        {!isSupabaseConfigured() && (
          <span className="text-xs text-muted-foreground">(Read-only)</span>
        )}
      </div>
    )
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 group">
        <span className="font-medium">{value}</span>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
          onClick={() => setIsEditing(true)}
        >
          <Edit className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyPress}
        className="h-8 text-sm"
        autoFocus
        disabled={isLoading}
      />
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
        onClick={handleSave}
        disabled={isLoading}
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
        onClick={handleCancel}
        disabled={isLoading}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}