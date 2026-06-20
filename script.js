// --- 1. Initialization and System Default Configs ---
if (!localStorage.getItem('globalDayStartBoundary')) {
    localStorage.setItem('globalDayStartBoundary', '00:00'); 
}

let currentUser = null;
let currentActivity = 'Sports';
let isRunning = false;
let timerInterval = null;
let dashboardInterval = null; 

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

// --- 2. Custom UI Theme Management CSS Variables Hook ---
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
    alert('System interface themes updated successfully!');
}

function resetThemeSettings() {
    if (currentUser.role !== 'admin') return;
    localStorage.removeItem('theme_color_bg');
    localStorage.removeItem('theme_color_card');
    localStorage.removeItem('theme_color_btn');
    localStorage.removeItem('theme_color_text');
    applySavedTheme();
    alert('Default systemic colors successfully re-established.');
}

// --- 3. Live Global Notice Components ---
async function loadNoticeSettingsDisplay() {
    let text = 'Welcome to the dashboard notice sector.';
    let color = '#ffffff';
    let size = '16';

    try {
        if (window.fbFirestore && window.firebaseDb) {
            const noticeDocRef = window.fbFirestore.doc(window.firebaseDb, "settings", "global_notice");
            const noticeSnap = await window.fbFirestore.getDoc(noticeDocRef);
            if (noticeSnap.exists()) {
                const data = noticeSnap.data();
                text = data.text || text;
                color = data.color || color;
                size = data.size || size;
            }
        }
    } catch (e) {
        text = localStorage.getItem('notice_text') || text;
        color = localStorage.getItem('notice_color') || color;
        size = localStorage.getItem('notice_size') || size;
    }

    const displayBox = document.getElementById('notice-display-text');
    if (displayBox) {
        displayBox.innerText = text;
        displayBox.style.color = color;
        displayBox.style.fontSize = size + 'px';
    }
}

async function saveNoticeSettings() {
    if (currentUser.role !== 'admin') return;
    const textVal = document.getElementById('notice-input-text').value;
    const colorVal = document.getElementById('notice-color-picker').value;
    const sizeVal = document.getElementById('notice-size-picker').value;

    try {
        const noticeDocRef = window.fbFirestore.doc(window.firebaseDb, "settings", "global_notice");
        await window.fbFirestore.setDoc(noticeDocRef, { text: textVal, color: colorVal, size: sizeVal, updatedAt: new Date() });
        await loadNoticeSettingsDisplay();
        alert('Live banner announcement synchronized successfully!');
    } catch (error) { alert('Failed synchronization with Firebase Firestore Database!'); }
}

// --- 4. Logic Control for Calendar Day Bound Boundary Handling ---
function getLogicalDateString() {
    const boundaryTime = localStorage.getItem('globalDayStartBoundary') || '00:00';
    const [boundaryHour, boundaryMinute] = boundaryTime.split(':').map(Number);
    const now = new Date();
    if (now.getHours() < boundaryHour || (now.getHours() === boundaryHour && now.getMinutes() < boundaryMinute)) {
        const previousDay = new Date(now); previousDay.setDate(now.getDate() - 1);
        return formatDateToKey(previousDay);
    }
    return formatDateToKey(now);
}
function formatDateToKey(dateObj) {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
}

// --- 5. Firebase User Profile Management Authentication Engine ---
async function login() {
    const userVal = document.getElementById('login-username').value.trim().toLowerCase();
    const passVal = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');

    if (userVal === '' || passVal === '') { errorMsg.innerText = "Please provide both alphanumeric credentials!"; return; }
    const fakeEmail = `${userVal}@studymate.com`;
    errorMsg.innerText = "Validating user session status...";

    try {
        const userCredential = await window.fbSignIn(window.firebaseAuth, fakeEmail, passVal);
        const user = userCredential.user;
        const userDocRef = window.fbFirestore.doc(window.firebaseDb, "users", user.uid);
        const userDoc = await window.fbFirestore.getDoc(userDocRef);
        
        currentUser = userDoc.exists() ? userDoc.data() : { username: userVal, role: 'user', uid: user.uid };
        if (userVal === 'admin') currentUser.role = 'admin';

        document.getElementById('login-section').classList.remove('active-section');
        document.getElementById('app-section').classList.add('active-section');
        document.getElementById('welcome-username').innerText = currentUser.username.toUpperCase();
        document.getElementById('user-display').innerText = `User: ${currentUser.username}`;

        document.getElementById('admin-menu-item').style.display = currentUser.role === 'admin' ? 'block' : 'none';
        document.getElementById('admin-chapter-form').style.display = currentUser.role === 'admin' ? 'flex' : 'none';

        loadUserData();
        syncUserLiveStatus();
        updateHomeGroupDisplay();
        showPage('home-page', document.querySelector('.sidebar-item'));
    } catch (error) { errorMsg.innerText = "Invalid authentication username credentials pair!"; }
}

