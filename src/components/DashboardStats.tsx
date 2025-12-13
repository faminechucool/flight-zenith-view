import { Card, CardContent } from "@/components/ui/card";
import { Plane, CheckCircle, AlertTriangle, Clock, Wrench } from "lucide-react";
import { AircraftTableData } from "@/data/mockData";

interface DashboardStatsProps {
  aircraft: AircraftTableData[];
}

// Calculate flight time from STD and STA in minutes
const calculateFlightMinutes = (std: string, sta: string): number => {
  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const startMin = parseTime(std);
  const endMin = parseTime(sta);
  return endMin < startMin ? endMin + 1440 - startMin : endMin - startMin;
};

// Calculate block hours from STD and STA (flight time + 1 hour)
const calculateBlockMinutes = (std: string, sta: string): number => {
  return calculateFlightMinutes(std, sta) + 60;
};

// Format minutes as HH:MM:SS
const formatMinutesToHMS = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const seconds = 0; // We don't track seconds
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function DashboardStats({ aircraft }: DashboardStatsProps) {
  // Calculate stats
  const totalFlights = aircraft.length;
  const operationalFlights = aircraft.filter(a => a.status === "operational").length;
  const aogFlights = aircraft.filter(a => a.status === "aog").length;
  
  // Calculate total block hours (excluding cancelled and AOG)
  const totalBlockMinutes = aircraft.reduce((sum, a) => {
    if (a.status === 'cancelled' || a.status === 'aog') return sum;
    return sum + calculateBlockMinutes(a.std, a.sta);
  }, 0);
  
  // Calculate maintenance hours: sum of flight time when status=maintenance AND flightType=maintenance
  const maintenanceMinutes = aircraft.reduce((sum, a) => {
    if (a.status === 'maintenance' && a.flightType === 'maintenance') {
      return sum + calculateFlightMinutes(a.std, a.sta);
    }
    return sum;
  }, 0);

  const stats = [
    {
      title: "Total Flights",
      value: totalFlights,
      icon: Plane,
      description: "Total flights",
      color: "text-aviation"
    },
    {
      title: "Operational",
      value: operationalFlights,
      icon: CheckCircle,
      description: "Ready for service",
      color: "text-emerald-600"
    },
    {
      title: "AOG",
      value: aogFlights,
      icon: AlertTriangle,
      description: "Aircraft on ground",
      color: "text-destructive"
    },
    {
      title: "Block Hours",
      value: formatMinutesToHMS(totalBlockMinutes),
      icon: Clock,
      description: "block hours",
      color: "text-aviation-secondary"
    },
    {
      title: "Maintenance Hours",
      value: formatMinutesToHMS(maintenanceMinutes),
      icon: Wrench,
      description: "maintenance hours",
      color: "text-aviation-accent"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="bg-card/50 hover:bg-card transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
                <Icon className={`w-6 h-6 ${stat.color} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}