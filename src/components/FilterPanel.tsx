import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

export interface FilterState {
  search: string;
  registration: string;
  status: string[];
  flightType: string[];
  operator: string;
  clientName: string;
}

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  aircraftData: Array<{registration: string}>;
}

export const FilterPanel = ({ filters, onFiltersChange, onClearFilters, aircraftData }: FilterPanelProps) => {
  const updateFilters = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Get unique values for filter options
  const statusOptions = ["operational", "aog", "maintenance", "cancelled"];
  const flightTypeOptions = ["charter", "schedule", "acmi"];
  const operatorOptions = ["Romcargo", "Aerotranscargo", "One Air", "Alpha Sky"];
  const clientOptions = ["Cargo Express Ltd", "International Logistics", "One Air Services", "Alpha Sky Corporation", "European Freight Co", "Premium Cargo Services", "Global Air Transport", "Regional ACMI Solutions"];
  const registrationOptions = [...new Set(aircraftData.map(aircraft => aircraft.registration))].sort();

  const toggleArrayFilter = (key: 'status' | 'flightType', value: string) => {
    const currentArray = filters[key];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilters(key, newArray);
  };

  const hasActiveFilters = 
    filters.search || 
    filters.registration ||
    filters.status.length > 0 || 
    filters.flightType.length > 0 || 
    filters.operator ||
    filters.clientName;

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClearFilters}
              className="text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium">
              Search
            </Label>
            <Input
              id="search"
              placeholder="Flight no, operator..."
              value={filters.search}
              onChange={(e) => updateFilters('search', e.target.value)}
            />
          </div>

          {/* Registration Dropdown */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Registration</Label>
            <Select value={filters.registration} onValueChange={(value) => updateFilters('registration', value === 'all' ? '' : value)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select registration" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="all">All Registrations</SelectItem>
                {registrationOptions.map((registration) => (
                  <SelectItem key={registration} value={registration}>
                    {registration}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <div key={status} className="flex items-center space-x-1">
                  <Checkbox
                    id={`status-${status}`}
                    checked={filters.status.includes(status)}
                    onCheckedChange={() => toggleArrayFilter('status', status)}
                  />
                  <Label 
                    htmlFor={`status-${status}`}
                    className="text-xs cursor-pointer capitalize"
                  >
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Flight Type Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Flight Type</Label>
            <div className="flex flex-wrap gap-2">
              {flightTypeOptions.map((type) => (
                <div key={type} className="flex items-center space-x-1">
                  <Checkbox
                    id={`flight-${type}`}
                    checked={filters.flightType.includes(type)}
                    onCheckedChange={() => toggleArrayFilter('flightType', type)}
                  />
                  <Label 
                    htmlFor={`flight-${type}`}
                    className="text-xs cursor-pointer uppercase"
                  >
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Operator Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Operator</Label>
            <Select value={filters.operator} onValueChange={(value) => updateFilters('operator', value === 'all' ? '' : value)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="all">All Operators</SelectItem>
                {operatorOptions.map((operator) => (
                  <SelectItem key={operator} value={operator}>
                    {operator}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Name Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Client</Label>
            <Select value={filters.clientName} onValueChange={(value) => updateFilters('clientName', value === 'all' ? '' : value)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="all">All Clients</SelectItem>
                {clientOptions.map((client) => (
                  <SelectItem key={client} value={client}>
                    {client}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};