function logout() {
    if (currentUser) updateUserLiveStatusOffline();
    currentUser = null; stopTimer();
    if (dashboardInterval) clearInterval(dashboardInterval);
    document.getElementById('login-section').classList.add('active-section');
    document.getElementById('app-section').classList.remove('active-section');
    document.getElementById('sidebar').classList.add('hide');
}

async function updateHomeGroupDisplay() {
    if(!currentUser) return;
    try {
        const groupsSnapshot = await window.fbFirestore.getDocs(window.fbFirestore.collection(window.firebaseDb, "study_groups"));
        let myGroup = "No Group";
        groupsSnapshot.forEach(gSnap => {
            const gData = gSnap.data();
            if(gData.members && gData.members.includes(currentUser.username)) {
                myGroup = gData.name;
            }
        });
        const el = document.getElementById('user-group-display');
        if(el) el.innerText = myGroup;
    } catch(e) { console.error(e); }
}

// --- 6. Navigation Control System Layout Logic Switching ---
function showPage(pageId, element) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active-page'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active-page');

    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active-nav'));
    if (element) element.classList.add('active-nav');
    document.getElementById('sidebar').classList.add('hide');

    if (dashboardInterval) clearInterval(dashboardInterval);

    if (pageId === 'self-tracker-page') updateTrackerCards();
    if (pageId === 'session-report-page') { buildCalendar(); loadReportForDate(getLogicalDateString()); }
    if (pageId === 'public-dashboard-page') { renderPublicDashboard(); dashboardInterval = setInterval(renderPublicDashboard, 3000); }
    if (pageId === 'study-leaderboard-page') { renderStudyLeaderboard(); dashboardInterval = setInterval(renderStudyLeaderboard, 3000); }
    if (pageId === 'group-leaderboard-page') { renderGroupLeaderboard(); dashboardInterval = setInterval(renderGroupLeaderboard, 3000); }
    if (pageId === 'admin-page' && currentUser.role === 'admin') { renderUserTable(); renderAdminGroups(); }
}
document.getElementById('menu-btn').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('hide'));

// --- 7. Localized Systems Storage Data Retrieval Handlers ---
function loadUserData() {
    userDailyLogs = JSON.parse(localStorage.getItem(`userDailyLogs_${currentUser.username}`)) || {};
    globalSyllabusData = JSON.parse(localStorage.getItem('globalSyllabusData')) || {};
    fixedSubjects.forEach(sub => { if (!globalSyllabusData[sub]) globalSyllabusData[sub] = []; });
    userTicksData = JSON.parse(localStorage.getItem(`userTicks_${currentUser.username}`)) || {};

    const dropdown = document.getElementById('sub-dropdown');
    if(dropdown) {
        dropdown.innerHTML = '';
        fixedSubjects.forEach(sub => dropdown.innerHTML += `<option value="${sub}">${sub}</option>`);
    }
    renderNestedSyllabus();
}

// --- 8. Self Tracker Timing Metric Engine Algorithms ---
function updateTrackerCards() {
    const todayStr = getLogicalDateString();
    if (!userDailyLogs[todayStr]) userDailyLogs[todayStr] = {};
    document.getElementById('main-timer').innerText = formatTime(userDailyLogs[todayStr][currentActivity] || 0);
    document.getElementById('current-activity-name').innerText = currentActivity;

    document.querySelectorAll('.card').forEach(card => {
        const name = card.querySelector('h3').innerText.trim();
        card.classList.toggle('active', name === currentActivity);
        card.querySelector('.time').innerText = formatTime(userDailyLogs[todayStr][name] || 0);
    });
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const todayStr = getLogicalDateString();
        if (!userDailyLogs[todayStr]) userDailyLogs[todayStr] = {};
        userDailyLogs[todayStr][currentActivity] = (userDailyLogs[todayStr][currentActivity] || 0) + 1;
        updateTrackerCards();
        localStorage.setItem(`userDailyLogs_${currentUser.username}`, JSON.stringify(userDailyLogs));
        syncUserLiveStatus();
    }, 1000);
    isRunning = true;
    const btn = document.querySelector('.stop-btn'); btn.innerText = "Stop Session"; btn.style.background = "#ef4444";
}

