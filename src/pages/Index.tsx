import { useState, useMemo } from "react";
import { AircraftTable } from "@/components/AircraftTable";
import { FilterPanel, FilterState } from "@/components/FilterPanel";
import { DashboardStats } from "@/components/DashboardStats";
import { WeeklySummary } from "@/components/WeeklySummary";
import { MonthlySummary } from "@/components/MonthlySummary";
import { CreateFlightForm } from "@/components/CreateFlightForm";
import { GanttView } from "@/components/GanttView";
import { ExcelView } from "@/components/ExcelView";
import { mockAircraftTableData } from "@/data/mockData";
import { useAircraftData } from "@/hooks/useAircraftData";
import { Plane } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 15;

const Index = () => {
  const { aircraft: dbAircraft, loading, updateAircraft, refetch } = useAircraftData();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    registration: "",
    status: [],
    flightType: [],
    operator: "",
    clientName: ""
  });

  // Use database data if available, otherwise fallback to mock data
  const aircraftData = dbAircraft.length > 0 ? dbAircraft : mockAircraftTableData;

  const filteredAircraft = useMemo(() => {
    return aircraftData.filter((aircraft) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!aircraft.flightNo.toLowerCase().includes(searchLower) &&
            !aircraft.operator.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Registration filter
      if (filters.registration && aircraft.registration !== filters.registration) {
        return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(aircraft.status)) {
        return false;
      }

      // Flight type filter
      if (filters.flightType.length > 0 && !filters.flightType.includes(aircraft.flightType)) {
        return false;
      }

      // Operator filter
      if (filters.operator && aircraft.operator !== filters.operator) {
        return false;
      }

      // Client name filter
      if (filters.clientName && aircraft.clientName !== filters.clientName) {
        return false;
      }

      return true;
    });
  }, [aircraftData, filters]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAircraft.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAircraft = filteredAircraft.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const clearFilters = () => {
    setFilters({
      search: "",
      registration: "",
      status: [],
      flightType: [],
      operator: "",
      clientName: ""
    });
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-6 border-b">
          <div className="w-10 h-10 bg-aviation rounded-lg flex items-center justify-center">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-aviation-dark">Aircraft Capacity Management</h1>
            <p className="text-muted-foreground">Monitor fleet status, utilization, and flight operations</p>
          </div>
        </div>

        {/* Stats Overview */}
        <DashboardStats aircraft={filteredAircraft} />

        {/* Tabs */}
        <Tabs defaultValue="operations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="operations">Flight Operations</TabsTrigger>
            <TabsTrigger value="create">Create Flight</TabsTrigger>
            <TabsTrigger value="gantt">Gantt View</TabsTrigger>
            <TabsTrigger value="excel">Excel View</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Summary</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
          </TabsList>

          {/* Flight Operations Tab */}
          <TabsContent value="operations" className="space-y-6">
            {/* Filter Panel */}
            <FilterPanel 
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={clearFilters}
              aircraftData={aircraftData}
            />

            {/* Aircraft Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-aviation-dark">
                  Flight Operations ({filteredAircraft.length} total)
                </h2>
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
              
              {filteredAircraft.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No flights match the current filters</p>
                </div>
              ) : (
                <>
                  <AircraftTable aircraft={paginatedAircraft} onUpdate={updateAircraft} />
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pt-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage > 1) setCurrentPage(currentPage - 1);
                              }}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                          
                          {/* First page */}
                          {currentPage > 3 && (
                            <>
                              <PaginationItem>
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(1);
                                  }}
                                >
                                  1
                                </PaginationLink>
                              </PaginationItem>
                              {currentPage > 4 && (
                                <PaginationItem>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              )}
                            </>
                          )}
                          
                          {/* Page numbers around current page */}
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            if (pageNum < 1 || pageNum > totalPages) return null;
                            
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  href="#"
                                  isActive={currentPage === pageNum}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(pageNum);
                                  }}
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          
                          {/* Last page */}
                          {currentPage < totalPages - 2 && (
                            <>
                              {currentPage < totalPages - 3 && (
                                <PaginationItem>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              )}
                              <PaginationItem>
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(totalPages);
                                  }}
                                >
                                  {totalPages}
                                </PaginationLink>
                              </PaginationItem>
                            </>
                          )}
                          
                          <PaginationItem>
                            <PaginationNext 
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                              }}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Create Flight Tab */}
          <TabsContent value="create">
            <CreateFlightForm onFlightCreated={refetch} />
          </TabsContent>

          {/* Gantt View Tab */}
          <TabsContent value="gantt">
            <GanttView aircraft={filteredAircraft} onUpdateFlight={updateAircraft} />
          </TabsContent>

          {/* Excel View Tab */}
          <TabsContent value="excel">
            <ExcelView aircraft={filteredAircraft} onUpdate={updateAircraft} />
          </TabsContent>

          {/* Weekly Summary Tab */}
          <TabsContent value="weekly">
            <WeeklySummary aircraft={aircraftData} />
          </TabsContent>

          {/* Monthly Summary Tab */}
          <TabsContent value="monthly">
            <MonthlySummary aircraft={aircraftData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
