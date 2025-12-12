import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings, RotateCcw } from "lucide-react";
import { useColorSettings, ColorSettings } from "@/hooks/useColorSettings";

interface ColorSettingsDialogProps {
  colors: ColorSettings;
  onUpdateColor: (category: keyof ColorSettings, key: string, color: string) => void;
  onReset: () => void;
}

export function ColorSettingsDialog({ colors, onUpdateColor, onReset }: ColorSettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Color Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Customize Colors</span>
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Flight Types */}
          <div>
            <h3 className="font-semibold mb-3">Flight Types</h3>
            <div className="space-y-2">
              {Object.entries(colors.flightTypes).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="capitalize">{key}</Label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded border" 
                      style={{ backgroundColor: value }}
                    />
                    <Input
                      type="color"
                      value={value}
                      onChange={(e) => onUpdateColor('flightTypes', key, e.target.value)}
                      className="w-12 h-8 p-0 border-0 cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statuses */}
          <div>
            <h3 className="font-semibold mb-3">Flight Statuses</h3>
            <div className="space-y-2">
              {Object.entries(colors.statuses).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="capitalize">{key === 'aog' ? 'AOG' : key}</Label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded border" 
                      style={{ backgroundColor: value }}
                    />
                    <Input
                      type="color"
                      value={value}
                      onChange={(e) => onUpdateColor('statuses', key, e.target.value)}
                      className="w-12 h-8 p-0 border-0 cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Flight Positioning */}
          <div>
            <h3 className="font-semibold mb-3">Flight Positioning</h3>
            <div className="space-y-2">
              {Object.entries(colors.positioning).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>{key === 'live_flight' ? 'Live Flight' : 'Ferry Flight'}</Label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded border" 
                      style={{ backgroundColor: value }}
                    />
                    <Input
                      type="color"
                      value={value}
                      onChange={(e) => onUpdateColor('positioning', key, e.target.value)}
                      className="w-12 h-8 p-0 border-0 cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