function stopTimer() {
    clearInterval(timerInterval); isRunning = false;
    const btn = document.querySelector('.stop-btn'); btn.innerText = "Start Session"; btn.style.background = "var(--theme-btn-bg)";
    syncUserLiveStatus();
}

function selectActivity(activityName, element) {
    currentActivity = activityName; updateTrackerCards();
    if (isRunning) startTimer(); else syncUserLiveStatus();
}
document.querySelector('.stop-btn').addEventListener('click', () => isRunning ? stopTimer() : startTimer());

function formatTime(totalSeconds) {
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
}

function formatHoursDecimal(totalSeconds) {
    return (totalSeconds / 3600).toFixed(1) + 'h';
}

// --- 9. Live Database Synchronization Components ---
async function syncUserLiveStatus() {
    if (!currentUser) return;
    const todayStr = getLogicalDateString();
    const dayData = userDailyLogs[todayStr] || {};
    
    const selfStudySec = dayData['Self Study'] || 0;
    const classTestSec = dayData['Class/Mock Test'] || 0;

    try {
        const liveDocRef = window.fbFirestore.doc(window.firebaseDb, "live_status", currentUser.uid);
        await window.fbFirestore.setDoc(liveDocRef, {
            username: currentUser.username,
            currentActivity: currentActivity,
            isRunning: isRunning,
            selfStudySeconds: selfStudySec, 
            totalStudyTime: formatTime(selfStudySec + classTestSec),
            lastActive: new Date()
        }, { merge: true });
    } catch (e) { console.error(e); }
}

async function updateUserLiveStatusOffline() {
    if (!currentUser) return;
    try {
        const liveDocRef = window.fbFirestore.doc(window.firebaseDb, "live_status", currentUser.uid);
        await window.fbFirestore.setDoc(liveDocRef, { isRunning: false, currentActivity: 'Offline', lastActive: new Date() }, { merge: true });
    } catch (e) { console.error(e); }
}

// --- 10. Study Leaderboard & Group Ranking Compilation Operations ---
async function fetchAllLiveStatus() {
    const liveColRef = window.fbFirestore.collection(window.firebaseDb, "live_status");
    const snapshot = await window.fbFirestore.getDocs(liveColRef);
    let usersList = [];
    snapshot.forEach(docSnap => usersList.push(docSnap.data()));
    return usersList;
}

async function renderStudyLeaderboard() {
    const container = document.getElementById('study-leaderboard-list-container');
    if (!container) return;
    try {
        let users = await fetchAllLiveStatus();
        const groupsSnapshot = await window.fbFirestore.getDocs(window.fbFirestore.collection(window.firebaseDb, "study_groups"));
        
        let userGroupMap = {};
        groupsSnapshot.forEach(gSnap => {
            const gData = gSnap.data();
            if(gData.members) {
                gData.members.forEach(m => { userGroupMap[m] = gData.name; });
            }
        });

        users.sort((a, b) => (b.selfStudySeconds || 0) - (a.selfStudySeconds || 0));

        container.innerHTML = '';
        users.forEach((user, index) => {
            let rankNum = index + 1;
            let groupName = userGroupMap[user.username] || "No Group";

            container.innerHTML += `
                <div class="custom-row-card">
                    <div class="card-left-section">
                        <div class="rank-badge-item">${rankNum}</div>
                        <div class="meta-profile-details">
                            <span class="profile-main-title">@${user.username}</span>
                            <span class="profile-sub-tag">Hsc 28 • ${groupName}</span>
                        </div>
                    </div>
                    <div class="card-right-metrics study-highlight">
                        ${formatTime(user.selfStudySeconds || 0)}
                    </div>
                </div>
            `;
        });
        if(users.length === 0) container.innerHTML = '<p style="color: #94a3b8; text-align:center;">No users registered active logs.</p>';
    } catch (e) { container.innerHTML = '<p style="color:#ef4444;">Failed to compile Study Leaderboard.</p>'; }
}

