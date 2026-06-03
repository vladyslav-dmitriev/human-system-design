"use client";

import React from "react";

interface AuthButtonGoogleProps {
  onClick?(): void;
  isLoading?: boolean;
}

export const AuthButtonGoogle = ({
  onClick,
  isLoading = false,
}: AuthButtonGoogleProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="cursor-pointer flex items-center justify-center w-full max-w-md p-4 h-10 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
    >
      {isLoading ? (
        <svg
          className="w-5 h-5 mr-3 text-gray-500 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5 mr-3"
          viewBox="0 0 24 24"
          width="100%"
          height="100%"
        >
          <path
            fill="#EA4335"
            d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3A11.95 11.95 0 0 0 12 0C7.33 0 3.28 2.741 1.355 6.741l3.91 3.024Z"
          />
          <path
            fill="#4285F4"
            d="M16.04 15.345c-1.054.71-2.436 1.145-4.04 1.145a7.065 7.065 0 0 1-6.713-4.836l-3.928 3.036C3.314 19.39 7.355 22 12 22c3.245 0 6.136-1.082 8.355-2.918l-4.314-3.737Z"
          />
          <path
            fill="#FBBC05"
            d="M5.286 11.655a6.974 6.974 0 0 1 0-2.31L1.359 6.32a11.91 11.91 0 0 0 0 8.364l3.927-3.03Z"
          />
          <path
            fill="#34A853"
            d="M23.491 9.818H12V14.4h6.618a5.664 5.664 0 0 1-2.455 3.709l4.314 3.736C22.99 19.536 24 16.145 24 12c0-.764-.073-1.5-.182-2.182H23.49Z"
          />
        </svg>
      )}

      <span>Continue with Google</span>
    </button>
  );
};
