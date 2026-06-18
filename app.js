// Google Apps Script Web App URL (จะต้องนำ URL มาใส่ตรงนี้หลังจาก Deploy)
const API_URL = 'https://script.google.com/macros/s/AKfycbwBvoK6cOloY2M_CBa_bwqg7XPYtXh-EV1zCQ7nB40ImsLxgRsZ9AEkS35DY58p4LQd/exec';

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
let allData = {};
let currentTab = '';
let headers = [];
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
      allData = result.data;
      if (!currentTab && Object.keys(allData).length > 0) {
        currentTab = Object.keys(allData)[0];
      }
      renderTabs();
      if (currentTab) switchTab(currentTab);
    } else {
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
      loadingState.style.display = 'none';
    }
  } catch (error) {
    console.error('Fetch error:', error);
    showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    loadingState.style.display = 'none';
  }
}

// Tab Management
function renderTabs() {
  const tabNav = document.getElementById('tabNav');
  if (!tabNav) return;
  tabNav.innerHTML = '';
  Object.keys(allData).forEach(tab => {
    const btn = document.createElement('button');
    btn.className = `tab-btn ${tab === currentTab ? 'active' : ''}`;
    btn.textContent = tab;
    btn.onclick = () => switchTab(tab);
    tabNav.appendChild(btn);
  });
}

function switchTab(tabName) {
  currentTab = tabName;
  headers = allData[tabName].headers;
  clinicsData = allData[tabName].rows;
  renderTabs(); // update active state
  renderClinics(clinicsData);
}

