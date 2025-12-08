import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { History, Clock, User, Edit } from "lucide-react"
import { useActivityLog } from "@/hooks/useActivityLog"
import { format } from "date-fns"

interface ActivityLogDialogProps {
  aircraftId?: string
  registration?: string
}

export const ActivityLogDialog = ({ aircraftId, registration }: ActivityLogDialogProps) => {
  const { activityLog, loading } = useActivityLog(aircraftId)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <History className="h-3 w-3" />
          Activity Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Activity Log {registration && `- ${registration}`}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aviation"></div>
            </div>
          ) : activityLog.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activity recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activityLog.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Edit className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">
                          {entry.field_name === 'registration' ? 'Registration' : 'Flight Number'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">From:</span>
                          <code className="bg-red-50 text-red-700 px-2 py-1 rounded">
                            {entry.old_value}
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">To:</span>
                          <code className="bg-green-50 text-green-700 px-2 py-1 rounded">
                            {entry.new_value}
                          </code>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1 mb-1">
                        <User className="h-3 w-3" />
                        <span>{entry.changed_by}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(entry.changed_at), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}