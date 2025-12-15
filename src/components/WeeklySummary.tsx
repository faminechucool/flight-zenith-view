import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AircraftTableData } from "@/data/mockData";
import { Calendar as CalendarIcon, DollarSign, Plane, TrendingUp, TableIcon } from "lucide-react";
import { format, parse } from "date-fns";

interface WeeklySummaryProps {
  aircraft: AircraftTableData[];
}

interface WeekSummary {
  weekNumber: number;
  totalFlights: number;
  totalRevenue: number;
  uniqueAircraft: number;
  aircraftList: string[];
  flightsByDay: Map<string, AircraftTableData[]>;
  totalBlockHours: number; // new
}

export function WeeklySummary({ aircraft }: WeeklySummaryProps) {
  const [selectedWeek, setSelectedWeek] = useState<string>("all");

  const weeklySummaries = useMemo(() => {
    const summaryMap = new Map<number, WeekSummary>();

    function calculateBlockTimeMinutes(std: string, sta: string): number {
      if (!std || !sta) return 0;
      const [stdH, stdM] = std.split(":").map(Number);
      const [staH, staM] = sta.split(":").map(Number);
      const start = stdH * 60 + stdM;
      let end = staH * 60 + staM;
      if (end < start) end += 24 * 60;
      const diff = end - start + 60; // +1 hour
      return diff;
    }

    aircraft.forEach((flight) => {
      const week = flight.weekNumber;
      if (!summaryMap.has(week)) {
        summaryMap.set(week, {
          weekNumber: week,
          totalFlights: 0,
          totalRevenue: 0,
          uniqueAircraft: 0,
          aircraftList: [],
          flightsByDay: new Map(),
          totalBlockHours: 0,
        });
      }
      const summary = summaryMap.get(week)!;
      summary.totalFlights++;
      summary.totalRevenue += flight.revenue || 0;
      if (!summary.aircraftList.includes(flight.registration)) {
        summary.aircraftList.push(flight.registration);
        summary.uniqueAircraft++;
      }
      // Group flights by date
      const dateKey = flight.date;
      if (!summary.flightsByDay.has(dateKey)) {
        summary.flightsByDay.set(dateKey, []);
      }
      summary.flightsByDay.get(dateKey)!.push(flight);
      // Add block hours
      summary.totalBlockHours += calculateBlockTimeMinutes(flight.std, flight.sta);
    });

    return Array.from(summaryMap.values()).sort((a, b) => a.weekNumber - b.weekNumber);
  }, [aircraft]);

  const availableWeeks = useMemo(() => {
    return Array.from(new Set(aircraft.map(a => a.weekNumber))).sort((a, b) => a - b);
  }, [aircraft]);

  const displayedSummaries = useMemo(() => {
    if (selectedWeek === "all") {
      return weeklySummaries;
    }
    return weeklySummaries.filter(s => s.weekNumber === parseInt(selectedWeek));
  }, [weeklySummaries, selectedWeek]);

  const totalStats = useMemo(() => {
    // Sum block hours in minutes, convert to hours/minutes
    const totalBlockMinutes = displayedSummaries.reduce((acc, summary) => acc + summary.totalBlockHours, 0);
    const blockHours = Math.floor(totalBlockMinutes / 60);
    const blockMins = totalBlockMinutes % 60;
    return displayedSummaries.reduce(
      (acc, summary) => ({
        flights: acc.flights + summary.totalFlights,
        revenue: acc.revenue + summary.totalRevenue,
        aircraft: Math.max(acc.aircraft, summary.uniqueAircraft),
        blockHours,
        blockMins,
      }),
      { flights: 0, revenue: 0, aircraft: 0, blockHours, blockMins }
    );
  }, [displayedSummaries]);

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filter by Week:</label>
        <Select value={selectedWeek} onValueChange={setSelectedWeek}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select week" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg z-50">
            <SelectItem value="all">All Weeks</SelectItem>
            {availableWeeks.map((week) => (
              <SelectItem key={week} value={week.toString()}>
                Week {week}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Block Hours</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {totalStats.blockHours}h{totalStats.blockMins ? ` ${totalStats.blockMins}m` : ''}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Across {displayedSummaries.length} week{displayedSummaries.length !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flights</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.flights}</div>
            <p className="text-xs text-muted-foreground">
              Across {displayedSummaries.length} week{displayedSummaries.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalStats.revenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Average: ${displayedSummaries.length > 0 ? Math.round(totalStats.revenue / displayedSummaries.length).toLocaleString() : 0}/week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aircraft Used</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.aircraft}</div>
            <p className="text-xs text-muted-foreground">
              Unique registrations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table and Calendar Views */}
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table" className="gap-2">
            <TableIcon className="h-4 w-4" />
            Table View
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
        </TabsList>

        {/* Table View */}
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Summary Table</CardTitle>
              <CardDescription>Detailed breakdown of flights, revenue, and aircraft by week</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week Number</TableHead>
                    <TableHead className="text-right">Total Flights</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Unique Aircraft</TableHead>
                    <TableHead>Block Hours</TableHead>
                    <TableHead>Aircraft Registrations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedSummaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedSummaries.map((summary) => (
                      <TableRow key={summary.weekNumber}>
                        <TableCell className="font-medium">Week {summary.weekNumber}</TableCell>
                        <TableCell className="text-right">{summary.totalFlights}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ${summary.totalRevenue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">{summary.uniqueAircraft}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {(() => {
                            const mins = summary.totalBlockHours;
                            const h = Math.floor(mins / 60);
                            const m = mins % 60;
                            return m === 0 ? `${h}h` : `${h}h ${m}m`;
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {summary.aircraftList.map((reg) => (
                              <span
                                key={reg}
                                className="text-xs bg-muted px-2 py-0.5 rounded"
                              >
                                {reg}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar" className="space-y-6">
          {displayedSummaries.map((summary) => {
            const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const allDates = Array.from(summary.flightsByDay.keys()).sort();
            
            return (
              <Card key={summary.weekNumber}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-aviation" />
                      Week {summary.weekNumber} - {new Date().getFullYear()}
                    </CardTitle>
                    <div className="flex gap-4 text-sm">
                      <span className="text-muted-foreground">
                        <strong>{summary.totalFlights}</strong> flights
                      </span>
                      <span className="text-muted-foreground">
                        <strong>${summary.totalRevenue.toLocaleString()}</strong> revenue
                      </span>
                      <span className="text-muted-foreground">
                        <strong>{summary.uniqueAircraft}</strong> aircraft
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2">
                    {/* Day Headers */}
                    {daysOfWeek.map((day) => (
                      <div key={day} className="text-center font-semibold text-sm py-2 border-b">
                        {day}
                      </div>
                    ))}
                    
                    {/* Day Cells */}
                    {daysOfWeek.map((day) => {
                      // Find flights for this day of week
                      const dayFlights = allDates
                        .map(date => {
                          const flights = summary.flightsByDay.get(date);
                          return flights && flights[0]?.day === day ? { date, flights } : null;
                        })
                        .filter(Boolean)[0];

                      return (
                        <div
                          key={day}
                          className={`min-h-[150px] p-2 border rounded-lg ${
                            dayFlights ? 'bg-card' : 'bg-muted/30'
                          }`}
                        >
                          {dayFlights ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-aviation-dark">
                                  {dayFlights.date}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {dayFlights.flights.length}
                                </Badge>
                              </div>
                              <div className="space-y-1.5">
                                {dayFlights.flights.map((flight) => (
                                  <div
                                    key={flight.id}
                                    className="text-xs p-2 bg-muted rounded border-l-2 border-aviation space-y-0.5"
                                  >
                                    <div className="font-semibold text-aviation-dark flex items-center gap-1">
                                      <Plane className="h-3 w-3" />
                                      {flight.flightNo}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {flight.registration}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {flight.adep} • {flight.std}
                                    </div>
                                    <div className="font-medium text-green-600">
                                      ${flight.revenue.toLocaleString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                              No flights
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
