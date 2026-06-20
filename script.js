// --- ১. ইনিশিয়ালাইজেশন এবং ডিফল্ট সেটিংস ---
if (!localStorage.getItem('globalDayStartBoundary')) {
    localStorage.setItem('globalDayStartBoundary', '00:00'); 
}

let currentUser = null;
let currentActivity = 'Sports';
let isRunning = false;
let timerInterval = null;

let calendarCurrentDate = new Date(); 
let selectedReportDateStr = ''; 

const fixedSubjects = [
    "Bangla 1st", "Bangla 2nd", "English 1st", "English 2nd", "Ict", 
    "physics 1st", "physics 2nd", "Chemistry 1st", "Chemistry 2nd", 
    "Higher math 1st", "Higher math 2nd", "Biology 1st", "Biology 2nd"
];
let currentSelectedSubject = fixedSubjects[0]; 

let globalSyllabusData = {}; 
let userTicksData = {}; 
let userDailyLogs = {}; 

window.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    loadNoticeSettingsDisplay();
});

// --- ২. কাস্টম কালার থিম ইঞ্জিন ---
function applySavedTheme() {
    const bg = localStorage.getItem('theme_color_bg') || '#111827';
    const card = localStorage.getItem('theme_color_card') || '#1e293b';
    const btn = localStorage.getItem('theme_color_btn') || '#3b82f6';
    const text = localStorage.getItem('theme_color_text') || '#ffffff';

    document.documentElement.style.setProperty('--theme-bg', bg);
    document.documentElement.style.setProperty('--theme-card-bg', card);
    document.documentElement.style.setProperty('--theme-btn-bg', btn);
    document.documentElement.style.setProperty('--theme-text-color', text);

    if(document.getElementById('color-bg')) {
        document.getElementById('color-bg').value = bg;
        document.getElementById('color-card').value = card;
        document.getElementById('color-btn').value = btn;
        document.getElementById('color-text').value = text;
    }
}

function saveThemeSettings() {
    if (currentUser.role !== 'admin') return;
    localStorage.setItem('theme_color_bg', document.getElementById('color-bg').value);
    localStorage.setItem('theme_color_card', document.getElementById('color-card').value);
    localStorage.setItem('theme_color_btn', document.getElementById('color-btn').value);
    localStorage.setItem('theme_color_text', document.getElementById('color-text').value);
    applySavedTheme();
    alert('ওয়েবসাইটের কালার থিম সফলভাবে আপডেট করা হয়েছে!');
}

function resetThemeSettings() {
    if (currentUser.role !== 'admin') return;
    localStorage.removeItem('theme_color_bg');
    localStorage.removeItem('theme_color_card');
    localStorage.removeItem('theme_color_btn');
    localStorage.removeItem('theme_color_text');
    applySavedTheme();
    alert('ডিফল্ট থিম কালার রিসেট করা হয়েছে!');
}

// --- ৩. কাস্টম নোটিশ বক্স ইঞ্জিন ---
function loadNoticeSettingsDisplay() {
    const text = localStorage.getItem('notice_text') || 'Study mate অ্যাপের নিচের নোটিশ বক্সে আপনাকে স্বাগতম।';
    const color = localStorage.getItem('notice_color') || '#ffffff';
    const size = localStorage.getItem('notice_size') || '16';

    const displayBox = document.getElementById('notice-display-text');
    if (displayBox) {
        displayBox.innerText = text;
        displayBox.style.color = color;
        displayBox.style.fontSize = size + 'px';
    }

    if (document.getElementById('notice-input-text')) {
        document.getElementById('notice-input-text').value = text;
        document.getElementById('notice-color-picker').value = color;
        document.getElementById('notice-size-picker').value = size;
    }
}

function saveNoticeSettings() {
    if (currentUser.role !== 'admin') return;
    localStorage.setItem('notice_text', document.getElementById('notice-input-text').value);
    localStorage.setItem('notice_color', document.getElementById('notice-color-picker').value);
    localStorage.setItem('notice_size', document.getElementById('notice-size-picker').value);
    loadNoticeSettingsDisplay();
    alert('হোম পেজের কাস্টম বক্স নোটিশটি আপডেট করা হয়েছে!');
}

