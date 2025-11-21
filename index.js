 <!-- --- JAVASCRIPT LOGIC --- -->
    <script>
        // --- DATA & CONFIG ---
        const symptomsList = [
            "Kram Perut", "Sakit Kepala", "Jerawat", "Nyeri Punggung", 
            "Lelah", "Mood Swing", "Kembung", "Nafsu Makan Naik", "Nyeri Payudara"
        ];
        
        let currentDate = new Date();
        let selectedDate = null;
        let entries = JSON.parse(localStorage.getItem('wiseWomenData')) || {}; // Format: { "YYYY-MM-DD": { flow: 1, symptoms: [] } }

        // --- INIT ---
        document.addEventListener('DOMContentLoaded', () => {
            renderCalendar();
            renderSymptomsOptions();
            calculateStats();
        });

        // --- CALENDAR LOGIC ---
        function renderCalendar() {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            // Update Header Bulan
            const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            document.getElementById('current-month-year').innerText = `${monthNames[month]} ${year}`;

            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            const calendarGrid = document.getElementById('calendar-grid');
            calendarGrid.innerHTML = "";

            // Padding days (kosong sebelum tanggal 1)
            for (let i = 0; i < firstDay; i++) {
                const emptyDiv = document.createElement('div');
                calendarGrid.appendChild(emptyDiv);
            }

            // Days
            const today = new Date();
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const el = document.createElement('div');
                el.className = 'calendar-day';
                el.innerText = day;
                
                // Highlight Hari Ini
                if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                    el.classList.add('today');
                }

                // Cek jika ada data
                if (entries[dateStr]) {
                    if (entries[dateStr].flow > 0) {
                        el.classList.add('period-active'); // Background pink
                        const dot = document.createElement('div');
                        dot.className = 'period-dot';
                        el.appendChild(dot);
                    }
                }

                // Highlight Selected
                if (selectedDate === dateStr) {
                    el.classList.add('selected');
                }

                el.onclick = () => selectDate(dateStr);
                calendarGrid.appendChild(el);
            }
        }

        function changeMonth(offset) {
            currentDate.setMonth(currentDate.getMonth() + offset);
            renderCalendar();
        }

        function selectDate(dateStr) {
            selectedDate = dateStr;
            renderCalendar(); // Re-render untuk highlight
            
            document.getElementById('empty-state').classList.add('hidden');
            document.getElementById('day-details').classList.remove('hidden');
            document.getElementById('selected-date-text').innerText = formatDateIndo(dateStr);

            // Load data existing jika ada
            const entry = entries[dateStr] || { flow: 0, symptoms: [] };
            
            // Set Radio Flow
            const radios = document.getElementsByName('flow');
            radios.forEach(r => {
                r.checked = (parseInt(r.value) === entry.flow);
            });

            // Set Checkboxes Symptoms
            const checkboxes = document.querySelectorAll('.symptom-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = entry.symptoms.includes(cb.value);
            });
        }

        function closeDetails() {
            document.getElementById('day-details').classList.add('hidden');
            document.getElementById('empty-state').classList.remove('hidden');
            selectedDate = null;
            renderCalendar();
        }

        // --- FORM LOGIC ---
        function renderSymptomsOptions() {
            const container = document.getElementById('symptoms-container');
            symptomsList.forEach(sym => {
                const label = document.createElement('label');
                label.className = 'cursor-pointer';
                label.innerHTML = `
                    <input type="checkbox" value="${sym}" class="symptom-checkbox sr-only">
                    <div class="symptom-tag px-3 py-1 rounded-full border border-blue-200 text-xs text-gray-600 hover:bg-blue-50 select-none">${sym}</div>
                `;
                container.appendChild(label);
            });
        }

        function saveEntry(e) {
            e.preventDefault();
            if (!selectedDate) return;

            const flow = parseInt(document.querySelector('input[name="flow"]:checked').value);
            const symptoms = Array.from(document.querySelectorAll('.symptom-checkbox:checked')).map(cb => cb.value);

            if (flow === 0 && symptoms.length === 0) {
                delete entries[selectedDate]; // Hapus jika kosong
            } else {
                entries[selectedDate] = { flow, symptoms };
            }

            localStorage.setItem('wiseWomenData', JSON.stringify(entries));
            
            // Visual feedback
            const btn = e.target.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Tersimpan!";
            btn.classList.add('bg-green-500', 'hover:bg-green-600');
            setTimeout(() => {
                btn.innerText = originalText;
                btn.classList.remove('bg-green-500', 'hover:bg-green-600');
                closeDetails(); // Tutup form
                renderCalendar(); // Update titik di kalender
                calculateStats(); // Update statistik
            }, 800);
        }

        // --- STATS LOGIC ---
        function calculateStats() {
            const dates = Object.keys(entries).sort();
            if (dates.length === 0) {
                updateStatsUI(0, 0, {});
                return;
            }

            // 1. Identifikasi Periode Haid (Group consecutive dates)
            let periods = [];
            let currentPeriod = [];

            dates.forEach((dateStr) => {
                if (entries[dateStr].flow > 0) { // Hanya hitung jika flow > 0 (haid)
                    const date = new Date(dateStr);
                    
                    if (currentPeriod.length === 0) {
                        currentPeriod.push(date);
                    } else {
                        const lastDate = currentPeriod[currentPeriod.length - 1];
                        const diffTime = Math.abs(date - lastDate);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                        if (diffDays <= 2) { // Jika selisih <= 2 hari, dianggap satu periode
                            currentPeriod.push(date);
                        } else {
                            periods.push(currentPeriod);
                            currentPeriod = [date];
                        }
                    }
                }
            });
            if (currentPeriod.length > 0) periods.push(currentPeriod);

            // 2. Hitung Rata-rata Durasi (Lama Haid)
            let totalDuration = 0;
            periods.forEach(p => {
                // Durasi = (Last Day - First Day) + 1
                const dur = Math.ceil((p[p.length-1] - p[0]) / (1000 * 60 * 60 * 24)) + 1;
                totalDuration += dur;
            });
            const avgDuration = periods.length ? Math.round(totalDuration / periods.length) : 0;

            // 3. Hitung Rata-rata Siklus (Jarak Start ke Start berikutnya)
            let totalCycleDays = 0;
            let cycleCount = 0;
            for (let i = 0; i < periods.length - 1; i++) {
                const startA = periods[i][0];
                const startB = periods[i+1][0];
                const diff = Math.ceil((startB - startA) / (1000 * 60 * 60 * 24));
                // Filter outlier (misal siklus < 15 hari atau > 50 hari mungkin tidak valid/irregular)
                if(diff > 15 && diff < 60) { 
                    totalCycleDays += diff;
                    cycleCount++;
                }
            }
            const avgCycle = cycleCount ? Math.round(totalCycleDays / cycleCount) : 0;

            // 4. Hitung Gejala
            let symptomCounts = {};
            dates.forEach(d => {
                if (entries[d].symptoms) {
                    entries[d].symptoms.forEach(s => {
                        symptomCounts[s] = (symptomCounts[s] || 0) + 1;
                    });
                }
            });

            updateStatsUI(avgDuration, avgCycle, symptomCounts);
        }

        function updateStatsUI(duration, cycle, symptomCounts) {
            document.getElementById('avg-duration').innerText = duration || "-";
            document.getElementById('avg-cycle').innerText = cycle || "-";

            const sortedSymptoms = Object.entries(symptomCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3); // Top 3

            const listContainer = document.getElementById('top-symptoms-list');
            listContainer.innerHTML = "";

            if (sortedSymptoms.length === 0) {
                listContainer.innerHTML = `<p class="text-gray-400 text-sm italic text-center">Belum ada data gejala.</p>`;
            } else {
                // Cari max value untuk progress bar
                const maxVal = sortedSymptoms[0][1];

                sortedSymptoms.forEach(([name, count]) => {
                    const percent = (count / maxVal) * 100;
                    listContainer.innerHTML += `
                        <div>
                            <div class="flex justify-between text-sm mb-1">
                                <span class="font-medium text-gray-700">${name}</span>
                                <span class="text-gray-500 text-xs">${count}x</span>
                            </div>
                            <div class="w-full bg-gray-100 rounded-full h-2">
                                <div class="bg-blue-500 h-2 rounded-full" style="width: ${percent}%"></div>
                            </div>
                        </div>
                    `;
                });
            }
        }

        // --- UTILS ---
        function toggleView() {
            const cal = document.getElementById('calendar-view');
            const stats = document.getElementById('stats-view');
            const icon = document.getElementById('view-icon');
            const text = document.getElementById('view-text');

            if (cal.classList.contains('hidden')) {
                cal.classList.remove('hidden');
                stats.classList.add('hidden');
                icon.className = "fas fa-chart-bar mr-1";
                text.innerText = "Statistik";
            } else {
                cal.classList.add('hidden');
                stats.classList.remove('hidden');
                calculateStats(); // Refresh stats saat dibuka
                icon.className = "fas fa-calendar-alt mr-1";
                text.innerText = "Kalender";
            }
        }

        function formatDateIndo(dateStr) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            return new Date(dateStr).toLocaleDateString('id-ID', options);
        }
    </script>