// Render List
function renderClinics(dataToRender) {
  loadingState.style.display = 'none';
  clinicList.innerHTML = '';
  
  if (dataToRender.length === 0) {
    clinicList.innerHTML = '<p style="text-align:center; color:var(--text-light); margin-top:2rem;">ไม่มีข้อมูล</p>';
    return;
  }
  
  const titleField = headers[1] || headers[0];
  const sub1Field = headers[2] || '';
  const sub2Field = headers[4] || headers[3] || '';

  dataToRender.forEach((clinic) => {
    const card = document.createElement('div');
    card.className = 'clinic-card';
    
    const title = clinic[titleField] || 'ไม่มีชื่อ';
    const sub1 = sub1Field && clinic[sub1Field] ? `${sub1Field}: ${clinic[sub1Field]}` : '';
    const sub2 = sub2Field && clinic[sub2Field] ? `${sub2Field}: ${clinic[sub2Field]}` : '';
    
    // Check for GPS and Photos
    const hasGps = headers.some(h => (h==='พิกัด' || h==='coordinates' || h==='GPS') && clinic[h] && clinic[h].toString().trim() !== '');
    const photoKey = headers.find(h => h==='รูปภาพ' || h==='photoUrl' || h==='รูปถ่าย');
    const photoStr = photoKey ? clinic[photoKey] : '';
    const hasPhotos = photoStr && photoStr.toString().trim() !== '';
    let photoCount = 0;
    if (hasPhotos) photoCount = String(photoStr).split(',').length;
    
    const gpsHtml = hasGps ? `<span class="status-badge status-active">📍 มีพิกัด</span>` : `<span class="status-badge" style="background:var(--bg-color);color:var(--text-light);">📍 ไม่มีพิกัด</span>`;
    const photoHtml = hasPhotos ? `<span class="status-badge status-active">📸 รูป (${photoCount})</span>` : `<span class="status-badge" style="background:var(--bg-color);color:var(--text-light);">📸 ไม่มีรูป</span>`;

    card.innerHTML = `
      <div class="clinic-header">
        <h3 class="clinic-title">${title}</h3>
      </div>
      <div class="clinic-details">
        ${sub1 ? `<div class="detail-item"><strong>${sub1}</strong></div>` : ''}
        ${sub2 ? `<div class="detail-item"><strong>${sub2}</strong></div>` : ''}
        <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
          ${gpsHtml}
          ${photoHtml}
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => openEditForm(clinic._rowIndex));
    clinicList.appendChild(card);
  });
}

// Search functionality
searchInput.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filtered = clinicsData.filter(clinic => {
    return headers.some(h => clinic[h] && clinic[h].toString().toLowerCase().includes(searchTerm));
  });
  renderClinics(filtered);
});

// Form Navigation
btnShowAddForm.addEventListener('click', () => {
  openAddForm();
});

btnBack.addEventListener('click', () => {
  formView.style.display = 'none';
  listView.style.display = 'block';
  btnShowAddForm.style.display = 'block';
});

function openAddForm() {
  document.getElementById('formRowIndex').value = '';
  document.getElementById('formTitle').textContent = `เพิ่มข้อมูล: ${currentTab}`;
  generateDynamicForm();
  
  clearPhotos();
  listView.style.display = 'none';
  btnShowAddForm.style.display = 'none';
  formView.style.display = 'block';
  window.scrollTo(0, 0);
}

function openEditForm(rowIndex) {
  const clinic = clinicsData.find(c => c._rowIndex === rowIndex);
  if (!clinic) return;
  
  document.getElementById('formRowIndex').value = rowIndex;
  document.getElementById('formTitle').textContent = `แก้ไขข้อมูล: ${currentTab}`;
  generateDynamicForm(clinic);
  
  clearPhotos();
  
  // Show existing photos
  const photoKey = headers.find(h => h==='รูปภาพ' || h==='photoUrl' || h==='รูปถ่าย');
  if (photoKey && clinic[photoKey]) {
    photoPreviewContainer.style.display = 'flex';
    const urls = String(clinic[photoKey]).split(',').map(u => u.trim()).filter(u => u);
    urls.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.style.cssText = 'width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1);';
      photoPreviewContainer.appendChild(img);
    });
  }

  listView.style.display = 'none';
  btnShowAddForm.style.display = 'none';
  formView.style.display = 'block';
  window.scrollTo(0, 0);
}

function generateDynamicForm(data = null) {
  const container = document.getElementById('dynamicFormFields');
  if (!container) return;
  container.innerHTML = '';
  
  headers.forEach((h) => {
    const hLower = h.toLowerCase();
    // Skip system or special fields more aggressively
    if (hLower === 'n' || hLower === 'id' || 
        hLower.includes('รูป') || hLower.includes('ภาพ') || hLower.includes('photo') || hLower.includes('image') || 
        hLower.includes('พิกัด') || hLower.includes('gps') || hLower.includes('coordinate')) {
      return;
    }
    
    const div = document.createElement('div');
    div.className = 'form-group';
    
    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = h;
    div.appendChild(label);
    
    // Check if it should be textarea
    if (hLower.includes('หมายเหตุ') || hLower.includes('ที่อยู่') || hLower.includes('รายละเอียด') || hLower.includes('ข้อมูลเพิ่มเติม')) {
      const textarea = document.createElement('textarea');
      textarea.className = 'form-input';
      textarea.id = 'dynamic_' + h;
      textarea.rows = 2;
      if (data && data[h]) textarea.value = data[h];
      div.appendChild(textarea);
    } else {
      const input = document.createElement('input');
      input.type = hLower.includes('เบอร์') || hLower.includes('โทร') || hLower.includes('phone') ? 'tel' : 'text';
      input.className = 'form-input';
      input.id = 'dynamic_' + h;
      if (data && data[h]) input.value = data[h];
      div.appendChild(input);
    }
    
    container.appendChild(div);
  });
  
  // Populate GPS coordinates if editing
  const gpsKeys = headers.filter(h => h === 'พิกัด' || h === 'coordinates' || h === 'GPS');
  if (gpsKeys.length > 0 && data && data[gpsKeys[0]]) {
    document.getElementById('coordinates').value = data[gpsKeys[0]];
  } else {
    document.getElementById('coordinates').value = '';
  }
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

// Photo Upload Feature
function clearPhotos() {
  photosData = [];
  photoInput.value = '';
  btnClearPhotos.style.display = 'none';
  photoPreviewContainer.innerHTML = '';
  photoPreviewContainer.style.display = 'none';
}

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
        
        photosData.push({ data: base64, mimeType: 'image/jpeg' });
        
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

btnClearPhotos.addEventListener('click', clearPhotos);

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
  
  const rowData = {};
  headers.forEach(h => {
    const hLower = h.toLowerCase();
    if (hLower === 'n' || hLower === 'id' || 
        hLower.includes('รูป') || hLower.includes('ภาพ') || hLower.includes('photo') || hLower.includes('image') || 
        hLower.includes('พิกัด') || hLower.includes('gps') || hLower.includes('coordinate')) {
      return;
    }
    const el = document.getElementById('dynamic_' + h);
    if (el) rowData[h] = el.value;
  });
  
  // Add coordinates manually
  rowData['พิกัด'] = document.getElementById('coordinates').value;

  const payload = {
    action: action,
    sheetName: currentTab,
    rowIndex: rowIndex,
    username: currentUser ? currentUser.username : 'Unknown',
    data: rowData,
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