// --- ৪. ডে-স্টার্ট বাউন্ডারি ক্যালকুলেটর ---
function getLogicalDateString() {
    const boundaryTime = localStorage.getItem('globalDayStartBoundary') || '00:00';
    const [boundaryHour, boundaryMinute] = boundaryTime.split(':').map(Number);
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if (currentHour < boundaryHour || (currentHour === boundaryHour && currentMinute < boundaryMinute)) {
        const previousDay = new Date(now);
        previousDay.setDate(now.getDate() - 1);
        return formatDateToKey(previousDay);
    }
    return formatDateToKey(now);
}

function formatDateToKey(dateObj) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// --- ৫. Firebase লাইভ লগইন ও সেশন ---
async function login() {
    const userVal = document.getElementById('login-username').value.trim().toLowerCase();
    const passVal = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');

    if (userVal === '' || passVal === '') {
        errorMsg.innerText = "ইউজারনেম এবং পাসওয়ার্ড দুটিই দিন!";
        return;
    }

    const fakeEmail = `${userVal}@studymate.com`;
    errorMsg.innerText = "লোডিং... অনুগ্রহ করে অপেক্ষা করুন।";

    try {
        // Firebase Auth দিয়ে লাইভ চেক
        const userCredential = await window.fbSignIn(window.firebaseAuth, fakeEmail, passVal);
        const user = userCredential.user;

        // Firestore Database থেকে রোলের ডাটা চেক
        const userDocRef = window.fbFirestore.doc(window.firebaseDb, "users", user.uid);
        const userDoc = await window.fbFirestore.getDoc(userDocRef);
        
        if (userDoc.exists()) {
            currentUser = userDoc.data();
        } else {
            currentUser = { username: userVal, role: 'user', uid: user.uid };
        }

        // ইন্টারফেস আপডেট
        document.getElementById('login-section').classList.remove('active-section');
        document.getElementById('app-section').classList.add('active-section');
        
        document.getElementById('welcome-username').innerText = currentUser.username;
        document.getElementById('user-display').innerText = `ইউজার: ${currentUser.username}`;

        const adminMenu = document.getElementById('admin-menu-item');
        const adminChapterForm = document.getElementById('admin-chapter-form');
        const syllabusSubtitle = document.getElementById('syllabus-subtitle');

        if (currentUser.role === 'admin') {
            adminMenu.style.setProperty('display', 'flex', 'important');
            adminChapterForm.style.display = 'flex';
            syllabusSubtitle.innerText = "অ্যাডমিন মোড: এখান থেকে অধ্যায় ও সাব-ইউনিট তৈরি বা ডিলিট করুন।";
            if(document.getElementById('day-start-time')) {
                document.getElementById('day-start-time').value = localStorage.getItem('globalDayStartBoundary') || '00:00';
            }
        } else {
            adminMenu.style.setProperty('display', 'none', 'important');
            adminChapterForm.style.display = 'none';
            syllabusSubtitle.innerText = "ইউজার মোড: বিষয় সিলেক্ট করে আপনার অধ্যায়ের টপিকগুলোতে টিক চিহ্ন দিন।";
        }

        document.getElementById('file-status-box').style.display = "none";
        document.getElementById('hidden-local-file-picker').value = "";

        loadUserData();
        loadNoticeSettingsDisplay();
        errorMsg.innerText = "";
        showPage('home-page', document.querySelector('.sidebar-item')); 

    } catch (error) {
        console.error(error);
        errorMsg.innerText = "ভুল ইউজারনেম অথবা পাসওয়ার্ড!";
    }
}

function logout() {
    currentUser = null;
    stopTimer();
    document.getElementById('login-section').classList.add('active-section');
    document.getElementById('app-section').classList.remove('active-section');
    document.getElementById('sidebar').classList.add('hide');
    document.body.classList.add('sidebar-hidden');
}

