const Footer = () => {
  return (
    <footer className="mt-12 flex flex-col gap-2 text-xs text-midnight/60 sm:flex-row sm:items-center sm:justify-between">
      <p>
        <span className="font-semibold">SubsKeeper</span> operates entirely offline. Your data stays in your browser.
      </p>
      <p className="flex items-center gap-2">
        <span className="hidden sm:inline">Made with mindful spending in mind.</span>
        <span aria-hidden="true" className="inline-flex h-2 w-2 rounded-full bg-accent" />
      </p>
    </footer>
  )
}

export default Footer
