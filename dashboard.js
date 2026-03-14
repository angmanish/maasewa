import { auth, db, signOut, onAuthStateChanged } from './auth.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updatePassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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
        const currentPage = window.location.pathname.toLowerCase();

        // Security check for roles
        if (currentPage.includes('admin') && role !== 'admin') {
            window.location.href = 'login.html';
            return;
        }
        if (currentPage.includes('panel') && role !== 'panel' && role !== 'admin') {
            window.location.href = 'login.html';
            return;
        }
        if (currentPage.includes('staff') && role !== 'staff' && role !== 'admin') {
            window.location.href = 'login.html';
            return;
        }

        if (currentPage.includes('login')) {
            if (role === 'admin') window.location.href = 'admin.html';
            else if (role === 'panel') window.location.href = 'panel.html';
            else if (role === 'staff') window.location.href = 'staff.html';
            return;
        }

        if (role === 'admin') {
            loadAdminDashboard();
            const adminViewBtn = document.getElementById('adminViewBtn');
            if (adminViewBtn) adminViewBtn.classList.remove('hidden');
        }
        if (role === 'panel' || role === 'admin') loadPanelDashboard();
        if (role === 'staff') loadStaffDashboard(user.uid);

    } else {
        if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('index.html')) {
            window.location.href = 'login.html';
        }
    }
});

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = 'login.html';
        });
    });
}

