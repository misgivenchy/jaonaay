// State & Constant Definitions
const MONTH_NAMES_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const DAY_NAMES_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const ROLES_LIST = [
  "พัฒนากองร้อย", "บก.พัน", "สื่อสาร", "สวัสดิการ", "คลังน้ำมัน", "ยย.นอก", "โรงเลี้ยง", "บ้านผบ.พัน"
];

// งานที่ไม่ต้องเข้าเวร
const EXEMPT_ROLES = ["โรงเลี้ยง", "บ้านผบ.พัน"];

const STORAGE_KEY_PERSONNEL_DB = "military_roster_personnel_db";

// Default Initial Personnel Database (ฐานข้อมูลกำลังพลเริ่มต้น)
const DEFAULT_PERSONNEL_DB = [];

// Personnel Database State
let personnelDatabase = loadPersonnelDatabase();

function loadPersonnelDatabase() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PERSONNEL_DB);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Could not load personnel DB from localStorage", e);
  }
  return [...DEFAULT_PERSONNEL_DB];
}

function savePersonnelDatabase() {
  try {
    localStorage.setItem(STORAGE_KEY_PERSONNEL_DB, JSON.stringify(personnelDatabase));
  } catch (e) {
    console.error("Failed to save personnel DB", e);
  }
  updatePillCounters();
}

// Application State
let appState = {
  viewMode: "review", // 'review' | 'schedule'
  selectedPlatoons: ["หมวด 1", "หมวด 2"], // Array of selected platoons (minimum 2)
  title: "เวรกองรักษาการ",
  startDay: 1,
  endDay: 10,
  monthIndex: 8, // 8 = กันยายน (0-indexed)
  yearBE: 2569,  // พ.ศ. 2569 (CE 2026)
  
  // Guard Arrays for Table Generation
  mainGuards: [],      // กลุ่มบน (พัฒนากองร้อย)
  saturdayGuards: [],  // กลุ่มล่างสุด (ไม่ได้อยู่พัฒนากองร้อย)
  assistantGuards: [], // ผช.สิบเวร

  schedule: {},
  assistantSchedule: {}
};

// DOM Elements
const elTitleInput = document.getElementById("titleInput");
const elStartDay = document.getElementById("startDay");
const elEndDay = document.getElementById("endDay");
const elMonthSelect = document.getElementById("monthSelect");
const elYearInput = document.getElementById("yearInput");
const elPaperTitle = document.getElementById("paperTitle");
const elTableContainer = document.getElementById("tableContainer");

// Views
const elViewReview = document.getElementById("viewReview");
const elViewSchedule = document.getElementById("viewSchedule");
const elScheduleViewActions = document.getElementById("scheduleViewActions");

// Modals
const elPersonnelModal = document.getElementById("personnelModal");
const elCellModal = document.getElementById("cellModal");
const elModalTitle = document.getElementById("modalTitle");

let activeCellTarget = null;

// Initialize Application
function initApp() {
  populateMonthDropdown();
  syncInputsFromState();
  initEventListeners();
  updatePillCounters();
  updatePlatoonPillsUI();
  renderReviewPersonnelTable();
}

// Populate Thai Months
function populateMonthDropdown() {
  elMonthSelect.innerHTML = "";
  MONTH_NAMES_TH.forEach((m, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = m;
    if (idx === appState.monthIndex) opt.selected = true;
    elMonthSelect.appendChild(opt);
  });
}

function syncInputsFromState() {
  elTitleInput.value = appState.title;
  elStartDay.value = appState.startDay;
  elEndDay.value = appState.endDay;
  elMonthSelect.value = appState.monthIndex;
  elYearInput.value = appState.yearBE;
}

// Update Pill Counters
function updatePillCounters() {
  const p1 = personnelDatabase.filter(p => p.platoon === "หมวด 1").length;
  const p2 = personnelDatabase.filter(p => p.platoon === "หมวด 2").length;
  const p3 = personnelDatabase.filter(p => p.platoon === "หมวด 3").length;
  const pAll = personnelDatabase.length;

  const el1 = document.getElementById("countPill1");
  const el2 = document.getElementById("countPill2");
  const el3 = document.getElementById("countPill3");
  const elAll = document.getElementById("countPillAll");

  if (el1) el1.textContent = p1;
  if (el2) el2.textContent = p2;
  if (el3) el3.textContent = p3;
  if (elAll) elAll.textContent = pAll;
}

// Platoon Multi-Selection Logic (ต้องเลือกอย่างน้อย 2 หมวด)
function togglePlatoonFilter(platoon) {
  const index = appState.selectedPlatoons.indexOf(platoon);
  if (index !== -1) {
    // If attempting to unselect, check if it would leave fewer than 2 platoons
    if (appState.selectedPlatoons.length <= 2) {
      alert("⚠️ ต้องเลือกอย่างน้อย 2 หมวดสำหรับจัดตารางเวรครับ");
      return;
    }
    appState.selectedPlatoons.splice(index, 1);
  } else {
    appState.selectedPlatoons.push(platoon);
  }
  updatePlatoonPillsUI();
  renderReviewPersonnelTable();
}

function selectAllPlatoons() {
  appState.selectedPlatoons = ["หมวด 1", "หมวด 2", "หมวด 3"];
  updatePlatoonPillsUI();
  renderReviewPersonnelTable();
}

function updatePlatoonPillsUI() {
  const allPlatoons = ["หมวด 1", "หมวด 2", "หมวด 3"];
  allPlatoons.forEach((platoon, idx) => {
    const pill = document.getElementById(`pillPlatoon${idx + 1}`);
    if (pill) {
      const isSelected = appState.selectedPlatoons.includes(platoon);
      if (isSelected) {
        pill.classList.add("active");
        const icon = pill.querySelector("i");
        if (icon) icon.style.display = "inline-block";
      } else {
        pill.classList.remove("active");
        const icon = pill.querySelector("i");
        if (icon) icon.style.display = "none";
      }
    }
  });

  const allPill = document.getElementById("pillSelectAll");
  if (allPill) {
    if (appState.selectedPlatoons.length === 3) {
      allPill.classList.add("active");
    } else {
      allPill.classList.remove("active");
    }
  }
}

