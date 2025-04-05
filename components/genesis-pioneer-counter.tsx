"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Card, CardHeader, CardTitle, CardContent, Badge, Progress } from "@/components/ui"
import { Loader2, Users } from "lucide-react"

export default function GenesisPioneerCounter() {
  const [stats, setStats] = useState<PioneerStats | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const { data: extendedStats, error: statsError } = await supabase.rpc('get_extended_pioneer_stats');
        
        if (statsError) {
          console.error('Error fetching extended pioneer stats:', statsError);
          return;
        }

        if (extendedStats && extendedStats.length > 0) {
          setStats({
            genesisPioneers: extendedStats[0].genesis_pioneers,
            totalPioneers: extendedStats[0].total_pioneers,
            genesisPioneersFilled: extendedStats[0].genesis_slots_filled,
            totalRegistrations: extendedStats[0].total_registrations
          });
        }

        const { data: message, error: messageError } = await supabase.rpc('get_pioneer_status_message');
        
        if (messageError) {
          console.error('Error fetching pioneer status message:', messageError);
        } else if (message) {
          setStatusMessage(message);
        }
      } catch (error) {
        console.error('Error in fetching pioneer stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const additionalPioneers = stats?.totalRegistrations 
    ? stats.totalRegistrations - 10000 
    : 0;

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold flex items-center">
            <Users className="h-5 w-5 mr-2 text-primary" />
            Pioneer Stats
          </CardTitle>
          {stats?.genesisPioneersFilled === 10000 && (
            <Badge variant="default" className="bg-gradient-to-r from-primary to-primary/80 animate-pulse">
              Milestone Achieved!
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {stats?.genesisPioneersFilled === 10000 ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 p-4 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center">
                <div className="font-bold text-xl">
                  <span className="text-primary">10,000</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-primary">10,000</span>
                </div>
                <div className="flex items-center">
                  <span className="text-lg mr-1">🎉</span>
                  <span className="font-semibold">Genesis Pioneers</span>
                </div>
              </div>
              
              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">All Genesis slots filled!</div>
                <div className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center">
                  <span className="mr-1">+</span>
                  {additionalPioneers}
                  <span className="ml-1">additional</span>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-primary">Total community:</span> {stats.totalRegistrations.toLocaleString()} pioneers
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Join the growing TAU Network community!
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Genesis Pioneers</span>
              <span className="font-medium">
                {stats?.genesisPioneers?.toLocaleString() || 0}/10,000
              </span>
            </div>
            <Progress value={(stats?.genesisPioneers || 0) / 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {statusMessage || `${10000 - (stats?.genesisPioneers || 0)} spots remaining`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PioneerStats {
  genesisPioneers: number;
  totalPioneers: number;
  genesisPioneersFilled: number;
  totalRegistrations: number;
}
