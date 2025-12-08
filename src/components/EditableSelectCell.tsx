import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditableSelectCellProps {
  value: string;
  options: { value: string; label: string }[];
  onSave: (newValue: string) => Promise<{ success: boolean; error?: string }>;
}

export const EditableSelectCell = ({ value, options, onSave }: EditableSelectCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    const result = await onSave(editValue);
    setIsSaving(false);

    if (result.success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const currentOption = options.find(opt => opt.value === value);

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors"
      >
        {currentOption?.label || value}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={editValue} onValueChange={setEditValue}>
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg z-50">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={handleSave}
        disabled={isSaving}
      >
        <Check className="h-4 w-4 text-green-600" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={handleCancel}
        disabled={isSaving}
      >
        <X className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
};