// Global Staff Cache
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
        staffOptionsCache = '<option value="">Select Staff Member</option>' + snapshot.docs.map(doc => {
            const user = doc.data();
            return `<option value="${doc.id}" data-email="${user.email}">${user.email}</option>`;
        }).join('');
        
        const selects = document.querySelectorAll('.vendor-staff-select');
        selects.forEach(s => s.innerHTML = staffOptionsCache);
    });

    // Users and Visualization Listener
    onSnapshot(collection(db, "users"), (snapshot) => {
        const userTableBody = document.getElementById('userTableBody');
        const passwordSelect = document.getElementById('passwordTargetUid');
        if (userTableBody) {
            userTableBody.innerHTML = '';
            let staff = 0, panel = 0, total = snapshot.size;
            let optionsHtml = '<option value="">Select User from Directory</option>';
            
            snapshot.forEach((userDoc) => {
                const user = userDoc.data();
                if (user.role === 'staff') staff++;
                if (user.role === 'panel') panel++;
                
                optionsHtml += `<option value="${userDoc.id}">${user.email}</option>`;
                
                userTableBody.innerHTML += `
                    <tr class="border-b border-white/5 text-sm hover:bg-white/5 transition-colors group">
                        <td class="py-4 px-2">
                          <div class="flex flex-col">
                            <span class="text-white font-medium">${user.name || user.email.split('@')[0]}</span>
                            <span class="text-[10px] text-gray-500">${user.email}</span>
                          </div>
                        </td>
                        <td class="py-4 px-2">
                          <span class="px-2 py-1 rounded-full bg-[#00d4aa]/10 text-[#00d4aa] text-[9px] font-bold uppercase tracking-wider border border-[#00d4aa]/20">${user.role}</span>
                        </td>
                        <td class="py-4 px-2 text-right">
                            <button class="text-gray-400 hover:text-red-400 transition-colors" onclick="deleteUserRecord('${userDoc.id}')" title="Delete User">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            if (passwordSelect) passwordSelect.innerHTML = optionsHtml;
            
            // Update Stats
            if (document.getElementById('staffCount')) document.getElementById('staffCount').innerText = staff;
            if (document.getElementById('panelCount')) document.getElementById('panelCount').innerText = panel;
            
            const staffPerc = total > 0 ? Math.round((staff / total) * 100) : 0;
            const panelPerc = total > 0 ? Math.round((panel / total) * 100) : 0;
            
            if (document.getElementById('staffProgress')) document.getElementById('staffProgress').style.width = staffPerc + '%';
            if (document.getElementById('staffUtilization')) document.getElementById('staffUtilization').innerText = `${staffPerc}% Capacity Utilization`;
            
            if (document.getElementById('panelProgress')) document.getElementById('panelProgress').style.width = panelPerc + '%';
            if (document.getElementById('panelCoverage')) document.getElementById('panelCoverage').innerText = `${panelPerc}% Node Coverage`;
        }
    });

    // Live Dispatch Performance & Client Stats
    onSnapshot(collection(db, "assignments"), (snapshot) => {
        let total = snapshot.size;
        let completed = 0;
        let nursing = { total: 0, done: 0 };
        let physio = { total: 0, done: 0 };
        let vendor = { total: 0, done: 0 };

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'completed') completed++;

            const details = (data.details || "").toLowerCase();
            const client = (data.clientName || "").toLowerCase();

            if (details.includes('nursing')) {
                nursing.total++;
                if (data.status === 'completed') nursing.done++;
            } else if (details.includes('physio')) {
                physio.total++;
                if (data.status === 'completed') physio.done++;
            } else if (client.includes('vendor')) {
                vendor.total++;
                if (data.status === 'completed') vendor.done++;
            }
        });

        const updateBar = (id, percId, stats) => {
            const perc = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
            if (document.getElementById(id)) document.getElementById(id).style.width = perc + '%';
            if (document.getElementById(percId)) document.getElementById(percId).innerText = perc + '%';
        };

        updateBar('nursingProgress', 'nursingPerc', nursing);
        updateBar('physioProgress', 'physioPerc', physio);
        updateBar('vendorProgress', 'vendorPerc', vendor);

        const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0;
        if (document.getElementById('efficiencyRate')) document.getElementById('efficiencyRate').innerText = efficiency + '%';
        if (document.getElementById('responseRate')) document.getElementById('responseRate').innerText = total > 0 ? 'Active' : '--';
        if (document.getElementById('clientCount')) document.getElementById('clientCount').innerText = total;
        
        const clientPerc = total > 0 ? Math.min(Math.round((completed / total) * 120), 100) : 0;
        if (document.getElementById('clientProgress')) document.getElementById('clientProgress').style.width = clientPerc + '%';
    });

    // User Creation
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('newUserName').value;
            const email = document.getElementById('newUserEmail').value;
            const password = document.getElementById('newUserPassword').value;
            const role = document.getElementById('newUserRole').value;
            const submitBtn = addUserForm.querySelector('button[type="submit"]');

            submitBtn.disabled = true;
            submitBtn.innerText = 'Initializing...';

            try {
                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
                const user = userCredential.user;
                await setDoc(doc(db, "users", user.uid), { name: name, email: email, role: role, createdAt: serverTimestamp() });
                await addDoc(collection(db, "activities"), { message: `Admin created new ${role}: ${name} (${email})`, timestamp: serverTimestamp() });
                alert('Account initialized successfully!');
                addUserForm.reset();
                await secondaryAuth.signOut();
            } catch (error) {
                alert("Error: " + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Initialize Account';
            }
        });
    }

    // Change Password Form
    const changePasswordForm = document.getElementById('changePasswordForm');
    const passwordMsg = document.getElementById('passwordMsg');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const select = document.getElementById('passwordTargetUid');
            const uid = select.value;
            const email = select.options[select.selectedIndex].text;
            
            if (!uid) return alert("Please select a user first.");

            // Show requested notification
            if (passwordMsg) {
                passwordMsg.innerText = "For security, direct password updates are restricted. Please use the Firebase Console or a Password Reset Email flow.";
                passwordMsg.className = "mt-4 text-center text-[10px] text-yellow-400 font-medium leading-relaxed";
                passwordMsg.classList.remove('hidden');
            }

            try {
                await sendPasswordResetEmail(auth, email);
                setTimeout(() => {
                    if (passwordMsg) {
                        passwordMsg.innerText += "\n\nSuccess: A reset link has been sent to " + email;
                        passwordMsg.classList.replace('text-yellow-400', 'text-[#00d4aa]');
                    }
                }, 1000);
            } catch (error) {
                console.error("Reset Email Error:", error);
            }
            
            changePasswordForm.reset();
        });
    }

    // Handle Vendor Dispatch Form
    const vendorForm = document.getElementById('vendorForm');
    const vendorMsg = document.getElementById('vendorMsg');
    if (vendorForm) {
        vendorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const vendorName = document.getElementById('vendorName').value;
            const vendorPhone = document.getElementById('vendorPhone').value;
            const vendorLocation = document.getElementById('vendorLocation').value;
            const vendorPrice = document.getElementById('vendorPrice').value;
            const vendorStartDate = document.getElementById('vendorStartDate').value;
            const vendorEndDate = document.getElementById('vendorEndDate').value;
            const vendorMessage = document.getElementById('vendorMessage').value;
            const selects = document.querySelectorAll('.vendor-staff-select');
            
            const submitBtn = vendorForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Dispatching...';

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
                            price: vendorPrice,
                            startDate: vendorStartDate,
                            endDate: vendorEndDate,
                            details: vendorMessage || "Vendor Assignment",
                            status: 'pending',
                            createdAt: serverTimestamp()
                        }));
                    }
                });

                if (promises.length === 0) throw new Error("Please select at least one staff member");

                await Promise.all(promises);
                await addDoc(collection(db, "activities"), {
                    message: `Admin dispatched ${promises.length} personnel to vendor: ${vendorName}`,
                    timestamp: serverTimestamp()
                });

                if (vendorMsg) {
                    vendorMsg.innerText = "Personnel dispatched successfully!";
                    vendorMsg.className = "mt-4 text-center text-sm text-[#00d4aa]";
                    vendorMsg.classList.remove('hidden');
                    setTimeout(() => vendorMsg.classList.add('hidden'), 5000);
                }
                vendorForm.reset();
                document.getElementById('vendorStaffContainer').innerHTML = `
                    <label class="form-label !text-[10px] uppercase mb-1">Assigned Personnel</label>
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
                submitBtn.innerText = 'Confirm & Dispatch';
            }
        });
    }

    // Activity Log
    onSnapshot(query(collection(db, "activities"), limit(50)), (snapshot) => {
        const activityLog = document.getElementById('activityLog');
        if (activityLog) {
            activityLog.innerHTML = '<div class="absolute left-4 top-0 bottom-0 w-px bg-white/5"></div>';
            
            const docs = snapshot.docs.sort((a, b) => (b.data().timestamp?.seconds || 0) - (a.data().timestamp?.seconds || 0));

            docs.forEach((doc) => {
                const activity = doc.data();
                activityLog.innerHTML += `
                    <div class="relative pl-8 pb-6 last:pb-0 group">
                        <div class="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-[#00d4aa] border-4 border-[#0a1628] z-10 group-hover:scale-150 transition-transform"></div>
                        <div class="flex flex-col gap-1">
                            <span class="text-xs text-gray-500 font-bold uppercase tracking-wider">${activity.timestamp?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || 'Just Now'}</span>
                            <span class="text-sm text-white font-medium group-hover:text-[#00d4aa] transition-colors">${activity.message}</span>
                            <span class="text-[10px] text-gray-600">${activity.timestamp?.toDate().toLocaleDateString() || ''}</span>
                        </div>
                    </div>
                `;
            });
            if (snapshot.empty) activityLog.innerHTML = '<div class="text-gray-500 text-sm pl-8">No recent activity.</div>';
        }
    });
}

