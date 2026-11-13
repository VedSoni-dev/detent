"use client";
import { useEffect, useRef } from "react";
import { mount, type DetentOptions, type Instance } from "@/lib/detent.js";

type Props = Partial<DetentOptions> & {
  onChange?: (v: number) => void;
  onDetent?: (v: number) => void;
  onCommit?: (v: number) => void;
  className?: string;
};

/** The React wrapper around the framework-free engine in lib/detent.js. */
export default function Detent({ className, onChange, onDetent, onCommit, ...opts }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const inst = useRef<Instance | null>(null);
  const cbs = useRef({ onChange, onDetent, onCommit });
  cbs.current = { onChange, onDetent, onCommit };
  const key = JSON.stringify(opts);

  useEffect(() => {
    if (!host.current) return;
    inst.current = mount(host.current, {
      ...opts,
      onChange: (v) => cbs.current.onChange?.(v),
      onDetent: (v) => cbs.current.onDetent?.(v),
      onCommit: (v) => cbs.current.onCommit?.(v),
    });
    return () => { inst.current?.destroy(); inst.current = null; };
    // mount once; later prop changes go through set()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const i = inst.current;
    if (!i) return;
    const next = JSON.parse(key) as Partial<DetentOptions>;
    // only push the value when the parent really changed it, so a drag is never fought
    if (next.value !== undefined && Math.abs(next.value - i.value) < 1e-9) delete next.value;
    i.set(next);
  }, [key]);

  return <div ref={host} className={className} />;
}