// Render Review Personnel Table (In-place editable!)
function renderReviewPersonnelTable() {
  const tbody = document.getElementById("reviewPersonnelTableBody");
  if (!tbody) return;

  const searchText = (document.getElementById("searchReviewName").value || "").trim().toLowerCase();
  const selectedPlatoons = appState.selectedPlatoons;

  const filtered = personnelDatabase.filter(p => {
    if (!selectedPlatoons.includes(p.platoon)) return false;
    if (searchText && !p.name.toLowerCase().includes(searchText)) return false;
    return true;
  });

  // Calculate Guard Summary counts (exclude exempt roles like โรงเลี้ยง, บ้านผบ.พัน)
  const activeFiltered = filtered.filter(p => !EXEMPT_ROLES.includes(p.role));
  const guardSoldiers = activeFiltered.filter(p => (p.dutyType || "เวรกองรักษาการ") === "เวรกองรักษาการ");
  const asstSoldiers = activeFiltered.filter(p => (p.dutyType || "เวรกองรักษาการ") === "ผช.สิบเวร");
  
  const mainCount = guardSoldiers.filter(p => p.role === "พัฒนากองร้อย").length;
  const satCount = guardSoldiers.filter(p => p.role !== "พัฒนากองร้อย").length;
  const asstCount = asstSoldiers.length;
  const exemptCount = filtered.filter(p => EXEMPT_ROLES.includes(p.role)).length;

  document.getElementById("summaryMainCount").textContent = mainCount;
  document.getElementById("summarySatCount").textContent = satCount;
  document.getElementById("summaryAsstCount").textContent = asstCount;
  const elExempt = document.getElementById("summaryExemptCount");
  if (elExempt) elExempt.textContent = exemptCount;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#94a3b8; padding:25px;">ไม่พบข้อมูลกำลังพลในหมวดนี้</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((p, idx) => {
    const isExempt = EXEMPT_ROLES.includes(p.role);
    const isDev = (p.role === "พัฒนากองร้อย");
    const isGuard = ((p.dutyType || "เวรกองรักษาการ") === "เวรกองรักษาการ");

    // Position Badge description
    let posBadgeHtml = "";
    if (isExempt) {
      posBadgeHtml = `<span class="badge-pos badge-pos-exempt"><i class="fa-solid fa-ban" style="margin-right:4px;"></i>ไม่ต้องเข้าเวร (ยกเว้นเวร)</span>`;
    } else if (isGuard) {
      if (isDev) {
        posBadgeHtml = `<span class="badge-pos badge-pos-main"><i class="fa-solid fa-shield-halved" style="margin-right:4px;"></i>กลุ่มบน (วันปกติ 0-4 + เสาร์ 0)</span>`;
      } else {
        posBadgeHtml = `<span class="badge-pos badge-pos-sat"><i class="fa-solid fa-calendar-day" style="margin-right:4px;"></i>กลุ่มล่างสุด (เข้าเฉพาะวันเสาร์ 1-4)</span>`;
      }
    } else {
      if (isDev) {
        posBadgeHtml = `<span class="badge-pos badge-pos-asst-wkd"><i class="fa-solid fa-medal" style="margin-right:4px;"></i>ผช.สิบเวร (วันจันทร์ - ศุกร์)</span>`;
      } else {
        posBadgeHtml = `<span class="badge-pos badge-pos-asst-wke"><i class="fa-solid fa-medal" style="margin-right:4px;"></i>ผช.สิบเวร (วันเสาร์ - อาทิตย์)</span>`;
      }
    }

    // Role options HTML
    const roleOptionsHtml = ROLES_LIST.map(r => `
      <option value="${r}" ${p.role === r ? 'selected' : ''}>${r}</option>
    `).join("");

    const roleSelectClass = isDev ? "role-dev" : "role-non-dev";
    const dutySelectClass = isGuard ? "duty-guard" : "duty-asst";
    const regionSelectClass = (p.region === "นครสวรรค์") ? "region-nakhon" : (p.region === "อีสาน" ? "region-isan" : "");
    const statusSelectClass = (p.status === "ดองเวร") ? "status-dong" : "";

    return `
      <tr>
        <td style="text-align:center; color:#64748b; font-weight:600;">${idx + 1}</td>
        <td>${getPlatoonBadgeHtml(p.platoon)}</td>
        <td style="font-weight:700; color:#0f172a; font-size:1.02rem;">${escapeHtml(p.name)}</td>
        <td><span class="badge-batch">${escapeHtml(p.batch)}</span></td>
        <td>
          <select class="inline-select ${roleSelectClass}" onchange="updatePersonRole('${p.id}', this.value)" title="คลิกเพื่อเปลี่ยนหน้าที่/สายงานได้ทันที">
            ${roleOptionsHtml}
          </select>
        </td>
        <td>
          <select class="inline-select ${dutySelectClass}" onchange="updatePersonDutyType('${p.id}', this.value)" title="คลิกเพื่อเปลี่ยนประเภทเวร">
            <option value="เวรกองรักษาการ" ${isGuard ? 'selected' : ''}>🛡️ กองรักษาการ</option>
            <option value="ผช.สิบเวร" ${!isGuard ? 'selected' : ''}>🎖️ ผช.สิบเวร</option>
          </select>
        </td>
        <td>
          <select class="inline-select ${regionSelectClass}" onchange="updatePersonRegion('${p.id}', this.value)" title="เลือกพื้นที่: นครสวรรค์ หรือ อีสาน จะไม่เข้าเวรวันเดียวกัน">
            <option value="" ${!p.region ? 'selected' : ''}>- ไม่ระบุ -</option>
            <option value="นครสวรรค์" ${p.region === 'นครสวรรค์' ? 'selected' : ''}>🏛️ นครสวรรค์</option>
            <option value="อีสาน" ${p.region === 'อีสาน' ? 'selected' : ''}>🌾 อีสาน</option>
          </select>
        </td>
        <td>
          <select class="inline-select ${statusSelectClass}" onchange="updatePersonStatus('${p.id}', this.value)" title="สถานะเวร: ดองเวรจะจัดวันเว้นวันและเน้นเลข 2">
            <option value="ปกติ" ${(p.status || 'ปกติ') === 'ปกติ' ? 'selected' : ''}>🟢 ปกติ</option>
            <option value="ดองเวร" ${p.status === 'ดองเวร' ? 'selected' : ''}>🔴 ดองเวร</option>
          </select>
        </td>
        <td>${posBadgeHtml}</td>
      </tr>
    `;
  }).join("");
}