// Salary Management Logic
window.initSalaryManagement = async () => {
    const tableBody = document.getElementById('salaryTableBody');
    const payrollMonth = document.getElementById('payrollMonth');
    const searchInput = document.getElementById('salarySearch');
    if (!tableBody) return;

    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (payrollMonth) payrollMonth.innerText = currentMonth;

    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    // Fetch all staff
    const staffSnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "staff")));
    const staffList = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch all attendance
    const attendanceSnapshot = await getDocs(collection(db, "attendance"));
    const allAttendance = attendanceSnapshot.docs.map(doc => doc.data());

    const renderPayrollTable = (filterText = "") => {
        tableBody.innerHTML = '';
        const filteredStaff = staffList.filter(s => s.email.toLowerCase().includes(filterText.toLowerCase()));

        filteredStaff.forEach(staff => {
            let attendance = 0;
            allAttendance.forEach(att => {
                if (att.userId === staff.id && att.date >= firstDay && att.date <= lastDay) {
                    if (att.type === 'Present') attendance += 1;
                    else if (att.type === 'Half-Day') attendance += 0.5;
                }
            });

            const dailyRate = 500;
            tableBody.innerHTML += `
                <tr class="border-b border-white/5 hover:bg-white/5 transition-colors group" id="salary-row-${staff.id}">
                    <td class="px-6 py-4">
                      <div class="flex flex-col">
                        <span class="text-white font-bold">${staff.email.split('@')[0]}</span>
                        <span class="text-[10px] text-gray-500">${staff.email}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-3 py-1 rounded-lg bg-[#00d4aa]/10 text-[#00d4aa] font-bold attendance-display">${attendance}</span>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex flex-col gap-1">
                        <input type="date" class="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] focus:border-[#00d4aa] outline-none" value="${firstDay}" onchange="refreshAttendance('${staff.id}')">
                        <input type="date" class="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] focus:border-[#00d4aa] outline-none" value="${lastDay}" onchange="refreshAttendance('${staff.id}')">
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <input type="number" value="${dailyRate}" class="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 w-24 text-sm focus:border-[#00d4aa] outline-none" oninput="updateSalaryRow('${staff.id}')">
                    </td>
                    <td class="px-6 py-4">
                      <input type="number" value="0" class="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 w-20 text-sm focus:border-[#00d4aa] outline-none" oninput="updateSalaryRow('${staff.id}')">
                    </td>
                    <td class="px-6 py-4">
                      <input type="number" value="0" class="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 w-24 text-sm focus:border-[#00d4aa] outline-none" oninput="updateSalaryRow('${staff.id}')">
                    </td>
                    <td class="px-6 py-4">
                      <span class="text-lg font-bold text-[#00d4aa] total-payable">₹${attendance * dailyRate}</span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button onclick="markStaffPaid('${staff.id}', '${staff.email}')" class="bg-[#00d4aa] text-[#0a1628] px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-white transition-colors">
                            Mark Paid
                        </button>
                    </td>
                </tr>
            `;
        });
        if (filteredStaff.length === 0) tableBody.innerHTML = '<tr><td colspan="8" class="py-12 text-center text-gray-500">No matching staff found.</td></tr>';
    };

    if (searchInput) {
        searchInput.oninput = (e) => renderPayrollTable(e.target.value);
    }

    renderPayrollTable();
};

