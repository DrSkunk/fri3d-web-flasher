import { Button as HUButton } from "@headlessui/react";
import clsx from "clsx";

export function Button({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <HUButton
      className={clsx(
        "border px-4 py-2 rounded",
        "text-black bg-white hover:bg-gray-100",
        "disabled:bg-gray-300 disabled:text-gray-500 disabled:border-gray-300",
        "dark:text-white dark:bg-slate-800 dark:hover:bg-slate-600",
        "dark:disabled:bg-slate-900 dark:disabled:text-slate-500 dark:disabled:border-slate-800",
        className
      )}
      {...props}
    >
      {children}
    </HUButton>
  );
}
