import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config.firebaseConfig);
const db = getFirestore(app, config.firebaseConfig.firestoreDatabaseId);

async function run() {
  const docRef = doc(db, 'settings', 'company_info');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    console.log(docSnap.data());
  } else {
    console.log("No such document!");
  }
  process.exit(0);
}
run();
