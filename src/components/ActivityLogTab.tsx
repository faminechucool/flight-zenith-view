import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface ActivityLog {
  id: string;
  aircraft_id: string | null;
  field_name: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  changed_at: string | null;
  reason: string | null;
}

export function ActivityLogTab() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatFieldName = (fieldName: string) => {
    const fieldMap: Record<string, string> = {
      registration: 'Registration',
      flightNo: 'Flight No',
      flight_no: 'Flight No',
      status: 'Status',
      flightType: 'Flight Type',
      flight_type: 'Flight Type',
      weekNumber: 'Week Number',
      week_number: 'Week Number',
      date: 'Date',
      flightPositioning: 'Flight Positioning',
      flight_positioning: 'Flight Positioning',
      std: 'STD',
      sta: 'STA',
      adep: 'ADEP',
      ades: 'ADES',
    };
    return fieldMap[fieldName] || fieldName;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Activity Log
        </CardTitle>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No activity logs found</div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Field Changed</TableHead>
                  <TableHead>Old Value</TableHead>
                  <TableHead>New Value</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {log.changed_at 
                        ? format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatFieldName(log.field_name)}</Badge>
                    </TableCell>
                    <TableCell className="text-destructive">{log.old_value || '-'}</TableCell>
                    <TableCell className="text-green-600">{log.new_value || '-'}</TableCell>
                    <TableCell>{log.changed_by}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={log.reason || ''}>
                      {log.reason || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
