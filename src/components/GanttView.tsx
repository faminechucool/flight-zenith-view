import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { AircraftTableData } from "@/data/mockData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plane, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ColorSettingsDialog } from "@/components/ColorSettingsDialog";
import { ChangeReasonDialog } from "@/components/ChangeReasonDialog";
import { useColorSettings, ColorSettings } from "@/hooks/useColorSettings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GanttViewProps {
  aircraft: AircraftTableData[];
  onUpdateFlightTimes: (id: string, newStd: string, newSta: string, changedBy?: string, reason?: string) => Promise<unknown>;
  onUpdateAircraft: (id: string, field: 'registration' | 'flightNo' | 'status' | 'flightType' | 'weekNumber' | 'date' | 'flightPositioning' | 'ades' | 'adep', newValue: string, changedBy?: string, reason?: string) => Promise<unknown>;
  onDeleteAircraft?: (id: string, changedBy?: string, reason?: string) => Promise<unknown>;
  onNavigateToCreate?: () => void;
}

const BASE_TIMELINE_WIDTH = 1440;
const FLIGHT_HEIGHT = 24;
const LANE_HEIGHT = 32;
const DRAG_THRESHOLD = 5;

export const GanttView = ({ aircraft, onUpdateFlightTimes, onUpdateAircraft, onDeleteAircraft, onNavigateToCreate }: GanttViewProps) => {
  const { colors, updateColor, resetColors } = useColorSettings();
  
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [selectedFlight, setSelectedFlight] = useState<AircraftTableData | null>(null);
  const [timeScale, setTimeScale] = useState<number>(1);
  
  const [draggedFlightId, setDraggedFlightId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [dragOverCell, setDragOverCell] = useState<{ registration: string; date: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { std: string; sta: string }>>({});
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timePickerFlight, setTimePickerFlight] = useState<AircraftTableData | null>(null);
  const [pickerStd, setPickerStd] = useState("00:00");
  const [pickerSta, setPickerSta] = useState("01:00");
  
  // Change reason dialog state
  const [changeReasonOpen, setChangeReasonOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<{
    flightId: string;
    flightNo: string;
    changeDescription: string;
    action: (reason: string) => Promise<void>;
  } | null>(null);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [flightToDelete, setFlightToDelete] = useState<AircraftTableData | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  
  const dragStartRef = useRef<{ 
    x: number; 
    y: number;
    flightId: string; 
    registration: string; 
    date: string;
    dragging: boolean;
  } | null>(null);
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

  // Filtered dates for dropdown
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

  const DAY_COL_WIDTH = BASE_TIMELINE_WIDTH * timeScale;

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent, flight: AircraftTableData) => {
    e.preventDefault();
    e.stopPropagation();
    dragStartRef.current = { 
      x: e.clientX,
      y: e.clientY,
      flightId: flight.id,
      registration: flight.registration,
      date: flight.date,
      dragging: false
    };
    setDraggedFlightId(flight.id);
    setDragOffset(0);
    setDragOverCell(null);
  }, []);

  // Handle drag move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current) return;
    
    const dx = Math.abs(e.clientX - dragStartRef.current.x);
    const dy = Math.abs(e.clientY - dragStartRef.current.y);
    
    if (!dragStartRef.current.dragging && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
      dragStartRef.current.dragging = true;
      setIsDragging(true);
    }
    
    if (!dragStartRef.current.dragging) return;
    
    const deltaX = e.clientX - dragStartRef.current.x;
    const snappedMinutes = Math.round(deltaX / (HOUR_WIDTH / 60));
    setDragOffset(snappedMinutes);

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
      setIsDragging(false);
      return;
    }

    const wasDragging = dragStartRef.current.dragging;
    const flight = aircraft.find(f => f.id === draggedFlightId);
    if (!flight) {
      dragStartRef.current = null;
      setDraggedFlightId(null);
      setDragOffset(0);
      setDragOverCell(null);
      setIsDragging(false);
      return;
    }

    if (!wasDragging) {
      dragStartRef.current = null;
      setDraggedFlightId(null);
      setDragOffset(0);
      setDragOverCell(null);
      setIsDragging(false);
      return;
    }

    const originalDate = dragStartRef.current.date;
    const originalRegistration = dragStartRef.current.registration;
    const targetCell = dragOverCell;

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
    const newDate = targetCell?.date || originalDate;
    const newRegistration = targetCell?.registration || originalRegistration;

    // Build change description
    const changes: string[] = [];
    if (newStd !== flight.std || newSta !== flight.sta) {
      changes.push(`Time: ${flight.std}-${flight.sta} → ${newStd}-${newSta}`);
    }
    if (newDate !== originalDate) {
      changes.push(`Date: ${originalDate} → ${newDate}`);
    }
    if (newRegistration !== originalRegistration) {
      changes.push(`Registration: ${originalRegistration} → ${newRegistration}`);
    }

    const flightId = draggedFlightId;
    
    dragStartRef.current = null;
    setDraggedFlightId(null);
    setDragOffset(0);
    setDragOverCell(null);
    setIsDragging(false);

    if (changes.length === 0) return;

    // Show change reason dialog
    setPendingChange({
      flightId,
      flightNo: flight.flightNo,
      changeDescription: changes.join(', '),
      action: async (reason: string) => {
        setPendingUpdates(prev => ({ 
          ...prev, 
          [flightId]: { std: newStd, sta: newSta } 
        }));

        try {
          await onUpdateFlightTimes(flightId, newStd, newSta, 'User', reason);
          
          if (newDate !== originalDate) {
            await onUpdateAircraft(flightId, 'date', newDate, 'User', reason);
          }
          if (newRegistration !== originalRegistration) {
            await onUpdateAircraft(flightId, 'registration', newRegistration, 'User', reason);
          }
          toast.success(`Updated ${flight.flightNo}`);
        } catch (err) {
          toast.error('Failed to update flight');
        } finally {
          setPendingUpdates(prev => {
            const updated = { ...prev };
            delete updated[flightId];
            return updated;
          });
        }
      }
    });
    setChangeReasonOpen(true);
  }, [draggedFlightId, dragOffset, dragOverCell, aircraft, onUpdateFlightTimes, onUpdateAircraft]);

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
    
    const flight = timePickerFlight;
    const changeDescription = `Time: ${flight.std}-${flight.sta} → ${pickerStd}-${pickerSta}`;
    
    setPendingChange({
      flightId: flight.id,
      flightNo: flight.flightNo,
      changeDescription,
      action: async (reason: string) => {
        try {
          await onUpdateFlightTimes(flight.id, pickerStd, pickerSta, 'User', reason);
          toast.success(`Updated ${flight.flightNo} to ${pickerStd}-${pickerSta}`);
          setTimePickerOpen(false);
          setTimePickerFlight(null);
        } catch (err) {
          console.error(err);
          toast.error('Failed to update flight times');
        }
      }
    });
    setChangeReasonOpen(true);
  };

  // Handle delete
  const handleDeleteClick = (flight: AircraftTableData) => {
    setFlightToDelete(flight);
    setDeleteReason("");
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!flightToDelete || !onDeleteAircraft) return;
    
    try {
      await onDeleteAircraft(flightToDelete.id, 'User', deleteReason);
      toast.success(`Deleted ${flightToDelete.flightNo}`);
      setSelectedFlight(null);
    } catch (err) {
      toast.error('Failed to delete flight');
    } finally {
      setDeleteDialogOpen(false);
      setFlightToDelete(null);
      setDeleteReason("");
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

  // Handle double click
  const handleDoubleClick = useCallback((e: React.MouseEvent, flight: AircraftTableData) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setSelectedFlight(flight);
    }
  }, [isDragging]);

  // Get status color from settings
  const getStatusStyle = (status: string) => {
    const color = colors.statuses[status as keyof typeof colors.statuses] || '#6b7280';
    return { backgroundColor: color };
  };

  // Get flight type color from settings
  const getFlightTypeStyle = (flightType: string) => {
    const color = colors.flightTypes[flightType as keyof typeof colors.flightTypes] || '#3b82f6';
    return { backgroundColor: color };
  };

  // Get positioning style
  const getPositioningStyle = (positioning: string) => {
    const isFerry = positioning === 'ferry_flight';
    const color = colors.positioning[positioning as keyof typeof colors.positioning] || '#3b82f6';
    return {
      borderStyle: isFerry ? 'dashed' : 'solid',
      borderColor: color,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-muted/10 rounded-md">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Plane className="w-6 h-6" />
          Aviation Timeline
        </h2>
        <div className="flex gap-3 items-center flex-wrap">
          <ColorSettingsDialog 
            colors={colors} 
            onUpdateColor={updateColor} 
            onReset={resetColors} 
          />
          
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
                <div className="border-b bg-blue-100 p-3 text-center text-base font-bold">
                  {date}
                </div>
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
                        <div className="absolute inset-0 flex pointer-events-none">
                          {Array.from({ length: 24 }, (_, h) => (
                            <div
                              key={h}
                              className={`border-r ${h % 6 === 0 ? 'border-gray-300' : 'border-gray-100'}`}
                              style={{ minWidth: `${HOUR_WIDTH}px` }}
                            />
                          ))}
                        </div>

                        <div className="relative w-full h-full p-1">
                          {flights.map(({ flight, lane }) => {
                            const isDraggedFlight = draggedFlightId === flight.id;
                            const pendingUpdate = pendingUpdates[flight.id];
                            
                            const displayStd = pendingUpdate ? pendingUpdate.std : flight.std;
                            const displaySta = pendingUpdate ? pendingUpdate.sta : flight.sta;
                            
                            const parseTime = (t: string) => {
                              const [h, m] = t.split(':').map(Number);
                              return h * 60 + m;
                            };
                            const startMin = parseTime(displayStd);
                            const endMin = parseTime(displaySta);
                            const durationMin = endMin < startMin ? endMin + 1440 - startMin : endMin - startMin;

                            const offset = isDraggedFlight ? dragOffset : 0;
                            const adjustedStartMin = startMin + offset;
                            const normalizedStart = ((adjustedStartMin % 1440) + 1440) % 1440;
                            const leftPx = (normalizedStart / (24 * 60)) * DAY_COL_WIDTH;
                            const widthPx = Math.max((durationMin / (24 * 60)) * DAY_COL_WIDTH, 40);

                            const statusStyle = getStatusStyle(flight.status);
                            const flightTypeStyle = getFlightTypeStyle(flight.flightType);
                            const positioningStyle = getPositioningStyle(flight.flightPositioning);

                            return (
                              <div
                                key={flight.id}
                                onMouseDown={(e) => handleMouseDown(e, flight)}
                                onDoubleClick={(e) => handleDoubleClick(e, flight)}
                                className={`absolute rounded-md border-2 cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:z-20 ${
                                 draggedFlightId === flight.id && isDragging ? 'z-50 opacity-80 scale-105 shadow-xl' : 'hover:scale-105'
                                }`}
                                style={{
                                  left: `${leftPx}px`,
                                  width: `${widthPx}px`,
                                  top: `${lane * LANE_HEIGHT + 4}px`,
                                  height: `${FLIGHT_HEIGHT}px`,
                                  pointerEvents: 'auto',
                                  ...statusStyle,
                                  ...positioningStyle,
                                }}
                                title={`${flight.flightNo} | ${flight.date} | ${flight.std}-${flight.sta} | ${flight.adep}-${flight.ades || '?'}`}
                              >
                                <div className="flex items-center gap-1 px-2 h-full overflow-hidden">
                                  <div
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={flightTypeStyle}
                                  />
                                  <span className="text-[11px] font-bold truncate text-white drop-shadow-sm">
                                    {flight.flightNo}
                                  </span>
                                  <span className="text-[10px] truncate text-white/90">
                                    {flight.adep}{flight.ades ? `-${flight.ades}` : ''}
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
        {Object.entries(colors.flightTypes).map(([key, color]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs capitalize">{key}</span>
          </div>
        ))}
        
        <div className="w-px h-6 bg-border mx-2" />
        
        <div className="text-sm font-semibold">Status:</div>
        {Object.entries(colors.statuses).map(([key, color]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="w-8 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-xs capitalize">{key === 'aog' ? 'AOG' : key}</span>
          </div>
        ))}
        
        <div className="w-px h-6 bg-border mx-2" />
        
        <div className="text-sm font-semibold">Positioning:</div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded border-2 border-solid" style={{ borderColor: colors.positioning.live_flight, backgroundColor: colors.positioning.live_flight + '40' }} />
          <span className="text-xs">Live (Solid)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded border-2 border-dashed" style={{ borderColor: colors.positioning.ferry_flight, backgroundColor: colors.positioning.ferry_flight + '40' }} />
          <span className="text-xs">Ferry (Dashed)</span>
        </div>
      </div>

      {filteredAircraft.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No flights available for the selected filters</p>
        </div>
      )}

      {/* Flight Details Dialog */}
      <Dialog open={!!selectedFlight} onOpenChange={(open) => {
         if (!open) setSelectedFlight(null);
       }}>
        <DialogContent className="bg-background max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5" />
              Flight Details - {selectedFlight?.flightNo}
            </DialogTitle>
          </DialogHeader>
          {selectedFlight && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-muted-foreground">Registration:</span>
                  <p className="mt-1">{selectedFlight.registration}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Date:</span>
                  <p className="mt-1">{selectedFlight.date}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Week:</span>
                  <p className="mt-1">Week {selectedFlight.weekNumber}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Flight No:</span>
                  <p className="mt-1">{selectedFlight.flightNo}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">STD:</span>
                  <p className="mt-1">{selectedFlight.std}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">STA:</span>
                  <p className="mt-1">{selectedFlight.sta}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Duration:</span>
                  <p className="mt-1">{calculateDuration(selectedFlight.std, selectedFlight.sta)}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">ADEP:</span>
                  <p className="mt-1">{selectedFlight.adep}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">ADES:</span>
                  <p className="mt-1">{selectedFlight.ades || '-'}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Operator:</span>
                  <p className="mt-1">{selectedFlight.operator}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Status:</span>
                  <p className="mt-1">
                    <Badge variant="outline" className="capitalize">
                      {selectedFlight.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Flight Type:</span>
                  <p className="mt-1 capitalize">{selectedFlight.flightType}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Client:</span>
                  <p className="mt-1">{selectedFlight.clientName}</p>
                </div>
              </div>

              <Button 
                onClick={() => openTimePicker(selectedFlight)}
                className="w-full mt-4"
                variant="outline"
              >
                <Clock className="w-4 h-4 mr-2" />
                Edit Times
              </Button>
              
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="positioning" className="font-semibold">Flight Positioning</Label>
                <Select 
                  value={selectedFlight.flightPositioning || "live_flight"}
                  onValueChange={async (newValue) => {
                    const changeDesc = `Positioning: ${selectedFlight.flightPositioning} → ${newValue}`;
                    setPendingChange({
                      flightId: selectedFlight.id,
                      flightNo: selectedFlight.flightNo,
                      changeDescription: changeDesc,
                      action: async (reason: string) => {
                        try {
                          await onUpdateAircraft(selectedFlight.id, 'flightPositioning', newValue, 'User', reason);
                          setSelectedFlight({ 
                            ...selectedFlight, 
                            flightPositioning: newValue as 'live_flight' | 'ferry_flight' 
                          });
                          toast.success('Flight positioning updated');
                        } catch (err) {
                          console.error(err);
                          toast.error('Failed to update positioning');
                        }
                      }
                    });
                    setChangeReasonOpen(true);
                  }}
                >
                  <SelectTrigger id="positioning" className="w-full">
                    <SelectValue placeholder="Select positioning" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live_flight">Live Flight (With Cargo)</SelectItem>
                    <SelectItem value="ferry_flight">Ferry Flight (Empty/Positioning)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {onDeleteAircraft && (
                <div className="pt-4 border-t">
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => handleDeleteClick(selectedFlight)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Flight
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Time Picker Dialog */}
      <Dialog open={timePickerOpen} onOpenChange={setTimePickerOpen}>
        <DialogContent className="bg-background max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Edit Flight Times - {timePickerFlight?.flightNo}
            </DialogTitle>
          </DialogHeader>
          {timePickerFlight && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="font-semibold mb-2 block">Departure Time (STD)</Label>
                  <div className="grid grid-cols-6 gap-2 p-4 bg-muted/30 rounded-lg max-h-[300px] overflow-y-auto">
                    {Array.from({ length: 24 }, (_, h) =>
                      Array.from({ length: 4 }, (_, q) => {
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

              <div className="bg-muted/20 p-3 rounded-lg text-sm border">
                <div><span className="font-semibold">Flight:</span> {timePickerFlight.flightNo}</div>
                <div><span className="font-semibold">Duration:</span> {calculateDuration(pickerStd, pickerSta)}</div>
              </div>

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

      {/* Change Reason Dialog */}
      <ChangeReasonDialog
        open={changeReasonOpen}
        onOpenChange={setChangeReasonOpen}
        flightNo={pendingChange?.flightNo || ''}
        changeDescription={pendingChange?.changeDescription || ''}
        onConfirm={async (reason) => {
          if (pendingChange) {
            await pendingChange.action(reason);
          }
          setChangeReasonOpen(false);
          setPendingChange(null);
        }}
        onCancel={() => {
          setChangeReasonOpen(false);
          setPendingChange(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flight</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete flight {flightToDelete?.flightNo}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="delete-reason">Reason for deletion (optional)</Label>
            <Textarea
              id="delete-reason"
              placeholder="Enter reason..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const durationMin = endMin < startMin ? endMin + 1440 - startMin : endMin - startMin;
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  return `${hours}h ${mins}m`;
};
