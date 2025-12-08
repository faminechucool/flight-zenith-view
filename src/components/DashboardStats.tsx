import { Card, CardContent } from "@/components/ui/card";
import { Plane, CheckCircle, AlertTriangle, Calendar, TrendingUp } from "lucide-react";
import { AircraftTableData } from "@/data/mockData";

interface DashboardStatsProps {
  aircraft: AircraftTableData[];
}

export function DashboardStats({ aircraft }: DashboardStatsProps) {
  // Calculate stats
  const totalAircraft = aircraft.length;
  const operationalAircraft = aircraft.filter(a => a.status === "operational").length;
  const aogAircraft = aircraft.filter(a => a.status === "aog").length;
  
  const totalCapacity = aircraft.reduce((sum, a) => sum + a.totalCapacity, 0);
  const totalCapacityUsed = aircraft.reduce((sum, a) => sum + a.capacityUsed, 0);
  
  const avgCapacityUtilization = totalCapacity > 0 
    ? Math.round((totalCapacityUsed / totalCapacity) * 100)
    : 0;

  const stats = [
    {
      title: "Total Aircraft",
      value: totalAircraft,
      icon: Plane,
      description: "Fleet size",
      color: "text-aviation"
    },
    {
      title: "Operational",
      value: operationalAircraft,
      icon: CheckCircle,
      description: "Ready for service",
      color: "text-emerald-600"
    },
    {
      title: "AOG",
      value: aogAircraft,
      icon: AlertTriangle,
      description: "Aircraft on ground",
      color: "text-destructive"
    },
    {
      title: "Total Capacity",
      value: totalCapacity,
      icon: Calendar,
      description: "All aircraft seats",
      color: "text-aviation-secondary"
    },
    {
      title: "Capacity Utilization",
      value: `${avgCapacityUtilization}%`,
      icon: TrendingUp,
      description: "Average seat usage",
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