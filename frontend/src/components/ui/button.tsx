import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border border-[#DAB18B33] bg-[linear-gradient(135deg,#F0D4B7_0%,#D7A36E_22%,#B87333_56%,#8B5A2B_100%)] text-[#101522] shadow-[0_14px_36px_rgba(184,115,51,0.26),inset_0_1px_0_rgba(255,245,234,0.3)] hover:-translate-y-px hover:brightness-105",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline: "border border-accent-cobalt/30 bg-bg-card/60 text-text-primary backdrop-blur-md hover:bg-bg-hover hover:border-accent-cobalt/50",
        secondary: "bg-bg-tertiary text-text-primary hover:bg-bg-hover",
        ghost: "hover:bg-bg-hover hover:text-text-primary text-text-secondary",
        link: "text-accent-cyan underline-offset-4 hover:text-accent-copper hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
