import { AircraftTableData } from '@/data/mockData'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EditableCell } from './EditableCell'
import { EditableSelectCell } from './EditableSelectCell'

interface ExcelViewProps {
  aircraft: AircraftTableData[]
  onUpdate?: (id: string, field: string, value: string) => Promise<{ success: boolean; error?: string }>
}

export const ExcelView = ({ aircraft, onUpdate }: ExcelViewProps) => {
  const handleUpdate = async (id: string, field: 'registration' | 'flightNo' | 'status' | 'flightType' | 'day', value: string) => {
    if (onUpdate) {
      return await onUpdate(id, field, value)
    }
    return { success: false, error: 'No update handler provided' }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20'
      case 'cancelled': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const dayOptions = [
    { value: 'Monday', label: 'Monday' },
    { value: 'Tuesday', label: 'Tuesday' },
    { value: 'Wednesday', label: 'Wednesday' },
    { value: 'Thursday', label: 'Thursday' },
    { value: 'Friday', label: 'Friday' },
    { value: 'Saturday', label: 'Saturday' },
    { value: 'Sunday', label: 'Sunday' }
  ]

  const flightTypeOptions = [
    { value: 'charter', label: 'Charter' },
    { value: 'schedule', label: 'Schedule' },
    { value: 'acmi', label: 'ACMI' }
  ]

  const statusOptions = [
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'pending', label: 'Pending' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R']

  return (
    <div className="rounded-md border overflow-auto bg-background">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[50px] text-center font-semibold sticky left-0 bg-muted/50 border-r">#</TableHead>
            {columns.map((col, idx) => (
              <TableHead key={col} className="text-center font-semibold bg-muted/50 border-r min-w-[120px]">
                {col}
              </TableHead>
            ))}
          </TableRow>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[50px] text-center sticky left-0 bg-muted/30 border-r"></TableHead>
            <TableHead className="border-r">Week</TableHead>
            <TableHead className="border-r">Month</TableHead>
            <TableHead className="border-r">Registration</TableHead>
            <TableHead className="border-r">Flight No</TableHead>
            <TableHead className="border-r">Day</TableHead>
            <TableHead className="border-r">Date</TableHead>
            <TableHead className="border-r">STD</TableHead>
            <TableHead className="border-r">ADEP</TableHead>
            <TableHead className="border-r">STA</TableHead>
            <TableHead className="border-r">ADES</TableHead>
            <TableHead className="border-r">Operator</TableHead>
            <TableHead className="border-r">Flight Type</TableHead>
            <TableHead className="border-r">Status</TableHead>
            <TableHead className="border-r">Client</TableHead>
            <TableHead className="border-r">Contract ID</TableHead>
            <TableHead className="border-r">Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aircraft.map((flight, index) => (
            <TableRow key={flight.id} className="hover:bg-muted/20">
              <TableCell className="w-[50px] text-center font-semibold sticky left-0 bg-background border-r">
                {index + 1}
              </TableCell>
              <TableCell className="border-r">{flight.weekNumber}</TableCell>
              <TableCell className="border-r">{flight.monthNumber}</TableCell>
              <TableCell className="border-r">
                <EditableCell
                  value={flight.registration}
                  onSave={(value) => handleUpdate(flight.id, 'registration', value)}
                />
              </TableCell>
              <TableCell className="border-r">
                <EditableCell
                  value={flight.flightNo}
                  onSave={(value) => handleUpdate(flight.id, 'flightNo', value)}
                />
              </TableCell>
              <TableCell className="border-r">
                <EditableSelectCell
                  value={flight.day}
                  options={dayOptions}
                  onSave={(value) => handleUpdate(flight.id, 'day', value)}
                />
              </TableCell>
              <TableCell className="border-r">{flight.date}</TableCell>
              <TableCell className="border-r">{flight.std}</TableCell>
              <TableCell className="border-r">{flight.adep}</TableCell>
              <TableCell className="border-r">{flight.sta}</TableCell>
              <TableCell className="border-r">{flight.ades}</TableCell>
              <TableCell className="border-r">{flight.operator}</TableCell>
              <TableCell className="border-r">
                <EditableSelectCell
                  value={flight.flightType}
                  options={flightTypeOptions}
                  onSave={(value) => handleUpdate(flight.id, 'flightType', value)}
                />
              </TableCell>
              <TableCell className="border-r">
                <EditableSelectCell
                  value={flight.status}
                  options={statusOptions}
                  onSave={(value) => handleUpdate(flight.id, 'status', value)}
                />
              </TableCell>
              <TableCell className="border-r">{flight.clientName}</TableCell>
              <TableCell className="border-r">{flight.contractId}</TableCell>
              <TableCell className="font-medium border-r">${flight.revenue.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
