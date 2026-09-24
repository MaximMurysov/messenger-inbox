import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App.tsx'
import { OtherTabNotice } from './app/OtherTabNotice.tsx'
import { store } from './app/store.ts'
import { claimTab, reloadWhenTabFree } from './app/tabLock.ts'
import { ErrorBoundary } from './shared/ui/ErrorBoundary.tsx'
import './index.css'

async function bootstrap() {
  const root = createRoot(document.getElementById('root')!)
  const isPrimaryTab = await claimTab()
  if (!isPrimaryTab) reloadWhenTabFree()

  root.render(
    <StrictMode>
      <ErrorBoundary>
        {isPrimaryTab ? (
          <Provider store={store}>
            <App />
          </Provider>
        ) : (
          <OtherTabNotice />
        )}
      </ErrorBoundary>
    </StrictMode>,
  )
}

void bootstrap()
