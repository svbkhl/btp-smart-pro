/**
 * Champ de saisie où les variables [Nom du client], [Montant], etc. sont rendues
 * comme des blocs non modifiables (chips) dans le texte.
 */
import { useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";

const VARIABLE_REGEX = /(\[[^\]]+\])/g;

export interface VariableTemplateFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variablePatterns: string[];
  rows?: number;
  className?: string;
}

export interface VariableTemplateFieldHandle {
  insertVariableAtCursor: (displayValue: string) => void;
  focus: () => void;
}

function parseSegments(text: string): Array<{ type: "text" | "variable"; value: string }> {
  const segments: Array<{ type: "text" | "variable"; value: string }> = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(VARIABLE_REGEX.source, "g");
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, m.index) });
    }
    segments.push({ type: "variable", value: m[1] });
    lastIndex = m.index + m[1].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  if (segments.length === 0 && text.length > 0) {
    segments.push({ type: "text", value: text });
  }
  if (segments.length === 0) {
    segments.push({ type: "text", value: "" });
  }
  return segments;
}

export const VariableTemplateField = forwardRef<VariableTemplateFieldHandle | null, VariableTemplateFieldProps>(
  ({ value, onChange, placeholder, variablePatterns, rows = 4, className }, ref) => {
    const divRef = useRef<HTMLDivElement>(null);
    const isInternalUpdate = useRef(false);

    const serialize = useCallback(() => {
      const el = divRef.current;
      if (!el) return "";
      let result = "";
      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          result += node.textContent ?? "";
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.dataset.variable) {
            result += el.dataset.variable;
          } else {
            node.childNodes.forEach(walk);
          }
        }
      };
      el.childNodes.forEach(walk);
      return result;
    }, []);

    useImperativeHandle(ref, () => ({
      insertVariableAtCursor: (displayValue: string) => {
        const el = divRef.current;
        if (!el) return;
        const doc = el.ownerDocument;
        const sel = doc.getSelection();
        if (!sel || sel.rangeCount === 0) {
          onChange(value + displayValue);
          return;
        }
        const range = sel.getRangeAt(0);
        if (!el.contains(range.commonAncestorContainer) && !el.contains(range.startContainer)) {
          onChange(value + displayValue);
          return;
        }
        range.deleteContents();
        const span = doc.createElement("span");
        span.contentEditable = "false";
        span.dataset.variable = displayValue;
        span.className = "inline-flex items-center px-1.5 py-0.5 rounded bg-primary/15 text-primary text-xs font-medium select-none cursor-default";
        span.textContent = displayValue;
        range.insertNode(span);
        range.setStartAfter(span);
        range.setEndAfter(span);
        sel.removeAllRanges();
        sel.addRange(range);
        isInternalUpdate.current = true;
        onChange(serialize());
        isInternalUpdate.current = false;
      },
      focus: () => divRef.current?.focus(),
    }), [value, onChange, serialize]);

    const handleInput = useCallback(() => {
      if (isInternalUpdate.current) return;
      const newValue = serialize();
      if (newValue !== value) {
        onChange(newValue);
      }
    }, [value, onChange, serialize]);

    const handlePaste = useCallback(
      (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text/plain");
        const doc = divRef.current?.ownerDocument;
        if (!doc) return;
        const sel = doc.getSelection();
        if (!sel || !divRef.current) return;
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const fragment = doc.createDocumentFragment();
        const parts = pasted.split(VARIABLE_REGEX);
        parts.forEach((part) => {
          if (variablePatterns.includes(part)) {
            const span = doc.createElement("span");
            span.contentEditable = "false";
            span.dataset.variable = part;
            span.className = "inline-flex items-center px-1.5 py-0.5 rounded bg-primary/15 text-primary text-xs font-medium select-none cursor-default";
            span.textContent = part;
            fragment.appendChild(span);
          } else {
            fragment.appendChild(doc.createTextNode(part));
          }
        });
        range.insertNode(fragment);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        isInternalUpdate.current = true;
        onChange(serialize());
        isInternalUpdate.current = false;
      },
      [variablePatterns, onChange, serialize]
    );

    useEffect(() => {
      const el = divRef.current;
      if (!el) return;
      const current = serialize();
      if (current === value) return;
      isInternalUpdate.current = true;
      el.innerHTML = "";
      if (value) {
        const segments = parseSegments(value);
        const doc = el.ownerDocument;
        segments.forEach((seg) => {
          if (seg.type === "variable") {
            const span = doc.createElement("span");
            span.contentEditable = "false";
            span.dataset.variable = seg.value;
            span.className = "inline-flex items-center px-1.5 py-0.5 rounded bg-primary/15 text-primary text-xs font-medium select-none cursor-default";
            span.textContent = seg.value;
            el.appendChild(span);
          } else {
            el.appendChild(doc.createTextNode(seg.value));
          }
        });
      }
      isInternalUpdate.current = false;
    }, [value]);

    return (
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className={cn(
          "min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground",
          rows > 1 && "min-h-[120px]",
          className
        )}
        style={{ minHeight: rows > 1 ? `${rows * 24}px` : undefined }}
      />
    );
  }
);

VariableTemplateField.displayName = "VariableTemplateField";
