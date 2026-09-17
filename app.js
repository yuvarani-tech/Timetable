/**
 * Smart College Timetable Scheduler - App Controller
 * Manages UI state, LocalStorage, CRUD operations, and searches.
 */

// Global State
const STATE_KEY = 'BVOC_SCHEDULER_STATE';
let state = {
  faculties: [],
  subjects: [],
  assignments: {},
  timetableData: null,
  settings: {
    semester: 'Odd Semester',
    academicYear: '2026-2027'
  }
};

// Default Preload Data
const DEFAULT_FACULTIES = [
  { code: 'SB', name: 'Dr. S. Banumathi' },
  { code: 'VAJ', name:'Dr. V. A. Jane' },
  { code: 'FJR', name:'Ms. J. Francis Julee Rajam' },
  { code: 'JO', name: 'Mr. J. Joel Smith' },
  { code: 'GC', name: 'Ms. B. Geno Cinthia' },
  { code: 'MS', name: 'Ms. S. Merlin Sofia' }
];

const DEFAULT_SUBJECTS = [
  // I B.Voc SD & SA
  { name: 'C Programming', code: 'C-PROG', year: 'I B.Voc SD & SA', weeklyHours: '5', type: 'Theory' },
  { name: 'English', code: 'ENG', year: 'I B.Voc SD & SA', weeklyHours: '4', type: 'Theory' },
  { name: 'Mathematics', code: 'MATH', year: 'I B.Voc SD & SA', weeklyHours: '5', type: 'Theory' },
  { name: 'Office Automation', code: 'OA', year: 'I B.Voc SD & SA', weeklyHours: '4', type: 'Theory' },
  { name: 'PDAT Lab', code: 'PDAT-LAB', year: 'I B.Voc SD & SA', weeklyHours: '6', type: 'Lab' },
  
  // II B.Voc SD & SA
  { name: 'PHP', code: 'PHP', year: 'II B.Voc SD & SA', weeklyHours: '5', type: 'Theory' },
  { name: 'RDBMS', code: 'RDBMS', year: 'II B.Voc SD & SA', weeklyHours: '5', type: 'Theory' },
  { name: 'Artificial Intelligence', code: 'AI', year: 'II B.Voc SD & SA', weeklyHours: '4', type: 'Theory' },
  { name: 'CRM', code: 'CRM', year: 'II B.Voc SD & SA', weeklyHours: '4', type: 'Theory' },
  { name: 'Mini Project', code: 'MINI-PROJ', year: 'II B.Voc SD & SA', weeklyHours: '6', type: 'Lab' },
  
  // III B.Voc SD & SA
  { name: 'Software Engineering', code: 'SE', year: 'III B.Voc SD & SA', weeklyHours: '6', type: 'Theory' },
  { name: 'Quality Assurance', code: 'QA', year: 'III B.Voc SD & SA', weeklyHours: '6', type: 'Theory' },
  { name: 'Mobile Web Engineering', code: 'MWE', year: 'III B.Voc SD & SA', weeklyHours: '6', type: 'Theory' },
  { name: 'Project', code: 'PROJ', year: 'III B.Voc SD & SA', weeklyHours: '6', type: 'Lab' }
];

const DEFAULT_ASSIGNMENTS = {
  'C-PROG': 'MS',
  'ENG': 'FJR',
  'MATH': 'VAJ',
  'OA': 'JO',
  'PDAT-LAB': 'SB',
  
  'PHP': 'SB',
  'RDBMS': 'MS',
  'AI': 'VAJ',
  'CRM': 'JO',
  'MINI-PROJ': 'GC',
  
  'SE': 'JO',
  'QA': 'MS',
  'MWE': 'VAJ',
  'PROJ': 'GC'
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupNavigation();
  setupEventListeners();
  renderAllViews();
});

// Load data from LocalStorage or seed defaults
function loadData() {
  const stored = localStorage.getItem(STATE_KEY);
  if (stored) {
    try {
      state = JSON.parse(stored);
      // Fallback settings if not set
      if (!state.settings) {
        state.settings = { semester: 'Odd Semester', academicYear: '2026-2027' };
      }
    } catch (e) {
      console.error("Error parsing LocalStorage state, loading defaults:", e);
      loadDefaults();
    }
  } else {
    loadDefaults();
  }
}

