/* ==========================================================================
   SHREE MEWAR PUBLIC SCHOOL - CORE JAVASCRIPT
   ========================================================================== */

// 1. Toast Notification Utility
function showToast(message, type = 'info') {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    document.body.appendChild(toast);
  }
  
  const icon = type === 'success' ? '✔' : (type === 'error' ? '⚠️' : 'ℹ️');
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  toast.style.background = type === 'success' ? '#15803d' : (type === 'error' ? '#b91c1c' : '#1e293b');
  
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// 2. Format Indian Mobile Number (10 Digits with Country Code 91)
function formatIndianMobile(rawNum) {
  if (!rawNum) return '919876543210';
  let clean = String(rawNum).replace(/\D/g, '');
  if (clean.length === 10) return '91' + clean;
  if (clean.length === 12 && clean.startsWith('91')) return clean;
  return '91' + clean.slice(-10);
}

// 3. Fallback Data for Offline/Preview Mode
const CORE_STUDENTS_MOCK = [
  { id: 1, scholar_no: '600', roll_no: '101', name: 'DEVENDRA GADRI', class_name: '8th', section: 'A', father_name: 'श्री देविलाल जी', mobile_no: '9876543210', balance_fees: 8500 },
  { id: 2, scholar_no: '111', roll_no: '102', name: 'DEVENDRA SINGH', class_name: '8th', section: 'A', father_name: 'श्री मानसिंह जी', mobile_no: '9876543210', balance_fees: 14000 },
  { id: 3, scholar_no: '81',  roll_no: '103', name: 'GIRIRAJ MALI', class_name: '8th', section: 'A', father_name: 'श्री कन्हैयालाल जी', mobile_no: '9876543210', balance_fees: 9500 },
  { id: 4, scholar_no: '624', roll_no: '104', name: 'ISHWAR BHIL', class_name: '8th', section: 'A', father_name: 'श्री रूपा जी', mobile_no: '9876543210', balance_fees: 11000 },
  { id: 5, scholar_no: '572', roll_no: '105', name: 'KISHAN LAL KUMAWAT', class_name: '8th', section: 'A', father_name: 'श्री उदयलाल जी', mobile_no: '9876543210', balance_fees: 6000 }
];
