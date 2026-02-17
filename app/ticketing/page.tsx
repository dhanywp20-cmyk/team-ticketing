'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

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
  photo_url?: string;
  photo_name?: string;
  overdue_hours?: number;
  activity_logs?: ActivityLog[];
}

interface OverdueSettings {
  id?: string;
  overdue_hours: number;
  created_at?: string;
  updated_at?: string;
}

interface GuestMapping {
  id: string;
  guest_username: string;
  project_name: string;
  created_at: string;
}

export default function TicketingSystem() {
  const ticketListRef = useRef<HTMLDivElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginTime, setLoginTime] = useState<number | null>(null);
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [guestMappings, setGuestMappings] = useState<GuestMapping[]>([]);
  const [overdueSettings, setOverdueSettings] = useState<OverdueSettings>({ overdue_hours: 2 });
  
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showGuestMapping, setShowGuestMapping] = useState(false);
  const [showOverdueSettings, setShowOverdueSettings] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTicketDetailPopup, setShowTicketDetailPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const [searchProject, setSearchProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedHandlerTeam, setSelectedHandlerTeam] = useState<'PTS' | 'Services'>('PTS');

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Ticket[]>([]);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const [selectedUserForPassword, setSelectedUserForPassword] = useState('');

  const [newMapping, setNewMapping] = useState({
    guestUsername: '',
    projectName: ''
  });

  const [newTicket, setNewTicket] = useState({
    project_name: '',
    address: '',
    customer_phone: '',
    sales_name: '',
    sn_unit: '',
    issue_case: '',
    description: '',
    assigned_to: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Pending',
    current_team: 'Team PTS',
    photo: null as File | null
  });

  const [newActivity, setNewActivity] = useState({
    handler_name: '',
    action_taken: '',
    notes: '',
    new_status: 'Pending',
    sn_unit: '',
    file: null as File | null,
    photo: null as File | null,
    assign_to_services: false,
    services_assignee: ''
  });

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    team_member: '',
    role: 'team',
    team_type: 'Team PTS'
  });

  const [changePassword, setChangePassword] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const statusColors: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-400',
    'In Progress': 'bg-blue-100 text-blue-800 border-blue-400',
    'Solved': 'bg-green-100 text-green-800 border-green-400',
    'Overdue': 'bg-red-100 text-red-800 border-red-400'
  };

  const checkSessionTimeout = () => {
    if (loginTime) {
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      
      if (now - loginTime > sixHours) {
        handleLogout();
        alert('Your session has expired. Please login again.');
      }
    }
  };

  const isTicketOverdue = (ticket: Ticket): boolean => {
    if (ticket.status === 'Solved') return false;
    
    const now = new Date();
    const createdAt = new Date(ticket.created_at);
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    const limit = ticket.overdue_hours || overdueSettings.overdue_hours;
    return hoursDiff > limit;
  };

  const getOverdueNotifications = () => {
    if (!currentUser) return [];
    
    const member = teamMembers.find(m => (m.username || '').toLowerCase() === (currentUser.username || '').toLowerCase());
    const assignedName = member ? member.name : currentUser.full_name;
    
    return tickets.filter(t => {
      const isAssignedToMe = t.assigned_to === assignedName;
      const isOverdue = isTicketOverdue(t);
      
      if (member?.team_type === 'Team Services') {
        const isServicesNotSolved = t.services_status && t.services_status !== 'Solved';
        return isAssignedToMe && isServicesNotSolved && isOverdue;
      } else {
        const isNotSolved = t.status !== 'Solved';
        return isAssignedToMe && isNotSolved && isOverdue;
      }
    });
  };

  const getTicketStatusDisplay = (ticket: Ticket, isServicesView: boolean = false): { label: string; color: string } => {
    const status = isServicesView ? (ticket.services_status || 'Pending') : ticket.status;
    
    if (status === 'Solved') {
      return { label: 'Solved', color: statusColors['Solved'] };
    }
    
    if (isTicketOverdue(ticket)) {
      return { label: 'Overdue', color: statusColors['Overdue'] };
    }
    
    return { label: status, color: statusColors[status] };
  };

  const getNotifications = () => {
    if (!currentUser) return [];
    
    const member = teamMembers.find(m => (m.username || '').toLowerCase() === (currentUser.username || '').toLowerCase());
    const assignedName = member ? member.name : currentUser.full_name;
    
    return tickets.filter(t => {
      const isPending = t.status === 'Pending' || t.status === 'In Progress';
      const isServicesAndPending = t.services_status && (t.services_status === 'Pending' || t.services_status === 'In Progress');
      const isOverdue = isTicketOverdue(t);
      
      if (member?.team_type === 'Team Services') {
        return t.assigned_to === assignedName && (isServicesAndPending || isOverdue);
      } else {
        return t.assigned_to === assignedName && (isPending || isOverdue);
      }
    });
  };

  const formatDateTime = (dateString: string) => {
    // Parse the UTC timestamp from database
    const utcDate = new Date(dateString);
    
    // Convert to Jakarta time (UTC+7) by adding 7 hours in milliseconds
    const jakartaTime = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000));
    
    // Format the date components
    const day = String(jakartaTime.getUTCDate()).padStart(2, '0');
    const month = String(jakartaTime.getUTCMonth() + 1).padStart(2, '0');
    const year = jakartaTime.getUTCFullYear();
    const hours = String(jakartaTime.getUTCHours()).padStart(2, '0');
    const minutes = String(jakartaTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(jakartaTime.getUTCSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
  };

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', loginForm.username)
        .eq('password', loginForm.password)
        .single();

      if (error || !data) {
        alert('Incorrect username or password!');
        return;
      }

      const now = Date.now();
      setCurrentUser(data);
      setIsLoggedIn(true);
      setLoginTime(now);
      localStorage.setItem('currentUser', JSON.stringify(data));
      localStorage.setItem('loginTime', now.toString());
    } catch (err) {
      alert('Login failed!');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginTime(null);
    setSelectedTicket(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
  };

  const fetchGuestMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('guest_mappings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGuestMappings(data || []);
    } catch (err: any) {
      console.error('Error fetching guest mappings:', err);
    }
  };

  const fetchData = async () => {
    try {
      const [ticketsData, membersData, usersData, overdueData] = await Promise.all([
        supabase.from('tickets').select('*, activity_logs(*)').order('created_at', { ascending: false }),
        supabase.from('team_members').select('*').order('name'),
        supabase.from('users').select('id, username, full_name, role, team_type'),
        supabase.from('overdue_settings').select('*').limit(1).single()
      ]);

      if (ticketsData.data) {
        if (currentUser?.role === 'guest') {
          const { data: mappings } = await supabase
            .from('guest_mappings')
            .select('project_name')
            .eq('guest_username', currentUser.username);

          if (mappings && mappings.length > 0) {
            const allowedProjectNames = mappings.map((m: GuestMapping) => m.project_name);
            const filteredTickets = ticketsData.data.filter((ticket: Ticket) => 
              allowedProjectNames.includes(ticket.project_name)
            );
            setTickets(filteredTickets);
            
            if (selectedTicket && !allowedProjectNames.includes(selectedTicket.project_name)) {
              setSelectedTicket(null);
            }
          } else {
            setTickets([]);
            setSelectedTicket(null);
          }
        } else {
          setTickets(ticketsData.data);
        }
      }
      
      if (membersData.data) setTeamMembers(membersData.data);
      if (usersData.data) setUsers(usersData.data);
      if (overdueData.data) {
        setOverdueSettings(overdueData.data);
      } else {
        // Create default settings if not exists
        const { data: newSettings } = await supabase
          .from('overdue_settings')
          .insert({ overdue_hours: 2 })
          .select()
          .single();
        if (newSettings) setOverdueSettings(newSettings);
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!newTicket.project_name || !newTicket.issue_case || !newTicket.assigned_to) {
      alert('Project name, Issue case, and Assigned to must be filled!');
      return;
    }

    const validStatuses = ['Pending', 'In Progress', 'Solved'];
    if (!validStatuses.includes(newTicket.status)) {
      alert('Invalid status! Use: Pending, In Progress, or Solved');
      return;
    }

    try {
      setUploading(true);
      setShowLoadingPopup(true);
      setLoadingMessage('Saving new ticket...');
      
      let photoUrl = '';
      let photoName = '';

      // Upload photo if provided
      if (newTicket.photo) {
        setLoadingMessage('Uploading photo...');
        try {
          const result = await uploadFile(newTicket.photo, 'ticket-photos');
          photoUrl = result.url;
          photoName = result.name;
        } catch (uploadErr: any) {
          console.error('Photo upload error:', uploadErr);
          throw new Error(`Failed to upload photo: ${uploadErr.message}`);
        }
      }
      
      setLoadingMessage('Saving ticket data...');
      
      const ticketData = {
        project_name: newTicket.project_name,
        address: newTicket.address || null,
        customer_phone: newTicket.customer_phone || null,
        sales_name: newTicket.sales_name || null,
        sn_unit: newTicket.sn_unit || null,
        issue_case: newTicket.issue_case,
        description: newTicket.description || null,
        assigned_to: newTicket.assigned_to,
        date: newTicket.date,
        status: newTicket.status,
        current_team: 'Team PTS',
        services_status: null,
        created_by: currentUser?.username || null,
        photo_url: photoUrl || null,
        photo_name: photoName || null
      };

      const { error } = await supabase.from('tickets').insert([ticketData]);
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setNewTicket({
        project_name: '',
        address: '',
        customer_phone: '',
        sales_name: '',
        sn_unit: '',
        issue_case: '',
        description: '',
        assigned_to: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        current_team: 'Team PTS',
        photo: null
      });
      setShowNewTicket(false);
      
      await fetchData();
      
      setLoadingMessage('✅ Ticket saved successfully!');
      setTimeout(() => {
        setShowLoadingPopup(false);
        setUploading(false);
      }, 1500);
    } catch (err: any) {
      setShowLoadingPopup(false);
      setUploading(false);
      alert('Error: ' + err.message);
    }
  };

  const uploadFile = async (file: File, folder: string = 'reports'): Promise<{ url: string; name: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${folder}/${fileName}`;

    const { error } = await supabase.storage.from('ticket-photos').upload(filePath, file);
    if (error) throw error;

    const { data } = supabase.storage.from('ticket-photos').getPublicUrl(filePath);
    return { url: data.publicUrl, name: file.name };
  };

  const addActivity = async () => {
    if (!newActivity.notes || !selectedTicket) {
      alert('Notes must be filled!');
      return;
    }

    const validStatuses = ['Pending', 'In Progress', 'Solved'];
    if (!validStatuses.includes(newActivity.new_status)) {
      alert('Invalid status! Use: Pending, In Progress, or Solved');
      return;
    }

    if (newActivity.assign_to_services && !newActivity.services_assignee) {
      alert('Select assignee from Team Services!');
      return;
    }

    try {
      setUploading(true);
      setShowLoadingPopup(true);
      setLoadingMessage('Updating ticket status...');
      
      let fileUrl = '';
      let fileName = '';
      let photoUrl = '';
      let photoName = '';

      if (newActivity.file) {
        setLoadingMessage('Uploading PDF file...');
        try {
          const result = await uploadFile(newActivity.file, 'reports');
          fileUrl = result.url;
          fileName = result.name;
        } catch (uploadErr: any) {
          console.error('File upload error:', uploadErr);
          throw new Error(`Failed to upload PDF: ${uploadErr.message}`);
        }
      }

      if (newActivity.photo) {
        setLoadingMessage('Uploading photo...');
        try {
          const result = await uploadFile(newActivity.photo, 'photos');
          photoUrl = result.url;
          photoName = result.name;
        } catch (uploadErr: any) {
          console.error('Photo upload error:', uploadErr);
          throw new Error(`Failed to upload photo: ${uploadErr.message}`);
        }
      }

      const member = teamMembers.find(m => (m.username || '').toLowerCase() === (currentUser?.username || '').toLowerCase());
      const teamType = member?.team_type || 'Team PTS';

      setLoadingMessage('Saving activity log...');

      // Prepare activity data with all required fields
      const activityData: any = {
        ticket_id: selectedTicket.id,
        handler_name: newActivity.handler_name,
        handler_username: currentUser?.username || '',
        action_taken: newActivity.action_taken || '',
        notes: newActivity.notes,
        new_status: newActivity.new_status,
        team_type: teamType,
        assigned_to_services: newActivity.assign_to_services || false,
        file_url: fileUrl || '',
        file_name: fileName || '',
        photo_url: photoUrl || '',
        photo_name: photoName || ''
      };

      // Try to insert activity log
      const { data: insertedActivity, error: activityError } = await supabase
        .from('activity_logs')
        .insert([activityData])
        .select();
      
      if (activityError) {
        console.error('Activity log insert error:', activityError);
        console.error('Error details:', {
          code: activityError.code,
          message: activityError.message,
          details: activityError.details,
          hint: activityError.hint
        });
        
        // Check if it's an RLS policy error
        if (activityError.message.includes('row-level security') || 
            activityError.message.includes('policy') ||
            activityError.code === '42501' ||
            activityError.code === 'PGRST301') {
          
          const errorMsg = `❌ DATABASE PERMISSION ERROR (RLS Policy)

Tabel 'activity_logs' memiliki Row-Level Security (RLS) policy yang memblokir insert data.

SOLUSI UNTUK ADMINISTRATOR SUPABASE:
1. Buka Supabase Dashboard → Authentication → Policies
2. Pilih tabel 'activity_logs'
3. Tambahkan policy baru untuk INSERT:

   Policy Name: "Allow insert activity logs"
   Policy Command: INSERT
   Target Roles: public (atau authenticated)
   USING expression: true
   WITH CHECK expression: true

SQL Command (jalankan di SQL Editor):
CREATE POLICY "Allow insert activity logs"
ON activity_logs FOR INSERT
TO public
WITH CHECK (true);

-- Atau untuk authenticated users only:
CREATE POLICY "Allow authenticated insert activity logs"
ON activity_logs FOR INSERT
TO authenticated
WITH CHECK (true);

Error Detail: ${activityError.message}
Error Code: ${activityError.code}`;

          throw new Error(errorMsg);
        }
        
        throw new Error(`Database error: ${activityError.message}`);
      }

      setLoadingMessage('Updating ticket status...');

      // Update ticket status
      const updateData: any = {};

      if (newActivity.sn_unit) {
        updateData.sn_unit = newActivity.sn_unit;
      }
      
      if (teamType === 'Team PTS') {
        updateData.status = newActivity.new_status;
        
        if (newActivity.assign_to_services) {
          updateData.current_team = 'Team Services';
          updateData.services_status = 'Pending';
          updateData.assigned_to = newActivity.services_assignee;

          // Trigger Email Notification (Backend Function)
          supabase.functions.invoke('send-email', {
            body: {
              ticketId: selectedTicket.id,
              projectName: selectedTicket.project_name,
              issueCase: selectedTicket.issue_case,
              assignedTo: newActivity.services_assignee,
              snUnit: selectedTicket.sn_unit || '-',
              customerPhone: selectedTicket.customer_phone || '-',
              salesName: selectedTicket.sales_name || '-',
              activityLog: newActivity.notes || '-'
            }
          }).then(({ error }) => {
            if (error) console.error('Failed to send email:', error);
          });
        }
      } else if (teamType === 'Team Services') {
        updateData.services_status = newActivity.new_status;
      }

      const { error: updateError } = await supabase.from('tickets')
        .update(updateData)
        .eq('id', selectedTicket.id);

      if (updateError) {
        console.error('Ticket update error:', updateError);
        throw new Error(`Failed to update ticket: ${updateError.message}`);
      }

      setNewActivity({
        handler_name: newActivity.handler_name,
        action_taken: '',
        notes: '',
        new_status: 'Pending',
        sn_unit: '',
        file: null,
        photo: null,
        assign_to_services: false,
        services_assignee: ''
      });
      
      await fetchData();
      
      setLoadingMessage('✅ Status updated successfully!');
      setTimeout(() => {
        setShowLoadingPopup(false);
        setUploading(false);
        setShowUpdateForm(false);
      }, 1500);
    } catch (err: any) {
      setShowLoadingPopup(false);
      setUploading(false);
      
      // Show detailed error message
      if (err.message.includes('RLS Policy') || err.message.includes('PERMISSION ERROR')) {
        alert(err.message);
      } else {
        alert('Error: ' + err.message);
      }
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) {
      alert('All fields must be filled!');
      return;
    }

    const lowerUsername = newUser.username.toLowerCase();

    // Determine team_type based on role
    let finalTeamType = newUser.team_type;
    if (newUser.role === 'guest') {
      finalTeamType = 'Guest';
    } else if (newUser.role === 'admin') {
      finalTeamType = 'Team PTS';
    }

    try {
      // 1. Create User
      const { error: userError } = await supabase.from('users').insert([{
        username: lowerUsername,
        password: newUser.password,
        full_name: newUser.full_name,
        role: newUser.role,
        team_type: finalTeamType
      }]);

      if (userError) throw userError;

      // 2. If role is 'team', create Team Member entry automatically
      if (newUser.role === 'team') {
        const { error: memberError } = await supabase.from('team_members').insert([{
          name: newUser.full_name,
          username: lowerUsername,
          role: 'Support Engineer', // Default role
          team_type: finalTeamType,
          photo_url: `https://ui-avatars.com/api/?name=${newUser.full_name}&background=random&color=fff&size=128`
        }]);

        if (memberError) {
          console.error('Error creating team member:', memberError);
          alert('User created but failed to create team member entry: ' + memberError.message);
        }
      }

      setNewUser({ username: '', password: '', full_name: '', team_member: '', role: 'team', team_type: 'Team PTS' });
      await fetchData();
      alert('User created successfully!');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const addGuestMapping = async () => {
    if (!newMapping.guestUsername || !newMapping.projectName) {
      alert('All fields must be filled!');
      return;
    }

    const guestUser = users.find(u => u.username === newMapping.guestUsername && u.role === 'guest');
    if (!guestUser) {
      alert('Guest username not found or not a guest role!');
      return;
    }

    const projectExists = tickets.some(t => t.project_name === newMapping.projectName);
    if (!projectExists) {
      alert('Project name not found!');
      return;
    }

    try {
      setUploading(true);
      const { error } = await supabase.from('guest_mappings').insert([{
        guest_username: newMapping.guestUsername,
        project_name: newMapping.projectName
      }]);

      if (error) {
        // Check for RLS error on guest_mappings
        if (error.message.includes('row-level security') || error.code === '42501') {
          throw new Error(`RLS Policy Error: Guest mappings table requires proper permissions. Contact administrator to enable INSERT policy for guest_mappings table.`);
        }
        throw error;
      }

      setNewMapping({ guestUsername: '', projectName: '' });
      await fetchGuestMappings();
      setUploading(false);
      alert('Guest mapping added successfully!');
    } catch (err: any) {
      alert('Error: ' + err.message);
      setUploading(false);
    }
  };

  const deleteGuestMapping = async (mappingId: string) => {
    try {
      setUploading(true);
      const { error } = await supabase
        .from('guest_mappings')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;

      await fetchGuestMappings();
      setUploading(false);
      alert('Guest mapping deleted successfully!');
    } catch (err: any) {
      alert('Error: ' + err.message);
      setUploading(false);
    }
  };

  const updateOverdueSettings = async (hours: number) => {
    if (hours <= 0) {
      alert('Overdue hours must be greater than 0!');
      return;
    }

    try {
      setUploading(true);
      
      if (overdueSettings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('overdue_settings')
          .update({ overdue_hours: hours, updated_at: new Date().toISOString() })
          .eq('id', overdueSettings.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = await supabase
          .from('overdue_settings')
          .insert({ overdue_hours: hours });

        if (error) throw error;
      }

      setOverdueSettings({ ...overdueSettings, overdue_hours: hours });
      setUploading(false);
      alert('Overdue settings updated successfully!');
      setShowOverdueSettings(false);
    } catch (err: any) {
      alert('Error updating overdue settings: ' + err.message);
      setUploading(false);
    }
  };

  const updatePassword = async () => {
    if (!selectedUserForPassword) {
      alert('Select user first!');
      return;
    }

    if (!changePassword.current || !changePassword.new || !changePassword.confirm) {
      alert('All fields must be filled!');
      return;
    }

    if (changePassword.new !== changePassword.confirm) {
      alert('New password does not match!');
      return;
    }

    try {
      const selectedUser = users.find(u => u.id === selectedUserForPassword);
      if (!selectedUser) {
        alert('User not found!');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('password')
        .eq('id', selectedUserForPassword)
        .single();

      if (!userData || userData.password !== changePassword.current) {
        alert('Old password is incorrect!');
        return;
      }

      await supabase.from('users')
        .update({ password: changePassword.new })
        .eq('id', selectedUserForPassword);

      if (currentUser?.id === selectedUserForPassword) {
        const updatedUser = { ...currentUser, password: changePassword.new };
        setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }

      alert('Password changed successfully!');
      setChangePassword({ current: '', new: '', confirm: '' });
      setSelectedUserForPassword('');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
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
          <h1>Ticket Report</h1>
          <h2><th>Project Name :</th>${ticket.project_name}</h2>
          <table>
            <tr><th>Issue :</th><td>${ticket.issue_case}</td></tr>
            <tr><th>SN Unit :</th><td>${ticket.sn_unit || '-'}</td></tr>
            <tr><th>Name & Phone User :</th><td>${ticket.customer_phone || '-'}</td></tr>
            <tr><th>Sales Project :</th><td>${ticket.sales_name || '-'}</td></tr>
            <tr><th>Status Team PTS :</th><td>${ticket.status}</td></tr>
            ${ticket.services_status ? `<tr><th>Status Team Services :</th><td>${ticket.services_status}</td></tr>` : ''}
            <tr><th>Current Team :</th><td>${ticket.current_team}</td></tr>
            <tr><th>Date :</th><td>${ticket.date}</td></tr>
          </table>
          ${ticket.photo_url ? `
            <h3>Ticket Photo:</h3>
            <img src="${ticket.photo_url}" class="photo-thumbnail" alt="Ticket photo"/>
          ` : ''}
          <h3>Activity Log :</h3>
          ${ticket.activity_logs?.map(log => `
            <div class="activity">
              <strong>${log.handler_name}</strong> <span class="team-badge">${log.team_type}</span> - ${formatDateTime(log.created_at)}<br/>
              Status: ${log.new_status}<br/>
              ${log.action_taken ? `Action: ${log.action_taken}<br/>` : ''}
              Notes: ${log.notes}
              ${log.assigned_to_services ? '<br/><strong style="color: #EF4444;">→ Assigned to Team Services</strong>' : ''}
              ${log.photo_url ? `<br/><img src="${log.photo_url}" class="photo-thumbnail" alt="Activity photo"/>` : ''}
            </div>
          `).join('') || 'No activities'}
        </body>
      </html>
    `;
    
    const win = window.open('', '', 'height=700,width=700');
    win?.document.write(printContent);
    win?.document.close();
    win?.print();
  };

  const exportToExcel = () => {
    // Dashboard Analytics Summary
    const summary = [
      ['Dashboard Analytics'],
      ['Total Tickets', stats.total],
      ['Pending', stats.pending],
      ['In Progress', stats.processing],
      ['Solved', stats.solved],
      [''],
      ['Ticket Report Data']
    ].map(row => row.join(',')).join('\n');

    const headers = ['Project Name', 'Issue Case', 'Assigned To', 'Status', 'Date', 'Created By', 'Current Team', 'Services Status', 'Activity Logs'];
    const csvContent = [
      summary,
      headers.join(','),
      ...tickets.map(t => {
        const activities = t.activity_logs?.map(log => 
          `[${new Date(log.created_at).toLocaleString('id-ID')}] ${log.handler_name} (${log.new_status}): ${log.notes} ${log.action_taken ? `| Action: ${log.action_taken}` : ''}`
        ).join('\n') || '-';

        return [
          t.project_name,
          t.issue_case,
          t.assigned_to,
          t.status,
          t.date,
          t.created_by,
          t.current_team,
          t.services_status,
          activities
        ].map(e => `"${(e || '').toString().replace(/"/g, '""')}"`).join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Ticket_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const currentUserTeamType = useMemo(() => {
    if (!currentUser) return 'Team PTS';
    const member = teamMembers.find(m => (m.username || '').toLowerCase() === (currentUser.username || '').toLowerCase());
    return member?.team_type || 'Team PTS';
  }, [currentUser, teamMembers]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const projectName = t.project_name || '';
      const issueCase = t.issue_case || '';
      const salesName = t.sales_name || '';

      const match = projectName.toLowerCase().includes(searchProject.toLowerCase()) ||
                    issueCase.toLowerCase().includes(searchProject.toLowerCase()) ||
                    salesName.toLowerCase().includes(searchProject.toLowerCase());
      const statusMatch = filterStatus === 'All' || t.status === filterStatus;
      
      // Team Visibility Logic
      let teamVisibility = true;
      if (currentUserTeamType === 'Team Services') {
        // Services team only sees tickets assigned to them (current_team is Services OR services_status is active)
        teamVisibility = t.current_team === 'Team Services' || !!t.services_status;
      }
      
      return match && statusMatch && teamVisibility;
    });
  }, [tickets, searchProject, filterStatus, currentUserTeamType]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const processing = tickets.filter(t => t.status === 'In Progress').length;
    const pending = tickets.filter(t => t.status === 'Pending').length;
    const solved = tickets.filter(t => t.status === 'Solved').length;
    const overdue = tickets.filter(t => isTicketOverdue(t)).length;
    
    return {
      total, pending, processing, solved, overdue,
      statusData: [
        { name: 'Pending', value: pending, color: '#FCD34D' },
        { name: 'In Progress', value: processing, color: '#60A5FA' },
        { name: 'Solved', value: solved, color: '#34D399' },
        { name: 'Overdue', value: overdue, color: '#F87171' }
      ].filter(d => d.value > 0),
      handlerData: Object.entries(
        tickets.reduce((acc, t) => {
          acc[t.assigned_to] = (acc[t.assigned_to] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, tickets]) => {
        const member = teamMembers.find(m => m.name.trim().toLowerCase() === name.trim().toLowerCase());
        return { name, tickets, team: member?.team_type || 'Team PTS' };
      })
    };
  }, [tickets, overdueSettings]);

  const uniqueProjectNames = useMemo(() => {
    const names = tickets.map(t => t.project_name);
    return Array.from(new Set(names)).sort();
  }, [tickets]);

  const teamPTSMembers = useMemo(() => teamMembers.filter(m => m.team_type === 'Team PTS'), [teamMembers]);
  const teamServicesMembers = useMemo(() => teamMembers.filter(m => m.team_type === 'Team Services'), [teamMembers]);

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    const savedTime = localStorage.getItem('loginTime');
    
    if (saved && savedTime) {
      const user = JSON.parse(saved);
      const time = parseInt(savedTime);
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      
      if (now - time > sixHours) {
        handleLogout();
        alert('Your session has expired. Please login again.');
      } else {
        setCurrentUser(user);
        setIsLoggedIn(true);
        setLoginTime(time);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (currentUser && teamMembers.length > 0) {
      const member = teamMembers.find(m => m.username === currentUser.username);
      if (member) {
        setNewActivity(prev => ({ ...prev, handler_name: member.name }));
      } else {
        setNewActivity(prev => ({ ...prev, handler_name: currentUser.full_name }));
      }
    }
  }, [currentUser, teamMembers]);

  useEffect(() => {
    if (isLoggedIn && tickets.length > 0) {
      const notifs = getNotifications();
      setNotifications(notifs);
      
      if (notifs.length > 0 && !showNotificationPopup) {
        setShowNotificationPopup(true);
      }
    }
  }, [tickets, isLoggedIn, currentUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkSessionTimeout();
    }, 60000);

    return () => clearInterval(interval);
  }, [loginTime]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchGuestMappings();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const canCreateTicket = currentUser?.role !== 'guest';
  const canUpdateTicket = currentUser?.role !== 'guest';
  const canAccessAccountSettings = currentUser?.role === 'admin';



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="bg-white/75 p-8 rounded-2xl shadow-2xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md border-4 border-red-600">
          <h1 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">
            Login
          </h1>
          <p className="text-center text-gray-700 font-bold mb-6">Reminder Troubleshooting<br/>IVP Product</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full border-3 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full border-3 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200"
                placeholder="Enter password"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-xl hover:from-red-700 hover:to-red-900 font-bold shadow-xl transition-all"
            >
              🔐 Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-cover bg-center bg-fixed bg-no-repeat" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      {showLoadingPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000]">
          <div className="bg-white/70 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border-4 border-blue-500 animate-scale-in">
            <div className="flex flex-col items-center">
              {loadingMessage.includes('✅') ? (
                <div className="text-6xl mb-4 animate-bounce">✅</div>
              ) : (
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
              )}
              <p className="text-xl font-bold text-gray-800 text-center">{loadingMessage}</p>
            </div>
          </div>
        </div>
      )}

      {uploading && !showLoadingPopup && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
          <div className="h-full bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto">
        {showNotifications && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white/70 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-scale-in">
              <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-yellow-400 to-yellow-500">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🔔</span>
                    <div>
                      <h3 className="text-xl font-bold text-white">Ticket Notifications</h3>
                      {notifications.length > 0 && (
                        <p className="text-sm text-white/90">
                          {notifications.length} tickets need attention
                        </p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-white hover:bg-white/80 rounded-lg p-2 font-bold transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-lg font-medium">No notifications</p>
                  <p className="text-sm mt-2">All tickets have been handled</p>
                </div>
              ) : (
                <div className="max-h-[calc(80vh-120px)] overflow-y-auto p-4">
                  <div className="space-y-3">
                    {notifications.map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setShowNotifications(false);
                          setShowTicketDetailPopup(true);
                        }}
                        className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-300 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-bold text-lg text-gray-800">{ticket.project_name}</p>
                              <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 font-bold">
                                {ticket.current_team}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{ticket.issue_case}</p>
                          </div>
                          <div className="ml-3 flex flex-col gap-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColors[currentUserTeamType === 'Team Services' ? (ticket.services_status || 'Pending') : ticket.status]}`}>
                              {currentUserTeamType === 'Team Services' ? (ticket.services_status || 'Pending') : ticket.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                          <span className="text-xs text-gray-500">
                            📅 {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('id-ID') : '-'}
                          </span>
                          <span className="text-sm text-blue-600 font-semibold">Click to view details →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="p-4 border-t-2 border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showNotificationPopup && notifications.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white/75 rounded-2xl shadow-2xl max-w-md w-full p-6 border-4 border-yellow-500 animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">🔔</span>
                <h3 className="text-xl font-bold text-gray-800">Ticket Notifications</h3>
              </div>
              <p className="text-gray-700 mb-4">
                You have <strong className="text-red-600">{notifications.length}</strong> tickets that need attention:
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                {notifications.map(ticket => {
                  const statusDisplay = getTicketStatusDisplay(ticket, currentUserTeamType === 'Team Services');
                  const isOverdue = isTicketOverdue(ticket);
                  
                  return (
                    <div 
                      key={ticket.id} 
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setShowNotificationPopup(false);
                        setShowTicketDetailPopup(true);
                      }}
                      className={`p-3 rounded-lg border-2 cursor-pointer hover:bg-gray-50 transition-colors ${statusDisplay.color}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-sm flex-1">{ticket.project_name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                          {ticket.current_team}
                        </span>
                      </div>
                      <p className="text-xs mb-1">{ticket.issue_case}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{statusDisplay.label}</span>
                        {isOverdue && (
                          <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                            <span>⚠️</span>
                            <span>OVERDUE!</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setShowNotificationPopup(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showTicketDetailPopup && selectedTicket && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white/85 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
              <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">🏢 {selectedTicket.project_name}</h2>
                    <span className="text-sm px-3 py-1 rounded-full bg-white/80 text-white font-bold">
                      {selectedTicket.current_team}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      setShowTicketDetailPopup(false);
                      setSelectedTicket(null);
                    }}
                    className="text-white hover:bg-white/90 rounded-lg p-2 font-bold transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedTicket.address && (
                        <div className="col-span-2">
                          <span className="text-gray-600 font-semibold">📍 Address Detail:</span>
                          <p className="text-gray-800 font-medium">{selectedTicket.address}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600 font-semibold">Issue Case:</span>
                        <p className="text-gray-800 font-medium">{selectedTicket.issue_case}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-semibold">SN Unit:</span>
                        <p className="text-gray-800">{selectedTicket.sn_unit || '-'}</p>
                      </div>
                      {selectedTicket.customer_phone && (
                        <div>
                          <span className="text-gray-600 font-semibold">Customer Phone:</span>
                          <p className="text-gray-800">{selectedTicket.customer_phone}</p>
                        </div>
                      )}
                      {selectedTicket.sales_name && (
                        <div>
                          <span className="text-gray-600 font-semibold">Project Sales:</span>
                          <p className="text-gray-800">{selectedTicket.sales_name}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600 font-semibold">Assigned to:</span>
                        <p className="text-gray-800">{selectedTicket.assigned_to}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-semibold">Date:</span>
                        <p className="text-gray-800">{selectedTicket.date ? new Date(selectedTicket.date).toLocaleDateString('id-ID') : '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-semibold">Status Team PTS:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColors[selectedTicket.status]} ml-2`}>
                          {selectedTicket.status}
                        </span>
                      </div>
                      {selectedTicket.services_status && (
                        <div>
                          <span className="text-gray-600 font-semibold">Status Team Services:</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColors[selectedTicket.services_status]} ml-2`}>
                            {selectedTicket.services_status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedTicket.description && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-semibold text-gray-600 mb-1">Description:</p>
                      <p className="text-sm text-gray-800">{selectedTicket.description}</p>
                    </div>
                  )}

                  {selectedTicket.photo_url && (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm font-semibold text-gray-600 mb-3">📷 Ticket Photo:</p>
                      <img 
                        src={selectedTicket.photo_url} 
                        alt={selectedTicket.photo_name || 'Ticket photo'} 
                        className="max-w-md w-full rounded-lg border-2 border-blue-300 shadow-md cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => window.open(selectedTicket.photo_url, '_blank')}
                      />
                    </div>
                  )}

                  <div className="border-t-2 border-gray-200 pt-4">
                    <h3 className="font-bold text-lg mb-4">📝 Activity Log</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedTicket.activity_logs && selectedTicket.activity_logs.length > 0 ? (
                        selectedTicket.activity_logs.map((log) => (
                          <div key={log.id} className="activity-log">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-bold text-gray-800">{log.handler_name}</p>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                                    {log.team_type}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">{formatDateTime(log.created_at)}</p>
                                {log.handler_username && <p className="text-xs text-blue-600">@{log.handler_username}</p>}
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColors[log.new_status]}`}>
                                {log.new_status}
                              </span>
                            </div>
                            {log.action_taken && (
                              <div className="bg-blue-50 border-l-4 border-blue-500 rounded px-3 py-2 mb-2">
                                <p className="text-sm font-bold text-blue-900">🔧 Action :</p>
                                <p className="text-sm text-gray-900">{log.action_taken}</p>
                              </div>
                            )}
                            <p className="text-sm font-bold text-blue-900">Notes :</p>
                            <p className="text-sm text-gray-900">{log.notes}</p>
                            {log.assigned_to_services && (
                              <div className="mt-2 p-2 bg-red-50 border-l-4 border-red-500 rounded">
                                <p className="text-sm font-bold text-red-800">→ Ticket assigned to Team Services</p>
                              </div>
                            )}
                            {log.photo_url && (
                              <div className="mt-3">
                                <p className="text-sm font-bold text-gray-700 mb-2">📷 Foto Bukti Progress:</p>
                                <img 
                                  src={log.photo_url} 
                                  alt={log.photo_name || 'Activity photo'} 
                                  className="max-w-md w-full rounded-lg border-2 border-gray-300 shadow-md cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => window.open(log.photo_url, '_blank')}
                                />
                              </div>
                            )}
                            {log.file_url && (
                              <a href={log.file_url} download={log.file_name} className="file-download">
                                📄 {log.file_name || 'Download Report'}
                              </a>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No activities yet</p>
                      )}
                    </div>
                  </div>

                  {canUpdateTicket && (
                    <div className="border-t-2 border-gray-200 pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-xl text-gray-800">➕ Update Status</h3>
                        <button
                          onClick={() => {
                            if (!showUpdateForm) {
                              setNewActivity(prev => ({ ...prev, sn_unit: selectedTicket.sn_unit || '' }));
                            }
                            setShowUpdateForm(!showUpdateForm);
                          }}
                          className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-800 font-bold transition-all flex items-center gap-2"
                        >
                          <span>{showUpdateForm ? '🔼 Hide Form' : '🔽 Show Form'}</span>
                        </button>
                      </div>
                      
                      {showUpdateForm && (
                        <div className="space-y-4 animate-slide-down">
                          <div className="bg-white/75 rounded-xl p-4 border border-gray-300 shadow-sm">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">👤 Handler (Auto from Logged User)</label>
                            <input 
                              type="text" 
                              value={newActivity.handler_name} 
                              disabled 
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-100 cursor-not-allowed text-gray-700 font-semibold"
                              title="Handler auto-filled from logged user"
                            />
                            <p className="text-xs text-gray-500 italic mt-2">* Handler cannot be changed, auto-filled from logged account</p>
                          </div>
                          
                          <div className="bg-white/75 rounded-xl p-4 border border-gray-300 shadow-sm">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">🔢 No SN Unit</label>
                            <input 
                              type="text" 
                              value={newActivity.sn_unit} 
                              onChange={(e) => setNewActivity({...newActivity, sn_unit: e.target.value})} 
                              placeholder="Update SN Unit..." 
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                            />
                          </div>

                          <div className="bg-white/75 rounded-xl p-4 border border-gray-300 shadow-sm">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">🏷️ New Status *</label>
                            <select 
                              value={newActivity.new_status} 
                              onChange={(e) => setNewActivity({...newActivity, new_status: e.target.value})} 
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Solved">Solved</option>
                            </select>
                          </div>
                          
                          <div className="bg-white rounded-xl p-4 border border-gray-300 shadow-sm">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">🔧 Action Taken</label>
                            <input 
                              type="text" 
                              value={newActivity.action_taken} 
                              onChange={(e) => setNewActivity({...newActivity, action_taken: e.target.value})} 
                              placeholder="Example: Check HDMI cable and power, restart system" 
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                            />
                          </div>
                          
                          <div className="bg-white rounded-xl p-4 border border-gray-300 shadow-sm">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">📝 Detailed Notes *</label>
                            <textarea 
                              value={newActivity.notes} 
                              onChange={(e) => setNewActivity({...newActivity, notes: e.target.value})} 
                              placeholder="Explain details ....." 
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white resize-none"
                              rows={4}
                            />
                          </div>

                          {currentUserTeamType === 'Team PTS' && newActivity.new_status === 'Solved' && (
                            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border-2 border-red-300 shadow-sm">
                              <div className="flex items-start gap-3 mb-3">
                                <input 
                                  type="checkbox" 
                                  id="assign_services"
                                  checked={newActivity.assign_to_services}
                                  onChange={(e) => setNewActivity({...newActivity, assign_to_services: e.target.checked, services_assignee: ''})}
                                  className="mt-1 w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                                />
                                <label htmlFor="assign_services" className="flex-1 cursor-pointer">
                                  <span className="block text-sm font-bold text-red-800">🔄 Assign to Team Services</span>
                                  <span className="text-xs text-red-600">Check if ticket needs to be handled by Team Services</span>
                                </label>
                              </div>
                              
                              {newActivity.assign_to_services && (
                                <div className="mt-3 animate-slide-down">
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select Handler from Team Services *</label>
                                  <select 
                                    value={newActivity.services_assignee} 
                                    onChange={(e) => setNewActivity({...newActivity, services_assignee: e.target.value})} 
                                    className="w-full border-2 border-red-400 rounded-lg px-4 py-2.5 focus:border-red-600 focus:ring-2 focus:ring-red-100 transition-all bg-white"
                                  >
                                    <option value="">-- Select Handler --</option>
                                    {teamServicesMembers.map(m => (
                                      <option key={m.id} value={m.name}>{m.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="bg-white rounded-xl p-4 border border-gray-300 shadow-sm">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">📷 Upload Foto Bukti Progress (JPG/PNG)</label>
                            <input 
                              type="file" 
                              accept="image/jpeg,image/jpg,image/png" 
                              onChange={(e) => setNewActivity({...newActivity, photo: e.target.files?.[0] || null})} 
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 transition-all"
                            />
                            {newActivity.photo && (
                              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 text-sm mb-2">
                                  <span className="text-green-700 font-bold">✓ Photo selected:</span>
                                  <span className="text-gray-800 font-semibold">{newActivity.photo.name}</span>
                                  <span className="text-gray-600">({(newActivity.photo.size / 1024).toFixed(2)} KB)</span>
                                </div>
                                <img 
                                  src={URL.createObjectURL(newActivity.photo)} 
                                  alt="Preview" 
                                  className="max-w-xs rounded-lg border-2 border-green-300"
                                />
                              </div>
                            )}
                          </div>

                          <div className="bg-white rounded-xl p-4 border border-gray-300 shadow-sm">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">📎 Upload Report File (PDF)</label>
                            <input 
                              type="file" 
                              accept=".pdf" 
                              onChange={(e) => setNewActivity({...newActivity, file: e.target.files?.[0] || null})} 
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all"
                            />
                            {newActivity.file && (
                              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-blue-700 font-bold">✓ File selected:</span>
                                  <span className="text-gray-800 font-semibold">{newActivity.file.name}</span>
                                  <span className="text-gray-600">({(newActivity.file.size / 1024).toFixed(2)} KB)</span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <button 
                            onClick={addActivity} 
                            disabled={uploading || !newActivity.notes.trim() || (newActivity.assign_to_services && !newActivity.services_assignee)} 
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3.5 rounded-xl hover:from-blue-700 hover:to-blue-900 font-bold shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                          >
                            {uploading ? '⏳ Uploading & Saving...' : '💾 Update Status & Save'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 border-t-2 border-gray-200 bg-gray-50 flex gap-3">
                <button
                  onClick={() => exportToPDF(selectedTicket)}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 font-bold transition-all"
                >
                  📄 Export PDF
                </button>
                <button
                  onClick={() => {
                    setShowTicketDetailPopup(false);
                    setSelectedTicket(null);
                  }}
                  className="flex-1 bg-gradient-to-r from-gray-500 to-gray-700 text-white py-3 rounded-xl hover:from-gray-600 hover:to-gray-800 font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-4 border-red-600">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 mb-1">
                📋 Reminder Troubleshooting
              </h1>
              <p className="text-gray-800 font-bold text-lg">IVP Product</p>
              <p className="text-sm text-gray-600">
                Welcome: <span className="font-bold text-red-600">{currentUser?.full_name}</span>
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-bold">
                  {currentUser?.role === 'admin' ? 'Administrator' : currentUser?.role === 'team' ? `Team - ${currentUserTeamType}` : 'Guest'}
                </span>
              </p>
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-3 rounded-xl hover:from-yellow-600 hover:to-yellow-700 font-bold shadow-lg transition-all"
                title="Notifications"
              >
                🔔
                {notifications.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>

              {canAccessAccountSettings && (
                <button 
                  onClick={() => {
                    setShowAccountSettings(!showAccountSettings);
                    setShowGuestMapping(false);
                    setShowNewTicket(false);
                  }} 
                  className="btn-secondary"
                >
                  ⚙️ Account
                </button>
              )}
              {canAccessAccountSettings && (
                <button 
                  onClick={() => {
                    setShowGuestMapping(!showGuestMapping);
                    setShowAccountSettings(false);
                    setShowNewTicket(false);
                    setShowOverdueSettings(false);
                  }} 
                  className="btn-teal"
                >
                  👥 Guest Mapping
                </button>
              )}
              {currentUser?.role === 'admin' && (
                <button 
                  onClick={() => {
                    setShowAccountSettings(false);
                    setShowGuestMapping(false);
                    setShowNewTicket(false);
                  }} 
                  className="bg-gradient-to-r from-orange-600 to-orange-800 text-white px-5 py-3 rounded-xl hover:from-orange-700 hover:to-orange-900 font-bold shadow-lg transition-all hidden"
                >
                  ⏰ Overdue Settings
                </button>
              )}
              {canCreateTicket && (
                <button 
                  onClick={() => {
                    setShowNewTicket(!showNewTicket);
                    setShowAccountSettings(false);
                    setShowGuestMapping(false);
                    setShowOverdueSettings(false);
                  }} 
                  className="btn-primary"
                >
                  + New Ticket
                </button>
              )}
              <button onClick={handleLogout} className="btn-danger">
                🚶 Logout
              </button>
            </div>
          </div>
        </div>

        {(currentUser?.role === 'admin' || (currentUser?.role === 'team' && currentUserTeamType === 'Team PTS')) && (
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-2 border-purple-500">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-purple-800 text-transparent bg-clip-text">📊 Dashboard Analytics</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="stat-card bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm opacity-90 font-semibold">Total Tickets</p>
                  <span className="text-2xl">📊</span>
                </div>
                <p className="text-4xl font-bold mb-1">{stats.total}</p>
                <div className="h-1 bg-white/30 rounded-full mt-2">
                  <div className="h-full bg-white rounded-full" style={{width: '100%'}}></div>
                </div>
              </div>
              <div className="stat-card bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm opacity-90 font-semibold">Pending</p>
                  <span className="text-2xl">⏳</span>
                </div>
                <p className="text-4xl font-bold mb-1">{stats.pending}</p>
                <div className="h-1 bg-white/30 rounded-full mt-2">
                  <div className="h-full bg-white rounded-full" style={{width: `${stats.total > 0 ? (stats.pending/stats.total*100) : 0}%`}}></div>
                </div>
              </div>
              <div className="stat-card bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm opacity-90 font-semibold">In Progress</p>
                  <span className="text-2xl">🔄</span>
                </div>
                <p className="text-4xl font-bold mb-1">{stats.processing}</p>
                <div className="h-1 bg-white/30 rounded-full mt-2">
                  <div className="h-full bg-white rounded-full" style={{width: `${stats.total > 0 ? (stats.processing/stats.total*100) : 0}%`}}></div>
                </div>
              </div>
              <div className="stat-card bg-gradient-to-br from-red-400 via-red-500 to-red-600">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm opacity-90 font-semibold">Overdue</p>
                  <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-4xl font-bold mb-1">{stats.overdue}</p>
                <div className="h-1 bg-white/30 rounded-full mt-2">
                  <div className="h-full bg-white rounded-full" style={{width: `${stats.total > 0 ? (stats.overdue/stats.total*100) : 0}%`}}></div>
                </div>
              </div>
              <div className="stat-card bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm opacity-90 font-semibold">Solved</p>
                  <span className="text-2xl">✅</span>
                </div>
                <p className="text-4xl font-bold mb-1">{stats.solved}</p>
                <div className="h-1 bg-white/20 rounded-full mt-2">
                  <div className="h-full bg-white rounded-full" style={{width: `${stats.total > 0 ? (stats.solved/stats.total*100) : 0}%`}}></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="chart-container bg-gradient-to-br from-white to-gray-50">
                <h3 className="font-bold mb-4 text-gray-800 flex items-center gap-2">
                  <span className="text-xl">🥧</span>
                  Status Distribution
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie 
                      data={stats.statusData} 
                      cx="50%" 
                      cy="50%" 
                      labelLine={false} 
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} 
                      outerRadius={90} 
                      dataKey="value"
                      onClick={(data) => {
                        const statusMap: Record<string, string> = {
                          'Pending': 'Pending',
                          'In Progress': 'In Progress',
                          'Solved': 'Solved'
                        };
                        setFilterStatus(statusMap[data.name] || 'All');
                        ticketListRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {stats.statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-xs text-center text-gray-500 mt-2 italic">Click on chart to filter status</p>
              </div>

              <div className="chart-container bg-gradient-to-br from-white to-gray-50 flex flex-col gap-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    Team Handlers
                  </h3>
                  <div className="flex bg-gray-200 rounded-lg p-1">
                    <button
                      onClick={() => setSelectedHandlerTeam('PTS')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                        selectedHandlerTeam === 'PTS'
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      PTS
                    </button>
                    <button
                      onClick={() => setSelectedHandlerTeam('Services')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                        selectedHandlerTeam === 'Services'
                          ? 'bg-white text-pink-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Services
                    </button>
                  </div>
                </div>

                {selectedHandlerTeam === 'PTS' ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={stats.handlerData.filter(h => h.team === 'Team PTS')}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="tickets" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={stats.handlerData.filter(h => h.team === 'Team Services')}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="tickets" fill="#ec4899" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showAccountSettings && canAccessAccountSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 border-2 border-gray-400 animate-scale-in relative">
            <button 
                onClick={() => setShowAccountSettings(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
                ✕
            </button>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">⚙️ Account Management</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/60 rounded-xl p-5 border-2 border-blue-300 shadow-sm">
                <h3 className="font-bold mb-4 text-blue-900">➕ Create New Account</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} className="input-field-simple" />
                  <input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="input-field-simple" />
                  <input type="text" placeholder="Full Name" value={newUser.full_name} onChange={(e) => setNewUser({...newUser, full_name: e.target.value})} className="input-field-simple" />
                  <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} className="input-field-simple">
                    <option value="admin">Administrator</option>
                    <option value="team">Team</option>
                    <option value="guest">Guest</option>
                  </select>
                  
                  {newUser.role === 'team' && (
                    <select value={newUser.team_type} onChange={(e) => setNewUser({...newUser, team_type: e.target.value})} className="input-field-simple">
                      <option value="Team PTS">Team PTS</option>
                      <option value="Team Services">Team Services</option>
                    </select>
                  )}
                  <button onClick={createUser} className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 font-bold transition-all">
                    ➕ Create Account
                  </button>
                </div>
              </div>

              <div className="bg-white/60 rounded-xl p-5 border-2 border-orange-300 shadow-sm">
                <h3 className="font-bold mb-4 text-orange-900">🔒 Change Password</h3>
                <div className="space-y-3">
                  <select 
                    value={selectedUserForPassword} 
                    onChange={(e) => {
                      setSelectedUserForPassword(e.target.value);
                      setChangePassword({ current: '', new: '', confirm: '' });
                    }} 
                    className="input-field-simple"
                  >
                    <option value="">Select User</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} (@{u.username})</option>
                    ))}
                  </select>
                  
                  {selectedUserForPassword && (
                    <>
                      <input type="password" placeholder="Old Password" value={changePassword.current} onChange={(e) => setChangePassword({...changePassword, current: e.target.value})} className="input-field-simple" />
                      <input type="password" placeholder="New Password" value={changePassword.new} onChange={(e) => setChangePassword({...changePassword, new: e.target.value})} className="input-field-simple" />
                      <input type="password" placeholder="Confirm Password" value={changePassword.confirm} onChange={(e) => setChangePassword({...changePassword, confirm: e.target.value})} className="input-field-simple" />
                      <button onClick={updatePassword} className="w-full bg-gradient-to-r from-orange-600 to-orange-800 text-white py-3 rounded-xl hover:from-orange-700 hover:to-orange-900 font-bold transition-all">
                        🔒 Change Password
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/60 rounded-xl p-5 border-2 border-gray-300 shadow-sm">
              <h3 className="font-bold mb-4 text-gray-800">👥 User List</h3>
              <div className="max-h-[400px] overflow-y-auto">
                <div className="space-y-2">
                  {users.map(u => (
                    <div key={u.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm">{u.full_name}</p>
                        <p className="text-xs text-gray-600">@{u.username}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          u.role === 'admin' ? 'bg-red-100 text-red-800' : 
                          u.role === 'team' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : u.role === 'team' ? 'Team' : 'Guest'}
                        </span>
                        {u.team_type && (
                          <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                            {u.team_type}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {showGuestMapping && canAccessAccountSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 border-2 border-teal-500 animate-scale-in relative">
            <button 
                onClick={() => setShowGuestMapping(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
                ✕
            </button>
            <h2 className="text-2xl font-bold mb-4 text-teal-800">👥 Guest Mapping - Project Access</h2>
            <p className="text-gray-600 mb-6">Manage guest user access to specific projects. One guest can have access to multiple projects.</p>
            
            <div className="bg-white/50 rounded-xl p-6 border-2 border-teal-300 mb-6">
              <h3 className="font-bold mb-4 text-lg text-teal-900">➕ Add New Mapping</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Guest Username</label>
                  <select 
                    value={newMapping.guestUsername} 
                    onChange={(e) => setNewMapping({...newMapping, guestUsername: e.target.value})} 
                    className="input-field-simple"
                  >
                    <option value="">Select Guest User</option>
                    {users.filter(u => u.role === 'guest').map(u => (
                      <option key={u.id} value={u.username}>{u.username} - {u.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Project Name</label>
                  <select 
                    value={newMapping.projectName} 
                    onChange={(e) => setNewMapping({...newMapping, projectName: e.target.value})} 
                    className="input-field-simple"
                  >
                    <option value="">Select Project Name</option>
                    {uniqueProjectNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button onClick={addGuestMapping} disabled={uploading} className="w-full bg-gradient-to-r from-teal-600 to-teal-800 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-teal-900 font-bold shadow-xl transition-all disabled:opacity-50">
                {uploading ? '⏳ Processing...' : '➕ Add Mapping'}
              </button>
            </div>

            <div className="bg-white/50 rounded-xl p-6 border-2 border-gray-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-800">📋 Mapping List</h3>
                <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-bold">
                  {guestMappings.length} mappings
                </span>
              </div>
              
              {guestMappings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-gray-500 font-medium">No mappings yet</p>
                  <p className="text-sm text-gray-400 mt-2">Add mapping to grant guest access to projects</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto space-y-3">
                  {guestMappings.map(mapping => (
                    <div key={mapping.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-lg text-sm font-bold">
                            👤 {mapping.guest_username}
                          </span>
                          <span className="text-gray-400 font-bold">→</span>
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-bold">
                            🏢 {mapping.project_name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(mapping.created_at).toLocaleDateString('id-ID', { 
                            day: '2-digit', 
                            month: 'long', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteGuestMapping(mapping.id)}
                        disabled={uploading}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50 ml-4"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>
        )}

        {showOverdueSettings && currentUser?.role === 'admin' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-orange-500 animate-scale-in relative">
              <button 
                onClick={() => setShowOverdueSettings(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold mb-6 text-gray-800">⏰ Overdue Settings</h2>
              
              <div className="space-y-4">
                <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-300">
                  <label className="block text-sm font-bold text-gray-800 mb-2">⏱️ Overdue Time Limit (Hours)</label>
                  <p className="text-xs text-gray-600 mb-3">Tickets will be marked as OVERDUE after this time period</p>
                  <input 
                    type="number" 
                    min="1"
                    step="0.5"
                    value={overdueSettings.overdue_hours}
                    onChange={(e) => setOverdueSettings({...overdueSettings, overdue_hours: parseFloat(e.target.value)})}
                    className="w-full border-2 border-orange-400 rounded-lg px-4 py-2.5 focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all font-medium bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-2 italic">Current setting: <span className="font-bold text-orange-600">{overdueSettings.overdue_hours} hours</span></p>
                </div>

                <div className="bg-red-50 rounded-xl p-4 border-2 border-red-300">
                  <h3 className="font-bold text-red-800 mb-2">⚠️ Important Notes:</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Tickets will show <span className="font-bold text-red-600">RED label</span> when overdue</li>
                    <li>• Handlers will receive <span className="font-bold text-red-600">RED notifications</span></li>
                    <li>• Only affects Pending and In Progress tickets</li>
                    <li>• Solved tickets are never marked as overdue</li>
                  </ul>
                </div>

                <button 
                  onClick={() => updateOverdueSettings(overdueSettings.overdue_hours)}
                  disabled={uploading}
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-800 text-white py-3 rounded-xl hover:from-orange-700 hover:to-orange-900 font-bold transition-all disabled:opacity-50"
                >
                  {uploading ? '⏳ Saving...' : '💾 Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-2 border-blue-500">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold mb-2">🔍 Search</label>
              <input type="text" value={searchProject} onChange={(e) => setSearchProject(e.target.value)} placeholder="Search by project, issue, or sales..." className="input-field" />
            </div>
            <div className="md:w-64">
              <label className="block text-sm font-bold mb-2">📋 Filter Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field">
                <option value="All">All Status</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
                <option value="Solved">Solved</option>
              </select>
            </div>
          </div>
        </div>

        {showNewTicket && canCreateTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 border-3 border-green-500 animate-scale-in relative">
            <button 
                onClick={() => setShowNewTicket(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
                ✕
            </button>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">🎫 Create New Ticket</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">📌 Project Name *</label>
                  <input 
                    type="text" 
                    value={newTicket.project_name} 
                    onChange={(e) => setNewTicket({...newTicket, project_name: e.target.value})} 
                    placeholder="Example: BCA Cibitung Project" 
                    className="w-full border-2 border-blue-400 rounded-lg px-4 py-2.5 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all font-medium bg-white"
                  />
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">📍 Address Detail</label>
                  <input 
                    type="text" 
                    value={newTicket.address} 
                    onChange={(e) => setNewTicket({...newTicket, address: e.target.value})} 
                    placeholder="Example: Jl. Jend. Sudirman No. 1..." 
                    className="w-full border-2 border-blue-400 rounded-lg px-4 py-2.5 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all font-medium bg-white"
                  />
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">⚠️ Issue Case *</label>
                  <input 
                    type="text" 
                    value={newTicket.issue_case} 
                    onChange={(e) => setNewTicket({...newTicket, issue_case: e.target.value})} 
                    placeholder="Example: Videowall Not Working" 
                    className="w-full border-2 border-red-400 rounded-lg px-4 py-2.5 focus:border-red-600 focus:ring-2 focus:ring-red-200 transition-all font-medium bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">👤 Sales Name</label>
                  <input 
                    type="text" 
                    value={newTicket.sales_name} 
                    onChange={(e) => setNewTicket({...newTicket, sales_name: e.target.value})} 
                    placeholder="Sales handler name" 
                    className="w-full border-2 border-purple-400 rounded-lg px-4 py-2.5 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all font-medium bg-white"
                  />
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">🔢 SN Unit (Optional)</label>
                  <input 
                    type="text" 
                    value={newTicket.sn_unit} 
                    onChange={(e) => setNewTicket({...newTicket, sn_unit: e.target.value})} 
                    placeholder="Example: SN12345678" 
                    className="w-full border-2 border-gray-400 rounded-lg px-4 py-2.5 focus:border-gray-600 focus:ring-2 focus:ring-gray-200 transition-all font-medium bg-white"
                  />
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">📱 Name & Phone User</label>
                  <input 
                    type="text" 
                    value={newTicket.customer_phone} 
                    onChange={(e) => setNewTicket({...newTicket, customer_phone: e.target.value})} 
                    placeholder="Adi - 08xx-xxxx-xxxx" 
                    className="w-full border-2 border-green-400 rounded-lg px-4 py-2.5 focus:border-green-600 focus:ring-2 focus:ring-green-200 transition-all font-medium bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">📅 Date</label>
                  <input 
                    type="date" 
                    value={newTicket.date} 
                    onChange={(e) => setNewTicket({...newTicket, date: e.target.value})} 
                    className="w-full border-2 border-indigo-400 rounded-lg px-4 py-2.5 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition-all font-medium bg-white"
                  />
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">🏷️ Status</label>
                  <select 
                    value={newTicket.status} 
                    onChange={(e) => setNewTicket({...newTicket, status: e.target.value})} 
                    className="w-full border-2 border-yellow-400 rounded-lg px-4 py-2.5 focus:border-yellow-600 focus:ring-2 focus:ring-yellow-200 transition-all font-medium bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Solved">Solved</option>
                  </select>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">👨‍💼 Assign to *</label>
                  <select 
                    value={newTicket.assigned_to} 
                    onChange={(e) => setNewTicket({...newTicket, assigned_to: e.target.value})} 
                    className="w-full border-2 border-orange-400 rounded-lg px-4 py-2.5 focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all font-medium bg-white"
                  >
                    <option value="">Select Handler</option>
                    <optgroup label="Team PTS">
                      {teamPTSMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-300">
                <label className="block text-sm font-bold text-gray-800 mb-2">📝 Detailed Description</label>
                <textarea 
                  value={newTicket.description} 
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})} 
                  placeholder="Explain the problem details..." 
                  className="w-full border-2 border-gray-400 rounded-lg px-4 py-2.5 focus:border-gray-600 focus:ring-2 focus:ring-gray-200 transition-all font-medium bg-white resize-none" 
                  rows={4}
                />
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-300">
                <label className="block text-sm font-bold text-gray-800 mb-2">📷 Photo (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setNewTicket({...newTicket, photo: e.target.files?.[0] || null})} 
                  className="w-full border-2 border-blue-400 rounded-lg px-4 py-2.5 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all font-medium bg-white"
                />
                {newTicket.photo && (
                  <p className="text-sm text-blue-600 mt-2">📎 {newTicket.photo.name}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <button onClick={createTicket} disabled={uploading} className="bg-gradient-to-r from-green-600 to-green-800 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-900 font-bold shadow-xl transition-all hover:scale-105">
                {uploading ? '⏳ Saving...' : '💾 Save Ticket'}
              </button>
              <button onClick={() => setShowNewTicket(false)} className="bg-gradient-to-r from-gray-500 to-gray-700 text-white px-6 py-3 rounded-xl hover:from-gray-600 hover:to-gray-800 font-bold shadow-xl transition-all hover:scale-105">
                ✖ Cancel
              </button>
            </div>
          </div>
          </div>
        )}

        <div ref={ticketListRef} className="bg-white/40 backdrop-blur-md rounded-2xl shadow-2xl p-6 border-2 border-blue-250">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">📋 Ticket List ({filteredTickets.length})</h2>
            <button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
            >
              📊 Export Report
            </button>
          </div>
          
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600 font-medium">
                {searchProject || filterStatus !== 'All' 
                  ? 'No tickets match the search.' 
                  : 'No tickets yet. Create your first ticket!'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full backdrop-blur-sm bg-white/20">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <th className="px-4 py-3 text-left font-bold">Project Name</th>
					<th className="px-4 py-3 text-left font-bold">SN Unit</th>
                    <th className="px-4 py-3 text-left font-bold">Issue</th>
                    <th className="px-4 py-3 text-left font-bold">Assigned</th>
                    <th className="px-4 py-3 text-left font-bold">Status</th>
                    {currentUser?.role === 'admin' && <th className="px-4 py-3 text-center font-bold">Overdue (Hrs)</th>}
                    <th className="px-4 py-3 text-center font-bold">Activity</th>
                    <th className="px-4 py-3 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket, index) => (
                    <tr 
                      key={ticket.id} 
                      className={`border-b border-white/50 hover:bg-blue-500/45 transition-colors ${index % 2 === 0 ? 'bg-white/45' : 'bg-gray-45'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-800">{ticket.project_name}</div>
                        <div className="text-xs text-gray-500">{ticket.date ? new Date(ticket.date).toLocaleDateString('id-ID') : '-'}</div>
                      </td>
					  <td className="px-4 py-3">
                        <div className="font-bold text-gray-800">{ticket.sn_unit}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{ticket.issue_case}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-800">{ticket.assigned_to}</div>
                        <div className="text-xs text-purple-600">{ticket.current_team}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          {(() => {
                            const ptsStatus = getTicketStatusDisplay(ticket, false);
                            return (
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${ptsStatus.color}`}>
                                {ptsStatus.label}
                              </span>
                            );
                          })()}
                          {ticket.services_status && (() => {
                            const servicesStatus = getTicketStatusDisplay(ticket, true);
                            return (
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${servicesStatus.color}`}>
                                Services: {servicesStatus.label}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      {currentUser?.role === 'admin' && (
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="1"
                            step="0.5"
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-center font-bold text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={ticket.overdue_hours || overdueSettings.overdue_hours}
                            onClick={(e) => e.stopPropagation()}
                            onChange={async (e) => {
                              const val = parseFloat(e.target.value) || 0;
                              if (val < 0.5) return;
                              
                              const updatedTickets = tickets.map(t => t.id === ticket.id ? { ...t, overdue_hours: val } : t);
                              setTickets(updatedTickets);
                              
                              const { error } = await supabase
                                .from('tickets')
                                .update({ overdue_hours: val })
                                .eq('id', ticket.id);
                                
                              if (error) {
                                alert('Failed to update overdue setting');
                              }
                            }}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        {ticket.activity_logs && ticket.activity_logs.length > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-lg">📝</span>
                            <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                              {ticket.activity_logs.length}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setShowTicketDetailPopup(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                          >
                            👁️ View
                          </button>
                          <button
                            onClick={() => exportToPDF(ticket)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                          >
                            📄 PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .btn-primary {
          @apply bg-gradient-to-r from-red-600 to-red-800 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-red-900 font-bold shadow-xl transition-all;
        }
        .btn-secondary {
          @apply bg-gradient-to-r from-gray-600 to-gray-800 text-white px-5 py-3 rounded-xl hover:from-gray-700 hover:to-gray-900 font-bold shadow-lg transition-all;
        }
        .btn-teal {
          @apply bg-gradient-to-r from-teal-600 to-teal-800 text-white px-5 py-3 rounded-xl hover:from-teal-700 hover:to-teal-900 font-bold shadow-lg transition-all;
        }
        .btn-danger {
          @apply bg-gradient-to-r from-red-500 to-red-700 text-white px-5 py-3 rounded-xl hover:from-red-600 hover:to-red-800 font-bold shadow-lg transition-all;
        }
        .activity-log {
          @apply bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-300 shadow-md;
        }
        .stat-card {
          @apply rounded-2xl p-4 text-white shadow-xl transform hover:scale-105 transition-transform;
        }
        .chart-container {
          @apply bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-300 shadow-xl;
        }
        .input-field {
          @apply w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all font-medium bg-white;
        }
        .input-field-simple {
          @apply w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white;
        }
        .file-download {
          @apply inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-200 transition-all mt-2;
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