window.refreshAttendance = async (staffId) => {
    const row = document.getElementById(`salary-row-${staffId}`);
    const dateInputs = row.querySelectorAll('input[type="date"]');
    const start = dateInputs[0].value;
    const end = dateInputs[1].value;
    const display = row.querySelector('.attendance-display');

    if (!start || !end) return;

    display.innerText = "...";
    display.classList.add('animate-pulse');

    try {
        const snapshot = await getDocs(collection(db, "attendance"));
        let count = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.userId === staffId && data.date >= start && data.date <= end) {
                if (data.type === 'Present') count += 1;
                else if (data.type === 'Half-Day') count += 0.5;
            }
        });
        
        display.innerText = count;
        display.classList.remove('animate-pulse');
        updateSalaryRow(staffId);
    } catch (error) {
        console.error("Error:", error);
        display.innerText = "Error";
    }
};

window.updateSalaryRow = (staffId) => {
    const row = document.getElementById(`salary-row-${staffId}`);
    const attendance = parseFloat(row.querySelector('.attendance-display').innerText) || 0;
    const inputs = row.querySelectorAll('input[type="number"]');
    const rate = parseFloat(inputs[0].value) || 0;
    const overtimeAmount = parseFloat(inputs[1].value) || 0;
    const incentive = parseFloat(inputs[2].value) || 0;
    
    const total = (attendance * rate) + overtimeAmount + incentive;
    row.querySelector('.total-payable').innerText = `₹${Math.round(total)}`;
};