// Load default seeds
function loadDefaults() {
  state.faculties = [...DEFAULT_FACULTIES];
  state.subjects = [...DEFAULT_SUBJECTS];
  state.assignments = { ...DEFAULT_ASSIGNMENTS };
  state.timetableData = null;
  state.settings = { semester: 'Odd Semester', academicYear: '2026-2027' };
  saveData();
}

// Save state to LocalStorage
function saveData() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

// Navigation switcher
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const viewSections = document.querySelectorAll('.view-section');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.getAttribute('data-target');
      
      // Update links
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Update views
      viewSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === targetView) {
          section.classList.add('active');
        }
      });

      // Update page title
      const titleEl = document.getElementById('page-title');
      const subtitleEl = document.getElementById('page-subtitle');
      const formattedTitle = link.querySelector('span').textContent;
      titleEl.textContent = formattedTitle;

      // Subtitle updates
      switch(targetView) {
        case 'dashboard-view': subtitleEl.textContent = "Welcome back, Admin"; break;
        case 'faculty-view': subtitleEl.textContent = "Manage college professors and lecturers"; break;
        case 'subject-view': subtitleEl.textContent = "Manage curriculum theory and lab courses per year"; break;
        case 'assignment-view': subtitleEl.textContent = "Map faculties to specific theory/lab subjects"; break;
        case 'generate-view': subtitleEl.textContent = "Set semester settings and start the scheduler algorithm"; break;
        case 'viewer-view': subtitleEl.textContent = "Display generated timetables with headers"; break;
        case 'faculty-search-view': subtitleEl.textContent = "Search and filter timetable by faculty duties"; break;
        case 'subject-search-view': subtitleEl.textContent = "Search and filter timetable by course occurrences"; break;
        case 'workload-view': subtitleEl.textContent = "Automatically calculated weekly lecturing hours"; break;
      }

      // Re-render target view to reflect any changes
      renderView(targetView);
    });
  });
}

// Render active view
function renderView(viewId) {
  switch (viewId) {
    case 'dashboard-view': renderDashboard(); break;
    case 'faculty-view': renderFaculties(); break;
    case 'subject-view': renderSubjects(); break;
    case 'assignment-view': renderAssignments(); break;
    case 'generate-view': renderGenerate(); break;
    case 'viewer-view': renderTimetableGrid(); break;
    case 'faculty-search-view': renderFacultySearch(); break;
    case 'subject-search-view': renderSubjectSearch(); break;
    case 'workload-view': renderWorkloadReport(); break;
  }
}

// Helper to render all views (during load)
function renderAllViews() {
  renderDashboard();
  renderFaculties();
  renderSubjects();
  renderAssignments();
  renderGenerate();
  renderTimetableGrid();
  renderFacultySearch();
  renderSubjectSearch();
  renderWorkloadReport();

  // Set Top Bar badge
  document.getElementById('current-badge-year').textContent = state.settings.academicYear;
  document.getElementById('current-badge-sem').textContent = state.settings.semester === 'Odd Semester' ? 'Odd Sem' : 'Even Sem';
}

