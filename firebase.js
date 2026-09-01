const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

// 1. เช็คว่าตอนนี้อยู่ในโหมดไหน
const isDev = process.env.NODE_ENV === 'development' || (process.argv && process.argv.includes('dev'));
const isProd = !isDev;

// 2. โหลด Service Account (รองรับทั้งจาก Environment Variable และไฟล์ในเครื่อง)
let serviceAccount;
let keySource = 'unknown';

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    keySource = 'Environment Variable';
  } catch (e) {
    try {
      serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf-8'));
      keySource = 'Environment Variable (Base64)';
    } catch (e2) {
      throw new Error('❌ ไม่สามารถอ่านค่า FIREBASE_SERVICE_ACCOUNT ได้ กรุณาตรวจสอบรูปแบบ JSON');
    }
  }
} else {
  const prodKeyPath = path.join(__dirname, 'serviceAccountKey-prod.json');
  const devKeyPath = path.join(__dirname, 'serviceAccountKey-dev.json');

  let serviceAccountPath;
  if (isDev && fs.existsSync(devKeyPath)) {
    serviceAccountPath = devKeyPath;
  } else if (fs.existsSync(prodKeyPath)) {
    serviceAccountPath = prodKeyPath;
  } else if (fs.existsSync(devKeyPath)) {
    serviceAccountPath = devKeyPath;
  } else {
    throw new Error('❌ ไม่พบไฟล์ Firebase Service Account Key หรือตัวแปร FIREBASE_SERVICE_ACCOUNT');
  }

  serviceAccount = require(serviceAccountPath);
  keySource = path.basename(serviceAccountPath);
}

// 3. เชื่อมต่อ Firebase
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

console.log(`📡 Firebase mode: ${isProd ? '🔴 PRODUCTION' : '🟢 DEVELOPMENT'} (${keySource})`);

module.exports = { db };