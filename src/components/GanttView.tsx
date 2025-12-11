import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { AircraftTableData } from "@/data/mockData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plane, Clock } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface GanttViewProps {
  aircraft: AircraftTableData[];
  onUpdateFlightTimes: (id: string, newStd: string, newSta: string) => Promise<unknown>;
  onUpdateAircraft: (id: string, field: 'registration' | 'flightNo' | 'status' | 'flightType' | 'weekNumber' | 'date' | 'flightPositioning', newValue: string) => Promise<unknown>;
  onNavigateToCreate?: () => void;
}

const BASE_TIMELINE_WIDTH = 1440;
const FLIGHT_HEIGHT = 24;
const LANE_HEIGHT = 32;

export const GanttView = ({ aircraft, onUpdateFlightTimes, onUpdateAircraft, onNavigateToCreate }: GanttViewProps) => {
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [selectedFlight, setSelectedFlight] = useState<AircraftTableData | null>(null);
  const [timeScale, setTimeScale] = useState<number>(1); // 0.5 to 2 scale factor
  
  // Local state for optimistic UI updates during drag
  const [draggedFlightId, setDraggedFlightId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);

  // Store committed offsets for flights that are being saved
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { std: string; sta: string }>>({});
  const dragStartRef = useRef<{ x: number; y: number; flightId: string; registration: string } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const TIMELINE_WIDTH = BASE_TIMELINE_WIDTH * timeScale;

  const availableWeeks = useMemo(() => {
    const weeks = new Set(aircraft.map(a => a.weekNumber));
    return Array.from(weeks).sort((a, b) => a - b);
  }, [aircraft]);

  const availableDates = useMemo(() => {
    const dates = new Set(aircraft.map(a => a.date));
    return Array.from(dates).sort();
  }, [aircraft]);

  // Get filtered dates based on selected week
  const filteredDates = useMemo(() => {
    if (selectedWeek === "all") return availableDates;
    const weekNum = parseInt(selectedWeek);
    const datesForWeek = new Set(
      aircraft.filter(a => a.weekNumber === weekNum).map(a => a.date)
    );
    return Array.from(datesForWeek).sort();
  }, [aircraft, selectedWeek, availableDates]);

  // Create unique row keys combining registration + week + date
  const rowKeys = useMemo(() => {
    const keys = new Set(aircraft.map(a => `${a.registration}|${a.weekNumber}|${a.date}`));
    return Array.from(keys).sort((a, b) => {
      const [regA, weekA, dayA] = a.split('|');
      const [regB, weekB, dayB] = b.split('|');
      const regCompare = regA.localeCompare(regB);
      if (regCompare !== 0) return regCompare;
      const weekCompare = parseInt(weekA) - parseInt(weekB);
      if (weekCompare !== 0) return weekCompare;
      return dayA.localeCompare(dayB);
    });
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
      const regOrder = a.registration.localeCompare(b.registration);
      if (regOrder !== 0) return regOrder;
      return a.std.localeCompare(b.std);
    });
  }, [aircraft, selectedWeek, selectedDate]);

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

  const getPositioningLabel = (positioning: string) => {
    return positioning === 'ferry_flight' ? 'Ferry Flight (Empty)' : 'Live Flight (With Cargo)';
  };

  const parseTimeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };

  const formatMinutesToTime = (minutes: number): string => {
    const m = ((minutes % 1440) + 1440) % 1440;
    const hh = Math.floor(m / 60).toString().padStart(2, '0');
    const mm = Math.floor(m % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const getFlightPixelPosition = (std: string, sta: string, offsetMinutes = 0) => {
    const startMin = parseTimeToMinutes(std) + offsetMinutes;
    const endMin = parseTimeToMinutes(sta) + offsetMinutes;

    const duration = endMin < startMin ? (1440 - startMin) + endMin : endMin - startMin;

    const startPosPx = (startMin % 1440) * (TIMELINE_WIDTH / 1440);
    const widthPx = Math.max(duration * (TIMELINE_WIDTH / 1440), 30 * timeScale);

    return {
      left: startPosPx,
      width: widthPx,
    };
  };

  // Group flights by registration + week + day
  const flightsByRow = useMemo(() => {
    const grouped: { [key: string]: { flight: AircraftTableData; lane: number }[] } = {};
    
    rowKeys.forEach(rowKey => {
      const [registration, weekNum, date] = rowKey.split('|');
      const flights = filteredAircraft.filter(f => 
        f.registration === registration && f.weekNumber === parseInt(weekNum) && f.date === date
      );
      const flightsWithLanes: { flight: AircraftTableData; lane: number }[] = [];
      
      const sortedFlights = [...flights].sort((a, b) => a.std.localeCompare(b.std));
      const laneEndTimes: number[] = [];
      
      sortedFlights.forEach(flight => {
        const startMinutes = parseTimeToMinutes(flight.std);
        const endMinutes = parseTimeToMinutes(flight.sta);
        const adjustedEnd = endMinutes < startMinutes ? endMinutes + 1440 : endMinutes;
        
        let assignedLane = 0;
        for (let i = 0; i < laneEndTimes.length; i++) {
          if (laneEndTimes[i] <= startMinutes) {
            assignedLane = i;
            break;
          }
          assignedLane = i + 1;
        }
        
        laneEndTimes[assignedLane] = adjustedEnd;
        flightsWithLanes.push({ flight, lane: assignedLane });
      });
      
      grouped[rowKey] = flightsWithLanes;
    });
    
    return grouped;
  }, [filteredAircraft, rowKeys]);

  const maxLanesPerRow = useMemo(() => {
    const maxLanes: { [key: string]: number } = {};
    rowKeys.forEach(rowKey => {
      const flights = flightsByRow[rowKey] || [];
      maxLanes[rowKey] = flights.length > 0 ? Math.max(...flights.map(f => f.lane)) + 1 : 1;
    });
    return maxLanes;
  }, [flightsByRow, rowKeys]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, flightId: string, registration: string) => {
    e.preventDefault();
    e.stopPropagation();
    dragStartRef.current = { x: e.clientX, y: e.clientY, flightId, registration };
    setDraggedFlightId(flightId);
    setDragOffset(0);
    setDragOffsetY(0);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current) return;
    
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    
    // Convert pixel movement to minutes based on scale
    const minutesDelta = Math.round(deltaX / timeScale);
    const rowsDelta = Math.round(deltaY / LANE_HEIGHT);
    
    setDragOffset(minutesDelta);
    setDragOffsetY(rowsDelta);
  }, [timeScale]);

  const handleMouseUp = useCallback(async () => {
    if (!dragStartRef.current || dragOffset === 0) {
      dragStartRef.current = null;
      setDraggedFlightId(null);
      setDragOffset(0);
      setDragOffsetY(0);
      return;
    }

    const flightId = dragStartRef.current.flightId;
    const flight = aircraft.find(f => f.id === flightId);
    
    if (!flight) {
      dragStartRef.current = null;
      setDraggedFlightId(null);
      setDragOffset(0);
      setDragOffsetY(0);
      return;
    }

    const origStart = parseTimeToMinutes(flight.std);
    const origEnd = parseTimeToMinutes(flight.sta);
    const duration = origEnd < origStart ? (origEnd + 1440 - origStart) : (origEnd - origStart);
    
    const newStartMinutes = origStart + dragOffset;
    const newStd = formatMinutesToTime(newStartMinutes);
    const newSta = formatMinutesToTime(newStartMinutes + duration);

    // Store the pending update so the flight stays in position until data refreshes
    setPendingUpdates(prev => ({ ...prev, [flightId]: { std: newStd, sta: newSta } }));
    
    dragStartRef.current = null;
    setDraggedFlightId(null);
    setDragOffset(0);
    setDragOffsetY(0);

    try {
      await onUpdateFlightTimes(flightId, newStd, newSta);
      toast.success(`Moved ${flight.flightNo} to ${newStd} - ${newSta}`);
    } catch (err) {
      toast.error('Failed to update flight time');
    } finally {
      setPendingUpdates(prev => {
        const updated = { ...prev };
        delete updated[flightId];
        return updated;
      });
    }
  }, [dragOffset, aircraft, onUpdateFlightTimes]);

  useEffect(() => {
    if (draggedFlightId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedFlightId, handleMouseMove, handleMouseUp]);

  const handlePositioningChange = async (newValue: string) => {
    if (!selectedFlight) return;
    try {
      await onUpdateAircraft(selectedFlight.id, 'flightPositioning', newValue);
      setSelectedFlight({ ...selectedFlight, flightPositioning: newValue as 'live_flight' | 'ferry_flight' });
      toast.success('Flight positioning updated');
    } catch (err) {
      toast.error('Failed to update flight positioning');
    }
  };

  // Get filtered row keys based on selections
  const filteredRowKeys = useMemo(() => {
    return rowKeys.filter(rowKey => {
      const [, weekNum, date] = rowKey.split('|');
      if (selectedWeek !== "all" && parseInt(weekNum) !== parseInt(selectedWeek)) return false;
      if (selectedDate !== "all" && date !== selectedDate) return false;
      return true;
    });
  }, [rowKeys, selectedWeek, selectedDate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-muted/10 rounded-md">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Plane className="w-6 h-6" />
          Aviation Timeline
        </h2>
        <div className="flex gap-3 items-center">
          {/* Time Scale Slider */}
          <div className="flex items-center gap-2 px-3 py-1 bg-muted/30 rounded-md">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">Zoom:</Label>
            <Slider
              value={[timeScale]}
              onValueChange={([value]) => setTimeScale(value)}
              min={0.5}
              max={2}
              step={0.1}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground w-8">{timeScale.toFixed(1)}x</span>
          </div>
          
          <Select value={selectedWeek} onValueChange={(val) => {
            setSelectedWeek(val);
            setSelectedDate("all");
          }}>
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
              {filteredDates.map((date) => (
                <SelectItem key={date} value={date}>
                  {date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border overflow-auto bg-background">
        {/* Column headers */}
        <div className="sticky top-0 z-20 bg-background border-b">
          <div className="flex">
            {/* Week label */}
            <div className="w-[60px] flex-shrink-0 border-r bg-muted/50 p-2 text-center font-semibold text-xs sticky left-0 z-30">
              Week
            </div>
            {/* Date label */}
            <div className="w-[80px] flex-shrink-0 border-r bg-muted/50 p-2 text-center font-semibold text-xs sticky left-[60px] z-30">
              Date
            </div>
            {/* Registration label */}
            <div className="w-[100px] flex-shrink-0 border-r bg-muted/50 p-2 text-center font-semibold sticky left-[140px] z-30">
              Registration
            </div>
            {/* Time headers */}
            <div className="flex">
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className="border-r p-2 text-center text-xs font-semibold bg-muted/50"
                  style={{ width: `${TIMELINE_WIDTH / 24}px` }}
                >
                  {time}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline rows */}
        <div className="min-h-[500px]" ref={timelineRef}>
          {filteredRowKeys.map((rowKey) => {
            const [registration, weekNum, date] = rowKey.split('|');
            const flights = flightsByRow[rowKey] || [];
            
            if (flights.length === 0) return null;
            
            return (
              <div
                key={rowKey}
                className="flex border-b hover:bg-muted/20 transition-colors"
              >
                {/* Week label */}
                <div className="w-[60px] flex-shrink-0 border-r bg-muted/10 p-2 sticky left-0 z-10 bg-background flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    W{weekNum}
                  </span>
                </div>
                
                {/* Date label */}
                <div className="w-[80px] flex-shrink-0 border-r bg-muted/10 p-2 sticky left-[60px] z-10 bg-background flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    {date}
                  </span>
                </div>
                
                {/* Registration label */}
                <div className="w-[100px] flex-shrink-0 border-r bg-muted/10 p-3 sticky left-[140px] z-10 bg-background">
                  <div className="font-semibold text-sm">{registration}</div>
                  <div className="text-xs text-muted-foreground">
                    {flights.length} flights
                  </div>
                </div>

                {/* Timeline grid */}
                <div 
                  className="relative"
                  style={{ 
                    width: `${TIMELINE_WIDTH}px`,
                    height: `${Math.max(maxLanesPerRow[rowKey] * LANE_HEIGHT + 8, 48)}px` 
                  }}
                >
                  {/* Background grid */}
                  <div className="absolute inset-0 flex">
                    {timeSlots.map((time, idx) => (
                      <div 
                        key={time} 
                        className={`border-r ${idx % 6 === 0 ? 'bg-muted/10' : ''}`}
                        style={{ width: `${TIMELINE_WIDTH / 24}px` }}
                      />
                    ))}
                  </div>

                  {/* Flight bars */}
                  <div className="absolute inset-0 px-1 py-1">
                    {flights.map(({ flight, lane }) => {
                      const isDragging = draggedFlightId === flight.id;
                      const pendingUpdate = pendingUpdates[flight.id];
                      
                      const displayStd = pendingUpdate ? pendingUpdate.std : flight.std;
                      const displaySta = pendingUpdate ? pendingUpdate.sta : flight.sta;
                      
                      const offset = isDragging ? dragOffset : 0;
                      const position = getFlightPixelPosition(displayStd, displaySta, offset);
                      
                      return (
                        <div
                          key={flight.id}
                          onMouseDown={(e) => handleMouseDown(e, flight.id, flight.registration)}
                          onDoubleClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedFlight(flight);
                          }}
                          className={`absolute rounded-md border-2 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-lg hover:z-10 ${getStatusColor(flight.status)} ${isDragging ? 'z-50 shadow-xl' : ''}`}
                          style={{
                            left: `${position.left}px`,
                            width: `${position.width}px`,
                            top: `${lane * LANE_HEIGHT + 4}px`,
                            height: `${FLIGHT_HEIGHT}px`,
                            userSelect: 'none',
                          }}
                          title={`${flight.flightNo} | ${flight.date} | ${flight.std}-${flight.sta} | ${flight.adep}`}
                        >
                          <div className="flex items-center gap-1 px-1 h-full overflow-hidden">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getFlightTypeColor(flight.flightType)}`} />
                            <span className="text-[10px] font-bold truncate">{flight.flightNo}</span>
                            <span className="text-[9px] truncate opacity-90">{flight.adep}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 items-center justify-center p-4 bg-muted/20 rounded-lg">
        <div className="text-sm font-semibold">Flight Types:</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-xs">Charter</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs">Schedule</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-xs">ACMI</span>
        </div>
        
        <div className="w-px h-6 bg-border mx-2" />
        
        <div className="text-sm font-semibold">Status:</div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded bg-green-500" />
          <span className="text-xs">Operational</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded bg-red-500" />
          <span className="text-xs">AOG</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded bg-yellow-500" />
          <span className="text-xs">Maintenance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded bg-gray-500" />
          <span className="text-xs">Cancelled</span>
        </div>
        
        <div className="w-px h-6 bg-border mx-2" />
        
        <div className="text-sm font-semibold">Positioning:</div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Live</Badge>
          <span className="text-xs">With Cargo</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">Ferry</Badge>
          <span className="text-xs">Empty</span>
        </div>
      </div>

      {filteredAircraft.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No flights available for the selected filters</p>
        </div>
      )}

      {/* Flight Details Dialog */}
      <Dialog open={!!selectedFlight} onOpenChange={(open) => !open && setSelectedFlight(null)}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5" />
              Flight Details - {selectedFlight?.flightNo}
            </DialogTitle>
          </DialogHeader>
          {selectedFlight && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-semibold">Registration:</span> {selectedFlight.registration}</div>
                <div><span className="font-semibold">Date:</span> {selectedFlight.date}</div>
                <div><span className="font-semibold">STD:</span> {selectedFlight.std}</div>
                <div><span className="font-semibold">STA:</span> {selectedFlight.sta}</div>
                <div><span className="font-semibold">ADEP:</span> {selectedFlight.adep}</div>
                <div><span className="font-semibold">Operator:</span> {selectedFlight.operator}</div>
                <div><span className="font-semibold">Status:</span> <Badge variant="outline">{selectedFlight.status}</Badge></div>
                <div><span className="font-semibold">Flight Type:</span> {selectedFlight.flightType}</div>
                <div><span className="font-semibold">Client:</span> {selectedFlight.clientName}</div>
                <div><span className="font-semibold">Week:</span> {selectedFlight.weekNumber}</div>
              </div>
              
              {/* Flight Positioning Dropdown */}
              <div className="space-y-2 pt-4 border-t">
                <Label className="font-semibold">Flight Positioning</Label>
                <Select 
                  value={selectedFlight.flightPositioning} 
                  onValueChange={handlePositioningChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select positioning" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live_flight">Live Flight (With Cargo)</SelectItem>
                    <SelectItem value="ferry_flight">Ferry Flight (Empty/Positioning)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
