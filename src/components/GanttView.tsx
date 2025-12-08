import { useMemo, useState } from "react";
import { AircraftTableData } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plane } from "lucide-react";

interface GanttViewProps {
  aircraft: AircraftTableData[];
  onUpdateFlight: (id: string, field: 'day', newValue: string) => Promise<any>;
}

export const GanttView = ({ aircraft, onUpdateFlight }: GanttViewProps) => {
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [draggedFlight, setDraggedFlight] = useState<AircraftTableData | null>(null);

  const availableWeeks = useMemo(() => {
    const weeks = new Set(aircraft.map(a => a.weekNumber));
    return Array.from(weeks).sort((a, b) => a - b);
  }, [aircraft]);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const filteredAircraft = useMemo(() => {
    let filtered = aircraft;
    
    if (selectedWeek !== "all") {
      filtered = filtered.filter(a => a.weekNumber === parseInt(selectedWeek));
    }
    
    if (selectedDay !== "all") {
      filtered = filtered.filter(a => a.day === selectedDay);
    }
    
    return filtered.sort((a, b) => {
      // Sort by day first, then by STD time
      const dayOrder = daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day);
      if (dayOrder !== 0) return dayOrder;
      return a.std.localeCompare(b.std);
    });
  }, [aircraft, selectedWeek, selectedDay]);

  // Time slots for the timeline (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const columnLetters = Array.from({ length: 24 }, (_, i) => 
    String.fromCharCode(65 + i) // A-X for 24 hours
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "bg-green-500/90 border-green-600 text-white";
      case "pending":
        return "bg-yellow-500/90 border-yellow-600 text-white";
      case "cancelled":
        return "bg-red-500/90 border-red-600 text-white";
      default:
        return "bg-blue-500/90 border-blue-600 text-white";
    }
  };

  const getFlightTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "charter":
        return "bg-purple-500";
      case "schedule":
        return "bg-blue-500";
      case "acmi":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  // Calculate flight position and width based on time
  const getFlightPosition = (std: string, sta: string) => {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours + minutes / 60;
    };

    const startHour = parseTime(std);
    const endHour = parseTime(sta);
    
    // Handle overnight flights
    const duration = endHour < startHour ? (24 - startHour) + endHour : endHour - startHour;
    const startPercent = (startHour / 24) * 100;
    const widthPercent = (duration / 24) * 100;

    return { left: `${startPercent}%`, width: `${Math.max(widthPercent, 4)}%` };
  };

  const handleDragStart = (e: React.DragEvent, flight: AircraftTableData) => {
    setDraggedFlight(flight);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetDay: string) => {
    e.preventDefault();
    
    if (!draggedFlight || draggedFlight.day === targetDay) {
      setDraggedFlight(null);
      return;
    }

    try {
      const result = await onUpdateFlight(draggedFlight.id, 'day', targetDay);
      if (result.success) {
        toast.success(`Flight ${draggedFlight.flightNo} moved to ${targetDay}`);
      } else {
        toast.error("Failed to move flight");
      }
    } catch (error) {
      toast.error("Failed to move flight");
    } finally {
      setDraggedFlight(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedFlight(null);
  };

  // Group flights by day for timeline view
  const flightsByDay = useMemo(() => {
    const grouped: { [key: string]: AircraftTableData[] } = {};
    daysOfWeek.forEach(day => {
      grouped[day] = filteredAircraft.filter(f => f.day === day);
    });
    return grouped;
  }, [filteredAircraft]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Plane className="w-6 h-6" />
          Aviation Timeline
        </h2>
        <div className="flex gap-3">
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              {availableWeeks.map((week) => (
                <SelectItem key={week} value={week.toString()}>
                  Week {week}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Days</SelectItem>
              {daysOfWeek.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border overflow-auto bg-background">
        {/* Column headers - Time slots with letters */}
        <div className="sticky top-0 z-20 bg-background border-b">
          <div className="flex">
            <div className="w-[140px] flex-shrink-0 border-r bg-muted/50 p-2 text-center font-semibold sticky left-0 z-10">
              Day / Time
            </div>
            <div className="flex-1 grid grid-cols-24 min-w-[1200px]">
              {columnLetters.map((letter, idx) => (
                <div key={letter} className="border-r p-1 text-center font-semibold text-xs bg-muted/50">
                  {letter}
                </div>
              ))}
            </div>
          </div>
          <div className="flex">
            <div className="w-[140px] flex-shrink-0 border-r bg-muted/30 sticky left-0 z-10"></div>
            <div className="flex-1 grid grid-cols-24 min-w-[1200px]">
              {timeSlots.map((time) => (
                <div key={time} className="border-r p-1 text-center text-xs font-medium bg-muted/30">
                  {time}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline rows for each day */}
        <div className="min-h-[500px]">
          {daysOfWeek.map((day, rowIndex) => (
            <div
              key={day}
              className={`flex border-b hover:bg-muted/20 transition-colors ${
                draggedFlight && draggedFlight.day !== day ? 'bg-primary/5' : ''
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              {/* Day label with row number */}
              <div className="w-[140px] flex-shrink-0 border-r bg-muted/10 p-3 sticky left-0 z-10 bg-background">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-muted-foreground">#{rowIndex + 1}</span>
                  <span className="font-medium text-sm">{day}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {flightsByDay[day]?.length || 0} flights
                </div>
              </div>

              {/* Timeline grid */}
              <div className="flex-1 relative min-h-[80px] min-w-[1200px]">
                {/* Background grid */}
                <div className="absolute inset-0 grid grid-cols-24">
                  {timeSlots.map((time, idx) => (
                    <div key={time} className={`border-r ${idx % 6 === 0 ? 'bg-muted/10' : ''}`}></div>
                  ))}
                </div>

                {/* Flight bars */}
                <div className="absolute inset-0 p-1">
                  {flightsByDay[day]?.map((flight, idx) => {
                    const position = getFlightPosition(flight.std, flight.sta);
                    const topOffset = idx * 24; // Stack flights vertically
                    
                    return (
                      <div
                        key={flight.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, flight)}
                        onDragEnd={handleDragEnd}
                        className={`absolute h-[20px] rounded-md border-2 cursor-move transition-all hover:shadow-lg hover:z-10 hover:scale-105 ${getStatusColor(
                          flight.status
                        )} ${draggedFlight?.id === flight.id ? 'opacity-50' : ''}`}
                        style={{
                          left: position.left,
                          width: position.width,
                          top: `${topOffset}px`,
                        }}
                        title={`${flight.flightNo} - ${flight.registration} (${flight.std}-${flight.sta})`}
                      >
                        <div className="flex items-center gap-1 px-2 h-full">
                          <div className={`w-2 h-2 rounded-full ${getFlightTypeColor(flight.flightType)}`}></div>
                          <span className="text-[10px] font-bold truncate">{flight.flightNo}</span>
                          <span className="text-[9px] truncate opacity-90">{flight.registration}</span>
                          <span className="text-[9px] ml-auto opacity-90">${flight.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 items-center justify-center p-4 bg-muted/20 rounded-lg">
        <div className="text-sm font-semibold">Flight Types:</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span className="text-xs">Charter</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-xs">Schedule</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span className="text-xs">ACMI</span>
        </div>
        
        <div className="w-px h-6 bg-border mx-2"></div>
        
        <div className="text-sm font-semibold">Status:</div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded bg-green-500"></div>
          <span className="text-xs">Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded bg-yellow-500"></div>
          <span className="text-xs">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded bg-red-500"></div>
          <span className="text-xs">Cancelled</span>
        </div>
      </div>

      {filteredAircraft.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No flights available for the selected filters</p>
        </div>
      )}
    </div>
  );
};
