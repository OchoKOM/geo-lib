import * as React from "react";
import { cn } from "@/lib/utils";
import { showToast } from "@/hooks/useToast";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number;
  maxRows?: number;
  triggerResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      minHeight = 40,
      maxRows,
      className,
      maxLength,
      value,
      triggerResize,
      ...props
    },
    ref,
  ) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const style = getComputedStyle(textarea);
      const lineHeight = parseFloat(style.lineHeight);
      const padding =
        parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

      const maxHeight = maxRows
        ? maxRows * lineHeight + padding
        : Infinity;

      textarea.style.height = "auto";

      const newHeight = Math.min(
        Math.max(textarea.scrollHeight, minHeight),
        maxHeight,
      );

      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY =
        textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    }, [minHeight, maxRows]);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();

      if (maxLength && e.target.value.length >= maxLength) {
        
        showToast("Vous avez atteint la limite maximale de caractères.", "warning");
      }

      props.onChange?.(e);
    };

    React.useEffect(() => {
      const frame = requestAnimationFrame(adjustHeight);
      return () => cancelAnimationFrame(frame);
    }, [value, triggerResize, adjustHeight]);

    return (
      <textarea
        ref={(node) => {
          textareaRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        value={value}
        onInput={handleInput}
        className={cn(
          "flex w-full resize-none rounded-xl border-slate-200 dark:border-slate-700 bg-background",
          "overflow-hidden focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none px-3 py-1 text-base shadow-xs transition-[color,box-shadow]",
           "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
export { Textarea };
