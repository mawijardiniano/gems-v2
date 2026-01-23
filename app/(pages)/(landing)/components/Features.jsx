export default function Features() {
  return (
    <section id="features" className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl font-semibold text-center mb-8">
          Why Gender Equity Management System?
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-medium mb-2">Data-driven decisions</h3>
            <p className="text-sm text-gray-600">
              Collect, aggregate and visualize gender data to inform policies
              and programs.
            </p>
          </div>

          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-medium mb-2">Secure Profiles</h3>
            <p className="text-sm text-gray-600">
              Personal profiles and submissions are securely stored and
              access-controlled.
            </p>
          </div>

          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-medium mb-2">Responsive dashboards</h3>
            <p className="text-sm text-gray-600">
              Interactive charts and reports for administrators and
              stakeholders.
            </p>
          </div>

          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-medium mb-2">Quick Surveys</h3>
            <p className="text-sm text-gray-600">
              Create and share short surveys to capture community insights.
            </p>
          </div>

          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-medium mb-2">Privacy-first</h3>
            <p className="text-sm text-gray-600">
              We follow best practices for privacy and data protection.
            </p>
          </div>

          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-medium mb-2">Accessible UI</h3>
            <p className="text-sm text-gray-600">
              Designed with accessibility and inclusive language in mind.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
