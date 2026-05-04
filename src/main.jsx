import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import './styles/book-page.css'
import './styles/library.css'
import './styles/insights.css'
import './styles/reading-room.css'
import './styles/shell.css'
import { isTauri } from './utils/tauri'

if (isTauri()) {
  document.documentElement.dataset.tauri = 'true'
  document.body.dataset.tauri = 'true'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
