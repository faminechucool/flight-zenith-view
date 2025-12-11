import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { AircraftTableData } from "@/data/mockData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plane, Clock } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GanttViewProps {
  aircraft: AircraftTableData[];
  onUpdateFlightTimes: (id: string, newStd: string, newSta: string) => Promise<unknown>;
  onUpdateAircraft: (id: string, field: 'registration' | 'flightNo' | 'status' | 'flightType' | 'weekNumber' | 'date' | 'flightPositioning', newValue: string) => Promise<unknown>;
  onNavigateToCreate?: () => void;
}

const BASE_TIMELINE_WIDTH = 1440;
const FLIGHT_HEIGHT = 24;
const LANE_HEIGHT = 32;
const REG_COL_WIDTH = 120;

export const GanttView = ({ aircraft, onUpdateFlightTimes, onUpdateAircraft, onNavigateToCreate }: GanttViewProps) => {
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [selectedFlight, setSelectedFlight] = useState<AircraftTableData | null>(null);
  const [timeScale, setTimeScale] = useState<number>(1);
  
  const [draggedFlightId, setDraggedFlightId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [dragOverCell, setDragOverCell] = useState<{ registration: string; date: string } | null>(null);

  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { std: string; sta: string }>>({});
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timePickerFlight, setTimePickerFlight] = useState<AircraftTableData | null>(null);
  const [pickerStd, setPickerStd] = useState("00:00");
  const [pickerSta, setPickerSta] = useState("01:00");
  
  const dragStartRef = useRef<{ x: number; flightId: string; registration: string; date: string } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const TIMELINE_WIDTH = BASE_TIMELINE_WIDTH * timeScale;
  const HOUR_WIDTH = TIMELINE_WIDTH / 24;

  // Group dates by week
  const datesByWeek = useMemo(() => {
    const grouped: { [week: number]: string[] } = {};
    aircraft.forEach(a => {
      if (!grouped[a.weekNumber]) grouped[a.weekNumber] = [];
      if (!grouped[a.weekNumber].includes(a.date)) {
        grouped[a.weekNumber].push(a.date);
      }
    });
    Object.keys(grouped).forEach(week => {
      grouped[parseInt(week)].sort();
    });
    return grouped;
  }, [aircraft]);

  // Get unique weeks
  const availableWeeks = useMemo(() => {
    return Object.keys(datesByWeek).map(Number).sort((a, b) => a - b);
  }, [datesByWeek]);

  // Filtered weeks based on selectedWeek
  const visibleWeeks = useMemo(() => {
    if (selectedWeek === "all") return availableWeeks;
    return [parseInt(selectedWeek)];
  }, [selectedWeek, availableWeeks]);

  // Filtered dates within visible weeks
  const visibleDates = useMemo(() => {
    const dates: string[] = [];
    visibleWeeks.forEach(week => {
      const weekDates = datesByWeek[week] || [];
      weekDates.forEach(date => {
        if (selectedDate === "all" || date === selectedDate) {
          dates.push(date);
        }
      });
    });
    return dates;
  }, [visibleWeeks, datesByWeek, selectedDate]);

  // Filtered aircraft based on visible dates
  const filteredAircraft = useMemo(() => {
    return aircraft.filter(a => visibleDates.includes(a.date));
  }, [aircraft, visibleDates]);

  // Filtered dates for dropdown (all dates from visible weeks)
  const filteredDates = useMemo(() => {
    const dates: string[] = [];
    visibleWeeks.forEach(week => {
      const weekDates = datesByWeek[week] || [];
      weekDates.forEach(date => {
        if (!dates.includes(date)) {
          dates.push(date);
        }
      });
    });
    return dates.sort();
  }, [visibleWeeks, datesByWeek]);

  // Group flights by registration + date
  const flightsByRegAndDate = useMemo(() => {
    const grouped: { [key: string]: { flight: AircraftTableData; lane: number }[] } = {};
    
    const registrations = Array.from(new Set(filteredAircraft.map(f => f.registration))).sort();
    
    registrations.forEach(reg => {
      visibleDates.forEach(date => {
        const key = `${reg}|${date}`;
        const flights = filteredAircraft.filter(f => f.registration === reg && f.date === date);
        
        if (flights.length === 0) {
          grouped[key] = [];
          return;
        }

        // Sort by STD and assign lanes to avoid overlap
        const sortedFlights = [...flights].sort((a, b) => a.std.localeCompare(b.std));
        const laneEndTimes: number[] = [];
        const flightsWithLanes: { flight: AircraftTableData; lane: number }[] = [];

        sortedFlights.forEach(flight => {
          const parseTime = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
          };
          const startMin = parseTime(flight.std);
          const endMin = parseTime(flight.sta);
          const adjustedEnd = endMin < startMin ? endMin + 1440 : endMin;

          let lane = 0;
          for (let i = 0; i < laneEndTimes.length; i++) {
            if (laneEndTimes[i] <= startMin) {
              lane = i;
              break;
            }
            lane = i + 1;
          }
          laneEndTimes[lane] = adjustedEnd;
          flightsWithLanes.push({ flight, lane });
        });

        grouped[key] = flightsWithLanes;
      });
    });

    return grouped;
  }, [filteredAircraft, visibleDates]);

  // Get unique registrations
  const registrations = useMemo(() => {
    return Array.from(new Set(filteredAircraft.map(f => f.registration))).sort();
  }, [filteredAircraft]);

  // Max lanes per reg+date for row height
  const maxLanesPerCell = useMemo(() => {
    const max: { [key: string]: number } = {};
    Object.keys(flightsByRegAndDate).forEach(key => {
      const flights = flightsByRegAndDate[key];
      max[key] = flights.length > 0 ? Math.max(...flights.map(f => f.lane)) + 1 : 1;
    });
    return max;
  }, [flightsByRegAndDate]);

  // Make day column width responsive to zoom
  const DAY_COL_WIDTH = BASE_TIMELINE_WIDTH * timeScale;
  // const HOUR_WIDTH = DAY_COL_WIDTH / 24; // Removed duplicate declaration

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent, flight: AircraftTableData) => {
    e.preventDefault();
    e.stopPropagation();
    dragStartRef.current = { 
      x: e.clientX, 
      flightId: flight.id,
      registration: flight.registration,
      date: flight.date
    };
    setDraggedFlightId(flight.id);
    setDragOffset(0);
    setDragOverCell(null);
  }, []);

  // Handle drag move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current) return;
    
    const deltaX = e.clientX - dragStartRef.current.x;
    const snappedMinutes = Math.round(deltaX / (HOUR_WIDTH / 60));
    setDragOffset(snappedMinutes);

    // Detect which cell is under cursor
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const cellDiv = element?.closest('[data-cell-key]') as HTMLElement;
    if (cellDiv) {
      const cellKey = cellDiv.dataset.cellKey;
      if (cellKey) {
        const [registration, date] = cellKey.split('|');
        setDragOverCell({ registration, date });
      }
    }
  }, [HOUR_WIDTH]);

  // Handle drag end
  const handleMouseUp = useCallback(async () => {
    if (!dragStartRef.current || !draggedFlightId) {
      dragStartRef.current = null;
      setDraggedFlightId(null);
      setDragOffset(0);
      setDragOverCell(null);
      return;
    }

    const flight = aircraft.find(f => f.id === draggedFlightId);
    if (!flight) {
      dragStartRef.current = null;
      setDraggedFlightId(null);
      setDragOffset(0);
      setDragOverCell(null);
      return;
    }

    const originalDate = dragStartRef.current.date;
    const targetCell = dragOverCell;

    // Check if dropped in a different registration
    if (targetCell && targetCell.registration !== flight.registration) {
      toast.error('Cannot move flight to a different registration');
      dragStartRef.current = null;
      setDraggedFlightId(null);
      setDragOffset(0);
      setDragOverCell(null);
      return;
    }

    // Calculate new time
    const parseTime = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    const originalStartMin = parseTime(flight.std);
    const originalEndMin = parseTime(flight.sta);
    const duration = originalEndMin < originalStartMin 
      ? originalEndMin + 1440 - originalStartMin 
      : originalEndMin - originalStartMin;

    const newStartMin = originalStartMin + dragOffset;
    const normalizedStartMin = ((newStartMin % 1440) + 1440) % 1440;
    const normalizedEndMin = (normalizedStartMin + duration) % 1440;

    const formatTime = (minutes: number) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const newStd = formatTime(normalizedStartMin);
    const newSta = formatTime(normalizedEndMin);

    // Determine target date
    const newDate = targetCell?.date || originalDate;

    // Optimistic update
    setPendingUpdates(prev => ({ 
      ...prev, 
      [draggedFlightId]: { std: newStd, sta: newSta } 
    }));

    dragStartRef.current = null;
    setDraggedFlightId(null);
    setDragOffset(0);
    setDragOverCell(null);

    try {
      // Update time
      await onUpdateFlightTimes(draggedFlightId, newStd, newSta);
      
      // Update date if changed
      if (newDate !== originalDate) {
        await onUpdateAircraft(draggedFlightId, 'date', newDate);
        toast.success(`Moved ${flight.flightNo} to ${newDate} at ${newStd}-${newSta}`);
      } else {
        toast.success(`Updated ${flight.flightNo} to ${newStd}-${newSta}`);
      }
    } catch (err) {
      toast.error('Failed to update flight');
    } finally {
      setPendingUpdates(prev => {
        const updated = { ...prev };
        delete updated[draggedFlightId];
        return updated;
      });
    }
  }, [draggedFlightId, dragOffset, dragOverCell, aircraft, onUpdateFlightTimes, onUpdateAircraft, HOUR_WIDTH]);

  // Open time picker
  const openTimePicker = (flight: AircraftTableData) => {
    setTimePickerFlight(flight);
    setPickerStd(flight.std);
    setPickerSta(flight.sta);
    setTimePickerOpen(true);
  };

  // Handle time picker save
  const handleTimePickerSave = async () => {
    if (!timePickerFlight) return;
    
    try {
      await onUpdateFlightTimes(timePickerFlight.id, pickerStd, pickerSta);
      toast.success(`Updated ${timePickerFlight.flightNo} to ${pickerStd}-${pickerSta}`);
      setTimePickerOpen(false);
      setTimePickerFlight(null);
    } catch (err) {
      toast.error('Failed to update flight times');
    }
  };

  // Add/remove mouse listeners
  useEffect(() => {
    if (draggedFlightId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedFlightId, handleMouseMove, handleMouseUp]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-muted/10 rounded-md">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Plane className="w-6 h-6" />
          Aviation Timeline
        </h2>
        <div className="flex gap-3 items-center">
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

      <div className="rounded-md border overflow-x-auto bg-background">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background border-b">
          {/* Week row */}
          <div className="flex border-b">
            <div className="w-[120px] flex-shrink-0 border-r bg-muted/50 sticky left-0 z-30 p-2 text-xs font-semibold">
              Week
            </div>
            {visibleWeeks.map(week => {
              const weekDates = (datesByWeek[week] || []).filter(d => selectedDate === "all" || d === selectedDate);
              if (weekDates.length === 0) return null;
              const weekWidth = weekDates.length * DAY_COL_WIDTH;
              return (
                <div
                  key={week}
                  className="border-r bg-blue-50 p-3 text-center font-bold text-base"
                  style={{ minWidth: `${weekWidth}px` }}
                >
                  Week {week}
                </div>
              );
            })}
          </div>

          {/* Date + Time row */}
          <div className="flex">
            <div className="w-[120px] flex-shrink-0 border-r bg-muted/50 p-2 text-center font-semibold sticky left-0 z-30 text-xs">
              Registration
            </div>
            {visibleDates.map(date => (
              <div key={date} className="border-r" style={{ minWidth: `${DAY_COL_WIDTH}px` }}>
                {/* Date label - make it prominent */}
                <div className="border-b bg-blue-100 p-3 text-center text-base font-bold">
                  {date}
                </div>
                {/* Time slots */}
                <div className="flex">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div
                      key={h}
                      className="border-r p-2 text-center text-[11px] font-medium bg-muted/50"
                      style={{ minWidth: `${HOUR_WIDTH}px` }}
                    >
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="min-h-[500px]" ref={timelineRef}>
          {registrations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No flights for selected filters</p>
            </div>
          ) : (
            registrations.map(registration => {
              const maxLanes = Math.max(
                ...visibleDates.map(date => maxLanesPerCell[`${registration}|${date}`] || 1)
              );
              const rowHeight = Math.max(maxLanes * LANE_HEIGHT + 16, 60);

              return (
                <div key={registration} className="flex border-b hover:bg-muted/20">
                  {/* Registration label */}
                  <div
                    className="w-[120px] flex-shrink-0 border-r bg-muted/10 p-3 sticky left-0 z-10 bg-background flex items-center justify-center"
                    style={{ minHeight: `${rowHeight}px` }}
                  >
                    <div className="text-center">
                      <div className="font-bold text-base">{registration}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {filteredAircraft.filter(f => f.registration === registration).length} flights
                      </div>
                    </div>
                  </div>

                  {/* Day columns */}
                  {visibleDates.map(date => {
                    const cellKey = `${registration}|${date}`;
                    const flights = flightsByRegAndDate[cellKey] || [];
                    const isDropTarget = dragOverCell?.registration === registration && dragOverCell?.date === date;

                    return (
                      <div
                        key={date}
                        data-cell-key={cellKey}
                        className={`relative border-r transition-colors ${
                          isDropTarget ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-white'
                        }`}
                        style={{ minWidth: `${DAY_COL_WIDTH}px`, minHeight: `${rowHeight}px` }}
                      >
                        {/* Hour grid */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {Array.from({ length: 24 }, (_, h) => (
                            <div
                              key={h}
                              className={`border-r ${h % 6 === 0 ? 'border-gray-300' : 'border-gray-100'}`}
                              style={{ minWidth: `${HOUR_WIDTH}px` }}
                            />
                          ))}
                        </div>

                        {/* Flights */}
                        <div className="relative w-full h-full p-1">
                          {flights.map(({ flight, lane }) => {
                            const isDragging = draggedFlightId === flight.id;
                            const pendingUpdate = pendingUpdates[flight.id];
                            
                            // Use pending update times if available
                            const displayStd = pendingUpdate ? pendingUpdate.std : flight.std;
                            const displaySta = pendingUpdate ? pendingUpdate.sta : flight.sta;
                            
                            const parseTime = (t: string) => {
                              const [h, m] = t.split(':').map(Number);
                              return h * 60 + m;
                            };
                            const startMin = parseTime(displayStd);
                            const endMin = parseTime(displaySta);
                            const durationMin = endMin < startMin ? endMin + 1440 - startMin : endMin - startMin;

                            const offset = isDragging ? dragOffset : 0;
                            const adjustedStartMin = startMin + offset;
                            const normalizedStart = ((adjustedStartMin % 1440) + 1440) % 1440;
                            const leftPx = (normalizedStart / (24 * 60)) * DAY_COL_WIDTH;
                            const widthPx = Math.max((durationMin / (24 * 60)) * DAY_COL_WIDTH, 40);

                            return (
                              <div
                                key={flight.id}
                                onMouseDown={(e) => handleMouseDown(e, flight)}
                                onDoubleClick={() => setSelectedFlight(flight)}
                                className={`absolute rounded-md border-2 cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:z-20 ${
                                  isDragging ? 'z-50 opacity-80 scale-105 shadow-xl' : 'hover:scale-105'
                                } ${getStatusColor(flight.status)}`}
                                style={{
                                  left: `${leftPx}px`,
                                  width: `${widthPx}px`,
                                  top: `${lane * LANE_HEIGHT + 4}px`,
                                  height: `${FLIGHT_HEIGHT}px`,
                                  pointerEvents: isDragging ? 'none' : 'auto',
                                }}
                                title={`${flight.flightNo} | ${flight.date} | ${flight.std}-${flight.sta} | ${flight.adep}`}
                              >
                                <div className="flex items-center gap-1 px-2 h-full overflow-hidden">
                                  <div
                                    className={`w-2 h-2 rounded-full flex-shrink-0 ${getFlightTypeColor(
                                      flight.flightType
                                    )}`}
                                  />
                                  <span className="text-[11px] font-bold truncate">
                                    {flight.flightNo}
                                  </span>
                                  <span className="text-[10px] truncate opacity-90">
                                    {flight.adep}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
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

             {/* Open Time Picker Button */}
             <Button 
               onClick={() => openTimePicker(selectedFlight)}
               className="w-full mt-4"
               variant="outline"
             >
               <Clock className="w-4 h-4 mr-2" />
               Edit Times
             </Button>
              
              {/* Flight Positioning Dropdown */}
              <div className="space-y-2 pt-4 border-t">
                <Label className="font-semibold">Flight Positioning</Label>
                <Select 
                  value={selectedFlight.flightPositioning} 
                  onValueChange={async (newValue) => {
                    try {
                      await onUpdateAircraft(selectedFlight.id, 'flightPositioning', newValue);
                      setSelectedFlight({ ...selectedFlight, flightPositioning: newValue as 'live_flight' | 'ferry_flight' });
                      toast.success('Flight positioning updated');
                    } catch (err) {
                      toast.error('Failed to update positioning');
                    }
                  }}
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

     {/* Time Picker Dialog */}
     <Dialog open={timePickerOpen} onOpenChange={setTimePickerOpen}>
       <DialogContent className="bg-background max-w-2xl">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Clock className="w-5 h-5" />
             Edit Flight Times - {timePickerFlight?.flightNo}
           </DialogTitle>
         </DialogHeader>
         {timePickerFlight && (
           <div className="space-y-6">
             {/* Time Grid Picker */}
             <div className="space-y-4">
               <div>
                 <Label className="font-semibold mb-2 block">Departure Time (STD)</Label>
                 <div className="grid grid-cols-6 gap-2 p-4 bg-muted/30 rounded-lg max-h-[300px] overflow-y-auto">
                   {Array.from({ length: 24 }, (_, h) =>
                     Array.from({ length: 4 }, (_, q) => {
                       const minutes = h * 60 + q * 15;
                       const time = `${String(h).padStart(2, '0')}:${String(q * 15).padStart(2, '0')}`;
                       const isSelected = pickerStd === time;
                       return (
                         <Button
                           key={time}
                           onClick={() => setPickerStd(time)}
                           variant={isSelected ? "default" : "outline"}
                           size="sm"
                           className={`text-xs ${isSelected ? 'bg-blue-600 text-white' : ''}`}
                         >
                           {time}
                         </Button>
                       );
                     })
                   ).flat()}
                 </div>
               </div>

               <div>
                 <Label className="font-semibold mb-2 block">Arrival Time (STA)</Label>
                 <div className="grid grid-cols-6 gap-2 p-4 bg-muted/30 rounded-lg max-h-[300px] overflow-y-auto">
                   {Array.from({ length: 24 }, (_, h) =>
                     Array.from({ length: 4 }, (_, q) => {
                       const time = `${String(h).padStart(2, '0')}:${String(q * 15).padStart(2, '0')}`;
                       const isSelected = pickerSta === time;
                       return (
                         <Button
                           key={time}
                           onClick={() => setPickerSta(time)}
                           variant={isSelected ? "default" : "outline"}
                           size="sm"
                           className={`text-xs ${isSelected ? 'bg-green-600 text-white' : ''}`}
                         >
                           {time}
                         </Button>
                       );
                     })
                   ).flat()}
                 </div>
               </div>
             </div>

             {/* Manual input fallback */}
             <div className="grid grid-cols-2 gap-4 border-t pt-4">
               <div>
                 <Label className="text-xs">Or enter time</Label>
                 <Input
                   type="time"
                   value={pickerStd}
                   onChange={(e) => setPickerStd(e.target.value)}
                   className="mt-1"
                 />
               </div>
               <div>
                 <Label className="text-xs">Or enter time</Label>
                 <Input
                   type="time"
                   value={pickerSta}
                   onChange={(e) => setPickerSta(e.target.value)}
                   className="mt-1"
                 />
               </div>
             </div>

             {/* Summary */}
             <div className="bg-muted/20 p-3 rounded-lg text-sm">
               <div><span className="font-semibold">Flight:</span> {timePickerFlight.flightNo}</div>
               <div><span className="font-semibold">Duration:</span> {calculateDuration(pickerStd, pickerSta)}</div>
             </div>

             {/* Actions */}
             <div className="flex gap-2 justify-end pt-4 border-t">
               <Button variant="outline" onClick={() => setTimePickerOpen(false)}>
                 Cancel
               </Button>
               <Button onClick={handleTimePickerSave} className="bg-blue-600 hover:bg-blue-700">
                 Save Times
               </Button>
             </div>
           </div>
         )}
       </DialogContent>
     </Dialog>
    </div>
  );
};

// Helper to calculate flight duration
const calculateDuration = (std: string, sta: string) => {
   const parseTime = (t: string) => {
     const [h, m] = t.split(':').map(Number);
     return h * 60 + m;
   };
   const startMin = parseTime(std);
   const endMin = parseTime(sta);
   const duration = endMin < startMin ? endMin + 1440 - startMin : endMin - startMin;
   const hours = Math.floor(duration / 60);
   const minutes = duration % 60;
   return `${hours}h ${minutes}m`;
};

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

