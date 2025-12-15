import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

const REASONS = [
  "Passenger and Baggage",
  "Cargo and Mail",
  "Aircraft and Ramp Handling",
  "Technical and Aircraft Equipment",
  "Damage to Aircraft & EDP/Automated Equipment Failure",
  "Flight Operations and Crewing",
  "Weather",
  "ATFM + AIRPORT + GOVERNMENTAL AUTHORITIES",
  "AIR TRAFFIC FLOW MANAGEMENT RESTRICTIONS",
  "AIRPORT AND GOVERNMENTAL AUTHORITIES",
  "Reactionary",
  "Miscellaneous",
  "Other"
];

interface ChangeReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flightNo: string;
  changeDescription: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function ChangeReasonDialog({
  open,
  onOpenChange,
  flightNo,
  changeDescription,
  onConfirm,
  onCancel,
}: ChangeReasonDialogProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const handleConfirm = () => {
    const reason = selectedReason === "Other" ? customReason : selectedReason;
    onConfirm(reason);
    setSelectedReason("");
    setCustomReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reason for Change</DialogTitle>
        </DialogHeader>
        <div className="mb-2 font-medium">{changeDescription}</div>
        <Select value={selectedReason} onValueChange={setSelectedReason}>
          <SelectTrigger>
            <SelectValue placeholder="Select reason" />
          </SelectTrigger>
          <SelectContent>
            {REASONS.map((reason) => (
              <SelectItem key={reason} value={reason}>{reason}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedReason === "Other" && (
          <Input
            className="mt-2"
            placeholder="Enter custom reason"
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
          />
        )}
        <div className="flex gap-2 mt-4">
          <Button onClick={handleConfirm} disabled={!selectedReason || (selectedReason === "Other" && !customReason)}>
            Confirm
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
