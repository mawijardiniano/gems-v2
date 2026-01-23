export default function Footer() {
  return (
    <footer className="py-8 bg-white border-t mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-sm text-gray-600">
          © {new Date().getFullYear()} Gender Equity Management System
        </div>
        <div className="flex gap-4 text-sm">
          <a href="/" className="text-indigo-600">
            Home
          </a>
          <a href="/survey" className="text-indigo-600">
            Survey
          </a>
        </div>
      </div>
    </footer>
  );
}
