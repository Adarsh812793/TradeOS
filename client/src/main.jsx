import { createRoot } from 'react-dom/client'

//fonts (self-hosted, so they load from our own site and not from Google)
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/spline-sans-mono'

//css files
import './index.css'
import './styles/tokens.css' //our custom tokens

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
    <App />
)