// Set up UI event listeners
function setupEventListeners() {
  // Quick action shortcuts
  document.getElementById('quick-add-faculty').addEventListener('click', () => openFacultyModal());
  document.getElementById('quick-add-subject').addEventListener('click', () => openSubjectModal());
  document.getElementById('quick-assignment').addEventListener('click', () => {
    document.querySelector('.nav-link[data-target="assignment-view"]').click();
  });
  document.getElementById('quick-generate').addEventListener('click', () => {
    document.querySelector('.nav-link[data-target="generate-view"]').click();
  });
  document.getElementById('quick-pdf').addEventListener('click', () => {
    document.querySelector('.nav-link[data-target="viewer-view"]').click();
  });

  // Faculty Modal CRUD triggers
  document.getElementById('btn-add-faculty').addEventListener('click', () => openFacultyModal());
  document.getElementById('close-faculty-modal').addEventListener('click', () => closeFacultyModal());
  document.getElementById('btn-cancel-faculty').addEventListener('click', () => closeFacultyModal());
  document.getElementById('faculty-form').addEventListener('submit', (e) => handleFacultySubmit(e));

  // Subject Modal CRUD triggers
  document.getElementById('btn-add-subject').addEventListener('click', () => openSubjectModal());
  document.getElementById('close-subject-modal').addEventListener('click', () => closeSubjectModal());
  document.getElementById('btn-cancel-subject').addEventListener('click', () => closeSubjectModal());
  document.getElementById('subject-form').addEventListener('submit', (e) => handleSubjectSubmit(e));

  // Assignment Modal CRUD triggers
  document.getElementById('btn-add-assignment').addEventListener('click', () => openAssignmentModal());
  document.getElementById('close-assignment-modal').addEventListener('click', () => closeAssignmentModal());
  document.getElementById('btn-cancel-assignment').addEventListener('click', () => closeAssignmentModal());
  document.getElementById('assignment-form').addEventListener('submit', (e) => handleAssignmentSubmit(e));

  // Timetable Generation Trigger
  document.getElementById('generate-form').addEventListener('submit', (e) => handleGenerateSubmit(e));

  // Timetable Viewer Selectors
  document.getElementById('view-class-select').addEventListener('change', () => renderTimetableGrid());
  
  // Timetable PDF Downloads
  const pdfHelper = new PDFHelper();
  document.getElementById('btn-download-pdf').addEventListener('click', () => {
    const classId = document.getElementById('view-class-select').value;
    pdfHelper.exportSingleTimetable(classId, state.settings.semester, state.settings.academicYear);
  });
  
  document.getElementById('btn-download-all-pdf').addEventListener('click', () => {
    pdfHelper.exportFullReport(
      state.settings.semester, 
      state.settings.academicYear, 
      state.faculties, 
      state.subjects, 
      state.assignments, 
      state.timetableData
    );
  });

  // Search Selectors
  document.getElementById('search-faculty-select').addEventListener('change', (e) => displayFacultySearchResult(e.target.value));
  document.getElementById('search-subject-select').addEventListener('change', (e) => displaySubjectSearchResult(e.target.value));

  // Print Workload
  document.getElementById('btn-print-workload').addEventListener('click', () => window.print());
}


/* ================= 1. DASHBOARD MODULE ================= */
function renderDashboard() {
  document.getElementById('stat-faculties').textContent = state.faculties.length;
  document.getElementById('stat-subjects').textContent = state.subjects.length;
  
  const timetablesGenerated = state.timetableData !== null;
  const statusBadge = document.getElementById('stat-timetables');
  statusBadge.textContent = timetablesGenerated ? 'Yes (Active)' : 'No';
  
  const statusMsg = document.getElementById('system-status-msg');
  const banner = document.getElementById('status-banner');
  
  if (timetablesGenerated) {
    banner.style.backgroundColor = '#ecfdf5';
    banner.style.borderLeftColor = 'var(--teal)';
    statusMsg.innerHTML = `<strong>Timetables Generated Successfully!</strong> Clash-free schedules are online for <strong>Odd/Even semesters</strong> of ${state.settings.academicYear}. You can view/export them now.`;
  } else {
    banner.style.backgroundColor = '#e0f2fe';
    banner.style.borderLeftColor = 'var(--primary-light)';
    statusMsg.textContent = `Pre-populated default B.Voc Faculty, Subjects and Assignments are loaded. Navigate to "Generate Timetable" to build schedule.`;
  }
}