async function renderGroupLeaderboard() {
    const container = document.getElementById('group-leaderboard-list-container');
    if (!container) return;
    try {
        let users = await fetchAllLiveStatus();
        const groupsSnapshot = await window.fbFirestore.getDocs(window.fbFirestore.collection(window.firebaseDb, "study_groups"));
        
        let groupsList = [];
        groupsSnapshot.forEach(gSnap => {
            let gData = gSnap.data();
            gData.id = gSnap.id;
            let totalSec = 0;
            let memberDetails = [];
            
            let membersArray = gData.members || [];
            // Handle up to 5 members
            for(let i=0; i<5; i++) {
                if(i < membersArray.length) {
                    let mName = membersArray[i];
                    let matchUser = users.find(u => u.username === mName);
                    let sec = matchUser ? (matchUser.selfStudySeconds || 0) : 0;
                    totalSec += sec;
                    memberDetails.push({ username: mName, selfStudySeconds: sec });
                } else {
                    memberDetails.push({ username: null, selfStudySeconds: 0 });
                }
            }
            gData.totalSeconds = totalSec;
            gData.memberDetails = memberDetails;
            gData.actualCount = membersArray.length;
            groupsList.push(gData);
        });

        groupsList.sort((a, b) => b.totalSeconds - a.totalSeconds);

        container.innerHTML = '';
        groupsList.forEach((group, index) => {
            let rankNum = index + 1;
            let logo = group.logo || "📚";

            let circlesHTML = '<div class="member-dots-row">';
            group.memberDetails.forEach(m => {
                let hours = m.selfStudySeconds / 3600;
                if (m.username === null || hours < 1) {
                    // Less than 1 hour -> No circle/blank gap as requested
                    circlesHTML += `<div class="status-dot dot-empty"></div>`;
                } else if (hours >= 1 && hours < 5) {
                    circlesHTML += `<div class="status-dot dot-red"></div>`;
                } else if (hours >= 5 && hours < 10) {
                    circlesHTML += `<div class="status-dot dot-yellow"></div>`;
                } else if (hours >= 10) {
                    circlesHTML += `<div class="status-dot dot-green"></div>`;
                }
            });
            circlesHTML += '</div>';

            container.innerHTML += `
                <div class="custom-row-card">
                    <div class="card-left-section">
                        <div class="rank-badge-item">${rankNum}</div>
                        <div class="group-logo-avatar">${logo}</div>
                        <div class="meta-profile-details">
                            <span class="profile-main-title">${group.name}</span>
                            <span class="profile-sub-tag">Hsc 28 • Members: ${group.actualCount}</span>
                        </div>
                    </div>
                    <div class="card-right-flex-container">
                        ${circlesHTML}
                        <div class="card-right-metrics group-highlight">${formatHoursDecimal(group.totalSeconds)}</div>
                    </div>
                </div>
            `;
        });
        if(groupsList.length === 0) container.innerHTML = '<p style="color: #94a3b8; text-align:center;">No active study groups established.</p>';
    } catch (e) { container.innerHTML = '<p style="color:#ef4444;">Failed compiling groups data structure metrics.</p>'; }
}

// --- 11. Custom Admin Panel Core Functionalities Module ---
async function createStudyGroup() {
    if (currentUser.role !== 'admin') return;
    const gName = document.getElementById('new-group-name').value.trim();
    const gLogo = document.getElementById('new-group-logo').value.trim() || "📚";
    if (gName === '') return alert('Group naming designation field required!');

    try {
        const groupRef = window.fbFirestore.doc(window.fbFirestore.collection(window.firebaseDb, "study_groups"));
        await window.fbFirestore.setDoc(groupRef, { name: gName, logo: gLogo, members: [], createdAt: new Date() });
        document.getElementById('new-group-name').value = '';
        document.getElementById('new-group-logo').value = '';
        renderAdminGroups();
        alert('New dynamic performance collection structural team defined successfully!');
    } catch(e) { alert('Internal database write cancellation triggered!'); }
}

