import { auth, db, signOut, onAuthStateChanged } from './auth.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    getDoc, 
    doc, 
    setDoc,
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    limit,
    serverTimestamp, 
    orderBy, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Secondary Firebase app for creating users without logging out admin
const firebaseConfig = {
  apiKey: "AIzaSyDgsjUL44GCVmiXQX0lk0dKT9PE6XeC58U",
  authDomain: "maaseva-9fe10.firebaseapp.com",
  projectId: "maaseva-9fe10",
  storageBucket: "maaseva-9fe10.firebasestorage.app",
  messagingSenderId: "553283966972",
  appId: "1:553283966972:web:887a4244407a82908b0479",
  measurementId: "G-HEWEY3J9QE"
};
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

// Check authentication and role
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        if (window.location.pathname.includes('login.html')) return;
        window.location.href = 'login.html';
        return;
    }

    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const userData = docSnap.data();
        const role = userData.role;
        const currentPage = window.location.pathname.split('/').pop();

        // Security check for roles
        if (currentPage === 'admin.html' && role !== 'admin') window.location.href = 'index.html';
        if (currentPage === 'panel.html' && role !== 'panel' && role !== 'admin') window.location.href = 'index.html';
        if (currentPage === 'staff.html' && role !== 'staff' && role !== 'admin') window.location.href = 'index.html';

        // Load specific dashboard data
        if (role === 'admin') {
            loadAdminDashboard();
            const adminViewBtn = document.getElementById('adminViewBtn');
            if (adminViewBtn) adminViewBtn.classList.remove('hidden');
        }
        if (role === 'panel' || role === 'admin') loadPanelDashboard();
        if (role === 'staff') loadStaffDashboard(user.uid);

    } else {
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
    }
});

// Logout functionality
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = 'login.html';
        });
    });
}

