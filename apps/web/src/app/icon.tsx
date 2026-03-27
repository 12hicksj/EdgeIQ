import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: "#111827",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "6px",
      }}
    >
      <div
        style={{
          color: "#22c55e",
          fontSize: 14,
          fontWeight: "bold",
          letterSpacing: "-0.5px",
        }}
      >
        IQ
      </div>
    </div>,
    { ...size }
  );
}
