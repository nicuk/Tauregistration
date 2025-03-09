"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  goToReferral?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, goToReferral = false, ...props }, ref) => {
    const router = useRouter()
    const Comp = asChild ? Slot : "button"

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (goToReferral) {
        event.preventDefault()
        const tabsElement = document.querySelector('[role="tablist"]')
        const referralTab = tabsElement?.querySelector('[value="referral"]') as HTMLButtonElement
        if (referralTab) {
          referralTab.click()
        }
      }
      if (props.onClick) {
        props.onClick(event)
      }
    }

    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} onClick={handleClick} />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }

