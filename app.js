// Google Apps Script Web App URL (จะต้องนำ URL มาใส่ตรงนี้หลังจาก Deploy)
const API_URL = 'https://script.google.com/macros/s/AKfycbw4mlZRH6JqNmLoT3oAlncp3uTUQX2Gkl9oXStl21Tfh_2MiIOIOYwMiPYkrE-5-8fR/exec';

// DOM Elements
const listView = document.getElementById('listView');
const formView = document.getElementById('formView');
const clinicList = document.getElementById('clinicList');
const searchInput = document.getElementById('searchInput');
const loadingState = document.getElementById('loadingState');
const clinicForm = document.getElementById('clinicForm');
const formTitle = document.getElementById('formTitle');
const btnShowAddForm = document.getElementById('btnShowAddForm');
const btnBack = document.getElementById('btnBack');
const btnSubmit = document.getElementById('btnSubmit');
const submitText = document.getElementById('submitText');
const submitLoader = document.getElementById('submitLoader');
const toast = document.getElementById('toast');
const btnGPS = document.getElementById('btnGPS');
const photoInput = document.getElementById('photo');
const photoPreviewContainer = document.getElementById('photoPreviewContainer');
const btnClearPhotos = document.getElementById('btnClearPhotos');

// DOM Elements - Login
const loginView = document.getElementById('loginView');
const appContainer = document.getElementById('appContainer');
const loginUsernameInput = document.getElementById('loginUsername');
const loginPasswordInput = document.getElementById('loginPassword');
const btnLogin = document.getElementById('btnLogin');
const loginError = document.getElementById('loginError');
const userProfileName = document.getElementById('userProfileName');
const btnLogout = document.getElementById('btnLogout');

// Data State
let clinicsData = [];
let photosData = []; // Array to hold new photos
let currentUser = null;

// Initialize
function init() {
  // Check Login State
  const savedUser = localStorage.getItem('clinic_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showApp();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginView.style.display = 'flex';
  appContainer.style.display = 'none';
  loginUsernameInput.value = '';
  loginPasswordInput.value = '';
  loginError.style.display = 'none';
}

function showApp() {
  loginView.style.display = 'none';
  appContainer.style.display = 'block';
  userProfileName.textContent = `👤 ${currentUser.name} (${currentUser.role})`;
  fetchClinics();
}

// Login Event
btnLogin.addEventListener('click', async () => {
  const username = loginUsernameInput.value.trim();
  const password = loginPasswordInput.value.trim();
  
  if (!username || !password) {
    loginError.textContent = 'กรุณากรอก Username และ Password';
    loginError.style.display = 'block';
    return;
  }
  
  btnLogin.disabled = true;
  btnLogin.textContent = 'กำลังตรวจสอบ...';
  loginError.style.display = 'none';
  
  try {
    const payload = {
      action: 'login',
      username: username,
      password: password
    };
    
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    
    if (result.success) {
      currentUser = result.user;
      localStorage.setItem('clinic_user', JSON.stringify(currentUser));
      showApp();
    } else {
      loginError.textContent = result.message || 'รหัสผ่านไม่ถูกต้อง หรือไม่พบผู้ใช้งาน';
      loginError.style.display = 'block';
    }
  } catch (error) {
    loginError.textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
    loginError.style.display = 'block';
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = 'เข้าสู่ระบบ';
  }
});

// Logout Event
btnLogout.addEventListener('click', () => {
  localStorage.removeItem('clinic_user');
  currentUser = null;
  showLogin();
});

// Fetch Data from Google Sheet
async function fetchClinics() {
  if (!API_URL) {
    showToast('กรุณาตั้งค่า API_URL ในไฟล์ app.js ก่อนใช้งาน', 'error');
    loadingState.style.display = 'none';
    clinicList.innerHTML = '<p style="text-align:center; color:var(--text-light); margin-top:2rem;">ยังไม่ได้เชื่อมต่อฐานข้อมูล Google Sheet</p>';
    return;
  }
  try {
    loadingState.style.display = 'flex';
    clinicList.innerHTML = '';
    
    const response = await fetch(API_URL);
    const result = await response.json();
    
    if (result.status === 'success') {
      clinicsData = result.data;
      renderClinics(clinicsData);
    } else {
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
  } finally {
    loadingState.style.display = 'none';
  }
}

// Render Clinic List
function renderClinics(data) {
  clinicList.innerHTML = '';
  
  if (data.length === 0) {
    clinicList.innerHTML = '<p style="text-align:center; color:var(--text-light); margin-top:2rem;">ไม่พบข้อมูลคลินิก</p>';
    return;
  }
  
  data.forEach((clinic, index) => {
    // skip header or empty
    if (!clinic.name) return;
    
    const card = document.createElement('div');
    card.className = 'clinic-card';
    card.onclick = () => openEditForm(clinic, index);
    
    card.innerHTML = `
      <div class="clinic-header">
        <div class="clinic-name">${clinic.name}</div>
        <div class="clinic-code">${clinic.clinicCode || '-'}</div>
      </div>
      <div class="clinic-details">
        <div class="detail-row">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
          <span>${clinic.licensee || 'ไม่ระบุผู้รับอนุญาต'}</span>
        </div>
        <div class="detail-row">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
          <span>${clinic.phone || '-'}</span>
        </div>
        <div class="detail-row">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color:var(--secondary-color)"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          <span style="${clinic.coordinates ? 'color:var(--secondary-color); font-weight:600;' : ''}">${clinic.coordinates ? clinic.coordinates : 'ยังไม่มีพิกัด'}</span>
        </div>
        <div class="detail-row">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color:var(--primary-color)"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          <span style="${clinic.photoUrl ? 'color:var(--primary-color); font-weight:600;' : ''}">${clinic.photoUrl ? `📸 มีรูปภาพ (${String(clinic.photoUrl).split(',').length} รูป)` : 'ยังไม่มีรูปภาพ'}</span>
        </div>
      </div>
    `;
    clinicList.appendChild(card);
  });
}

// Search functionality
searchInput.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filtered = clinicsData.filter(clinic => {
    return (clinic.name && clinic.name.toLowerCase().includes(searchTerm)) ||
           (clinic.clinicCode && clinic.clinicCode.toLowerCase().includes(searchTerm)) ||
           (clinic.licensee && clinic.licensee.toLowerCase().includes(searchTerm));
  });
  renderClinics(filtered);
});