// In-place Update Person Role
function updatePersonRole(id, newRole) {
  const person = personnelDatabase.find(p => p.id === id);
  if (person) {
    person.role = newRole;
    savePersonnelDatabase();
    renderReviewPersonnelTable();
  }
}

// In-place Update Person Duty Type
function updatePersonDutyType(id, newDutyType) {
  const person = personnelDatabase.find(p => p.id === id);
  if (person) {
    person.dutyType = newDutyType;
    savePersonnelDatabase();
    renderReviewPersonnelTable();
  }
}

// In-place Update Person Region
function updatePersonRegion(id, newRegion) {
  const person = personnelDatabase.find(p => p.id === id);
  if (person) {
    person.region = newRegion || "";
    savePersonnelDatabase();
    renderReviewPersonnelTable();
  }
}

// In-place Update Person Status
function updatePersonStatus(id, newStatus) {
  const person = personnelDatabase.find(p => p.id === id);
  if (person) {
    person.status = newStatus || "ปกติ";
    savePersonnelDatabase();
    renderReviewPersonnelTable();
  }
}

// Helper: Check if soldier is in 'พัฒนากองร้อย'
function isCompanyDev(name) {
  const found = personnelDatabase.find(p => p.name === name);
  return found ? (found.role === "พัฒนากองร้อย") : true;
}

// Helper: Get soldier region ('นครสวรรค์' | 'อีสาน' | '')
function getPersonRegion(name) {
  const found = personnelDatabase.find(p => p.name === name);
  return (found && found.region) ? found.region : "";
}

// Helper: Check if soldier is dong-waen (ดองเวร)
function isPersonDong(name) {
  const found = personnelDatabase.find(p => p.name === name);
  return (found && found.status === "ดองเวร");
}

// Get Days List
function getDaysList() {
  const days = [];
  const start = parseInt(appState.startDay, 10);
  const end = parseInt(appState.endDay, 10);
  const yearCE = appState.yearBE - 543;
  const month = appState.monthIndex;

  for (let d = start; d <= end; d++) {
    const dateObj = new Date(yearCE, month, d);
    const dayOfWeekIndex = dateObj.getDay(); // 0 = Sun, 6 = Sat
    days.push({
      dateNumber: d,
      dayOfWeekIndex: dayOfWeekIndex,
      dayNameTh: DAY_NAMES_TH[dayOfWeekIndex],
      isSaturday: dayOfWeekIndex === 6,
      isSunday: dayOfWeekIndex === 0,
      isWeekend: dayOfWeekIndex === 0 || dayOfWeekIndex === 6
    });
  }
  return days;
}

// Update Header Title
function updatePaperTitle() {
  const monthName = MONTH_NAMES_TH[appState.monthIndex];
  const titleText = `${appState.title} ระหว่างวันที่ ${appState.startDay} - ${appState.endDay} ${monthName} ${appState.yearBE}`;
  elPaperTitle.textContent = titleText;
}

// Permutation Helper
function getPermutations(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const remainingPerms = getPermutations(remaining);
    for (let perm of remainingPerms) {
      result.push([current, ...perm]);
    }
  }
  return result;
}

