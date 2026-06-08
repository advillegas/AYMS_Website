export default function Loading() {
  return (
    <div className="grain relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1a0a12]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A] via-[#1a0a12] to-[#1A0814]" />
      <div className="aurora opacity-30" />
      <div className="relative flex flex-col items-center gap-4">
        <div
          className="h-12 w-12 animate-spin rounded-full border-[3px] border-white/15 border-t-[#FF0099]"
          role="status"
          aria-label="Loading"
        />
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-[#FFB3D0]">
          Loading
        </p>
      </div>
    </div>
  );
}
