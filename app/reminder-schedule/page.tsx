{/* ── MAIN CONTENT dengan Sticky Summary & Chart ── */}
<div className="flex-1 max-w-[1600px] mx-auto w-full px-5 py-5">
  
  {view === 'list' && (
    <div className="flex flex-col h-full">
      
      {/* STICKY SECTION: Stat Cards + Pie Charts + Filter Chips */}
      {/* JANGAN beri background transparan, biarkan natural */}
      <div className="sticky top-[73px] z-40 space-y-4 pb-4" style={{ background: 'transparent' }}>
        
        {/* Stat cards (clickable filter) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* ... card content ... */}
        </div>

        {/* Pie Charts — klik untuk filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ... pie charts ... */}
        </div>

        {/* Active filter chips */}
        {(filterCategory !== 'all' || filterStatus !== 'all' || searchSales || searchDivisionSales || searchTeamHandler || searchProject || selectedCalDay) && (
          <div className="flex flex-wrap gap-2 items-center">
            {/* ... filter chips ... */}
          </div>
        )}
      </div>

      {/* SCROLLABLE SECTION: Main area list + calendar */}
      {/* TAMBAHKAN jarak yang cukup dari sticky section */}
      <div className="flex-1 min-h-0 mt-4">
        <div className="flex gap-4 items-start h-full">
          
          {/* TICKET LIST - scrollable dengan batasan tinggi yang tepat */}
          <div className="flex-1 min-w-0 rounded-2xl" 
               style={{ 
                 background: 'rgba(255,255,255,0.88)', 
                 border: '1px solid rgba(0,0,0,0.08)', 
                 backdropFilter: 'blur(12px)',
                 height: 'calc(100vh - 420px)', // Kurangi dengan tinggi header + sticky section
                 display: 'flex', 
                 flexDirection: 'column',
                 overflow: 'hidden' // Penting: hindari overflow di container utama
               }}>
            
            {/* Search + filter bar (sticky di dalam area scroll) */}
            <div className="px-5 pt-4 pb-3 flex flex-wrap gap-3 items-center flex-shrink-0"
                 style={{ background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
              {/* ... search & filter content ... */}
            </div>

            {/* Ticket list header - flex-shrink-0 agar tidak ikut scroll */}
            <div className="px-5 py-3 flex items-center justify-between flex-shrink-0"
                 style={{ background: '#fafafa', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">TICKET LIST</span>
                <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                  {filteredReminders.length}
                </span>
              </div>
              <button onClick={fetchReminders} disabled={listLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-gray-100 border border-gray-200 text-gray-600 disabled:opacity-60"
                style={{ background: 'white' }}>
                <svg className={`w-3.5 h-3.5 ${listLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            {/* Scrollable table body - ini yang akan di-scroll */}
            <div className="flex-1 overflow-y-auto">
              
              {/* Table header sticky di dalam scroll area */}
              <div className="hidden md:grid px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-400 sticky top-0 z-10"
                   style={{ gridTemplateColumns: '2fr 1.4fr 1fr 1.2fr 1fr 1.1fr 1.2fr 52px', borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#fafafa' }}>
                <span>NAMA PROJECT</span>
                <span>KEGIATAN</span>
                <span>SALES</span>
                <span>TEAM HANDLER</span>
                <span>PIC lOKASI</span>
                <span>STATUS</span>
                <span>TANGGAL</span>
                <span className="text-right">ACT</span>
              </div>

              {/* Table body content */}
              {listLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin" />
                  <p className="text-sm text-gray-500 font-medium">Memuat list...</p>
                </div>
              ) : filteredReminders.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-gray-600 font-semibold">Tidak ada reminder ditemukan</p>
                  <p className="text-sm text-gray-400 mt-1">Coba ubah filter atau tambahkan reminder baru</p>
                </div>
              ) : (
                <div>
                  {filteredReminders.map((r) => {
                    const today = isDueToday(r.due_date);
                    return (
                      <div key={r.id}
                        className="px-5 py-4 transition-colors hover:bg-red-50/40 cursor-pointer"
                        style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', borderLeft: today ? '3px solid #dc2626' : '3px solid transparent' }}
                        onClick={() => setDetailReminder(r)}>

                        {/* Mobile layout */}
                        <div className="md:hidden space-y-2">
                          {/* ... mobile content ... */}
                        </div>

                        {/* Desktop table row */}
                        <div className="hidden md:grid items-center gap-3"
                          style={{ gridTemplateColumns: '2fr 1.4fr 1fr 1.2fr 1fr 1.1fr 1.2fr 52px' }}>
                          {/* ... desktop row content ... */}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* MINI CALENDAR SIDEBAR - scrollable independen */}
          <div className="flex-shrink-0" style={{ 
            height: 'calc(100vh - 420px)', 
            overflowY: 'auto',
            position: 'relative'
          }}>
            <MiniCalendar
              reminders={reminders}
              calendarMonth={calendarMonth}
              setCalendarMonth={setCalendarMonth}
              selectedCalDay={calOnlyDay}
              setSelectedCalDay={setCalOnlyDay}
            />
          </div>
        </div>
      </div>

    </div>
  )}

</div>
