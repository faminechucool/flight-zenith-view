  // Helper to calculate block time as (STA - STD) + 1 hour
  function calculateBlockTime(std: string, sta: string): string {
    if (!std || !sta) return "";
    const [stdH, stdM] = std.split(":").map(Number);
    const [staH, staM] = sta.split(":").map(Number);
    const start = stdH * 60 + stdM;
    let end = staH * 60 + staM;
    if (end < start) end += 24 * 60; // handle overnight
    const diff = end - start + 60; // +1 hour in minutes
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  }
              {/* Add Block Time column header in the correct place below */}
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AircraftTableData } from "@/data/mockData";
import { EditableCell } from "@/components/EditableCell";
import { EditableSelectCell } from "@/components/EditableSelectCell";
import { ActivityLogDialog } from "@/components/ActivityLogDialog";

interface AircraftTableProps {
  aircraft: AircraftTableData[];
  onUpdate?: (id: string, field: 'registration' | 'flightNo' | 'status' | 'flightType'|'weekNumber'|'date'|'flightPositioning', newValue: string) => Promise<{ success: boolean; error?: string }>;
}


const getStatusColor = (status: string) => {
  switch (status) {
    case "operational":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "aog":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "maintenance":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "cancelled":
      return "bg-gray-100 text-gray-700 border-gray-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

const getFlightTypeColor = (type: string) => {
  switch (type) {
    case "charter":
      return "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200";
    case "schedule":
      return "bg-green-100 text-green-700 border-green-200 hover:bg-green-200";
    case "acmi":
      return "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

function formatCapacity(used: number, total: number): string {
  return `${used} / ${total}`;
}

export const AircraftTable = ({ aircraft, onUpdate }: AircraftTableProps) => {
  const statusOptions = [
    { value: "operational", label: "OPERATIONAL" },
    { value: "aog", label: "AOG" },
    { value: "maintenance", label: "MAINTENANCE" },
    { value: "cancelled", label: "CANCELLED" },
  ];

  const flightTypeOptions = [
    { value: "charter", label: "CHARTER" },
    { value: "schedule", label: "SCHEDULE" },
    { value: "acmi", label: "ACMI" },
  ];

  const flightPositioningOptions = [
    { value: "live_flight", label: "Live Flight (With Cargo)" },
    { value: "ferry_flight", label: "Ferry Flight (Empty/Positioning)" },
    { value: "spare_flight", label: "Spare Flight" },
  ];

  const handleUpdate = async (id: string, field: 'registration' | 'flightNo' | 'status' | 'flightType' | 'weekNumber'|'date'|'flightPositioning', newValue: string) => {
    if (onUpdate) {
      return await onUpdate(id, field, newValue);
    }
    return { success: false, error: 'Update function not provided' };
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="rounded-md border bg-card min-w-[1200px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] py-2">Week</TableHead>
              <TableHead className="w-[120px] py-2">Contract Id</TableHead>
              <TableHead className="w-[150px] py-2">Registration</TableHead>
              <TableHead className="w-[120px] py-2">Flight No</TableHead>
              <TableHead className="w-[90px] py-2">Day</TableHead>
              <TableHead className="w-[100px] py-2">Date</TableHead>
              <TableHead className="w-[80px] py-2">STD</TableHead>
              <TableHead className="w-[80px] py-2">ADEP</TableHead>
              <TableHead className="w-[80px] py-2">STA</TableHead>
              <TableHead className="w-[80px] py-2">ADES</TableHead>
              <TableHead className="w-[140px] py-2">Operator</TableHead>
              <TableHead className="w-[120px] py-2">Block Time</TableHead>
              <TableHead className="w-[100px] py-2">Type</TableHead>
              <TableHead className="w-[200px] py-2">Ferry/Live</TableHead>
              <TableHead className="w-[100px] py-2">Status</TableHead>
              <TableHead className="w-[150px] py-2">Client</TableHead>
              <TableHead className="w-[100px] py-2">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraft.map((aircraft) => (
              <TableRow key={aircraft.id} className="hover:bg-muted/50">
                <TableCell className="text-center font-medium py-2">{aircraft.weekNumber}</TableCell>
                <TableCell className="text-sm font-medium py-2">{aircraft.contractId}</TableCell>
                <TableCell className="py-2">
                  <EditableCell
                    value={aircraft.registration}
                    onSave={(newValue) => handleUpdate(aircraft.id, 'registration', newValue)}
                  />
                </TableCell>
                <TableCell className="py-2">
                  <EditableCell
                    value={aircraft.flightNo}
                    onSave={(newValue) => handleUpdate(aircraft.id, 'flightNo', newValue)}
                  />
                </TableCell>
                <TableCell className="text-sm py-2">{aircraft.day}</TableCell>
                <TableCell className="text-sm py-2">{aircraft.date}</TableCell>
                <TableCell className="text-sm py-2">{aircraft.std}</TableCell>
                <TableCell className="text-sm py-2">{aircraft.adep}</TableCell>
                <TableCell className="text-sm py-2">{aircraft.sta}</TableCell>
                <TableCell className="text-sm py-2">{aircraft.ades}</TableCell>
                <TableCell className="text-sm py-2">{aircraft.operator}</TableCell>
                <TableCell className="text-sm py-2">{calculateBlockTime(aircraft.std, aircraft.sta)}</TableCell>
                <TableCell className="py-2">
                  <EditableSelectCell
                    value={aircraft.flightType}
                    options={flightTypeOptions}
                    onSave={(newValue) => handleUpdate(aircraft.id, 'flightType', newValue)}
                  />
                </TableCell>
                <TableCell className="py-2">
                  <EditableSelectCell
                    value={aircraft.flightPositioning || "live_flight"}
                    options={flightPositioningOptions}
                    onSave={(newValue) => handleUpdate(aircraft.id, 'flightPositioning', newValue)}
                  />
                </TableCell>
                <TableCell className="py-2">
                  <EditableSelectCell
                    value={aircraft.status}
                    options={statusOptions}
                    onSave={(newValue) => handleUpdate(aircraft.id, 'status', newValue)}
                  />
                </TableCell>
                <TableCell className="text-sm py-2">{aircraft.clientName}</TableCell>
                <TableCell className="py-2">
                  <ActivityLogDialog aircraftId={aircraft.id} registration={aircraft.registration} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};