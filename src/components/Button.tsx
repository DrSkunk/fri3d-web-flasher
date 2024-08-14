import { Button as HUButton } from "@headlessui/react";
import clsx from "clsx";

export function Button({
  children,
  className,
  type = ButtonType.Regular,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <HUButton
      className={clsx(
        "rounded border px-4 py-2",
        "disabled:border-gray-300 disabled:bg-gray-300 disabled:text-gray-500",
        type === ButtonType.Regular && "bg-white text-black hover:bg-gray-100",
        type === ButtonType.Regular && "dark:bg-slate-800 dark:text-white dark:hover:bg-slate-600",
        type === ButtonType.Regular && "dark:disabled:border-slate-800 dark:disabled:bg-slate-900 dark:disabled:text-slate-500",
        type === ButtonType.Primary && "bg-emerald-300 text-black hover:bg-emerald-400",
        type === ButtonType.Primary && "disabled:bg-gray-300 disabled:text-gray-500",
        type === ButtonType.Primary && "dark:bg-emerald-700 dark:text-white dark:hover:bg-emerald-900",
        type === ButtonType.Primary && "dark:disabled:bg-slate-900 dark:disabled:text-slate-500",
        className,
      )}
      {...props}
    >
      {children}
    </HUButton>
  );
}

export enum ButtonType {
  Regular,
  Primary,
}