// --- ৬. পেজ রাউটিং ও মেনু অপারেশন ---
function showPage(pageId, element) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active-page'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active-page');

    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active-nav'));
    if (element) element.classList.add('active-nav');

    document.getElementById('sidebar').classList.add('hide');
    document.body.classList.add('sidebar-hidden');

    if (pageId === 'self-tracker-page') updateTrackerCards();
    if (pageId === 'session-report-page') {
        selectedReportDateStr = getLogicalDateString();
        buildCalendar();
        loadReportForDate(selectedReportDateStr);
    }
    if (pageId === 'admin-page' && currentUser.role === 'admin') {
        renderUserTable();
        loadNoticeSettingsDisplay();
    }
}

document.getElementById('menu-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('hide');
    document.body.classList.toggle('sidebar-hidden');
});

// --- ৭. ডেটা হ্যান্ডলিং মডিউল ---
function loadUserData() {
    const savedLogs = localStorage.getItem(`userDailyLogs_${currentUser.username}`);
    userDailyLogs = savedLogs ? JSON.parse(savedLogs) : {};

    const savedGlobalSyllabus = localStorage.getItem('globalSyllabusData');
    globalSyllabusData = savedGlobalSyllabus ? JSON.parse(savedGlobalSyllabus) : {};
    fixedSubjects.forEach(sub => { if (!globalSyllabusData[sub]) globalSyllabusData[sub] = []; });

    const savedUserTicks = localStorage.getItem(`userTicks_${currentUser.username}`);
    userTicksData = savedUserTicks ? JSON.parse(savedUserTicks) : {};

    const dropdown = document.getElementById('sub-dropdown');
    if(dropdown) {
        dropdown.innerHTML = '';
        fixedSubjects.forEach(sub => dropdown.innerHTML += `<option value="${sub}">${sub}</option>`);
    }

    currentSelectedSubject = fixedSubjects[0];
    renderNestedSyllabus();
}

// --- ৮. সেল্ফ ট্র্যাকার টাইমিং ---
function updateTrackerCards() {
    const todayStr = getLogicalDateString();
    if (!userDailyLogs[todayStr]) userDailyLogs[todayStr] = {};
    
    const dayData = userDailyLogs[todayStr];
    const currentSeconds = dayData[currentActivity] || 0;

    document.getElementById('main-timer').innerText = formatTime(currentSeconds);
    document.getElementById('current-activity-name').innerText = currentActivity;

    document.querySelectorAll('.card').forEach(card => {
        const name = card.querySelector('h3').innerText.trim();
        if (name === currentActivity) card.classList.add('active'); else card.classList.remove('active');
        card.querySelector('.time').innerText = formatTime(dayData[name] || 0);
    });
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const todayStr = getLogicalDateString();
        if (!userDailyLogs[todayStr]) userDailyLogs[todayStr] = {};
        if (!userDailyLogs[todayStr][currentActivity]) userDailyLogs[todayStr][currentActivity] = 0;

        userDailyLogs[todayStr][currentActivity]++;
        updateTrackerCards();
        localStorage.setItem(`userDailyLogs_${currentUser.username}`, JSON.stringify(userDailyLogs));
    }, 1000);
    isRunning = true;
    const btn = document.querySelector('.stop-btn'); btn.innerText = "শেষ করুন"; btn.style.background = "#ef4444";
}

function stopTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    const btn = document.querySelector('.stop-btn'); btn.innerText = "শুরু করুন"; btn.style.background = "var(--theme-btn-bg)";
}

function selectActivity(activityName, element) {
    currentActivity = activityName;
    updateTrackerCards();
    if (isRunning) startTimer();
}
document.querySelector('.stop-btn').addEventListener('click', () => isRunning ? stopTimer() : startTimer());

function formatTime(totalSeconds) {
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
}

// --- ৯. সেশন রিপোর্ট ও ক্যালেন্ডার ---
function changeMonth(direction) {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + direction);
    buildCalendar();
}