window.markStaffPaid = async (staffId, email) => {
    const row = document.getElementById(`salary-row-${staffId}`);
    const attendance = parseFloat(row.querySelector('.attendance-display').innerText) || 0;
    const dateInputs = row.querySelectorAll('input[type="date"]');
    const numInputs = row.querySelectorAll('input[type="number"]');
    
    const startDate = dateInputs[0].value;
    const endDate = dateInputs[1].value;
    const rate = parseFloat(numInputs[0].value) || 0;
    const overtime = parseFloat(numInputs[1].value) || 0;
    const incentive = parseFloat(numInputs[2].value) || 0;
    const total = (attendance * rate) + overtime + incentive;

    if (!startDate || !endDate) return alert("Select start and end dates.");

    if (confirm(`Mark ₹${total} as paid for ${email}?`)) {
        try {
            await addDoc(collection(db, "salaries"), {
                staffId, staffEmail: email, attendance, dailyRate: rate, overtime, incentive,
                totalPayable: total, startDate, endDate,
                month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                paidAt: serverTimestamp()
            });
            await addDoc(collection(db, "activities"), { message: `Admin marked salary paid for ${email}: ₹${total}`, timestamp: serverTimestamp() });
            alert("Salary record updated!");
        } catch (error) {
            alert("Error: " + error.message);
        }
    }
};

