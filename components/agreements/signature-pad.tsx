"use client";

import { useEffect, useRef } from "react";

export function SignaturePad({
  name,
  onChange,
}: {
  name: string;
  onChange: (png: string, inked: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ink = useRef(false);
  const drawing = useRef(false);

  function paint(draw?: (context: CanvasRenderingContext2D, width: number, height: number) => void) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, rect.height);
    context.strokeStyle = "#0B1F33";
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    draw?.(context, rect.width, rect.height);
    onChange(canvas.toDataURL("image/png"), ink.current);
  }

  function emit() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"), ink.current);
  }

  useEffect(() => {
    ink.current = false;
    paint();
    // The canvas is measured once it is on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        aria-label="Signature"
        className="h-36 w-full touch-none rounded-2xl border border-line bg-white"
        onPointerDown={(event) => {
          const context = canvasRef.current?.getContext("2d");
          if (!context) return;
          drawing.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          const { x, y } = point(event);
          context.beginPath();
          context.moveTo(x, y);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const context = canvasRef.current?.getContext("2d");
          if (!context) return;
          const { x, y } = point(event);
          context.lineTo(x, y);
          context.stroke();
          ink.current = true;
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          emit();
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-semibold"
          onClick={() => {
            ink.current = false;
            paint();
          }}
        >
          Clear
        </button>
        <button
          type="button"
          className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-semibold"
          onClick={() => {
            const written = name.trim();
            if (written.length < 2) return;
            ink.current = true;
            paint((context, _width, height) => {
              context.fillStyle = "#0B1F33";
              context.font = 'italic 40px Georgia, "Times New Roman", serif';
              context.textBaseline = "middle";
              context.fillText(written.slice(0, 42), 16, height / 2);
            });
          }}
        >
          Use typed name
        </button>
      </div>
    </div>
  );
}
