import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plane, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const flightSchema = z.object({
  registration: z.string().trim().min(1, "Registration is required").max(20, "Max 20 characters"),
  flightNo: z.string().trim().min(1, "Flight number is required").max(20, "Max 20 characters"),
  date: z.date({ required_error: "Date is required" }),
  std: z.string().trim().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  adep: z.string().trim().min(3, "ADEP must be 3-4 characters").max(4, "ADEP must be 3-4 characters"),
  sta: z.string().trim().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  operator: z.string().trim().min(1, "Operator is required").max(50, "Max 50 characters"),
  flightType: z.enum(["charter", "schedule", "acmi"], { required_error: "Flight type is required" }),
  totalCapacity: z.number().min(1, "Must be at least 1").max(1000, "Max 1000"),
  capacityUsed: z.number().min(0, "Must be at least 0").max(1000, "Max 1000"),
  status: z.enum(["operational", "aog", "maintenance", "cancelled"], { required_error: "Status is required" }),
  clientName: z.string().trim().min(1, "Client name is required").max(100, "Max 100 characters"),
  contractId: z.string().trim().min(1, "Contract ID is required").max(50, "Max 50 characters"),
  revenue: z.number().min(0, "Revenue must be positive"),
});

type FlightFormData = z.infer<typeof flightSchema>;

