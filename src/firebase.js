import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDL-wZEWHToMMlbCF2YybG4CC-20X3tpn4',
  authDomain: 'gentz-commercial-photo-map.firebaseapp.com',
  projectId: 'gentz-commercial-photo-map',
  appId: '1:82270342787:web:e2f2d3fa7edc3a3daf95b6',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