// View Navigation
btnShowAddForm.addEventListener('click', () => {
  clinicForm.reset();
  document.getElementById('formRowIndex').value = '';
  photosData = [];
  photoPreviewContainer.style.display = 'none';
  photoPreviewContainer.innerHTML = '';
  btnClearPhotos.style.display = 'none';
  formTitle.textContent = 'เพิ่มข้อมูลคลินิกใหม่';
  toggleView('form');
});

btnBack.addEventListener('click', () => {
  toggleView('list');
});

function toggleView(view) {
  if (view === 'form') {
    listView.style.display = 'none';
    formView.style.display = 'block';
    window.scrollTo(0, 0);
  } else {
    formView.style.display = 'none';
    listView.style.display = 'block';
  }
}

// Open Edit Form
function openEditForm(clinic, index) {
  document.getElementById('formRowIndex').value = index + 2; // +2 because header is row 1 and array is 0-indexed
  document.getElementById('clinicName').value = clinic.name || '';
  document.getElementById('clinicCode').value = clinic.clinicCode || '';
  document.getElementById('oldClinicCode').value = clinic.oldClinicCode || '';
  document.getElementById('licensee').value = clinic.licensee || '';
  document.getElementById('operator').value = clinic.operator || '';
  document.getElementById('licenseNum').value = clinic.licenseNum || '';
  document.getElementById('licenseeCode').value = clinic.licenseeCode || '';
  document.getElementById('address').value = clinic.address || '';
  document.getElementById('subdistrict').value = clinic.subdistrict || '';
  document.getElementById('district').value = clinic.district || 'ปลวกแดง';
  document.getElementById('operatingHours').value = clinic.operatingHours || '';
  document.getElementById('phone').value = clinic.phone || '';
  document.getElementById('wasteDisposal').value = clinic.wasteDisposal || '';
  document.getElementById('expiryDate').value = clinic.expiryDate || '';
  document.getElementById('currentExpiry').value = clinic.currentExpiry || '';
  document.getElementById('coordinates').value = clinic.coordinates || '';
  document.getElementById('notes').value = clinic.notes || '';
  
  photosData = [];
  photoInput.value = '';
  photoPreviewContainer.innerHTML = '';
  btnClearPhotos.style.display = 'none';
  
  // Show existing photos if any
  if (clinic.photoUrl) {
    photoPreviewContainer.style.display = 'flex';
    const urls = String(clinic.photoUrl).split(',').map(u => u.trim()).filter(u => u);
    urls.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.style.cssText = 'width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1);';
      photoPreviewContainer.appendChild(img);
    });
  } else {
    photoPreviewContainer.style.display = 'none';
  }
  
  formTitle.textContent = 'แก้ไขข้อมูลคลินิก';
  toggleView('form');
}