// Generate Schedule Algorithm
function generateSingleSchedule() {
  const days = getDaysList();
  const totalDays = days.length;
  const allMain = [...appState.mainGuards];
  const satGuards = [...appState.saturdayGuards]; // Non-พัฒนากองร้อย (Bottom group)
  const asstGuards = [...appState.assistantGuards];

  const schedule = {};
  const assistantSchedule = {};

  allMain.forEach(name => { schedule[name] = new Array(totalDays).fill(null); });
  satGuards.forEach(name => { schedule[name] = new Array(totalDays).fill(null); });
  asstGuards.forEach(name => { assistantSchedule[name] = new Array(totalDays).fill(false); });

  const dutyCounts = {};
  const lastWorkedDay = {};
  const lastNumberAssigned = {};
  const numberHistory = {};

  allMain.forEach(name => {
    dutyCounts[name] = 0;
    lastWorkedDay[name] = -99;
    lastNumberAssigned[name] = -1;
    numberHistory[name] = [];
  });

  const satNumberHistory = {};
  satGuards.forEach(name => { satNumberHistory[name] = []; });

  let totalRepeatPenalty = 0;
  let totalGapViolations = 0;
  let totalRegionViolations = 0;

  // 1. Guard Schedule Generation
  for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
    const dayInfo = days[dayIdx];
    const todayAssigned = []; // List of all soldiers assigned today

    if (dayInfo.isSaturday && satGuards.length > 0) {
      // Saturday:
      // Bottom group (คนที่ไม่ได้อยู่พัฒนากองร้อย) gets numbers 1, 2, 3, 4
      const satNumbers = [1, 2, 3, 4];
      const satCount = Math.min(satGuards.length, 4);
      
      const availableSatPerms = getPermutations(satNumbers.slice(0, satCount));
      shuffleArray(availableSatPerms);
      
      let bestSatPerm = availableSatPerms[0];
      let bestSatPenalty = 999999;
      
      for (let perm of availableSatPerms) {
        let pen = 0;
        for (let i = 0; i < satCount; i++) {
          const satPerson = satGuards[i];
          const num = perm[i];
          const hist = satNumberHistory[satPerson] || [];
          const count = hist.filter(x => x === num).length;
          pen += count * 100;

          // If person is 'ดองเวร', strongly prefer number 2!
          if (isPersonDong(satPerson)) {
            if (num === 2) pen -= 500;
            else pen += 300;
          }
        }
        if (pen < bestSatPenalty) {
          bestSatPenalty = pen;
          bestSatPerm = perm;
        }
      }

      for (let i = 0; i < satCount; i++) {
        const satPerson = satGuards[i];
        const num = bestSatPerm[i];
        schedule[satPerson][dayIdx] = num;
        satNumberHistory[satPerson].push(num);
        todayAssigned.push(satPerson);
      }

      // Slot 0 strictly assigned to 1 Main guard (พัฒนากองร้อย)
      // Check region conflict with Saturday guards already assigned today
      const satRegionsToday = todayAssigned.map(n => getPersonRegion(n)).filter(Boolean);
      const hasNakhonToday = satRegionsToday.includes("นครสวรรค์");
      const hasIsanToday = satRegionsToday.includes("อีสาน");

      let eligible = allMain.filter(n => {
        const minGap = isPersonDong(n) ? 2 : 3;
        return (dayIdx - lastWorkedDay[n]) >= minGap;
      });

      // Filter out region conflicts if possible
      let regionSafe = eligible.filter(n => {
        const reg = getPersonRegion(n);
        if (hasNakhonToday && reg === "อีสาน") return false;
        if (hasIsanToday && reg === "นครสวรรค์") return false;
        return true;
      });
      if (regionSafe.length > 0) eligible = regionSafe;
      else if (eligible.length > 0) totalRegionViolations++;

      if (eligible.length === 0) {
        totalGapViolations++;
        eligible = allMain.filter(n => (dayIdx - lastWorkedDay[n]) >= 2);
        if (eligible.length === 0) eligible = allMain.filter(n => (dayIdx - lastWorkedDay[n]) >= 1);
        if (eligible.length === 0) eligible = [...allMain];
      }

      eligible.sort((a, b) => {
        // Dong-waen gets high priority to work more often
        const isDongA = isPersonDong(a) ? 1 : 0;
        const isDongB = isPersonDong(b) ? 1 : 0;
        if (isDongA !== isDongB) return isDongB - isDongA;

        if (dutyCounts[a] !== dutyCounts[b]) return dutyCounts[a] - dutyCounts[b];
        const aCount0 = numberHistory[a].filter(x => x === 0).length;
        const bCount0 = numberHistory[b].filter(x => x === 0).length;
        if (aCount0 !== bCount0) return aCount0 - bCount0;
        const gapA = dayIdx - lastWorkedDay[a];
        const gapB = dayIdx - lastWorkedDay[b];
        if (gapA !== gapB) return gapB - gapA;
        return Math.random() - 0.5;
      });

      if (eligible.length > 0) {
        const chosen0 = eligible[0];
        schedule[chosen0][dayIdx] = 0;
        dutyCounts[chosen0]++;
        lastWorkedDay[chosen0] = dayIdx;
        lastNumberAssigned[chosen0] = 0;
        numberHistory[chosen0].push(0);
        todayAssigned.push(chosen0);
      }

    } else {
      // Normal Day (Sun - Fri): Pick 5 candidates from Main group
      // Rules:
      // - Dong-waen (ดองเวร): min gap >= 2 (วันเว้นวันได้) and prioritized!
      // - Normal: min gap >= 3
      // - Region conflict: 'นครสวรรค์' and 'อีสาน' must NOT be on duty together today
      const selected = [];
      const requiredSlots = Math.min(5, allMain.length);

      for (let s = 0; s < requiredSlots; s++) {
        const pool = allMain.filter(n => !selected.includes(n));
        
        // Check current regions in selected today
        const curRegions = selected.map(n => getPersonRegion(n)).filter(Boolean);
        const hasNakhon = curRegions.includes("นครสวรรค์");
        const hasIsan = curRegions.includes("อีสาน");

        let validPool = pool.filter(n => {
          const minGap = isPersonDong(n) ? 2 : 3;
          return (dayIdx - lastWorkedDay[n]) >= minGap;
        });

        // Filter region conflicts
        let regionCleanPool = validPool.filter(n => {
          const reg = getPersonRegion(n);
          if (hasNakhon && reg === "อีสาน") return false;
          if (hasIsan && reg === "นครสวรรค์") return false;
          return true;
        });

        if (regionCleanPool.length > 0) {
          validPool = regionCleanPool;
        } else if (validPool.length === 0) {
          totalGapViolations++;
          validPool = pool.filter(n => (dayIdx - lastWorkedDay[n]) >= 2);
          if (validPool.length === 0) {
            validPool = pool.filter(n => (dayIdx - lastWorkedDay[n]) >= 1);
            if (validPool.length === 0) validPool = pool;
          }
        }

        validPool.sort((a, b) => {
          // Prioritize dong-waen candidates
          const isDongA = isPersonDong(a) ? 1 : 0;
          const isDongB = isPersonDong(b) ? 1 : 0;
          if (isDongA !== isDongB) return isDongB - isDongA;

          if (dutyCounts[a] !== dutyCounts[b]) return dutyCounts[a] - dutyCounts[b];
          const gapA = dayIdx - lastWorkedDay[a];
          const gapB = dayIdx - lastWorkedDay[b];
          if (gapA !== gapB) return gapB - gapA;
          return Math.random() - 0.5;
        });

        if (validPool.length > 0) {
          const pick = validPool[0];
          selected.push(pick);
          const pickReg = getPersonRegion(pick);
          if ((hasNakhon && pickReg === "อีสาน") || (hasIsan && pickReg === "นครสวรรค์")) {
            totalRegionViolations++;
          }
        }
      }

      // Assign numbers [0, 1, 2, 3, 4] with permutation optimization
      // If someone is 'ดองเวร', strongly prioritize assigning number 2!
      const availableNumbers = [0, 1, 2, 3, 4].slice(0, selected.length);
      const perms = getPermutations(availableNumbers);
      shuffleArray(perms);

      let bestPerm = perms[0];
      let minPermPenalty = Infinity;

      for (let perm of perms) {
        let penalty = 0;
        for (let i = 0; i < selected.length; i++) {
          const person = selected[i];
          const num = perm[i];
          const isDong = isPersonDong(person);
          const hist = numberHistory[person] || [];
          const timesUsed = hist.filter(x => x === num).length;

          if (isDong) {
            // For dong-waen: heavily reward assigning number 2, penalize other numbers
            if (num === 2) {
              penalty -= 30000;
            } else {
              penalty += 15000;
            }
          } else {
            penalty += timesUsed * 2500;
            if (lastNumberAssigned[person] === num) {
              penalty += 15000;
            }
          }
        }

        if (penalty < minPermPenalty) {
          minPermPenalty = penalty;
          bestPerm = perm;
        }
      }

      totalRepeatPenalty += Math.max(0, minPermPenalty);

      for (let i = 0; i < selected.length; i++) {
        const person = selected[i];
        const num = bestPerm[i];
        schedule[person][dayIdx] = num;
        dutyCounts[person]++;
        lastWorkedDay[person] = dayIdx;
        lastNumberAssigned[person] = num;
        numberHistory[person].push(num);
      }
    }
  }

  // 2. Assistant NCO Schedule Generation
  if (asstGuards.length > 0) {
    const asstWeekendGuards = asstGuards.filter(n => !isCompanyDev(n)); // Non-พัฒนากองร้อย (เสาร์-อาทิตย์)
    const asstWeekdayGuards = asstGuards.filter(n => isCompanyDev(n));  // พัฒนากองร้อย (จันทร์-ศุกร์)

    const asstDutyCounts = {};
    let lastAsst = null;
    asstGuards.forEach(n => { asstDutyCounts[n] = 0; });

    days.forEach((dayInfo, dayIdx) => {
      // Find regions of soldiers on guard duty today
      const guardsToday = [];
      allMain.forEach(n => { if (schedule[n] && schedule[n][dayIdx] !== null) guardsToday.push(n); });
      satGuards.forEach(n => { if (schedule[n] && schedule[n][dayIdx] !== null) guardsToday.push(n); });
      const guardRegions = guardsToday.map(n => getPersonRegion(n)).filter(Boolean);
      const guardHasNakhon = guardRegions.includes("นครสวรรค์");
      const guardHasIsan = guardRegions.includes("อีสาน");

      let targetPool = [];
      if (dayInfo.isWeekend) {
        targetPool = (asstWeekendGuards.length > 0) ? asstWeekendGuards : asstGuards;
      } else {
        targetPool = (asstWeekdayGuards.length > 0) ? asstWeekdayGuards : asstGuards;
      }

      let pool = targetPool.filter(n => n !== lastAsst);
      if (pool.length === 0) pool = [...targetPool];

      // Avoid region conflict with guards on duty today
      let safePool = pool.filter(n => {
        const r = getPersonRegion(n);
        if (guardHasNakhon && r === "อีสาน") return false;
        if (guardHasIsan && r === "นครสวรรค์") return false;
        return true;
      });
      if (safePool.length > 0) pool = safePool;
      else totalRegionViolations++;

      const minCount = Math.min(...pool.map(n => asstDutyCounts[n]));
      const minPool = pool.filter(n => asstDutyCounts[n] === minCount);

      // If any in minPool is dong-waen, prioritize them
      minPool.sort((a, b) => (isPersonDong(b) ? 1 : 0) - (isPersonDong(a) ? 1 : 0));

      const chosen = minPool[0];
      if (chosen) {
        assistantSchedule[chosen][dayIdx] = true;
        asstDutyCounts[chosen]++;
        lastAsst = chosen;
      }
    });
  }

  const maxDuty = Math.max(...Object.values(dutyCounts), 0);
  const minDuty = Math.min(...Object.values(dutyCounts), 0);
  const dutySpread = maxDuty - minDuty;

  const totalScore = (totalRegionViolations * 500000) + (totalGapViolations * 100000) + (dutySpread * 5000) + totalRepeatPenalty;

  return {
    schedule,
    assistantSchedule,
    score: totalScore
  };
}

