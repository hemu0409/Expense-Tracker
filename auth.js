const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginFormDiv = document.getElementById('login-form');
const signupFormDiv = document.getElementById('signup-form');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const authMessage = document.getElementById('auth-message');

auth.onAuthStateChanged((user) => {
  if (user) {
    window.location.href = 'index.html';
  }
});

showSignupLink.addEventListener('click', (e) => {
  e.preventDefault();
  loginFormDiv.style.display = 'none';
  signupFormDiv.style.display = 'block';
  hideMessage();
});

showLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  signupFormDiv.style.display = 'none';
  loginFormDiv.style.display = 'block';
  hideMessage();
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
    showMessage('Login successful! Redirecting...', 'success');
  } catch (error) {
    showMessage(getErrorMessage(error.code), 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  
  const submitBtn = signupForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
  
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    
    await userCredential.user.updateProfile({
      displayName: name
    });
    
    await db.collection('users').doc(userCredential.user.uid).set({
      name: name,
      email: email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showMessage('Account created successfully! Redirecting...', 'success');
  } catch (error) {
    showMessage(getErrorMessage(error.code), 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
  }
});

function showMessage(message, type) {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
  authMessage.style.display = 'block';
}

function hideMessage() {
  authMessage.style.display = 'none';
}

function getErrorMessage(errorCode) {
  const errorMessages = {
    'auth/email-already-in-use': 'This email is already registered. Please login instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
    'auth/cancelled-popup-request': 'Only one popup request is allowed at a time.',
    'auth/network-request-failed': 'Network error. Please check your connection.'
  };
  
  return errorMessages[errorCode] || 'An error occurred. Please try again.';
}