async function renderAdminGroups() {
    const container = document.getElementById('admin-groups-list-container');
    if (!container) return;
    container.innerHTML = 'Parsing database metadata context...';

    try {
        const groupsSnapshot = await window.fbFirestore.getDocs(window.fbFirestore.collection(window.firebaseDb, "study_groups"));
        container.innerHTML = '';

        groupsSnapshot.forEach(gSnap => {
            const gData = gSnap.data();
            const gId = gSnap.id;
            const logo = gData.logo || "📚";

            let memberBadges = '';
            if (gData.members && gData.members.length > 0) {
                gData.members.forEach(mName => {
                    memberBadges += `
                        <span style="background:#334155; padding:3px 8px; border-radius:4px; font-size:0.85rem; display:inline-flex; align-items:center; gap:5px; color:#fff;">
                            @${mName} 
                            <i class="fa-solid fa-circle-xmark" onclick="kickFromGroup('${gId}', '${mName}')" style="color:#ef4444; cursor:pointer;" title="Kick User"></i>
                        </span>`;
                });
            } else { memberBadges = '<span style="color:#64748b; font-size:0.85rem; font-style: italic">Empty Membership Logs</span>'; }

            container.innerHTML += `
                <div style="background: #1e293b; border: 1px solid #334155; padding: 12px; border-radius: 6px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <input type="text" value="${logo}" onchange="updateGroupLogo('${gId}', this.value)" style="width:30px; text-align:center; background:#111827; color:#fff; border:1px solid #334155; border-radius:4px; padding:2px;">
                            <input type="text" value="${gData.name}" onchange="updateGroupName('${gId}', this.value)" style="background:#111827; color:#fff; border:1px solid #334155; border-radius:4px; padding:2px 6px; font-weight:bold;">
                        </div>
                        <button onclick="deleteGroup('${gId}')" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fa-solid fa-trash"></i> Drop Group</button>
                    </div>
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <input type="text" id="add-member-input-${gId}" placeholder="Type username to append..." style="padding:4px; font-size:0.85rem; background:#111827; color:#fff; border:1px solid #334155; border-radius:4px;">
                        <button onclick="addMemberToGroup('${gId}')" style="background:var(--theme-btn-bg); color:white; border:none; padding:4px 10px; border-radius:4px; font-size:0.85rem; cursor:pointer;">Add Member</button>
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">${memberBadges}</div>
                </div>
            `;
        });
    } catch(e) { container.innerHTML = 'Error compiling groups structure details.'; }
}

async function updateGroupName(groupId, newName) {
    if(newName.trim() === '') return;
    try {
        const groupRef = window.fbFirestore.doc(window.firebaseDb, "study_groups", groupId);
        await window.fbFirestore.setDoc(groupRef, { name: newName.trim() }, { merge: true });
    } catch(e) { console.error(e); }
}

async function updateGroupLogo(groupId, newLogo) {
    if(newLogo.trim() === '') return;
    try {
        const groupRef = window.fbFirestore.doc(window.firebaseDb, "study_groups", groupId);
        await window.fbFirestore.setDoc(groupRef, { logo: newLogo.trim() }, { merge: true });
    } catch(e) { console.error(e); }
}

async function addMemberToGroup(groupId) {
    const input = document.getElementById(`add-member-input-${groupId}`);
    const uName = input.value.trim().toLowerCase();
    if (uName === '') return;

    try {
        const groupRef = window.fbFirestore.doc(window.firebaseDb, "study_groups", groupId);
        const gSnap = await window.fbFirestore.getDoc(groupRef);
        let currentMembers = gSnap.data().members || [];
        
        if (currentMembers.length >= 5) return alert('Max limit reached! Each study group can only hold 5 members.');
        if (currentMembers.includes(uName)) return alert('Selected user is already a member of this target cluster!');
        currentMembers.push(uName);

        await window.fbFirestore.setDoc(groupRef, { members: currentMembers }, { merge: true });
        input.value = '';
        renderAdminGroups();
    } catch(e) { alert('Failed database target record modification!'); }
}

async function kickFromGroup(groupId, username) {
    if (!confirm(`Are you absolutely sure you want to kick user @${username} out from this study group?`)) return;
    try {
        const groupRef = window.fbFirestore.doc(window.firebaseDb, "study_groups", groupId);
        const gSnap = await window.fbFirestore.getDoc(groupRef);
        let currentMembers = gSnap.data().members || [];
        
        currentMembers = currentMembers.filter(m => m !== username);
        await window.fbFirestore.setDoc(groupRef, { members: currentMembers }, { merge: true });
        renderAdminGroups();
    } catch(e) { alert('Operational action cancellation exception.'); }
}

async function deleteGroup(groupId) {
    if (!confirm('Are you sure you want to permanently delete this group?')) return;
    try {
        await window.fbFirestore.deleteDoc(window.fbFirestore.doc(window.firebaseDb, "study_groups", groupId));
        renderAdminGroups();
    } catch(e) { alert('Action failed.'); }
}