// Vendor Dynamic Rows Logic
let staffOptionsCache = ""; 
window.addMoreStaffRow = () => {
    const container = document.getElementById('vendorStaffContainer');
    const newRow = document.createElement('div');
    newRow.className = 'flex gap-2 mb-2';
    newRow.innerHTML = `
        <select class="vendor-staff-select form-input bg-[#0a1628]" required>
            ${staffOptionsCache}
        </select>
        <button type="button" class="text-red-400 p-2" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(newRow);
};

// Admin Dashboard Functions
function loadAdminDashboard() {
    // Load staff options for vendor dropdown
    getDocs(query(collection(db, "users"), where("role", "==", "staff"))).then(snapshot => {
        staffOptionsCache = '<option value="">Select Staff</option>' + snapshot.docs.map(doc => {
            const user = doc.data();
            return `<option value="${doc.id}" data-email="${user.email}">${user.email}</option>`;
        }).join('');
        
        const firstSelect = document.querySelector('.vendor-staff-select');
        if (firstSelect) firstSelect.innerHTML = staffOptionsCache;
    });

    onSnapshot(collection(db, "users"), (snapshot) => {
        const userTableBody = document.getElementById('userTableBody');
        if (userTableBody) {
            userTableBody.innerHTML = '';
            let staff = 0, panel = 0;
            snapshot.forEach((userDoc) => {
                const user = userDoc.data();
                if (user.role === 'staff') staff++;
                if (user.role === 'panel') panel++;
                
                userTableBody.innerHTML += `
                    <tr class="border-b border-white/5 text-sm">
                        <td class="py-4">${user.email}</td>
                        <td class="py-4"><span class="px-2 py-1 rounded bg-white/10 text-xs">${user.role}</span></td>
                        <td class="py-4">
                            <button class="text-red-400 hover:text-red-300" onclick="deleteUserRecord('${userDoc.id}')">Delete</button>
                        </td>
                    </tr>
                `;
            });
            if (document.getElementById('staffCount')) document.getElementById('staffCount').innerText = staff;
            if (document.getElementById('panelCount')) document.getElementById('panelCount').innerText = panel;
        }
    });

    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('newUserEmail').value;
            const password = document.getElementById('newUserPassword').value;
            const role = document.getElementById('newUserRole').value;
            const submitBtn = addUserForm.querySelector('button[type="submit"]');

            submitBtn.disabled = true;
            submitBtn.innerText = 'Creating...';

            try {
                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
                const user = userCredential.user;
                await setDoc(doc(db, "users", user.uid), { email: email, role: role, createdAt: serverTimestamp() });
                await addDoc(collection(db, "activities"), { message: `Admin created new ${role}: ${email}`, timestamp: serverTimestamp() });
                alert('User created successfully!');
                addUserForm.reset();
                window.closeAddUserModal();
                await secondaryAuth.signOut();
            } catch (error) {
                alert("Error creating user: " + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Create User';
            }
        });
    }

    // Handle Vendor Form
    const vendorForm = document.getElementById('vendorForm');
    const vendorMsg = document.getElementById('vendorMsg');
    if (vendorForm) {
        vendorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const vendorName = document.getElementById('vendorName').value;
            const vendorPhone = document.getElementById('vendorPhone').value;
            const vendorLocation = document.getElementById('vendorLocation').value;
            const vendorMessage = document.getElementById('vendorMessage').value;
            const selects = document.querySelectorAll('.vendor-staff-select');
            
            const submitBtn = vendorForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Assigning...';

            try {
                const promises = [];
                const staffEmails = [];
                selects.forEach(select => {
                    const staffId = select.value;
                    const staffEmail = select.options[select.selectedIndex].getAttribute('data-email');
                    
                    if (staffId && !staffEmails.includes(staffEmail)) {
                        staffEmails.push(staffEmail);
                        promises.push(addDoc(collection(db, "assignments"), {
                            clientName: `VENDOR: ${vendorName}`,
                            clientPhone: vendorPhone,
                            staffId,
                            staffEmail,
                            location: vendorLocation,
                            details: vendorMessage || "Vendor Assignment",
                            status: 'pending',
                            createdAt: serverTimestamp()
                        }));
                    }
                });

                if (promises.length === 0) throw new Error("Please select at least one staff member");

                await Promise.all(promises);
                await addDoc(collection(db, "activities"), {
                    message: `Admin assigned ${promises.length} staff members to vendor: ${vendorName}`,
                    timestamp: serverTimestamp()
                });

                if (vendorMsg) {
                    vendorMsg.innerText = "Vendor work assigned successfully!";
                    vendorMsg.className = "mt-4 text-center text-sm text-[#00d4aa]";
                    vendorMsg.classList.remove('hidden');
                    setTimeout(() => vendorMsg.classList.add('hidden'), 5000);
                }
                vendorForm.reset();
                document.getElementById('vendorStaffContainer').innerHTML = `
                    <label class="form-label">Assign Staff</label>
                    <div class="flex gap-2 mb-2">
                        <select class="vendor-staff-select form-input bg-[#0a1628]" required>
                            ${staffOptionsCache}
                        </select>
                    </div>
                `;

            } catch (error) {
                if (vendorMsg) {
                    vendorMsg.innerText = "Error: " + error.message;
                    vendorMsg.className = "mt-4 text-center text-sm text-red-400";
                    vendorMsg.classList.remove('hidden');
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Assign Vendor Work';
            }
        });
    }

    onSnapshot(query(collection(db, "activities"), limit(50)), (snapshot) => {
        const activityLog = document.getElementById('activityLog');
        if (activityLog) {
            activityLog.innerHTML = '';
            
            // Sort in JS to avoid "Missing Index" error
            const docs = snapshot.docs.sort((a, b) => {
                const timeA = a.data().timestamp?.seconds || 0;
                const timeB = b.data().timestamp?.seconds || 0;
                return timeB - timeA;
            });

            docs.forEach((doc) => {
                const activity = doc.data();
                activityLog.innerHTML += `
                    <div class="flex items-center gap-3 text-sm mb-3">
                        <div class="w-2 h-2 rounded-full bg-[#00d4aa]"></div>
                        <span class="text-white">${activity.message}</span>
                        <span class="text-gray-500 text-xs">${activity.timestamp?.toDate().toLocaleString() || 'just now'}</span>
                    </div>
                `;
            });
            if (snapshot.empty) activityLog.innerHTML = '<div class="text-gray-500 text-sm">No recent activity.</div>';
        }
    }, (error) => {
        console.error("Activity Log Error:", error);
        const activityLog = document.getElementById('activityLog');
        if (activityLog) activityLog.innerHTML = '<div class="text-red-400 text-xs">Error loading activity.</div>';
    });
}

window.deleteUserRecord = async (uid) => {
    if (confirm("Are you sure you want to delete this user record?")) {
        try {
            await deleteDoc(doc(db, "users", uid));
            await addDoc(collection(db, "activities"), { message: `Admin removed a user record`, timestamp: serverTimestamp() });
        } catch (error) {
            alert("Error: " + error.message);
        }
    }
}

// Panel Dashboard Functions
function loadPanelDashboard() {
    const workStaff = document.getElementById('workStaff');
    const attendanceStaff = document.getElementById('attendanceStaff');
    if (workStaff) {
        getDocs(query(collection(db, "users"), where("role", "==", "staff"))).then(snapshot => {
            const optionsHtml = '<option value="">Select Staff</option>' + snapshot.docs.map(doc => {
                const user = doc.data();
                return `<option value="${doc.id}" data-email="${user.email}">${user.email}</option>`;
            }).join('');
            workStaff.innerHTML = optionsHtml;
            if (attendanceStaff) attendanceStaff.innerHTML = optionsHtml;
        });
    }

    const attendanceForm = document.getElementById('panelAttendanceForm');
    const attendanceMsg = document.getElementById('attendanceMsg');
    if (attendanceForm) {
        attendanceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('attendanceStaff').value;
            const staffEmail = document.getElementById('attendanceStaff').options[document.getElementById('attendanceStaff').selectedIndex].text;
            const type = document.getElementById('attendanceType').value;
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const submitBtn = attendanceForm.querySelector('button[type="submit"]');

            if (!userId) return;
            submitBtn.disabled = true;
            submitBtn.innerText = 'Submitting...';

            try {
                const q = query(collection(db, "attendance"), where("userId", "==", userId), where("date", "==", today));
                const existing = await getDocs(q);
                if (!existing.empty) {
                    if (attendanceMsg) {
                        attendanceMsg.innerText = "Attendance already marked for today!";
                        attendanceMsg.className = "mt-4 text-center text-sm text-yellow-400";
                        attendanceMsg.classList.remove('hidden');
                    }
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'Submit Attendance';
                    return;
                }
                await addDoc(collection(db, "attendance"), { userId: userId, staffEmail: staffEmail, date: today, type: type, timestamp: serverTimestamp() });
                await addDoc(collection(db, "activities"), { message: `Supervisor marked ${type} for ${staffEmail}`, timestamp: serverTimestamp() });
                if (attendanceMsg) {
                    attendanceMsg.innerText = `Attendance marked successfully as ${type}`;
                    attendanceMsg.className = "mt-4 text-center text-sm text-[#00d4aa]";
                    attendanceMsg.classList.remove('hidden');
                    setTimeout(() => attendanceMsg.classList.add('hidden'), 5000);
                }
                attendanceForm.reset();
            } catch (error) {
                if (attendanceMsg) {
                    attendanceMsg.innerText = "Error: " + error.message;
                    attendanceMsg.classList.remove('hidden');
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Submit Attendance';
            }
        });
    }

    const assignWorkForm = document.getElementById('assignWorkForm');
    const workMsg = document.getElementById('workMsg');
    if (assignWorkForm) {
        assignWorkForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const clientName = document.getElementById('workClient').value;
            const clientPhone = document.getElementById('workPhone').value;
            const staffId = document.getElementById('workStaff').value;
            const staffEmail = document.getElementById('workStaff').options[document.getElementById('workStaff').selectedIndex].getAttribute('data-email');
            const location = document.getElementById('workLocation').value;
            const details = document.getElementById('workDetails').value;
            const submitBtn = assignWorkForm.querySelector('button[type="submit"]');

            submitBtn.disabled = true;
            submitBtn.innerText = 'Assigning...';

            try {
                await addDoc(collection(db, "assignments"), { clientName, clientPhone, staffId, staffEmail, location, details, status: 'pending', createdAt: serverTimestamp() });
                await addDoc(collection(db, "activities"), { message: `New work assigned to ${staffEmail} for ${clientName}`, timestamp: serverTimestamp() });
                if (workMsg) {
                    workMsg.innerText = "Work assigned successfully!";
                    workMsg.className = "mt-4 text-center text-sm text-[#00d4aa]";
                    workMsg.classList.remove('hidden');
                    setTimeout(() => workMsg.classList.add('hidden'), 5000);
                }
                assignWorkForm.reset();
            } catch (error) {
                if (workMsg) {
                    workMsg.innerText = "Error: " + error.message;
                    workMsg.classList.remove('hidden');
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Assign Work';
            }
        });
    }

    onSnapshot(query(collection(db, "assignments"), orderBy("createdAt", "desc")), (snapshot) => {
        const tableBody = document.getElementById('assignmentsTableBody');
        if (tableBody) {
            tableBody.innerHTML = '';
            snapshot.forEach((doc) => {
                const assignment = doc.data();
                tableBody.innerHTML += `
                    <tr class="border-b border-white/5 text-sm">
                        <td class="py-4">${assignment.clientName}</td>
                        <td class="py-4">${assignment.staffEmail}</td>
                        <td class="py-4"><span class="px-2 py-1 rounded text-xs ${assignment.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}">${assignment.status}</span></td>
                        <td class="py-4"><button class="text-[#00d4aa] hover:underline" onclick="deleteAssignment('${doc.id}')">Delete</button></td>
                    </tr>
                `;
            });
        }
    });
}

window.deleteAssignment = async (id) => {
    if (confirm("Delete this assignment?")) await deleteDoc(doc(db, "assignments", id));
}

// Staff Dashboard Functions
function loadStaffDashboard(uid) {
    let currentViewMonth = new Date().getMonth();
    let currentViewYear = new Date().getFullYear();
    let attendanceData = {};

    const renderCalendar = () => {
        const calendarGrid = document.getElementById('calendarGrid');
        const currentMonthYear = document.getElementById('currentMonthYear');
        if (!calendarGrid) return;
        calendarGrid.innerHTML = '';
        const firstDay = new Date(currentViewYear, currentViewMonth, 1).getDay();
        const daysInMonth = new Date(currentViewYear, currentViewMonth + 1, 0).getDate();
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        if (currentMonthYear) currentMonthYear.innerText = new Date(currentViewYear, currentViewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
        for (let i = 0; i < firstDay; i++) calendarGrid.innerHTML += '<div class="calendar-day empty"></div>';
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentViewYear}-${String(currentViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const status = attendanceData[dateStr];
            const isToday = dateStr === todayStr;
            const isFuture = new Date(currentViewYear, currentViewMonth, day) > today;
            let statusClass = '';
            if (status === 'Present') statusClass = 'status-present';
            else if (status === 'Half-Day') statusClass = 'status-halfday';
            else if (!isFuture && !status) statusClass = 'status-absent';
            calendarGrid.innerHTML += `<div class="calendar-day ${statusClass} ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''}">${day}</div>`;
        }
    };

    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentViewMonth--;
        if (currentViewMonth < 0) { currentViewMonth = 11; currentViewYear--; }
        renderCalendar();
    });

    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentViewMonth++;
        if (currentViewMonth > 11) { currentViewMonth = 0; currentViewYear++; }
        renderCalendar();
    });

    onSnapshot(query(collection(db, "attendance"), where("userId", "==", uid)), (snapshot) => {
        attendanceData = {};
        let presentCount = 0;
        snapshot.forEach((doc) => {
            const att = doc.data();
            attendanceData[att.date] = att.type;
            if (att.type === 'Present') presentCount++;
        });
        if (document.getElementById('myAttendanceCount')) document.getElementById('myAttendanceCount').innerText = presentCount;
        renderCalendar();
    });

    onSnapshot(query(collection(db, "assignments"), where("staffId", "==", uid), where("status", "==", "pending")), (snapshot) => {
        const workList = document.getElementById('assignedWorkList');
        if (workList) {
            workList.innerHTML = '';
            snapshot.forEach((doc) => {
                const work = doc.data();
                workList.innerHTML += `
                    <div class="p-4 border border-white/10 rounded-xl bg-white/5 mb-4">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h3 class="font-bold text-[#00d4aa]">${work.clientName}</h3>
                                ${work.clientPhone ? `<a href="tel:${work.clientPhone}" class="text-xs text-[#00d4aa] hover:underline"><i class="fas fa-phone-alt mr-1"></i> ${work.clientPhone}</a>` : ''}
                            </div>
                            <span class="text-xs text-gray-500">${work.location}</span>
                        </div>
                        <p class="text-sm text-gray-400 mb-4">${work.details}</p>
                        <div class="flex gap-2">
                            ${work.clientPhone ? `<a href="tel:${work.clientPhone}" class="btn-secondary py-2 px-4 rounded-lg font-bold flex-1 text-center flex items-center justify-center"><i class="fas fa-phone-alt mr-2"></i> Call</a>` : ''}
                            <button class="bg-[#00d4aa] text-[#0a1628] py-2 px-4 rounded-lg font-bold flex-[2]" onclick="openWorkModal('${doc.id}')">Complete Work</button>
                        </div>
                    </div>
                `;
            });
            if (snapshot.empty) workList.innerHTML = '<div class="text-gray-500 text-sm">No pending assignments.</div>';
        }
    });

    const completeWorkForm = document.getElementById('completeWorkForm');
    const completeWorkMsg = document.getElementById('completeWorkMsg');
    if (completeWorkForm) {
        completeWorkForm.onsubmit = async (e) => {
            e.preventDefault();
            const workId = document.getElementById('workId').value;
            const note = document.getElementById('completionNote').value;
            const reason = document.getElementById('changeReason').value;
            const submitBtn = completeWorkForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Updating...';
            try {
                await updateDoc(doc(db, "assignments", workId), { status: 'completed', completionNote: note, changeReason: reason, completedAt: serverTimestamp() });
                await addDoc(collection(db, "activities"), { message: `Staff completed work for client`, timestamp: serverTimestamp() });
                if (completeWorkMsg) {
                    completeWorkMsg.innerText = "Work completed successfully!";
                    completeWorkMsg.className = "mt-4 text-center text-sm text-[#00d4aa]";
                    completeWorkMsg.classList.remove('hidden');
                }
                setTimeout(() => {
                    if (completeWorkMsg) completeWorkMsg.classList.add('hidden');
                    window.closeWorkModal();
                    completeWorkForm.reset();
                    // Reset button state for next time
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'Mark Completed';
                }, 1500);
            } catch (error) {
                if (completeWorkMsg) {
                    completeWorkMsg.innerText = "Error: " + error.message;
                    completeWorkMsg.classList.remove('hidden');
                }
                submitBtn.disabled = false;
                submitBtn.innerText = 'Mark Completed';
            }
        };
    }

    onSnapshot(query(collection(db, "assignments"), where("staffId", "==", uid), where("status", "==", "completed"), orderBy("completedAt", "desc")), (snapshot) => {
        const historyList = document.getElementById('workHistoryList');
        const completedWorksCount = document.getElementById('myCompletedWorks');
        if (completedWorksCount) completedWorksCount.innerText = snapshot.size;
        if (historyList) {
            historyList.innerHTML = '';
            snapshot.forEach((doc) => {
                const work = doc.data();
                historyList.innerHTML += `
                    <div class="p-3 border border-white/5 rounded-lg bg-white/5 mb-2 text-xs">
                        <div class="flex justify-between text-[#00d4aa] mb-1">
                            <span>${work.clientName}</span>
                            <span>${work.completedAt?.toDate().toLocaleDateString()}</span>
                        </div>
                        <div class="text-gray-500">${work.completionNote}</div>
                    </div>
                `;
            });
        }
    });
}

window.openAddUserModal = () => document.getElementById('userModal').classList.replace('hidden', 'flex');
window.closeAddUserModal = () => document.getElementById('userModal').classList.replace('flex', 'hidden');

// Vendor History Logic
window.openVendorHistory = () => {
    const modal = document.getElementById('vendorHistoryModal');
    const tableBody = document.getElementById('vendorHistoryTableBody');
    modal.classList.replace('hidden', 'flex');
    
    // Fetch only standard assignments that were created via vendor form (prefixed with VENDOR:)
    onSnapshot(query(collection(db, "assignments"), where("clientName", ">=", "VENDOR:"), where("clientName", "<=", "VENDOR:\uf8ff")), (snapshot) => {
        if (tableBody) {
            tableBody.innerHTML = '';
            
            // Sort in JS
            const docs = snapshot.docs.sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));

            docs.forEach(doc => {
                const data = doc.data();
                tableBody.innerHTML += `
                    <tr class="border-b border-white/5">
                        <td class="py-4 text-[#00d4aa]">${data.clientName.replace('VENDOR: ', '')}</td>
                        <td class="py-4 text-xs">${data.clientPhone || 'N/A'}</td>
                        <td class="py-4 text-xs">${data.staffEmail}</td>
                        <td class="py-4 text-xs text-gray-400">${data.location}</td>
                        <td class="py-4">
                            <span class="px-2 py-1 rounded text-[10px] ${data.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}">
                                ${data.status}
                            </span>
                        </td>
                        <td class="py-4 text-xs text-gray-500">${data.createdAt?.toDate().toLocaleDateString() || 'N/A'}</td>
                    </tr>
                `;
            });
            if (snapshot.empty) tableBody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-gray-500">No vendor history found.</td></tr>';
        }
    });
};
window.closeVendorHistory = () => document.getElementById('vendorHistoryModal').classList.replace('flex', 'hidden');
window.openWorkModal = (id) => {
    document.getElementById('workId').value = id;
    document.getElementById('workModal').classList.replace('hidden', 'flex');
}
window.closeWorkModal = () => document.getElementById('workModal').classList.replace('flex', 'hidden');
