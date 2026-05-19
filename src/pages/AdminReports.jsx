import React from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

const STATUS_STYLES = {
  pending: { icon: Clock, color: "bg-accent/20 text-accent border-accent/30" },
  reviewed: { icon: AlertTriangle, color: "bg-secondary/20 text-secondary border-secondary/30" },
  resolved: { icon: CheckCircle, color: "bg-primary/20 text-primary border-primary/30" },
  dismissed: { icon: XCircle, color: "bg-muted text-muted-foreground border-border" },
};

export default function AdminReports() {
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => base44.entities.Report.list("-created_date"),
  });

  const [notes, setNotes] = useState({});

  const updateMutation = useMutation({
    mutationFn: ({ id, status, admin_notes }) => base44.entities.Report.update(id, { status, ...(admin_notes !== undefined ? { admin_notes } : {}) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Admin Reports</h1>
            <p className="font-body text-sm text-muted-foreground">Review and moderate user reports</p>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="text-center py-20 font-body text-muted-foreground">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-heading text-lg font-semibold">All clear</p>
          <p className="font-body text-sm text-muted-foreground">No reports to review right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, i) => {
            const statusInfo = STATUS_STYLES[report.status] || STATUS_STYLES.pending;
            const StatusIcon = statusInfo.icon;
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-semibold text-sm">
                        Report against: {report.reported_user_name || "Unknown"}
                      </span>
                      <Badge variant="outline" className={`text-[10px] border ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {report.status}
                      </Badge>
                    </div>
                    <p className="font-body text-xs text-muted-foreground">
                      Reason: <span className="text-foreground">{report.reason}</span>
                    </p>
                    {report.details && (
                      <p className="font-body text-xs text-muted-foreground">{report.details}</p>
                    )}
                    <p className="font-body text-[10px] text-muted-foreground">
                      By {report.reporter_email} · {format(new Date(report.created_date), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[160px]">
                    <Select
                      value={report.status}
                      onValueChange={(val) => updateMutation.mutate({ id: report.id, status: val })}
                    >
                      <SelectTrigger className="w-full font-body text-xs bg-muted border-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="dismissed">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Admin notes..."
                      className="font-body text-xs bg-muted border-0 min-h-[60px] resize-none"
                      value={notes[report.id] ?? (report.admin_notes || "")}
                      onChange={(e) => setNotes(n => ({ ...n, [report.id]: e.target.value }))}
                      onBlur={() => {
                        if (notes[report.id] !== undefined) {
                          updateMutation.mutate({ id: report.id, status: report.status, admin_notes: notes[report.id] });
                        }
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}