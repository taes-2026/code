import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// A configuração Web do Firebase não é secreta; os dados são protegidos pelas Security Rules
const app = initializeApp({
  apiKey: 'AIzaSyB6qXleOAWZrDOh_ijfrdgqlNCVW35903w',
  authDomain: 'smartpantry-5a1b1.firebaseapp.com',
  projectId: 'smartpantry-5a1b1',
  storageBucket: 'smartpantry-5a1b1.firebasestorage.app',
  messagingSenderId: '199332779276',
  appId: '1:199332779276:web:bce4530782392b923ca529',
})

export const auth = getAuth(app)
export const db = getFirestore(app)

// Resolve com o utilizador atual assim que o Firebase termina de restaurar a sessão
export function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}
