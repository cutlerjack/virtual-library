import { useCallback, useEffect, useRef, useState } from 'react'

export function useMaintenanceStatus() {
  const [maintenanceStatus, setMaintenanceStatus] = useState('')
  const maintenanceTimer = useRef(null)

  const showMaintenanceStatus = useCallback((message, timeout = 4000) => {
    if (maintenanceTimer.current) {
      clearTimeout(maintenanceTimer.current)
    }
    setMaintenanceStatus(message)
    if (timeout) {
      maintenanceTimer.current = setTimeout(() => {
        setMaintenanceStatus('')
        maintenanceTimer.current = null
      }, timeout)
    }
  }, [])

  useEffect(() => () => {
    if (maintenanceTimer.current) {
      clearTimeout(maintenanceTimer.current)
    }
  }, [])

  return {
    maintenanceStatus,
    showMaintenanceStatus,
  }
}