// Master Randomizer
function randomizeSchedule() {
  let bestCandidate = null;
  const attempts = 150;

  for (let i = 0; i < attempts; i++) {
    const candidate = generateSingleSchedule();
    if (!bestCandidate || candidate.score < bestCandidate.score) {
      bestCandidate = candidate;
      if (candidate.score === 0) break;
    }
  }

  if (bestCandidate) {
    appState.schedule = bestCandidate.schedule;
    appState.assistantSchedule = bestCandidate.assistantSchedule;
  }
  savePublishedSchedule();
}

// Save Published Schedule to localStorage (for public page)
const STORAGE_KEY_PUBLISHED = "military_roster_published";

function savePublishedSchedule() {
  const days = getDaysList();
  const monthName = MONTH_NAMES_TH[appState.monthIndex];
  const published = {
    title: appState.title,
    startDay: appState.startDay,
    endDay: appState.endDay,
    monthIndex: appState.monthIndex,
    monthName: monthName,
    yearBE: appState.yearBE,
    yearCE: appState.yearBE - 543,
    days: days,
    mainGuards: appState.mainGuards,
    saturdayGuards: appState.saturdayGuards,
    assistantGuards: appState.assistantGuards,
    schedule: appState.schedule,
    assistantSchedule: appState.assistantSchedule,
    publishedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(STORAGE_KEY_PUBLISHED, JSON.stringify(published));
  } catch (e) {
    console.error("Failed to save published schedule", e);
  }
}

// Shuffle Helper
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Switch to Schedule View & Generate Roster
function generateAndShowRoster() {
  const selectedPlatoons = appState.selectedPlatoons || [];
  if (selectedPlatoons.length < 2) {
    alert("⚠️ กรุณาเลือกอย่างน้อย 2 หมวดก่อนสร้างตารางเวรครับ");
    return;
  }

  const filtered = personnelDatabase.filter(p => {
    if (!selectedPlatoons.includes(p.platoon)) return false;
    return true;
  });

  if (filtered.length === 0) {
    alert("ไม่พบกำลังพลในหมวดที่เลือก กรุณาตรวจสอบหรือเพิ่มกำลังพลก่อนครับ");
    return;
  }

  // กรองเฉพาะผู้ที่ไม่ได้รับการยกเว้นเวร (โรงเลี้ยง, บ้านผบ.พัน จะไม่ถูกนำมาจัดเข้าเวร)
  const activeDutySoldiers = filtered.filter(p => !EXEMPT_ROLES.includes(p.role));

  if (activeDutySoldiers.length === 0) {
    alert("กำลังพลในหมวดที่เลือกได้รับการยกเว้นเวรทั้งหมด ไม่สามารถจัดตารางได้ครับ");
    return;
  }

  const guardSoldiers = activeDutySoldiers.filter(p => (p.dutyType || "เวรกองรักษาการ") === "เวรกองรักษาการ");
  const asstSoldiers = activeDutySoldiers.filter(p => (p.dutyType || "เวรกองรักษาการ") === "ผช.สิบเวร");

  const devGuards = guardSoldiers.filter(p => p.role === "พัฒนากองร้อย").map(p => p.name);
  const nonDevGuards = guardSoldiers.filter(p => p.role !== "พัฒนากองร้อย").map(p => p.name);

  appState.mainGuards = (devGuards.length > 0) ? [...devGuards] : guardSoldiers.map(p => p.name);
  appState.saturdayGuards = [...nonDevGuards];

  if (asstSoldiers.length > 0) {
    appState.assistantGuards = asstSoldiers.map(p => p.name);
  } else {
    // If no assistant duty specified, pick 6 soldiers from active duty soldiers
    appState.assistantGuards = activeDutySoldiers.slice(0, 6).map(p => p.name);
  }

  randomizeSchedule();
  goToScheduleView();
}

