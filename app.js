// Google Apps Script Web App URL (จะต้องนำ URL มาใส่ตรงนี้หลังจาก Deploy)
const API_URL = 'https://script.google.com/macros/s/AKfycbz9KGU0nmuRgI2ZgIyXooQZaASGIBL7cmBwEKmgS4XPluvyN7qHobSFJk20MV6Zg19c/exec';

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
const photoPreview = document.getElementById('photoPreview');

// Data State
let clinicsData = [];
let photoBase64 = '';
let photoMimeType = '';

// Initialize
function init() {
  if (!API_URL) {
    showToast('กรุณาตั้งค่า API_URL ในไฟล์ app.js ก่อนใช้งาน', 'error');
    loadingState.style.display = 'none';
    clinicList.innerHTML = '<p style="text-align:center; color:var(--text-light); margin-top:2rem;">ยังไม่ได้เชื่อมต่อฐานข้อมูล Google Sheet</p>';
    return;
  }
  fetchClinics();
}

// Fetch Data from Google Sheet
async function fetchClinics() {
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
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          <span>${clinic.address || ''} ${clinic.subdistrict || ''} ${clinic.district || ''}</span>
        </div>
        <div class="detail-row">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
          <span>${clinic.phone || '-'}</span>
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
  photoBase64 = '';
  photoMimeType = '';
  photoPreviewContainer.style.display = 'none';
  photoPreview.src = '';
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
  
  photoBase64 = '';
  photoMimeType = '';
  photoInput.value = '';
  
  // Show existing photo if any
  if (clinic.photoUrl) {
    photoPreviewContainer.style.display = 'block';
    photoPreview.src = clinic.photoUrl;
  } else {
    photoPreviewContainer.style.display = 'none';
    photoPreview.src = '';
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
  const file = e.target.files[0];
  if (!file) {
    photoBase64 = '';
    photoMimeType = '';
    photoPreviewContainer.style.display = 'none';
    return;
  }
  
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
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      
      photoMimeType = 'image/jpeg';
      photoBase64 = dataUrl.split(',')[1]; // Get only base64 data without prefix
      
      photoPreviewContainer.style.display = 'block';
      photoPreview.src = dataUrl;
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// Form Submission
clinicForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!API_URL) {
    showToast('กรุณาตั้งค่า API_URL ก่อน', 'error');
    return;
  }
  
  setLoading(true);
  
  const payload = {
    action: document.getElementById('formRowIndex').value ? 'edit' : 'add',
    rowIndex: document.getElementById('formRowIndex').value,
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
    photo: {
      data: photoBase64,
      mimeType: photoMimeType
    }
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