// GPS Feature
btnGPS.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showToast('เบราว์เซอร์ของคุณไม่รองรับ GPS', 'error');
    return;
  }
  btnGPS.disabled = true;
  btnGPS.innerHTML = '<div class="loader" style="display:block; width:16px; height:16px; border-width:2px; margin-right:4px;"></div> กำลังดึง...';
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      document.getElementById('coordinates').value = `${lat}, ${lng}`;
      showToast('ดึงพิกัดสำเร็จ', 'success');
      resetGPSButton();
    },
    (error) => {
      console.error(error);
      showToast('ไม่สามารถดึงพิกัดได้ กรุณาเปิด GPS', 'error');
      resetGPSButton();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
});

function resetGPSButton() {
  btnGPS.disabled = false;
  btnGPS.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right: 4px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> ดึงพิกัด';
}

// Photo Upload Feature (Resize to Base64)
photoInput.addEventListener('change', (e) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  
  btnClearPhotos.style.display = 'inline-block';
  photoPreviewContainer.style.display = 'flex';
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const base64 = dataUrl.split(',')[1];
        
        photosData.push({
          data: base64,
          mimeType: 'image/jpeg'
        });
        
        const imgEl = document.createElement('img');
        imgEl.src = dataUrl;
        imgEl.style.cssText = 'width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1);';
        photoPreviewContainer.appendChild(imgEl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

btnClearPhotos.addEventListener('click', () => {
  photosData = [];
  photoInput.value = '';
  btnClearPhotos.style.display = 'none';
  photoPreviewContainer.innerHTML = '';
  
  // Re-render existing photos if editing
  const rowIndex = document.getElementById('formRowIndex').value;
  if (rowIndex) {
    const clinic = clinicsData[rowIndex - 2];
    if (clinic && clinic.photoUrl) {
      photoPreviewContainer.style.display = 'flex';
      const urls = String(clinic.photoUrl).split(',').map(u => u.trim()).filter(u => u);
      urls.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1);';
        photoPreviewContainer.appendChild(img);
      });
    } else {
      photoPreviewContainer.style.display = 'none';
    }
  } else {
    photoPreviewContainer.style.display = 'none';
  }
});

// Form Submission
clinicForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!API_URL) {
    showToast('กรุณาตั้งค่า API_URL ก่อน', 'error');
    return;
  }
  
  setLoading(true);
  
  const rowIndex = document.getElementById('formRowIndex').value;
  const action = rowIndex ? 'edit' : 'add';
  const payload = {
    action: action,
    rowIndex: rowIndex,
    username: currentUser ? currentUser.username : 'Unknown',
    data: {
      name: document.getElementById('clinicName').value,
      clinicCode: document.getElementById('clinicCode').value,
      oldClinicCode: document.getElementById('oldClinicCode').value,
      licensee: document.getElementById('licensee').value,
      operator: document.getElementById('operator').value,
      licenseNum: document.getElementById('licenseNum').value,
      licenseeCode: document.getElementById('licenseeCode').value,
      address: document.getElementById('address').value,
      subdistrict: document.getElementById('subdistrict').value,
      district: document.getElementById('district').value,
      operatingHours: document.getElementById('operatingHours').value,
      phone: document.getElementById('phone').value,
      wasteDisposal: document.getElementById('wasteDisposal').value,
      expiryDate: document.getElementById('expiryDate').value,
      currentExpiry: document.getElementById('currentExpiry').value,
      coordinates: document.getElementById('coordinates').value,
      notes: document.getElementById('notes').value
    },
    photos: photosData
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (result.status === 'success') {
      showToast('บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
      toggleView('list');
      fetchClinics(); // Refresh data
    } else {
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
  } catch (error) {
    console.error('Error saving data:', error);
    showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  btnSubmit.disabled = isLoading;
  submitText.style.display = isLoading ? 'none' : 'block';
  submitLoader.style.display = isLoading ? 'block' : 'none';
}

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// Start
init();