// --- 12. Legacy Framework Modules Render Layout System Hooks ---
async function renderPublicDashboard() {
    const grid = document.getElementById('public-users-grid'); if (!grid) return;
    try {
        let users = await fetchAllLiveStatus();
        let htmlContent = '';
        users.forEach((data) => {
            let iconHTML = '<i class="fa-solid fa-person-running"></i>';
            let localizedActivity = data.currentActivity;
            if (data.currentActivity === 'Self Study') { iconHTML = '<i class="fa-solid fa-user-graduate"></i>'; localizedActivity = 'পড়াশোনা করছে'; }
            else if (data.currentActivity === 'Class/Mock Test') { iconHTML = '<i class="fa-solid fa-laptop-code"></i>'; localizedActivity = 'ক্লাস/মক টেস্ট দিচ্ছে'; }
            else if (data.currentActivity === 'Mobile scroll') { iconHTML = '<i class="fa-solid fa-mobile-screen-button"></i>'; localizedActivity = 'মোবাইল স্ক্রোল করছে'; }
            else if (data.currentActivity === 'Prayer') { iconHTML = '<i class="fa-solid fa-hands-praying"></i>'; localizedActivity = 'নামাজ পড়ছে'; }
            else if (data.currentActivity === 'Food') { iconHTML = '<i class="fa-solid fa-utensils"></i>'; localizedActivity = 'খাবার খাচ্ছে'; }
            else if (data.currentActivity === 'Sleep') { iconHTML = '<i class="fa-solid fa-bed"></i>'; localizedActivity = 'ঘুমাচ্ছে'; }
            else if (data.currentActivity === 'Offline') { iconHTML = '<i class="fa-solid fa-moon"></i>'; localizedActivity = 'অফলাইন'; }
            
            let statusBorderColor = data.isRunning ? 'border-left: 5px solid #10b981;' : 'border-left: 5px solid #64748b;';
            let pulseDot = data.isRunning ? '<span style="background:#10b981; width:10px; height:10px; border-radius:50%; display:inline-block; margin-right:5px; box-shadow: 0 0 8px #10b981;"></span>' : '<span style="background:#64748b; width:10px; height:10px; border-radius:50%; display:inline-block; margin-right:5px;"></span>';
            let displayActivity = data.isRunning ? localizedActivity : `${localizedActivity} (থেমে আছে)`;

            htmlContent += `
                <div class="card" style="display: flex; flex-direction: column; align-items: flex-start; text-align: left; padding: 15px; ${statusBorderColor} background: var(--theme-card-bg); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 10px; align-items: center;">
                        <h3 style="font-size: 1.2rem; color: var(--theme-text-color); margin: 0;">@${data.username}</h3>
                        <div style="display: flex; align-items: center; font-size: 0.85rem;">${pulseDot} <span style="color: #94a3b8;">${data.isRunning ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</span></div>
                    </div>
                    <p style="font-size: 0.95rem; color: #cbd5e1; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">${iconHTML} <span>${displayActivity}</span></p>
                    <p style="font-size: 0.85rem; color: #94a3b8; margin: 0; width: 100%; border-top: 1px solid #334155; padding-top: 8px; margin-top: 5px;"><i class="fa-solid fa-clock"></i> আজকের মোট স্টাডি: <strong style="color: var(--theme-btn-bg);">${data.totalStudyTime || '00:00:00'}</strong></p>
                </div>`;
        });
        grid.innerHTML = htmlContent || `<p style="color: #94a3b8; text-align: center; width: 100%;">No online users reported structural metrics yet.</p>`;
    } catch (e) { grid.innerHTML = `<p style="color: #ef4444; text-align: center; width: 100%;">Failed to acquire server updates.</p>`; }
}

