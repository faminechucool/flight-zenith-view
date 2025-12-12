import { Card, CardContent } from "@/components/ui/card";
import { Plane, CheckCircle, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { AircraftTableData } from "@/data/mockData";

interface DashboardStatsProps {
  aircraft: AircraftTableData[];
}

// Calculate block hours from STD and STA (flight time + 1 hour)
const calculateBlockHours = (std: string, sta: string): number => {
  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const startMin = parseTime(std);
  const endMin = parseTime(sta);
  const flightMin = endMin < startMin ? endMin + 1440 - startMin : endMin - startMin;
  // Block hours = flight time + 1 hour (60 minutes)
  return (flightMin + 60) / 60;
};

export function DashboardStats({ aircraft }: DashboardStatsProps) {
  // Calculate stats
  const totalFlights = aircraft.length;
  const operationalFlights = aircraft.filter(a => a.status === "operational").length;
  const aogFlights = aircraft.filter(a => a.status === "aog").length;
  const maintenanceFlights = aircraft.filter(a => a.status === "maintenance").length;
  // Calculate total block hours
  const totalBlockHours = aircraft.reduce((sum, a) => {
    if (a.status === 'cancelled' || a.status === 'aog') return sum;
    return sum + calculateBlockHours(a.std, a.sta);
  }, 0);
  
  const totalCapacityUsed = aircraft.reduce((sum, a) => sum + a.capacityUsed, 0);
  

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
      value: totalBlockHours.toFixed(1),
      icon: Clock,
      description: "block hours",
      color: "text-aviation-secondary"
    },
    {
      title: "Maintenance hours",
      value: maintenanceFlights,
      icon: TrendingUp,
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