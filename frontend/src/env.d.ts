/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: 'mock' | 'api'
}

declare module '*.png' {
  const source: string
  export default source
}
