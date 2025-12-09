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
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [draggedFlight, setDraggedFlight] = useState<AircraftTableData | null>(null);

  const availableWeeks = useMemo(() => {
    const weeks = new Set(aircraft.map(a => a.weekNumber));
    return Array.from(weeks).sort((a, b) => a - b);
  }, [aircraft]);

  // Get unique dates from aircraft data
  const availableDates = useMemo(() => {
    const dates = new Set(aircraft.map(a => a.date));
    return Array.from(dates).sort();
  }, [aircraft]);

  // Get unique registrations
  const registrations = useMemo(() => {
    const regs = new Set(aircraft.map(a => a.registration));
    return Array.from(regs).sort();
  }, [aircraft]);

  const filteredAircraft = useMemo(() => {
    let filtered = aircraft;
    
    if (selectedWeek !== "all") {
      filtered = filtered.filter(a => a.weekNumber === parseInt(selectedWeek));
    }
    
    if (selectedDate !== "all") {
      filtered = filtered.filter(a => a.date === selectedDate);
    }
    
    return filtered.sort((a, b) => {
      // Sort by registration first, then by STD time
      const regOrder = a.registration.localeCompare(b.registration);
      if (regOrder !== 0) return regOrder;
      return a.std.localeCompare(b.std);
    });
  }, [aircraft, selectedWeek, selectedDate]);

  // Time slots for the timeline (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "operational":
        return "bg-green-500/90 border-green-600 text-white";
      case "aog":
        return "bg-red-500/90 border-red-600 text-white";
      case "maintenance":
        return "bg-yellow-500/90 border-yellow-600 text-white";
      case "cancelled":
        return "bg-gray-500/90 border-gray-600 text-white";
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

  const handleDrop = async (e: React.DragEvent, targetRegistration: string) => {
    e.preventDefault();
    
    if (!draggedFlight || draggedFlight.registration === targetRegistration) {
      setDraggedFlight(null);
      return;
    }

    // For now, just show a message since changing registration would require different logic
    toast.info(`Flight ${draggedFlight.flightNo} - Registration change not supported via drag`);
    setDraggedFlight(null);
  };

  const handleDragEnd = () => {
    setDraggedFlight(null);
  };

  // Group flights by registration for timeline view
  const flightsByRegistration = useMemo(() => {
    const grouped: { [key: string]: AircraftTableData[] } = {};
    registrations.forEach(reg => {
      grouped[reg] = filteredAircraft.filter(f => f.registration === reg);
    });
    return grouped;
  }, [filteredAircraft, registrations]);

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
          
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              {availableDates.map((date) => (
                <SelectItem key={date} value={date}>
                  {date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border overflow-auto bg-background">
        {/* Column headers - Registration + 24-hour time slots */}
        <div className="sticky top-0 z-20 bg-background border-b">
          <div className="flex">
            <div className="w-[120px] flex-shrink-0 border-r bg-muted/50 p-2 text-center font-semibold sticky left-0 z-30 bg-muted/50">
              Registration
            </div>
            <div className="flex min-w-[1200px]">
              {timeSlots.map((time) => (
                <div key={time} className="flex-1 border-r p-2 text-center text-xs font-semibold bg-muted/50">
                  {time}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline rows for each registration */}
        <div className="min-h-[500px]">
          {registrations.map((registration, rowIndex) => (
            <div
              key={registration}
              className={`flex flex-col border-b hover:bg-muted/20 transition-colors ${
                draggedFlight && draggedFlight.registration !== registration ? 'bg-primary/5' : ''
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, registration)}
            >
              {/* Registration label */}
              <div className="flex w-full">
                <div className="w-[120px] flex-shrink-0 border-r bg-muted/10 p-3 sticky left-0 z-10 bg-background">
                  <div className="font-semibold text-sm">{registration}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {flightsByRegistration[registration]?.length || 0} flights
                  </div>
                </div>

                {/* Timeline grid */}
                <div className="flex-1 relative min-h-[70px] min-w-[1200px]">
                  {/* Background grid */}
                  <div className="absolute inset-0 flex">
                    {timeSlots.map((time, idx) => (
                      <div key={time} className={`flex-1 border-r ${idx % 6 === 0 ? 'bg-muted/10' : ''}`}></div>
                    ))}
                  </div>

                  {/* Flight bars */}
                  <div className="absolute inset-0 p-1">
                    {flightsByRegistration[registration]?.map((flight, idx) => {
                      const position = getFlightPosition(flight.std, flight.sta);
                      const topOffset = idx * 22;
                      
                      return (
                        <div
                          key={flight.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, flight)}
                          onDragEnd={handleDragEnd}
                          className={`absolute h-[18px] rounded-md border-2 cursor-move transition-all hover:shadow-lg hover:z-10 hover:scale-105 ${getStatusColor(
                            flight.status
                          )} ${draggedFlight?.id === flight.id ? 'opacity-50' : ''}`}
                          style={{
                            left: position.left,
                            width: position.width,
                            top: `${topOffset}px`,
                          }}
                          title={`${flight.flightNo} | ${flight.date} | ${flight.std}-${flight.sta} | ${flight.adep}`}
                        >
                          <div className="flex items-center gap-1 px-1 h-full">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getFlightTypeColor(flight.flightType)}`}></div>
                            <span className="text-[10px] font-bold truncate">{flight.flightNo}</span>
                            <span className="text-[9px] truncate opacity-90">{flight.adep}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
          <span className="text-xs">Operational</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded bg-red-500"></div>
          <span className="text-xs">AOG</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded bg-yellow-500"></div>
          <span className="text-xs">Maintenance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded bg-gray-500"></div>
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