function selectSubject(subName) { currentSelectedSubject = subName; renderNestedSyllabus(); }
function renderNestedSyllabus() {
    const container = document.getElementById('syllabus-nested-container'); if(!container) return; container.innerHTML = '';
    const chapters = globalSyllabusData[currentSelectedSubject] || []; const isAdmin = (currentUser && currentUser.role === 'admin');
    if (chapters.length === 0) { container.innerHTML = `<p style="color: #94a3b8; text-align: center; padding: 20px;">Syllabus outline parameters for "${currentSelectedSubject}" are currently unconfigured.</p>`; return; }
    chapters.forEach((chap, chapIndex) => {
        let subunitHTML = '';
        if (chap.subunits.length === 0) { subunitHTML = `<p style="color: #64748b; font-size: 0.8rem; font-style: italic;">No nested subtopics configured.</p>`; } 
        else {
            chap.subunits.forEach((unit, unitIndex) => {
                const tickKey = `${currentSelectedSubject}_${chapIndex}_${unitIndex}`; const isDone = userTicksData[tickKey] || false;
                subunitHTML += `<div class="subunit-item ${isDone ? 'completed' : ''}"><div class="subunit-left"><input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleSubunitTick('${tickKey}', this.checked)"><span>${unit}</span></div>${isAdmin ? `<button class="delete-btn-icon" onclick="deleteSubunit(${chapIndex}, ${unitIndex})"><i class="fa-solid fa-trash-can"></i></button>` : ''}</div>`;
            });
        }
        container.innerHTML += `<div class="chapter-block ${chap.collapsed ? 'collapsed' : ''}" id="chap-block-${chapIndex}"><div class="chapter-header"><span class="chapter-title">${chap.title}</span><div style="display: flex; align-items: center;">${isAdmin ? `<button class="delete-btn-icon" onclick="deleteMainChapter(${chapIndex})" style="margin-right: 8px;"><i class="fa-solid fa-trash-can" style="color: #ef4444;"></i></button>` : ''}<button class="delete-btn-icon" onclick="toggleChapter(${chapIndex})" style="color: var(--theme-btn-bg);"><i class="fa-solid ${chap.collapsed ? 'fa-chevron-down' : 'fa-chevron-up'}" id="toggle-icon-${chapIndex}"></i></button></div></div><div class="subunit-container">${subunitHTML}</div>${isAdmin ? `<div class="add-subunit-form"><input type="text" id="subunit-input-${chapIndex}" placeholder="Add objective..."><button onclick="addSubunit(${chapIndex})">Add</button></div>` : ''}</div>`;
    });
}
function addMainChapter() {
    if (currentUser.role !== 'admin') return; const inputField = document.getElementById('new-chapter-input'); const title = inputField.value.trim(); if (title === '') return;
    globalSyllabusData[currentSelectedSubject].push({ title: title, collapsed: false, subunits: [] }); inputField.value = ''; renderNestedSyllabus(); localStorage.setItem('globalSyllabusData', JSON.stringify(globalSyllabusData));
}
function deleteMainChapter(chapIndex) {
    if (currentUser.role !== 'admin') return; if (confirm(`Remove this complete chapter partition database?`)) { globalSyllabusData[currentSelectedSubject].splice(chapIndex, 1); renderNestedSyllabus(); localStorage.setItem('globalSyllabusData', JSON.stringify(globalSyllabusData)); }
}
function addSubunit(chapIndex) {
    if (currentUser.role !== 'admin') return; const inputField = document.getElementById(`subunit-input-${chapIndex}`); const unitName = inputField.value.trim(); if (unitName === '') return;
    globalSyllabusData[currentSelectedSubject][chapIndex].subunits.push(unitName); inputField.value = ''; renderNestedSyllabus(); localStorage.setItem('globalSyllabusData', JSON.stringify(globalSyllabusData));
}
function deleteSubunit(chapIndex, unitIndex) {
    if (currentUser.role !== 'admin') return; globalSyllabusData[currentSelectedSubject][chapIndex].subunits.splice(unitIndex, 1); renderNestedSyllabus(); localStorage.setItem('globalSyllabusData', JSON.stringify(globalSyllabusData));
}
function toggleChapter(chapIndex) {
    const isCollapsed = !globalSyllabusData[currentSelectedSubject][chapIndex].collapsed; globalSyllabusData[currentSelectedSubject][chapIndex].collapsed = isCollapsed;
    document.getElementById(`chap-block-${chapIndex}`).classList.toggle('collapsed', isCollapsed); document.getElementById(`toggle-icon-${chapIndex}`).className = isCollapsed ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
    localStorage.setItem('globalSyllabusData', JSON.stringify(globalSyllabusData));
}
function toggleSubunitTick(tickKey, isChecked) { userTicksData[tickKey] = isChecked; localStorage.setItem(`userTicks_${currentUser.username}`, JSON.stringify(userTicksData)); renderNestedSyllabus(); }
function openGoogleDrive() { window.open("https://drive.google.com/", "_blank"); }
function triggerLocalFilePicker() { document.getElementById('hidden-local-file-picker').click(); }
function handleLocalFileSelect(event) { const file = event.target.files[0]; if (!file) return; document.getElementById('file-status-box').innerHTML = `<i class="fa-solid fa-circle-check" style="color:#10b981;"></i> Loaded Source Reference: <strong>${file.name}</strong>`; document.getElementById('file-status-box').style.display = "block"; }
function saveDayStartSetting() { const timeVal = document.getElementById('day-start-time').value; if (!timeVal) return alert("Please type a valid hour string config value!"); localStorage.setItem('globalDayStartBoundary', timeVal); alert(`Day transition cutoff boundary modified.`); }

