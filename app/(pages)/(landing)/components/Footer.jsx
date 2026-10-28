import BrandMark from "@/components/BrandMark";

export default function Footer() {
  return (
    <footer className="py-8 bg-white border-t mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2.5 text-sm text-gray-600">
          <BrandMark size={26} />
          <span>
            © {new Date().getFullYear()} Gender Equity Management System
          </span>
        </div>
        <div className="flex gap-4 text-sm">
          <a href="/" className="text-secondary-600">
            Home
          </a>
          <a href="/profile-registration" className="text-secondary-600">
            Survey
          </a>
        </div>
      </div>
    </footer>
  );
}
