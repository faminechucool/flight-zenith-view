import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AircraftTableData } from "@/data/mockData";
import { Calendar as CalendarIcon, DollarSign, Plane, TrendingUp, TableIcon } from "lucide-react";

interface MonthlySummaryProps {
  aircraft: AircraftTableData[];
}

interface MonthSummary {
  monthNumber: number;
  monthName: string;
  totalFlights: number;
  totalRevenue: number;
  uniqueAircraft: number;
  aircraftList: string[];
  flightsByDate: Map<string, AircraftTableData[]>;
  totalBlockHours: number; // new
}

export function MonthlySummary({ aircraft }: MonthlySummaryProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const monthlySummaries = useMemo(() => {
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

    const summaryMap = new Map<number, MonthSummary>();
    aircraft.forEach((flight) => {
      const month = flight.monthNumber;
      if (!summaryMap.has(month)) {
        summaryMap.set(month, {
          monthNumber: month,
          monthName: monthNames[month - 1],
          totalFlights: 0,
          totalRevenue: 0,
          uniqueAircraft: 0,
          aircraftList: [],
          flightsByDate: new Map(),
          totalBlockHours: 0,
        });
      }
      const summary = summaryMap.get(month)!;
      summary.totalFlights++;
      summary.totalRevenue += flight.revenue || 0;
      if (!summary.aircraftList.includes(flight.registration)) {
        summary.aircraftList.push(flight.registration);
        summary.uniqueAircraft++;
      }
      // Group flights by date
      const dateKey = flight.date;
      if (!summary.flightsByDate.has(dateKey)) {
        summary.flightsByDate.set(dateKey, []);
      }
      summary.flightsByDate.get(dateKey)!.push(flight);
      // Add block hours
      summary.totalBlockHours += calculateBlockTimeMinutes(flight.std, flight.sta);
    });
    return Array.from(summaryMap.values()).sort((a, b) => a.monthNumber - b.monthNumber);
  }, [aircraft]);

  const availableMonths = useMemo(() => {
    return Array.from(new Set(aircraft.map(a => a.monthNumber))).sort((a, b) => a - b);
  }, [aircraft]);

  const displayedSummaries = useMemo(() => {
    if (selectedMonth === "all") {
      return monthlySummaries;
    }
    return monthlySummaries.filter(s => s.monthNumber === parseInt(selectedMonth));
  }, [monthlySummaries, selectedMonth]);

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
        <label className="text-sm font-medium">Filter by Month:</label>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg z-50">
            <SelectItem value="all">All Months</SelectItem>
            {availableMonths.map((month) => (
              <SelectItem key={month} value={month.toString()}>
                {monthNames[month - 1]}
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
                      Across {displayedSummaries.length} month{displayedSummaries.length !== 1 ? 's' : ''}
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
              Across {displayedSummaries.length} month{displayedSummaries.length !== 1 ? 's' : ''}
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
              Average: ${displayedSummaries.length > 0 ? Math.round(totalStats.revenue / displayedSummaries.length).toLocaleString() : 0}/month
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
              <CardTitle>Monthly Summary Table</CardTitle>
              <CardDescription>Detailed breakdown of flights, revenue, and aircraft by month</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
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
                      <TableRow key={summary.monthNumber}>
                        <TableCell className="font-medium">{summary.monthName}</TableCell>
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
            const allDates = Array.from(summary.flightsByDate.keys()).sort();
            const daysInMonth = Math.max(...allDates.map(d => parseInt(d.split('/')[0])));
            const weeks = Math.ceil(daysInMonth / 7);
            
            return (
              <Card key={summary.monthNumber}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-aviation" />
                      {summary.monthName} {new Date().getFullYear()}
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
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div key={day} className="text-center font-semibold text-sm py-2 border-b">
                        {day}
                      </div>
                    ))}
                    
                    {/* Day Cells */}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const dayNum = i + 1;
                      const dayFlights = allDates
                        .filter(date => parseInt(date.split('/')[0]) === dayNum)
                        .map(date => ({
                          date,
                          flights: summary.flightsByDate.get(date)!
                        }))[0];

                      return (
                        <div
                          key={dayNum}
                          className={`min-h-[120px] p-2 border rounded-lg ${
                            dayFlights ? 'bg-card' : 'bg-muted/30'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-muted-foreground">
                                {dayNum}
                              </span>
                              {dayFlights && (
                                <Badge variant="secondary" className="text-xs">
                                  {dayFlights.flights.length}
                                </Badge>
                              )}
                            </div>
                            {dayFlights && (
                              <div className="space-y-1">
                                {dayFlights.flights.slice(0, 2).map((flight) => (
                                  <div
                                    key={flight.id}
                                    className="text-xs p-1.5 bg-muted rounded border-l-2 border-aviation"
                                  >
                                    <div className="font-semibold text-aviation-dark flex items-center gap-1">
                                      <Plane className="h-3 w-3" />
                                      {flight.flightNo}
                                    </div>
                                    <div className="text-muted-foreground truncate">
                                      {flight.registration}
                                    </div>
                                  </div>
                                ))}
                                {dayFlights.flights.length > 2 && (
                                  <div className="text-xs text-center text-muted-foreground">
                                    +{dayFlights.flights.length - 2} more
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
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
