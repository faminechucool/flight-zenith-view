export interface AircraftTableData {
  id: string;
  weekNumber: number;
  monthNumber: number;
  registration: string;
  flightNo: string;
  day: string;
  date: string;
  std: string;
  adep: string;
  ades:string;
  sta: string;
  operator: string;
  flightType: "charter" | "schedule" | "acmi";
  totalCapacity: number;
  capacityUsed: number;
  capacityAvailable: number;
  status: "operational" | "aog" | "maintenance" | "cancelled";
  clientName: string;
  contractId: string;
  revenue: number;
  flightPositioning: "live_flight" | "ferry_flight";
}

export const mockAircraftTableData: AircraftTableData[] = [
  {
    id: "1",
    weekNumber: 3,
    monthNumber: 1,
    registration: "N747BA",
    flightNo: "ROM001",
    day: "Monday",
    date: "15/01",
    std: "14:30",
    adep: "JFK",
    sta: "17:45",
    operator: "Romcargo",
    flightType: "schedule",
    totalCapacity: 180,
    capacityUsed: 156,
    capacityAvailable: 24,
    status: "operational",
    clientName: "Cargo Express Ltd",
    contractId: "CTR-2024-001",
    revenue: 78000,
    flightPositioning: "live_flight",
    ades: ""
  },
  {
    id: "2",
    weekNumber: 3,
    monthNumber: 1,
    registration: "A320EZ",
    flightNo: "ATC002",
    day: "Tuesday",
    date: "16/01",
    std: "09:15",
    adep: "LAX",
    sta: "14:30",
    operator: "Aerotranscargo",
    flightType: "charter",
    totalCapacity: 150,
    capacityUsed: 138,
    capacityAvailable: 12,
    status: "operational",
    clientName: "International Logistics",
    contractId: "CTR-2024-002",
    revenue: 69000,
    flightPositioning: "live_flight",
    ades: ""
  },
  {
    id: "3",
    weekNumber: 3,
    monthNumber: 1,
    registration: "B737MAX",
    flightNo: "OAR003",
    day: "Wednesday",
    date: "17/01",
    std: "00:00",
    adep: "ORD",
    sta: "00:00",
    operator: "One Air",
    flightType: "schedule",
    totalCapacity: 189,
    capacityUsed: 0,
    capacityAvailable: 0,
    status: "aog",
    clientName: "One Air Services",
    contractId: "CTR-2024-003",
    revenue: 0,
    flightPositioning: "ferry_flight",
    ades: ""
  },
  {
    id: "4",
    weekNumber: 4,
    monthNumber: 1,
    registration: "A380LH",
    flightNo: "ALS004",
    day: "Thursday",
    date: "18/01",
    std: "11:00",
    adep: "DEN",
    sta: "13:45",
    operator: "Alpha Sky",
    flightType: "acmi",
    totalCapacity: 200,
    capacityUsed: 90,
    capacityAvailable: 110,
    status: "maintenance",
    clientName: "Alpha Sky Corporation",
    contractId: "CTR-2024-004",
    revenue: 0,
    flightPositioning: "live_flight",
    ades: ""
  },
  {
    id: "5",
    weekNumber: 4,
    monthNumber: 1,
    registration: "B777ER",
    flightNo: "ROM005",
    day: "Friday",
    date: "19/01",
    std: "16:45",
    adep: "SEA",
    sta: "06:30",
    operator: "Romcargo",
    flightType: "schedule",
    totalCapacity: 242,
    capacityUsed: 230,
    capacityAvailable: 12,
    status: "operational",
    clientName: "European Freight Co",
    contractId: "CTR-2024-005",
    revenue: 115000,
    flightPositioning: "live_flight",
    ades: ""
  },
  {
    id: "6",
    weekNumber: 4,
    monthNumber: 1,
    registration: "A350XW",
    flightNo: "ATC006",
    day: "Saturday",
    date: "20/01",
    std: "22:10",
    adep: "MIA",
    sta: "12:15",
    operator: "Aerotranscargo",
    flightType: "charter",
    totalCapacity: 293,
    capacityUsed: 228,
    capacityAvailable: 65,
    status: "operational",
    clientName: "Premium Cargo Services",
    contractId: "CTR-2024-006",
    revenue: 114000,
    flightPositioning: "live_flight",
    ades: ""
  },
  {
    id: "7",
    weekNumber: 4,
    monthNumber: 1,
    registration: "B787DL",
    flightNo: "OAR007",
    day: "Sunday",
    date: "21/01",
    std: "00:00",
    adep: "BOS",
    sta: "00:00",
    operator: "One Air",
    flightType: "schedule",
    totalCapacity: 396,
    capacityUsed: 0,
    capacityAvailable: 0,
    status: "cancelled",
    clientName: "Global Air Transport",
    contractId: "CTR-2024-007",
    revenue: 0,
    flightPositioning: "ferry_flight",
    ades: ""
  },
  {
    id: "8",
    weekNumber: 3,
    monthNumber: 1,
    registration: "A321NX",
    flightNo: "ALS008",
    day: "Monday",
    date: "22/01",
    std: "11:20",
    adep: "PHX",
    sta: "14:55",
    operator: "Alpha Sky",
    flightType: "acmi",
    totalCapacity: 100,
    capacityUsed: 88,
    capacityAvailable: 12,
    status: "operational",
    clientName: "Regional ACMI Solutions",
    contractId: "CTR-2024-008",
    revenue: 44000,
    flightPositioning: "live_flight",
    ades: ""
  }
];