function buildCalendar() {
    const grid = document.getElementById('calendar-days-grid');
    if(!grid) return;
    grid.innerHTML = '';

    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();

    const monthNames = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
    document.getElementById('calendar-month-year').innerText = `${monthNames[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay(); 
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1; 
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < adjustedFirstDay; i++) {
        grid.innerHTML += `<div class="empty-cell"></div>`;
    }

    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let classes = '';

        if (dateStr === selectedReportDateStr) classes += ' active-date';
        if (userDailyLogs[dateStr] && Object.values(userDailyLogs[dateStr]).some(v => v > 0)) {
            classes += ' has-data';
        }

        grid.innerHTML += `<div class="${classes}" onclick="loadReportForDate('${dateStr}')">${day}</div>`;
    }
}

function loadReportForDate(dateStr) {
    selectedReportDateStr = dateStr;
    const dateDisp = document.getElementById('selected-date-display');
    if(dateDisp) dateDisp.innerText = dateStr;

    const dayData = userDailyLogs[dateStr] || {};
    const activities = ['Self Study', 'Class/Mock Test', 'Mobile scroll', 'Prayer', 'Food', 'Sleep', 'Sports', 'Other'];
    
    let totalSeconds = 0;
    let chartValues = [];
    let chartColors = ['#3b82f6', '#10b981', '#f43f5e', '#eab308', '#a855f7', '#6366f1', '#06b6d4', '#64748b'];

    activities.forEach((act) => {
        const sec = dayData[act] || 0;
        totalSeconds += sec;
        const cleanId = act.replace(/[^a-zA-Z]/g, ""); 
        const targetElement = document.getElementById(`rep-time-${cleanId}`);
        if(targetElement) {
            targetElement.innerText = `${Math.round(sec / 60)}m`;
        }
        chartValues.push(sec);
    });

    const totalHrs = Math.floor(totalSeconds / 3600);
    const totalMins = Math.round((totalSeconds % 3600) / 60);
    const totTimeEl = document.getElementById('report-total-time');
    if(totTimeEl) totTimeEl.innerText = `${totalHrs}h ${totalMins}m`;

    const chartEl = document.getElementById('report-donut-chart');
    const centerText = document.getElementById('donut-center-text');

    if(!chartEl) return;

    if (totalSeconds === 0) {
        chartEl.style.background = `conic-gradient(#334155 0% 100%)`;
        centerText.innerText = "No Data Available";
    } else {
        let currentPercent = 0;
        let gradientStops = [];

        chartValues.forEach((val, i) => {
            if (val > 0) {
                const startDeg = (currentPercent / totalSeconds) * 360;
                currentPercent += val;
                const endDeg = (currentPercent / totalSeconds) * 360;
                gradientStops.push(`${chartColors[i]} ${startDeg}deg ${endDeg}deg`);
            }
        });
        chartEl.style.background = `conic-gradient(${gradientStops.join(', ')})`;
        centerText.innerText = "Activity Breakdown";
    }
}

// --- ১০. সিলেবাস ট্র্যাকার ---
function selectSubject(subName) {
    currentSelectedSubject = subName;
    renderNestedSyllabus();
}

