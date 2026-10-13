import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-clay-500/30 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-clay-600 text-white hover:bg-clay-700 active:scale-[0.98] shadow-[0_1px_2px_rgba(120,50,20,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] dark:bg-clay-500 dark:hover:bg-clay-400 dark:text-slate-950",
        accent:
          "bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] shadow-sm dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
        destructive:
          "bg-rose-600 text-white hover:bg-rose-500 active:scale-[0.98] shadow-sm shadow-rose-600/20 border border-rose-500",
        outline:
          "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] shadow-[0_1px_2px_rgba(60,45,30,0.05)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800/90",
        secondary:
          "bg-slate-100 text-slate-800 hover:bg-slate-200/70 active:scale-[0.98] dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80",
        ghost:
          "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60",
        link: "text-clay-600 underline-offset-4 hover:underline dark:text-clay-400",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-lg px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
