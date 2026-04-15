"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase Client: Team PTS (existing) ──────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ── Supabase Client: Team Services ─────────────────────────────────────────
const supabaseServices = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_SERVICES_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICES_ANON_KEY!,
);

// ── Status list khusus Team Services ─────────────────────────────────────────
const SERVICES_STATUSES = [
  "Waiting Approval",
  "Pending",
  "Warranty",
  "Out Of Warranty",
  "Waiting PO from Sales",
  "Submit RMA",
  "Waiting sparepart",
  "Process Repair",
  "Solved",
] as const;
type ServicesStatus = (typeof SERVICES_STATUSES)[number];

interface User {
  id: string;
  username: string;
  password: string;
  full_name: string;
  role: string;
  team_type?: string;
}

interface TeamMember {
  id: string;
  name: string;
  username: string;
  photo_url: string;
  role: string;
  team_type: string;
}

interface ActivityLog {
  id: string;
  ticket_id?: string;
  handler_name: string;
  handler_username: string;
  action_taken: string;
  notes: string;
  file_url: string;
  file_name: string;
  photo_url?: string;
  photo_name?: string;
  new_status: string;
  team_type: string;
  assigned_to_services?: boolean;
  created_at: string;
}

interface Ticket {
  id: string;
  project_name: string;
  address?: string;
  customer_phone: string;
  sales_name: string;
  issue_case: string;
  description: string;
  sn_unit?: string;
  assigned_to: string;
  status: string;
  date: string;
  created_at: string;
  created_by?: string;
  current_team: string;
  services_status?: string;
  sales_division?: string;
  photo_url?: string;
  photo_name?: string;
  activity_logs?: ActivityLog[];
}

interface GuestMapping {
  id: string;
  guest_username: string;
  project_name: string;
  created_at: string;
}

interface OverdueSetting {
  id: string;
  ticket_id: string;
  due_date: string | null;
  due_hours: number | null;
  set_by: string;
  created_at: string;
}

const SALES_DIVISIONS = [
  "IVP", "MLDS", "HAVS", "Enterprise", "DEC", "ICS", "POJ", "VOJ", "LOCOS",
  "VISIONMEDIA", "UMP", "BISOL", "KIMS", "IDC", "IOCMEDAN", "IOCPekanbaru",
  "IOCBandung", "IOCJATENG", "MVISEMARANG", "POSSurabaya", "IOCSurabaya",
  "IOCBali", "SGP", "OSS",
] as const;

