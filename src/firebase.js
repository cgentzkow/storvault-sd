import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyDQqyogPUBnRoejtNdwfnKnEkwJO-ciA6Y',
  authDomain: 'gentz-commercial-photo-map.firebaseapp.com',
  projectId: 'gentz-commercial-photo-map',
  appId: '1:82270342787:web:e2f2d3fa7edc3a3daf95b6',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
