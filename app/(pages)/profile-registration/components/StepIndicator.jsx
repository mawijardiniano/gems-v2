import { useSelector } from "react-redux";

export default function StepIndicator({ titles }) {
  const currentStep = useSelector((state) => state.profile.currentStep);
  const totalSteps = titles.length;

  return (
    <div className="flex items-center justify-between w-full mb-6">
      {titles.map((title, index) => {
        const stepNumber = index + 1;
        const isActive = currentStep >= stepNumber;
        const isCompleted = currentStep > stepNumber;

        return (
          <div key={index} className="flex flex-1 items-center">
            
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all
                  ${isActive ? "bg-black text-white" : "bg-gray-300 text-gray-600"}
                `}
              >
                {stepNumber}
              </div>

              <p
                className={`text-xs mt-1 
                  ${isActive ? "text-black" : "text-gray-500"}
                `}
              >
                {title}
              </p>
            </div>

            {/* Connector Line */}
            {index < totalSteps - 1 && (
              <div
                className={`h-1 flex-1 mx-2 rounded-full transition-all
                  ${isCompleted ? "bg-black" : "bg-gray-300"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