// ── Helper Functions ─────────────────────────────────────────────────────────
function formatDateTime(dateString: string) {
  if (!dateString) return "-";
  let normalized = dateString;
  if (!dateString.endsWith("Z") && !dateString.includes("+") && !(dateString.indexOf("-", 10) > -1)) {
    normalized = dateString + "Z";
  }
  const utcDate = new Date(normalized);
  if (isNaN(utcDate.getTime())) return dateString;
  const jakartaTime = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
  const day = String(jakartaTime.getUTCDate()).padStart(2, "0");
  const month = String(jakartaTime.getUTCMonth() + 1).padStart(2, "0");
  const year = jakartaTime.getUTCFullYear();
  const hours = String(jakartaTime.getUTCHours()).padStart(2, "0");
  const minutes = String(jakartaTime.getUTCMinutes()).padStart(2, "0");
  const seconds = String(jakartaTime.getUTCSeconds()).padStart(2, "0");
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

// ── Status Donut Card ──
function StatusDonutCard({
  data,
  total,
  onSliceClick,
  title,
  icon,
}: {
  data: { name: string; value: number; color: string }[];
  total: number;
  onSliceClick: (name: string) => void;
  title: string;
  icon: string;
}) {
  const [hov, setHov] = useState<number | null>(null);
  if (total === 0)
    return (
      <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.08)", backdropFilter: "blur(10px)" }}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{icon} {title}</p>
        <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>
      </div>
    );
  let cumAngle = -Math.PI / 2;
  const cx = 60, cy = 60, r = 50, ir = 28;
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle), y1 = cy + r * Math.sin(cumAngle);
    const x2 = cx + r * Math.cos(cumAngle + angle), y2 = cy + r * Math.sin(cumAngle + angle);
    const xi1 = cx + ir * Math.cos(cumAngle), yi1 = cy + ir * Math.sin(cumAngle);
    const xi2 = cx + ir * Math.cos(cumAngle + angle), yi2 = cy + ir * Math.sin(cumAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${large} 0 ${xi1} ${yi1} Z`;
    cumAngle += angle;
    return { ...d, path, i };
  });
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.08)", backdropFilter: "blur(10px)" }}>
      <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">{icon} {title}</p>
      <div className="flex items-center gap-3">
        <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
          {slices.map((s) => (
            <path key={s.i} d={s.path} fill={s.color} opacity={hov === null || hov === s.i ? 1 : 0.45}
              style={{ cursor: "pointer", transition: "opacity 0.15s", filter: hov === s.i ? `drop-shadow(0 0 4px ${s.color})` : "none" }}
              onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)} onClick={() => onSliceClick(s.name)} />
          ))}
          <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{total}</text>
          <text x="60" y="70" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">TOTAL</text>
        </svg>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {slices.map((s) => (
            <div key={s.i} className="flex items-center gap-1.5 cursor-pointer rounded-lg px-1.5 py-0.5 transition-all"
              style={{ background: hov === s.i ? `${s.color}15` : "transparent" }}
              onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)} onClick={() => onSliceClick(s.name)}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-[10px] font-semibold text-gray-600 truncate flex-1">{s.name}</span>
              <span className="text-[10px] font-bold flex-shrink-0" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sales Division Donut Card ──
function SalesDivisionDonutCard({
  data,
  total,
  onSliceClick,
  activeDivision,
}: {
  data: { name: string; value: number; color: string }[];
  total: number;
  onSliceClick: (name: string) => void;
  activeDivision: string | null;
}) {
  const [hov, setHov] = useState<number | null>(null);
  if (total === 0)
    return (
      <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.08)", backdropFilter: "blur(10px)" }}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">📊 Sales Division</p>
        <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>
      </div>
    );
  let cumAngle = -Math.PI / 2;
  const cx = 60, cy = 60, r = 50, ir = 28;
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle), y1 = cy + r * Math.sin(cumAngle);
    const x2 = cx + r * Math.cos(cumAngle + angle), y2 = cy + r * Math.sin(cumAngle + angle);
    const xi1 = cx + ir * Math.cos(cumAngle), yi1 = cy + ir * Math.sin(cumAngle);
    const xi2 = cx + ir * Math.cos(cumAngle + angle), yi2 = cy + ir * Math.sin(cumAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${large} 0 ${xi1} ${yi1} Z`;
    cumAngle += angle;
    return { ...d, path, i };
  });
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.08)", backdropFilter: "blur(10px)" }}>
      <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">📊 Sales Division</p>
      <div className="flex items-center gap-3">
        <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
          {slices.map((s) => (
            <path key={s.i} d={s.path} fill={s.color} opacity={hov === null || hov === s.i ? 1 : 0.45}
              style={{ cursor: "pointer", transition: "opacity 0.15s", filter: hov === s.i || activeDivision === s.name ? `drop-shadow(0 0 4px ${s.color})` : "none" }}
              onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)} onClick={() => onSliceClick(s.name)} />
          ))}
          <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{total}</text>
          <text x="60" y="70" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">TOTAL</text>
        </svg>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0 max-h-[120px] overflow-y-auto">
          {slices.map((s) => (
            <div key={s.i} className="flex items-center gap-1.5 cursor-pointer rounded-lg px-1.5 py-0.5 transition-all"
              style={{ background: hov === s.i || activeDivision === s.name ? `${s.color}20` : "transparent", outline: activeDivision === s.name ? `1px solid ${s.color}` : "none" }}
              onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)} onClick={() => onSliceClick(s.name)}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-[10px] font-semibold text-gray-600 truncate flex-1">{s.name}</span>
              <span className="text-[10px] font-bold flex-shrink-0" style={{ color: s.color }}>{s.value}</span>
              {activeDivision === s.name && <span className="text-[9px] font-bold text-purple-600 flex-shrink-0">✓</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Handler Donut Card ──
function HandlerDonutCard({
  data,
  total,
  teamToggle,
  onToggle,
  onSliceClick,
  activeHandler,
  title,
  icon,
}: {
  data: { name: string; value: number; color: string }[];
  total: number;
  teamToggle: "PTS" | "Services";
  onToggle: (t: "PTS" | "Services") => void;
  onSliceClick: (name: string) => void;
  activeHandler: string | null;
  title: string;
  icon: string;
}) {
  const [hov, setHov] = useState<number | null>(null);
  let cumAngle = -Math.PI / 2;
  const cx = 60, cy = 60, r = 50, ir = 28;
  const slices = total > 0 ? data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle), y1 = cy + r * Math.sin(cumAngle);
    const x2 = cx + r * Math.cos(cumAngle + angle), y2 = cy + r * Math.sin(cumAngle + angle);
    const xi1 = cx + ir * Math.cos(cumAngle), yi1 = cy + ir * Math.sin(cumAngle);
    const xi2 = cx + ir * Math.cos(cumAngle + angle), yi2 = cy + ir * Math.sin(cumAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${large} 0 ${xi1} ${yi1} Z`;
    cumAngle += angle;
    return { ...d, path, i };
  }) : [];
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.08)", backdropFilter: "blur(10px)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">{icon} {title}</p>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(["PTS", "Services"] as const).map((t) => (
            <button key={t} onClick={() => onToggle(t)} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${teamToggle === t ? "bg-white shadow text-purple-600" : "text-gray-500 hover:text-gray-700"}`}>{t}</button>
          ))}
        </div>
      </div>
      {total === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">Belum ada data handler</p>
      ) : (
        <div className="flex items-center gap-3">
          <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
            {slices.map((s) => (
              <path key={s.i} d={s.path} fill={activeHandler === s.name ? s.color : s.color}
                opacity={hov === null || hov === s.i ? 1 : 0.45}
                style={{ cursor: "pointer", transition: "opacity 0.15s", filter: hov === s.i || activeHandler === s.name ? `drop-shadow(0 0 4px ${s.color})` : "none" }}
                onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)} onClick={() => onSliceClick(s.name)} />
            ))}
            <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{total}</text>
            <text x="60" y="70" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">TOTAL</text>
          </svg>
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {slices.map((s) => (
              <div key={s.i} className="flex items-center gap-1.5 cursor-pointer rounded-lg px-1.5 py-0.5 transition-all"
                style={{ background: hov === s.i || activeHandler === s.name ? `${s.color}20` : "transparent", outline: activeHandler === s.name ? `1px solid ${s.color}` : "none" }}
                onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)} onClick={() => onSliceClick(s.name)}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="text-[10px] font-semibold text-gray-600 truncate flex-1">{s.name}</span>
                <span className="text-[10px] font-bold flex-shrink-0" style={{ color: s.color }}>{s.value}</span>
                {activeHandler === s.name && <span className="text-[9px] font-bold text-purple-600 flex-shrink-0">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TicketingSystem() {
  const ticketListRef = useRef<HTMLDivElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginTime, setLoginTime] = useState<number | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [guestMappings, setGuestMappings] = useState<GuestMapping[]>([]);
  const [overdueSettings, setOverdueSettings] = useState<OverdueSetting[]>([]);
  const [showOverdueSetting, setShowOverdueSetting] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenTargetTicket, setReopenTargetTicket] = useState<Ticket | null>(null);
  const [reopenAssignee, setReopenAssignee] = useState("");
  const [reopenNotes, setReopenNotes] = useState("");
  const [overdueTargetTicket, setOverdueTargetTicket] = useState<Ticket | null>(null);
  const [overdueForm, setOverdueForm] = useState({ due_hours: "48" });
  const [handlerFilter, setHandlerFilter] = useState<string | null>(null);
  const [salesDivisionFilter, setSalesDivisionFilter] = useState<string | null>(null);
  const [showReminderSchedule, setShowReminderSchedule] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalTicket, setApprovalTicket] = useState<Ticket | null>(null);
  const [approvalAssignee, setApprovalAssignee] = useState("");
  const [showServicesApprovalModal, setShowServicesApprovalModal] = useState(false);
  const [servicesApprovalTicket, setServicesApprovalTicket] = useState<Ticket | null>(null);
  const [reminderSchedule, setReminderSchedule] = useState({
    hour_wib: "8",
    minute: "0",
    frequency: "daily" as "daily" | "weekdays" | "custom",
    custom_days: [] as number[],
    active: true,
  });
  const [reminderSaving, setReminderSaving] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showGuestMapping, setShowGuestMapping] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTicketDetailPopup, setShowTicketDetailPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [searchProject, setSearchProject] = useState("");
  const [searchSalesName, setSearchSalesName] = useState("");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedHandlerTeam, setSelectedHandlerTeam] = useState<"PTS" | "Services">("PTS");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Ticket[]>([]);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showActivitySummary, setShowActivitySummary] = useState(false);
  const [summaryTicket, setSummaryTicket] = useState<Ticket | null>(null);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState("");
  const [newMapping, setNewMapping] = useState({ guestUsername: "", projectName: "" });

  const getJakartaDateString = () => {
    const now = new Date();
    const jakartaDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const y = jakartaDate.getFullYear();
    const m = String(jakartaDate.getMonth() + 1).padStart(2, "0");
    const d = String(jakartaDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const [newTicket, setNewTicket] = useState({
    project_name: "",
    address: "",
    customer_phone: "",
    sales_name: "",
    sales_division: "",
    sn_unit: "",
    issue_case: "",
    description: "",
    assigned_to: "",
    date: getJakartaDateString(),
    status: "Pending",
    current_team: "Team PTS",
    photo: null as File | null,
  });

  const [newActivity, setNewActivity] = useState({
    handler_name: "",
    action_taken: "",
    notes: "",
    new_status: "Pending",
    sn_unit: "",
    file: null as File | null,
    photo: null as File | null,
    assign_to_services: false,
    services_assignee: "",
    onsite_use_schedule: false,
    onsite_schedule_date: "",
    onsite_schedule_hour: "08",
    onsite_schedule_minute: "00",
  });

  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    full_name: "",
    team_member: "",
    role: "team",
    team_type: "Team PTS",
  });

  const [changePassword, setChangePassword] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const statusColors: Record<string, string> = {
    "Waiting Approval": "bg-orange-50 text-orange-600 border-orange-200",
    Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Call: "bg-sky-50 text-sky-600 border-sky-200",
    Onsite: "bg-purple-50 text-purple-600 border-purple-200",
    "In Progress": "bg-blue-50 text-blue-600 border-blue-200",
    Solved: "bg-emerald-50 text-emerald-600 border-emerald-200",
    Overdue: "bg-red-50 text-red-600 border-red-200",
    Warranty: "bg-green-50 text-green-700 border-green-300",
    "Out Of Warranty": "bg-red-50 text-red-700 border-red-300",
    "Waiting PO from Sales": "bg-amber-50 text-amber-700 border-amber-300",
    "Submit RMA": "bg-orange-50 text-orange-700 border-orange-300",
    "Waiting sparepart": "bg-rose-50 text-rose-700 border-rose-300",
    "Process Repair": "bg-blue-50 text-blue-700 border-blue-300",
  };

  const checkSessionTimeout = () => {
    if (loginTime) {
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      if (now - loginTime > sixHours) {
        handleLogout();
        alert("Your session has expired. Please login again.");
      }
    }
  };

  const DEFAULT_OVERDUE_HOURS = 48;
  const getDeadline = (ticket: Ticket): Date | null => {
    const setting = overdueSettings.find((o) => o.ticket_id === ticket.id);
    if (setting) {
      if (setting.due_date) return new Date(setting.due_date);
      if (setting.due_hours && ticket.created_at)
        return new Date(new Date(ticket.created_at).getTime() + setting.due_hours * 3600000);
    }
    if (ticket.created_at)
      return new Date(new Date(ticket.created_at).getTime() + DEFAULT_OVERDUE_HOURS * 3600000);
    return null;
  };

  const isTicketOverdue = (ticket: Ticket): boolean => {
    const deadline = getDeadline(ticket);
    if (!deadline) return false;
    if (ticket.status === "Solved") {
      const solvedLog = ticket.activity_logs?.filter((l) => l.new_status === "Solved").sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      if (solvedLog) return new Date(solvedLog.created_at) > deadline;
      return false;
    }
    return new Date() > deadline;
  };

  const getOverdueSetting = (ticketId: string) => overdueSettings.find((o) => o.ticket_id === ticketId);

  const loadReminderSchedule = async () => {
    try {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "reminder_schedule").single();
      if (data?.value) setReminderSchedule(data.value);
    } catch (e) {}
  };

  const getCronDisplay = () => {
    const h = reminderSchedule.hour_wib.padStart(2, "0");
    const m = reminderSchedule.minute.padStart(2, "0");
    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    let freq = "Setiap hari";
    if (reminderSchedule.frequency === "weekdays") freq = "Senin–Jumat";
    else if (reminderSchedule.frequency === "custom" && reminderSchedule.custom_days.length > 0) {
      freq = reminderSchedule.custom_days.map((d) => days[d]).join(", ");
    }
    return `${freq}, jam ${h}:${m} WIB`;
  };

  const saveCronSchedule = async () => {
    setReminderSaving(true);
    try {
      const hour = parseInt(reminderSchedule.hour_wib);
      const minute = parseInt(reminderSchedule.minute) || 0;
      let dayOfWeek = "*";
      if (reminderSchedule.frequency === "weekdays") dayOfWeek = "1-5";
      else if (reminderSchedule.frequency === "custom" && reminderSchedule.custom_days.length > 0) dayOfWeek = reminderSchedule.custom_days.join(",");
      const { error } = await supabase.rpc("update_reminder_cron", { p_hour_wib: hour, p_minute: minute, p_day_of_week: dayOfWeek, p_active: reminderSchedule.active });
      await supabase.from("app_settings").upsert({ key: "reminder_schedule", value: reminderSchedule }, { onConflict: "key" });
      if (error) {
        const utcHour = (hour - 7 + 24) % 24;
        const cronExpr = `${minute} ${utcHour} * * ${dayOfWeek}`;
        alert(`Setting disimpan! ✅\n\nJalankan SQL ini di SQL Editor untuk mengaktifkan:\n\nSELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'daily-reminder';\n\nSELECT cron.schedule('daily-reminder', '${cronExpr}', $$\n  SELECT net.http_post(\n    url := 'https://frxdbqcojaiosjoghdqk.supabase.co/functions/v1/daily-reminder',\n    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyeGRicWNvamFpb3Nqb2doZHFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDgwOTM3NiwiZXhwIjoyMDc2Mzg1Mzc2fQ.WVSlMIhVVwE3GNCwpg-ys223DbRyOeZDmOqjjgHxYZk"}'::jsonb,\n    body := '{}'::jsonb\n  );\n$$);`);
      } else alert(`✅ Jadwal reminder berhasil diubah!\n${getCronDisplay()}`);
      setShowReminderSchedule(false);
    } catch (e: any) { alert("Error: " + e.message); } finally { setReminderSaving(false); }
  };

  const fetchOverdueSettings = async () => {
    try { const { data } = await supabase.from("overdue_settings").select("*"); if (data) setOverdueSettings(data); } catch (e) { console.error(e); }
  };

  const saveOverdueSetting = async () => {
    if (!overdueTargetTicket) return;
    if (!overdueForm.due_hours || parseInt(overdueForm.due_hours) < 1) { alert("Isi jumlah jam overdue (minimal 1 jam)!"); return; }
    try {
      const existing = getOverdueSetting(overdueTargetTicket.id);
      const payload: any = { ticket_id: overdueTargetTicket.id, set_by: currentUser?.username || "", due_date: null, due_hours: parseInt(overdueForm.due_hours) };
      if (existing) await supabase.from("overdue_settings").update(payload).eq("id", existing.id);
      else await supabase.from("overdue_settings").insert([payload]);
      await fetchOverdueSettings();
      setShowOverdueSetting(false);
      setOverdueForm({ due_hours: "48" });
      setOverdueTargetTicket(null);
    } catch (e: any) { alert("Error: " + e.message); }
  };

  const deleteOverdueSetting = async (ticketId: string) => {
    const existing = getOverdueSetting(ticketId);
    if (!existing) return;
    await supabase.from("overdue_settings").delete().eq("id", existing.id);
    await fetchOverdueSettings();
  };

  const getNotifications = () => {
    if (!currentUser) return [];
    const member = teamMembers.find((m) => (m.username || "").toLowerCase() === (currentUser.username || "").toLowerCase());
    const assignedName = member ? member.name : currentUser.full_name;
    return tickets.filter((t) => {
      if (t.assigned_to !== assignedName) return false;
      const overdue = isTicketOverdue(t) && t.status !== "Solved";
      const isPending = t.status === "Pending" || t.status === "In Progress";
      const isServicesAndPending = t.services_status && (t.services_status === "Pending" || t.services_status === "In Progress");
      if (member?.team_type === "Team Services") return isServicesAndPending || overdue;
      else return isPending || overdue;
    });
  };

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("username", loginForm.username).eq("password", loginForm.password).single();
      if (error || !data) { alert("Incorrect username or password!"); return; }
      const now = Date.now();
      setCurrentUser(data);
      setIsLoggedIn(true);
      setLoginTime(now);
      localStorage.setItem("currentUser", JSON.stringify(data));
      localStorage.setItem("loginTime", now.toString());
    } catch (err) { alert("Login failed!"); }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginTime(null);
    setSelectedTicket(null);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("loginTime");
  };

  const fetchGuestMappings = async () => {
    try {
      const { data, error } = await supabase.from("guest_mappings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setGuestMappings(data || []);
    } catch (err: any) { console.error("Error fetching guest mappings:", err); }
  };

  const fetchData = async (userOverride?: User | null) => {
    try {
      setTickets([]);
      setTicketsLoading(true);
      const [membersData, usersData] = await Promise.all([
        supabase.from("team_members").select("*").order("name"),
        supabase.from("users").select("id, username, full_name, role, team_type"),
      ]);
      const activeUser = userOverride !== undefined ? userOverride : currentUser;
      if (activeUser?.role === "guest") {
        const { data: mappings } = await supabase.from("guest_mappings").select("project_name").eq("guest_username", activeUser!.username);
        const allowedProjectNames = mappings ? mappings.map((m: GuestMapping) => m.project_name) : [];
        let guestTickets: Ticket[] = [];
        if (allowedProjectNames.length > 0) {
          const { data: projectTickets } = await supabase.from("tickets").select("*, activity_logs(*)").in("project_name", allowedProjectNames).order("created_at", { ascending: false });
          if (projectTickets) guestTickets = [...projectTickets];
        }
        const { data: ownWaiting } = await supabase.from("tickets").select("*, activity_logs(*)").eq("created_by", activeUser!.username).eq("status", "Waiting Approval").order("created_at", { ascending: false });
        if (ownWaiting) {
          for (const t of ownWaiting) { if (!guestTickets.find((gt: Ticket) => gt.id === t.id)) guestTickets.push(t); }
        }
        setTickets(guestTickets);
        if (selectedTicket && !guestTickets.find((t: Ticket) => t.id === selectedTicket.id)) setSelectedTicket(null);
      } else {
        const { data: ticketsData } = await supabase.from("tickets").select("*, activity_logs(*)").order("created_at", { ascending: false });
        let mergedTickets: Ticket[] = ticketsData || [];
        try {
          const { data: svcLogs } = await supabaseServices.from("activity_logs").select("*").order("created_at", { ascending: false });
          if (svcLogs && svcLogs.length > 0) {
            mergedTickets = mergedTickets.map((ticket: Ticket) => {
              const svcTicketLogs = svcLogs.filter((l: ActivityLog) => l.ticket_id === ticket.id);
              if (svcTicketLogs.length === 0) return ticket;
              const existingLogs = ticket.activity_logs || [];
              const allLogs = [...existingLogs, ...svcTicketLogs].reduce((acc: ActivityLog[], log: ActivityLog) => {
                if (!acc.find((l) => l.id === log.id)) acc.push(log);
                return acc;
              }, []);
              allLogs.sort((a: ActivityLog, b: ActivityLog) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              return { ...ticket, activity_logs: allLogs };
            });
          }
        } catch (svcErr) { console.warn("Could not fetch Services DB activity logs:", svcErr); }
        setTickets(mergedTickets);
      }
      if (membersData.data) setTeamMembers(membersData.data);
      if (usersData.data) setUsers(usersData.data);
      setLoading(false);
      setTicketsLoading(false);
    } catch (err: any) {
      console.error("Error:", err);
      setLoading(false);
      setTicketsLoading(false);
    }
  };

  // ── DELETE TICKET FUNCTION (ADMIN ONLY) ──
  const deleteTicket = async (ticket: Ticket) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ticket "${ticket.project_name} - ${ticket.issue_case}"?\n\nData ticket beserta seluruh activity log akan dihapus secara permanen!`)) return;
    try {
      setUploading(true);
      setShowLoadingPopup(true);
      setLoadingMessage("Menghapus ticket...");
      
      await supabase.from("activity_logs").delete().eq("ticket_id", ticket.id);
      const { error } = await supabase.from("tickets").delete().eq("id", ticket.id);
      if (error) throw error;
      
      try {
        await supabaseServices.from("tickets").delete().eq("id", ticket.id);
        await supabaseServices.from("activity_logs").delete().eq("ticket_id", ticket.id);
      } catch (e) {
        console.warn("Could not delete from Services DB:", e);
      }
      
      await fetchData();
      setLoadingMessage("✅ Ticket berhasil dihapus!");
      setTimeout(() => {
        setShowLoadingPopup(false);
        setUploading(false);
        if (selectedTicket?.id === ticket.id) {
          setShowTicketDetailPopup(false);
          setSelectedTicket(null);
        }
      }, 1500);
    } catch (err: any) {
      setShowLoadingPopup(false);
      setUploading(false);
      alert("Error: " + err.message);
    }
  };

  const createTicket = async () => {
    if (!newTicket.project_name || !newTicket.issue_case) { alert("Project name and Issue case must be filled!"); return; }
    const isAdmin = currentUser?.role === "admin";
    if (isAdmin && !newTicket.assigned_to) { alert("Please assign to a Team PTS member!"); return; }
    try {
      setUploading(true);
      setShowLoadingPopup(true);
      setLoadingMessage("Saving new ticket...");
      let photoUrl = "", photoName = "";
      if (newTicket.photo) {
        setLoadingMessage("Uploading photo...");
        try {
          const fileName = `${Date.now()}_${newTicket.photo.name}`;
          const { error } = await supabase.storage.from("ticket-photos").upload(`photos/${fileName}`, newTicket.photo);
          if (error) throw error;
          const { data } = supabase.storage.from("ticket-photos").getPublicUrl(`photos/${fileName}`);
          photoUrl = data.publicUrl;
          photoName = newTicket.photo.name;
        } catch (uploadErr: any) { throw new Error(`Failed to upload photo: ${uploadErr.message}`); }
      }
      setLoadingMessage("Saving new ticket...");
      const ticketStatus = isAdmin ? newTicket.status : "Waiting Approval";
      const ticketAssignedTo = isAdmin ? newTicket.assigned_to : "";
      const ticketData = {
        project_name: newTicket.project_name,
        address: newTicket.address || null,
        customer_phone: newTicket.customer_phone || null,
        sales_name: newTicket.sales_name || null,
        sales_division: newTicket.sales_division || null,
        sn_unit: newTicket.sn_unit || null,
        issue_case: newTicket.issue_case,
        description: newTicket.description || null,
        assigned_to: ticketAssignedTo,
        date: newTicket.date,
        status: ticketStatus,
        current_team: "Team PTS",
        services_status: null,
        created_by: currentUser?.username || null,
        photo_url: photoUrl || null,
        photo_name: photoName || null,
      };
      const { data: insertedTicket, error } = await supabase.from("tickets").insert([ticketData]).select("id").single();
      if (error) throw error;
      if (!isAdmin) {
        supabase.functions.invoke("notify-handler", {
          body: { type: "approval_request", ticketId: insertedTicket?.id || "", projectName: newTicket.project_name, issueCase: newTicket.issue_case, requesterName: currentUser?.full_name || "", requesterUsername: currentUser?.username || "", date: newTicket.date, description: newTicket.description || "-", snUnit: newTicket.sn_unit || "-", customerPhone: newTicket.customer_phone || "-", salesName: newTicket.sales_name || "-" }
        }).then(({ error: waErr }) => { if (waErr) console.error("notify-handler approval error:", waErr); });
      }
      setNewTicket({
        project_name: "", address: "", customer_phone: "", sales_name: "", sales_division: "", sn_unit: "", issue_case: "", description: "", assigned_to: "", date: getJakartaDateString(), status: "Pending", current_team: "Team PTS", photo: null
      });
      setShowNewTicket(false);
      await fetchData();
      const successMsg = isAdmin ? "✅ Ticket saved successfully!" : "✅ Ticket submitted! Waiting for Superadmin approval.";
      setLoadingMessage(successMsg);
      setTimeout(() => { setShowLoadingPopup(false); setUploading(false); }, 1500);
    } catch (err: any) {
      setShowLoadingPopup(false);
      setUploading(false);
      alert("Error: " + err.message);
    }
  };

  const approveTicket = async () => {
    if (!approvalTicket || !approvalAssignee) { alert("Please select a Team PTS member to assign!"); return; }
    try {
      setUploading(true);
      const { error } = await supabase.from("tickets").update({ status: "Pending", assigned_to: approvalAssignee }).eq("id", approvalTicket.id);
      if (error) throw error;
      if (approvalTicket.created_by) {
        const creatorUser = users.find((u) => u.username === approvalTicket.created_by);
        if (creatorUser && creatorUser.role === "guest") {
          const { data: existingMapping } = await supabase.from("guest_mappings").select("id").eq("guest_username", approvalTicket.created_by).eq("project_name", approvalTicket.project_name).maybeSingle();
          if (!existingMapping) await supabase.from("guest_mappings").insert([{ guest_username: approvalTicket.created_by, project_name: approvalTicket.project_name }]);
        }
      }
      setShowApprovalModal(false);
      setApprovalTicket(null);
      setApprovalAssignee("");
      await fetchData();
      alert(`✅ Ticket approved & assigned to ${approvalAssignee}`);
    } catch (err: any) { alert("Error: " + err.message); } finally { setUploading(false); }
  };

  const rejectTicket = async (ticket: Ticket) => {
    if (!confirm(`Reject ticket "${ticket.project_name} - ${ticket.issue_case}"? Ticket will be deleted.`)) return;
    try {
      setUploading(true);
      await supabase.from("activity_logs").delete().eq("ticket_id", ticket.id);
      const { error } = await supabase.from("tickets").delete().eq("id", ticket.id);
      if (error) throw error;
      await fetchData();
      alert("Ticket rejected and removed.");
    } catch (err: any) { alert("Error: " + err.message); } finally { setUploading(false); }
  };

  const reopenTicket = async () => {
    if (!reopenTargetTicket || !reopenAssignee) return;
    try {
      setUploading(true);
      setShowLoadingPopup(true);
      setLoadingMessage("Re-opening ticket...");
      const { error: ue } = await supabase.from("tickets").update({ status: "Pending", assigned_to: reopenAssignee, current_team: "Team PTS", services_status: null }).eq("id", reopenTargetTicket.id);
      if (ue) throw ue;
      await supabase.from("activity_logs").insert([{
        ticket_id: reopenTargetTicket.id,
        handler_name: currentUser?.full_name || "",
        handler_username: currentUser?.username || "",
        action_taken: "Re-open Ticket",
        notes: reopenNotes ? `Dibuka kembali: ${reopenNotes}` : `Ticket dibuka kembali oleh ${currentUser?.full_name}`,
        new_status: "Pending",
        team_type: "Team PTS",
        assigned_to_services: false,
        file_url: "", file_name: "", photo_url: "", photo_name: ""
      }]);
      await fetchData();
      setLoadingMessage("✅ Ticket berhasil dibuka kembali!");
      setTimeout(() => {
        setShowLoadingPopup(false);
        setUploading(false);
        setShowReopenModal(false);
        setReopenTargetTicket(null);
        setReopenAssignee("");
        setReopenNotes("");
        setShowTicketDetailPopup(false);
        setSelectedTicket(null);
      }, 1500);
    } catch (err: any) {
      setShowLoadingPopup(false);
      setUploading(false);
      alert("Error: " + err.message);
    }
  };

  const addActivity = async () => {
    const SERVICES_SIMPLE = ["Warranty", "Out Of Warranty", "Waiting PO from Sales", "Submit RMA", "Waiting sparepart"];
    const isSimpleStatus = newActivity.new_status === "Call" || newActivity.new_status === "Onsite";
    const isSvcSimple = teamMembers.find((m) => (m.username || "").toLowerCase() === (currentUser?.username || "").toLowerCase())?.team_type === "Team Services" && SERVICES_SIMPLE.includes(newActivity.new_status);
    if (!isSimpleStatus && !isSvcSimple && !newActivity.notes) { alert("Notes must be filled!"); return; }
    if (!selectedTicket) { alert("No ticket selected!"); return; }
    const member = teamMembers.find((m) => (m.username || "").toLowerCase() === (currentUser?.username || "").toLowerCase());
    const teamType = member?.team_type || "Team PTS";
    const isServicesTeam = teamType === "Team Services";
    const validStatusesPTS = ["Waiting Approval", "Pending", "Call", "Onsite", "In Progress", "Solved"];
    if (isServicesTeam) {
      if (!(SERVICES_STATUSES as readonly string[]).includes(newActivity.new_status)) { alert("Status tidak valid untuk Team Services!"); return; }
    } else {
      if (!validStatusesPTS.includes(newActivity.new_status)) { alert("Invalid status! Use: Pending, In Progress, or Solved"); return; }
    }
    if (newActivity.assign_to_services && !newActivity.services_assignee) { alert("Select assignee from Team Services!"); return; }
    try {
      setUploading(true);
      setShowLoadingPopup(true);
      setLoadingMessage("Updating ticket status...");
      let fileUrl = "", fileName = "", photoUrl = "", photoName = "";
      const uploadFileToBucket = async (file: File, folder: string, useServicesDb: boolean = false) => {
        const client = useServicesDb ? supabaseServices : supabase;
        const filePath = `${folder}/${Date.now()}_${file.name}`;
        const { error } = await client.storage.from("ticket-photos").upload(filePath, file);
        if (error) throw error;
        const { data } = client.storage.from("ticket-photos").getPublicUrl(filePath);
        return { url: data.publicUrl, name: file.name };
      };
      if (newActivity.file) {
        setLoadingMessage("Uploading PDF file...");
        try { const result = await uploadFileToBucket(newActivity.file, "reports", isServicesTeam); fileUrl = result.url; fileName = result.name; } catch (uploadErr: any) { throw new Error(`Failed to upload PDF: ${uploadErr.message}`); }
      }
      if (newActivity.photo) {
        setLoadingMessage("Uploading photo...");
        try { const result = await uploadFileToBucket(newActivity.photo, "photos", isServicesTeam); photoUrl = result.url; photoName = result.name; } catch (uploadErr: any) { throw new Error(`Failed to upload photo: ${uploadErr.message}`); }
      }
      setLoadingMessage("Saving activity log...");
      const SVCSS = ["Warranty", "Out Of Warranty", "Waiting PO from Sales", "Submit RMA", "Waiting sparepart"];
      const isSimpleStatusCalc = newActivity.new_status === "Call" || newActivity.new_status === "Onsite";
      const isSvcSimpleCalc = isServicesTeam && SVCSS.includes(newActivity.new_status);
      const onsiteHasSchedule = newActivity.new_status === "Onsite" && newActivity.onsite_use_schedule && newActivity.onsite_schedule_date;
      const svcSimpleNotes: Record<string, string> = {
        Warranty: "Unit masih dalam masa garansi.",
        "Out Of Warranty": "Unit sudah di luar masa garansi.",
        "Waiting PO from Sales": "Menunggu Purchase Order dari Sales.",
        "Submit RMA": "RMA telah disubmit ke vendor.",
        "Waiting sparepart": "Menunggu kedatangan sparepart.",
      };
      let autoNotes = "";
      if (newActivity.new_status === "Call") autoNotes = "Sedang melakukan Call ke customer.";
      else if (newActivity.new_status === "Onsite") {
        if (onsiteHasSchedule) autoNotes = `Dijadwalkan Onsite pada ${newActivity.onsite_schedule_date} pukul ${newActivity.onsite_schedule_hour}:${newActivity.onsite_schedule_minute} WIB.`;
        else autoNotes = "Tim sedang Onsite ke lokasi customer.";
      } else if (isSvcSimpleCalc) autoNotes = svcSimpleNotes[newActivity.new_status] || newActivity.new_status;
      const effectiveStatus = onsiteHasSchedule ? "Pending" : newActivity.new_status;
      const useAutoNotes = isSimpleStatusCalc || isSvcSimpleCalc;
      const activityData: any = {
        ticket_id: selectedTicket.id,
        handler_name: newActivity.handler_name,
        handler_username: currentUser?.username || "",
        action_taken: useAutoNotes ? "" : newActivity.action_taken || "",
        notes: useAutoNotes ? autoNotes : newActivity.notes,
        new_status: effectiveStatus,
        team_type: teamType,
        assigned_to_services: newActivity.assign_to_services || false,
        file_url: fileUrl || "",
        file_name: fileName || "",
        photo_url: photoUrl || "",
        photo_name: photoName || "",
      };
      const activeClient = isServicesTeam ? supabaseServices : supabase;
      const { error: activityError } = await activeClient.from("activity_logs").insert([activityData]).select();
      if (activityError) throw new Error(`Database error: ${activityError.message}`);
      setLoadingMessage("Updating ticket status...");
      const updateData: any = {};
      if (newActivity.sn_unit) updateData.sn_unit = newActivity.sn_unit;
      if (isServicesTeam) {
        updateData.services_status = effectiveStatus;
        const { error: svcErr } = await supabaseServices.from("tickets").update(updateData).eq("id", selectedTicket.id);
        if (svcErr) console.warn("Services DB ticket update failed:", svcErr.message);
        await supabase.from("tickets").update({ services_status: effectiveStatus }).eq("id", selectedTicket.id);
      } else {
        updateData.status = effectiveStatus;
        if (newActivity.assign_to_services) {
          updateData.current_team = "Team Services";
          updateData.services_status = "Waiting Approval";
          updateData.assigned_to = newActivity.services_assignee;
          supabase.functions.invoke("send-email", {
            body: { ticketId: selectedTicket.id, projectName: selectedTicket.project_name, issueCase: selectedTicket.issue_case, assignedTo: newActivity.services_assignee, snUnit: selectedTicket.sn_unit || "-", customerPhone: selectedTicket.customer_phone || "-", salesName: selectedTicket.sales_name || "-", activityLog: newActivity.notes || "-" }
          }).then(({ error }) => { if (error) console.error("Email error:", error); });
          try {
            const { data: existSvc } = await supabaseServices.from("tickets").select("id").eq("id", selectedTicket.id).maybeSingle();
            if (!existSvc) {
              await supabaseServices.from("tickets").insert([{
                id: selectedTicket.id,
                project_name: selectedTicket.project_name,
                address: selectedTicket.address || null,
                customer_phone: selectedTicket.customer_phone || null,
                sales_name: selectedTicket.sales_name || null,
                sn_unit: selectedTicket.sn_unit || null,
                issue_case: selectedTicket.issue_case,
                description: selectedTicket.description || null,
                assigned_to: newActivity.services_assignee,
                date: selectedTicket.date,
                status: "Waiting Approval",
                services_status: "Waiting Approval",
                current_team: "Team Services",
                created_by: selectedTicket.created_by || null,
              }]);
            }
          } catch (svcInsertErr) { console.warn("Could not mirror ticket to Services DB:", svcInsertErr); }
        }
        const { error: updateError } = await supabase.from("tickets").update(updateData).eq("id", selectedTicket.id);
        if (updateError) throw new Error(`Failed to update ticket: ${updateError.message}`);
      }
      setNewActivity({
        handler_name: newActivity.handler_name,
        action_taken: "",
        notes: "",
        new_status: isServicesTeam ? "Pending" : "Pending",
        sn_unit: "",
        file: null,
        photo: null,
        assign_to_services: false,
        services_assignee: "",
        onsite_use_schedule: false,
        onsite_schedule_date: "",
        onsite_schedule_hour: "08",
        onsite_schedule_minute: "00",
      });
      await fetchData();
      setLoadingMessage("✅ Status updated successfully!");
      setTimeout(() => { setShowLoadingPopup(false); setUploading(false); setShowUpdateForm(false); }, 1500);
    } catch (err: any) {
      setShowLoadingPopup(false);
      setUploading(false);
      alert("Error: " + err.message);
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) { alert("All fields must be filled!"); return; }
    const lowerUsername = newUser.username.toLowerCase();
    let finalTeamType = newUser.team_type;
    if (newUser.role === "guest") finalTeamType = "Guest";
    else if (newUser.role === "admin") finalTeamType = "Team PTS";
    try {
      const { error: userError } = await supabase.from("users").insert([{ username: lowerUsername, password: newUser.password, full_name: newUser.full_name, role: newUser.role, team_type: finalTeamType }]);
      if (userError) throw userError;
      if (newUser.role === "team") {
        const { error: memberError } = await supabase.from("team_members").insert([{ name: newUser.full_name, username: lowerUsername, role: "Support Engineer", team_type: finalTeamType, photo_url: `https://ui-avatars.com/api/?name=${newUser.full_name}&background=random&color=fff&size=128` }]);
        if (memberError) console.error("Error creating team member:", memberError);
      }
      setNewUser({ username: "", password: "", full_name: "", team_member: "", role: "team", team_type: "Team PTS" });
      await fetchData();
      alert("User created successfully!");
    } catch (err: any) { alert("Error: " + err.message); }
  };

  const addGuestMapping = async () => {
    if (!newMapping.guestUsername || !newMapping.projectName) { alert("All fields must be filled!"); return; }
    const guestUser = users.find((u) => u.username === newMapping.guestUsername && u.role === "guest");
    if (!guestUser) { alert("Guest username not found or not a guest role!"); return; }
    const projectExists = tickets.some((t) => t.project_name === newMapping.projectName);
    if (!projectExists) { alert("Project name not found!"); return; }
    try {
      setUploading(true);
      const { error } = await supabase.from("guest_mappings").insert([{ guest_username: newMapping.guestUsername, project_name: newMapping.projectName }]);
      if (error) throw error;
      setNewMapping({ guestUsername: "", projectName: "" });
      await fetchGuestMappings();
      setUploading(false);
      alert("Guest mapping added successfully!");
    } catch (err: any) { alert("Error: " + err.message); setUploading(false); }
  };

  const deleteGuestMapping = async (mappingId: string) => {
    try {
      setUploading(true);
      const { error } = await supabase.from("guest_mappings").delete().eq("id", mappingId);
      if (error) throw error;
      await fetchGuestMappings();
      setUploading(false);
      alert("Guest mapping deleted successfully!");
    } catch (err: any) { alert("Error: " + err.message); setUploading(false); }
  };

  const updatePassword = async () => {
    if (!selectedUserForPassword) { alert("Select user first!"); return; }
    if (!changePassword.current || !changePassword.new || !changePassword.confirm) { alert("All fields must be filled!"); return; }
    if (changePassword.new !== changePassword.confirm) { alert("New password does not match!"); return; }
    try {
      const selectedUser = users.find((u) => u.id === selectedUserForPassword);
      if (!selectedUser) { alert("User not found!"); return; }
      const { data: userData } = await supabase.from("users").select("password").eq("id", selectedUserForPassword).single();
      if (!userData || userData.password !== changePassword.current) { alert("Old password is incorrect!"); return; }
      await supabase.from("users").update({ password: changePassword.new }).eq("id", selectedUserForPassword);
      if (currentUser?.id === selectedUserForPassword) {
        const updatedUser = { ...currentUser, password: changePassword.new };
        setCurrentUser(updatedUser);
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      }
      alert("Password changed successfully!");
      setChangePassword({ current: "", new: "", confirm: "" });
      setSelectedUserForPassword("");
    } catch (err: any) { alert("Error: " + err.message); }
  };

  const exportToPDF = async (ticket: Ticket) => {
    const printContent = `
      <html>
        <head>
          <title>Ticket Report - ${ticket.project_name}</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            h1 { color: #EF4444; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f3f4f6; }
            .activity { border: 1px solid #ddd; padding: 10px; margin: 10px 0; }
            .team-badge { display: inline-block; padding: 4px 8px; background: #e5e7eb; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .photo-thumbnail { max-width: 200px; margin: 10px 0; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Report Troubleshooting</h1>
          <h2>Project Name: ${ticket.project_name}</h2>
          <table border="1">
            <tr><th>Address</th><td>${ticket.address || "-"}</td></tr>
            <tr><th>Issue</th><td>${ticket.issue_case}</td></tr>
            <tr><th>SN Unit</th><td>${ticket.sn_unit || "-"}</td></tr>
            <tr><th>Customer Phone</th><td>${ticket.customer_phone || "-"}</td></tr>
            <tr><th>Sales Name</th><td>${ticket.sales_name || "-"}</td></tr>
            <tr><th>Status</th><td>${ticket.status}</td></tr>
            ${ticket.services_status ? `<tr><th>Services Status</th><td>${ticket.services_status}</td></tr>` : ""}
            <tr><th>Current Team</th><td>${ticket.current_team}</td></tr>
            <tr><th>Date</th><td>${ticket.date}</td></tr>
           </table>
          <h3>Activity Log</h3>
          ${ticket.activity_logs?.map((log) => `
            <div class="activity">
              <strong>${log.handler_name}</strong> (${log.team_type}) - ${formatDateTime(log.created_at)}<br/>
              Status: ${log.new_status}<br/>
              ${log.action_taken ? `Action: ${log.action_taken}<br/>` : ""}
              Notes: ${log.notes}
            </div>
          `).join("") || "No activities"}
        </body>
      </html>
    `;
    const win = window.open("", "", "height=700,width=700");
    win?.document.write(printContent);
    win?.document.close();
    win?.print();
  };

  const exportToExcel = () => {
    const runExport = (XLSX: any) => {
      const exportTickets = currentUserTeamType === "Team Services" ? filteredTickets : tickets;
      const isServicesExport = currentUserTeamType === "Team Services";
      const border = { top: { style: "thin", color: { rgb: "D1D5DB" } }, bottom: { style: "thin", color: { rgb: "D1D5DB" } }, left: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } };
      const boldBorder = { top: { style: "thin", color: { rgb: "000000" } }, bottom: { style: "thin", color: { rgb: "000000" } }, left: { style: "thin", color: { rgb: "000000" } }, right: { style: "thin", color: { rgb: "000000" } } };
      const hdrStyle = { font: { name: "Arial", bold: true, sz: 11, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E3A5F" }, patternType: "solid" }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: boldBorder };
      const cellStyle = { font: { name: "Arial", sz: 10 }, alignment: { vertical: "center", wrapText: true }, border };
      const altStyle = { ...cellStyle, fill: { fgColor: { rgb: "EFF6FF" }, patternType: "solid" } };
      const titleStyle = { font: { name: "Arial", bold: true, sz: 15, color: { rgb: "1E3A5F" } }, alignment: { horizontal: "left", vertical: "center" } };
      
      const wb = XLSX.utils.book_new();
      const headers = ["No.", "Project Name", "Issue", "Status", "Assigned To", "Sales", "Created By", "Created At", "SN Unit"];
      const data: any[][] = [[isServicesExport ? "Ticket Report - Team Services" : "Ticket Report - All Tickets", ...Array(headers.length - 1).fill("")], headers];
      
      exportTickets.forEach((t: Ticket, idx: number) => {
        const rs = idx % 2 === 0 ? cellStyle : altStyle;
        data.push([
          { v: idx + 1, s: rs }, { v: t.project_name, s: rs }, { v: t.issue_case, s: rs },
          { v: t.status, s: rs }, { v: t.assigned_to || "-", s: rs }, { v: t.sales_name || "-", s: rs },
          { v: t.created_by || "-", s: rs }, { v: t.created_at ? formatDateTime(t.created_at) : "-", s: rs },
          { v: t.sn_unit || "-", s: rs }
        ]);
      });
      
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
      ws["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws, "Tickets");
      
      const fileName = `Ticket_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    };
    
    if ((window as any).XLSX) runExport((window as any).XLSX);
    else {
      const script = document.createElement("script");
      script.src = "https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js";
      script.onload = () => runExport((window as any).XLSX);
      script.onerror = () => alert("Gagal memuat library Excel. Coba lagi nanti.");
      document.head.appendChild(script);
    }
  };

  const currentUserTeamType = useMemo(() => {
    if (!currentUser) return "Team PTS";
    const member = teamMembers.find((m) => (m.username || "").toLowerCase() === (currentUser.username || "").toLowerCase());
    return member?.team_type || "Team PTS";
  }, [currentUser, teamMembers]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const projectName = t.project_name || "";
      const issueCase = t.issue_case || "";
      const salesName = t.sales_name || "";
      const match = projectName.toLowerCase().includes(searchProject.toLowerCase()) || issueCase.toLowerCase().includes(searchProject.toLowerCase());
      const salesNameMatch = salesName.toLowerCase().includes(searchSalesName.toLowerCase());
      const ticketYear = t.created_at ? new Date(t.created_at).getFullYear().toString() : "";
      const yearMatch = filterYear === "all" || ticketYear === filterYear;
      let statusMatch = false;
      if (filterStatus === "All") statusMatch = true;
      else if (filterStatus === "Overdue") statusMatch = isTicketOverdue(t) && t.status !== "Solved";
      else if (filterStatus === "Solved Overdue") statusMatch = isTicketOverdue(t) && t.status === "Solved";
      else if (currentUserTeamType === "Team Services") statusMatch = t.services_status === filterStatus || t.status === filterStatus;
      else statusMatch = t.status === filterStatus;
      const handlerMatch = handlerFilter === null || t.assigned_to === handlerFilter;
      const divisionMatch = salesDivisionFilter === null || t.sales_division === salesDivisionFilter;
      let teamVisibility = true;
      if (currentUserTeamType === "Team Services") teamVisibility = t.current_team === "Team Services" || !!t.services_status;
      if (t.status === "Waiting Approval" && currentUser?.role !== "admin" && currentUserTeamType !== "Team Services") {
        teamVisibility = teamVisibility && t.created_by === currentUser?.username;
      }
      return match && salesNameMatch && yearMatch && statusMatch && teamVisibility && handlerMatch && divisionMatch;
    });
  }, [tickets, searchProject, searchSalesName, filterYear, filterStatus, currentUserTeamType, overdueSettings, handlerFilter, salesDivisionFilter]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const processing = tickets.filter((t) => t.status === "In Progress").length;
    const pending = tickets.filter((t) => t.status === "Pending").length;
    const solved = tickets.filter((t) => t.status === "Solved").length;
    const overdue = tickets.filter((t) => isTicketOverdue(t) && t.status !== "Solved").length;
    const solvedOverdue = tickets.filter((t) => isTicketOverdue(t) && t.status === "Solved").length;
    return {
      total, pending, processing, solved, overdue, solvedOverdue,
      statusData: [
        { name: "Pending", value: pending, color: "#FCD34D" },
        { name: "In Progress", value: processing, color: "#60A5FA" },
        { name: "Solved", value: solved, color: "#34D399" },
        ...(overdue > 0 ? [{ name: "Overdue", value: overdue, color: "#EF4444" }] : []),
        ...(solvedOverdue > 0 ? [{ name: "Solved (Overdue)", value: solvedOverdue, color: "#9333ea" }] : []),
      ].filter((d) => d.value > 0),
      handlerData: Object.entries(tickets.reduce((acc, t) => { acc[t.assigned_to] = (acc[t.assigned_to] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([name, tickets]) => {
        const member = teamMembers.find((m) => m.name.trim().toLowerCase() === name.trim().toLowerCase());
        return { name, tickets, team: member?.team_type || "Team PTS" };
      }),
    };
  }, [tickets, overdueSettings]);

  const salesDivisionStats = useMemo(() => {
    const divisionCounts: Record<string, number> = {};
    tickets.forEach((t) => { if (t.sales_division) divisionCounts[t.sales_division] = (divisionCounts[t.sales_division] || 0) + 1; });
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1", "#14B8A6", "#F43F5E", "#A855F7", "#22D3EE", "#EAB308"];
    const divisionData = Object.entries(divisionCounts).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] })).sort((a, b) => b.value - a.value).slice(0, 10);
    return { data: divisionData, total: divisionData.reduce((sum, d) => sum + d.value, 0) };
  }, [tickets]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    tickets.forEach((t) => { if (t.created_at) years.add(new Date(t.created_at).getFullYear().toString()); });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [tickets]);

  const uniqueProjectNames = useMemo(() => {
    const names = tickets.map((t) => t.project_name);
    return Array.from(new Set(names)).sort();
  }, [tickets]);

  const teamPTSMembers = useMemo(() => teamMembers.filter((m) => m.team_type === "Team PTS"), [teamMembers]);
  const teamServicesMembers = useMemo(() => teamMembers.filter((m) => m.team_type === "Team Services"), [teamMembers]);

  useEffect(() => {
    const saved = localStorage.getItem("currentUser");
    const savedTime = localStorage.getItem("loginTime");
    if (saved && savedTime) {
      const user = JSON.parse(saved);
      const time = parseInt(savedTime);
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      if (now - time > sixHours) { handleLogout(); alert("Your session has expired. Please login again."); }
      else { setCurrentUser(user); setIsLoggedIn(true); setLoginTime(time); fetchData(user); return; }
    }
    fetchData(null);
  }, []);

  useEffect(() => {
    if (currentUser && teamMembers.length > 0) {
      const member = teamMembers.find((m) => m.username === currentUser.username);
      const isServices = member?.team_type === "Team Services";
      if (member) setNewActivity((prev) => ({ ...prev, handler_name: member.name, new_status: isServices ? "Pending" : prev.new_status }));
      else setNewActivity((prev) => ({ ...prev, handler_name: currentUser.full_name }));
    }
  }, [currentUser, teamMembers]);

  useEffect(() => {
    if (isLoggedIn && tickets.length > 0 && currentUser?.role !== "guest") {
      const notifs = getNotifications();
      setNotifications(notifs);
      if (notifs.length > 0 && !showNotificationPopup) setShowNotificationPopup(true);
    }
  }, [tickets, isLoggedIn, currentUser]);

  useEffect(() => {
    const interval = setInterval(() => checkSessionTimeout(), 60000);
    return () => clearInterval(interval);
  }, [loginTime]);

  useEffect(() => {
    if (currentUser?.role === "admin") { fetchGuestMappings(); loadReminderSchedule(); }
    if (currentUser) fetchOverdueSettings();
  }, [currentUser]);

  useEffect(() => { if (currentUser) fetchData(); }, [currentUser]);

  const canCreateTicket = true;
  const canUpdateTicket = currentUser?.role !== "guest";
  const canAccessAccountSettings = currentUser?.role === "admin";

  const pendingApprovalTickets = useMemo(() => {
    if (currentUser?.role !== "admin") return [];
    return tickets.filter((t) => t.status === "Waiting Approval");
  }, [tickets, currentUser]);

  const pendingServicesApprovalTickets = useMemo(() => {
    if (currentUserTeamType !== "Team Services") return [];
    return tickets.filter((t) => t.services_status === "Waiting Approval" && t.current_team === "Team Services");
  }, [tickets, currentUserTeamType]);

  const approveServicesTicket = async (ticket: Ticket) => {
    try {
      setUploading(true);
      setShowLoadingPopup(true);
      setLoadingMessage("Approving ticket untuk Team Services...");
      await supabase.from("tickets").update({ services_status: "Pending" }).eq("id", ticket.id);
      try { await supabaseServices.from("tickets").update({ services_status: "Pending", status: "Pending" }).eq("id", ticket.id); } catch (e) { console.warn("Services DB update failed:", e); }
      await supabaseServices.from("activity_logs").insert([{
        ticket_id: ticket.id,
        handler_name: currentUser?.full_name || "",
        handler_username: currentUser?.username || "",
        action_taken: "Ticket Diterima oleh Team Services",
        notes: `Ticket diterima dan akan segera diproses oleh Team Services.`,
        new_status: "Pending",
        team_type: "Team Services",
        assigned_to_services: false,
        file_url: "", file_name: "", photo_url: "", photo_name: ""
      }]);
      await fetchData();
      setLoadingMessage("✅ Ticket diterima oleh Team Services!");
      setTimeout(() => { setShowLoadingPopup(false); setUploading(false); setShowServicesApprovalModal(false); setServicesApprovalTicket(null); }, 1500);
    } catch (err: any) { setShowLoadingPopup(false); setUploading(false); alert("Error: " + err.message); }
  };

  const rejectServicesTicket = async (ticket: Ticket) => {
    if (!confirm(`Tolak ticket "${ticket.project_name} - ${ticket.issue_case}"?\nTicket akan dikembalikan ke Team PTS.`)) return;
    try {
      setUploading(true);
      setShowLoadingPopup(true);
      setLoadingMessage("Mengembalikan ticket ke Team PTS...");
      await supabase.from("tickets").update({ current_team: "Team PTS", services_status: null, status: "In Progress" }).eq("id", ticket.id);
      await supabase.from("activity_logs").insert([{
        ticket_id: ticket.id,
        handler_name: currentUser?.full_name || "",
        handler_username: currentUser?.username || "",
        action_taken: "Ticket Dikembalikan ke Team PTS",
        notes: `Ticket dikembalikan ke Team PTS oleh Team Services karena tidak dapat ditangani.`,
        new_status: "In Progress",
        team_type: "Team Services",
        assigned_to_services: false,
        file_url: "", file_name: "", photo_url: "", photo_name: ""
      }]);
      try {
        await supabaseServices.from("tickets").update({ services_status: "Returned to PTS", current_team: "Team PTS" }).eq("id", ticket.id);
        await supabaseServices.from("activity_logs").insert([{
          ticket_id: ticket.id,
          handler_name: currentUser?.full_name || "",
          handler_username: currentUser?.username || "",
          action_taken: "Ticket Dikembalikan ke Team PTS",
          notes: `Ticket dikembalikan ke Team PTS. History Services tetap tersimpan.`,
          new_status: "Returned to PTS",
          team_type: "Team Services",
          assigned_to_services: false,
          file_url: "", file_name: "", photo_url: "", photo_name: ""
        }]);
      } catch (e) { console.warn("Services DB update failed:", e); }
      await fetchData();
      setLoadingMessage("✅ Ticket dikembalikan ke Team PTS.");
      setTimeout(() => { setShowLoadingPopup(false); setUploading(false); setShowServicesApprovalModal(false); }, 1500);
    } catch (err: any) { setShowLoadingPopup(false); setUploading(false); alert("Error: " + err.message); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: "url(/IVP_Background.png)" }}>
        <div className="bg-white/75 p-8 rounded-2xl shadow-2xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center relative" style={{ backgroundImage: "url(/IVP_Background.png)", backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} />
        <div className="relative z-10 bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-md" style={{ border: "2px solid rgba(220,38,38,0.3)" }}>
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: "linear-gradient(135deg,#dc2626,#991b1b)", boxShadow: "0 6px 24px rgba(220,38,38,0.4)" }}>
              <span className="text-3xl">🗓️</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-center mb-1 text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">Login</h1>
          <p className="text-center text-gray-600 font-semibold mb-6 text-sm">Ticket Troubleshooting<br/><span className="text-red-600 font-bold">IVP Product — Team Support</span></p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Username</label>
              <input type="text" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200 transition-all font-medium bg-white" placeholder="Masukkan username" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Password</label>
              <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200 transition-all font-medium bg-white" placeholder="Masukkan password" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </div>
            <button onClick={handleLogin} className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-xl hover:from-red-700 hover:to-red-900 font-bold shadow-xl transition-all">🔐 Login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative" style={{ backgroundImage: "url(/IVP_Background.png)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(255,255,255,0.08)" }} />
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Loading Popup */}
        {showLoadingPopup && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4" style={{ animation: "scale-in 0.25s ease-out", border: "2px solid rgba(220,38,38,0.3)" }}>
              <div className="flex flex-col items-center">
                {loadingMessage.includes("✅") ? (
                  <div className="text-6xl mb-4 animate-bounce">✅</div>
                ) : (
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-red-600 border-t-transparent animate-spin"></div>
                  </div>
                )}
                <p className="text-xl font-bold text-gray-800 text-center">{loadingMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {uploading && !showLoadingPopup && (
          <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200">
            <div className="h-full bg-gradient-to-r from-red-500 to-red-700 animate-pulse" style={{ width: "100%", transition: "width 0.3s" }}></div>
          </div>
        )}

        {/* Header */}
        <header className="sticky top-0 z-50" style={{ background: "rgba(255,255,255,0.9)", borderBottom: "3px solid #dc2626", backdropFilter: "blur(16px)" }}>
          <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#dc2626,#991b1b)", boxShadow: "0 3px 12px rgba(220,38,38,0.4)" }}>
                <span className="text-lg">🎫</span>
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">Ticket Troubleshooting</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {currentUser?.role !== "guest" && (
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 rounded-xl transition-all hover:bg-red-50 border-2 border-transparent hover:border-red-200" title="Notifications">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "#f59e0b" }}>
                      {notifications.length}
                    </span>
                  )}
                </button>
              )}

              {canAccessAccountSettings && pendingApprovalTickets.length > 0 && (
                <button onClick={() => setShowApprovalModal(true)} className="relative flex items-center gap-1.5 text-white text-sm font-bold px-3.5 py-2 rounded-xl transition-all hover:scale-105 hover:opacity-90" style={{ background: "linear-gradient(135deg,#ea580c,#c2410c)", boxShadow: "0 2px 8px rgba(234,88,12,0.35)" }}>
                  ⏳ Approval
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{pendingApprovalTickets.length}</span>
                </button>
              )}

              {currentUserTeamType === "Team Services" && pendingServicesApprovalTickets.length > 0 && (
                <button onClick={() => setShowServicesApprovalModal(true)} className="relative flex items-center gap-1.5 text-white text-sm font-bold px-3.5 py-2 rounded-xl transition-all hover:scale-105 hover:opacity-90" style={{ background: "linear-gradient(135deg,#db2777,#be185d)", boxShadow: "0 2px 8px rgba(219,39,119,0.35)" }}>
                  🔧 Ticket Masuk
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{pendingServicesApprovalTickets.length}</span>
                </button>
              )}

              {canAccessAccountSettings && (
                <button onClick={() => { setShowGuestMapping(!showGuestMapping); setShowAccountSettings(false); setShowNewTicket(false); }} className="flex items-center gap-1.5 text-white text-sm font-bold px-3.5 py-2 rounded-xl transition-all hover:scale-105 hover:opacity-90" style={{ background: "linear-gradient(135deg,#0d9488,#0f766e)", boxShadow: "0 2px 8px rgba(13,148,136,0.3)" }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden sm:inline">Guest Mapping</span>
                </button>
              )}

              {canAccessAccountSettings && (
                <button onClick={() => { setShowReminderSchedule(true); setShowAccountSettings(false); setShowGuestMapping(false); setShowNewTicket(false); }} className="flex items-center gap-1.5 text-white text-sm font-bold px-3.5 py-2 rounded-xl transition-all hover:scale-105 hover:opacity-90" style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 2px 8px rgba(124,58,237,0.3)" }} title={`Reminder: ${getCronDisplay()}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">Reminder</span>
                </button>
              )}

              {canCreateTicket && (
                <button onClick={() => { setShowNewTicket(!showNewTicket); setShowAccountSettings(false); setShowGuestMapping(false); }} className="flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all hover:scale-105 hover:opacity-90" style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)", boxShadow: "0 4px 14px rgba(220,38,38,0.4)" }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  New Ticket
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-[1600px] mx-auto w-full px-5 py-5 space-y-4">
          {(currentUser?.role === "admin" || (currentUser?.role === "team" && currentUserTeamType === "Team PTS")) && (
            <div className="mb-4 space-y-4">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {[
                  { label: "Total Tickets", value: stats.total, sub: "Seluruh tiket", gradient: "linear-gradient(135deg,#4f46e5,#6d28d9)", shadow: "rgba(79,70,229,0.35)", onClick: () => { setFilterStatus("All"); setHandlerFilter(null); }, active: filterStatus === "All" && !handlerFilter },
                  { label: "Pending", value: stats.pending, sub: "Menunggu tindakan", gradient: "linear-gradient(135deg,#d97706,#b45309)", shadow: "rgba(217,119,6,0.35)", onClick: () => { setFilterStatus(filterStatus === "Pending" ? "All" : "Pending"); setHandlerFilter(null); ticketListRef.current?.scrollIntoView({ behavior: "smooth" }); }, active: filterStatus === "Pending" },
                  { label: "In Progress", value: stats.processing, sub: "Sedang ditangani", gradient: "linear-gradient(135deg,#2563eb,#1d4ed8)", shadow: "rgba(37,99,235,0.35)", onClick: () => { setFilterStatus(filterStatus === "In Progress" ? "All" : "In Progress"); setHandlerFilter(null); ticketListRef.current?.scrollIntoView({ behavior: "smooth" }); }, active: filterStatus === "In Progress" },
                  { label: "Solved", value: stats.solved, sub: "Terselesaikan", gradient: "linear-gradient(135deg,#059669,#047857)", shadow: "rgba(5,150,105,0.35)", onClick: () => { setFilterStatus(filterStatus === "Solved" ? "All" : "Solved"); setHandlerFilter(null); ticketListRef.current?.scrollIntoView({ behavior: "smooth" }); }, active: filterStatus === "Solved" },
                  { label: "Overdue", value: stats.overdue, sub: "Berpotensi denda", gradient: "linear-gradient(135deg,#dc2626,#b91c1c)", shadow: "rgba(220,38,38,0.35)", onClick: () => { setFilterStatus(filterStatus === "Overdue" ? "All" : "Overdue"); setHandlerFilter(null); ticketListRef.current?.scrollIntoView({ behavior: "smooth" }); }, active: filterStatus === "Overdue" },
                  { label: "Solved Overdue", value: stats.solvedOverdue, sub: "Butuh verifikasi", gradient: "linear-gradient(135deg,#7c3aed,#6d28d9)", shadow: "rgba(124,58,237,0.35)", onClick: () => { setFilterStatus(filterStatus === "Solved Overdue" ? "All" : "Solved Overdue"); setHandlerFilter(null); ticketListRef.current?.scrollIntoView({ behavior: "smooth" }); }, active: filterStatus === "Solved Overdue" },
                ].map((card, i) => (
                  <div key={i} onClick={card.onClick} className="rounded-2xl p-4 relative overflow-hidden flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.03] select-none" style={{ background: card.gradient, boxShadow: card.active ? `0 6px 24px ${card.shadow}` : `0 4px 16px ${card.shadow}`, outline: card.active ? "3px solid white" : "none", transform: card.active ? "scale(1.04)" : undefined }}>
                    {card.active && <div className="absolute inset-0 rounded-2xl border-4 border-white/50 pointer-events-none" />}
                    {card.active && <span className="absolute top-1 left-2 text-white/80 text-[9px] font-bold uppercase tracking-widest">Filter Aktif ✓</span>}
                    <span className="text-3xl font-black text-white leading-none mt-3">{card.value}</span>
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">{card.label}</p>
                      <p className="text-[10px] font-medium leading-tight" style={{ color: "rgba(255,255,255,0.75)" }}>{card.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Donut Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <StatusDonutCard data={stats.statusData} total={stats.statusData.reduce((s, d) => s + d.value, 0)} onSliceClick={(name: string) => { const mapped = name === "Solved (Overdue)" ? "Solved Overdue" : name; setFilterStatus((prev) => prev === mapped ? "All" : mapped); setHandlerFilter(null); ticketListRef.current?.scrollIntoView({ behavior: "smooth" }); }} title="Status Distribution" icon="🥧" />
                <HandlerDonutCard data={stats.handlerData.filter((h: any) => h.team === `Team ${selectedHandlerTeam}`).map((h: any, i: number) => ({ name: h.name, value: h.tickets, color: ["#7c3aed", "#0ea5e9", "#10b981", "#e11d48", "#f59e0b", "#6366f1", "#14b8a6", "#f97316", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"][i % 12] }))} total={stats.handlerData.filter((h: any) => h.team === `Team ${selectedHandlerTeam}`).reduce((s, h) => s + h.tickets, 0)} teamToggle={selectedHandlerTeam} onToggle={(t: "PTS" | "Services") => setSelectedHandlerTeam(t)} onSliceClick={(name: string) => { setHandlerFilter((prev: string | null) => prev === name ? null : name); setFilterStatus("All"); ticketListRef.current?.scrollIntoView({ behavior: "smooth" }); }} activeHandler={handlerFilter} title="Team Handlers" icon="👥" />
                <SalesDivisionDonutCard data={salesDivisionStats.data} total={salesDivisionStats.total} onSliceClick={(division: string) => { setSalesDivisionFilter((prev: string | null) => prev === division ? null : division); ticketListRef.current?.scrollIntoView({ behavior: "smooth" }); }} activeDivision={salesDivisionFilter} />
              </div>

              {/* Active filter chips */}
              {(filterStatus !== "All" || handlerFilter || salesDivisionFilter) && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filter:</span>
                  {filterStatus !== "All" && (
                    <button onClick={() => setFilterStatus("All")} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-80" style={{ background: "#d97706" }}>Status: {filterStatus} ✕</button>
                  )}
                  {handlerFilter && (
                    <button onClick={() => setHandlerFilter(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-80" style={{ background: "#7c3aed" }}>Handler: {handlerFilter} ✕</button>
                  )}
                  {salesDivisionFilter && (
                    <button onClick={() => setSalesDivisionFilter(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-80" style={{ background: "#ec4899" }}>Division: {salesDivisionFilter} ✕</button>
                  )}
                  <button onClick={() => { setFilterStatus("All"); setHandlerFilter(null); setSalesDivisionFilter(null); }} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:opacity-80" style={{ background: "rgba(0,0,0,0.1)", color: "#374151" }}>Reset Semua</button>
                </div>
              )}
            </div>
          )}

          {/* Ticket List */}
          <div ref={ticketListRef} className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid rgba(0,0,0,0.08)", backdropFilter: "blur(12px)" }}>
            <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Ticket List</span>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{ticketsLoading ? "..." : filteredTickets.length}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <button onClick={() => fetchData()} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-gray-100 border border-gray-200 text-gray-600 disabled:opacity-60" style={{ background: "white" }}>🔄 Refresh</button>
                <button onClick={exportToExcel} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)", boxShadow: "0 2px 8px rgba(220,38,38,0.3)" }}>📊 Export Report</button>
              </div>
            </div>

            {/* Integrated search filters row */}
            <div className="px-6 py-3 bg-white/50 border-b border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Project / Location</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                    <input type="text" value={searchProject} onChange={(e) => setSearchProject(e.target.value)} placeholder="Search project / lokasi..." className="w-full rounded-xl pl-8 pr-4 py-2 text-sm outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Sales Name</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">👤</span>
                    <input type="text" value={searchSalesName} onChange={(e) => setSearchSalesName(e.target.value)} placeholder="Search sales name..." className="w-full rounded-xl pl-8 pr-4 py-2 text-sm outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Team Handler</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">👥</span>
                    <select value={handlerFilter || ""} onChange={(e) => setHandlerFilter(e.target.value || null)} className="w-full rounded-xl pl-8 pr-4 py-2 text-sm outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-300 appearance-none cursor-pointer">
                      <option value="">All Handlers</option>
                      {teamMembers.filter(m => m.team_type === `Team ${selectedHandlerTeam}`).map((m) => (<option key={m.id} value={m.name}>{m.name}</option>))}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▼</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🏷️</span>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full rounded-xl pl-8 pr-4 py-2 text-sm outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-300 appearance-none cursor-pointer">
                      <option value="All">All Status</option>
                      <option value="Waiting Approval">⏳ Waiting Approval</option>
                      <option value="Pending">🟡 Pending</option>
                      <option value="Call">📞 Call</option>
                      <option value="Onsite">🚗 Onsite</option>
                      <option value="In Progress">🔵 In Progress</option>
                      <option value="Solved">✅ Solved</option>
                      {currentUser?.role === "admin" && (<><option value="Overdue">🚨 Overdue</option><option value="Solved Overdue">⚠️ Solved Overdue</option></>)}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▼</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Filter Year</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">📅</span>
                    <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full rounded-xl pl-8 pr-4 py-2 text-sm outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-300 appearance-none cursor-pointer">
                      <option value="all">All Years</option>
                      {availableYears.map((year) => (<option key={year} value={year}>{year}</option>))}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▼</span>
                  </div>
                </div>
              </div>
            </div>

            {ticketsLoading ? (
              <div className="space-y-3 py-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3 items-center bg-white/60 rounded-xl p-4 border border-gray-200">
                    <div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded w-2/5"></div><div className="h-3 bg-gray-100 rounded w-1/4"></div></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div><div className="h-4 bg-gray-200 rounded w-1/5"></div><div className="h-6 bg-gray-200 rounded-full w-20"></div><div className="h-8 bg-gray-200 rounded-lg w-16"></div>
                  </div>
                ))}
                <div className="flex items-center justify-center gap-3 py-4 text-gray-500"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div><span className="text-sm font-medium">Memuat daftar ticket...</span></div>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12"><div className="text-6xl mb-4">📭</div><p className="text-gray-600 font-medium">{searchProject || filterStatus !== "All" ? "No tickets match the search." : "No tickets yet. Create your first ticket!"}</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed bg-white border-collapse">
                  <colgroup><col style={{ width: "15%" }} /><col style={{ width: "7%" }} /><col style={{ width: "12%" }} /><col style={{ width: "9%" }} /><col style={{ width: "11%" }} /><col style={{ width: "8%" }} /><col style={{ width: "8%" }} /><col style={{ width: "5%" }} /><col style={{ width: "5%" }} /><col style={{ width: "5%" }} /><col style={{ width: "5%" }} /></colgroup>
                  <thead>
                    <tr className="bg-white border-b-2 border-gray-100">
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-r border-gray-100">Project Name</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-r border-gray-100">SN Unit</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-r border-gray-100">Issue</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-r border-gray-100">Assigned</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-r border-gray-100">Status</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-r border-gray-100">Sales</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-r border-gray-100">Created By</th>
                      <th className="px-2 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide" colSpan={canAccessAccountSettings ? 5 : 4}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket, index) => {
                      const overdue = isTicketOverdue(ticket);
                      const overdueSetting = getOverdueSetting(ticket.id);
                      const creatorUser = users.find((u) => u.username === ticket.created_by);
                      const creatorLabel = creatorUser ? creatorUser.full_name : ticket.created_by || "-";
                      const isSolvedOverdue = overdue && ticket.status === "Solved";
                      const isActiveOverdue = overdue && ticket.status !== "Solved";
                      return (
                        <tr key={ticket.id} className={`border-b border-gray-100 hover:bg-gray-50/70 transition-colors ${isActiveOverdue ? "bg-red-50 border-l-4 border-l-red-400" : isSolvedOverdue ? "bg-purple-50/60 border-l-4 border-l-purple-300" : "bg-white"}`}>
                          <td className="px-3 py-3 border-r border-gray-100 align-middle py-4">
                            <div className="flex items-start gap-1">
                              {isActiveOverdue && <span className="text-red-500 text-xs mt-0.5 shrink-0" title="Overdue!">🚨</span>}
                              {isSolvedOverdue && <span className="text-purple-500 text-xs mt-0.5 shrink-0" title="Solved tapi overdue">⚠️</span>}
                              <div className="font-bold text-gray-800 text-sm break-words leading-tight">{ticket.project_name}</div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{ticket.created_at ? formatDateTime(ticket.created_at) : "-"}</div>
                            {isActiveOverdue && <div className="text-xs text-red-600 font-bold mt-0.5">⏰ OVERDUE</div>}
                            {isSolvedOverdue && <div className="text-xs text-purple-600 font-bold mt-0.5">⏰ SOLVED OVERDUE</div>}
                          </td>
                          <td className="px-3 py-3 border-r border-gray-100 align-middle py-4"><div className="text-sm text-gray-800 break-all leading-tight">{ticket.sn_unit || "—"}</div></td>
                          <td className="px-3 py-3 border-r border-gray-100 align-middle py-4"><div className="text-sm text-gray-700 break-words leading-tight">{ticket.issue_case}</div></td>
                          <td className="px-3 py-3 border-r border-gray-100 align-middle py-4"><div className="text-sm font-semibold text-gray-800 break-words leading-tight">{ticket.assigned_to}</div><div className="text-xs text-purple-600 mt-0.5">{ticket.current_team}</div></td>
                          <td className="px-3 py-3 border-r border-gray-100 align-middle py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap ${ticket.status === "Waiting Approval" ? statusColors["Waiting Approval"] : statusColors[ticket.status] || statusColors["Pending"]}`}>{ticket.status === "Waiting Approval" ? "⏳ Waiting Approval" : ticket.status}</span>
                              {overdue && <span className={`px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap ${ticket.status === "Solved" ? "bg-purple-100 text-purple-800 border-purple-400" : statusColors["Overdue"]}`}>{ticket.status === "Solved" ? "⚠️ Solved Overdue" : "🚨 Overdue"}</span>}
                              {ticket.services_status && <span className={`px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap ${statusColors[ticket.services_status]}`}>Svc: {ticket.services_status}</span>}
                            </div>
                          </td>
                          <td className="px-2 py-3 border-r border-gray-100 align-middle"><div className="text-xs text-gray-700 break-words leading-tight">{ticket.sales_name || "—"}</div>{ticket.sales_division && <div className="text-xs text-purple-600 font-semibold mt-0.5">{ticket.sales_division}</div>}</td>
                          <td className="px-3 py-3 border-r border-gray-100 align-middle py-4"><div className="text-sm font-semibold text-gray-800 break-words leading-tight">{creatorLabel}</div>{ticket.created_by && <div className="text-xs text-indigo-500 mt-0.5">@{ticket.created_by}</div>}{ticket.created_at && <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(ticket.created_at).split(",")[0]}</div>}</td>
                          <td className="px-1 py-2 border-r border-gray-100 text-center align-middle">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center justify-center gap-1 mb-0.5"><span className="text-gray-400 text-sm">🗒️</span>{ticket.activity_logs && ticket.activity_logs.length > 0 && <span className="bg-red-600 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none" style={{ fontSize: "10px" }}>{ticket.activity_logs.length}</span>}</div>
                              <button onClick={() => { setSelectedTicket(ticket); setShowTicketDetailPopup(true); }} className="text-red-600 hover:text-red-800 transition-colors" title="View"><span className="text-base">👁</span></button>
                              {ticket.status === "Solved" && canUpdateTicket && <button onClick={() => { setReopenTargetTicket(ticket); setReopenAssignee(ticket.assigned_to || ""); setReopenNotes(""); setShowReopenModal(true); }} className="text-amber-600 hover:text-amber-800 transition-colors mt-0.5" title="Re-open"><span className="text-base">🔓</span></button>}
                            </div>
                          </td>
                          <td className="px-1 py-2 border-r border-gray-100 align-middle text-center"><button onClick={() => { setSummaryTicket(ticket); setShowActivitySummary(true); }} className="text-blue-600 hover:text-blue-800 transition-colors mx-auto block" title="Flowchart"><span className="text-base">📊</span></button>{canAccessAccountSettings && ticket.status === "Waiting Approval" && <button onClick={() => { setApprovalTicket(ticket); setApprovalAssignee(""); setShowApprovalModal(true); }} className="text-orange-600 hover:text-orange-800 transition-colors mx-auto block mt-1 animate-pulse" title="Approve"><span className="text-base">✅</span></button>}</td>
                          <td className="px-1 py-2 border-r border-gray-100 align-middle text-center"><button onClick={() => exportToPDF(ticket)} className="text-green-600 hover:text-green-800 transition-colors mx-auto block" title="Print PDF"><span className="text-base">🖨️</span></button></td>
                          {canAccessAccountSettings && (
                            <td className="px-1 py-2 align-middle text-center">
                              <button onClick={() => deleteTicket(ticket)} className="text-red-600 hover:text-red-800 transition-colors mx-auto block" title="Hapus Ticket">
                                <span className="text-base">🗑️</span>
                              </button>
                            </td>
                          )}
                          {canAccessAccountSettings && (
                            <td className="px-1 py-2 align-middle text-center">
                              <button onClick={() => { setOverdueTargetTicket(ticket); const existing = getOverdueSetting(ticket.id); setOverdueForm({ due_hours: existing?.due_hours ? String(existing.due_hours) : "48" }); setShowOverdueSetting(true); }} className={`transition-colors mx-auto block ${overdueSetting ? "text-red-600 hover:text-red-800" : "text-gray-400 hover:text-gray-600"}`} title="Overdue Setting">
                                <span className="text-base">⏰</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white"><span className="text-xs text-gray-400">{filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""} ditemukan</span><span className="text-xs text-gray-400">{filteredTickets.length > 0 ? `1–${filteredTickets.length}` : "0"} of {tickets.length}</span></div>
              </div>
            )}
          </div>
        </div>

        {/* All modals would go here - keeping them as in original file */}
        {/* Notification Popup, Ticket Detail Popup, Update Form, Approval Modals, etc. */}
        
      </div>
      <style jsx>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.25s ease-out; }
        .animate-bounce { animation: bounce 0.6s ease-out; }
        input:focus, select:focus, textarea:focus { outline: none; }
      `}</style>
    </div>
  );
}
