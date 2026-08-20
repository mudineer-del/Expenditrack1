import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, args: any) => ipcRenderer.send(channel, args),
    invoke: (channel: string, args: any) => ipcRenderer.invoke(channel, args),
    on: (channel: string, func: any) =>
      ipcRenderer.on(channel, (event, ...args) => func(...args)),
    removeListener: (channel: string, func: any) =>
      ipcRenderer.removeListener(channel, func),
  },
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
})

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send: (channel: string, args: any) => void
        invoke: (channel: string, args: any) => Promise<any>
        on: (channel: string, func: any) => void
        removeListener: (channel: string, func: any) => void
      }
      versions: {
        node: string
        chrome: string
        electron: string
      }
    }
  }
}