function renderNestedSyllabus() {
    const container = document.getElementById('syllabus-nested-container');
    if(!container) return;
    container.innerHTML = '';
    
    const chapters = globalSyllabusData[currentSelectedSubject] || [];
    const isAdmin = (currentUser && currentUser.role === 'admin');

    if (chapters.length === 0) {
        container.innerHTML = `<p style="color: #94a3b8; text-align: center; padding: 20px;">"${currentSelectedSubject}"-এ কোনো সিলেবাস তৈরি করা নেই!</p>`;
        return;
    }

    chapters.forEach((chap, chapIndex) => {
        let subunitHTML = '';

        if (chap.subunits.length === 0) {
            subunitHTML = `<p style="color: #64748b; font-size: 0.8rem; font-style: italic;">কোনো সাব-ইউনিট নেই।</p>`;
        } else {
            chap.subunits.forEach((unit, unitIndex) => {
                const tickKey = `${currentSelectedSubject}_${chapIndex}_${unitIndex}`;
                const isDone = userTicksData[tickKey] || false;

                const isChecked = isDone ? 'checked' : '';
                const completedClass = isDone ? 'completed' : '';
                const deleteUnitBtn = isAdmin ? `<button class="delete-btn-icon" onclick="deleteSubunit(${chapIndex}, ${unitIndex})"><i class="fa-solid fa-trash-can"></i></button>` : '';

                subunitHTML += `
                    <div class="subunit-item ${completedClass}">
                        <div class="subunit-left">
                            <input type="checkbox" ${isChecked} onchange="toggleSubunitTick('${tickKey}', this.checked)">
                            <span>${unit}</span>
                        </div>
                        ${deleteUnitBtn}
                    </div>`;
            });
        }

        const collapsedClass = chap.collapsed ? 'collapsed' : '';
        const iconClass = chap.collapsed ? 'fa-chevron-down' : 'fa-chevron-up';
        const deleteChapBtn = isAdmin ? `<button class="delete-btn-icon" onclick="deleteMainChapter(${chapIndex})" style="margin-right: 8px;"><i class="fa-solid fa-trash-can" style="color: #ef4444;"></i></button>` : '';
        const addSubunitFormHTML = isAdmin ? `
            <div class="add-subunit-form">
                <input type="text" id="subunit-input-${chapIndex}" placeholder="নতুন টপিক...">
                <button onclick="addSubunit(${chapIndex})">যোগ</button>
            </div>` : '';

        container.innerHTML += `
            <div class="chapter-block ${collapsedClass}" id="chap-block-${chapIndex}">
                <div class="chapter-header">
                    <span class="chapter-title">${chap.title}</span>
                    <div style="display: flex; align-items: center;">
                        ${deleteChapBtn}
                        <button class="delete-btn-icon" onclick="toggleChapter(${chapIndex})" style="color: var(--theme-btn-bg);">
                            <i class="fa-solid ${iconClass}" id="toggle-icon-${chapIndex}"></i>
                        </button>
                    </div>
                </div>
                <div class="subunit-container">${subunitHTML}</div>
                ${addSubunitFormHTML}
            </div>`;
    });
}

function addMainChapter() {
    if (currentUser.role !== 'admin') return;
    const inputField = document.getElementById('new-chapter-input');
    const title = inputField.value.trim();
    if (title === '') return alert('অধ্যায়ের নাম লিখুন!');

    globalSyllabusData[currentSelectedSubject].push({ title: title, collapsed: false, subunits: [] });
    inputField.value = '';
    renderNestedSyllabus();
    localStorage.setItem('globalSyllabusData', JSON.stringify(globalSyllabusData));
}

function deleteMainChapter(chapIndex) {
    if (currentUser.role !== 'admin') return;
    if (confirm(`আপনি কি এই অধ্যায়টি ডিলিট করতে চান?`)) {
        globalSyllabusData[currentSelectedSubject].splice(chapIndex, 1);
        renderNestedSyllabus();
        localStorage.setItem('globalSyllabusData', JSON.stringify(globalSyllabusData));
    }
}

function addSubunit(chapIndex) {
    if (currentUser.role !== 'admin') return;
    const inputField = document.getElementById(`subunit-input-${chapIndex}`);
    const unitName = inputField.value.trim();
    if (unitName === '') return alert('টপিক এর নাম লিখুন!');
    globalSyllabusData[currentSelectedSubject][chapIndex].subunits.push(unitName);
    inputField.value = '';
    renderNestedSyllabus();
    localStorage.setItem('globalSyllabusData', JSON.stringify(globalSyllabusData));
}

function deleteSubunit(chapIndex, unitIndex) {
    if (currentUser.role !== 'admin') return;
    globalSyllabusData[currentSelectedSubject][chapIndex].subunits.splice(unitIndex, 1);
    renderNestedSyllabus();
    localStorage.setItem('globalSyllabusData', JSON.stringify(globalSyllabusData));
}

