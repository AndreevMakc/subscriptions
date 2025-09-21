import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import HeaderNav from './HeaderNav'
import ThemeContainer from './ThemeContainer'
import ToastViewport from './ToastViewport'
import ConfirmDialogHost from './ConfirmDialog'

const Layout = () => {
  return (
    <ThemeContainer>
      <div className="flex min-h-screen flex-col gap-8">
        <HeaderNav />
        <main className="flex-1">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-16">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
      <ToastViewport />
      <ConfirmDialogHost />
    </ThemeContainer>
  )
}

export default Layout
