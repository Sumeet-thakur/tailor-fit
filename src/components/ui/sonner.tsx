/**
 * Custom Sonner Toaster styled to match the Tailor Fit luxury UI.
 * Uses app's design tokens (primary navy, gold accent, DM Sans font).
 */
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-elevated group-[.toaster]:rounded-xl group-[.toaster]:font-body",
          title: "group-[.toast]:font-semibold group-[.toast]:text-sm",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium group-[.toast]:text-xs",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium group-[.toast]:text-xs",
          success:
            "group-[.toaster]:!border-emerald-200 group-[.toaster]:!bg-emerald-50 [&>[data-icon]]:!text-emerald-600",
          error:
            "group-[.toaster]:!border-red-200 group-[.toaster]:!bg-red-50 [&>[data-icon]]:!text-red-600",
          warning:
            "group-[.toaster]:!border-amber-200 group-[.toaster]:!bg-amber-50 [&>[data-icon]]:!text-amber-600",
          info:
            "group-[.toaster]:!border-blue-200 group-[.toaster]:!bg-blue-50 [&>[data-icon]]:!text-blue-600",
        },
        style: {
          fontFamily: "'DM Sans', system-ui, sans-serif",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
