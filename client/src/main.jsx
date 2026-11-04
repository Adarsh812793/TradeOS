import { createRoot } from 'react-dom/client'


//css files
import './index.css'
import './styles/tokens.css' //our custom tokens

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
    <App />
)