interface CreateFlightFormProps {
  onFlightCreated?: () => void;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function CreateFlightForm({ onFlightCreated }: CreateFlightFormProps) {
  const [creationType, setCreationType] = useState<"day" | "week" | "month">("day");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(daysOfWeek);
  const { toast } = useToast();

  const form = useForm<FlightFormData>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      registration: "",
      flightNo: "",
      std: "",
      adep: "",
      sta: "",
      operator: "",
      flightType: "schedule",
      totalCapacity: 180,
      capacityUsed: 0,
      status: "operational",
      clientName: "",
      contractId: "",
      revenue: 0,
    },
  });

  const getWeekNumber = (date: Date): number => {
    const startDate = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startDate.getDay() + 1) / 7);
  };

  const getDayName = (date: Date): string => {
    return daysOfWeek[date.getDay() === 0 ? 6 : date.getDay() - 1];
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const toggleAllDays = () => {
    if (selectedDays.length === daysOfWeek.length) {
      setSelectedDays([]);
    } else {
      setSelectedDays(daysOfWeek);
    }
  };

  const generateFlights = (baseData: FlightFormData, type: "day" | "week" | "month") => {
    const flights = [];
    const baseDate = baseData.date;
    
    if (type === "day") {
      flights.push({
        ...baseData,
        day: getDayName(baseDate),
        date: format(baseDate, "dd/MM"),
        weekNumber: getWeekNumber(baseDate),
        monthNumber: baseDate.getMonth() + 1,
        capacityAvailable: baseData.totalCapacity - baseData.capacityUsed,
      });
    } else if (type === "week") {
      // Generate flights for selected days in the week
      for (let i = 0; i < 7; i++) {
        const flightDate = new Date(baseDate);
        flightDate.setDate(baseDate.getDate() + i);
        const dayName = getDayName(flightDate);
        
        // Only create flight if this day is selected
        if (selectedDays.includes(dayName)) {
          flights.push({
            ...baseData,
            day: dayName,
            date: format(flightDate, "dd/MM"),
            weekNumber: getWeekNumber(flightDate),
            monthNumber: flightDate.getMonth() + 1,
            capacityAvailable: baseData.totalCapacity - baseData.capacityUsed,
          });
        }
      }
    } else if (type === "month") {
      // Generate flights for selected days in the month
      for (let i = 0; i < 30; i++) {
        const flightDate = new Date(baseDate);
        flightDate.setDate(baseDate.getDate() + i);
        const dayName = getDayName(flightDate);
        
        // Only create flight if this day is selected
        if (selectedDays.includes(dayName)) {
          flights.push({
            ...baseData,
            day: dayName,
            date: format(flightDate, "dd/MM"),
            weekNumber: getWeekNumber(flightDate),
            monthNumber: flightDate.getMonth() + 1,
            capacityAvailable: baseData.totalCapacity - baseData.capacityUsed,
          });
        }
      }
    }
    
    return flights;
  };

  const onSubmit = async (data: FlightFormData) => {
    if (creationType !== "day" && selectedDays.length === 0) {
      toast({
        title: "No days selected",
        description: "Please select at least one day of the week",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const flights = generateFlights(data, creationType);
      
      if (isSupabaseConfigured() && supabase) {
        // Insert into database
        const dbFlights = flights.map(flight => ({
          week_number: flight.weekNumber,
          month_number: flight.monthNumber,
          registration: flight.registration,
          flight_no: flight.flightNo,
          day: flight.day,
          date: flight.date,
          std: flight.std,
          adep: flight.adep,
          sta: flight.sta,
          operator: flight.operator,
          flight_type: flight.flightType,
          total_capacity: flight.totalCapacity,
          capacity_used: flight.capacityUsed,
          capacity_available: flight.capacityAvailable,
          status: flight.status,
          client_name: flight.clientName,
          contract_id: flight.contractId,
          revenue: flight.revenue,
        }));

        const { error } = await supabase.from('aircraft_data').insert(dbFlights);
        
        if (error) throw error;
        
        toast({
          title: "Success!",
          description: `Created ${flights.length} flight(s) successfully.`,
        });
        
        form.reset();
        onFlightCreated?.();
      } else {
        toast({
          title: "Database not configured",
          description: "Unable to save flights. Please configure Lovable Cloud.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create flights",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-aviation" />
            Create New Flight(s)
          </CardTitle>
          <CardDescription>
            Enter flight details and choose to create for a day, week, or month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={creationType} onValueChange={(v) => setCreationType(v as "day" | "week" | "month")} className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="day">Single Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Day Selection for Week and Month */}
          {(creationType === "week" || creationType === "month") && (
            <Card className="mb-6 bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Days</CardTitle>
                <CardDescription>
                  Choose which days of the week to create flights for
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleAllDays}
                  >
                    {selectedDays.length === daysOfWeek.length ? "Deselect All" : "Select All"}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedDays.length} day{selectedDays.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={day}
                        checked={selectedDays.includes(day)}
                        onCheckedChange={() => toggleDay(day)}
                      />
                      <label
                        htmlFor={day}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {day}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="registration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration *</FormLabel>
                      <FormControl>
                        <Input placeholder="N747BA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="flightNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flight Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="ROM001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-background border shadow-lg z-50" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        {creationType === "week" && "Week starts from this date"}
                        {creationType === "month" && "Month starts from this date"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="operator"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operator *</FormLabel>
                      <FormControl>
                        <Input placeholder="Romcargo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="std"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>STD (HH:MM) *</FormLabel>
                      <FormControl>
                        <Input placeholder="14:30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>STA (HH:MM) *</FormLabel>
                      <FormControl>
                        <Input placeholder="17:45" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ADEP *</FormLabel>
                      <FormControl>
                        <Input placeholder="JFK" {...field} maxLength={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="flightType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flight Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="schedule">Schedule</SelectItem>
                          <SelectItem value="charter">Charter</SelectItem>
                          <SelectItem value="acmi">ACMI</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Capacity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capacityUsed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity Used *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="operational">Operational</SelectItem>
                          <SelectItem value="aog">AOG</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Cargo Express Ltd" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contractId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract ID *</FormLabel>
                      <FormControl>
                        <Input placeholder="CTR-2024-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="revenue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revenue ($) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  <Plane className="h-4 w-4" />
                  {isSubmitting 
                    ? "Creating..." 
                    : creationType === "day" 
                    ? "Create Flight" 
                    : `Create Flights for ${selectedDays.length} day${selectedDays.length !== 1 ? 's' : ''}`
                  }
                </Button>
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  Reset Form
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