// Vendor History Logic
window.initVendorHistory = () => {
    const tableBody = document.getElementById('vendorHistoryTableBody');
    const searchInput = document.getElementById('vendorSearch');
    const statusFilter = document.getElementById('vendorStatusFilter');
    
    let allData = [];

    const renderData = (data) => {
        tableBody.innerHTML = '';
        data.forEach(docData => {
            const data = docData.data();
            tableBody.innerHTML += `
                <tr class="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td class="px-6 py-4 font-bold text-[#00d4aa]">${data.clientName.replace('VENDOR: ', '')}</td>
                    <td class="px-6 py-4 text-xs text-gray-400">
                      <div class="flex items-center gap-2">
                        <i class="fas fa-phone-alt text-[10px] text-[#00d4aa]/50"></i>
                        ${data.clientPhone || 'N/A'}
                      </div>
                    </td>
                    <td class="px-6 py-4 text-xs">
                      <div class="flex flex-col">
                        <span class="text-gray-300 font-medium">${data.staffEmail.split('@')[0]}</span>
                        <span class="text-[10px] text-gray-500">${data.staffEmail}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-xs text-gray-400">
                      <div class="flex items-center gap-2 truncate max-w-[150px]" title="${data.location}">
                        <i class="fas fa-map-marker-alt text-[10px] text-red-400/50"></i>
                        ${data.location}
                      </div>
                    </td>
                    <td class="px-6 py-4 text-xs font-bold text-[#00d4aa]">₹${data.price || '0'}</td>
                    <td class="px-6 py-4 text-[10px] text-gray-400">
                      <div class="flex flex-col gap-1">
                        <span class="flex items-center gap-1"><i class="fas fa-calendar-day text-[9px] opacity-50"></i> ${data.startDate || 'N/A'}</span>
                        <span class="flex items-center gap-1"><i class="fas fa-calendar-check text-[9px] opacity-50"></i> ${data.endDate || 'N/A'}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${data.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}">
                            ${data.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-[10px] text-gray-500 font-medium">
                      ${data.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button onclick="deleteAssignment('${docData.id}')" class="w-8 h-8 rounded-lg bg-red-400/5 text-red-400 hover:bg-red-400 hover:text-white transition-all flex items-center justify-center ml-auto">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        if (data.length === 0) tableBody.innerHTML = '<tr><td colspan="9" class="py-12 text-center text-gray-500 flex flex-col items-center gap-3"><i class="fas fa-folder-open text-3xl opacity-20"></i> No records match your criteria.</td></tr>';
    };

    const filterAndRender = () => {
        const searchTerm = (searchInput.value || "").toLowerCase();
        const selectedStatus = statusFilter.value;

        const filtered = allData.filter(doc => {
            const data = doc.data();
            const vendorName = (data.clientName || "").toLowerCase();
            const staffEmail = (data.staffEmail || "").toLowerCase();
            const status = (data.status || "").toLowerCase();

            const matchesSearch = vendorName.includes(searchTerm) || staffEmail.includes(searchTerm);
            const matchesStatus = selectedStatus === 'all' || status === selectedStatus;

            return matchesSearch && matchesStatus;
        });
        renderData(filtered);
    };

    if (searchInput) searchInput.oninput = filterAndRender;
    if (statusFilter) statusFilter.onchange = filterAndRender;
    
    onSnapshot(query(collection(db, "assignments"), where("clientName", ">=", "VENDOR:"), where("clientName", "<=", "VENDOR:\uf8ff")), (snapshot) => {
        allData = snapshot.docs.sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));
        filterAndRender();
    });
};

window.deleteUserRecord = async (uid) => {
    if (confirm("Permanently delete this user record?")) {
        try {
            await deleteDoc(doc(db, "users", uid));
            await addDoc(collection(db, "activities"), { message: `Admin removed a user record`, timestamp: serverTimestamp() });
        } catch (error) { alert("Error: " + error.message); }
    }
}

window.deleteAssignment = async (id) => {
    if (confirm("Delete this assignment?")) await deleteDoc(doc(db, "assignments", id));
}

// Panel Dashboard Functions
function loadPanelDashboard() {
    const workStaff = document.getElementById('workStaff');
    const attendanceStaff = document.getElementById('attendanceStaff');
    
    // Load staff dropdowns
    getDocs(query(collection(db, "users"), where("role", "==", "staff"))).then(snapshot => {
        const optionsHtml = '<option value="">Select Staff Member</option>' + snapshot.docs.map(doc => {
            const user = doc.data();
            return `<option value="${doc.id}" data-email="${user.email}">${user.email}</option>`;
        }).join('');
        if (workStaff) workStaff.innerHTML = optionsHtml;
        if (attendanceStaff) attendanceStaff.innerHTML = optionsHtml;
        
        // Update Personnel Counter
        if (document.getElementById('activeStaffCount')) {
            document.getElementById('activeStaffCount').innerText = snapshot.size;
        }
    });

    // Live Stats & Assignments
    onSnapshot(query(collection(db, "assignments")), (snapshot) => {
        const tableBody = document.getElementById('assignmentsTableBody');
        let pending = 0;
        let completedToday = 0;
        let clients = new Set();
        
        const today = new Date().toISOString().split('T')[0];

        if (tableBody) tableBody.innerHTML = '';

        const docs = snapshot.docs.sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));

        docs.forEach((doc) => {
            const data = doc.data();
            clients.add(data.clientName);
            
            if (data.status === 'pending') pending++;
            
            // Check if completed today
            if (data.status === 'completed' && data.completedAt) {
                const compDate = data.completedAt.toDate().toISOString().split('T')[0];
                if (compDate === today) completedToday++;
            }

            if (tableBody) {
                tableBody.innerHTML += `
                    <div class="p-4 rounded-xl bg-white/5 border border-white/5 group hover:border-[#00d4aa]/30 transition-all">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h4 class="font-bold text-white text-sm">${data.clientName}</h4>
                                <p class="text-[10px] text-gray-500">${data.staffEmail}</p>
                            </div>
                            <span class="status-badge ${data.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}">
                                ${data.status}
                            </span>
                        </div>
                        <div class="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                            <span class="text-[9px] text-gray-500 italic truncate max-w-[150px]">${data.location}</span>
                            <button onclick="deleteAssignment('${doc.id}')" class="text-red-400 hover:text-red-300 text-xs p-1">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                `;
            }
        });

        // Update Counter UI
        if (document.getElementById('pendingWorkCount')) document.getElementById('pendingWorkCount').innerText = pending;
        if (document.getElementById('completedWorkCount')) document.getElementById('completedWorkCount').innerText = completedToday;
        if (document.getElementById('activeClientsCount')) document.getElementById('activeClientsCount').innerText = clients.size;
        
        if (snapshot.empty && tableBody) {
            tableBody.innerHTML = '<div class="text-gray-500 text-sm text-center py-10">No recent activity.</div>';
        }
    });

    const attendanceForm = document.getElementById('panelAttendanceForm');
    const attendanceMsg = document.getElementById('attendanceMsg');
    if (attendanceForm) {
        const dateInput = document.getElementById('attendanceDate');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        attendanceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('attendanceStaff').value;
            const staffEmail = document.getElementById('attendanceStaff').options[document.getElementById('attendanceStaff').selectedIndex].text;
            const type = document.getElementById('attendanceType').value;
            const selectedDate = document.getElementById('attendanceDate').value;
            const submitBtn = attendanceForm.querySelector('button[type="submit"]');

            if (!userId || !selectedDate) return;
            submitBtn.disabled = true;
            submitBtn.innerText = 'Submitting...';

            try {
                const q = query(collection(db, "attendance"), where("userId", "==", userId), where("date", "==", selectedDate));
                const existing = await getDocs(q);
                if (!existing.empty) {
                    if (attendanceMsg) {
                        attendanceMsg.innerText = "Already marked for this date!";
                        attendanceMsg.className = "mt-4 text-center text-sm text-yellow-400";
                        attendanceMsg.classList.remove('hidden');
                    }
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'Record Attendance';
                    return;
                }
                await addDoc(collection(db, "attendance"), { userId, staffEmail, date: selectedDate, type, timestamp: serverTimestamp() });
                await addDoc(collection(db, "activities"), { message: `Supervisor marked ${type} for ${staffEmail} on ${selectedDate}`, timestamp: serverTimestamp() });
                if (attendanceMsg) {
                    attendanceMsg.innerText = `Attendance marked for ${selectedDate}`;
                    attendanceMsg.className = "mt-4 text-center text-sm text-[#00d4aa]";
                    attendanceMsg.classList.remove('hidden');
                    setTimeout(() => attendanceMsg.classList.add('hidden'), 5000);
                }
                attendanceForm.reset();
                if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
            } catch (error) {
                if (attendanceMsg) {
                    attendanceMsg.innerText = "Error: " + error.message;
                    attendanceMsg.classList.remove('hidden');
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Record Attendance';
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
                submitBtn.innerText = 'Confirm Assignment';
            }
        });
    }
}

// Staff Dashboard Functions
async function loadStaffDashboard(uid) {
    // Fetch and display name
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
        const nameDisplay = document.getElementById('staffNameDisplay');
        if (nameDisplay) nameDisplay.innerText = userDoc.data().name || userDoc.data().email.split('@')[0];
    }

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
        snapshot.forEach((doc) => {
            const att = doc.data();
            attendanceData[att.date] = att.type;
        });

        // Current Month Range Logic
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const firstDayStr = firstDay.toISOString().split('T')[0];
        const lastDayStr = lastDay.toISOString().split('T')[0];

        const rangeDisplay = document.getElementById('statsDateRange');
        if (rangeDisplay) {
            rangeDisplay.innerText = `${firstDay.toLocaleDateString('en-GB')} to ${lastDay.toLocaleDateString('en-GB')}`;
        }

        let presentCount = 0;
        Object.entries(attendanceData).forEach(([date, type]) => {
            // Only count if date is within current month
            if (date >= firstDayStr && date <= lastDayStr) {
                if (type === 'Present') presentCount += 1;
                if (type === 'Half-Day') presentCount += 0.5;
            }
        });

        if (document.getElementById('myAttendanceCount')) {
            document.getElementById('myAttendanceCount').innerText = presentCount % 1 === 0 ? presentCount : presentCount.toFixed(1);
        }
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
                        ${(work.startDate || work.endDate) ? `
                        <div class="flex gap-4 text-[10px] text-gray-400 mb-2">
                            ${work.startDate ? `<span><i class="fas fa-calendar-alt mr-1"></i> Start: ${work.startDate}</span>` : ''}
                            ${work.endDate ? `<span><i class="fas fa-calendar-check mr-1"></i> End: ${work.endDate}</span>` : ''}
                        </div>` : ''}
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
                    completeWorkMsg.innerText = "Work completed!";
                    completeWorkMsg.className = "mt-4 text-center text-sm text-[#00d4aa]";
                    completeWorkMsg.classList.remove('hidden');
                }
                setTimeout(() => {
                    if (completeWorkMsg) completeWorkMsg.classList.add('hidden');
                    window.closeWorkModal();
                    completeWorkForm.reset();
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

    onSnapshot(query(collection(db, "salaries"), where("staffId", "==", uid)), (snapshot) => {
        const salaryList = document.getElementById('salaryHistoryList');
        if (salaryList) {
            salaryList.innerHTML = '';
            const docs = snapshot.docs.sort((a, b) => (b.data().paidAt?.seconds || 0) - (a.data().paidAt?.seconds || 0));
            docs.forEach((doc) => {
                const data = doc.data();
                salaryList.innerHTML += `
                    <div class="p-4 border border-[#00d4aa]/20 rounded-xl bg-[#00d4aa]/5 group hover:bg-[#00d4aa]/10 transition-all mb-4">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <p class="text-[10px] text-gray-500 uppercase font-bold tracking-widest">${data.month}</p>
                                <h3 class="text-xl font-bold text-white">₹${Math.round(data.totalPayable)}</h3>
                                <p class="text-[9px] text-[#00d4aa] mt-1"><i class="fas fa-calendar-alt mr-1"></i> ${data.startDate} to ${data.endDate}</p>
                            </div>
                            <span class="px-2 py-1 rounded bg-green-500/20 text-green-400 text-[10px] font-bold uppercase">Paid</span>
                        </div>
                        <div class="grid grid-cols-3 gap-2 border-t border-white/5 pt-3 mt-3">
                            <div><p class="text-[9px] text-gray-500 uppercase">Days</p><p class="text-xs font-bold text-white">${data.attendance}</p></div>
                            <div><p class="text-[9px] text-gray-500 uppercase">OT</p><p class="text-xs font-bold text-white">₹${data.overtime}</p></div>
                            <div><p class="text-[9px] text-gray-500 uppercase">Bonus</p><p class="text-xs font-bold text-white">₹${data.incentive}</p></div>
                        </div>
                    </div>
                `;
            });
            if (snapshot.empty) salaryList.innerHTML = '<div class="text-gray-500 text-sm py-4 text-center">No payment records found.</div>';
        }
    });
}

window.openAddUserModal = () => document.getElementById('userModal')?.classList.replace('hidden', 'flex');
window.closeAddUserModal = () => document.getElementById('userModal')?.classList.replace('flex', 'hidden');
window.closeVendorHistory = () => document.getElementById('vendorHistoryModal')?.classList.replace('flex', 'hidden');
window.openWorkModal = (id) => {
    document.getElementById('workId').value = id;
    document.getElementById('workModal').classList.replace('hidden', 'flex');
}
window.closeWorkModal = () => document.getElementById('workModal').classList.replace('flex', 'hidden');
