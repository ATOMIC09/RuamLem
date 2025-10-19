import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export default function LoadingSpinner({ size = "sm", text }: LoadingSpinnerProps) {
  const spinnerSizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const borderSizeClasses = {
    sm: "border-2",
    md: "border-2",
    lg: "border-3",
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Spinner - same style as navbar */}
      <div className={`${spinnerSizeClasses[size]} ${borderSizeClasses[size]} border-[#405168] border-t-transparent rounded-full animate-spin`}></div>
      
      {/* Loading text */}
      {text && <span className="text-sm text-[#7a8b99]">{text}</span>}
    </div>
  );
}