async function renderUserTable() {
    const tbody = document.getElementById('user-table-body'); if(!tbody) return; tbody.innerHTML = '';
    try {
        const querySnapshot = await window.fbFirestore.getDocs(window.fbFirestore.collection(window.firebaseDb, "users"));
        querySnapshot.forEach((docSnap) => { const u = docSnap.data(); tbody.innerHTML += `<tr><td>${u.username} ${u.role === 'admin' ? '(Admin)' : ''}</td><td>${u.password || '******'}</td><td>${u.role !== 'admin' ? `<button class="kick-btn" onclick="deleteLiveUser('${docSnap.id}')" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Revoke</button>` : '-'}</td></tr>`; });
    } catch (e) { tbody.innerHTML = '<tr><td colspan="3">Failed gathering data configuration metrics.</td></tr>'; }
}
async function addUser() {
    const uName = document.getElementById('new-username').value.trim().toLowerCase(); const uPass = document.getElementById('new-password').value.trim(); if (uName === '' || uPass === '') return alert('All profile credential input items required!');
    try {
        const userCredential = await window.fbCreateUser(window.firebaseAuth, `${uName}@studymate.com`, uPass);
        await window.fbFirestore.setDoc(window.fbFirestore.doc(window.firebaseDb, "users", userCredential.user.uid), { username: uName, password: uPass, role: 'user', uid: userCredential.user.uid });
        document.getElementById('new-username').value = ''; document.getElementById('new-password').value = ''; renderUserTable(); alert('New member database profile established!');
    } catch (error) { alert('Authorization registration exception failed execution pipeline paths.'); }
}
async function deleteLiveUser(uid) { if (confirm(`Revoke and purge this authentication record?`)) { try { await window.fbFirestore.deleteDoc(window.fbFirestore.doc(window.firebaseDb, "users", uid)); renderUserTable(); } catch (error) { alert("Execution aborted."); } } }

// --- 13. Dynamic System Analytics Reports & Calendars ---
function changeMonth(direction) {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + direction);
    buildCalendar();
}
function buildCalendar() {
    const grid = document.getElementById('calendar-days-grid'); if(!grid) return; grid.innerHTML = '';
    const year = calendarCurrentDate.getFullYear(); const month = calendarCurrentDate.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById('calendar-month-year').innerText = `${monthNames[month]} ${year}`;
    const adjustedFirstDay = new Date(year, month, 1).getDay() === 0 ? 6 : new Date(year, month, 1).getDay() - 1;
    for (let i = 0; i < adjustedFirstDay; i++) { grid.innerHTML += `<div class="empty-cell"></div>`; }
    for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        grid.innerHTML += `<div class="${dateStr === selectedReportDateStr ? 'active-date' : ''} ${userDailyLogs[dateStr] ? 'has-data' : ''}" onclick="loadReportForDate('${dateStr}')">${day}</div>`;
    }
}
function loadReportForDate(dateStr) {
    selectedReportDateStr = dateStr; if(document.getElementById('selected-date-display')) document.getElementById('selected-date-display').innerText = dateStr;
    const dayData = userDailyLogs[dateStr] || {}; const activities = ['Self Study', 'Class/Mock Test', 'Mobile scroll', 'Prayer', 'Food', 'Sleep', 'Sports', 'Other'];
    let totalSeconds = 0; let chartValues = []; let chartColors = ['#3b82f6', '#10b981', '#f43f5e', '#eab308', '#a855f7', '#6366f1', '#06b6d4', '#64748b'];
    activities.forEach((act) => { const sec = dayData[act] || 0; totalSeconds += sec; const cleanId = act.replace(/[^a-zA-Z]/g, ""); if(document.getElementById(`rep-time-${cleanId}`)) document.getElementById(`rep-time-${cleanId}`).innerText = `${Math.round(sec / 60)}m`; chartValues.push(sec); });
    if(document.getElementById('report-total-time')) document.getElementById('report-total-time').innerText = `${Math.floor(totalSeconds / 3600)}h ${Math.round((totalSeconds % 3600) / 60)}m`;
    const chartEl = document.getElementById('report-donut-chart'); if(!chartEl) return;
    if (totalSeconds === 0) { chartEl.style.background = `conic-gradient(#334155 0% 100%)`; document.getElementById('donut-center-text').innerText = "No Data"; } 
    else {
        let currentPercent = 0; let stops = [];
        chartValues.forEach((val, i) => { if (val > 0) { const start = (currentPercent / totalSeconds) * 360; currentPercent += val; const end = (currentPercent / totalSeconds) * 360; stops.push(`${chartColors[i]} ${start}deg ${end}deg`); } });
        chartEl.style.background = `conic-gradient(${stops.join(', ')})`; document.getElementById('donut-center-text').innerText = "Breakdown";
    }
}