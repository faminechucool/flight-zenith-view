import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, AlertTriangle, Wrench, Clock } from "lucide-react";

export interface Aircraft {
  id: string;
  registration: string;
  model: string;
  status: "operational" | "aog" | "maintenance" | "cancelled";
  flights: {
    charter: number;
    schedule: number;
    acmi: number;
    maintenance: number;
    adhoc: number;
  };
  utilization: number;
  location: string;
  nextFlight?: string;
}

interface AircraftCardProps {
  aircraft: Aircraft;
}

const statusConfig = {
  operational: {
    color: "bg-status-operational text-white",
    icon: Plane,
    label: "Operational"
  },
  aog: {
    color: "bg-status-critical text-white",
    icon: AlertTriangle,
    label: "AOG"
  },
  maintenance: {
    color: "bg-status-maintenance text-white",
    icon: Wrench,
    label: "Maintenance"
  },
  cancelled: {
    color: "bg-status-warning text-white",
    icon: Clock,
    label: "Cancelled"
  }
};

export function AircraftCard({ aircraft }: AircraftCardProps) {
  const statusInfo = statusConfig[aircraft.status];
  const StatusIcon = statusInfo.icon;
  const totalFlights = aircraft.flights.charter + aircraft.flights.schedule + aircraft.flights.acmi;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-aviation">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-aviation-dark">
            {aircraft.registration}
          </CardTitle>
          <Badge className={statusInfo.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{aircraft.model}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded bg-flightType-charter/10">
            <div className="text-lg font-bold text-flightType-charter">{aircraft.flights.charter}</div>
            <div className="text-xs text-muted-foreground">Charter</div>
          </div>
          <div className="p-2 rounded bg-flightType-schedule/10">
            <div className="text-lg font-bold text-flightType-schedule">{aircraft.flights.schedule}</div>
            <div className="text-xs text-muted-foreground">Schedule</div>
          </div>
          <div className="p-2 rounded bg-flightType-acmi/10">
            <div className="text-lg font-bold text-flightType-acmi">{aircraft.flights.acmi}</div>
            <div className="text-xs text-muted-foreground">ACMI</div>
          </div>
          <div className="p-2 rounded bg-flightType-maintenance/10">
            <div className="text-lg font-bold text-flightType-maintenance">{aircraft.flights.maintenance}</div>
            <div className="text-xs text-muted-foreground">Maintenance</div>
          </div>
          <div className="p-2 rounded bg-flightType-adhoc/10">
            <div className="text-lg font-bold text-flightType-adhoc">{aircraft.flights.adhoc}</div>
            <div className="text-xs text-muted-foreground">Adhoc</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Utilization</span>
            <span className="font-medium">{aircraft.utilization}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-aviation h-2 rounded-full transition-all duration-300"
              style={{ width: `${aircraft.utilization}%` }}
            />
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Location</span>
            <span className="font-medium">{aircraft.location}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Flights</span>
            <span className="font-medium">{totalFlights}</span>
          </div>
          {aircraft.nextFlight && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Next Flight</span>
              <span className="font-medium text-aviation">{aircraft.nextFlight}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}