function toggleChapter(chapIndex) {
    const isCollapsed = !globalSyllabusData[currentSelectedSubject][chapIndex].collapsed;
    globalSyllabusData[currentSelectedSubject][chapIndex].collapsed = isCollapsed;
    const block = document.getElementById(`chap-block-${chapIndex}`);
    const icon = document.getElementById(`toggle-icon-${chapIndex}`);
    if (isCollapsed) { block.classList.add('collapsed'); icon.className = 'fa-solid fa-chevron-down'; } 
    else { block.classList.remove('collapsed'); icon.className = 'fa-solid fa-chevron-up'; }
    localStorage.setItem('globalSyllabusData', JSON.stringify(globalSyllabusData));
}

function toggleSubunitTick(tickKey, isChecked) {
    userTicksData[tickKey] = isChecked;
    localStorage.setItem(`userTicks_${currentUser.username}`, JSON.stringify(userTicksData));
    renderNestedSyllabus(); 
}

// --- ১১. ড্রাইভ এবং লোকাল ফাইল ম্যানেজার ওপেনার ---
function openGoogleDrive() {
    window.open("https://drive.google.com/", "_blank");
}
function triggerLocalFilePicker() {
    document.getElementById('hidden-local-file-picker').click();
}
function handleLocalFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const statusBox = document.getElementById('file-status-box');
    statusBox.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#10b981;"></i> সফলভাবে ওপেন করা হয়েছে: <strong>${file.name}</strong> (${(file.size/(1024*1024)).toFixed(2)} MB)`;
    statusBox.style.display = "block";
}

// --- ১২. Firebase লাইভ ইউজার তৈরি ও তালিকা ---
function saveDayStartSetting() {
    const timeVal = document.getElementById('day-start-time').value;
    if (!timeVal) return alert("দয়া করে একটি সঠিক সময় সিলেক্ট করুন!");
    localStorage.setItem('globalDayStartBoundary', timeVal);
    alert(`দিন পরিবর্তনের বাউন্ডারি সময় সফলভাবে ${timeVal}-এ আপডেট করা হয়েছে!`);
}

async function renderUserTable() {
    const tbody = document.getElementById('user-table-body'); 
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3">লোড হচ্ছে...</td></tr>';
    
    try {
        const querySnapshot = await window.fbFirestore.getDocs(window.firebaseDoc.collection(window.firebaseDb, "users"));
        tbody.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const u = doc.data();
            tbody.innerHTML += `<tr><td>${u.username}</td><td>${u.role === 'admin' ? 'Admin' : 'User'}</td><td>-</td></tr>`;
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="3">তালিকা লোড করা যায়নি।</td></tr>';
    }
}

async function addUser() {
    const uName = document.getElementById('new-username').value.trim().toLowerCase(); 
    const uPass = document.getElementById('new-password').value.trim();
    if (uName === '' || uPass === '') return alert('সবগুলো ঘর পূরণ করুন!');
    if (uPass.length < 6) return alert('পাসওয়ার্ড অন্তত ৬ সংখ্যার হতে হবে!');
    
    const fakeEmail = `${uName}@studymate.com`;
    alert('ইউজার তৈরি হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...');

    try {
        const userCredential = await window.fbCreateUser(window.firebaseAuth, fakeEmail, uPass);
        const newUser = userCredential.user;

        await window.fbFirestore.setDoc(window.fbFirestore.doc(window.firebaseDb, "users", newUser.uid), {
            username: uName,
            role: 'user',
            uid: newUser.uid
        });

        alert(`সফলভাবে "${uName}" ইউজার তৈরি হয়েছে!`);
        document.getElementById('new-username').value = ''; 
        document.getElementById('new-password').value = '';
        renderUserTable();
    } catch (error) {
        console.error(error);
        alert('ইউজার তৈরি করা যায়নি! ইউজারনেমটি হয়তো আগেই ব্যবহৃত হয়েছে।');
    }
}