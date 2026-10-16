import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => twMerge(clsx(inputs));

// Foundation: 21st.dev's shadcn Button and ButtonGroup composition.
// https://21st.dev/community/components/shadcn/button-group/sizes
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:brightness-105',
        outline: 'border border-input bg-background hover:bg-muted',
        ghost: 'hover:bg-muted hover:text-foreground',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-11 px-3',
        lg: 'h-14 px-7',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export const Button = React.forwardRef(function Button(
  { className, variant, size, asChild = false, ...props }, ref,
) {
  const Comp = asChild ? Slot : 'button';
  return <Comp type={asChild ? undefined : 'button'} className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});

export function ButtonGroup({ className, children, ...props }) {
  return <div role="group" className={cn('button-group flex items-center', className)} {...props}>{children}</div>;
}
