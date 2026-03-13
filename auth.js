// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDgsjUL44GCVmiXQX0lk0dKT9PE6XeC58U",
  authDomain: "maaseva-9fe10.firebaseapp.com",
  projectId: "maaseva-9fe10",
  storageBucket: "maaseva-9fe10.firebasestorage.app",
  messagingSenderId: "553283966972",
  appId: "1:553283966972:web:887a4244407a82908b0479",
  measurementId: "G-HEWEY3J9QE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const loginBtn = document.getElementById('loginBtn');

// Function to redirect based on role
async function redirectByRole(user) {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const userData = docSnap.data();
        const role = userData.role;

        if (loginMessage) {
            loginMessage.innerHTML = `Login successful! Redirecting to ${role} panel...`;
            loginMessage.style.color = "#00d4aa";
        }

        setTimeout(() => {
            if (role === 'admin') window.location.href = 'admin.html';
            else if (role === 'panel') window.location.href = 'panel.html';
            else if (role === 'staff') window.location.href = 'staff.html';
            else window.location.href = 'login.html';
        }, 1500);
    } else {
        if (loginMessage) {
            loginMessage.innerHTML = "Error: User role not found in database.";
            loginMessage.style.color = "#ef4444";
        }
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> Login';
    }
}

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Logging in...';
        
        if (loginMessage) {
            loginMessage.classList.add('hidden');
        }

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                redirectByRole(userCredential.user);
            })
            .catch((error) => {
                if (loginMessage) {
                    loginMessage.innerHTML = "Error: " + error.message;
                    loginMessage.style.color = "#ef4444";
                    loginMessage.classList.remove('hidden');
                }
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> Login';
            });
    });
}

// Export auth and db for use in other dashboard files
export { auth, db, signOut, onAuthStateChanged };