function goToScheduleView() {
  appState.viewMode = "schedule";
  elViewReview.classList.remove("active");
  elViewSchedule.classList.add("active");
  elScheduleViewActions.style.display = "flex";
  renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goToReviewView() {
  appState.viewMode = "review";
  elViewSchedule.classList.remove("active");
  elViewReview.classList.add("active");
  elScheduleViewActions.style.display = "none";
  renderReviewPersonnelTable();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Render Table - Standard Unified Military Table (ครบถ้วนตรงตามแบบภาพ 100%)
function renderTable() {
  const days = getDaysList();
  updatePaperTitle();

  let html = `<table class="military-table" id="rosterTable">`;
  
  // Row 1: Day of week header (ชื่อ-สกุล + วันย่อสีฟ้า)
  html += `<thead>`;
  html += `<tr>`;
  html += `<th class="th-name" rowspan="2">ชื่อ - สกุล</th>`;
  days.forEach(d => {
    const satClass = d.isSaturday ? 'style="background-color: var(--tbl-saturday);"' : '';
    const sunClass = d.isSunday ? 'style="background-color: var(--tbl-sunday);"' : '';
    html += `<th class="th-day" ${satClass || sunClass}>${d.dayNameTh}</th>`;
  });
  html += `</tr>`;

  // Row 2: Day numbers (แถววันที่สีเหลือง)
  html += `<tr>`;
  days.forEach(d => {
    html += `<th class="th-date">${d.dateNumber}</th>`;
  });
  html += `</tr>`;
  html += `</thead>`;

  html += `<tbody>`;

  // 1. Main Guards Rows (พัฒนากองร้อย - กลุ่มด้านบน)
  appState.mainGuards.forEach(name => {
    html += `<tr>`;
    html += `<td class="td-name">${escapeHtml(name)}</td>`;
    days.forEach((d, dayIdx) => {
      const val = (appState.schedule[name] && appState.schedule[name][dayIdx] !== null) ? appState.schedule[name][dayIdx] : '';
      const satHighlight = d.isSaturday ? 'duty-sat-highlight' : '';
      html += `<td class="duty-cell ${satHighlight}" onclick="openCellPicker('main', '${escapeHtml(name)}', ${dayIdx})">${val !== '' ? val : ''}</td>`;
    });
    html += `</tr>`;
  });

  // Spacer Row
  html += `<tr class="spacer-row"><td colspan="${days.length + 1}"></td></tr>`;

  // 2. Saturday Guards Rows (ไม่ได้อยู่พัฒนากองร้อย - กลุ่มล่างสุด เข้าเฉพาะวันเสาร์)
  appState.saturdayGuards.forEach(name => {
    html += `<tr>`;
    html += `<td class="td-name">${escapeHtml(name)}</td>`;
    days.forEach((d, dayIdx) => {
      const val = (appState.schedule[name] && appState.schedule[name][dayIdx] !== null) ? appState.schedule[name][dayIdx] : '';
      const satHighlight = d.isSaturday ? 'duty-sat-highlight' : '';
      html += `<td class="duty-cell ${satHighlight}" onclick="openCellPicker('sat', '${escapeHtml(name)}', ${dayIdx})">${val !== '' ? val : ''}</td>`;
    });
    html += `</tr>`;
  });

  // Spacer Row
  html += `<tr class="spacer-row"><td colspan="${days.length + 1}"></td></tr>`;

  // 3. Assistant Duty NCO Header Row (แถบแดง ผช.สิบเวรฯ)
  html += `<tr class="row-assistant-header">`;
  html += `<th>ผช.สิบเวรฯ</th>`;
  days.forEach(() => {
    html += `<td></td>`;
  });
  html += `</tr>`;

  // 4. Assistant NCO Names Rows (แถบสีเขียว)
  appState.assistantGuards.forEach(name => {
    html += `<tr>`;
    html += `<td class="td-name">${escapeHtml(name)}</td>`;
    days.forEach((d, dayIdx) => {
      const isAssigned = appState.assistantSchedule[name] && appState.assistantSchedule[name][dayIdx];
      const cellClass = isAssigned ? "assistant-cell-duty" : "assistant-cell-empty";
      html += `<td class="assistant-cell ${cellClass}" onclick="toggleAssistantCell('${escapeHtml(name)}', ${dayIdx})" title="คลิกเพื่อเปิด/ปิดเวร"></td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody>`;
  html += `</table>`;

  elTableContainer.innerHTML = html;
}

// Master Render
function renderAll() {
  renderTable();
}

// ==========================================
// PERSONNEL BACKEND DATABASE MODAL LOGIC
// ==========================================

function openPersonnelModal() {
  renderPersonnelTable();
  updatePersonnelStats();
  elPersonnelModal.classList.add("active");
}

function closePersonnelModal() {
  cancelEditPersonnel();
  elPersonnelModal.classList.remove("active");
  renderReviewPersonnelTable();
  updatePillCounters();
}

function updatePersonnelStats() {
  const total = personnelDatabase.length;
  const p1 = personnelDatabase.filter(p => p.platoon === "หมวด 1").length;
  const p2 = personnelDatabase.filter(p => p.platoon === "หมวด 2").length;
  const p3 = personnelDatabase.filter(p => p.platoon === "หมวด 3").length;

  document.getElementById("dbTotalCount").textContent = `${total} นาย`;
  document.getElementById("dbPlatoon1Count").textContent = `${p1} นาย`;
  document.getElementById("dbPlatoon2Count").textContent = `${p2} นาย`;
  document.getElementById("dbPlatoon3Count").textContent = `${p3} นาย`;
}

function getPlatoonBadgeHtml(platoon) {
  let badgeClass = "badge-platoon-1";
  if (platoon === "หมวด 2") badgeClass = "badge-platoon-2";
  if (platoon === "หมวด 3") badgeClass = "badge-platoon-3";
  return `<span class="badge-platoon ${badgeClass}"><i class="fa-solid fa-users-viewfinder" style="font-size:0.7rem; margin-right:4px;"></i>${escapeHtml(platoon)}</span>`;
}

function getDutyTypeBadgeHtml(dutyType) {
  if (dutyType === "ผช.สิบเวร") {
    return `<span class="badge-platoon badge-duty-asst"><i class="fa-solid fa-medal" style="font-size:0.7rem; margin-right:4px;"></i>ผช.สิบเวร</span>`;
  }
  return `<span class="badge-platoon badge-duty-guard"><i class="fa-solid fa-shield-halved" style="font-size:0.7rem; margin-right:4px;"></i>กองรักษาการ</span>`;
}

function getRegionBadgeHtml(region) {
  if (region === "นครสวรรค์") {
    return `<span class="badge-region badge-region-nakhon"><i class="fa-solid fa-landmark" style="font-size:0.7rem; margin-right:4px;"></i>นครสวรรค์</span>`;
  }
  if (region === "อีสาน") {
    return `<span class="badge-region badge-region-isan"><i class="fa-solid fa-wheat-awn" style="font-size:0.7rem; margin-right:4px;"></i>อีสาน</span>`;
  }
  return `<span style="color:#94a3b8; font-size:0.8rem;">-</span>`;
}

function getStatusBadgeHtml(status) {
  if (status === "ดองเวร") {
    return `<span class="badge-status-dong"><i class="fa-solid fa-triangle-exclamation" style="font-size:0.7rem; margin-right:4px;"></i>ดองเวร</span>`;
  }
  return `<span class="badge-status-normal"><i class="fa-solid fa-circle-check" style="font-size:0.7rem; margin-right:4px; color:#16a34a;"></i>ปกติ</span>`;
}

function renderPersonnelTable() {
  const tbody = document.getElementById("personnelTableBody");
  if (!tbody) return;

  const searchText = (document.getElementById("searchPersonnelText").value || "").trim().toLowerCase();
  const filterPlatoon = document.getElementById("filterPlatoon").value;
  const filterBatch = document.getElementById("filterBatch").value;
  const filterRole = document.getElementById("filterRole").value;
  const filterDutyType = document.getElementById("filterDutyType").value;
  const filterRegion = document.getElementById("filterRegion") ? document.getElementById("filterRegion").value : "";
  const filterStatus = document.getElementById("filterStatus") ? document.getElementById("filterStatus").value : "";

  const filtered = personnelDatabase.filter(p => {
    if (searchText && !p.name.toLowerCase().includes(searchText)) return false;
    if (filterPlatoon && p.platoon !== filterPlatoon) return false;
    if (filterBatch && p.batch !== filterBatch) return false;
    if (filterRole && p.role !== filterRole) return false;
    if (filterDutyType && (p.dutyType || "เวรกองรักษาการ") !== filterDutyType) return false;
    if (filterRegion && (p.region || "") !== filterRegion) return false;
    if (filterStatus && (p.status || "ปกติ") !== filterStatus) return false;
    return true;
  });

  updatePersonnelStats();

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#94a3b8; padding:20px;">ไม่พบข้อมูลกำลังพลตามเงื่อนไขที่ค้นหา</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((p, idx) => `
    <tr>
      <td style="color:#64748b; font-weight:600;">${idx + 1}</td>
      <td style="font-weight:600; color:#0f172a;">${escapeHtml(p.name)}</td>
      <td>${getPlatoonBadgeHtml(p.platoon)}</td>
      <td><span class="badge-batch">${escapeHtml(p.batch)}</span></td>
      <td><span class="badge-role">${escapeHtml(p.role)}</span></td>
      <td>${getDutyTypeBadgeHtml(p.dutyType || "เวรกองรักษาการ")}</td>
      <td>${getRegionBadgeHtml(p.region)}</td>
      <td>${getStatusBadgeHtml(p.status || "ปกติ")}</td>
      <td style="text-align:center;">
        <button class="action-icon-btn edit" onclick="startEditPersonnel('${p.id}')" title="แก้ไข">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="action-icon-btn delete" onclick="deletePersonnel('${p.id}')" title="ลบ">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join("");
}

function resetPersonnelFilters() {
  document.getElementById("searchPersonnelText").value = "";
  document.getElementById("filterPlatoon").value = "";
  document.getElementById("filterBatch").value = "";
  document.getElementById("filterRole").value = "";
  document.getElementById("filterDutyType").value = "";
  if (document.getElementById("filterRegion")) document.getElementById("filterRegion").value = "";
  if (document.getElementById("filterStatus")) document.getElementById("filterStatus").value = "";
  renderPersonnelTable();
}

function handleSavePersonnel(e) {
  e.preventDefault();
  const idInput = document.getElementById("editPersonnelId").value;
  const name = document.getElementById("formName").value.trim();
  const platoon = document.getElementById("formPlatoon").value;
  const batch = document.getElementById("formBatch").value;
  const role = document.getElementById("formRole").value;
  const dutyType = document.getElementById("formDutyType").value;
  const region = document.getElementById("formRegion") ? document.getElementById("formRegion").value : "";
  const status = document.getElementById("formStatus") ? document.getElementById("formStatus").value : "ปกติ";

  if (!name) return;

  if (idInput) {
    const index = personnelDatabase.findIndex(p => p.id === idInput);
    if (index !== -1) {
      personnelDatabase[index] = { id: idInput, name, platoon, batch, role, dutyType, region, status };
    }
  } else {
    const newId = "p_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
    personnelDatabase.unshift({ id: newId, name, platoon, batch, role, dutyType, region, status });
  }

  savePersonnelDatabase();
  cancelEditPersonnel();
  renderPersonnelTable();
  renderReviewPersonnelTable();
}

function startEditPersonnel(id) {
  const p = personnelDatabase.find(x => x.id === id);
  if (!p) return;

  document.getElementById("editPersonnelId").value = p.id;
  document.getElementById("formName").value = p.name;
  document.getElementById("formPlatoon").value = p.platoon;
  document.getElementById("formBatch").value = p.batch;
  document.getElementById("formRole").value = p.role;
  document.getElementById("formDutyType").value = p.dutyType || "เวรกองรักษาการ";
  if (document.getElementById("formRegion")) document.getElementById("formRegion").value = p.region || "";
  if (document.getElementById("formStatus")) document.getElementById("formStatus").value = p.status || "ปกติ";

  document.getElementById("personnelFormTitle").innerHTML = `<i class="fa-solid fa-pen-to-square" style="color:#0284c7;"></i> แก้ไขข้อมูล: <b>${escapeHtml(p.name)}</b>`;
  document.getElementById("btnCancelEdit").style.display = "inline-flex";

  document.getElementById("formName").focus();
}

function cancelEditPersonnel() {
  document.getElementById("editPersonnelId").value = "";
  document.getElementById("formName").value = "";
  if (document.getElementById("formRegion")) document.getElementById("formRegion").value = "";
  if (document.getElementById("formStatus")) document.getElementById("formStatus").value = "ปกติ";
  document.getElementById("personnelFormTitle").innerHTML = `<i class="fa-solid fa-user-plus"></i> บันทึกข้อมูลกำลังพลใหม่`;
  document.getElementById("btnCancelEdit").style.display = "none";
}

function deletePersonnel(id) {
  const p = personnelDatabase.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`คุณต้องการลบ "${p.name}" (${p.platoon}) ออกจากฐานข้อมูลใช่หรือไม่?`)) return;

  personnelDatabase = personnelDatabase.filter(x => x.id !== id);
  savePersonnelDatabase();
  renderPersonnelTable();
  renderReviewPersonnelTable();
}

function resetPersonnelToDefault() {
  if (!confirm("คุณต้องการรีเซ็ตฐานข้อมูลกำลังพลกลับเป็นค่าเริ่มต้นใช่หรือไม่?")) return;
  personnelDatabase = [...DEFAULT_PERSONNEL_DB];
  savePersonnelDatabase();
  renderPersonnelTable();
  renderReviewPersonnelTable();
}

function exportPersonnelExcel() {
  const wsData = [
    ["ลำดับ", "ชื่อ - สกุล", "หมวด", "ผลัด", "หน้าที่ / สายงาน", "ประเภทเวรที่เข้า", "พื้นที่", "สถานะเวร"]
  ];

  personnelDatabase.forEach((p, idx) => {
    wsData.push([idx + 1, p.name, p.platoon, p.batch, p.role, p.dutyType || "เวรกองรักษาการ", p.region || "-", p.status || "ปกติ"]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ฐานข้อมูลกำลังพล");
  XLSX.writeFile(wb, `ฐานข้อมูลกำลังพล_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ==========================================
// CELL EDITING & EXCEL EXPORT
// ==========================================

function openCellPicker(type, name, dayIdx) {
  activeCellTarget = { type, name, dayIdx };
  const day = getDaysList()[dayIdx];
  elModalTitle.textContent = `${name} (วันที่ ${day.dateNumber} ${day.dayNameTh})`;
  elCellModal.classList.add("active");
}

function setCellValue(val) {
  if (!activeCellTarget) return;
  const { name, dayIdx } = activeCellTarget;
  if (appState.schedule[name]) {
    appState.schedule[name][dayIdx] = val;
  }
  closeCellModal();
  renderAll();
  savePublishedSchedule();
}

function toggleAssistantCell(name, dayIdx) {
  if (appState.assistantSchedule[name]) {
    const current = !!appState.assistantSchedule[name][dayIdx];
    appState.assistantSchedule[name][dayIdx] = !current;
    renderAll();
    savePublishedSchedule();
  }
}

function closeCellModal() {
  elCellModal.classList.remove("active");
  activeCellTarget = null;
}

// Export Excel Function
function exportToExcel() {
  const days = getDaysList();
  const monthName = MONTH_NAMES_TH[appState.monthIndex];
  const title = `${appState.title} ระหว่างวันที่ ${appState.startDay} - ${appState.endDay} ${monthName} ${appState.yearBE}`;

  const wsData = [];
  
  wsData.push([title]);
  wsData.push([]);

  const header1 = ["ชื่อ - สกุล", ...days.map(d => d.dayNameTh)];
  wsData.push(header1);

  const header2 = ["", ...days.map(d => d.dateNumber)];
  wsData.push(header2);

  // 1. Main Guards
  appState.mainGuards.forEach(name => {
    const row = [name];
    days.forEach((_, idx) => {
      const val = appState.schedule[name] && appState.schedule[name][idx] !== null ? appState.schedule[name][idx] : "";
      row.push(val);
    });
    wsData.push(row);
  });

  // 2. Saturday Guards
  if (appState.saturdayGuards.length > 0) {
    wsData.push([]);
    appState.saturdayGuards.forEach(name => {
      const row = [name];
      days.forEach((_, idx) => {
        const val = appState.schedule[name] && appState.schedule[name][idx] !== null ? appState.schedule[name][idx] : "";
        row.push(val);
      });
      wsData.push(row);
    });
  }

  // 3. Assistant NCO
  wsData.push([]);
  const asstHeader = ["ผช.สิบเวรฯ", ...days.map(() => "")];
  wsData.push(asstHeader);

  appState.assistantGuards.forEach(name => {
    const row = [name];
    days.forEach((_, idx) => {
      const val = appState.assistantSchedule[name] && appState.assistantSchedule[name][idx] ? "✓" : "";
      row.push(val);
    });
    wsData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ตารางเวร");

  const filename = `${appState.title}_${appState.startDay}-${appState.endDay}_${monthName}_${appState.yearBE}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// Event Listeners
function initEventListeners() {
  elTitleInput.addEventListener("input", e => {
    appState.title = e.target.value;
    updatePaperTitle();
  });

  elStartDay.addEventListener("change", e => {
    let val = parseInt(e.target.value, 10);
    if (val < 1) val = 1;
    if (val > 31) val = 31;
    appState.startDay = val;
  });

  elEndDay.addEventListener("change", e => {
    let val = parseInt(e.target.value, 10);
    if (val < appState.startDay) val = appState.startDay;
    if (val > 31) val = 31;
    appState.endDay = val;
  });

  elMonthSelect.addEventListener("change", e => {
    appState.monthIndex = parseInt(e.target.value, 10);
  });

  elYearInput.addEventListener("change", e => {
    appState.yearBE = parseInt(e.target.value, 10);
  });

  // Close modals on clicking overlay background
  elPersonnelModal.addEventListener("click", e => {
    if (e.target === elPersonnelModal) closePersonnelModal();
  });

  elCellModal.addEventListener("click", e => {
    if (e.target === elCellModal) closeCellModal();
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

// Run on load
window.addEventListener("DOMContentLoaded", initApp);