/* ================= 2. FACULTY MODULE ================= */
function renderFaculties() {
  const tbody = document.getElementById('faculty-table-body');
  tbody.innerHTML = '';

  state.faculties.forEach((fac, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${fac.code}</strong></td>
      <td>${fac.name}</td>
      <td>
        <button class="action-link" onclick="editFaculty(${idx})"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
        <button class="action-link delete" onclick="deleteFaculty(${idx})"><i class="fa-solid fa-trash-can"></i> Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openFacultyModal(idx = null) {
  const modal = document.getElementById('faculty-modal');
  const title = document.getElementById('faculty-modal-title');
  const form = document.getElementById('faculty-form');
  const codeInput = document.getElementById('faculty-code');
  const nameInput = document.getElementById('faculty-name');
  const editIndex = document.getElementById('faculty-edit-index');

  form.reset();
  if (idx !== null) {
    title.textContent = "Edit Faculty Details";
    const fac = state.faculties[idx];
    codeInput.value = fac.code;
    codeInput.disabled = true; // Code acts as primary key, cannot edit code easily to avoid assignments breaks
    nameInput.value = fac.name;
    editIndex.value = idx;
  } else {
    title.textContent = "Add New Faculty";
    codeInput.disabled = false;
    editIndex.value = "";
  }
  modal.classList.add('active');
}

function closeFacultyModal() {
  document.getElementById('faculty-modal').classList.remove('active');
}

function handleFacultySubmit(e) {
  e.preventDefault();
  const code = document.getElementById('faculty-code').value.trim().toUpperCase();
  const name = document.getElementById('faculty-name').value.trim();
  const editIndex = document.getElementById('faculty-edit-index').value;

  if (editIndex !== "") {
    // Edit Mode
    const idx = parseInt(editIndex, 10);
    state.faculties[idx].name = name;
  } else {
    // Add Mode - check unique code
    if (state.faculties.some(f => f.code === code)) {
      alert(`Faculty code "${code}" already exists. Please choose a unique code.`);
      return;
    }
    state.faculties.push({ code, name });
  }

  saveData();
  closeFacultyModal();
  renderFaculties();
  renderDashboard();
}

window.editFaculty = function(idx) {
  openFacultyModal(idx);
};

window.deleteFaculty = function(idx) {
  const fac = state.faculties[idx];
  if (confirm(`Are you sure you want to delete Faculty "${fac.name}" (${fac.code})? This will clear all assignments mapping to them.`)) {
    // Remove assignments associated with this faculty
    for (const key in state.assignments) {
      if (state.assignments[key] === fac.code) {
        delete state.assignments[key];
      }
    }
    
    state.faculties.splice(idx, 1);
    saveData();
    renderFaculties();
    renderDashboard();
  }
};


/* ================= 3. SUBJECT MODULE ================= */
function renderSubjects() {
  const tbody = document.getElementById('subject-table-body');
  tbody.innerHTML = '';

  state.subjects.forEach((sub, idx) => {
    let yearBadgeClass = 'badge-year-1';
    if (sub.year.startsWith('II')) yearBadgeClass = 'badge-year-2';
    if (sub.year.startsWith('III')) yearBadgeClass = 'badge-year-3';

    const typeBadge = sub.type.toLowerCase() === 'lab' ? 'badge-lab' : 'badge-theory';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${sub.code}</strong></td>
      <td>${sub.name}</td>
      <td><span class="badge ${yearBadgeClass}">${sub.year}</span></td>
      <td>${sub.weeklyHours} Hours</td>
      <td><span class="badge ${typeBadge}">${sub.type}</span></td>
      <td>
        <button class="action-link" onclick="editSubject(${idx})"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
        <button class="action-link delete" onclick="deleteSubject(${idx})"><i class="fa-solid fa-trash-can"></i> Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openSubjectModal(idx = null) {
  const modal = document.getElementById('subject-modal');
  const title = document.getElementById('subject-modal-title');
  const form = document.getElementById('subject-form');
  const codeInput = document.getElementById('subject-code');
  const nameInput = document.getElementById('subject-name');
  const yearInput = document.getElementById('subject-year');
  const hoursInput = document.getElementById('subject-hours');
  const typeInput = document.getElementById('subject-type');
  const editIndex = document.getElementById('subject-edit-index');

  form.reset();
  if (idx !== null) {
    title.textContent = "Edit Subject Details";
    const sub = state.subjects[idx];
    codeInput.value = sub.code;
    codeInput.disabled = true;
    nameInput.value = sub.name;
    yearInput.value = sub.year;
    hoursInput.value = sub.weeklyHours;
    typeInput.value = sub.type;
    editIndex.value = idx;
  } else {
    title.textContent = "Add New Subject";
    codeInput.disabled = false;
    editIndex.value = "";
  }
  modal.classList.add('active');
}

function closeSubjectModal() {
  document.getElementById('subject-modal').classList.remove('active');
}

function handleSubjectSubmit(e) {
  e.preventDefault();
  const code = document.getElementById('subject-code').value.trim().toUpperCase();
  const name = document.getElementById('subject-name').value.trim();
  const year = document.getElementById('subject-year').value;
  const hours = document.getElementById('subject-hours').value;
  const type = document.getElementById('subject-type').value;
  const editIndex = document.getElementById('subject-edit-index').value;

  if (editIndex !== "") {
    // Edit
    const idx = parseInt(editIndex, 10);
    state.subjects[idx].name = name;
    state.subjects[idx].year = year;
    state.subjects[idx].weeklyHours = hours;
    state.subjects[idx].type = type;
  } else {
    // Add - check unique
    if (state.subjects.some(s => s.code === code)) {
      alert(`Subject code "${code}" already exists. Please choose a unique code.`);
      return;
    }
    state.subjects.push({ name, code, year, weeklyHours: hours, type });
  }

  saveData();
  closeSubjectModal();
  renderSubjects();
  renderDashboard();
}

window.editSubject = function(idx) {
  openSubjectModal(idx);
};

window.deleteSubject = function(idx) {
  const sub = state.subjects[idx];
  if (confirm(`Are you sure you want to delete Subject "${sub.name}" (${sub.code})?`)) {
    // Clear assignment mapping
    delete state.assignments[sub.code];
    
    state.subjects.splice(idx, 1);
    saveData();
    renderSubjects();
    renderDashboard();
  }
};


/* ================= 4. FACULTY ASSIGNMENT MODULE ================= */
function renderAssignments() {
  const tbody = document.getElementById('assignment-table-body');
  tbody.innerHTML = '';

  state.subjects.forEach((sub) => {
    const assignedFacCode = state.assignments[sub.code];
    const fac = state.faculties.find(f => f.code === assignedFacCode);
    const facultyDisplay = fac ? `${fac.name} (${fac.code})` : '<span style="color: #ef4444; font-style: italic; font-weight:600;"><i class="fa-solid fa-triangle-exclamation"></i> Unassigned</span>';
    
    let yearBadgeClass = 'badge-year-1';
    if (sub.year.startsWith('II')) yearBadgeClass = 'badge-year-2';
    if (sub.year.startsWith('III')) yearBadgeClass = 'badge-year-3';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${sub.code}</strong></td>
      <td>${sub.name}</td>
      <td><span class="badge ${yearBadgeClass}">${sub.year}</span></td>
      <td><span class="badge ${sub.type.toLowerCase() === 'lab' ? 'badge-lab' : 'badge-theory'}">${sub.type}</span></td>
      <td>${facultyDisplay}</td>
      <td>
        <button class="action-link" onclick="openAssignmentModal('${sub.code}')"><i class="fa-solid fa-user-pen"></i> Assign</button>
        ${assignedFacCode ? `<button class="action-link delete" onclick="deleteAssignment('${sub.code}')"><i class="fa-solid fa-unlink"></i> Remove</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAssignmentModal(subjectCode = null) {
  const modal = document.getElementById('assignment-modal');
  const subSelect = document.getElementById('assign-subject');
  const facSelect = document.getElementById('assign-faculty');

  // Load subjects options
  subSelect.innerHTML = '';
  state.subjects.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub.code;
    opt.textContent = `[${sub.code}] - ${sub.name} (${sub.year})`;
    subSelect.appendChild(opt);
  });

  // Load faculty options
  facSelect.innerHTML = '';
  state.faculties.forEach(fac => {
    const opt = document.createElement('option');
    opt.value = fac.code;
    opt.textContent = `${fac.name} (${fac.code})`;
    facSelect.appendChild(opt);
  });

  if (subjectCode) {
    subSelect.value = subjectCode;
  }
  
  // Match current assignment if exists
  const currentFac = state.assignments[subSelect.value];
  if (currentFac) {
    facSelect.value = currentFac;
  }

  // Pre-fill changes when subject dropdown changes
  subSelect.addEventListener('change', () => {
    const matchedFac = state.assignments[subSelect.value];
    if (matchedFac) {
      facSelect.value = matchedFac;
    }
  });

  modal.classList.add('active');
}

function closeAssignmentModal() {
  document.getElementById('assignment-modal').classList.remove('active');
}

function handleAssignmentSubmit(e) {
  e.preventDefault();
  const subCode = document.getElementById('assign-subject').value;
  const facCode = document.getElementById('assign-faculty').value;

  state.assignments[subCode] = facCode;
  saveData();
  closeAssignmentModal();
  renderAssignments();
}

window.deleteAssignment = function(subCode) {
  if (confirm(`Remove faculty assignment for subject "${subCode}"?`)) {
    delete state.assignments[subCode];
    saveData();
    renderAssignments();
  }
};


/* ================= 5. AUTOMATIC GENERATE MODULE ================= */
function renderGenerate() {
  document.getElementById('input-semester').value = state.settings.semester;
  document.getElementById('input-acad-year').value = state.settings.academicYear;
  
  const box = document.getElementById('generation-result-box');
  box.classList.add('hidden');
}

function handleGenerateSubmit(e) {
  e.preventDefault();
  const semester = document.getElementById('input-semester').value;
  const academicYear = document.getElementById('input-acad-year').value.trim();
  const box = document.getElementById('generation-result-box');

  state.settings.semester = semester;
  state.settings.academicYear = academicYear;
  saveData();

  // Set Top Bar badge
  document.getElementById('current-badge-year').textContent = academicYear;
  document.getElementById('current-badge-sem').textContent = semester === 'Odd Semester' ? 'Odd Sem' : 'Even Sem';

  try {
    // Instantiate Core Scheduler
    const scheduler = new TimetableScheduler(state.faculties, state.subjects, state.assignments);
    
    // Generate Timetables
    const generated = scheduler.generate();
    
    // Save to State
    state.timetableData = generated;
    saveData();

    // Success Status
    box.className = "generation-result-box success";
    box.innerHTML = `
      <h4><i class="fa-solid fa-circle-check"></i> Generation Successful!</h4>
      <p>Clash-free college timetables for I B.Voc, II B.Voc, and III B.Voc SD & SA have been generated and validated dynamically.</p>
      <button class="btn btn-primary" style="margin-top: 12px; padding: 6px 12px;" onclick="goToTimetableGrid()">View Timetables</button>
    `;
    box.classList.remove('hidden');
    
    // Refresh stats and reports
    renderDashboard();
    renderTimetableGrid();
    renderFacultySearch();
    renderSubjectSearch();
    renderWorkloadReport();

  } catch (err) {
    console.error(err);
    box.className = "generation-result-box error";
    box.innerHTML = `
      <h4><i class="fa-solid fa-triangle-exclamation"></i> Generation Failed</h4>
      <p>${err.message}</p>
    `;
    box.classList.remove('hidden');
  }
}

window.goToTimetableGrid = function() {
  document.querySelector('.nav-link[data-target="viewer-view"]').click();
};


/* ================= 6. TIMETABLE VIEWER MODULE ================= */
function renderTimetableGrid() {
  // Update header badges
  document.getElementById('hdr-semester').textContent = state.settings.semester;
  document.getElementById('hdr-acad-year').textContent = state.settings.academicYear;
  
  const classSelect = document.getElementById('view-class-select');
  const classId = classSelect.value;
  document.getElementById('hdr-class-name').textContent = classId;

  const tbody = document.getElementById('timetable-grid-body');
  tbody.innerHTML = '';

  if (!state.timetableData) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 40px 10px;">
      No timetable generated. Please go to "Generate Timetable" to create a new college schedule.
    </td>`;
    tbody.appendChild(tr);
    return;
  }

  const days = ['A', 'B', 'C', 'D', 'E', 'F'];
  const classTimetable = state.timetableData[classId];

  if (!classTimetable) {
    console.error("Timetable missing for year class:", classId);
    return;
  }

  for (let d = 0; d < days.length; d++) {
    const tr = document.createElement('tr');
    
    // Day Order
    const tdDay = document.createElement('td');
    tdDay.innerHTML = `<strong>${days[d]} Day</strong>`;
    tr.appendChild(tdDay);

    // Period 1, 2, 3 (indices 0, 1, 2)
    for (let p = 0; p < 3; p++) {
      const subCode = classTimetable[d][p];
      const td = createGridCell(subCode);
      tr.appendChild(td);
    }

    // BREAK column
    const tdBreak = document.createElement('td');
    tdBreak.className = 'break-column';
    tdBreak.innerHTML = 'B<br>R<br>E<br>A<br>K';
    tr.appendChild(tdBreak);

    // Period 4, 5 (indices 3, 4)
    for (let p = 3; p < 5; p++) {
      const subCode = classTimetable[d][p];
      const td = createGridCell(subCode);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }
}

// Generate cell contents
function createGridCell(subCode) {
  const td = document.createElement('td');
  
  if (!subCode) {
    td.innerHTML = `<span class="slot-empty">-</span>`;
    return td;
  }

  const sub = state.subjects.find(s => s.code === subCode);
  const facCode = state.assignments[subCode];
  const fac = state.faculties.find(f => f.code === facCode);
  const facultyName = fac ? fac.name : (facCode || 'Unassigned');

  const subjectName = sub ? sub.name : subCode;
  const isLab = sub && sub.type.toLowerCase() === 'lab';

  td.innerHTML = `
    <div class="slot-subject">${subjectName}</div>
    <div class="slot-faculty">[${subCode}] - ${facultyName}</div>
    ${isLab ? `<span class="slot-lab-indicator">LAB</span>` : ''}
  `;
  return td;
}


/* ================= 7. FACULTY SEARCH MODULE ================= */
function renderFacultySearch() {
  const select = document.getElementById('search-faculty-select');
  select.innerHTML = '<option value="" disabled selected>-- Select Faculty --</option>';

  state.faculties.forEach(fac => {
    const opt = document.createElement('option');
    opt.value = fac.code;
    opt.textContent = `${fac.name} (${fac.code})`;
    select.appendChild(opt);
  });

  document.getElementById('faculty-search-result').classList.add('hidden');
}

function displayFacultySearchResult(facCode) {
  const title = document.getElementById('faculty-search-title');
  const tbody = document.getElementById('faculty-search-body');
  
  const fac = state.faculties.find(f => f.code === facCode);
  title.textContent = `Schedule: ${fac ? fac.name : facCode} (${facCode})`;

  tbody.innerHTML = '';

  if (!state.timetableData) {
    alert("Please generate timetables first.");
    return;
  }

  const days = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  for (let d = 0; d < days.length; d++) {
    const tr = document.createElement('tr');
    
    // Day Order
    const tdDay = document.createElement('td');
    tdDay.innerHTML = `<strong>${days[d]} Day</strong>`;
    tr.appendChild(tdDay);

    // P1, P2, P3
    for (let p = 0; p < 3; p++) {
      const cellInfo = getFacultySlotDuty(facCode, d, p);
      tr.appendChild(createSearchCell(cellInfo));
    }

    // BREAK
    const tdBreak = document.createElement('td');
    tdBreak.className = 'break-column';
    tdBreak.innerHTML = 'B<br>R<br>E<br>A<br>K';
    tr.appendChild(tdBreak);

    // P4, P5
    for (let p = 3; p < 5; p++) {
      const cellInfo = getFacultySlotDuty(facCode, d, p);
      tr.appendChild(createSearchCell(cellInfo));
    }

    tbody.appendChild(tr);
  }

  document.getElementById('faculty-search-result').classList.remove('hidden');
}

// Find class and subject that faculty is teaching during a slot
function getFacultySlotDuty(facCode, dayIndex, periodIndex) {
  const classes = ['I B.Voc SD & SA', 'II B.Voc SD & SA', 'III B.Voc SD & SA'];
  for (const cls of classes) {
    const subCode = state.timetableData[cls][dayIndex][periodIndex];
    if (subCode) {
      const assignedFac = state.assignments[subCode];
      if (assignedFac === facCode) {
        const sub = state.subjects.find(s => s.code === subCode);
        return {
          subjectName: sub ? sub.name : subCode,
          subjectCode: subCode,
          classId: cls,
          isLab: sub && sub.type.toLowerCase() === 'lab'
        };
      }
    }
  }
  return null;
}

function createSearchCell(info) {
  const td = document.createElement('td');
  if (!info) {
    td.innerHTML = `<span class="slot-empty">Free</span>`;
    return td;
  }

  // Shorten class names for search tables
  const displayClass = info.classId.split(' ')[0] + ' Yr'; // "I Yr" etc.

  td.innerHTML = `
    <div class="slot-subject">${info.subjectName}</div>
    <div class="slot-faculty">[${info.subjectCode}] - <strong>${displayClass}</strong></div>
    ${info.isLab ? `<span class="slot-lab-indicator">LAB</span>` : ''}
  `;
  return td;
}


/* ================= 8. SUBJECT SEARCH MODULE ================= */
function renderSubjectSearch() {
  const select = document.getElementById('search-subject-select');
  select.innerHTML = '<option value="" disabled selected>-- Select Subject --</option>';

  state.subjects.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub.code;
    opt.textContent = `[${sub.code}] - ${sub.name} (${sub.year})`;
    select.appendChild(opt);
  });

  document.getElementById('subject-search-result').classList.add('hidden');
}

function displaySubjectSearchResult(subCode) {
  const title = document.getElementById('subject-search-title');
  const tbody = document.getElementById('subject-search-body');
  
  const sub = state.subjects.find(s => s.code === subCode);
  title.textContent = `Schedule: ${sub ? sub.name : subCode} (${subCode})`;

  tbody.innerHTML = '';

  if (!state.timetableData) {
    alert("Please generate timetables first.");
    return;
  }

  const days = ['A', 'B', 'C', 'D', 'E', 'F'];
  const targetClass = sub ? sub.year : '';

  for (let d = 0; d < days.length; d++) {
    const tr = document.createElement('tr');
    
    // Day Order
    const tdDay = document.createElement('td');
    tdDay.innerHTML = `<strong>${days[d]} Day</strong>`;
    tr.appendChild(tdDay);

    // P1, P2, P3
    for (let p = 0; p < 3; p++) {
      const scheduled = isSubjectScheduledAtSlot(subCode, targetClass, d, p);
      tr.appendChild(createSubjectSearchCell(scheduled, sub));
    }

    // BREAK
    const tdBreak = document.createElement('td');
    tdBreak.className = 'break-column';
    tdBreak.innerHTML = 'B<br>R<br>E<br>A<br>K';
    tr.appendChild(tdBreak);

    // P4, P5
    for (let p = 3; p < 5; p++) {
      const scheduled = isSubjectScheduledAtSlot(subCode, targetClass, d, p);
      tr.appendChild(createSubjectSearchCell(scheduled, sub));
    }

    tbody.appendChild(tr);
  }

  document.getElementById('subject-search-result').classList.remove('hidden');
}

function isSubjectScheduledAtSlot(subCode, classId, dayIndex, periodIndex) {
  if (!state.timetableData || !classId) return false;
  return state.timetableData[classId][dayIndex][periodIndex] === subCode;
}

function createSubjectSearchCell(scheduled, sub) {
  const td = document.createElement('td');
  if (!scheduled) {
    td.innerHTML = `<span class="slot-empty">-</span>`;
    return td;
  }

  const facCode = state.assignments[sub.code];
  const fac = state.faculties.find(f => f.code === facCode);
  const facultyName = fac ? fac.name : (facCode || 'Unassigned');
  const isLab = sub.type.toLowerCase() === 'lab';

  td.innerHTML = `
    <div class="slot-subject" style="color: var(--secondary);">${sub.name}</div>
    <div class="slot-faculty">Faculty: ${facultyName}</div>
    <div class="slot-faculty">Class: ${sub.year.split(' ')[0]} Year</div>
    ${isLab ? `<span class="slot-lab-indicator">LAB</span>` : ''}
  `;
  return td;
}


/* ================= 9. WORKLOAD REPORT MODULE ================= */
function renderWorkloadReport() {
  document.getElementById('wl-semester').textContent = state.settings.semester;
  document.getElementById('wl-acad-year').textContent = state.settings.academicYear;

  const tbody = document.getElementById('workload-table-body');
  tbody.innerHTML = '';

  state.faculties.forEach(fac => {
    let actualHrs = 0;
    
    // Count periods assigned in generated timetable
    if (state.timetableData) {
      const classes = ['I B.Voc SD & SA', 'II B.Voc SD & SA', 'III B.Voc SD & SA'];
      for (const cls of classes) {
        for (let d = 0; d < 6; d++) {
          for (let p = 0; p < 5; p++) {
            const subCode = state.timetableData[cls][d][p];
            if (subCode) {
              const assignedFac = state.assignments[subCode];
              if (assignedFac === fac.code) {
                actualHrs++;
              }
            }
          }
        }
      }
    }

    // Get subjects mapped
    const facSubs = state.subjects.filter(s => state.assignments[s.code] === fac.code);
    const subjectsStr = facSubs.map(s => `${s.name} (${s.weeklyHours}h)`).join(', ') || 'None Assigned';

    const statusBadge = actualHrs > 18 
      ? '<span class="workload-high">HIGH WORKLOAD</span>' 
      : '<span class="workload-normal">BALANCED</span>';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${fac.code}</strong></td>
      <td>${fac.name}</td>
      <td>${subjectsStr}</td>
      <td style="text-align: center; font-weight: 700;">${actualHrs} Hours</td>
      <td style="text-align: center;">${statusBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}
